import {loadEnvFile} from 'node:process';

// Node reads .env without replacing values explicitly set by the shell.
try{if(process.env.VERCEL!=='1')loadEnvFile(new URL('../.env',import.meta.url));}catch(error){
  if(error.code!=='ENOENT')throw new Error('ENV_CONFIG_INVALID');
}
const {default:legacyKey}=process.env.VERCEL==='1'?{default:''}:await import('./local-config.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {default:''};
  throw new Error('LOCAL_CONFIG_INVALID');
});
export const defaults={
  key:(process.env.OPENAI_API_KEY??legacyKey).trim(),
  model:process.env.OPENAI_MODEL||'gpt-5.6-luna',
  realtimeModel:process.env.OPENAI_REALTIME_MODEL||'gpt-realtime-mini',
  imageModel:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-flare',
};
