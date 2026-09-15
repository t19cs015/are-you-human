import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Reusable close-up props. Original silhouettes and muted porcelain/timber palette;
// material boundaries, turned profiles and fitted hardware provide the detail.
const roundBox=new RoundedBoxGeometry(1,1,1,3,.055),sphere=new T.SphereGeometry(1,20,12),materials=new Map();
export function batchCraft(root,keep=[]){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),pools=new Map(),excluded=new Set(keep);
  function visit(o){if(excluded.has(o))return;if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){
    const key=o.geometry.uuid+':'+o.material.uuid;if(!pools.has(key))pools.set(key,{geometry:o.geometry,material:o.material,meshes:[],matrices:[]});
    const p=pools.get(key);p.meshes.push(o);p.matrices.push(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  }for(const child of o.children)visit(child);}
  visit(root);
  for(const p of pools.values())if(p.meshes.length>1){const m=new T.InstancedMesh(p.geometry,p.material,p.meshes.length);p.matrices.forEach((v,i)=>m.setMatrixAt(i,v));m.castShadow=p.meshes.some(o=>o.castShadow);m.receiveShadow=p.meshes.some(o=>o.receiveShadow);m.computeBoundingSphere();root.add(m);p.meshes.forEach(o=>o.removeFromParent());}
}
export function craftMaterial(color,kind='ceramic',glow=0){
  const key=`${color}:${kind}:${glow}`;
  if(!materials.has(key))materials.set(key,new T.MeshPhysicalMaterial({color,roughness:kind==='matte'?.84:kind==='wood'?.7:kind==='metal'?.3:.4,metalness:kind==='metal'?.68:.025,clearcoat:kind==='ceramic'?.3:kind==='metal'?.08:0,clearcoatRoughness:.25,emissive:color,emissiveIntensity:glow}));
  return materials.get(key);
}
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function craftBox(parent,color,x,y,z,w,h,d,kind='ceramic'){const m=mesh(parent,roundBox,craftMaterial(color,kind),x,y,z);m.scale.set(w,h,d);return m;}
export function craftRing(parent,color,x,y,z,r,tube=.022,flat=false){const m=mesh(parent,new T.TorusGeometry(r,tube,8,64),craftMaterial(color,'metal'),x,y,z);if(flat)m.rotation.x=Math.PI/2;return m;}
function orb(parent,color,x,y,z,r,glow=0){const m=mesh(parent,sphere,craftMaterial(color,'ceramic',glow),x,y,z);m.scale.setScalar(r);return m;}
function profile(parent,points,color,kind='ceramic'){return mesh(parent,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),64),craftMaterial(color,kind));}

