import http from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const root=fileURLToPath(new URL('../',import.meta.url)),build=root+'data/timelapse/';
await mkdir(build,{recursive:true});
await mkdir(root+'data/arrival-film/',{recursive:true});
await mkdir(root+'data/film-v3/',{recursive:true});
let encoder=null,frames=0,errorText='',closed=null,renderTarget='timelapse';
const json=(res,code,value)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
async function body(req,max){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw new Error('Body too large');chunks.push(chunk);}return Buffer.concat(chunks);}
const files={
  '/':'exports/timelapse.html','/studio':'art/timelapse/studio.html','/timelapse.js':'art/timelapse/timelapse.js',
  '/audio-manifest.json':'data/timelapse/audio-manifest.json','/master.wav':'data/timelapse/master.wav',
  '/are-you-human-timelapse-en.mp4':'exports/are-you-human-timelapse-en.mp4',
  '/timelapse-poster.png':'exports/timelapse-poster.png','/timelapse-narration.md':'exports/timelapse-narration.md',
  '/demo-studio':'art/timelapse/arrival-studio.html','/arrival.js':'art/timelapse/arrival.js',
  '/arrival-manifest.json':'data/arrival-film/audio-manifest.json','/arrival-master.wav':'data/arrival-film/master.wav',
  '/demo':'exports/arrival-demo.html','/are-you-human-arrival-60s-en.mp4':'exports/are-you-human-arrival-60s-en.mp4',
  '/arrival-poster.png':'exports/arrival-poster.png','/arrival-narration.md':'exports/arrival-narration.md',
  '/are-you-human-demo-v2.mp4':'exports/are-you-human-demo-v2.mp4',
  '/v3-studio':'art/timelapse/v3-studio.html','/firstperson.js':'art/timelapse/firstperson.js','/skyline-variety.js':'art/timelapse/skyline-variety.js',
  '/v3-manifest.json':'data/film-v3/audio-manifest.json','/v3-master.wav':'data/film-v3/master.wav','/v1-replay.json':'data/film/replay.json',
  '/are-you-human-demo-v3.mp4':'exports/are-you-human-demo-v3.mp4',
};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['127.0.0.1:4175','localhost:4175'].includes(req.headers.host))return json(res,403,{error:'Local only'});
    if(req.method==='POST'&&req.headers.origin!=='http://'+req.headers.host)return json(res,403,{error:'Origin mismatch'});
    const url=new URL(req.url,'http://'+req.headers.host),path=url.pathname,target=path.startsWith('/v3/render/')?'v3':path.startsWith('/arrival/render/')?'arrival':'timelapse',route=target==='v3'?path.slice(3):target==='arrival'?path.slice(8):path;
    const framesExpected=target==='timelapse'?720:1800,renderBuild=target==='v3'?root+'data/film-v3/':target==='arrival'?root+'data/arrival-film/':build;
    if(req.method==='POST'&&route==='/render/start'){
      if(encoder)throw new Error('Render already running');frames=0;errorText='';renderTarget=target;
      encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',renderBuild+'picture.mp4'],{stdio:['pipe','ignore','pipe']});
      encoder.stderr.on('data',chunk=>errorText=(errorText+chunk).slice(-2000));
      encoder.stdin.on('error',error=>{errorText=error.message;});
      closed=new Promise(resolve=>{encoder.once('close',code=>resolve(code));encoder.once('error',error=>{errorText=error.message;resolve(-1);});});
      return json(res,200,{ok:true});
    }
    if(req.method==='POST'&&route==='/render/frame'){
      if(!encoder||renderTarget!==target||encoder.exitCode!==null||Number(url.searchParams.get('index'))!==frames||frames>=framesExpected)throw new Error(errorText||'Unexpected frame');
      const png=await body(req,6000000);if(png.length<8||png.readUInt32BE(0)!==0x89504e47)throw new Error('PNG required');
      const samples=target==='timelapse'?[0,90,180,270,360,450,540,630,690,719]:[0,45,60,90,120,180,270,360,420,450,510,540,600,630,660,720,810,900,1020,1080,1140,1190,1230,1290,1350,1380,1440,1500,1560,1650,1690,1770];
      if(samples.includes(frames))await writeFile(renderBuild+'frame-'+String(frames).padStart(4,'0')+'.png',png);
      if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');frames++;return json(res,200,{frames});
    }
    if(req.method==='POST'&&route==='/render/finish'){
      if(!encoder||renderTarget!==target||frames!==framesExpected)throw new Error('Render incomplete');encoder.stdin.end();const code=await closed;encoder=null;
      if(code!==0)throw new Error(errorText||'Encoder failed');return json(res,200,{ok:true,frames});
    }
    if(req.method==='GET'&&path==='/status')return json(res,200,{frames,rendering:!!encoder,error:errorText});
    const file=files[path]||(/^\/(src\/[a-z-]+\.(js|css)|assets\/(cafe|characters|infrastructure)\/[a-zA-Z0-9_-]+\.(glb|json)|node_modules\/three\/(build\/three.module.js|examples\/jsm\/(loaders\/GLTFLoader.js|utils\/BufferGeometryUtils.js|geometries\/RoundedBoxGeometry.js)))$/.test(path)?path.slice(1):null);
    if(!['GET','HEAD'].includes(req.method)||!file)return json(res,404,{error:'Not found'});
    const full=root+file,info=await stat(full),ext=file.split('.').at(-1),type={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',glb:'model/gltf-binary',mp4:'video/mp4',wav:'audio/wav',png:'image/png',md:'text/markdown; charset=utf-8'}[ext]||'application/octet-stream';
    const headers={'Content-Type':type,'Cache-Control':'no-store','Accept-Ranges':'bytes'};
    if(req.headers.range){
      const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':'bytes */'+info.size}).end();return;}
      const start=Number(match[1]),end=Math.min(info.size-1,match[2]?Number(match[2]):info.size-1);
      if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':'bytes */'+info.size}).end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${info.size}`});if(req.method==='HEAD')res.end();else createReadStream(full,{start,end}).pipe(res);
    }else{res.writeHead(200,{...headers,'Content-Length':info.size});if(req.method==='HEAD')res.end();else createReadStream(full).pipe(res);}
  }catch(error){if(!res.headersSent)json(res,error.code==='ENOENT'?404:500,{error:error.message});else res.destroy();}
});
server.listen(4175,'127.0.0.1',()=>console.log('Timelapse studio → http://127.0.0.1:4175/studio'));
process.on('SIGINT',()=>{encoder?.kill();server.close();process.exit();});
