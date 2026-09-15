import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {createServer} from '../server.mjs';
import {createSociety} from '../server/society.mjs';
import {createHostedStore,serializeSession,restoreSession} from '../server/hosted-store.mjs';
import {hostedOptions} from '../server/hosted-config.mjs';
import {places} from '../src/town-layout.js';
import {buildWeb} from '../scripts/build-web.mjs';
import {communitySpeech} from '../server/speech.mjs';
import {startCommunity} from '../server/city.mjs';
import {proposeCommunity,interactCommunity} from '../server/community.mjs';
import {generateCommunityArt,readCommunityArt} from '../server/community-art.mjs';

const secret='test-project-secret-that-must-never-be-public';
const config={key:secret,model:'gpt-5.6-luna',realtimeModel:'gpt-realtime-mini',imageModel:'test-image',calls:0,retryAfter:0};
const sdp='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';

// A REST-level Redis double lets independent HTTP server instances share only
// serialized records. Deployment verification also exercises real Upstash Redis.
function redisService(){
 const values=new Map(),expires=new Map(),requests=[];
 const get=key=>{if((expires.get(key)||Infinity)<=Date.now()){values.delete(key);expires.delete(key);}return values.get(key)??null;};
 const set=(key,value,ttl)=>{values.set(key,value);if(ttl)expires.set(key,Date.now()+ttl);return 'OK';};
 const fetcher=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://redis.example');assert.equal(options.headers.Authorization,'Bearer private-redis-token');
  const args=JSON.parse(options.body);requests.push(args);let result;
  if(args[0]==='GET')result=get(args[1]);
  else if(args[0]==='SET'){
   const [,key,value,...flags]=args;
   result=flags.includes('NX')&&get(key)!==null?null:set(key,value,flags.includes('PX')?Number(flags[flags.indexOf('PX')+1]):flags.includes('EX')?Number(flags[flags.indexOf('EX')+1])*1000:undefined);
  }else if(args[0]==='EVAL'){
   const [,script,count,...rest]=args,keys=rest.slice(0,count),argv=rest.slice(count);
   if(script.includes("redis.call('INCR'")){result=Number(get(keys[0])||0)+1;set(keys[0],result);if(result===1)expires.set(keys[0],Date.now()+Number(argv[0])*1000);}
   else if(get(keys[0])!==argv[0])result=0;
   else{if(count===2)set(keys[1],argv[1],Number(argv[2])*1000);values.delete(keys[0]);result=1;}
  }else throw new Error('Unexpected Redis command');
  return Response.json({result});
 };
 return {values,expires,requests,fetcher,store:()=>createHostedStore({url:'https://redis.example',token:'private-redis-token',fetcher})};
}
async function listen(options){
 const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 return {server,base,async request(path,data,id,headers={}){
  const response=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Language':'en',...(id?{'X-Session':id}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const text=await response.text();assert.ok(!text.includes(secret));assert.ok(!text.includes('private-redis-token'));
  return {status:response.status,data:JSON.parse(text)};
 },async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}

test('hosted sessions survive worker changes, retain counters, and reject public configuration changes',async()=>{
 const redis=redisService(),requests=[];
 const fetcher=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer '+secret);requests.push(url);
  if(url.endsWith('/hangup'))return new Response(null,{status:200});
  if(url.endsWith('/realtime/calls'))return new Response(sdp,{status:201,headers:{Location:'https://api.openai.com/v1/realtime/calls/rtc_hosted'}});
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'Hello. The lights are on.',action:'none'})}]}]});
 };
 const a=await listen({hosted:true,sessionStore:redis.store(),apiKey:secret,fetcher}),b=await listen({hosted:true,sessionStore:redis.store(),apiKey:secret,fetcher});
 try{
  const id=(await a.request('/api/session',{})).data.id,other=(await b.request('/api/session',{})).data.id;
  assert.equal((await a.request('/api/session',{},null,{Origin:'https://elsewhere.example'})).status,403);
  assert.equal((await b.request('/api/session',{},null,{'Sec-Fetch-Site':'cross-site'})).status,403);
  const sameOrigin=await new Promise((resolve,reject)=>{
   const req=httpRequest(a.base+'/api/state',{headers:{Host:'ai-town.example',Origin:'https://ai-town.example','X-Session':id}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();
  });assert.equal(sameOrigin,200);
  assert.equal((await a.request('/api/config',{key:'replacement',model:'expensive-model'},id)).status,403);
  assert.equal((await a.request('/api/config',{useDefault:true,model:config.model},id)).status,403);
  await a.request('/api/memory/start',{},id);
  let state=(await b.request('/api/state',undefined,id)).data;
  assert.equal(state.city.memoryGame.active,true);assert.equal(state.managedConnection,true);assert.equal(state.connected,true);
  assert.equal((await b.request('/api/state',undefined,other)).data.city.active,false);
  await b.request('/api/central/chat',{message:'Hello',position:places.central},id);
  state=(await a.request('/api/state',undefined,id)).data;assert.equal(state.calls,1);
  const voice=(await a.request('/api/central/voice',{sdp,position:places.central},id)).data;assert.equal(voice.durationMs,240000);
  const tool={connection:voice.connection,callId:'call_1',name:'set_modernization',arguments:{enabled:false},position:places.central};
  assert.equal((await b.request('/api/central/tool',tool,other)).status,409);
  assert.equal((await b.request('/api/central/tool',tool,id)).data.result.town.modelEnabled,false);
  assert.equal((await a.request('/api/central/stop',{connection:voice.connection},id)).status,200);
  assert.ok(requests.some(url=>url.endsWith('/rtc_hosted/hangup')));
  await b.request('/api/reset',{},id);assert.equal((await a.request('/api/state',undefined,id)).data.calls,1);
  for(const path of ['/.env','/server/local-config.mjs','/server/config.mjs','/.vercel/project.json','/data/sessions/'+id+'.json'])assert.equal((await a.request(path)).status,404);
  for(const value of redis.values.values())assert.ok(!String(value).includes(secret));
 }finally{await a.close();await b.close();}
});

