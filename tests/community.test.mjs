import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createSociety} from '../server/society.mjs';
import {startCommunity,startCity,tickCity,controlCity,thinkCity,availableCityActions} from '../server/city.mjs';
import {interactCommunity,proposeCommunity} from '../server/community.mjs';
import {generateCommunityArt,readCommunityArt} from '../server/community-art.mjs';
import {recordConversation} from '../server/infrastructure.mjs';
import {centralSnapshot} from '../server/central.mjs';
import {createGenerator} from '../server/provider.mjs';
import {createStorage} from '../server/storage.mjs';
import {workSpot} from '../src/town-layout.js';
import {createLocomotion} from '../src/locomotion.js';
import {findPath,clearSegment} from '../src/navigation.js';
import {createServer} from '../server.mjs';
import {infrastructureObstacles,townObstacles} from '../src/town-layout.js';
const demo=createGenerator({key:''});
function scene(){const s=createSociety();let now=1000;startCommunity(s,now);return {s,tick(n=1,held=[]){for(let i=0;i<n;i++)tickCity(s,s.city.positions,held,now+=1000);},arrive(id){s.city.positions[id]=workSpot(s.city.tasks[id].site,id);},switch(){interactCommunity(s,'switch',{x:0,z:6.6});}};}
test('first physical action is immediate and proximity checked; route and wind have real effects',()=>{
  const {s,tick,switch:flip}=scene();const c=s.city.community;assert.throws(()=>interactCommunity(s,'switch',{x:0,z:28}),/TOO_FAR/);assert.throws(()=>interactCommunity(s,'switch',{x:NaN,z:3}),/INVALID_ACTION/);
  tick(2);assert.ok(c.central>10);flip();const central=c.central,energy=c.energy;tick(2);assert.equal(c.central,central);assert.ok(c.energy>energy);flip();tick(2);assert.ok(c.central>central);
  const energy2=c.energy;interactCommunity(s,'wind',{x:5.4,z:5.4});assert.equal(c.energy,energy2+8);assert.equal(interactCommunity(s,'wind',{x:5.4,z:5.4}).changed,false);
  controlCity(s,'pause_model',{x:0,z:28});const stopped=c.central;tick(10);assert.equal(c.central,stopped);assert.deepEqual(availableCityActions(s,'tomo'),['keep']);
});
test('independent decisions and physical arrival of both residents are needed to finish',async()=>{
  const {s,tick,arrive,switch:flip}=scene();flip();let calls=0;
  await proposeCommunity(s,'音の遊び場を作ろう',async()=>({mode:'live',data:++calls===1?{kind:'playground',title:'風の鍵盤',partner:'ren',text:'Ren、一緒に音を試そう。'}:{accept:true,text:'測って調律してみよう。'}}));
  const p=s.city.community.project;assert.equal(calls,2);assert.equal(p.mode,'live');assert.equal((await thinkCity(s,demo)).idle,true);
  tick(15);assert.equal(p.progress,0);arrive('tomo');arrive('ren');tick(5,['ren']);assert.equal(p.progress,0);tick(12);assert.equal(p.stage,'complete');assert.equal(s.city.community.completed.length,1);
  const relations=JSON.stringify(s.agents.tomo.relations);tick(15);assert.equal(s.city.community.completed.length,1);assert.equal(JSON.stringify(s.agents.tomo.relations),relations);
  assert.equal(interactCommunity(s,'place',{x:0,z:-.6}).changed,true);
});
test('refusal preserves the town and busy ownership survives a conflicting conversation',async()=>{
  const {s,switch:flip}=scene();flip();const before=JSON.stringify(s.city.tasks);let i=0;
  const r=await proposeCommunity(s,'光る庭',async()=>({mode:'live',data:++i===1?{kind:'garden',title:'庭',partner:'shell',text:'手伝って。'}:{accept:false,text:'水を使わない案を先に考えたい。'}}));
  assert.equal(r.accepted,false);assert.equal(s.city.community.project,null);assert.equal(JSON.stringify(s.city.tasks),before);assert.equal(s.busy.size,0);
  s.busy.add('shell');await assert.rejects(()=>proposeCommunity(s,'花の庭',async()=>({mode:'live',data:{kind:'garden',title:'庭',partner:'shell',text:'一緒に。'}})),/BUSY/);assert.ok(s.busy.has('shell'));assert.equal(s.busy.size,1);
});
test('private conversation is never transmitted to central; shared words arrive after eight seconds',()=>{
  const {s,tick}=scene();recordConversation(s,'mia','秘密の試験のことを話そう。');recordConversation(s,'mia','二人だけにして、共有しないで','private');tick(10);assert.equal(centralSnapshot(s).deliveredRecords.length,0);
  recordConversation(s,'ren','いつか星を見る窓が欲しい。');tick(7);assert.equal(centralSnapshot(s).deliveredRecords.length,0);tick();assert.equal(centralSnapshot(s).deliveredRecords[0].text,'いつか星を見る窓が欲しい。');
});
test('saved community restores resources, accepted plans and actual work without advancing offline',async()=>{
  const dir=await mkdtemp(tmpdir()+'/ayh-community-');try{const storage=createStorage(dir),{s,switch:flip,arrive,tick}=scene();flip();await proposeCommunity(s,'星を見る場所',demo);for(const id of [s.city.community.project.lead,s.city.community.project.partner])arrive(id);tick(4);
    const id='3d76f6f0-ff55-4b18-9808-dfdb9c988809';await storage.save(id,s);const restored=await storage.load(id);assert.deepEqual(restored.city.community,s.city.community);startCity(restored,10000000);assert.deepEqual(restored.city.community,s.city.community);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('generated art is deduplicated, session-owned, persisted and never fakes API failure',async()=>{
  const path=await mkdtemp(tmpdir()+'/ayh-art-'),dir=pathToFileURL(path+'/');
  try{const {s:world,switch:flip}=scene();flip();await proposeCommunity(world,'庭',demo);const s={world,config:{key:'test-private',imageModel:'test-image'}};let calls=0;
    const bytes=Buffer.alloc(1000,1);bytes[0]=255;bytes[1]=216;
    const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/generations');assert.equal(JSON.parse(options.body).quality,'low');return {ok:true,json:async()=>({data:[{b64_json:bytes.toString('base64')}]})};};
    const revision=world.city.community.revision,[a,b]=await Promise.all([generateCommunityArt(s,revision,fetcher,dir),generateCommunityArt(s,revision,fetcher,dir)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.status,'ready');assert.ok((await readCommunityArt(s,a.id,dir)).url.startsWith('data:image/jpeg;base64,'));
    await assert.rejects(()=>readCommunityArt({world:scene().s},a.id,dir),/INVALID_ACTION/);assert.ok(!JSON.stringify(a).includes('test-private'));
    const second=scene();second.switch();await proposeCommunity(second.s,'庭',demo);const unavailable=await generateCommunityArt({world:second.s,config:{key:'test',imageModel:'test'}},1,async()=>({ok:false}),dir);assert.equal(unavailable.status,'unavailable');assert.equal(second.s.city.community.project.stage,'building');
  }finally{await rm(path,{recursive:true,force:true});}
});
test('walking is normalized, responsive across frame rates, and dash cannot tunnel through a thin wall',()=>{
  function run(input,dt=1/60){const mover=createLocomotion(),p={x:0,z:0};for(let i=0;i<Math.round(2/dt);i++)mover.step(p,input,dt,()=>true);return Math.hypot(p.x,p.z);}
  assert.ok(Math.abs(run({forward:1})-run({forward:1,side:1}))<.001);assert.ok(Math.abs(run({forward:1},1/30)-run({forward:1},1/120))<.06);assert.ok(run({forward:1,sprint:true})>run({forward:1})*1.5);
  const mover=createLocomotion(),p={x:0,z:0};for(let i=0;i<20;i++)mover.step(p,{forward:1,dash:true},.05,(x,z)=>z>-.8||z< -1.1);assert.ok(p.z>-.8);
  const moving=createLocomotion(),q={x:0,z:0};for(let i=0;i<60;i++)moving.step(q,{forward:1},1/60,()=>true);const before=q.z;for(let i=0;i<30;i++)moving.step(q,{},1/60,()=>true);assert.ok(before-q.z<.15);
});
test('new buildings leave every community work spot reachable and a stationary player can dash',()=>{
  for(const site of ['commons','reading','garden'])for(const id of ['mia','ren','tomo','shell']){const p=workSpot(site,id);assert.ok(![...infrastructureObstacles,...townObstacles].some(c=>Math.abs(p.x-c.x)<c.hw+.25&&Math.abs(p.z-c.z)<c.hd+.25),site+' / '+id);}
  const mover=createLocomotion(),p={x:0,z:0};assert.equal(mover.step(p,{dash:true},.05,()=>true).fired,true);assert.ok(p.z<0);mover.reset();assert.equal(mover.step(p,{},.05,()=>true).speed,0);
});
test('residents can approach riverside work from either side without grazing the table',()=>{
  const furniture=[{x:-18,z:26,hw:.6,hd:.3},{x:-19,z:28,hw:.95,hd:.45}];
  const canWalk=(x,z)=>!furniture.some(c=>Math.abs(x-c.x)<c.hw+.25&&Math.abs(z-c.z)<c.hd+.25);
  for(const id of ['mia','ren','tomo','shell'])for(const start of [{x:-18,z:24},{x:-18,z:29}]){
    const goal=workSpot('reading',id),path=findPath(start,goal,canWalk);assert.ok(path.length,id);let from=start;
    for(const to of path){assert.ok(clearSegment(from,to,canWalk),id);from=to;}
    // A small deviation should remain walkable rather than strand the walking animation at a corner.
    for(const dx of [-.15,.15])for(const dz of [-.15,.15])assert.ok(canWalk(goal.x+dx,goal.z+dz),id);
  }
});
test('an older image can finish while another place is planned without replacing its sketch',async()=>{
  const path=await mkdtemp(tmpdir()+'/ayh-late-art-'),dir=pathToFileURL(path+'/');
  try{const {s:world,switch:flip,tick,arrive}=scene();flip();await proposeCommunity(world,'庭',demo);const p=world.city.community.project;for(const id of [p.lead,p.partner])arrive(id);tick(12);
    const s={world,config:{key:'test',imageModel:'test'}};let release;const gate=new Promise(r=>release=r),bytes=Buffer.alloc(1000,1);bytes[0]=255;bytes[1]=216;
    const request=generateCommunityArt(s,p.revision,async()=>{await gate;return {ok:true,json:async()=>({data:[{b64_json:bytes.toString('base64')}]})};},dir);
    await proposeCommunity(world,'星を眺める場所',demo);release();const art=await request;
    assert.equal(world.city.community.art.status,'idle');assert.equal(world.city.community.art.revision,2);assert.equal(world.city.community.completed[0].artId,art.id);assert.ok((await readCommunityArt(s,art.id,dir)).url);
  }finally{await rm(path,{recursive:true,force:true});}
});
test('a rejected next proposal cannot strand the current place’s pending sketch',async()=>{
  const path=await mkdtemp(tmpdir()+'/ayh-refused-art-'),dir=pathToFileURL(path+'/');
  try{const {s:world,switch:flip,tick,arrive}=scene();flip();await proposeCommunity(world,'庭',demo);const p=world.city.community.project;for(const id of [p.lead,p.partner])arrive(id);tick(12);
    let release;const gate=new Promise(r=>release=r),bytes=Buffer.alloc(1000,1);bytes[0]=255;bytes[1]=216;
    const request=generateCommunityArt({world,config:{key:'test',imageModel:'test'}},p.revision,async()=>{await gate;return {ok:true,json:async()=>({data:[{b64_json:bytes.toString('base64')}]})};},dir);
    let calls=0;await proposeCommunity(world,'音の遊び場',async()=>({mode:'live',data:++calls===1?{kind:'playground',title:'音の庭',partner:'ren',text:'一緒に？'}:{accept:false,text:'別の案にしよう。'}}));
    release();const art=await request;assert.equal(world.city.community.project,p);assert.equal(world.city.community.art.id,art.id);assert.equal(world.city.community.art.status,'ready');
  }finally{await rm(path,{recursive:true,force:true});}
});
test('community HTTP endpoints isolate worlds and serve generated opening voices without an API key',async()=>{
  const server=createServer({apiKey:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const request=async(path,data,id)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};};
  try{const a=(await request('session',{})).data.id,b=(await request('session',{})).data.id,started=await request('community/start',{},a);assert.equal(started.status,200);
    assert.equal((await request('community/interact',{object:'switch',position:{x:0,z:6.6}},b)).status,409);
    assert.equal((await request('community/propose',{message:'庭'},a)).data.error,'TRY_SWITCH_FIRST');
    assert.equal((await request('community/interact',{object:'switch',position:{x:0,z:6.6}},a)).data.city.community.route,'town');
    const voice=await request('community/speech',{event:started.data.events[0].id},a);assert.equal(voice.data.mode,'generated');assert.equal((await fetch(base+voice.data.url)).status,200);
    assert.equal((await request('community/speech',{event:999999},a)).status,400);assert.equal((await fetch(base+'/src/skyline-variety.js')).status,200);assert.equal((await fetch(base+'/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js')).status,200);
    assert.equal((await fetch(base+'/data/community-art/secret.jpg')).status,404);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
