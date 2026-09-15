import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {createVariedSkyline} from './skyline-variety.js';
import {memoryPlots,memoryObstacles} from './town-layout.js';
import {createFaceTexture} from './resident-visual.js';
import {dressMemoryCore} from './town-craft.js';

export function createMemoryCity(world){
  const group=new T.Group();group.name='記憶の都市 · a city that computes';world.scene.add(group);world.colliders.push(...memoryObstacles);
  const skyline=createVariedSkyline(group,memoryPlots);skyline.update(100);
  const unit=new RoundedBoxGeometry(1,1,1,2,.06),sphere=new T.SphereGeometry(1,12,8),materials=new Map(),dummy=new T.Object3D();
  const mat=(color,glow=0)=>{const key=color+':'+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.58,metalness:.12,emissive:color,emissiveIntensity:Math.max(.06,glow)}));return materials.get(key);};
  function box(color,x,y,z,w,h,d,parent=group,glow=0){const m=new T.Mesh(unit,mat(color,glow));m.position.set(x,y,z);m.scale.set(w,h,d);m.receiveShadow=true;parent.add(m);return m;}
  function orb(color,x,y,z,r,parent=group){const m=new T.Mesh(sphere,new T.MeshBasicMaterial({color}));m.position.set(x,y,z);m.scale.setScalar(r);parent.add(m);return m;}
  const rotors=[];
  function ring(x,y,z,r,rotation,color=0xa8d7ce,parent=group){const m=new T.Mesh(new T.TorusGeometry(r,.06,8,64),mat(color,.35));m.position.set(x,y,z);m.rotation.set(...rotation);parent.add(m);return m;}
  // A real, walkable bridge. All road and land faces are unioned in build-surfaces.
  for(const side of [-1,1]){
    box(0x91aaa1,side*3.38,.7,44.7,.13,1.35,8.1);
    box(0xe9d3a9,side*3.38,1.42,44.7,.18,.13,8.2,group,.22);
    for(let z=40.8;z<49;z+=1.35)box(0x77938d,side*3.38,.68,z,.16,1.3,.14);
  }
  for(const x of [-4.7,4.7])for(const z of [52,65.7,77.7,85]){
    box(0x6b8887,x,1.4,z,.13,2.7,.13);orb(0xf0d3a2,x,2.8,z,.15);
    const light=new T.PointLight(0xffd4a1,10,8,2);light.position.set(x,2.8,z);group.add(light);
    world.colliders.push({x,z,hw:.1,hd:.1});
  }
  // Small planted pockets sit between the avenues and the building footprints.
  for(const x of [-6.8,6.8])for(const z of [55,67,79]){
    box(0xb69881,x,.36,z,1.2,.55,1.2);box(0x837261,x,1.25,z,.18,1.4,.18);
    const crown=new T.Mesh(sphere,mat(0x7ea18e));crown.position.set(x,2.15,z);crown.scale.set(.75,1,.75);group.add(crown);
    const bud=new T.Mesh(sphere,mat(0xaec1a1));bud.position.set(x+.23,2.7,z+.05);bud.scale.set(.43,.58,.43);group.add(bud);
    world.colliders.push({x,z,hw:.65,hd:.65});
  }
  // The open bank can be seen from the bridge, with four familiar face patterns.
  const bank=new T.Group();bank.position.set(0,0,51);group.add(bank);
  const faces=[],facing=new T.Vector3();
  for(const side of [-1,1]){box(0x7e9d95,side*2.4,.3,0,.85,.34,.7,bank);orb(0xb6e0d0,side*2.4,.51,0,.09,bank);}
  ['mia','ren','tomo','shell'].forEach((id,i)=>{
    const side=i<2?-1:1,y=1.3+i%2*1.25,display=new T.Group();display.position.set(side*2.4,y,0);bank.add(display);
    const {texture}=createFaceTexture(id),face=new T.Mesh(new T.PlaneGeometry(.86,.52),new T.MeshBasicMaterial({map:texture,alphaTest:.15,side:T.DoubleSide}));
    face.position.z=.02;display.add(face);faces.push({face,display,y,i});
    const rim=new T.Mesh(new T.TorusGeometry(.55,.022,6,48),mat(0xb6e0d0,.5));display.add(rim);
  });
  const empty=ring(0,1.6,0,.65,[0,0,0],0xf0c995,bank);empty.material=empty.material.clone();empty.material.transparent=true;
  // Ceramic racks with slowly turning cooling fans; the street is its circuit board.
  for(const side of [-1,1])for(const z of [60,72]){
    const x=side*4.9;box(0xc5cbbb,x,2.1,z,1.35,4.1,2.7);box(0x294f5a,x-side*.7,2.2,z,.04,3.2,2.2);
    for(let y=1.15;y<4;y+=1.2){const fan=new T.Group();fan.position.set(x-side*.74,y,z);fan.rotation.y=side*Math.PI/2;group.add(fan);
      ring(0,0,0,.42,[0,0,0],0x7eadad,fan);
      const blades=new T.Group();fan.add(blades);for(let i=0;i<5;i++){const blade=box(0xa3c6bd,0,.2,0,.15,.37,.055,blades);const holder=new T.Group();holder.rotation.z=i*Math.PI*2/5;blades.add(holder);holder.add(blade);}rotors.push(blades);
    }
    world.colliders.push({x,z,hw:.8,hd:1.5});
  }
  const core=new T.Group();core.position.set(0,0,82);group.add(core);
  box(0x6c8685,0,.5,0,8,1,8,core);box(0xa5bcb0,0,2.4,0,5,3,5,core);
  dressMemoryCore(core);
  const heart=new T.Mesh(new T.IcosahedronGeometry(2.6,1),new T.MeshPhysicalMaterial({color:0x9bd2cb,roughness:.22,metalness:.25,transparent:true,opacity:.65,emissive:0x508f8d,emissiveIntensity:.35,wireframe:true}));heart.position.y=7;core.add(heart);
  const gyros=[ring(0,7,0,3.5,[Math.PI/2,.3,0],0xcbd8af,core),ring(0,7,0,3.2,[.3,.3,.3],0x9bcac9,core),ring(0,7,0,2.95,[1,0,.5],0xe6c699,core)];
  for(const x of [-3,3])for(const z of [-3,3]){box(0xb8c5b2,x,3.3,z,.45,5.8,.45,core);orb(0xc1e2d3,x,6.4,z,.2,core);}
  const lanes=[];
  function lane(points,color,count,speed){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),true,'catmullrom',.12);
    group.add(new T.Mesh(new T.TubeGeometry(curve,150,.035,6,true),mat(0x6e9290)));
    const capsules=new T.InstancedMesh(sphere,new T.MeshBasicMaterial({color}),count);capsules.frustumCulled=false;group.add(capsules);lanes.push({curve,capsules,count,speed});
  }
  lane([[-35,3.4,51],[-35,3.4,84],[35,3.4,84],[35,3.4,51]],0xe4c393,38,.012);
  lane([[-6,5,53],[-6,8,78],[6,8,78],[6,5,53]],0xa9dbd4,24,.025);
  lane([[-.8,.45,42],[-.8,.45,74],[.8,.45,74],[.8,.45,42]],0xc7e2bc,25,.02);
  const couriers=[];const route=[[-36,51],[36,51],[36,85],[-36,85]],lengths=[72,34,72,34];
  function deliveryPoint(t){let d=((t%1)+1)%1*212;for(let i=0;i<4;i++){if(d<=lengths[i]){const a=route[i],b=route[(i+1)%4],f=d/lengths[i];return {x:T.MathUtils.lerp(a[0],b[0],f),z:T.MathUtils.lerp(a[1],b[1],f),angle:Math.atan2(b[0]-a[0],b[1]-a[1])};}d-=lengths[i];}}
  for(let i=0;i<10;i++){
    const courier=new T.Group();box(i%2?0xb1ccc0:0xd6c4a5,0,.38,0,.55,.5,.75,courier);box(0x315766,0,.48,.39,.4,.18,.025,courier);
    for(const side of [-1,1])orb(0xc9e8db,side*.1,.49,.41,.04,courier);group.add(courier);const phase=i/10,p=deliveryPoint(phase),collider={x:p.x,z:p.z,hw:.3,hd:.4,transient:true};courier.position.set(p.x,.13,p.z);world.colliders.push(collider);couriers.push({courier,phase,collider});
  }
  let flowClock=0,last=0;
  return {group,develop:progress=>skyline.develop(progress),update(time,city){
    const dt=Math.min(.05,Math.max(0,time-last));last=time;const enabled=city?.infrastructure?.modelEnabled!==false;flowClock+=dt*(enabled?1:.28);
    heart.rotation.y=flowClock*.13;heart.rotation.z=Math.sin(flowClock*.17)*.13;heart.scale.setScalar(1+Math.sin(flowClock*.9)*.035);
    gyros.forEach((g,i)=>{g.rotation.y=flowClock*(i%2?-.13:.1);g.rotation.z=flowClock*(.08+i*.03);});rotors.forEach((r,i)=>r.rotation.z=flowClock*(i%2?-1.1:.9)*(1+(city?.memoryGame?.exploration?.clockOffset||0)*i*.04));
    for(const l of lanes){for(let i=0;i<l.count;i++){dummy.position.copy(l.curve.getPointAt((flowClock*l.speed+i/l.count)%1));dummy.scale.set(.10,.10,.24);dummy.lookAt(dummy.position.clone().add(l.curve.getTangentAt((flowClock*l.speed+i/l.count)%1)));dummy.updateMatrix();l.capsules.setMatrixAt(i,dummy.matrix);}l.capsules.instanceMatrix.needsUpdate=true;}
    couriers.forEach((c,i)=>{const next=deliveryPoint(c.phase+dt*(.006+i%3*.0007)),near=Math.hypot(next.x-world.camera.position.x,next.z-world.camera.position.z)<1.5||world.npcs.some(n=>Math.hypot(next.x-n.root.position.x,next.z-n.root.position.z)<1.1);if(!near)c.phase+=dt*(.006+i%3*.0007);const p=deliveryPoint(c.phase);c.courier.position.set(p.x,.13,p.z);c.courier.rotation.y=p.angle;c.collider.x=p.x;c.collider.z=p.z;});
    const glow=city?.clock-(city?.memoryGame?.exploration?.lastTouch.archive??city?.community?.human?.lastArchive??-100)<5;
    faces.forEach(({face,display,y,i})=>{display.position.y=y+Math.sin(time*1.2+i)*.055;display.getWorldPosition(facing);facing.x=world.camera.position.x;facing.z=world.camera.position.z;display.lookAt(facing);face.material.color.setScalar(glow?1.25:1);});empty.material.opacity=glow?.65+Math.sin(time*3)*.2:.22;
  }};
}