test('distributed session transactions prevent lost changes and fence expired workers',async()=>{
 const redis=redisService(),a=redis.store(),b=redis.store(),id=randomUUID();
 await a.create(id,{world:createSociety(),config});
 await Promise.all([a.transact(id,config,async s=>{await new Promise(r=>setTimeout(r,30));s.config.calls++;return 'a';}),b.transact(id,config,async s=>{s.config.calls++;return 'b';})]);
 assert.equal(await a.transact(id,config,s=>s.config.calls),2);
 await assert.rejects(a.transact(id,config,s=>{s.config.calls=999;redis.values.set('ai-town:session:'+id+':lock','a-new-worker');return true;}),/SAVE_WRITE_FAILED/);
 assert.equal(JSON.parse(redis.values.get('ai-town:session:'+id)).runtime.calls,2);
 assert.equal(redis.values.get('ai-town:session:'+id+':lock'),'a-new-worker');
});

test('serialization excludes all credentials and restores only the server-selected connection',()=>{
 const original={world:createSociety(),config:{...config,calls:3},realtime:{key:secret,connection:'connection',callId:'rtc_test',expiresAt:Date.now()+1000,results:new Map(),controller:new AbortController(),sdp:'private-sdp'},speech:{calls:2,cache:new Map()},imageJobs:new Map()};
 const saved=serializeSession(original);assert.ok(!saved.includes(secret));assert.ok(!saved.includes('private-sdp'));assert.ok(!saved.includes('config'));
 const restored=restoreSession(saved,{...config,key:'rotated-server-key'});assert.equal(restored.config.key,'rotated-server-key');assert.equal(restored.realtime.key,'rotated-server-key');assert.equal(restored.config.calls,3);assert.equal(restored.speech.calls,2);assert.ok(restored.world.busy instanceof Set);
});

test('shared OpenAI quotas survive workers and never relay storage/provider credentials in errors',async()=>{
 const redis=redisService();let paid=0;
 const fetcher=async(url,options)=>new URL(url).origin==='https://redis.example'?redis.fetcher(url,options):(paid++,Response.json({ok:true}));
 const env={UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'private-redis-token',AI_TOWN_DAILY_TEXT_LIMIT:'1'};
 await hostedOptions(env,fetcher).fetcher('https://api.openai.com/v1/responses',{});
 await assert.rejects(hostedOptions(env,fetcher).fetcher('https://api.openai.com/v1/responses',{}),/API_LIMIT/);assert.equal(paid,1);
 assert.throws(()=>hostedOptions({},fetcher),/HOSTED_STORAGE_REQUIRED/);
 const bad=createHostedStore({url:'https://redis.example',token:'private-redis-token',fetcher:async()=>Response.json({error:secret},{status:500})});
 await assert.rejects(bad.create(randomUUID(),{world:createSociety(),config}),error=>error.message==='STORAGE_UNAVAILABLE');
});

test('hosted generated speech and images remain available to another worker without filesystem writes',async()=>{
 const redis=redisService(),store=redis.store(),id=randomUUID(),s={world:createSociety(),config,language:'en'};
 startCommunity(s.world);let paidSpeech=0;
 await store.create(id,s);
 const voice=async()=>{paidSpeech++;return new Response(Buffer.alloc(500,1),{status:200});};
 const event=s.world.city.events.find(e=>e.community);
 const first=await store.transact(id,config,s=>communitySpeech({...s,language:'en'},event.id,voice));
 const second=await redis.store().transact(id,config,s=>communitySpeech({...s,language:'en'},event.id,voice));
 assert.deepEqual(first,second);assert.equal(paidSpeech,1);
 await store.transact(id,config,async s=>{
  interactCommunity(s.world,'switch',{x:0,z:6.6},s.world.city.community.revision);
  await proposeCommunity(s.world,'A garden',async(i,input,fallback)=>({mode:'demo',text:fallback()}));
  const jpeg=Buffer.alloc(1000,1);jpeg[0]=255;jpeg[1]=216;
  return generateCommunityArt(s,s.world.city.community.project.revision,async()=>Response.json({data:[{b64_json:jpeg.toString('base64')}]}),new URL('file:///cannot-write-here/'));
 });
 const art=await redis.store().transact(id,config,s=>readCommunityArt(s,s.world.city.community.art.id,new URL('file:///cannot-write-here/')));
 assert.ok(art.url.startsWith('data:image/jpeg;base64,'));
});

test('the public build contains playable assets and never publishes repository secrets or server code',async()=>{
 const output=await mkdtemp(join(tmpdir(),'ai-town-public-'));
 try{
  const result=await buildWeb(output);assert.ok(result.files>100);
  for(const file of ['.env','.env.example','server.mjs','server/config.mjs','server/local-config.mjs','.git/config','.vercel/project.json','tests/server.test.mjs','package.json'])await assert.rejects(access(join(output,file)));
  for(const file of ['index.html','src/game.js','src/readability.css','assets/characters/player.glb','assets/memory/voices.json','node_modules/three/build/three.module.js'])await access(join(output,file));
  assert.match(await readFile(join(output,'index.html'),'utf8'),/AI TOWN/);
 }finally{await rm(output,{recursive:true,force:true});}
});