export function createCraftFountain(parent,x,z){
  const root=new T.Group();root.name='Glazed fountain · flowing arcs, droplets and ripples';root.position.set(x,0,z);parent.add(root);
  profile(root,[[0,.08],[1.04,.08],[1.16,.12],[1.22,.2],[1.22,.31],[1.19,.36],[1.1,.4],[1.1,.47],[1.19,.52],[1.21,.58],[1.18,.64],[1.1,.65],[1.04,.58],[.98,.39],[.86,.32],[0,.32]],0xc7c1a6);
  craftRing(root,0xc2a579,0,.22,0,1.205,.025,true);craftRing(root,0x87aaa1,0,.595,0,1.18,.03,true);
  for(let i=0;i<32;i++){const a=i*Math.PI/16,m=craftBox(root,i%4?0x86a99f:0xcbb687,Math.sin(a)*1.116,.432,Math.cos(a)*1.116,.11,.08,.027);m.rotation.y=a;}
  const water=mesh(root,new T.CircleGeometry(1.025,80),new T.MeshPhysicalMaterial({color:0x609f9d,metalness:.2,roughness:.12,clearcoat:1,transparent:true,opacity:.76,depthWrite:false}),0,.526,0);water.rotation.x=-Math.PI/2;water.castShadow=false;
  profile(root,[[0,.53],[.14,.53],[.13,.64],[.08,.7],[0,.73]],0xc6af7c,'metal');
  const streams=[],rings=[],dummy=new T.Object3D();
  const waterMat=new T.MeshPhysicalMaterial({color:0xa3e0d6,metalness:.08,roughness:.15,clearcoat:1,emissive:0x5a9c9a,emissiveIntensity:.14,transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,dx=Math.sin(a),dz=Math.cos(a),s=new T.Group();s.position.y=.57;root.add(s);
    const points=Array.from({length:25},(_,k)=>{const t=k/24,r=.62*(1-t)+.12*t;return new T.Vector3(dx*r,4*t*(1-t)*(1.25+i%2*.15),dz*r);});
    const curve=new T.CatmullRomCurve3(points);const jet=mesh(s,new T.TubeGeometry(curve,36,.017,6,false),waterMat);jet.castShadow=false;streams.push({s,curve});
    const nozzle=profile(root,[[.026,.53],[.044,.55],[.037,.64],[.022,.65]],0xc6ae7e,'metal');nozzle.position.set(dx*.62,0,dz*.62);
    for(let j=0;j<2;j++){const r=mesh(root,new T.RingGeometry(.93,1,48),new T.MeshBasicMaterial({color:0xd7ece0,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}),dx*.14,.54,dz*.14);r.rotation.x=-Math.PI/2;r.castShadow=false;rings.push({r,i:i*2+j});}
  }
  const drops=new T.InstancedMesh(new T.SphereGeometry(1,8,6),waterMat,48);drops.frustumCulled=false;root.add(drops);
  batchCraft(root,[water,drops,...streams.map(s=>s.s),...rings.map(r=>r.r)]);
  return {root,update(time,active){
    streams.forEach(({s},i)=>s.scale.y=(active?1:.55)*(1+Math.sin(time*2+i)*.07));
    for(let i=0;i<48;i++){const stream=streams[i%6],u=(time*(active?.8:.5)+i*.127)%1,p=stream.curve.getPoint(u);dummy.position.set(p.x+Math.sin(i*3)*.009,p.y*stream.s.scale.y+.57,p.z);dummy.scale.set(.014,.022,.014);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;
    for(const {r,i} of rings){const f=(time*.9+i*.17)%1;r.scale.setScalar(.045+f*.46);r.material.opacity=(1-f)*.19;}
    water.material.roughness=.14+Math.sin(time*1.4)*.025;
  }};
}

export function createLanternSkiff(){
  const root=new T.Group();root.name='Timber skiff with an opal lantern';
  const outline=new T.Shape();outline.moveTo(-.54,0);outline.bezierCurveTo(-.35,.27,.25,.28,.56,0);outline.bezierCurveTo(.25,-.28,-.35,-.27,-.54,0);
  const hull=mesh(root,new T.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.022,bevelThickness:.025,curveSegments:16}),craftMaterial(0x9f8063,'wood'),0,.06,0);hull.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const x=-.35+i*.14,w=.34*Math.sqrt(Math.max(.15,1-(x/.55)**2));craftBox(root,i%2?0xb49871:0xbca47e,x,.064,0,.128,.025,w,'wood');}
  for(const x of [-.25,.29]){craftBox(root,0x708e83,x,.09,0,.045,.035,.34,'metal');for(const z of [-.13,.13])orb(root,0xd6bc83,x,.111,z,.017);}
  profile(root,[[0,.085],[.147,.085],[.157,.115],[.151,.14],[.128,.16],[0,.16]],0xbca679,'metal');
  const glass=mesh(root,new T.CylinderGeometry(.105,.135,.27,24),new T.MeshPhysicalMaterial({color:0xf7dfb0,roughness:.27,clearcoat:.9,metalness:.02,transparent:true,opacity:.32,depthWrite:false,emissive:0xffd08b,emissiveIntensity:.22}),0,.29,0);glass.castShadow=false;glass.renderOrder=3;
  profile(root,[[.03,.46],[.085,.46],[.149,.423],[.16,.411],[.137,.395]],0x7b9789,'metal');
  for(let i=0;i<4;i++){const a=i*Math.PI/2;craftBox(root,0xbba172,Math.cos(a)*.122,.285,Math.sin(a)*.122,.015,.3,.015,'metal');}
  const handle=craftRing(root,0xbda77e,0,.483,0,.064,.01);handle.scale.y=1.18;
  const flame=orb(root,0xffd89b,0,.278,0,.064,1.7);flame.scale.set(.037,.098,.037);flame.castShadow=false;
  root.userData.flame=flame;
  batchCraft(root,[flame,glass]);
  // A boat's forward axis is +Z, matching both the river tangent and canal route.
  const hullParts=new T.Group();for(const child of [...root.children])hullParts.add(child);hullParts.rotation.y=Math.PI/2;root.add(hullParts);
  const wake=mesh(root,new T.RingGeometry(.7,1,48),new T.MeshBasicMaterial({color:0xc5ddd1,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}),0,-.13,-.36);wake.rotation.x=-Math.PI/2;wake.scale.set(.34,.7,1);wake.castShadow=false;
  return root;
}

