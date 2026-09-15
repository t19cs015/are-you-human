import http from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareV9,makeDrawerSociety,localize,build} from './prepare-demo-v9.mjs';
import {editMemoryGame} from '../server/memory-game.mjs';
import {publicCity} from '../server/city.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));let drawer=null,preparing=null;
const json=(res,code,value)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
async function body(req){let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>1e6)throw new Error('Request too large');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString()||'{}');}
await mkdir(build,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
  if(!['127.0.0.1:4180','localhost:4180'].includes(req.headers.host))return json(res,403,{error:'Local studio only'});
  const path=new URL(req.url,'http://'+req.headers.host).pathname;
  if(req.method==='POST'){
    if(req.headers.origin!=='http://'+req.headers.host)return json(res,403,{error:'Origin mismatch'});
    const data=await body(req);
    if(path==='/prepare'){preparing??=prepareV9(data.colliders).finally(()=>preparing=null);const replay=await preparing;drawer=makeDrawerSociety(replay);return json(res,200,replay);}
    if(path==='/drawer/reset'){const replay=JSON.parse(await readFile(new URL('replay.json',build),'utf8'));drawer=makeDrawerSociety(replay);return json(res,200,{city:localize(publicCity(drawer))});}
    if(path==='/memory/edit'){if(!drawer)throw new Error('Drawer not initialized');editMemoryGame(drawer,data);await writeFile(new URL('drawer-take.json',build),JSON.stringify({edits:drawer.city.memoryGame.edits,equipped:drawer.city.memoryGame.equipped}));return json(res,200,{city:localize(publicCity(drawer))});}
    if(path==='/audit'){await writeFile(new URL('visual-audit.json',build),JSON.stringify(data,null,2));return json(res,200,{ok:true});}
    return json(res,404,{error:'No such action'});
  }
  const mapped={'/':'art/demo-v9/studio.html','/replay.json':'data/film-v9/replay.json','/audio-manifest.json':'data/film-v9/audio-manifest.json','/master.wav':'data/film-v9/master.wav'}[path];
  const allowed=/^\/(src|assets|node_modules\/three|art\/demo-v9)\/[a-zA-Z0-9_./-]+$/.test(path);
  const file=resolve(root,mapped||(allowed?path.slice(1):'__missing__'));
  if(!file.startsWith(root)||file.includes('/.'))return json(res,404,{error:'Not found'});
  const info=await stat(file),type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav'}[extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Cache-Control':'no-store'});createReadStream(file).pipe(res);
}catch(e){console.error(e.message);if(!res.headersSent)json(res,500,{error:e.message});else res.destroy();}});
server.listen(4180,'127.0.0.1',()=>console.log('V9 production studio: http://127.0.0.1:4180/'));
