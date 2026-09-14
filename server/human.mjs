import {createHumanState,humanCallRadius,humanRelayRadius,residentIsSynced} from '../src/human-rules.js';
import {outdoorGround,places} from '../src/town-layout.js';
const ids=['mia','ren','tomo','shell'];
export function tickHuman(s,dt,held,emit){
  const c=s.city.community,h=c.human??=createHumanState(s.city.clock),now=s.city.clock;
  if(!s.city.infrastructure.modelEnabled){h.phase='idle';h.nextAt=now+12;return;}
  if(h.phase==='idle'&&now>=h.nextAt){
    if(held.length||s.busy.size){h.nextAt=now+3;return;}
    Object.assign(h,{phase:'sync',cycle:h.cycle+1,startedAt:now,endsAt:now+9,awake:{},links:[],seed:null,nextRelay:now+1,celebrated:false});
    if(h.cycle===1)emit(s,'central','街の記憶を、そろえます。',{kind:'sync',clip:'sync_start'});
  }
  if(h.phase!=='sync')return;
  if(h.seed&&now>=h.nextRelay){
    const pairs=[];
    for(const from of Object.keys(h.awake))for(const to of ids.filter(id=>residentIsSynced(s.city,id))){
      if(held.includes(from)||held.includes(to)||s.busy.has(from)||s.busy.has(to))continue;
      const a=s.city.positions[from],b=s.city.positions[to],distance=Math.hypot(a.x-b.x,a.z-b.z);
      if(distance<humanRelayRadius)pairs.push({from,to,distance});
    }
    pairs.sort((a,b)=>a.distance-b.distance);
    if(pairs.length){const {from,to}=pairs[0];h.awake[to]=now;h.links.push({from,to,at:now});h.nextRelay=now+1.05;
      emit(s,from,s.agents[to].name+'、こっち。一緒に。',{kind:'human-relay',actors:[from,to]});}
  }
  if(h.seed&&Object.keys(h.awake).length===ids.length&&!h.celebrated){
    h.celebrated=true;c.energy=Math.min(80,c.energy+8);c.boostUntil=Math.max(c.boostUntil,now+8);h.endsAt=Math.min(h.endsAt,now+1.8);
    h.moments.push({cycle:h.cycle,by:h.seed,at:now});h.moments=h.moments.slice(-12);
    emit(s,'mia','同じタイミングじゃなくても、一緒に動けるんだね。',{kind:'human-together',actors:ids,clip:'human_together'});
  }
  if(now>=h.endsAt){h.phase='idle';h.nextAt=now+42;}
}
export function humanAction(s,{action,id,cycle,position},emit){
  const c=s.city?.community;if(!c?.active)throw new Error('CITY_INACTIVE');
  const h=c.human??=createHumanState(s.city.clock),now=s.city.clock;
  if(!position||!outdoorGround(position.x,position.z))throw new Error('INVALID_ACTION');
  if(action==='call'){
    if(!ids.includes(id))throw new Error('UNKNOWN_AGENT');
    if(h.phase!=='sync'||h.cycle!==cycle)throw new Error('STALE');
    const p=s.city.positions[id];if(Math.hypot(position.x-p.x,position.z-p.z)>humanCallRadius)throw new Error('TOO_FAR');
    if(s.busy.has(id))throw new Error('BUSY');
    if(!residentIsSynced(s.city,id))return {changed:false};
    h.awake[id]=now;h.seed??=id;h.nextRelay=now+1.05;
    emit(s,id,'……聞こえた。あなたは、止まらないんだ。',{kind:'human-call',actors:[id]});
    return {changed:true,id};
  }
  if(action==='central'){
    if(Math.hypot(position.x-places.central.x,position.z-places.central.z)>4.5)throw new Error('TOO_FAR');
    if(now-h.lastGreeting<60)return {changed:false};h.lastGreeting=now;
    emit(s,'central','こんばんは。来てくれたんですね。',{kind:'central-greeting',site:'central',clip:'central_greeting'});return {changed:true};
  }
  if(action==='archive'){
    if(Math.hypot(position.x,position.z-51)>4.2)throw new Error('TOO_FAR');
    if(now-h.lastArchive<8)return {changed:false};h.lastArchive=now;
    emit(s,'central','みんなの続きは、ここにあります。あなたの続きは……あなたと歩いていくのですね。',{kind:'archive',site:'memory',clip:'archive_greeting'});return {changed:true};
  }
  throw new Error('INVALID_ACTION');
}
