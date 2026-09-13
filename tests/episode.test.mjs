import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSociety} from '../server/society.mjs';
import {startCity,startEpisode,tickCity,publicCity,applyCityChoice,controlCity} from '../server/city.mjs';
import {createGenerator} from '../server/provider.mjs';
import {proposeEpisode,thinkEpisode,queueEpisodePlan,episodeSupply,inspectEpisode,episodeEvent} from '../server/episode.mjs';
import {episodeSpeech} from '../server/speech.mjs';
import {createStorage} from '../server/storage.mjs';
import {workSpot} from '../src/town-layout.js';
import {createServer} from '../server.mjs';
import {runCentralTool} from '../server/central.mjs';

const demo=createGenerator({key:''});
function scene(){const s=createSociety();let now=1000;startEpisode(s,now);return {s,tick(seconds=1,held=[]){for(let i=0;i<seconds;i++)tickCity(s,s.city.positions,held,now+=1000);},arrive(id){s.city.positions[id]=workSpot(s.city.tasks[id].site,id);}};}

test('both wishes matter: central updating alone and simply stopping it cannot win',()=>{
  const {s,tick}=scene();tick(200);assert.equal(s.city.episode.update,100);assert.equal(s.city.episode.warmth,0);assert.equal(s.city.episode.stage,'cold');
  s.city.infrastructure.modelEnabled=false;tick(100);assert.equal(s.city.episode.warmth,100);assert.notEqual(s.city.episode.stage,'won');
  const other=scene();other.s.city.infrastructure.modelEnabled=false;other.tick(100);assert.equal(other.s.city.episode.update,8);assert.equal(other.s.city.episode.warmth,100);
});

test('a heat proposal needs two separate decisions, arrival and unheld work, then all four residents return',async()=>{
  const {s,tick,arrive}=scene();let count=0;
  const generate=async (instructions,input,fallback,{schema})=>{count++;return {mode:'live',data:count===1?{accept:true,partner:'ren',text:'Ren、カフェ側の管をつないでくれる？'}:{accept:true,text:'両方を残せるなら、引き受けるよ。'}};};
  assert.equal(queueEpisodePlan(s,'share_heat','中央の余熱をカフェに回したい').accepted,true);
  tick(40);assert.equal(s.city.episode.warmth,62,'waiting for dialogue does not punish the player');
  await thinkEpisode(s,generate);assert.equal(count,2);assert.equal(s.city.episode.plan.partner,'ren');assert.equal(episodeSupply(s).heat,0);
  tick(15);assert.equal(s.city.episode.installed.heat_route,true);assert.equal(s.city.episode.installed.heat_coil,undefined,'Ren has not reached the cafe');
  arrive('ren');tick(10,['ren']);assert.equal(episodeSupply(s).heat,0,'borrowing a worker pauses work');
  tick(6);assert.equal(episodeSupply(s).heat,3);assert.equal(episodeSupply(s).stable,true);
  tick(160);assert.equal(s.city.episode.stage,'returning');assert.notEqual(s.city.episode.stage,'won');
  for(const id of ['mia','tomo','ren'])arrive(id);tick(2);assert.notEqual(s.city.episode.stage,'won');
  arrive('shell');tick(2);assert.equal(s.city.episode.stage,'won');assert.ok(s.city.events.some(e=>e.clip==='ending'));
  const relations=JSON.stringify(s.agents.mia.relations);tick(10);assert.equal(JSON.stringify(s.agents.mia.relations),relations,'ending rewards apply only once');
});

test('sharing power is a different viable solution, with a slower update and a real budget',async()=>{
  const {s,tick,arrive}=scene();await proposeEpisode(s,'電力を半分ずつ分けて、中央はゆっくり進めて',demo);await thinkEpisode(s,demo);
  assert.equal(s.city.episode.plan.method,'share_power');arrive('ren');arrive('tomo');tick(7);
  const supply=episodeSupply(s);assert.equal(supply.central,5);assert.equal(supply.cafe,5);assert.equal(supply.heat,0);assert.equal(supply.central+supply.cafe,supply.total);assert.equal(supply.stable,true);
  const before=s.city.episode.update;tick(10);assert.ok(Math.abs(s.city.episode.update-before-4.8)<.001);
  assert.throws(()=>controlCity(s,'central_power',{x:10,z:31}),/INVALID_ACTION/,'a switch cannot undo the two-resident plan');
  s.city.infrastructure.windEnabled=false;tick(3);assert.equal(episodeSupply(s).stable,false);assert.equal(episodeSupply(s).total,0);
});

test('vague requests do not create a plan, and a resident may refuse without starting work',async()=>{
  const {s}=scene();await proposeEpisode(s,'両方守ってほしい',demo);assert.equal(s.city.episode.stage,'discover');
  await proposeEpisode(s,'カフェに熱を送らないで',demo);assert.equal(s.city.episode.stage,'discover');
  await proposeEpisode(s,'熱をカフェに回すとどうなる？',demo);assert.equal(s.city.episode.stage,'discover');
  const before=JSON.stringify(s.city.tasks);queueEpisodePlan(s,'share_heat','循環させよう');
  await thinkEpisode(s,async()=>({mode:'live',data:{accept:false,partner:'tomo',text:'水を汚さない流れを、先に確認したい。'}}));
  assert.equal(s.city.episode.stage,'discover');assert.equal(s.city.episode.plan,null);assert.equal(JSON.stringify(s.city.tasks),before);
  assert.equal(queueEpisodePlan(s,'invent-a-pipe','make it up').accepted,false);
});

