import * as T from '/node_modules/three/build/three.module.js';
import {residentIsSynced} from './human-rules.js';
export function createHumanWorld(world){
  const group=new T.Group();group.name='人間から伝わる、違うリズム';world.scene.add(group);
  const blue=new T.MeshBasicMaterial({color:0x9dd9e4,transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide}),warm=new T.MeshBasicMaterial({color:0xf2cc91,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide});
  const wave=new T.Mesh(new T.RingGeometry(.97,1,100),blue.clone());wave.rotation.x=-Math.PI/2;wave.position.y=.24;group.add(wave);
  const residents=new Map(world.npcs.map(n=>{const halo=new T.Mesh(new T.TorusGeometry(.68,.025,6,40),blue);halo.rotation.x=Math.PI/2;group.add(halo);const ripple=new T.Mesh(new T.RingGeometry(.92,1,50),warm.clone());ripple.rotation.x=-Math.PI/2;group.add(ripple);return [n.id,{halo,ripple}];}));
  const strands=[];for(let i=0;i<3;i++){const geometry=new T.BufferGeometry().setFromPoints(Array.from({length:25},()=>new T.Vector3()));const line=new T.Line(geometry,warm);group.add(line);strands.push(line);}
  let clock=0,last=0,serverClock=-1;
  return {update(time,city){
    const dt=Math.min(.05,time-last);last=time;group.visible=!!city?.community?.active;if(!group.visible)return;
    if(city.clock!==serverClock){serverClock=city.clock;clock=city.clock;}else clock+=dt;
    const h=city.community.human;if(!h)return;
    wave.visible=h.phase==='sync';if(wave.visible){const radius=2+(clock-h.startedAt)*14;wave.scale.setScalar(radius);wave.material.opacity=Math.max(0,.5-(clock-h.startedAt)*.065);}
    for(const n of world.npcs){const {halo,ripple}=residents.get(n.id),frozen=residentIsSynced(city,n.id);halo.visible=frozen;halo.position.set(n.root.position.x,.75+Math.sin(time*1.5)*.08,n.root.position.z);
      const age=clock-(h.awake[n.id]??-100);ripple.visible=age>=0&&age<2;ripple.position.set(n.root.position.x,.23,n.root.position.z);ripple.scale.setScalar(.5+age*1.7);ripple.material.opacity=Math.max(0,.8-age*.4);
    }
    strands.forEach((line,i)=>{const link=h.links[i],age=link?clock-link.at:99;line.visible=age>=0&&age<2;if(!line.visible)return;const a=world.npcs.find(n=>n.id===link.from).root.position,b=world.npcs.find(n=>n.id===link.to).root.position,positions=line.geometry.attributes.position;
      for(let k=0;k<25;k++){const f=Math.min(1,age*1.6)*k/24;positions.setXYZ(k,T.MathUtils.lerp(a.x,b.x,f),.9+Math.sin(f*Math.PI)*.45,T.MathUtils.lerp(a.z,b.z,f));}positions.needsUpdate=true;line.geometry.computeBoundingSphere();});
  }};
}
