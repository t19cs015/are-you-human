import {places,workSpot} from './town-layout.js';
import {entrances} from './locations.js';
import {findPath,clearSegment} from './navigation.js';
import {insideObstacle} from './street-layout.js';
import {memoryMeeting} from './memory-rules.js';
export function navigationAudit(world){
  const start={x:0,z:6.6},canWalk=world.navigation,checks=[];
  const goals=Object.entries(entrances).map(([id,[x,z]])=>[id+' entrance',{x,z}]);
  goals.push(['east doorstep',{x:6.7,z:-1}],['west doorstep',{x:-6.8,z:-1}],['central',{x:0,z:26}],['memory bridge',{x:0,z:49}],['memory city',{x:0,z:74}]);
  goals.push(['memory arrival',{x:.6,z:3.6}],['memory player',{x:0,z:5.8}],['memory promise',memoryMeeting],['memory invitation',{x:memoryMeeting.x-1.4,z:memoryMeeting.z-1}]);
  for(const site of ['commons','reading','garden','cafe','library','organ'])for(const id of ['mia','ren','tomo','shell'])goals.push([site+' / '+id,workSpot(site,id)]);
  for(const [name,goal] of goals){const path=findPath(start,goal,canWalk,{maxNodes:16000});let from=start,badSegment=null;const clear=path.length>0&&path.every(to=>{const ok=clearSegment(from,to,canWalk,.05);if(!ok)badSegment={from,to};from=to;return ok;});checks.push({name,walkable:canWalk(goal.x,goal.z),route:clear,...(!clear?{goal,blockedBy:world.colliders.filter(c=>insideObstacle(goal.x,goal.z,c)),badSegment}:{})});}
  const output=document.createElement('pre');output.id='navigation-audit';output.setAttribute('aria-label','実際の街の通行確認');output.style.cssText='position:fixed;bottom:10px;left:10px;max-height:35vh;overflow:auto;font:14px monospace;background:#13273cef;color:white;padding:12px;z-index:99';output.textContent=JSON.stringify({passed:checks.filter(c=>c.walkable&&c.route).length,total:checks.length,failed:checks.filter(c=>!c.walkable||!c.route)},null,2);document.body.append(output);
}
