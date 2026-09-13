import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createSociety,chat,instructions} from '../server/society.mjs';
import {remember,recall,memoryPage} from '../server/memory.mjs';
import {createStorage} from '../server/storage.mjs';
import {createGenerator} from '../server/provider.mjs';
const demo=createGenerator({key:''});
test('old memories survive and relevant private testimony is retrieved under a context budget',async()=>{
 const s=createSociety();await chat(s,'mia','私の好きな曲は青い灯台です',demo);
 for(let i=0;i<120;i++)remember(s.agents.mia,{id:++s.count,topic:'routine',text:'通信点検を行った '+i,source:'自分の作業',hop:0});
 assert.ok(s.agents.mia.memories.length>18);assert.match(recall(s.agents.mia,'青い灯台の曲')[0].text,/青い灯台/);assert.ok(!instructions(s,s.agents.ren,'青い灯台').includes('好きな曲は青い灯台'));
 assert.ok(JSON.stringify(recall(s.agents.mia,'曲',{budget:1000})).length<1050);assert.equal(memoryPage(s.agents.mia,'青い灯台').total,1);
});
test('corrections preserve original evidence without recalling it as current',async()=>{
 const s=createSociety();await chat(s,'mia','8時間眠る',demo);await chat(s,'mia','訂正、6時間眠る',demo);
 assert.equal(s.agents.mia.memories.length,2);assert.ok(s.agents.mia.memories[0].supersededBy);assert.ok(!recall(s.agents.mia,'眠る').some(m=>m.text==='8時間眠る'));assert.equal(s.agents.mia.archive.length,4);
});
test('disk saves restore isolated worlds and reset atomically without connection config',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ayh-memory-'));const id=randomUUID(),other=randomUUID();
 try{const storage=createStorage(directory),s=createSociety();await chat(s,'mia','灯台を覚えていて',demo);s.busy.add('mia');await storage.save(id,s);await storage.save(other,createSociety());
 const restored=await createStorage(directory).load(id);assert.equal(restored.busy.size,0);assert.equal(restored.agents.mia.memories[0].text,'灯台を覚えていて');assert.equal((await storage.load(other)).agents.mia.memories.length,0);
 const json=JSON.parse(await readFile(join(directory,id+'.json'),'utf8'));assert.equal(json.config,undefined);assert.equal(json.world.busy,undefined);assert.equal(await storage.load('../key'),null);
 await storage.save(id,createSociety());assert.equal((await storage.load(id)).agents.mia.memories.length,0);
 }finally{await rm(directory,{recursive:true,force:true});}
});
