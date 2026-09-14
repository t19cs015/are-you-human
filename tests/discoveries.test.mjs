import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety} from '../server/society.mjs';
import {startCommunity,tickCity} from '../server/city.mjs';
import {initializeMemoryGame,editMemoryGame,talkMemoryGame,interactMemoryTown} from '../server/memory-game.mjs';
import {centralSnapshot} from '../server/central.mjs';
import {memoryGameSpeech} from '../server/speech.mjs';
import {recall} from '../server/memory.mjs';
import {createGenerator} from '../server/provider.mjs';
import {createServer} from '../server.mjs';
import {discoveryById,discoveryMemories,discoveryTarget,discoveryVisitSpot} from '../src/discovery-rules.js';
import {outdoorGround,canalRows,canalBridges} from '../src/town-layout.js';
import {riverJourneySeconds,riverSample,lanternJourney} from '../src/boundary-layout.js';

const offline=createGenerator({key:''});
function game(){
  const s=createSociety();let now=1000;startCommunity(s,now);initializeMemoryGame(s);
  return {
    s,get m(){return s.city.memoryGame;},
    tick(seconds){for(let i=0;i<seconds;i++)tickCity(s,s.city.positions,[],now+=1000);},
    touch(id,extra={}){return interactMemoryTown(s,{id,position:discoveryById[id],revision:s.city.memoryGame.revision,...extra});},
    edit(data){return editMemoryGame(s,{...data,revision:s.city.memoryGame.revision});},
    talk(id='tomo',generate=offline){return talkMemoryGame(s,{id,position:s.city.positions[id],revision:s.city.memoryGame.revision},generate);},
  };
}
async function reunited(){
  const g=game();await g.talk();g.tick(15);await g.talk();g.edit({action:'equip',equipped:['promise']});await g.talk();
  g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(10);assert.ok(g.m.meeting&&g.m.neighborJoined);return g;
}
const has=(g,id,text)=>recall(g.s.agents[id]).some(m=>m.text.includes(text));

test('touching a place earns one editable private memory, with no duplicate rewards',()=>{
  const g=game(),before=g.m.blocks.length;
  for(const id of Object.keys(discoveryMemories)){if(id==='shore')g.tick(riverJourneySeconds);assert.ok(g.touch(id).found);g.tick(1);assert.equal(g.touch(id).found,false);}
  assert.equal(g.m.blocks.length,before+9);
  g.edit({action:'rewrite',id:'place_wind',text:'PRIVATE_WIND 私は風の音に名前をつけたい。'});
  g.edit({action:'equip',equipped:['place_wind']});
  assert.ok(!JSON.stringify(centralSnapshot(g.s)).includes('PRIVATE_WIND'));
  assert.ok(Object.keys(g.s.agents).every(id=>!has(g,id,'PRIVATE_WIND')));
});

test('unknown, distant, stale and busy interactions leave the town untouched',()=>{
  const g=game(),before=structuredClone(g.m);
  assert.throws(()=>g.touch('unknown'),/INVALID_ACTION/);
  assert.throws(()=>g.touch('wind',{position:{x:0,z:6.6}}),/TOO_FAR/);
  assert.throws(()=>g.touch('wind',{revision:99}),/STALE/);
  g.s.busy.add('memory');assert.throws(()=>g.touch('wind'),/BUSY/);g.s.busy.clear();
  assert.deepEqual(g.m,before);
  g.touch('wind');const revision=g.m.revision;assert.equal(g.touch('wind').changed,false);assert.equal(g.m.revision,revision);
});

test('wind and water change real resource flow before the core can receive a memory',()=>{
  const g=game();g.touch('core');assert.equal(g.m.exploration.centralMemory,null);
  g.touch('wind');g.tick(1);assert.equal(g.s.city.infrastructure.energyRate,3);
  g.touch('core');assert.equal(g.m.exploration.centralMemory,null);
  const water=g.s.city.infrastructure.water;g.touch('pump');g.tick(1);
  assert.equal(g.s.city.infrastructure.waterRate,2);assert.ok(g.s.city.infrastructure.water>water);assert.equal(g.s.city.repaired,true);
  g.touch('core');assert.equal(g.m.exploration.centralMemory.id,'light');
});

