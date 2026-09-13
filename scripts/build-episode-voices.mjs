import {mkdir,writeFile,access,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {defaults} from '../server/config.mjs';
import {generateSpeech} from '../server/speech.mjs';
import {episodeLines,episodeVoices} from '../src/episode-script.js';

if(!defaults.key)throw new Error('Set OPENAI_API_KEY in .env first.');
const directory=new URL('../assets/episode/',import.meta.url);await mkdir(directory,{recursive:true});
let previous=[];try{previous=JSON.parse(await readFile(new URL('manifest.json',directory),'utf8')).lines||[];}catch{}
const manifest=[];
for(const [id,{by,text}] of Object.entries(episodeLines)){
  const textHash=createHash('sha256').update(text).digest('hex'),voice=episodeVoices[by];
  const file=new URL(id+'.mp3',directory);let exists=false;try{await access(file);exists=previous.some(x=>x.id===id&&x.textHash===textHash&&x.voice===voice);}catch{}
  if(!exists){await writeFile(file,await generateSpeech(defaults.key,by,text));console.log('Generated '+id+'.mp3');}
  manifest.push({id,by,text,voice,model:'gpt-4o-mini-tts',textHash});
}
await writeFile(new URL('manifest.json',directory),JSON.stringify({generatedWith:'OpenAI Text to speech',lines:manifest},null,2)+'\n');
