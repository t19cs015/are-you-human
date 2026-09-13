import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createSociety,chat,social,instructions,publicState} from '../server/society.mjs';
import {startCity,tickCity,thinkCity,assignCityAction,controlCity,visitCityFacility,availableCityActions} from '../server/city.mjs';
import {recordConversation,infrastructureContext} from '../server/infrastructure.mjs';
import {createGenerator} from '../server/provider.mjs';
import {createStorage} from '../server/storage.mjs';
import {workSpot,places,outdoorGround,infrastructureObstacles,townObstacles} from '../src/town-layout.js';
import {findPath,clearSegment} from '../src/navigation.js';
const demo=createGenerator({key:''});
function simulation(){
  const s=createSociety();let now=1000;startCity(s,now);
  const tick=(n=1,held=[])=>{for(let i=0;i<n;i++)tickCity(s,s.city.positions,held,now+=1000);};
  const arrive=id=>{s.city.positions[id]=workSpot(s.city.tasks[id].site,id);};
  const finish=id=>{arrive(id);tick(s.city.tasks[id].duration+1);};
  const run=async(n=100)=>{for(let i=0;i<n;i++){for(const id of Object.keys(s.city.tasks))arrive(id);tick();await thinkCity(s,demo,instructions);}};
  return {s,tick,arrive,finish,run};
}
test('wind, water and relay come online through local work; human-free progress stops at the first modernization',async()=>{
  const {s,tick,run}=simulation();s.city.positions.tomo={x:0,z:2};tick(10);
  assert.equal(s.city.infrastructure.windOnline,false);assert.equal(s.city.infrastructure.energy,0);
  await run(200);const g=s.city.infrastructure;
  assert.equal(g.windOnline,true);assert.equal(g.pumpOnline,true);assert.equal(g.relayOnline,true);
  assert.equal(g.phase,1);assert.equal(g.research,2);assert.equal(g.samples.length,0);
  assert.equal(g.received.length,0);assert.ok(g.energy<=80&&g.water<=60);
});
test('a conversation must be carried to the center, and further growth consumes both resources',async()=>{
  const {s,run,arrive,tick}=simulation();await run(110);const g=s.city.infrastructure;
  await chat(s,'mia','古いカフェの暖かい窓が好きなんだ。',demo);
  assert.equal(g.received.length,0);assert.ok(g.pending.mia.length);
  // Clear optional jobs to isolate the delivery being tested.
  if(s.city.carrying.mia){await run(60);}
  assert.equal(assignCityAction(s,'mia','records'),true);s.city.positions.mia={x:-3,z:1};tick(12);assert.equal(g.received.length,0);
  arrive('mia');tick(8,['mia']);assert.equal(g.received.length,0);tick(4);
  assert.equal(g.received.length,1);assert.equal(g.phase,1);
  const id=Object.keys(s.agents).find(id=>!s.city.carrying[id]);assert.equal(assignCityAction(s,id,'compute'),true);arrive(id);
  controlCity(s,'wind_stop',places.wind);controlCity(s,'pump_stop',places.pump);g.energy=0;g.water=0;tick(15);
  assert.equal(g.phase,1);assert.equal(s.city.tasks[id].progress,0);
  controlCity(s,'wind_start',places.wind);controlCity(s,'pump_start',places.pump);tick(25);
  assert.equal(g.phase,2);assert.equal(g.voice,'古いカフェの暖かい窓が好きなんだ。');
  recordConversation(s,'ren','川の音が聞こえる場所を残してほしい。');await run(150);
  assert.equal(g.phase,3);assert.equal(g.research,6);
});
test('private conversation cancels undelivered records and stays out of other residents’ context',async()=>{
  const {s,tick,arrive}=simulation(),g=s.city.infrastructure;
  recordConversation(s,'mia','大切な合言葉は青いマグカップ。');assignCityAction(s,'mia','records');
  assert.equal(s.city.carrying.mia,'records');
  const r=await chat(s,'mia','今の話は二人だけにして。中央には送らないで。',demo);
  assert.equal(r.record.sharing,'private');assert.equal(s.city.carrying.mia,undefined);assert.equal(g.pending.mia.length,0);
  await chat(s,'mia','この話もまだ秘密のままだよ。',demo);tick(10);assert.equal(g.received.length,0);
  assert.ok(!infrastructureContext(s,'ren').includes('青いマグカップ'));
  await social(s,'mia','ren',async(prompt,input,fallback)=>{assert.ok(!JSON.stringify({prompt,input}).includes('青いマグカップ'));return {mode:'demo',text:fallback()};});
  assert.equal(publicState(s).city.infrastructure.pending,undefined);
  await chat(s,'mia','これからの話は中央に送っていいよ。',demo);
  await chat(s,'mia','風車の羽根が回る音が好きだよ。',demo);assert.equal(g.pending.mia.length,1);
  assignCityAction(s,'mia','records');arrive('mia');tick(4);assert.equal(g.received.length,1);
  assert.ok(!JSON.stringify(g.received).includes('青いマグカップ'));
  recordConversation(s,'ren','風車の羽根が回る音が好きだよ！');assert.equal(g.pending.ren?.length||0,0,'punctuation changes cannot farm samples');
});
test('remote console changes are rejected; pausing a reserved batch preserves its resources and sample',async()=>{
  const {s,run,arrive,tick}=simulation();await run(100);const g=s.city.infrastructure;
  assert.throws(()=>controlCity(s,'wind_stop',{x:0,z:0}),/TOO_FAR/);assert.equal(g.windEnabled,true);
  assert.throws(()=>visitCityFacility(s,'central',{x:NaN,z:28}),/INVALID_ACTION/);
  assert.throws(()=>controlCity(s,'invent',places.central),/INVALID_ACTION/);
  controlCity(s,'town_power',places.relay);tick();assert.equal(g.allocation,'town');assert.ok(g.energyRate<.5);
  recordConversation(s,'ren','新しい街でも、この場所を覚えていて。');assignCityAction(s,'ren','records');arrive('ren');tick(4);
  const id=Object.keys(s.agents).find(id=>!s.city.carrying[id]);assignCityAction(s,id,'compute');arrive(id);tick(2);
  const t=s.city.tasks[id],batch=structuredClone(t.batch),progress=t.progress;assert.ok(batch);
  assert.deepEqual(availableCityActions(s,id),['keep']);
  controlCity(s,'pause_model',places.central);tick(25);assert.equal(t.progress,progress);assert.deepEqual(t.batch,batch);
  controlCity(s,'resume_model',places.central);tick(12);assert.equal(g.phase,2);
});
test('new districts have connected routes and every work spot avoids reserved building plots',()=>{
  const obstacles=[...townObstacles,...infrastructureObstacles],walk=(x,z)=>outdoorGround(x,z)&&!obstacles.some(c=>Math.abs(x-c.x)<c.hw+.25&&Math.abs(z-c.z)<c.hd+.25);
  for(const site of Object.keys(places))for(const id of ['mia','ren','tomo','shell']){const goal=workSpot(site,id);assert.ok(walk(goal.x,goal.z),site+'/'+id);}
  for(const [from,to] of [['wind','central'],['pump','relay'],['cafe','central'],['wind','pump']]){
    const start=workSpot(from,'tomo'),goal=workSpot(to,'ren'),path=findPath(start,goal,walk);assert.ok(path.length,from+' to '+to);
    let last=start;for(const p of path){assert.ok(clearSegment(last,p,walk));last=p;}assert.deepEqual(path.at(-1),goal);
  }
});
test('an autonomous model cannot reopen equipment the player stopped',async()=>{
  const {s,run}=simulation();await run(100);controlCity(s,'wind_stop',places.wind);
  for(const id of Object.keys(s.city.tasks))if(!s.city.carrying[id])delete s.city.tasks[id];
  const result=await thinkCity(s,async(prompt,input,fallback,options)=>{
    assert.ok(!options.schema.properties.action.enum.includes('wind_start'));
    return {mode:'live',data:{text:'再開しよう。',action:'wind_start'}};
  },instructions);
  assert.equal(result.idle,true);assert.equal(s.city.infrastructure.windEnabled,false);assert.ok(!Object.values(s.city.tasks).some(t=>t.kind==='wind_start'));
});
test('infrastructure saves and older riverside saves resume without deleting their progress',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ayh-infrastructure-')),store=createStorage(dir),id='00000000-0000-4000-8000-000000000001';
  try{
    const {s,run}=simulation();await run(100);recordConversation(s,'mia','この窓はずっと残してほしい。');await store.save(id,s);
    const restored=await store.load(id);assert.equal(restored.city.infrastructure.phase,1);assert.equal(restored.city.infrastructure.pending.mia.length,1);
    const old=createSociety();delete old.city.infrastructure;old.city.active=true;old.city.repaired=true;old.city.booksDelivered=2;old.city.positions={mia:{x:0,z:3},ren:{x:1,z:3},tomo:{x:2,z:3},shell:{x:3,z:3}};
    await store.save(id,old);const migrated=await store.load(id);startCity(migrated);assert.equal(migrated.city.repaired,true);assert.equal(migrated.city.booksDelivered,2);assert.equal(migrated.city.infrastructure.enabled,true);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('the five original Blender assets have embedded geometry, valid hashes and animation pivots',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../assets/infrastructure/manifest.json',import.meta.url)));assert.equal(manifest.length,5);
  for(const entry of manifest){
    const data=await readFile(new URL('../assets/infrastructure/'+entry.file,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
    const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());assert.ok(json.meshes.length>0);assert.ok(json.buffers.every(b=>!b.uri));
    if(entry.id==='windmill'||entry.id==='pump')assert.ok(json.nodes.some(n=>n.name==='Rotor'));
    if(entry.id==='data-center')assert.ok(json.nodes.some(n=>n.name==='UpperWorks'));
  }
});