test('the core shares only a snapshot of the lead memory at the next synchronization',async()=>{
  const g=await reunited();g.touch('wind');g.touch('pump');
  g.edit({action:'rewrite',id:'arrival',text:'HIDDEN_SECOND 私だけの思い出。'});
  g.edit({action:'rewrite',id:'promise',text:'DELIVERED_TIME 誰かと、名前のない遊びをしたい。'});
  g.edit({action:'equip',equipped:['promise','arrival']});g.touch('core');
  assert.ok(!has(g,'ren','DELIVERED_TIME'),'the central must deliver it first');
  g.edit({action:'rewrite',id:'promise',text:'LATER_EDIT これはまだ預けていない。'});
  const payload=JSON.stringify(centralSnapshot(g.s));assert.match(payload,/DELIVERED_TIME/);assert.doesNotMatch(payload,/HIDDEN_SECOND|LATER_EDIT/);
  g.tick(18);
  for(const id of ['tomo','mia','ren','shell']){assert.ok(has(g,id,'DELIVERED_TIME'));assert.ok(!has(g,id,'HIDDEN_SECOND'));assert.ok(!has(g,id,'LATER_EDIT'));}
});

test('a garden memory is read at the garden, never remotely or by the central',async()=>{
  const g=await reunited();g.edit({action:'rewrite',id:'promise',text:'GARDEN_ONLY 私はここで、遠回りを覚えていたい。'});
  g.touch('garden');g.tick(2);assert.ok(g.s.city.tasks.shell.localGarden);
  assert.ok(!has(g,'shell','GARDEN_ONLY'));assert.doesNotMatch(JSON.stringify(centralSnapshot(g.s)),/GARDEN_ONLY/);
  g.s.city.positions.shell={...g.s.city.tasks.shell.target};g.tick(1);assert.ok(has(g,'shell','GARDEN_ONLY'));assert.ok(!has(g,'ren','GARDEN_ONLY'));
  g.edit({action:'rewrite',id:'promise',text:'GARDEN_SECOND この庭の新しい言葉。'});g.touch('garden');g.tick(1);
  assert.ok(has(g,'shell','GARDEN_SECOND'));assert.doesNotMatch(JSON.stringify(centralSnapshot(g.s)),/GARDEN_ONLY|GARDEN_SECOND/);
});

test('the resident chooses a real destination from speech and experiences it only on arrival',async()=>{
  const g=await reunited();g.touch('music');g.edit({action:'equip',equipped:['place_music']});let count=0;
  const generate=async(system,input)=>{
    if(++count===1)return {mode:'live',data:{text:'音の停留所で、一緒に音を重ねない？',used:['place_music']}};
    const heard=JSON.parse(input);assert.equal(heard.heard,'音の停留所で、一緒に音を重ねない？');assert.ok(heard.availablePlaces.some(p=>p.id==='music'));
    return {mode:'live',data:{text:'うん、そこまで歩いて行くね。',action:'visit',place:'music',reason:'音を重ねる誘いを受けた'}};
  };
  const r=await g.talk('mia',generate);assert.equal(r.mode,'live');assert.deepEqual(g.s.city.tasks.mia.target,discoveryVisitSpot('music','mia'));
  g.tick(8);assert.ok(!g.m.exploration.joined.includes('mia:music'));assert.ok(!has(g,'mia','自分で歩いて行き'));
  g.s.city.positions.mia={...g.s.city.tasks.mia.target};g.tick(1);
  assert.ok(g.m.exploration.joined.includes('mia:music'));assert.ok(has(g,'mia','自分で歩いて行き'));
  const countBefore=g.m.events.length;g.tick(2);assert.equal(g.m.events.length,countBefore);
});

test('offline collected memories can also invite a resident, while an invented destination is rejected',async()=>{
  const g=await reunited();g.touch('music');g.edit({action:'equip',equipped:['place_music']});
  const r=await g.talk('ren');assert.equal(r.mode,'demo');assert.equal(g.s.city.tasks.ren.discovery,'music');
  let calls=0;await g.talk('mia',async()=>++calls===1?{mode:'live',data:{text:'こんばんは。',used:[]}}:{mode:'live',data:{text:'月へ移動したよ。',action:'visit',place:'moon',reason:'自由に移動'}});
  assert.equal(g.s.city.tasks.mia.discovery,undefined);assert.ok(!g.m.events.some(e=>e.text==='月へ移動したよ。'));
});

test('old saves acquire exploration state without resetting the player or the first chapter',()=>{
  const g=game();g.edit({action:'rewrite',id:'arrival',text:'前のバージョンから持っている記憶。'});const blocks=structuredClone(g.m.blocks),stage=g.m.stage;
  assert.equal(g.m.exploration,undefined);g.touch('door_a');assert.deepEqual(g.m.blocks,blocks);assert.equal(g.m.stage,stage);assert.equal(g.m.exploration.visited.door_a,1);
});

