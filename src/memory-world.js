import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {memoryMeeting} from './memory-rules.js';
export function createMemoryWorld(world){
  const root=new T.Group();root.name='Memories travelling through the town';world.scene.add(root);
  const blue=new T.MeshStandardMaterial({color:0x9ecbdc,roughness:.35,emissive:0x9ecbdc,emissiveIntensity:1.2}),warm=new T.MeshStandardMaterial({color:0xf0cc91,roughness:.38,emissive:0xf0cc91,emissiveIntensity:.75});
  const geometry=new RoundedBoxGeometry(.14,.19,.065,2,.019),packets=[];
  for(const n of world.npcs)for(let i=0;i<3;i++){const packet=new T.Mesh(geometry,blue);root.add(packet);packets.push({packet,n,i});}
  const marker=new T.Mesh(new T.RingGeometry(.58,.62,64),new T.MeshBasicMaterial({color:0x99bccc,transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(memoryMeeting.x,.235,memoryMeeting.z);root.add(marker);
  const guideRing=new T.Mesh(new T.RingGeometry(.8,.835,48),new T.MeshBasicMaterial({color:0xf0cc91,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}));guideRing.rotation.x=-Math.PI/2;root.add(guideRing);
  const constellation=new T.Group();constellation.position.set(memoryMeeting.x,1.6,memoryMeeting.z);root.add(constellation);
  for(let i=0;i<12;i++){const star=new T.Mesh(new T.OctahedronGeometry(.026,0),warm);const a=i*2.4;star.position.set(Math.cos(a)*(.6+i*.06),.25+Math.sin(i*1.7)*.2,Math.sin(a)*(.6+i*.06));constellation.add(star);}
  const threads=[];for(const n of world.npcs){const line=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:25},()=>new T.Vector3())),new T.LineBasicMaterial({color:0x9ecbdc,transparent:true,opacity:.3}));root.add(line);threads.push({line,n});}
  return {update(time,city,target=null){
    const m=city?.memoryGame;root.visible=!!m?.active;if(!root.visible)return;const syncing=m.stage==='syncing';
    guideRing.visible=!!target&&!syncing;
    if(target){const p=target.resident?world.npcs.find(n=>n.id===target.id)?.root.position||target:target;guideRing.position.set(p.x,.245,p.z);guideRing.material.opacity=.32+Math.sin(time*2)*.08;}
    marker.visible=m.stage!=='arrival';marker.material.color.set(m.meeting?0xf0cc91:0x99bccc);marker.material.opacity=m.meeting?.4:.18;constellation.visible=m.meeting;constellation.rotation.y=time*.08;constellation.position.y=1.6+Math.sin(time)*.03;
    for(const {packet,n,i} of packets){packet.visible=syncing;if(!syncing)continue;const f=(time*.65+i/3)%1;packet.position.set(T.MathUtils.lerp(0,n.root.position.x,f),T.MathUtils.lerp(5,1.15,f)+Math.sin(f*Math.PI)*2,T.MathUtils.lerp(28,n.root.position.z,f));packet.rotation.set(time*.5,i+time*.7,.2);packet.material=m.shared.includes(n.id)?warm:blue;}
    for(const {line,n} of threads){line.visible=syncing;if(!syncing)continue;const p=line.geometry.attributes.position;for(let i=0;i<25;i++){const f=i/24;p.setXYZ(i,T.MathUtils.lerp(0,n.root.position.x,f),T.MathUtils.lerp(5,1.15,f)+Math.sin(f*Math.PI)*2,T.MathUtils.lerp(28,n.root.position.z,f));}p.needsUpdate=true;line.geometry.computeBoundingSphere();}
  }};
}
