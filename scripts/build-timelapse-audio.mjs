import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {defaults} from '../server/config.mjs';
const v3=process.argv.includes('--v3'),arrival=process.argv.includes('--arrival'),root=fileURLToPath(new URL('../',import.meta.url)),config=JSON.parse(await readFile(root+'art/timelapse/'+(v3?'v3-script.json':arrival?'arrival-script.json':'script.json'),'utf8')),dir=root+'data/'+(v3?'film-v3':arrival?'arrival-film':'timelapse')+'/';
await mkdir(dir+'voice/',{recursive:true});await mkdir(root+'exports/',{recursive:true});
if(!defaults.key)throw new Error('OPENAI_API_KEY is required for narration.');
const clips=[];
let previous=[];if(arrival||v3)for(const folder of ['timelapse','arrival-film','film'])try{previous.push(...JSON.parse(await readFile(root+'data/'+folder+'/audio-manifest.json','utf8')).clips);}catch{}
for(const segment of config.segments){
  const hash=createHash('sha256').update(JSON.stringify({voice:segment.voice,text:segment.text,instructions:segment.instructions})).digest('hex'),file=dir+'voice/'+segment.id+'.mp3';let cached=false;
  try{cached=(await readFile(file+'.hash','utf8'))===hash;await access(file);}catch{}
  if(!cached){const shared=previous.find(c=>c.text===segment.text&&c.voice===segment.voice&&c.instructions===segment.instructions);if(shared){await writeFile(file,await readFile(shared.file));await writeFile(file+'.hash',hash);cached=true;}}
  if(!cached){
    const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+defaults.key,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({model:'gpt-4o-mini-tts',voice:segment.voice,input:segment.text,instructions:segment.instructions,response_format:'mp3',speed:1})});
    if(!response.ok)throw new Error('Narration request failed: HTTP '+response.status);
    await writeFile(file,Buffer.from(await response.arrayBuffer()));await writeFile(file+'.hash',hash);
  }
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim()),tempo=Math.max(1,duration/(segment.end-segment.start));
  if(tempo>1.18)throw new Error(segment.id+' narration is too long.');
  clips.push({...segment,file,duration,tempo});console.log(segment.id+': '+duration.toFixed(2)+' seconds');
}
await writeFile(dir+'audio-manifest.json',JSON.stringify({model:'gpt-4o-mini-tts',duration:config.duration,clips},null,2));
const rate=48000,channels=v3?2:1,mix=new Float32Array(rate*config.duration*channels);
for(const clip of clips){
  const pcm=execFileSync('ffmpeg',['-v','error','-i',clip.file,'-af','atempo='+clip.tempo,'-t',String(clip.end-clip.start),'-f','s16le','-ar',String(rate),'-ac','1','pipe:1'],{maxBuffer:8000000});
  const start=Math.round(clip.start*rate),pan=clip.pan||0,gain=clip.gain??1;
  for(let i=0;i<pcm.length/2&&(start+i)*channels<mix.length;i++){
    const value=pcm.readInt16LE(i*2)/32768*gain;
    if(v3){mix[(start+i)*2]+=value*Math.sqrt((1-pan)/2);mix[(start+i)*2+1]+=value*Math.sqrt((1+pan)/2);}else mix[start+i]+=value;
  }
}
let peak=0;for(const sample of mix)peak=Math.max(peak,Math.abs(sample));const gain=.70/Math.max(peak,.01),wav=Buffer.alloc(44+mix.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(channels,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2*channels,28);wav.writeUInt16LE(2*channels,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(mix.length*2,40);
for(let i=0;i<mix.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]*gain))*32767),44+i*2);
await writeFile(dir+'narration.wav',wav);
const stamp=t=>new Date(t*1000).toISOString().slice(11,23).replace('.',',');
await writeFile(root+'exports/'+(v3?'are-you-human-demo-v3':arrival?'are-you-human-arrival-60s-en':'are-you-human-timelapse-en')+'.srt',clips.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(Math.min(c.end,c.start+c.duration/c.tempo))}\n${c.text}\n`).join('\n'));
console.log('Timelapse voice and captions ready.');
