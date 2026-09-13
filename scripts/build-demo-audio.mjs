import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {defaults} from '../server/config.mjs';
const root=new URL('../',import.meta.url),config=JSON.parse(await readFile(new URL('art/demo/script.json',root),'utf8'));
const dir=new URL('data/film/voice/',root);await mkdir(dir,{recursive:true});
if(!defaults.key)throw new Error('OPENAI_API_KEY is required for narration.');
const clips=[];
for(const segment of config.segments){
  const hash=createHash('sha256').update(JSON.stringify(segment)).digest('hex'),file=new URL(segment.id+'.mp3',dir);let cached=false;
  try{cached=(await readFile(new URL(segment.id+'.hash',dir),'utf8'))===hash;await access(file);}catch{cached=false;}
  if(!cached){
    const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+defaults.key,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({model:'gpt-4o-mini-tts',voice:segment.voice,input:segment.text,instructions:segment.instructions,response_format:'mp3',speed:1.04})});
    if(!response.ok)throw new Error('Narration request failed: HTTP '+response.status);
    await writeFile(file,Buffer.from(await response.arrayBuffer()));await writeFile(new URL(segment.id+'.hash',dir),hash);
  }
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',fileURLToPath(file)],{encoding:'utf8'}).trim());
  const available=segment.end-segment.start,tempo=Math.max(1,duration/available);
  if(tempo>1.28)throw new Error(segment.id+' needs shorter narration; tempo '+tempo.toFixed(2));
  clips.push({...segment,duration,tempo,file:fileURLToPath(file)});console.log(segment.id+': '+duration.toFixed(2)+'s / '+available.toFixed(2)+'s; speed '+tempo.toFixed(2));
}
await writeFile(new URL('data/film/audio-manifest.json',root),JSON.stringify({model:'gpt-4o-mini-tts',clips},null,2));
const rate=48000,mix=new Float32Array(rate*60);
for(const clip of clips){
  const pcm=execFileSync('ffmpeg',['-v','error','-i',clip.file,'-af','atempo='+clip.tempo,'-t',String(clip.end-clip.start),'-f','s16le','-ar',String(rate),'-ac','1','pipe:1'],{maxBuffer:8000000});
  const start=Math.round(clip.start*rate);for(let i=0;i<pcm.length/2&&start+i<mix.length;i++)mix[start+i]+=pcm.readInt16LE(i*2)/32768;
}
let peak=0;for(const sample of mix)peak=Math.max(peak,Math.abs(sample));const gain=.73/Math.max(peak,.01),wav=Buffer.alloc(44+mix.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(mix.length*2,40);
for(let i=0;i<mix.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]*gain))*32767),44+i*2);
await writeFile(new URL('data/film/narration.wav',root),wav);
// Two short lines per subtitle; the same timings are used by the film renderer.
const subtitleTime=t=>new Date(t*1000).toISOString().slice(11,23).replace('.',',');let index=1,srt='';
for(const clip of clips){const sentences=clip.text.match(/[^.!?]+[.!?]+/g)||[clip.text];const total=sentences.reduce((n,x)=>n+x.trim().split(/\s+/).length,0);let start=clip.start;
  for(const sentence of sentences){const text=sentence.trim(),length=(clip.duration/clip.tempo)*text.split(/\s+/).length/total,end=Math.min(clip.end,start+length);srt+=`${index++}\n${subtitleTime(start)} --> ${subtitleTime(end)}\n${text}\n\n`;start=end;}}
await writeFile(new URL('exports/are-you-human-60s-en.srt',root),srt);
console.log('English narration and subtitles ready.');
