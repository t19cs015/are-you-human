import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createServer} from '../server.mjs';
test('HTTP restores a session after server restart and never saves config',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ayh-http-'));let server;
 async function start(){server=createServer({apiKey:'',saveDirectory:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;}
 async function stop(){server.closeAllConnections();await new Promise(r=>server.close(r));}
 let base=await start();let id;
 const request=async(path,data)=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{})},...(data?{body:JSON.stringify(data)}:{})});assert.equal(r.status,200);return r.json();};
 try{id=(await request('/api/session',{})).id;await request('/api/chat',{id:'mia',message:'好きな曲は灯台です'});await request('/api/config',{key:'test-config-should-never-be-saved',model:'gpt-5.5'});
 await stop();base=await start();const [state,second]=await Promise.all([request('/api/state'),request('/api/state')]);assert.equal(state.agents[0].memoryCount,1);assert.deepEqual(state,second);assert.equal(state.connected,false);assert.equal(state.persistence,true);
 const page=await request('/api/memories?id=mia&q='+encodeURIComponent('灯台'));assert.equal(page.total,1);const saved=await readFile(join(dir,id+'.json'),'utf8');assert.ok(!saved.includes('test-config-should-never-be-saved'));
 await request('/api/reset',{});await stop();base=await start();assert.equal((await request('/api/state')).agents[0].memoryCount,0);
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
