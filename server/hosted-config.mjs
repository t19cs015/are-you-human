import {createHash} from 'node:crypto';
import {createHostedStore} from './hosted-store.mjs';

export function hostedOptions(env=process.env,fetcher=fetch){
 const limit=(name,fallback)=>{
  if(env[name]===undefined||env[name]==='')return fallback;
  const value=Number(env[name]);if(!Number.isSafeInteger(value)||value<0)throw new Error('HOSTED_CONFIG_INVALID');return value;
 };
 const store=createHostedStore({
  url:env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,
  token:env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN,
  namespace:env.AI_TOWN_STORAGE_PREFIX||'ai-town:'+(env.VERCEL_ENV||'production'),fetcher,
 });
 const budgets={
  '/v1/responses':['text',limit('AI_TOWN_DAILY_TEXT_LIMIT',1000)],
  '/v1/audio/speech':['speech',limit('AI_TOWN_DAILY_SPEECH_LIMIT',500)],
  '/v1/images/generations':['image',limit('AI_TOWN_DAILY_IMAGE_LIMIT',12)],
  '/v1/realtime/calls':['voice',limit('AI_TOWN_DAILY_VOICE_LIMIT',30)],
 };
 return {hosted:true,sessionStore:store,
  async allowSession(req){
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
   const fingerprint=createHash('sha256').update(ip).digest('hex');
   return await store.consume('new-session:'+fingerprint,20,3600)&&await store.consume('new-session:all',100,3600);
  },
  async fetcher(url,options){
   const target=new URL(url),budget=target.origin==='https://api.openai.com'?budgets[target.pathname]:null;
   if(budget&&!await store.consume('openai:'+budget[0],budget[1]))throw new Error('API_LIMIT');
   return fetcher(url,options);
  },
 };
}
