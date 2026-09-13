import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety,chat,instructions} from '../server/society.mjs';
import {createGenerator} from '../server/provider.mjs';
import {startCity,tickCity,thinkCity,assignCityAction,availableCityActions} from '../server/city.mjs';
import {workSpot,outdoorGround,places,townObstacles} from '../src/town-layout.js';
import {clearSegment,findPath} from '../src/navigation.js';
import {createServer} from '../server.mjs';
const demo=createGenerator({key:''});
function simulation(){
  const s=createSociety();let now=1000;startCity(s,now);
  // Keep exercising the original riverside projects independently of the new opening.
  s.city.infrastructure.enabled=false;s.city.tasks={};
  for(const [id,kind] of [['tomo','inspect'],['ren','books'],['mia','lanterns'],['shell','garden']])assignCityAction(s,id,kind);
  s.city.positions={mia:{x:-3,z:1.5},ren:{x:.4,z:-3.4},tomo:{x:-14.8,z:20.4},shell:{x:14.8,z:20.4}};
  function tick(seconds=1,held=[]){for(let i=0;i<seconds;i++)tickCity(s,s.city.positions,held,now+=1000);}
  function arrive(id){const t=s.city.tasks[id];assert.ok(t);s.city.positions[id]=workSpot(t.site,id);}
  function finish(id){arrive(id);tick(s.city.tasks[id].duration+1);}
  return {s,tick,arrive,finish};
}
test('actual arrival and unheld work are required; a viewpoint visit cannot finish a remote task',()=>{
  const {s,tick,arrive}=simulation();s.city.positions.tomo={x:0,z:3};tick(15);assert.equal(s.city.inspected,false);
  arrive('tomo');tick(15,['tomo']);assert.equal(s.city.inspected,false);
  tick(6);assert.equal(s.city.inspected,true);assert.ok(s.agents.tomo.memories.some(m=>m.text.includes('接続部')));
  assert.ok(!s.agents.ren.memories.some(m=>m.text.includes('接続部')));
});
test('parts must be collected and delivered, then two residents work together to restore power',()=>{
  const {s,finish,tick,arrive}=simulation();finish('tomo');
  assert.ok(assignCityAction(s,'tomo','parts'));finish('tomo');assert.equal(s.city.carrying.tomo,'parts');assert.equal(s.city.partsDelivered,false);
  assert.equal(assignCityAction(s,'tomo','garden'),false,'a carried item cannot disappear on replanning');
  finish('tomo');assert.equal(s.city.partsDelivered,true);assert.equal(s.city.carrying.tomo,undefined);
  assignCityAction(s,'tomo','repair');arrive('tomo');tick(25);assert.equal(s.city.repaired,false);
  assignCityAction(s,'shell','repair');arrive('shell');tick(20,['shell']);assert.equal(s.city.repaired,false);
  tick(15);assert.equal(s.city.repaired,true);assert.ok(s.agents.tomo.memories.some(m=>m.text.includes('灯りを直した')));
  assert.ok(s.agents.shell.memories.some(m=>m.text.includes('灯りを直した')));
  const milestones=s.city.events.filter(e=>e.kind==='milestone'&&e.text.includes('灯りを直した'));assert.equal(milestones.length,1);
});
test('lanterns offer a different physical outcome, and delivery reservations do not duplicate books',()=>{
  const {s,finish}=simulation();finish('mia');assert.equal(s.city.temporaryLights,false);assert.equal(s.city.carrying.mia,'lanterns');
  finish('mia');assert.equal(s.city.temporaryLights,true);assert.equal(s.city.repaired,false);
  assert.ok(assignCityAction(s,'mia','books'));assert.ok(!availableCityActions(s,'shell').includes('books'));
  finish('ren');finish('ren');assert.equal(s.city.booksDelivered,1);finish('mia');finish('mia');assert.equal(s.city.booksDelivered,2);
  assert.ok(!availableCityActions(s,'tomo').includes('books'));assert.ok(availableCityActions(s,'ren').includes('arrange'));
});
test('autonomous decisions can finish both shared projects without a player command',async()=>{
  const {s,arrive,tick}=simulation();
  for(let i=0;i<130&&!s.city.readingReady;i++){
    for(const id of Object.keys(s.city.tasks))arrive(id);tick();await thinkCity(s,demo,instructions);
  }
  assert.equal(s.city.repaired,true);assert.equal(s.city.readingReady,true);assert.equal(s.city.booksDelivered,2);
});
test('a live conversation changes only the speaker’s feasible plan; impossible model actions are rejected',async()=>{
  const {s}=simulation();const zero={affinity:0,trust:0,fear:0,respect:0,attraction:0,reason:'判断保留'};
  const oldMia=s.city.tasks.mia.id;
  const response=await chat(s,'shell','図書館から本を持ってきてくれる？',async(prompt,input,fallback,options)=>{
    assert.ok(prompt.includes('選択可能な行動'));assert.ok(options.schema.properties.action);
    return {mode:'live',text:'本を運ぶね。',data:{text:'本を運ぶね。',action:'books',assessment:zero,aboutHuman:zero}};
  });
  assert.equal(response.cityAction.accepted,true);assert.equal(s.city.tasks.shell.kind,'books');assert.equal(s.city.tasks.mia.id,oldMia);
  const old=s.city.tasks.shell.id;
  const bad=await chat(s,'shell','その場ですぐ直して',async()=>({mode:'live',text:'',data:{text:'試してみる。',action:'repair',assessment:zero,aboutHuman:zero}}));
  assert.equal(bad.cityAction.accepted,false);assert.equal(s.city.tasks.shell.id,old);assert.equal(s.city.repaired,false);assert.equal(s.busy.size,0);
});
test('stale planning cannot replace work chosen while the model was thinking',async()=>{
  const {s}=simulation();delete s.city.tasks.shell;let resolve;
  const pending=thinkCity(s,async()=>new Promise(r=>resolve=r),instructions);
  assert.ok(s.busy.has('shell'));
  assignCityAction(s,'shell','books');const task=s.city.tasks.shell.id;
  resolve({mode:'live',data:{text:'ひと休みしよう。',action:'garden'}});await pending;
  assert.equal(s.city.tasks.shell.id,task);assert.equal(s.busy.size,0);
});
test('navigation goes around obstacles, does not cut corners, and respects disconnected ground',()=>{
  const walk=(x,z)=>Math.abs(x)<5&&Math.abs(z)<5&&!(Math.abs(x)<.9&&Math.abs(z)<2.5);
  const start={x:-3,z:0},goal={x:3,z:0},path=findPath(start,goal,walk);assert.ok(path.length>1);
  let last=start;for(const p of path){assert.ok(clearSegment(last,p,walk));last=p;}assert.deepEqual(path.at(-1),goal);
  assert.deepEqual(findPath(start,goal,(x,z)=>Math.abs(x)>.9&&Math.abs(x)<5&&Math.abs(z)<2,{maxNodes:1000}),[]);
  for(const id of ['mia','ren','tomo','shell'])for(const place of Object.keys(places)){
    const point=workSpot(place,id);assert.ok(outdoorGround(point.x,point.z),`${place}/${id} must be on walkable land`);
    assert.ok(!townObstacles.some(c=>Math.abs(point.x-c.x)<c.hw+.25&&Math.abs(point.z-c.z)<c.hd+.25),`${place}/${id} must be outside a house`);
  }
});
test('HTTP city progress is isolated, and invalid coordinates cannot change it',async()=>{
  const server=createServer({apiKey:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  async function request(path,data,id){const res=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:res.status,data:await res.json()};}
  try{
    const a=(await request('session',{})).data.id,b=(await request('session',{})).data.id;
    assert.equal((await request('city/start',{},a)).data.active,true);assert.equal((await request('state',null,b)).data.city.active,false);
    assert.equal((await request('city/tick',{positions:{tomo:{x:999,z:999}},held:[]},a)).status,400);
    assert.equal((await request('city/think',{held:['unknown']},a)).status,400);
    const state=(await request('state',null,a)).data;assert.equal(state.city.clock,0);assert.equal(state.city.repaired,false);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
