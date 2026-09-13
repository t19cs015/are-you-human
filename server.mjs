import {advanceProject,projectFeedback} from './server/projects.mjs';
import {createStorage} from './server/storage.mjs';
import {memoryPage} from './server/memory.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createSociety,chat,social,updateSociety,publicState,witnessAction,greet,recordActivity,instructions } from './server/society.mjs';
import { createGenerator } from './server/provider.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const {default:defaultApiKey}=await import('./server/local-config.mjs').catch(error=>{
 if(error.code==='ERR_MODULE_NOT_FOUND')return {default:''};
 throw new Error('LOCAL_CONFIG_INVALID');
});
const types={html:'text/html',js:'text/javascript',css:'text/css',glb:'model/gltf-binary',json:'application/json'};
const json=(res,code,data)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
async function body(req){let raw='';for await(const part of req){raw+=part;if(raw.length>16000)throw new Error('BODY_TOO_LARGE');}return JSON.parse(raw||'{}');}
export function createServer({fetcher=fetch,apiKey=defaultApiKey,saveDirectory=null}={}){
 const sessions=new Map(),hydrating=new Map(),storage=saveDirectory?createStorage(saveDirectory):null;
 return http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host||'';
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return json(res,403,{error:'LOCAL_ONLY'});
   const url=new URL(req.url,`http://${host}`);
   if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'ORIGIN'});
    if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});
    const data=req.method==='POST'?await body(req):{};
    if(url.pathname==='/api/session'&&req.method==='POST'){
     for(const [id,s] of sessions)if(Date.now()-s.touched>3600000&&!s.world.busy.size)sessions.delete(id);
     if(sessions.size>=100)return json(res,429,{error:'SESSIONS_FULL'});
     const id=randomUUID();sessions.set(id,{world:createSociety(),config:{key:apiKey,model:'gpt-5.5',calls:0,retryAfter:0},touched:Date.now(),lastSocial:0});
     if(storage)await storage.save(id,sessions.get(id).world);
     return json(res,200,{id});
    }
    const sessionId=req.headers['x-session'];let s=sessions.get(sessionId);
    if(!s&&storage){
     if(!hydrating.has(sessionId))hydrating.set(sessionId,(async()=>{const world=await storage.load(sessionId);if(!world)return null;if(sessions.size>=100)throw new Error('SESSIONS_FULL');const restored={world,config:{key:apiKey,model:'gpt-5.5',calls:0,retryAfter:0},touched:Date.now(),lastSocial:0};sessions.set(sessionId,restored);return restored;})());
     try{s=await hydrating.get(sessionId);}finally{hydrating.delete(sessionId);}
    }
    if(!s)return json(res,401,{error:'SESSION_EXPIRED'});s.touched=Date.now();
    const generate=createGenerator(s.config,fetcher);
    const commit=async operation=>{const result=await operation;if(storage)await storage.save(sessionId,s.world);return json(res,200,result);};
    if(url.pathname==='/api/memories'&&req.method==='GET'){const agentId=url.searchParams.get('id');if(!Object.hasOwn(s.world.agents,agentId))return json(res,400,{error:'UNKNOWN_AGENT'});const offset=Math.max(0,Math.min(5000,Number(url.searchParams.get('offset'))||0));return json(res,200,memoryPage(s.world.agents[agentId],(url.searchParams.get('q')||'').slice(0,200),Math.floor(offset)));}
    if(url.pathname==='/api/state'&&req.method==='GET')return json(res,200,{...publicState(s.world),connected:!!s.config.key,model:s.config.model,calls:s.config.calls,persistence:!!storage});
    if(url.pathname==='/api/config'&&req.method==='POST'){
     if(s.world.busy.size)return json(res,409,{error:'BUSY'});
     if(typeof data.key!=='string'||data.key.length>300||typeof data.model!=='string'||!/^[\w.:-]{1,100}$/.test(data.model))return json(res,400,{error:'INVALID_CONFIG'});
     s.config={key:data.key.trim(),model:data.model,calls:0,retryAfter:0};return json(res,200,{connected:!!s.config.key,model:s.config.model});
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
     if(s.world.busy.size)return json(res,409,{error:'BUSY'});s.world=createSociety();s.lastSocial=0;return await commit({ok:true});
    }
    return json(res,404,{error:'NOT_FOUND'});
   }
   // Explicit public files only: never serve server code, keys, dotfiles or tests.
   const p=decodeURIComponent(url.pathname);
   const allowed=p==='/assets/characters/mia.glb'||p==='/cafe-review.html'||/^\/assets\/cafe\/[a-zA-Z0-9_-]+\.(glb|json)$/.test(p)||['/node_modules/three/examples/jsm/loaders/GLTFLoader.js','/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js'].includes(p)||p==='/'||p==='/index.html'||/^\/src\/[a-z-]+\.(js|css)$/.test(p)||p==='/node_modules/three/build/three.module.js';
   if(req.method!=='GET'||!allowed)return json(res,404,{error:'NOT_FOUND'});
   const file=p==='/'?'index.html':p.slice(1);const text=await readFile(root+file);
   res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(text);
  }catch(e){const code=['BUSY','STALE'].includes(e.message)?409:['UNKNOWN_AGENT','UNKNOWN_PROJECT','INVALID_ARTIFACT','INVALID_ACTION','BODY_TOO_LARGE'].includes(e.message)||e instanceof SyntaxError?400:500;json(res,code,{error:code===500?(['SAVE_WRITE_FAILED','SAVE_READ_FAILED'].includes(e.message)?e.message:'SERVER_ERROR'):e.message});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer({saveDirectory:root+'data/sessions'}).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('ARE YOU HUMAN? → http://127.0.0.1:'+(process.env.PORT||4173)));
