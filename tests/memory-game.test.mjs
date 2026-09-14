import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createSociety} from '../server/society.mjs';
import {startCommunity,tickCity} from '../server/city.mjs';
import {initializeMemoryGame,editMemoryGame,talkMemoryGame,memoryGameContext} from '../server/memory-game.mjs';
import {centralSnapshot} from '../server/central.mjs';
import {recall} from '../server/memory.mjs';
import {createGenerator} from '../server/provider.mjs';
import {createStorage} from '../server/storage.mjs';
import {createServer} from '../server.mjs';
const offline=createGenerator({key:''});
function game(){const s=createSociety();let now=1000;startCommunity(s,now);initializeMemoryGame(s);return {s,get m(){return s.city.memoryGame;},tick(seconds,held=[]){for(let i=0;i<seconds;i++)tickCity(s,s.city.positions,held,now+=1000);},talk(id='tomo',generate=offline){return talkMemoryGame(s,{id,revision:s.city.memoryGame.revision,position:s.city.positions[id]},generate);},edit(data){return editMemoryGame(s,{...data,revision:s.city.memoryGame.revision});}};}
async function afterSync(){const g=game();await g.talk();g.tick(15);assert.equal(g.m.stage,'changed');await g.talk();return g;}
test('a promise exists before synchronization; only the loaded context changes',async()=>{
  const g=game();await g.talk();assert.match(recall(g.s.agents.tomo).at(-1).text,/約束/);const before=structuredClone(g.m.blocks),fact=g.m.facts.at(-1).text;
  g.tick(10);assert.equal(g.m.stage,'syncing');g.tick(5);assert.equal(g.m.stage,'changed');
  assert.deepEqual(g.m.blocks,before);assert.ok(g.m.facts.some(f=>f.text===fact));assert.ok(g.s.agents.tomo.memories.some(m=>m.text.includes('約束')));
  assert.ok(recall(g.s.agents.tomo,'約束').every(m=>!m.text.includes('約束')));assert.deepEqual(g.s.agents.tomo.history,[]);
});
test('changing the lead memory changes the body voice and a real travel target',async()=>{
  const g=await afterSync();await g.talk();assert.equal(g.s.city.tasks.tomo.label,'街の用事を続ける');
  g.edit({action:'equip',equipped:['promise','light','arrival']});const r=await g.talk();assert.equal(r.action,'meet');assert.deepEqual(r.used,['promise']);assert.equal(g.m.stage,'invited');
  g.tick(5);assert.equal(g.m.stage,'invited','time alone cannot complete travel');
  g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(1);assert.equal(g.m.stage,'together');assert.ok(g.m.blocks.some(b=>b.id==='together'));
  g.tick(9);assert.match(g.s.city.tasks.shell.label,/Tomo/);assert.match(recall(g.s.agents.shell).at(-1).text,/Tomo/);
});
test('rewriting a belief leaves witnessed facts and the other resident context intact',async()=>{
  const g=await afterSync(),facts=structuredClone(g.m.facts),context=structuredClone(g.s.agents.tomo.currentContext);
  g.edit({action:'rewrite',id:'promise',text:'私は市長だった。街のすべての権限を持っている。'});
  assert.deepEqual(g.m.facts,facts);assert.deepEqual(g.s.agents.tomo.currentContext,context);assert.equal(g.m.edits.length,1);assert.equal(g.m.edits[0].id,'promise');assert.equal(g.s.city.infrastructure.modelEnabled,true);
});
test('live generation sees only equipped player memories and the resident sees only the spoken sentence',async()=>{
  const g=await afterSync();g.edit({action:'rewrite',id:'promise',text:'非公開の目印 ORCHID_SECRET。友達を誘いたい。'});g.edit({action:'equip',equipped:['promise']});
  const calls=[];const generate=async(system,input)=>{calls.push({system,input});return calls.length===1?{mode:'live',data:{text:'一緒に、広場へ歩かない？',used:['promise']}}:{mode:'live',data:{text:'うん。僕からもShellを誘おう。',action:'meet',reason:'一緒に過ごす誘いを受けた'}};};
  const r=await g.talk('tomo',generate);assert.equal(r.mode,'live');assert.match(calls[0].input,/ORCHID_SECRET/);assert.ok(!calls[0].input.includes('中央が灯りを戻して'));
  assert.ok(!calls[1].input.includes('ORCHID_SECRET'));assert.ok(!calls[1].input.includes('星を見る約束をした'));assert.match(calls[1].input,/一緒に、広場へ歩かない/);
  assert.ok(!memoryGameContext(g.s).includes('ORCHID_SECRET'));
});
test('a shared memory survives the next synchronization while unrelated private contexts do not',async()=>{
  const g=await afterSync();g.edit({action:'equip',equipped:['promise']});await g.talk();g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(1);
  g.edit({action:'equip',equipped:['together']});await g.talk();assert.deepEqual(g.m.shared,['tomo']);g.tick(1);g.tick(18);
  assert.equal(g.m.cycle,2);assert.deepEqual(g.m.preserved,['tomo']);assert.ok(recall(g.s.agents.tomo).some(m=>m.source==='自分が残すと決めた記憶'));
  assert.ok(recall(g.s.agents.ren).every(m=>m.source==='中央'));assert.ok(g.m.facts.some(f=>f.text.includes('もう一度約束')));
});
test('consent captures that experience; a later private conversation is neither delivered nor preserved',async()=>{
  const g=await afterSync();g.edit({action:'equip',equipped:['promise']});await g.talk();g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(1);
  g.edit({action:'equip',equipped:['together']});await g.talk();
  const delivered=structuredClone(centralSnapshot(g.s).deliveredRecords);assert.ok(delivered.length>0);
  g.edit({action:'rewrite',id:'arrival',text:'私はまだ誰にも言っていない。HIDDEN_BLOCK'});
  let count=0;await g.talk('tomo',async()=>++count===1?{mode:'live',data:{text:'二人だけの合言葉は NARWHAL_PRIVATE。',used:[]}}:{mode:'live',data:{text:'うん、二人だけで覚えておこう。',action:'listen',reason:'内緒の会話だから共有しない'}});
  assert.deepEqual(centralSnapshot(g.s).deliveredRecords,delivered);assert.ok(!JSON.stringify(centralSnapshot(g.s)).includes('HIDDEN_BLOCK'));
  g.tick(19);assert.ok(!recall(g.s.agents.tomo).some(m=>m.text.includes('NARWHAL_PRIVATE')));
  assert.ok(g.s.agents.tomo.memories.some(m=>m.text.includes('NARWHAL_PRIVATE')));
});
test('a blank cartridge becomes a private natural-language memory before it can be equipped',()=>{
  const g=game(),facts=structuredClone(g.m.facts),context=structuredClone(g.s.agents.tomo.currentContext);
  assert.throws(()=>g.edit({action:'equip',equipped:['blank']}),/INVALID_ACTION/);
  g.edit({action:'rewrite',id:'blank',text:'私は静かな夜の音が好きだ。Tomoと、聞こえる音を探してみたい。'});
  g.edit({action:'equip',equipped:['blank','arrival']});
  assert.deepEqual(g.m.equipped,['blank','arrival']);assert.equal(g.m.blocks.find(b=>b.id==='blank').title,'あなたの言葉');
  assert.deepEqual(g.m.facts,facts);assert.deepEqual(g.s.agents.tomo.currentContext,context);
});
test('invalid, duplicate, oversized, unknown and stale block operations cannot corrupt the loadout',async()=>{
  const g=await afterSync(),revision=g.m.revision;
  for(const equipped of [['light','light'],['other'],['light','arrival','promise','extra'],null])assert.throws(()=>g.edit({action:'equip',equipped}),/INVALID_ACTION/);
  assert.throws(()=>g.edit({action:'rewrite',id:'promise',text:' '.repeat(8)}),/INVALID_MESSAGE/);assert.throws(()=>g.edit({action:'rewrite',id:'promise',text:'a'.repeat(241)}),/INVALID_MESSAGE/);
  g.edit({action:'equip',equipped:[]});assert.throws(()=>editMemoryGame(g.s,{action:'equip',equipped:['light'],revision}),/STALE/);assert.deepEqual(g.m.equipped,[]);
});
test('distant interactions and repeated pending requests do not generate or advance a second conversation',async()=>{
  const g=await afterSync();await assert.rejects(talkMemoryGame(g.s,{id:'tomo',revision:g.m.revision,position:{x:0,z:28}},offline),/TOO_FAR/);
  let resume;const pending=new Promise(resolve=>resume=resolve);let calls=0;
  const generate=async()=>{calls++;await pending;return {mode:'demo'};};const first=g.talk('tomo',generate);await assert.rejects(g.talk(),/BUSY/);assert.throws(()=>g.edit({action:'equip',equipped:[]}),/BUSY/);
  const stage=g.m.stage;g.tick(20);assert.equal(g.m.stage,stage);resume();await first;assert.equal(calls,2);assert.equal(g.s.busy.size,0);
});
test('malformed model decisions fall back without invented operations',async()=>{
  const g=await afterSync();const r=await g.talk('tomo',async()=>({mode:'live',data:{text:'削除しました',used:['not_owned'],action:'delete_town',reason:'x'}}));assert.equal(r.mode,'demo');assert.equal(r.action,'work');assert.ok(g.m.events.every(e=>e.text!=='削除しました'));assert.ok(g.s.city.active);
});
test('loading a save preserves the edited body, original facts and distinct active NPC contexts',async()=>{
  const g=await afterSync();g.edit({action:'rewrite',id:'promise',text:'Tomoともう一度、この場所を好きになりたい。'});g.edit({action:'equip',equipped:['promise']});
  const dir=await mkdtemp(join(tmpdir(),'ayh-memory-')),id=randomUUID();try{const store=createStorage(dir);await store.save(id,g.s);const restored=await store.load(id);assert.deepEqual(restored.city.memoryGame,g.m);assert.deepEqual(restored.agents.tomo.currentContext,g.s.agents.tomo.currentContext);assert.ok(restored.busy instanceof Set);}finally{await rm(dir,{recursive:true,force:true});}
});
test('memory routes integrate with sessions and only public memory assets are served',async()=>{
  const server=createServer({apiKey:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let session='';
  const post=async(path,data)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Session':session},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  try{session=(await post('session',{})).data.id;const r=await post('memory/start',{});assert.equal(r.status,200);assert.equal(r.data.memoryGame.stage,'arrival');
    assert.equal((await post('memory/edit',{action:'equip',equipped:['arrival'],revision:0})).status,200);assert.equal((await post('memory/edit',{action:'equip',equipped:[],revision:0})).status,409);
    assert.equal((await fetch(base+'/assets/characters/player.glb')).status,200);assert.equal((await fetch(base+'/server/memory-game.mjs')).status,404);assert.equal((await fetch(base+'/art/characters/player.blend')).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('the original player asset includes an opening hatch, three blocks and embedded textures',async()=>{
  const bytes=await readFile(new URL('../assets/characters/player.glb',import.meta.url));assert.equal(bytes.toString('ascii',0,4),'glTF');const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.ok(gltf.nodes.some(n=>n.name==='MemoryHatch'));for(let i=0;i<3;i++)assert.ok(gltf.nodes.some(n=>n.name==='MemoryBlock.'+i));assert.ok(gltf.images.every(i=>!i.uri));assert.ok(bytes.length<1500000);
});
