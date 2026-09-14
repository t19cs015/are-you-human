import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {canalRows} from './town-layout.js';
import {riverSample,mistGates,boundarySpots} from './boundary-layout.js';

export function createTownBoundary(world){
  const group=new T.Group(),staticRoot=new T.Group();group.name='The edge of the remembered town';group.add(staticRoot);world.scene.add(group);
  const boxGeo=new RoundedBoxGeometry(1,1,1,2,.06),roundGeo=new T.SphereGeometry(1,14,9),roofGeo=new T.ConeGeometry(1,1,4),materials=new Map();
  function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.88}));return materials.get(color);}
  function piece(geo,color,x,y,z,sx,sy,sz,parent=staticRoot){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
  const box=(color,x,y,z,w,h,d,parent)=>piece(boxGeo,color,x,y,z,w,h,d,parent);
  const round=(color,x,y,z,w,h,d,parent)=>piece(roundGeo,color,x,y,z,w,h,d,parent);
  const collision=(x,z,hw,hd)=>world.colliders.push({x,z,hw,hd});
  function tree(x,z,s=1){
    box(0x797566,x,.8*s,z,.14*s,1.6*s,.14*s);
    round(0x779481,x,1.8*s,z,.7*s,1.1*s,.68*s);round(0x9aab90,x-.2*s,2.35*s,z,.44*s,.6*s,.43*s);
  }
  // Low rails make the walkable limit visible; water mouths interrupt the rails.
  for(const side of [-1,1]){
    const x=side*39.6;collision(x,68.5,.08,19.5);
    for(let z=49;z<88;z+=2.15){if(canalRows.some(row=>Math.abs(row-z)<2.1))continue;box(0x7e9588,x,.5,z,.10,.95,.10);box(0xc1b498,x,.85,z+1,.09,.10,2.13);}
    for(let z=51;z<=86;z+=5.5){if(canalRows.some(row=>Math.abs(row-z)<3))continue;round(0x789582,x+side*1.2,.22,z,1.35,.5,1.1);tree(x+side*2.1,z,.8+z%3*.13);}
  }
  collision(0,88,39.6,.08);
  for(let x=-39.5;x<40;x+=2.2){box(0x7e9588,x,.5,88,.10,.95,.10);box(0xc1b498,x+1.1,.85,88,2.2,.1,.09);}
  for(const side of [-1,1]){
    collision(side*21.65,48.15,17.95,.07);
    for(let x=4.5;x<40;x+=2.2){box(0x7e9588,x*side,.45,48.15,.09,.85,.09);box(0xc1b498,(x+1.1)*side,.79,48.15,2.2,.09,.08);}
  }
  // The canals disappear into a stone arch at either end, rather than a cut plane.
  for(const x of [-41,41])for(const z of canalRows){
    const arch=new T.Mesh(new T.TorusGeometry(1.65,.22,8,32,Math.PI),mat(0xa2afa0));arch.position.set(x,.65,z);arch.rotation.y=Math.PI/2;staticRoot.add(arch);
    for(const side of [-1,1])box(0x95a596,x,.18,z+side*1.65,.75,.95,.5);
    round(0x6e8a7b,x+Math.sign(x)*1.2,-.4,z,2.7,.45,3.5);
    for(const side of [-1,1])tree(x+Math.sign(x)*1.6,z+side*2.3,.78);
  }
  // A second layer of banks and rounded hills hides the toy-like cut perimeter.
  const hills=[[-20,-15,8,2.8,6],[-8,-22,9,3,6],[9,-20,11,3.3,6],[24,-11,7,2.6,7],[-54,8,8,3,13],[-55,28,8,2.8,9],[34,22,8,2.6,10],
    [-49,58,6,2.6,10],[-51,79,8,3.2,13],[50,63,8,2.4,11],[50,83,8,3.3,9],[-32,96,10,2.7,7],[-12,98,12,3.2,7],[12,99,13,3.4,7],[32,96,10,2.8,7]];
  hills.forEach(([x,z,w,h,d],i)=>{round(i%2?0x657e76:0x70867b,x,-1.8,z,w,h,d);for(let j=0;j<3;j++)tree(x+(j-1)*3.1,z+Math.sin(i+j)*2,.9+j*.3);});
  for(let i=0;i<=86;i++){
    const p=riverSample(i/86);for(const side of [-1,1]){
      const x=p.x-p.dz*(p.width+.22)*side,z=p.z+p.dx*(p.width+.22)*side;
      // Leave the restored bridge and the working intake unobstructed.
      if(Math.abs(x)<4.3||x>-22&&x<-14&&z<39)continue;
      round(i%3?0x8b9e91:0xa8b0a0,x,-.22,z,.5+(i%3)*.12,.23,.5);
      if(i%3===0)for(let j=0;j<3;j++){const stem=box(0x8aa185,x+j*.13,.15+j*.05,z,.035,.74+j*.1,.035);stem.rotation.z=Math.sin(i+j)*.12;}
    }
  }
  // Water passes beneath old gates into an unreconstructed valley.
  for(const [i,p] of mistGates.entries()){
    const g=new T.Group();g.position.set(p.x,0,p.z);g.rotation.y=p.angle;staticRoot.add(g);
    const arch=new T.Mesh(new T.TorusGeometry(5.4,.55,9,36,Math.PI),mat(0x8fa193));arch.position.y=.5;g.add(arch);
    for(const side of [-1,1]){box(0x7f9589,side*5.4,.2,0,1.2,1.8,2,g);round(0x768e7e,side*7,-1.2,0,3.8,2.6,5,g);}
    for(let j=0;j<7;j++){const a=(j+.5)*Math.PI/7;box(0xb8baa0,Math.cos(a)*5.4,.5+Math.sin(a)*5.4,.57,.19,.23,.08,g);}
  }
  // A place to pause at the east bank, and a listening stone at the northern edge.
  const shore=boundarySpots.shore;
  box(0x9fac96,38.6,.38,50.6,.6,.72,1.2);box(0xd6c8a7,38.6,.82,50.6,.9,.12,1.35);collision(38.6,50.6,.3,.6);
  box(0xa8b49f,0,.48,88.65,1.6,.8,.6);round(0xc1ceb4,0,1.08,88.65,.55,.27,.23);
  // Faint houses retain only an outline. One window gradually returns after sharing.
  const ghostHouses=[];
  for(const [i,[x,z,h]] of [[-27,94,3.6],[-15,96,5],[0,97,4.3],[15,97,5.8],[28,94,3.7],[-48,68,4.8],[48,78,4.6]].entries()){
    const g=new T.Group();g.position.set(x,0,z);group.add(g);
    const ghost=new T.MeshStandardMaterial({color:i%2?0x97aaa1:0xb9b4a1,roughness:.8,transparent:true,opacity:.13,depthWrite:false});
    const wall=new T.Mesh(boxGeo,ghost);wall.position.y=h/2;wall.scale.set(3.9,h,3.2);g.add(wall);
    const roof=new T.Mesh(roofGeo,ghost);roof.position.y=h+.85;roof.scale.set(3.2,2,2.7);roof.rotation.y=Math.PI/4;g.add(roof);
    const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(3.9,h,3.2)),new T.LineBasicMaterial({color:0x9cbab1,transparent:true,opacity:.24,depthWrite:false}));edge.position.y=h/2;g.add(edge);
    const light=new T.MeshBasicMaterial({color:0xf4d5a2,transparent:true,opacity:.06,depthWrite:false});
    for(const side of [-1,1]){const window=new T.Mesh(new T.PlaneGeometry(.65,.85),side<0?light:light.clone());window.position.set(side*.94,h*.65,-1.63);window.rotation.y=Math.PI;g.add(window);}
    ghostHouses.push({ghost,light,edge,i});
  }
  // Small boundary lamps repeat the three-note motif; no text floating over the edge.
  const lampGeo=new T.SphereGeometry(.105,10,7),lampMat=new T.MeshBasicMaterial({color:0xe9d6a9,transparent:true,opacity:.6}),lamps=[];
  for(let i=0;i<20;i++){
    const x=i<10?-38.9:38.9,z=50+(i%10)*3.65;if(canalRows.some(row=>Math.abs(row-z)<1.8))continue;
    box(0x8ea18f,x,.58,z,.1,1.05,.1);const m=new T.Mesh(lampGeo,lampMat.clone());m.position.set(x,1.15,z);group.add(m);lamps.push({m,i});
  }
  const reply=[];
  for(let i=0;i<2;i++){
    const p=mistGates[1],m=new T.Mesh(new T.SphereGeometry(.24,12,8),new T.MeshBasicMaterial({color:0xf3d39b,transparent:true,opacity:.15,depthWrite:false}));
    m.position.set(p.x-1+i*2.6,1.3+i*.4,p.z-1.8);group.add(m);reply.push(m);
  }
  const mistMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec2 vUv;uniform float uTime;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
    void main(){vec2 p=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(p,p)),1.8);float n=.5+.5*noise(vUv*vec2(5.,2.)+vec2(uTime*.035,0.));gl_FragColor=vec4(.19,.26,.29,edge*n*.42);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const mists=[];
  for(const [x,z,w,h] of [[-54,47,21,7],[55,52,21,7],[-46,61,18,6],[-47,82,21,7],[47,65,20,6],[47,85,20,7],[-27,93,23,7],[-7,95,25,8],[15,96,24,8],[32,94,22,7],[-21,-17,22,6],[12,-17,24,6],[-50,15,22,6],[31,24,16,5]]){
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mistMaterial);m.position.set(x,1.6,z);m.renderOrder=1;group.add(m);mists.push(m);
  }
  const fireflyPositions=new Float32Array(60*3),fireflyGeo=new T.BufferGeometry();fireflyGeo.setAttribute('position',new T.BufferAttribute(fireflyPositions,3));
  const fireflyMaterial=new T.PointsMaterial({color:0xefcc94,size:.085,transparent:true,opacity:.55,depthWrite:false});
  fireflyMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=1.-smoothstep(.08,.5,length(gl_PointCoord-vec2(.5)));');};
  fireflyMaterial.customProgramCacheKey=()=> 'soft-boundary-fireflies';
  const fireflies=new T.Points(fireflyGeo,fireflyMaterial);fireflies.frustumCulled=false;group.add(fireflies);
  group.updateMatrixWorld(true);const pools=new Map();staticRoot.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!pools.has(key))pools.set(key,{geometry:o.geometry,material:o.material,matrices:[]});pools.get(key).matrices.push(o.matrixWorld.clone());});
  for(const p of pools.values()){const m=new T.InstancedMesh(p.geometry,p.material,p.matrices.length);p.matrices.forEach((a,i)=>m.setMatrixAt(i,a));m.computeBoundingSphere();m.receiveShadow=true;group.add(m);}staticRoot.removeFromParent();
  let last=0,echoAt=-100;
  return {group,touch(id,time){if(id==='river_bell')echoAt=time;},update(time,city){
    const dt=Math.min(.06,Math.max(0,time-last));last=time;const e=city?.memoryGame?.exploration,chorus=e?.joined?.some(j=>j.endsWith(':music')),local=e?.localReadAt!==undefined;
    mistMaterial.uniforms.uTime.value=time;for(const m of mists)m.lookAt(world.camera.position.x,m.position.y,world.camera.position.z);
    for(const {ghost,light,edge,i} of ghostHouses){const restored=!!e?.borderShared&&i===2;ghost.opacity=T.MathUtils.damp(ghost.opacity,restored?.82:.13,1,dt);light.opacity=T.MathUtils.damp(light.opacity,restored?.95:.06,1,dt);edge.material.opacity=restored?.12:.24;}
    for(const {m,i} of lamps){const energy=e?.windTuned?.5:.12,phase=time*(chorus?1.6:.65)+i*(1.35-(e?.clockOffset||0)*.22);m.material.opacity=energy+(e?.waterOpen?.15:0)+Math.sin(phase)*.12;m.scale.setScalar(chorus?1.2:1);}
    const echoAge=time-echoAt-.65,echo=e?.shoreRead&&echoAge>=0&&echoAge<.55;
    reply.forEach((m,i)=>{m.material.opacity=echo?(Math.floor(echoAge/.08)%2?.2:1):e?.shoreReplyAt!==undefined?.58+Math.sin(time*1.8+i*1.4)*.32:i===0?.18:0;m.position.y=1.35+i*.4+Math.sin(time*.8+i)*.13;});
    for(let i=0;i<60;i++){const a=i*2.399+time*.055,x=local?-7.5+Math.cos(a)*(2+i%5):Math.cos(a)*2+shore.x,z=local?70.9+Math.sin(a)*(2+i%5):shore.z+Math.sin(a)*1.8;fireflyPositions.set([x,.6+(i%8)*.13+Math.sin(time+i)*.12,z],i*3);}fireflyGeo.attributes.position.needsUpdate=true;fireflies.material.opacity=local?.65:.16;
  }};
}
