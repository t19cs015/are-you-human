import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {restoreWorld,validSessionId} from './storage.mjs';

// Save only gameplay and accounting. Never serialize keys, environment variables,
// request headers, SDP, AbortControllers, promises, or running timers.
export function serializeSession(s){
 const {busy,...world}=s.world;
 const voice=s.realtime;
 return JSON.stringify({schema:1,world,runtime:{
  calls:s.config.calls,retryAfter:s.config.retryAfter,
  lastSocial:s.lastSocial||0,lastCityThink:s.lastCityThink||0,lastProject:s.lastProject||0,
  speechCalls:s.speech?.calls||0,centralHistory:s.centralHistory||[],
  realtime:voice?.callId?{connection:voice.connection,callId:voice.callId,expiresAt:voice.expiresAt,results:[...voice.results]}:null,
 }});
}
export function restoreSession(serialized,config,extras={}){
 let saved;try{saved=JSON.parse(serialized);}catch{throw new Error('SAVE_READ_FAILED');}
 if(saved.schema!==1||!saved.runtime)throw new Error('SAVE_READ_FAILED');
 const r=saved.runtime;
 const s={world:restoreWorld(saved.world),config:{...config,calls:r.calls||0,retryAfter:r.retryAfter||0},
  lastSocial:r.lastSocial||0,lastCityThink:r.lastCityThink||0,lastProject:r.lastProject||0,
  speech:{calls:r.speechCalls||0,cache:new Map()},centralHistory:r.centralHistory||[],touched:Date.now(),...extras};
 if(r.realtime)s.realtime={...r.realtime,key:config.key,results:new Map(r.realtime.results||[]),controller:new AbortController()};
 return s;
}

const releaseScript="if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
const saveScript="if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3]); redis.call('DEL',KEYS[1]); return 1";
const limitScript="local n=redis.call('INCR',KEYS[1]); if n == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end return n";

export function createHostedStore({url,token,namespace='ai-town',ttl=7*24*60*60,fetcher=fetch}={}){
 if(!url||!token)throw new Error('HOSTED_STORAGE_REQUIRED');
 let endpoint;try{endpoint=new URL(url);}catch{throw new Error('HOSTED_STORAGE_REQUIRED');}
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error('HOSTED_STORAGE_REQUIRED');
 if(!/^[\w:-]{1,160}$/.test(namespace))throw new Error('HOSTED_STORAGE_REQUIRED');
 async function command(args){
  try{
   const response=await fetcher(endpoint.href,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error();
   const data=await response.json();if(data.error)throw new Error();return data.result;
  }catch{throw new Error('STORAGE_UNAVAILABLE');}
 }
 const sessionKey=id=>namespace+':session:'+id;
 const media=id=>({
  async get(name){return command(['GET',sessionKey(id)+':media:'+name]);},
  async put(name,value){if(typeof value!=='string'||Buffer.byteLength(value)>3000000)throw new Error('MEDIA_TOO_LARGE');await command(['SET',sessionKey(id)+':media:'+name,value,'EX',ttl]);},
 });
 return {
  async create(id,s){
   if(!validSessionId(id))throw new Error('SAVE_WRITE_FAILED');
   if(await command(['SET',sessionKey(id),serializeSession(s),'EX',ttl,'NX'])!=='OK')throw new Error('SAVE_WRITE_FAILED');
  },
  async transact(id,config,operation,extras={}){
   if(!validSessionId(id))return null;
   const key=sessionKey(id),lock=key+':lock',owner=randomUUID();let acquired=false;
   for(let attempt=0;attempt<4;attempt++){
    if(await command(['SET',lock,owner,'NX','PX',300000])==='OK'){acquired=true;break;}
    if(attempt<3)await delay(100*(attempt+1));
   }
   if(!acquired)throw new Error('BUSY');
   try{
    const saved=await command(['GET',key]);if(!saved)return null;
    const s=restoreSession(saved,config,{...extras,media:media(id)});
    const result=await operation(s);
    // The lock token fences a timed-out worker from overwriting a newer save.
    if(await command(['EVAL',saveScript,2,lock,key,owner,serializeSession(s),ttl])!==1)throw new Error('SAVE_WRITE_FAILED');
    acquired=false;return result;
   }finally{if(acquired)await command(['EVAL',releaseScript,1,lock,owner]);}
  },
  async consume(scope,limit,windowSeconds=86400){
   if(limit<=0)return false;
   const window=Math.floor(Date.now()/(windowSeconds*1000));
   return await command(['EVAL',limitScript,1,namespace+':limit:'+scope+':'+window,windowSeconds+60])<=limit;
  },
 };
}
