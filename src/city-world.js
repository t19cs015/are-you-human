import * as T from '/node_modules/three/build/three.module.js';
import {asset} from './cafe-assets.js';
import {townHomes,townObstacles,infrastructureObstacles} from './town-layout.js';
import {createTownSurfaces} from './town-surfaces.js';
import {createRoadSigns,addPropFootprint} from './street-props.js';

// Extend Hina's existing town kit, palette and original residents.
// No new character models or external generation services are required to play.
export function createCityWorld(world){
  const group=new T.Group();group.name='川辺と木立の工房';world.scene.add(group);
  const materials=new Map(),boxGeo=new T.BoxGeometry(1,1,1),bulbGeo=new T.SphereGeometry(.085,8,6);
  function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.88}));return materials.get(color);}
  function box(color,x,y,z,w,h,d,parent=group){const m=new T.Mesh(boxGeo,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
  createTownSurfaces(world.scene);
  createRoadSigns(world);
  for(const cx of [-14,14]){
    const tiles=new T.InstancedMesh(new T.BoxGeometry(.73,.025,.73),mat(0xb0aa94),110);let i=0;const dummy=new T.Object3D();
    for(let a=-5;a<=5;a++)for(let b=-5;b<=4;b++){dummy.position.set(cx+a*.78,.13,24+b*.78);dummy.updateMatrix();tiles.setMatrixAt(i++,dummy.matrix);}
    tiles.receiveShadow=true;group.add(tiles);
  }
  // Flush paths leave the central village and all its original props intact.
  for(const x of [-1.9,1.9])for(let z=12;z<21;z+=1.1)box(0x756854,x,.09,z,.12,.12,.95);
  world.colliders.push(...townObstacles);

  function sign(text,subtitle,x,y,z,w=2.6,rotation=0){
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#30474b';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#c9b785';ctx.lineWidth=5;ctx.strokeRect(10,10,748,172);ctx.textAlign='center';ctx.fillStyle='#f2dfb4';ctx.font='bold 58px Georgia';ctx.fillText(text,384,89);ctx.font='22px sans-serif';ctx.fillText(subtitle,384,140);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,.65),new T.MeshBasicMaterial({map}));m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);return m;
  }

  const riverBulbs=[],riverGlow=new T.MeshBasicMaterial({color:0x69716c}),lanternGlow=new T.MeshBasicMaterial({color:0xffd699});
  const riverLight=new T.PointLight(0xffc68a,0,17,2);riverLight.position.set(-14,3,24);group.add(riverLight);
  for(const [x,z,power,range] of [[14,24,38,17],[0,17,24,14],[-12,31,10,7]]){const light=new T.PointLight(0xffc68a,power,range,2);light.position.set(x,3.2,z);group.add(light);}
  const temporary=new T.Group();group.add(temporary);temporary.visible=false;
  for(let i=0;i<7;i++){
    const x=-21+i*2,z=23.5,y=3.1-Math.sin(i/6*Math.PI)*.35;
    if(i===0||i===6)box(0x4e615d,x,1.55,z,.08,3.1,.08);
    const bulb=new T.Mesh(bulbGeo,riverGlow);bulb.position.set(x,y,z);group.add(bulb);riverBulbs.push(bulb);
    if(i<6){const cable=box(0x485c5d,x+1,y+.04,z,2.05,.018,.018);cable.rotation.z=i<3?-.075:.075;}
  }
  for(const [x,z] of [[-19.3,26],[-16.7,26],[-18,27.4]]){
    box(0x69795c,x,.33,z,.26,.48,.26,temporary);const light=new T.Mesh(bulbGeo,lanternGlow);light.scale.set(.95,1.6,.95);light.position.set(x,.43,z+.15);temporary.add(light);
  }
  // A cabinet and an actual shared table give the work a visible location.
  box(0x5a766e,-14,.65,21,.55,1.1,.42);box(0xb7c79d,-14,.85,21.23,.35,.18,.035);
  world.colliders.push({x:-14,z:21,hw:.275,hd:.21});
  box(0x8e775e,-18,.65,26,1.2,.12,.6);box(0x596657,-18,.3,26,.18,.6,.3);
  world.colliders.push({x:-18,z:26,hw:.6,hd:.3});
  const bookPiles=new T.Group();group.add(bookPiles);const piles=[];
  for(let i=0;i<2;i++){const pile=new T.Group();pile.position.set(-18+(i? .32:-.32),.75,26);bookPiles.add(pile);for(let j=0;j<3;j++)box([0x7b9d9a,0xb495a1,0xd4b787][j],0,j*.065,0,.32,.05,.24,pile);piles.push(pile);}
  const openSign=sign('A PLACE TO READ','BRING A BOOK. STAY A LITTLE.',-18,1.15,25.6,1.7);openSign.visible=false;
  const carries=new Map();
  for(const n of world.npcs){
    const holder=new T.Group();holder.position.set(0,.83,.62);n.body.add(holder);
    const parcel=box(0xc9ad7c,0,0,0,.42,.3,.3,holder);box(0x7b8d83,0,.16,0,.065,.02,.31,holder);
    carries.set(n.id,{holder,parcel});holder.visible=false;
  }
  const furnitureReady=(async()=>{
    const names=['house-house','park-tree','park-bush','park-flower_A','park-flower_B','park-bench','park-street_lantern','house-package','furniture-cabinet_medium_decorated'];
    const templates=Object.fromEntries(await Promise.all(names.map(async n=>[n,await asset(n)]))),roots=[];
    function put(name,x,z,scale=1,rotation=0,y=.13){const m=templates[name].clone(true);m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rotation;group.add(m);roots.push(m);if(name==='park-bush')addPropFootprint(world.colliders,m);return m;}
    for(const h of townHomes){put('house-house',h.x,h.z,.69,h.rotation);const dx=Math.sin(h.rotation)*1.95,dz=Math.cos(h.rotation)*1.95;sign(h.label,'LITTLE ELSEWHERE',h.x+dx,2.9,h.z+dz,2.6,h.rotation);}
    for(const [cx,cz] of [[-14,24],[14,24]])for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2,x=cx+Math.cos(a)*12.3,z=cz+Math.sin(a)*12.3;
      if(Math.abs(x)<6.5&&z>17&&z<28)continue;
      if(infrastructureObstacles.some(c=>Math.abs(x-c.x)<c.hw+1&&Math.abs(z-c.z)<c.hd+1))continue;
      put('park-tree',x,z,.85+(i%3)*.2,a);world.colliders.push({x,z,hw:.3,hd:.3});
      if(i%2)put('park-bush',cx+Math.cos(a)*10.5,cz+Math.sin(a)*10.5,.55);
    }
    for(const [x,z,r] of [[-19,28,Math.PI],[10,29,.4],[18,29,-.4],[-9,27,-.5]]){put('park-bench',x,z,.9,r);world.colliders.push({x,z,hw:.95,hd:.45});}
    for(const [x,z] of [[-4,14],[4,18],[-9,22],[8,22],[17,27]]){
      put('park-street_lantern',x,z,.78);const bulb=new T.Mesh(bulbGeo,lanternGlow);bulb.position.set(x,2.9,z);group.add(bulb);
      world.colliders.push({x,z,hw:.14,hd:.14});
    }
    for(let i=0;i<75;i++){const side=i%2?1:-1,x=side*(7+(i%9)*1.7),z=30+(i%4)*.8;put(i%3?'park-flower_A':'park-flower_B',x,z,.3+(i%3)*.07,i);}
    put('furniture-cabinet_medium_decorated',14,19.8,.65);put('house-package',14.6,20,.45);put('house-package',13.3,20,.38);
    // Static kit pieces share geometry and materials, so adding blocks stays affordable.
    group.updateMatrixWorld(true);const batches=new Map();
    for(const root of roots)root.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());});
    for(const b of batches.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();group.add(m);}
    roots.forEach(o=>o.removeFromParent());return true;
  })().catch(()=>false);
  return {group,ready:furnitureReady,update(time,city){
    const lit=!city?.active||city.repaired;riverGlow.color.setHex(lit?0xffd699:0x536470);riverLight.intensity=lit?35:city?.temporaryLights?12:0;
    temporary.visible=!!city?.temporaryLights;piles.forEach((p,i)=>p.visible=(city?.booksDelivered||0)>i);openSign.visible=!!city?.readingReady;
    for(const [id,c] of carries){c.holder.visible=!!city?.carrying[id];c.parcel.material=mat(city?.carrying[id]==='records'?0x91c2c5:city?.carrying[id]==='books'?0x839eac:city?.carrying[id]==='lanterns'?0xe9c690:0xb9bf9e);}
  }};
}
