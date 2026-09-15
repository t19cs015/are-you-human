// Update the closing card without replaying the recorded game or regenerating voices.
// Usage: node scripts/retitle-demo-v9.mjs /path/to/previous-demo.mp4
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const build=root+'data/film-v9/',out=root+'exports/';
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
const audioHash=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();

export async function retitleV9(input,file=out+'ai-town-demo-v9.mp4'){
  if(resolve(input)===resolve(file))throw new Error('Use a separate source file; the previous master is preserved.');
  const source=probe(input),sourceVideo=source.streams.find(s=>s.codec_type==='video');
  if(sourceVideo.width!==1920||sourceVideo.height!==1080||sourceVideo.nb_frames!=='1800'||Math.abs(Number(source.format.duration)-60)>.04)throw new Error('Expected the completed 60-second, 1080p, 30 fps demo.');
  await mkdir(build,{recursive:true});await mkdir(out,{recursive:true});
  const georgia='/System/Library/Fonts/Supplemental/Georgia.ttf',arial='/System/Library/Fonts/Supplemental/Arial.ttf';
  const line=(text,size,y,color,font=arial)=>`drawtext=fontfile='${font}':text='${text}':fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}:enable='gte(t,56)':alpha='min((t-56)/0.65,1)'`;
  const filter=[
    'fade=t=out:st=55.7:d=0.3:color=0x12272f',
    line('AI',110,340,'0xf5ebd6',georgia),line('TOWN',132,452,'0xefd099',georgia),
    line('A living AI town. Memories you can rewrite.',30,638,'0xb7ddd0'),
    line('Created by Haruna & Ilya',21,798,'0xf5ebd6'),
    line('OpenAI-powered voices & resident decisions',20,835,'0xb7ddd0'),
    line('In-engine demo · recorded AI decisions · AI-generated voices',17,1011,'0xa4bdb9')
  ].join(',');
  console.log('Updating the AI TOWN closing card; keeping the original audio.');
  execFileSync('ffmpeg',['-y','-v','error','-i',input,'-vf',filter,'-map','0:v:0','-map','0:a:0','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','60','-movflags','+faststart','-metadata','title=AI TOWN — Demo v9','-metadata','comment=Edited in-engine demo. Recorded OpenAI decisions and actual memory interactions; authored staging. AI TOWN title edition.',file],{stdio:['ignore','ignore','inherit']});
  const p=probe(file),v=p.streams.find(s=>s.codec_type==='video'),a=p.streams.find(s=>s.codec_type==='audio');
  if(Number(p.format.duration)!==60||v.nb_frames!=='1800'||a.channels!==2)throw new Error('Unexpected export format.');
  const hash=audioHash(file);if(hash!==audioHash(input))throw new Error('The original audio must remain byte-identical.');
  execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
  execFileSync('ffmpeg',['-y','-v','error','-ss','58','-i',file,'-frames:v','1',build+'export-title.png']);
  await writeFile(build+'title-verification.json',JSON.stringify({title:'AI TOWN — Demo v9',source:resolve(input),output:file,audioMatchesSource:true,audioHash:hash,firstPerson:true,actualDrawer:true,closingCardRange:[56,60],fullDecodePassed:true},null,2)+'\n');
  await writeFile(build+'specs.json',JSON.stringify({duration:60,width:v.width,height:v.height,frames:1800,fps:v.avg_frame_rate,videoCodec:v.codec_name,audioCodec:a.codec_name,channels:a.channels,bytes:Number(p.format.size),fullDecodePassed:true},null,2)+'\n');
  const manifest=JSON.parse(await readFile(build+'audio-manifest.json','utf8')),stamp=t=>new Date(t*1000).toISOString().slice(11,23).replace('.',',');
  await writeFile(out+'ai-town-demo-v9.srt',manifest.clips.filter(c=>!c.crowd).map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(Math.min(c.end,c.start+(c.renderedDuration??c.duration/c.tempo)))}\n${c.text}\n`).join('\n'));
  await writeFile(out+'demo-v9-narration.md','# AI TOWN — Demo v9\n\n60 seconds · English · first person\n\n'+manifest.clips.map(c=>`**${c.start.toFixed(2)}–${c.end.toFixed(2)}s · ${c.who}${c.crowd?' · overlapping crowd':''}**\n\n${c.text}`).join('\n\n')+'\n');
  console.log('Verified: 60 seconds, 1800 frames, original stereo audio, full decode.');return file;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(!process.argv[2])throw new Error('Usage: node scripts/retitle-demo-v9.mjs /path/to/previous-demo.mp4');
  console.log(await retitleV9(resolve(process.argv[2])));
}