export function dressChime(parent,x,z,width){
  for(const side of [-1,1]){
    craftBox(parent,0xc9b48c,x+side*width*.5,.12,z,.22,.22,.24);
    for(const y of [.26,2.76])craftRing(parent,0xcab688,x+side*width*.5,y,z,.064,.018,true);
    orb(parent,0xc7b888,x+side*width*.5,3.07,z,.063);
    for(const dz of [-.064,.064])orb(parent,0xe5d1a1,x+side*width*.5,2.94,z+dz,.022);
  }
  for(let i=0;i<3;i++)craftBox(parent,0xab9679,x+(i-1)*width*.32,2.992,z,width*.25,.018,.12,'wood');
}

export function dressWaterwheel(wheel){
  for(const z of [-.34,.34]){
    craftRing(wheel,0x74928a,0,0,z,1.21,.067);
    craftRing(wheel,0xc9af80,0,0,z,1.07,.025);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;orb(wheel,0xd1b98b,Math.cos(a)*1.2,Math.sin(a)*1.2,z+Math.sign(z)*.042,.035);}
  }
  const hub=mesh(wheel,new T.CylinderGeometry(.21,.21,.81,24),craftMaterial(0x719087,'metal'));hub.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;for(const z of [-.22,0,.22]){const p=craftBox(wheel,0xa28161,Math.cos(a)*1.25,Math.sin(a)*1.25,z,.38,.08,.205,'wood');p.rotation.z=a;}}
  batchCraft(wheel);
}

export function dressMemoryCore(core){
  for(const side of [-1,1]){
    for(const x of [-1.67,0,1.67]){
      craftBox(core,0x4b6c71,x,2.4,side*2.518,1.44,2.26,.035);
      craftBox(core,0x8daca4,x,2.4,side*2.55,1.29,2.09,.035);
      for(let j=0;j<8;j++)craftBox(core,0x41656b,x,1.75+j*.17,side*2.58,1.05,.062,.025,'metal');
      for(const dx of [-.55,.55])for(const y of [1.49,3.3])orb(core,0xccb88e,x+dx,y,side*2.59,.034);
    }
    for(const z of [-1.7,0,1.7])craftBox(core,0x74988f,side*2.515,2.4,z,.045,2.24,1.42);
  }
  for(const y of [1.03,3.79])craftBox(core,0xbca678,0,y,0,5.16,.1,5.16,'metal');
  for(let i=0;i<24;i++){const a=i*Math.PI/12,m=craftBox(core,0xc2b48b,Math.sin(a)*2.24,4.01,Math.cos(a)*2.24,.07,.045,.19,'metal');m.rotation.y=a;}
  craftRing(core,0x749c99,0,4.01,0,2.35,.09,true);
  batchCraft(core);
}
