import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {defaults} from '../server/config.mjs';
import {v6Script} from '../art/demo-v6/script.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),dir=root+'data/film-v6/',rate=48000;
const replay=JSON.parse(await readFile(dir+'replay.json','utf8')),script=v6Script(replay);
await mkdir(dir+'voice-polished/',{recursive:true});
if(!defaults.key)throw new Error('The configured OpenAI key is required for English voices.');
function decode(file,filters=[]){
  const args=['-v','error','-i',file];if(filters.length)args.push('-af',filters.join(','));
  const b=execFileSync('ffmpeg',[...args,'-f','f32le','-ac','1','-ar',String(rate),'pipe:1'],{maxBuffer:12000000});
  return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
}
function wav(signal,channels=1){
  const b=Buffer.alloc(44+signal.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(signal.length*2,40);
  for(let i=0;i<signal.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,signal[i]))*32767),44+i*2);return b;
}
function rms(a){return Math.sqrt(a.reduce((s,x)=>s+x*x,0)/Math.max(1,a.length));}
async function build(segment){
  const request={model:'gpt-4o-mini-tts',voice:segment.voice,input:segment.text,instructions:segment.instructions,response_format:'wav',speed:1};
  // Moving a cut never changes a cached performance or generates another paid take.
  const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex'),file=dir+'voice-polished/'+segment.id+'-source.wav';let cached=false;
  try{cached=(await readFile(file+'.hash','utf8'))===hash;}catch{}
  if(!cached){
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+defaults.key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(60000)});
    if(!r.ok)throw new Error(segment.id+' speech HTTP '+r.status);
    await writeFile(file,Buffer.from(await r.arrayBuffer()));await writeFile(file+'.hash',hash);
  }
  const source=decode(file),hop=480,active=[];
  // Remove outside silence only. Retain 90 ms before the first sound and 240 ms
  // after the last; never remove a pause or a breath within the sentence.
  for(let i=0;i<source.length;i+=hop)if(rms(source.subarray(i,i+hop))>10**(-58/20))active.push(i);
  if(!active.length)throw new Error(segment.id+' has no audible speech');
  const begin=Math.max(0,active[0]-Math.round(.09*rate)),end=Math.min(source.length,active.at(-1)+hop+Math.round(.24*rate));
  const kept=new Float32Array(end-begin+Math.round(.10*rate));kept.set(source.subarray(begin,end));
  const clean=dir+'voice-polished/'+segment.id+'-complete.wav';await writeFile(clean,wav(kept));
  const slot=segment.end-segment.start,duration=kept.length/rate;
  let tempo=Math.max(1,duration/(slot-.05)),pcm;
  // Measure actual atempo output; never use a time cutoff on speech.
  for(let attempt=0;attempt<4;attempt++){
    if(tempo>1.32)throw new Error(segment.id+' needs more than 1.32x; give the sentence more room.');
    pcm=decode(clean,[`atempo=${tempo.toFixed(6)}`,'highpass=f=65','lowpass=f=12500']);
    if(pcm.length/rate<=slot-.025)break;tempo*=pcm.length/rate/(slot-.06);
  }
  if(pcm.length/rate>slot)throw new Error(segment.id+' did not fit without clipping');
  let peak=0,energy=0,count=0;for(const v of pcm){peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>.006){energy+=v*v;count++;}}
  const gain=Math.min(.48/Math.max(.01,peak),.105/Math.sqrt(energy/Math.max(1,count)));
  for(let i=0;i<pcm.length;i++)pcm[i]*=gain*Math.min(1,i/(rate*.008))*Math.min(1,(pcm.length-1-i)/(rate*.035));
  const renderedDuration=pcm.length/rate,output=dir+'voice-polished/'+segment.id+'.wav';await writeFile(output,wav(pcm));
  const tailDb=20*Math.log10(Math.max(1e-9,rms(pcm.subarray(pcm.length-Math.round(.035*rate)))));
  if(tailDb>-50)throw new Error(segment.id+' has an unsafe audio tail');
  console.log(`${segment.id}: ${renderedDuration.toFixed(2)}s / ${slot.toFixed(2)}s · ${tempo.toFixed(3)}x · complete ending`);
  return {...segment,duration,tempo,renderedDuration,file:output,source:file,sourceDuration:source.length/rate,retainedFrom:begin/rate,retainedTo:end/rate,tailDb,preservedInternalPauses:true};
}
const clips=[];
for(let i=0;i<script.segments.length;i+=3){const results=await Promise.allSettled(script.segments.slice(i,i+3).map(build));for(const r of results){if(r.status==='rejected')throw r.reason;clips.push(r.value);}}
await writeFile(dir+'audio-manifest.json',JSON.stringify({model:'gpt-4o-mini-tts',version:'6',duration:60,clips},null,2));await writeFile(dir+'script.json',JSON.stringify(script,null,2));
const mix=new Float32Array(rate*60*2);
for(const c of clips){const pcm=decode(c.file),start=Math.round(c.start*rate),pan=c.pan||0,gain=c.gain??1;if(start+pcm.length>rate*60)throw new Error('Speech would cross the end of the film');for(let i=0;i<pcm.length;i++){mix[(start+i)*2]+=pcm[i]*gain*Math.sqrt((1-pan)/2);mix[(start+i)*2+1]+=pcm[i]*gain*Math.sqrt((1+pan)/2);}}
await writeFile(dir+'narration.wav',wav(mix,2));console.log('Full sentences, measured timing and preserved breath tails ready.');