test('central can relay a proposal, but cannot skip resident decisions or the physical work',()=>{
  const {s:world}=scene(),s={world},position={x:0,z:28};
  const r=runCentralTool(s,'propose_cafe_plan',{method:'share_power',idea:'電力を分けて中央の更新をゆっくりにしよう'},position);
  assert.equal(r.ok,true);assert.equal(world.city.episode.stage,'discuss');assert.equal(world.city.episode.plan,null);assert.equal(episodeSupply(world).stable,false);
  runCentralTool(s,'set_modernization',{enabled:false},position);assert.equal(world.city.infrastructure.modelEnabled,false);
  runCentralTool(s,'set_modernization',{enabled:true},position);assert.equal(world.city.infrastructure.modelEnabled,true);
  assert.throws(()=>runCentralTool(s,'propose_cafe_plan',{method:'share_heat',idea:'send heat'},{x:0,z:0}),/TOO_FAR/);
});

test('a pending negotiation cannot be overwritten; private conversation cannot broadcast a plan',()=>{
  const {s}=scene();s.city.infrastructure.sharing.shell=false;
  assert.equal(applyCityChoice(s,'shell','share_heat','private idea').accepted,false);assert.equal(s.city.episode.pending,null);
  assert.equal(queueEpisodePlan(s,'share_heat','public idea').accepted,true);
  assert.equal(queueEpisodePlan(s,'share_power','replace it').accepted,false);
  assert.equal(s.city.episode.pending.method,'share_heat');assert.equal(publicCity(s).episode.pending.reason,undefined);
});

test('inspection requires visiting the location, and an episode never replaces an existing town',()=>{
  const {s}=scene();assert.throws(()=>inspectEpisode(s,'heat',{x:0,z:0}),/TOO_FAR/);
  assert.equal(inspectEpisode(s,'heat',{x:0,z:28}).clue,'heat');const serial=s.city.serial;inspectEpisode(s,'heat',{x:0,z:28});assert.equal(s.city.serial,serial);
  assert.throws(()=>inspectEpisode(s,'heat',{x:NaN,z:28}),/TOO_FAR/);
  assert.throws(()=>startEpisode(s),/EPISODE_REQUIRES_NEW_NIGHT/);const free=createSociety();startCity(free);assert.throws(()=>startEpisode(free),/EPISODE_REQUIRES_NEW_NIGHT/);
});

test('a saved episode resumes its plan, actual positions and task progress',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ayh-episode-'));const storage=createStorage(dir);
  try{const {s,tick,arrive}=scene();queueEpisodePlan(s,'share_power','電力を分ける');await thinkEpisode(s,demo);arrive('ren');tick(2);await storage.save('3d76f6f0-ff55-4b18-9808-dfdb9c988809',s);
    const restored=await storage.load('3d76f6f0-ff55-4b18-9808-dfdb9c988809');assert.deepEqual(restored.city.episode,s.city.episode);assert.deepEqual(restored.city.positions,s.city.positions);assert.equal(restored.city.tasks.ren.progress,2);assert.equal(restored.busy.size,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('speech is limited to episode events, deduplicated, and keeps the key on the server',async()=>{
  const {s:world}=scene();const session={world,config:{key:'test-server-only'}};const e=episodeEvent(world,'shell','試験用の相談です。',{source:'ai'});let calls=0;
  const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/audio/speech');assert.equal(options.headers.Authorization,'Bearer test-server-only');const request=JSON.parse(options.body);assert.equal(request.model,'gpt-4o-mini-tts');assert.equal(request.input,e.text);return {ok:true,arrayBuffer:async()=>new Uint8Array(100).buffer};};
  const [a,b]=await Promise.all([episodeSpeech(session,e.id,fetcher),episodeSpeech(session,e.id,fetcher)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.mode,'generated');assert.ok(!JSON.stringify(a).includes('test-server-only'));
  await assert.rejects(()=>episodeSpeech(session,9999,fetcher),/INVALID_ACTION/);await assert.rejects(()=>episodeSpeech(session,'1',fetcher),/INVALID_ACTION/);
  const offline={world,config:{key:''}};assert.equal((await episodeSpeech(offline,e.id,fetcher)).mode,'unavailable');
});

test('episode HTTP routes preserve session isolation and serve generated voice files',async()=>{
  const server=createServer({apiKey:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const request=async(path,data,id)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};};
  try{const a=(await request('session',{})).data.id,b=(await request('session',{})).data.id;
    const started=await request('episode/start',{},a);assert.equal(started.data.episode.stage,'discover');assert.equal((await request('episode/propose',{message:'余熱をカフェに回そう'},b)).status,409);
    assert.equal((await request('episode/inspect',{clue:'cafe',position:{x:0,z:28}},a)).status,400);
    const voice=await request('episode/speech',{event:started.data.events[0].id},a);assert.equal(voice.data.mode,'generated');const clip=await fetch(base+voice.data.url);assert.equal(clip.status,200);assert.equal(clip.headers.get('content-type'),'audio/mpeg');assert.ok((await clip.arrayBuffer()).byteLength>1000);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