test('a lantern follows a finite river into the mist, and the reply must be witnessed',()=>{
  const g=game();assert.equal(g.touch('shore').found,false);assert.equal(g.m.exploration.shoreRead,undefined);
  g.touch('boat');g.tick(riverJourneySeconds-1);assert.equal(g.m.exploration.shoreReplyAt,undefined);
  g.tick(1);assert.ok(Number.isFinite(g.m.exploration.shoreReplyAt));assert.ok(!g.m.blocks.some(b=>b.id==='place_shore'));
  assert.equal(centralSnapshot(g.s).memory.frontier.replyObserved,false);
  assert.ok(g.touch('shore').found);assert.equal(centralSnapshot(g.s).memory.frontier.replyObserved,true);
  g.tick(1);assert.equal(g.touch('shore').found,false);assert.equal(g.m.blocks.filter(b=>b.id==='place_shore').length,1);
  assert.ok(Object.keys(g.s.agents).every(id=>!has(g,id,'灯りがふたつ')));
  const start=lanternJourney(0),end=lanternJourney(riverJourneySeconds);assert.ok(Math.hypot(start.x+20.4,start.z-39.8)<2);
  assert.ok(end.x>53&&end.x<60&&end.z>48);assert.equal(end.progress,1);assert.equal(end.opacity,0);
  for(let t=0;t<=riverJourneySeconds;t+=.5){const p=lanternJourney(t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(Math.abs(p.x)<63&&p.z<60);let distance=Infinity,width=0;for(let i=0;i<=500;i++){const r=riverSample(i/500),d=Math.hypot(p.x-r.x,p.z-r.z);if(d<distance){distance=d;width=r.width;}}assert.ok(distance<width-.5,'the lantern stays between the riverbanks');}
});

test('the far window changes only after delivery, and local lights wait for a real reader',async()=>{
  const g=await reunited();g.touch('wind');g.touch('pump');g.touch('core');
  assert.equal(g.m.exploration.borderShared,undefined);g.tick(18);assert.equal(g.m.exploration.borderShared,true);
  g.touch('garden');g.tick(1);assert.equal(g.m.exploration.localReadAt,undefined);
  g.s.city.positions.shell={...g.s.city.tasks.shell.target};g.tick(1);assert.ok(Number.isFinite(g.m.exploration.localReadAt));
});

test('saved dialogue keeps its original voice when the new story revises a line',async()=>{
  const g=game();g.m.events.push({id:999,by:'central',text:'この空きは、不要と判断した時間です。待つこと、遠回り、名前のない遊び。……あなたは、残したいのですか。'});g.touch('archive');
  const session={world:g.s,config:{key:''}},fetcher=()=>assert.fail('authored clips must not call the speech API');
  const old=await memoryGameSpeech(session,999,fetcher),current=await memoryGameSpeech(session,g.m.events.find(e=>e.place==='archive').id,fetcher);
  assert.equal(old.url,'/assets/memory/explore_archive.mp3');assert.match(current.url,/explore_archive_[a-f0-9]+\.mp3$/);assert.notEqual(current.url,old.url);
});

test('canals cannot be walked across except at the bridges; interaction focus respects walls and facing',()=>{
  for(const z of canalRows){assert.equal(outdoorGround(4,z),false);for(const x of canalBridges)assert.equal(outdoorGround(x,z),true);}
  const p={x:4.5,z:7.2};assert.equal(discoveryTarget(p,0,{segmentClear:()=>true})?.id,'chimes');
  assert.equal(discoveryTarget(p,Math.PI,{segmentClear:()=>true}),null);assert.equal(discoveryTarget(p,0,{segmentClear:()=>false}),null);
});

test('the interaction endpoint persists discoveries and rejects distant requests',async()=>{
  const server=createServer({apiKey:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let session='';
  const post=async(path,data)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Session':session},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  try{
    session=(await post('session',{})).data.id;await post('memory/start',{});
    assert.equal((await post('memory/interact',{id:'wind',position:{x:0,z:6.6},revision:0})).status,400);
    const r=await post('memory/interact',{id:'wind',position:{x:-34,z:13},revision:0});
    assert.equal(r.status,200);assert.equal(r.data.found,true);assert.equal(r.data.city.memoryGame.exploration.windTuned,true);
    const voice=await fetch(base+'/assets/memory/explore_wind.mp3');assert.equal(voice.status,200);assert.ok((await voice.arrayBuffer()).byteLength>1000);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
