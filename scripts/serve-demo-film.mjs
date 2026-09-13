import http from 'node:http';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createSociety} from '../server/society.mjs';
import {startEpisode,tickCity,publicCity} from '../server/city.mjs';
import {proposeEpisode,thinkEpisode} from '../server/episode.mjs';
import {createGenerator} from '../server/provider.mjs';
import {defaults} from '../server/config.mjs';
import {findPath} from '../src/navigation.js';
import {outdoorGround,workSpot} from '../src/town-layout.js';

const root=fileURLToPath(new URL('../',import.meta.url)),build=root+'data/film/';await mkdir(build,{recursive:true});
let encoder=null,frames=0,encodingError='',preparing=false;
const json=(res,code,value)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
async function body(req,max){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw new Error('Body too large');chunks.push(chunk);}return Buffer.concat(chunks);}
async function prepare(colliders){
  if(!Array.isArray(colliders)||colliders.length>1000||colliders.some(c=>!['x','z','hw','hd'].every(k=>Number.isFinite(c[k]))))throw new Error('Invalid geometry');
  const hash=createHash('sha256').update(JSON.stringify(colliders)).digest('hex');
  try{const cached=JSON.parse(await readFile(build+'replay.json','utf8'));if(cached.geometryHash===hash)return cached;}catch{}
  if(preparing)throw new Error('Already preparing');preparing=true;
  try{
    const s=createSociety();startEpisode(s,1000);const states=[],poses=[],routes=new Map(),generate=createGenerator({key:defaults.key,model:defaults.model,calls:0,retryAfter:0});
    const english=async(instructions,input,fallback,options)=>{const r=await generate(instructions+'\nFor this English-language demonstration, all spoken text MUST be natural English. Use at most 22 words per reply. Character names are Mia, Ren, Tomo and Shell.',input,fallback,options);if(r.mode!=='live')throw new Error('Live AI required for the recorded decision; '+(r.warning||'no connection'));return r;};
    const canMove=(x,z)=>outdoorGround(x,z)&&!colliders.some(c=>Math.abs(x-c.x)<c.hw+.25&&Math.abs(z-c.z)<c.hd+.25);
    const rotations=Object.fromEntries(Object.keys(s.agents).map(id=>[id,0])),moments={proposal:45};let decision=null;
    for(let frame=0;frame<=3200;frame++){
      const t=frame/10;
      if(frame===450){await proposeEpisode(s,'Use the waste heat from the data center to warm the cafe. Keep the upgrade running for Tomo.',english);await thinkEpisode(s,english);decision=structuredClone(s.city.episode.plan);if(!decision)throw new Error('Residents did not accept this plan; review the trace.');}
      for(const [id,task] of Object.entries(s.city.tasks)){
        const p=s.city.positions[id],goal=workSpot(task.site,id);if(Math.hypot(p.x-goal.x,p.z-goal.z)<.34)continue;
        if(routes.get(id)?.id!==task.id)routes.set(id,{id:task.id,path:findPath(p,goal,canMove)});
        const route=routes.get(id),next=route.path[0];if(!next)throw new Error('No path for '+id+' to '+task.site);
        const dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,(id==='shell'?1.85:id==='tomo'?2.4:2.15)*.1);
        if(d){p.x+=dx/d*step;p.z+=dz/d*step;rotations[id]=Math.atan2(dx,dz);}if(Math.hypot(p.x-next.x,p.z-next.z)<.14)route.path.shift();
      }
      if(frame%10===0){tickCity(s,s.city.positions,[],1000+t*1000);const city=publicCity(s);states.push({time:t,city:structuredClone(city)});
        if(city.episode.supply.heat&&!moments.heat)moments.heat=t;
        if(city.episode.update>=100&&!moments.updated)moments.updated=t;
        if(city.episode.stage==='won'&&!moments.won)moments.won=t;
      }
      poses.push({time:t,positions:structuredClone(s.city.positions),rotations:{...rotations}});
      if(moments.won&&t>=moments.won+2)break;
    }
    if(!moments.won)throw new Error('Replay did not finish; inspect route simulation.');
    const result={geometryHash:hash,model:defaults.model,generatedAt:new Date().toISOString(),source:'Live OpenAI decisions; server episode rules; in-engine navigation; edited replay',decision,moments,states,poses};
    await writeFile(build+'replay.json',JSON.stringify(result));console.log('Replay complete:',decision.method,decision.lead,'+',decision.partner,JSON.stringify(moments));return result;
  }finally{preparing=false;}
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!=='127.0.0.1:4174'&&req.headers.host!=='localhost:4174')return json(res,403,{error:'Local only'});
    if(req.method==='POST'&&req.headers.origin!=='http://'+req.headers.host)return json(res,403,{error:'Origin mismatch'});
    const url=new URL(req.url,'http://'+req.headers.host),path=url.pathname;
    if(req.method==='POST'&&path==='/prepare')return json(res,200,await prepare(JSON.parse((await body(req,300000)).toString()).colliders));
    if(req.method==='POST'&&path==='/render/start'){
      if(encoder)throw new Error('Render already running');frames=0;encodingError='';
      encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',build+'picture.mp4'],{stdio:['pipe','ignore','pipe']});
      encoder.stderr.on('data',data=>encodingError=(encodingError+data).slice(-2000));encoder.on('error',error=>encodingError=error.message);return json(res,200,{ok:true});
    }
    if(req.method==='POST'&&path==='/render/frame'){
      if(!encoder||Number(url.searchParams.get('index'))!==frames||frames>=1800)throw new Error('Unexpected frame');
      const png=await body(req,6000000);if(png.readUInt32BE(0)!==0x89504e47)throw new Error('PNG required');
      if([0,210,420,600,810,990,1110,1230,1350,1470,1650,1770].includes(frames))await writeFile(build+'frame-'+String(frames).padStart(4,'0')+'.png',png);
      if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');frames++;return json(res,200,{frames});
    }
    if(req.method==='POST'&&path==='/render/finish'){
      if(!encoder||frames!==1800)throw new Error('Render is incomplete');const child=encoder;const done=once(child,'close');child.stdin.end();const [code]=await done;encoder=null;if(code!==0)throw new Error(encodingError||'Encoder failed');return json(res,200,{ok:true,frames});
    }
    if(req.method==='GET'&&path==='/status')return json(res,200,{frames,rendering:!!encoder,error:encodingError});
    const files={'/':'art/demo/film.html','/watch':'exports/watch.html','/are-you-human-60s-en.mp4':'exports/are-you-human-60s-en.mp4','/are-you-human-poster.png':'exports/are-you-human-poster.png','/english-narration.md':'exports/english-narration.md','/film.js':'art/demo/film.js','/script.json':'art/demo/script.json','/audio-manifest.json':'data/film/audio-manifest.json','/narration.wav':'data/film/narration.wav','/replay.json':'data/film/replay.json','/video.mp4':'exports/are-you-human-60s-en.mp4'};
    const file=files[path]||(/^\/(src\/[a-z-]+\.(js|css)|assets\/(cafe|characters|infrastructure)\/[a-zA-Z0-9_-]+\.(glb|json)|node_modules\/three\/(build\/three.module.js|examples\/jsm\/(loaders\/GLTFLoader.js|utils\/BufferGeometryUtils.js|geometries\/RoundedBoxGeometry.js)))$/.test(path)?path.slice(1):null);
    if(req.method!=='GET'||!file)return json(res,404,{error:'Not found'});
    const data=await readFile(root+file),ext=file.split('.').at(-1),type={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',glb:'model/gltf-binary',mp4:'video/mp4',wav:'audio/wav',png:'image/png',md:'text/markdown; charset=utf-8'}[ext];
    res.writeHead(200,{'Content-Type':type||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch(error){console.error(error.message);json(res,500,{error:error.message});}
});
server.listen(4174,'127.0.0.1',()=>console.log('Film studio → http://127.0.0.1:4174/'));
process.on('SIGINT',()=>{encoder?.kill();server.close();process.exit();});
