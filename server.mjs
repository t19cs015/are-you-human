import {advanceProject,projectFeedback} from './server/projects.mjs';
import {startCity,startEpisode,startCommunity,tickCity,thinkCity,controlCity,visitCityFacility,publicCity} from './server/city.mjs';
import {inspectEpisode,proposeEpisode} from './server/episode.mjs';
import {episodeSpeech,communitySpeech,residentSpeech} from './server/speech.mjs';
import {interactCommunity,proposeCommunity} from './server/community.mjs';
import {generateCommunityArt,readCommunityArt} from './server/community-art.mjs';
import {createStorage} from './server/storage.mjs';
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
const json=(res,code,data)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
async function body(req,limit=16000){let raw='';for await(const part of req){raw+=part;if(raw.length>limit)throw new Error('BODY_TOO_LARGE');}return JSON.parse(raw||'{}');}
export function createServer({fetcher=fetch,apiKey=defaults.key,model=defaults.model,realtimeModel=defaults.realtimeModel,imageModel=defaults.imageModel,saveDirectory=null}={}){
 const sessions=new Map(),hydrating=new Map(),storage=saveDirectory?createStorage(saveDirectory):null;
 const config=()=>({key:apiKey,model,realtimeModel,imageModel,calls:0,retryAfter:0});
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host||'';
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return json(res,403,{error:'LOCAL_ONLY'});
   const url=new URL(req.url,`http://${host}`);
   if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'ORIGIN'});
    if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});
    const data=req.method==='POST'?await body(req,url.pathname==='/api/central/voice'?65536:16000):{};
    if(url.pathname==='/api/session'&&req.method==='POST'){
     for(const [id,s] of sessions)if(Date.now()-s.touched>3600000&&!s.world.busy.size&&!s.realtime)sessions.delete(id);
     if(sessions.size>=100)return json(res,429,{error:'SESSIONS_FULL'});
     const id=randomUUID();sessions.set(id,{world:createSociety(),config:config(),touched:Date.now(),lastSocial:0});
     if(storage)await storage.save(id,sessions.get(id).world);
     return json(res,200,{id});
    }
    const sessionId=req.headers['x-session'];let s=sessions.get(sessionId);
    if(!s&&storage){
     if(!hydrating.has(sessionId))hydrating.set(sessionId,(async()=>{const world=await storage.load(sessionId);if(!world)return null;if(sessions.size>=100)throw new Error('SESSIONS_FULL');const restored={world,config:config(),touched:Date.now(),lastSocial:0};sessions.set(sessionId,restored);return restored;})());
     try{s=await hydrating.get(sessionId);}finally{hydrating.delete(sessionId);}
    }
    if(!s)return json(res,401,{error:'SESSION_EXPIRED'});s.touched=Date.now();
    const generate=createGenerator(s.config,fetcher);
    const commit=async operation=>{const result=await operation;if(storage)await storage.save(sessionId,s.world);return json(res,200,result);};
    if(url.pathname==='/api/memories'&&req.method==='GET'){const agentId=url.searchParams.get('id');if(!Object.hasOwn(s.world.agents,agentId))return json(res,400,{error:'UNKNOWN_AGENT'});const offset=Math.max(0,Math.min(5000,Number(url.searchParams.get('offset'))||0));return json(res,200,memoryPage(s.world.agents[agentId],(url.searchParams.get('q')||'').slice(0,200),Math.floor(offset)));}
    if(url.pathname==='/api/state'&&req.method==='GET')return json(res,200,{...publicState(s.world),connected:!!s.config.key,model:s.config.model,realtimeModel:s.config.realtimeModel,defaultConfigured:!!apiKey,calls:s.config.calls,persistence:!!storage});
    if(url.pathname==='/api/config'&&req.method==='POST'){
     if(s.world.busy.size)return json(res,409,{error:'BUSY'});
     if((data.key!==undefined&&(typeof data.key!=='string'||data.key.length>300))||typeof data.model!=='string'||!/^[\w.:-]{1,100}$/.test(data.model))return json(res,400,{error:'INVALID_CONFIG'});
     await endCentralVoice(s,null,fetcher);
     s.config={key:data.useDefault===true?apiKey:data.key===undefined?s.config.key:data.key.trim(),model:data.model,realtimeModel,imageModel,calls:0,retryAfter:0};return json(res,200,{connected:!!s.config.key,model:s.config.model});
    }
    if(url.pathname==='/api/central/voice'&&req.method==='POST')return json(res,200,await openCentralVoice(s,data,fetcher));
    if(url.pathname==='/api/central/stop'&&req.method==='POST')return json(res,200,await endCentralVoice(s,data.connection,fetcher));
    if(url.pathname==='/api/central/tool'&&req.method==='POST')return await commit(voiceTool(s,data));
    if(url.pathname==='/api/central/chat'&&req.method==='POST')return await commit(await chatWithCentral(s,data,generate));
    if(url.pathname==='/api/episode/start'&&req.method==='POST')return await commit(startEpisode(s.world));
    if(url.pathname==='/api/episode/inspect'&&req.method==='POST'){const result=inspectEpisode(s.world,data.clue,data.position);return await commit({...result,city:publicCity(s.world)});}
    if(url.pathname==='/api/episode/propose'&&req.method==='POST'){const result=await proposeEpisode(s.world,data.message,generate);return await commit({...result,city:publicCity(s.world)});}
    if(url.pathname==='/api/episode/speech'&&req.method==='POST')return json(res,200,await episodeSpeech(s,data.event,fetcher));
    if(url.pathname==='/api/community/start'&&req.method==='POST')return await commit(startCommunity(s.world));
    if(url.pathname==='/api/community/interact'&&req.method==='POST'){const result=interactCommunity(s.world,data.object,data.position,data.revision);return await commit({...result,city:publicCity(s.world)});}
    if(url.pathname==='/api/community/propose'&&req.method==='POST'){const result=await proposeCommunity(s.world,data.message,generate);return await commit({...result,city:publicCity(s.world)});}
    if(url.pathname==='/api/community/image'&&req.method==='POST')return await commit(await generateCommunityArt(s,data.revision,fetcher));
    if(url.pathname==='/api/community/art'&&req.method==='GET')return json(res,200,await readCommunityArt(s,url.searchParams.get('id')));
    if(url.pathname==='/api/community/speech'&&req.method==='POST')return json(res,200,await communitySpeech(s,data.event,fetcher));
    if(url.pathname==='/api/resident/speech'&&req.method==='POST')return json(res,200,await residentSpeech(s,data.id,fetcher));
    if(url.pathname==='/api/city/start'&&req.method==='POST')return await commit(startCity(s.world));
    if(url.pathname==='/api/city/tick'&&req.method==='POST')return await commit(tickCity(s.world,data.positions,data.held));
    if(url.pathname==='/api/city/control'&&req.method==='POST')return await commit(controlCity(s.world,data.action,data.position));
    if(url.pathname==='/api/city/visit'&&req.method==='POST')return await commit(visitCityFacility(s.world,data.site,data.position));
    if(url.pathname==='/api/city/think'&&req.method==='POST'){
     if(!Array.isArray(data.held)||data.held.length>4||data.held.some(id=>!Object.hasOwn(s.world.agents,id)))return json(res,400,{error:'INVALID_ACTION'});
     if(Date.now()-(s.lastCityThink||0)<2500)return json(res,429,{error:'CITY_COOLDOWN'});
     s.lastCityThink=Date.now();return await commit(await thinkCity(s.world,generate,instructions,data.held));
    }
    if(url.pathname==='/api/projects/feedback'&&req.method==='POST')return await commit(projectFeedback(s.world,data.id,data.revision,data.text));
    if(url.pathname==='/api/projects/tick'&&req.method==='POST'){
     if(Date.now()-(s.lastProject||0)<12000)return json(res,429,{error:'PROJECT_COOLDOWN'});
     const project=s.world.projects.filter(p=>!['published','hold'].includes(p.phase)).sort((a,b)=>a.updated-b.updated)[0];
     if(!project)return json(res,200,{idle:true});s.lastProject=Date.now();return await commit(await advanceProject(s.world,project.id,generate,instructions,project.revision));
    }
    if(url.pathname==='/api/activity'&&req.method==='POST')return await commit(recordActivity(s.world,data.id,data.index));
    if(url.pathname==='/api/greet'&&req.method==='POST')return await commit(await greet(s.world,data.id,generate,Date.now(),data.proactive===true));
    if(url.pathname==='/api/chat'&&req.method==='POST'){
     if(typeof data.message!=='string'||!data.message.trim()||data.message.length>1000)return json(res,400,{error:'INVALID_MESSAGE'});
     return await commit(await chat(s.world,data.id,data.message.trim(),generate));
    }
    if(url.pathname==='/api/social'&&req.method==='POST'){
     if(Date.now()-s.lastSocial<10000)return json(res,429,{error:'SOCIAL_COOLDOWN'});s.lastSocial=Date.now();
     return await commit(await social(s.world,data.from,data.to,generate));
    }
    if(url.pathname==='/api/action'&&req.method==='POST')return await commit(witnessAction(s.world,data.kind,data.witnesses));
    if(url.pathname==='/api/update'&&req.method==='POST')return await commit(updateSociety(s.world));
    if(url.pathname==='/api/reset'&&req.method==='POST'){
     if(s.world.busy.size)return json(res,409,{error:'BUSY'});await endCentralVoice(s,null,fetcher);s.world=createSociety();s.centralHistory=[];s.lastSocial=0;return await commit({ok:true});
    }
    return json(res,404,{error:'NOT_FOUND'});
   }
   // Explicit public files only: never serve server code, keys, dotfiles or tests.
   const p=decodeURIComponent(url.pathname);
   const allowed=/^\/assets\/(episode|community)\/[a-z_]+\.(mp3|json)$/.test(p)||/^\/assets\/characters\/(mia|ren|tomo|shell)\.glb$/.test(p)||/^\/assets\/infrastructure\/[a-z-]+\.(glb|json)$/.test(p)||p==='/character-review.html'||p==='/cafe-review.html'||/^\/assets\/cafe\/[a-zA-Z0-9_-]+\.(glb|json)$/.test(p)||['/node_modules/three/examples/jsm/loaders/GLTFLoader.js','/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js','/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'].includes(p)||p==='/'||p==='/index.html'||/^\/src\/[a-z-]+\.(js|css)$/.test(p)||p==='/node_modules/three/build/three.module.js';
   if(req.method!=='GET'||!allowed)return json(res,404,{error:'NOT_FOUND'});
   const file=p==='/'?'index.html':p.slice(1);const text=await readFile(root+file);
   res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(text);
  }catch(e){const code=['BUSY','STALE','REALTIME_BUSY','REALTIME_CLOSED','CITY_INACTIVE','EPISODE_REQUIRES_NEW_NIGHT'].includes(e.message)?409:['KEY_REQUIRED','API_KEY_INVALID','API_LIMIT','REALTIME_UNAVAILABLE','ART_UNAVAILABLE'].includes(e.message)?503:['UNKNOWN_AGENT','UNKNOWN_PROJECT','INVALID_ARTIFACT','INVALID_ACTION','INVALID_MESSAGE','INVALID_SDP','TOO_FAR','TRY_SWITCH_FIRST','INVALID_PLAN','BODY_TOO_LARGE'].includes(e.message)||e instanceof SyntaxError?400:500;json(res,code,{error:code===500?(['SAVE_WRITE_FAILED','SAVE_READ_FAILED'].includes(e.message)?e.message:'SERVER_ERROR'):e.message});}
 });
 server.on('close',()=>{for(const s of sessions.values())endCentralVoice(s,null,fetcher).catch(()=>{});});
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer({saveDirectory:root+'data/sessions'}).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('ARE YOU HUMAN? → http://127.0.0.1:'+(process.env.PORT||4173)));
