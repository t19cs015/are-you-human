import {access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {episodeVoices,episodeVoiceInstructions,episodeLines} from '../src/episode-script.js';

export async function generateSpeech(key,by,text,fetcher=fetch){
  const r=await fetcher('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:'gpt-4o-mini-tts',voice:episodeVoices[by]||'marin',instructions:episodeVoiceInstructions[by],input:text,response_format:'mp3',speed:1.03})});
  if(!r.ok)throw new Error('SPEECH_UNAVAILABLE');
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2000000||bytes.length<50)throw new Error('SPEECH_UNAVAILABLE');return bytes;
}
export async function episodeSpeech(s,id,fetcher=fetch){
  if(!s.world.city?.episode?.active||!Number.isInteger(id))throw new Error('INVALID_ACTION');
  const event=s.world.city.events.find(e=>e.id===id&&e.episode);
  if(!event||!Object.hasOwn(episodeVoices,event.by))throw new Error('INVALID_ACTION');
  if(event.clip&&Object.hasOwn(episodeLines,event.clip)&&event.text===episodeLines[event.clip].text){
    try{await access(new URL('../assets/episode/'+event.clip+'.mp3',import.meta.url));return {url:'/assets/episode/'+event.clip+'.mp3',mode:'generated'};}catch{}
  }
  if(!s.config.key)return {mode:'unavailable'};
  s.speech??={cache:new Map(),calls:0};
  const hash=createHash('sha256').update(event.by+'\n'+event.text).digest('hex');
  if(!s.speech.cache.has(hash)){
    if(s.speech.calls>=32)return {mode:'unavailable'};s.speech.calls++;
    const request=generateSpeech(s.config.key,event.by,event.text,fetcher).then(bytes=>({url:'data:audio/mpeg;base64,'+bytes.toString('base64'),mode:'generated'})).catch(()=>({mode:'unavailable'}));
    s.speech.cache.set(hash,request);if(s.speech.cache.size>24)s.speech.cache.delete(s.speech.cache.keys().next().value);
  }
  return s.speech.cache.get(hash);
}
