import {advanceProject,projectFeedback} from './server/projects.mjs';
import {startCity,startEpisode,startCommunity,tickCity,thinkCity,controlCity,visitCityFacility,publicCity} from './server/city.mjs';
import {inspectEpisode,proposeEpisode} from './server/episode.mjs';
import {episodeSpeech,communitySpeech,residentSpeech} from './server/speech.mjs';
import {interactCommunity,proposeCommunity,emitCommunity} from './server/community.mjs';
import {humanAction} from './server/human.mjs';
import {initializeMemoryGame,editMemoryGame,talkMemoryGame,interactMemoryTown} from './server/memory-game.mjs';
import {memoryGameSpeech} from './server/speech.mjs';
import {generateCommunityArt,readCommunityArt} from './server/community-art.mjs';
import {createStorage} from './server/storage.mjs';
import {isPublicFile} from './server/public-files.mjs';
import {memoryPage} from './server/memory.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createSociety,chat,social,updateSociety,publicState,witnessAction,greet,recordActivity,instructions } from './server/society.mjs';
import { createGenerator } from './server/provider.mjs';
import {defaults} from './server/config.mjs';
import {openCentralVoice,endCentralVoice,voiceTool,chatWithCentral} from './server/central.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={mp3:'audio/mpeg',html:'text/html',js:'text/javascript',css:'text/css',glb:'model/gltf-binary',json:'application/json'};
const json=(res,code,data)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));
const outcome=(status,data)=>({status,data});
function failure(e){
 const message=e instanceof Error?e.message:'';
 const code=['BUSY','STALE','REALTIME_BUSY','REALTIME_CLOSED','CITY_INACTIVE','EPISODE_REQUIRES_NEW_NIGHT'].includes(message)?409:
  ['KEY_REQUIRED','API_KEY_INVALID','API_LIMIT','REALTIME_UNAVAILABLE','ART_UNAVAILABLE','STORAGE_UNAVAILABLE','HOSTED_STORAGE_REQUIRED'].includes(message)?503:
  ['UNKNOWN_AGENT','UNKNOWN_PROJECT','INVALID_ARTIFACT','INVALID_ACTION','INVALID_MESSAGE','INVALID_SDP','TOO_FAR','TRY_SWITCH_FIRST','INVALID_PLAN','BODY_TOO_LARGE'].includes(message)||e instanceof SyntaxError?400:500;
 return outcome(code,{error:code===500?(['SAVE_WRITE_FAILED','SAVE_READ_FAILED'].includes(message)?message:'SERVER_ERROR'):e instanceof SyntaxError?'INVALID_JSON':message});
}
async function body(req,limit=16000){
 const parts=[];let size=0;
 for await(const part of req){const bytes=Buffer.from(part);size+=bytes.length;if(size>limit)throw new Error('BODY_TOO_LARGE');parts.push(bytes);}
 const data=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('INVALID_ACTION');
 return data;
}
export function createHandler({fetcher=fetch,apiKey=defaults.key,model=defaults.model,realtimeModel=defaults.realtimeModel,imageModel=defaults.imageModel,saveDirectory=null,hosted=false,sessionStore=null,allowSession=null,background=null}={}){
 const sessions=new Map(),hydrating=new Map(),storage=saveDirectory?createStorage(saveDirectory):null;
 const config=()=>({key:apiKey,model,realtimeModel,imageModel,calls:0,retryAfter:0});
 const handler=async(req,res)=>{
  try{
   const host=req.headers.host||'',local=/^(127\.0\.0\.1|localhost):\d+$/.test(host);
   if(!hosted&&!local)return json(res,403,{error:'LOCAL_ONLY'});
   if(!/^[a-z0-9.-]+(?::\d+)?$/i.test(host)||!req.url?.startsWith('/')||req.url.startsWith('//'))return json(res,400,{error:'INVALID_REQUEST'});
   const origin=(local?'http://':'https://')+host,url=new URL(req.url,origin);
   if(url.pathname.startsWith('/api/')){
    if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'ORIGIN'});
    if(!['GET','POST'].includes(req.method))return json(res,405,{error:'METHOD_NOT_ALLOWED'});
    if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});
    if(hosted&&!sessionStore)throw new Error('HOSTED_STORAGE_REQUIRED');
    const data=req.method==='POST'?await body(req,url.pathname==='/api/central/voice'?65536:16000):{};
    const requestLanguage=req.headers['x-language']==='en'?'en':'ja';
    if(url.pathname==='/api/session'&&req.method==='POST'){
     if(allowSession&&!await allowSession(req))return json(res,429,{error:'SESSION_LIMIT'});
     for(const [id,s] of sessions)if(Date.now()-s.touched>3600000&&!s.world.busy.size&&!s.realtime)sessions.delete(id);
     if(sessions.size>=100)return json(res,429,{error:'SESSIONS_FULL'});
     const id=randomUUID(),s={world:createSociety(),config:config(),language:requestLanguage,touched:Date.now(),lastSocial:0};
     if(sessionStore)await sessionStore.create(id,s);else sessions.set(id,s);
     if(storage)await storage.save(id,s.world);
     return json(res,200,{id});
    }
    const sessionId=req.headers['x-session'];
    const run=async s=>{
     try{
      s.touched=Date.now();s.language=requestLanguage;
      if(s.realtime&&Date.now()>=s.realtime.expiresAt)await endCentralVoice(s,s.realtime.connection,fetcher);
      const generate=createGenerator(s.config,fetcher,s.language);
      const commit=async operation=>{const result=await operation;if(storage)await storage.save(sessionId,s.world);return outcome(200,result);};
      if(url.pathname==='/api/memories'&&req.method==='GET'){const agentId=url.searchParams.get('id');if(!Object.hasOwn(s.world.agents,agentId))return outcome(400,{error:'UNKNOWN_AGENT'});const offset=Math.max(0,Math.min(5000,Number(url.searchParams.get('offset'))||0));return outcome(200,memoryPage(s.world.agents[agentId],(url.searchParams.get('q')||'').slice(0,200),Math.floor(offset)));}
      if(url.pathname==='/api/state'&&req.method==='GET')return outcome(200,{...publicState(s.world),connected:!!s.config.key,model:s.config.model,realtimeModel:s.config.realtimeModel,defaultConfigured:!!apiKey,calls:s.config.calls,persistence:!!(storage||sessionStore),managedConnection:hosted});
      if(url.pathname==='/api/config'&&req.method==='POST'){
       if(hosted)return outcome(403,{error:'HOSTED_CONFIG_LOCKED'});
       if(s.world.busy.size)return outcome(409,{error:'BUSY'});
       if((data.key!==undefined&&(typeof data.key!=='string'||data.key.length>300))||typeof data.model!=='string'||!/^[\w.:-]{1,100}$/.test(data.model))return outcome(400,{error:'INVALID_CONFIG'});
       await endCentralVoice(s,null,fetcher);
       s.config={key:data.useDefault===true?apiKey:data.key===undefined?s.config.key:data.key.trim(),model:data.model,realtimeModel,imageModel,calls:0,retryAfter:0};return outcome(200,{connected:!!s.config.key,model:s.config.model});
      }
      if(url.pathname==='/api/central/voice'&&req.method==='POST')return outcome(200,await openCentralVoice(s,data,fetcher));
      if(url.pathname==='/api/central/stop'&&req.method==='POST')return outcome(200,await endCentralVoice(s,data.connection,fetcher));
      if(url.pathname==='/api/central/tool'&&req.method==='POST')return await commit(voiceTool(s,data));
      if(url.pathname==='/api/central/chat'&&req.method==='POST')return await commit(await chatWithCentral(s,data,generate));
      if(url.pathname==='/api/memory/start'&&req.method==='POST'){startCommunity(s.world);initializeMemoryGame(s.world);return await commit(publicCity(s.world));}
      if(url.pathname==='/api/memory/edit'&&req.method==='POST'){const result=editMemoryGame(s.world,data);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/memory/talk'&&req.method==='POST'){const result=await talkMemoryGame(s.world,data,generate);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/memory/interact'&&req.method==='POST'){const result=interactMemoryTown(s.world,data);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/memory/speech'&&req.method==='POST')return outcome(200,await memoryGameSpeech(s,data.event,fetcher));
      if(url.pathname==='/api/episode/start'&&req.method==='POST')return await commit(startEpisode(s.world));
      if(url.pathname==='/api/episode/inspect'&&req.method==='POST'){const result=inspectEpisode(s.world,data.clue,data.position);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/episode/propose'&&req.method==='POST'){const result=await proposeEpisode(s.world,data.message,generate);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/episode/speech'&&req.method==='POST')return outcome(200,await episodeSpeech(s,data.event,fetcher));
      if(url.pathname==='/api/community/start'&&req.method==='POST')return await commit(startCommunity(s.world));
      if(url.pathname==='/api/community/human'&&req.method==='POST'){const r=humanAction(s.world,data,emitCommunity);return await commit({...r,city:publicCity(s.world)});}
      if(url.pathname==='/api/community/interact'&&req.method==='POST'){const result=interactCommunity(s.world,data.object,data.position,data.revision);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/community/propose'&&req.method==='POST'){const result=await proposeCommunity(s.world,data.message,generate);return await commit({...result,city:publicCity(s.world)});}
      if(url.pathname==='/api/community/image'&&req.method==='POST')return await commit(await generateCommunityArt(s,data.revision,fetcher));
      if(url.pathname==='/api/community/art'&&req.method==='GET')return outcome(200,await readCommunityArt(s,url.searchParams.get('id')));
      if(url.pathname==='/api/community/speech'&&req.method==='POST')return outcome(200,await communitySpeech(s,data.event,fetcher));
      if(url.pathname==='/api/resident/speech'&&req.method==='POST')return outcome(200,await residentSpeech(s,data.id,fetcher));
      if(url.pathname==='/api/city/start'&&req.method==='POST')return await commit(startCity(s.world));
      if(url.pathname==='/api/city/tick'&&req.method==='POST')return await commit(tickCity(s.world,data.positions,data.held));
      if(url.pathname==='/api/city/control'&&req.method==='POST')return await commit(controlCity(s.world,data.action,data.position));
      if(url.pathname==='/api/city/visit'&&req.method==='POST')return await commit(visitCityFacility(s.world,data.site,data.position));
      if(url.pathname==='/api/city/think'&&req.method==='POST'){
       if(!Array.isArray(data.held)||data.held.length>4||data.held.some(id=>!Object.hasOwn(s.world.agents,id)))return outcome(400,{error:'INVALID_ACTION'});
       if(Date.now()-(s.lastCityThink||0)<2500)return outcome(429,{error:'CITY_COOLDOWN'});
       s.lastCityThink=Date.now();return await commit(await thinkCity(s.world,generate,instructions,data.held));
      }
      if(url.pathname==='/api/projects/feedback'&&req.method==='POST')return await commit(projectFeedback(s.world,data.id,data.revision,data.text));
      if(url.pathname==='/api/projects/tick'&&req.method==='POST'){
       if(Date.now()-(s.lastProject||0)<12000)return outcome(429,{error:'PROJECT_COOLDOWN'});
       const project=s.world.projects.filter(p=>!['published','hold'].includes(p.phase)).sort((a,b)=>a.updated-b.updated)[0];
       if(!project)return outcome(200,{idle:true});s.lastProject=Date.now();return await commit(await advanceProject(s.world,project.id,generate,instructions,project.revision));
      }
      if(url.pathname==='/api/activity'&&req.method==='POST')return await commit(recordActivity(s.world,data.id,data.index));
      if(url.pathname==='/api/greet'&&req.method==='POST')return await commit(await greet(s.world,data.id,generate,Date.now(),data.proactive===true));
      if(url.pathname==='/api/chat'&&req.method==='POST'){
       if(typeof data.message!=='string'||!data.message.trim()||data.message.length>1000)return outcome(400,{error:'INVALID_MESSAGE'});
       return await commit(await chat(s.world,data.id,data.message.trim(),generate));
      }
      if(url.pathname==='/api/social'&&req.method==='POST'){
       if(Date.now()-s.lastSocial<10000)return outcome(429,{error:'SOCIAL_COOLDOWN'});s.lastSocial=Date.now();
       return await commit(await social(s.world,data.from,data.to,generate));
      }
      if(url.pathname==='/api/action'&&req.method==='POST')return await commit(witnessAction(s.world,data.kind,data.witnesses));
      if(url.pathname==='/api/update'&&req.method==='POST')return await commit(updateSociety(s.world));
      if(url.pathname==='/api/reset'&&req.method==='POST'){
       if(s.world.busy.size)return outcome(409,{error:'BUSY'});await endCentralVoice(s,null,fetcher);s.world=createSociety();s.centralHistory=[];s.lastSocial=0;return await commit({ok:true});
      }
      return outcome(404,{error:'NOT_FOUND'});
     }catch(error){return failure(error);}
    };
    let result;
    if(sessionStore)result=await sessionStore.transact(sessionId,config(),run,{hosted,background});
    else{
     let s=sessions.get(sessionId);
     if(!s&&storage){
      if(!hydrating.has(sessionId))hydrating.set(sessionId,(async()=>{const world=await storage.load(sessionId);if(!world)return null;if(sessions.size>=100)throw new Error('SESSIONS_FULL');const restored={world,config:config(),language:requestLanguage,touched:Date.now(),lastSocial:0};sessions.set(sessionId,restored);return restored;})());
      try{s=await hydrating.get(sessionId);}finally{hydrating.delete(sessionId);}
     }
     if(s)result=await run(s);
    }
    return result?json(res,result.status,result.data):json(res,401,{error:'SESSION_EXPIRED'});
   }
   const p=decodeURIComponent(url.pathname);
   if(!['GET','HEAD'].includes(req.method)||!isPublicFile(p))return json(res,404,{error:'NOT_FOUND'});
   const file=p==='/'?'index.html':p.slice(1);let bytes;
   try{bytes=await readFile(root+file);}catch(error){if(error.code==='ENOENT')return json(res,404,{error:'NOT_FOUND'});throw error;}
   res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:bytes);
  }catch(error){const result=failure(error);return json(res,result.status,result.data);}
 };
 handler.close=()=>{for(const s of sessions.values())endCentralVoice(s,null,fetcher).catch(()=>{});};
 return handler;
}
export function createServer(options={}){
 const handler=createHandler(options),server=http.createServer(handler);
 server.on('close',handler.close);return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer({saveDirectory:root+'data/sessions'}).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('AI TOWN → http://127.0.0.1:'+(process.env.PORT||4173)));
