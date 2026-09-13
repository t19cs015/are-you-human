import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../server.mjs';
test('HTTP boundary: isolated sessions, safe files, origin, validation and mock live conversation',async()=>{
 const server=createServer({apiKey:'',fetcher:async()=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'あなたのこと、覚えておくね。',assessment:{affinity:0,trust:0,fear:0,respect:0,attraction:0,reason:'判断保留'},aboutHuman:{affinity:0,trust:0,fear:0,respect:0,attraction:0,reason:'判断保留'}})}]}]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,data,id,headers={})=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await request('/server.mjs')).status,404);assert.equal((await request('/.env')).status,404);assert.equal((await request('/server/local-config.mjs')).status,404);assert.equal((await request('/assets/cafe/../../server/local-config.mjs')).status,404);
  const model=await fetch(base+'/assets/cafe/house-house.glb');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'model/gltf-binary');const bytes=new Uint8Array(await model.arrayBuffer());assert.equal(String.fromCharCode(...bytes.slice(0,4)),'glTF');
  const mia=await fetch(base+'/assets/characters/mia.glb');assert.equal(mia.status,200);assert.equal(mia.headers.get('content-type'),'model/gltf-binary');assert.equal((await request('/art/characters/mia.blend')).status,404);
  const loader=await fetch(base+'/node_modules/three/examples/jsm/loaders/GLTFLoader.js');assert.equal(loader.status,200);
  assert.equal((await request('/api/session',{},null,{Origin:'http://evil.example'})).status,403);
  const {data:{id}}=await request('/api/session',{});const {data:{id:second}}=await request('/api/session',{});
  assert.equal((await request('/api/chat',{id:'__proto__',message:'hi'},id)).status,400);
  assert.equal((await request('/api/chat',{id:'mia',message:'x'.repeat(1001)},id)).status,400);
  await request('/api/config',{key:'fake-key',model:'gpt-4.1-mini'},id);
  const c=await request('/api/chat',{id:'mia',message:'毎日眠るよ'},id);assert.equal(c.data.mode,'live');
  const s=(await request('/api/state',null,id)).data;assert.equal(s.agents[0].memories.length,1);assert.equal(s.agents[1].memories.length,0);assert.ok(!JSON.stringify(s).includes('fake-key'));
  const other=(await request('/api/state',null,second)).data;assert.equal(other.agents[0].memories.length,0);assert.equal(other.connected,false);
  assert.equal((await request('/api/social',{from:'mia',to:'ren'},id)).status,200);assert.equal((await request('/api/social',{from:'ren',to:'tomo'},id)).status,429);
  await request('/api/config',{key:'',model:'gpt-4.1-mini'},id);assert.equal((await request('/api/state',null,id)).data.connected,false);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
