import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety} from '../server/society.mjs';
import {startCommunity,tickCity,controlCity} from '../server/city.mjs';
import {humanAction} from '../server/human.mjs';
import {emitCommunity,proposeCommunity,interactCommunity} from '../server/community.mjs';
import {createGenerator} from '../server/provider.mjs';
import {residentIsSynced} from '../src/human-rules.js';
import {findPath,clearSegment} from '../src/navigation.js';
import {outdoorGround,memoryObstacles,infrastructureObstacles,townObstacles,workSpot} from '../src/town-layout.js';
import {signObstacles,insideObstacle,segmentHitsObstacle,townHedges,onPlazaApproach} from '../src/street-layout.js';
function scene(){const s=createSociety();let now=1000;startCommunity(s,now);return {s,tick(count=1,held=[]){for(let i=0;i<count;i++)tickCity(s,s.city.positions,held,now+=1000);},call(id='tomo',position={x:0,z:6.6}){return humanAction(s,{action:'call',id,cycle:s.city.community.human.cycle,position},emitCommunity);}};}
test('one human call wakes a resident, then nearby residents relay it without more commands',()=>{
  const {s,tick,call}=scene();tick(10);for(const id of ['mia','ren','tomo','shell'])assert.equal(residentIsSynced(s.city,id),true);
  const memory=s.agents.mia.history.length;call();assert.equal(residentIsSynced(s.city,'tomo'),false);assert.equal(residentIsSynced(s.city,'mia'),true);tick(6);
  assert.equal(Object.keys(s.city.community.human.awake).length,4);assert.equal(s.city.community.human.links.length,3);assert.equal(s.city.community.human.moments.length,1);assert.equal(s.agents.mia.history.length,memory);
  tick(10);assert.equal(s.city.community.human.moments.length,1);
});
test('a human call validates proximity and cycle; duplicates do not create another reward',()=>{
  const {s,tick,call}=scene();tick(10);assert.throws(()=>call('mia',{x:0,z:28}),/TOO_FAR/);assert.throws(()=>humanAction(s,{action:'call',id:'mia',cycle:0,position:{x:0,z:6.6}},emitCommunity),/STALE/);call('mia');assert.equal(call('mia').changed,false);
  s.city.positions.shell={x:30,z:70};tick(6);assert.equal(residentIsSynced(s.city,'shell'),true);assert.equal(s.city.community.human.moments.length,0);tick(4);assert.equal(residentIsSynced(s.city,'shell'),false);
});
test('synchronizing stops actual work; pausing central releases residents without deleting the project',async()=>{
  const {s,tick}=scene();interactCommunity(s,'switch',{x:0,z:6.6});await proposeCommunity(s,'音の広場',createGenerator({key:''}));const p=s.city.community.project;
  for(const id of [p.lead,p.partner])s.city.positions[id]=workSpot(p.site,id);tick(10);const progress=p.progress;tick(2);assert.equal(p.progress,progress);
  controlCity(s,'pause_model',{x:0,z:28});tick(4);assert.equal(p.stage,'complete');assert.equal(s.city.community.human.phase,'idle');
});
test('hologram and archive greetings require a visit and do not repeat on every frame',()=>{
  const {s}=scene();const act=(action,position)=>humanAction(s,{action,position},emitCommunity);
  assert.throws(()=>act('central',{x:0,z:6}),/TOO_FAR/);assert.equal(act('central',{x:0,z:26}).changed,true);assert.equal(act('central',{x:0,z:26}).changed,false);
  assert.throws(()=>act('archive',{x:0,z:28}),/TOO_FAR/);assert.equal(act('archive',{x:0,z:49}).changed,true);
});
test('roadside signs leave the middle of the promenade clear and the eastern doorstep has no hedge',()=>{
  for(let z=9;z<23;z+=.2)assert.ok(!signObstacles.some(c=>insideObstacle(0,z,c)));
  const hedgeBounds=townHedges.map(([x,z,rotation])=>({x,z,hw:rotation?.54:.72,hd:rotation?.72:.54}));
  assert.ok(!hedgeBounds.some(c=>insideObstacle(6.7,-1,c)));assert.equal(onPlazaApproach(0,13),true);
});
test('the new city has a connected walking route around central and across its bridge',()=>{
  const obstacles=[...memoryObstacles,...infrastructureObstacles,...townObstacles,...signObstacles],walk=(x,z)=>outdoorGround(x,z)&&!obstacles.some(c=>insideObstacle(x,z,c));
  const start={x:0,z:26},goal={x:0,z:74},path=findPath(start,goal,walk,{maxNodes:16000});assert.ok(path.length);let from=start;
  for(const to of path){assert.ok(clearSegment(from,to,walk,.1));from=to;}assert.equal(outdoorGround(5,46),false);assert.equal(outdoorGround(0,46),true);
});
test('navigation rejects a short corner crossing that point sampling would miss',()=>{
  const bench={x:0,z:0,hw:1,hd:1};
  const a={x:-1.36,z:1.32},b={x:-1.32,z:1.36};
  const walk=(x,z)=>!insideObstacle(x,z,bench);
  assert.equal(walk(a.x,a.z),true);assert.equal(walk(b.x,b.z),true);
  assert.equal(clearSegment(a,b,walk,.075),true);
  walk.segmentClear=(from,to)=>!segmentHitsObstacle(from,to,bench);
  assert.equal(clearSegment(a,b,walk,.075),false);
  assert.equal(segmentHitsObstacle(a,b,{...bench,active:false}),false);
  assert.equal(segmentHitsObstacle({x:-1.35,z:2},{x:-1.35,z:-2},bench),false);
});
