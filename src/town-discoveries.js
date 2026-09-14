import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {discoveries,discoveryById} from './discovery-rules.js';
import {memoryPlots,townHomes,canalRows,canalBridges} from './town-layout.js';
import {createRiverMaterial} from './river-material.js';
import {lanternJourney} from './boundary-layout.js';

// Shared ceramic, copper and timber pieces; static details are instanced by material.
export function createTownDiscoveries(world){
 const group=new T.Group(),staticRoot=new T.Group();group.name='A town to touch · canals, shopfronts and small rituals';group.add(staticRoot);world.scene.add(group);
 const materials=new Map(),geos={box:new RoundedBoxGeometry(1,1,1,2,.055),sphere:new T.SphereGeometry(1,12,8),cylinder:new T.CylinderGeometry(1,1,1,16)},turning=[],bells=[],windows=[],ripples=[],jets=[],boats=[],stems=[];
 const mat=(color,glow=0)=>{const key=color+':'+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.62,metalness:.08,emissive:color,emissiveIntensity:glow}));return materials.get(key);};
 function part(shape,color,x,y,z,w,h,d,parent=staticRoot,glow=0){const o=new T.Mesh(geos[shape],mat(color,glow));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const box=(color,x,y,z,w,h,d,parent=staticRoot,glow=0)=>part('box',color,x,y,z,w,h,d,parent,glow);
 const sphere=(color,x,y,z,r,parent=staticRoot,glow=0)=>part('sphere',color,x,y,z,r,r,r,parent,glow);
 const cylinder=(color,x,y,z,r,h,parent=staticRoot)=>part('cylinder',color,x,y,z,r,h,r,parent);
 const obstacle=(x,z,hw,hd)=>world.colliders.push({x,z,hw,hd});
 function ring(color,x,y,z,r,parent=group){const o=new T.Mesh(new T.TorusGeometry(r,.032,7,40),mat(color,.3));o.position.set(x,y,z);parent.add(o);return o;}
 function plant(x,z,scale=1,color=0x85ab91){
  cylinder(0xc9b19a,x,.3*scale,z,.33*scale,.45*scale);cylinder(0x4c6861,x,.52*scale,z,.28*scale,.025);
  for(let i=0;i<4;i++){const a=i*2.4;sphere(color,x+Math.cos(a)*.18*scale,(.76+i*.09)*scale,z+Math.sin(a)*.18*scale,.25*scale);}
  obstacle(x,z,.31*scale,.31*scale);
 }
 function bench(x,z,rotation=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;staticRoot.add(g);box(0xba9276,0,.57,0,1.6,.12,.55,g);for(const y of [.9,1.13])box(0xc2a187,0,y,-.22,1.6,.17,.07,g);for(const x of [-.62,.62])box(0x567673,x,.31,0,.1,.5,.48,g);obstacle(x,z,Math.abs(Math.cos(rotation))*.8+Math.abs(Math.sin(rotation))*.28,Math.abs(Math.cos(rotation))*.28+Math.abs(Math.sin(rotation))*.8);}
 function chime(id,x,z,width=1.5){
  for(const side of [-1,1]){box(0x7b9486,x+side*width*.5,1.48,z,.08,2.9,.08);obstacle(x+side*width*.5,z,.06,.06);}
  box(0xe0c59d,x,2.95,z,width+.16,.12,.16);
  for(let i=0;i<5;i++){const b=new T.Group();b.position.set(x+(i-2)*width/6,2.85,z);group.add(b);box(0x688c86,0,-.2,0,.012,.4,.012,b);part('cylinder',[0xe2b79e,0xb6cfc1,0xe6d6af][i%3],0,-.58-i%3*.06,0,.05,.45+i%3*.12,.05,b);bells.push({id,b,i});}
 }
 function wheel(id,x,y,z,r=.43){const g=new T.Group();g.position.set(x,y,z);group.add(g);ring(0xd8b982,0,0,0,r,g);sphere(0x86aaa0,0,0,0,.12,g);for(let i=0;i<6;i++){const b=box(0xd8b982,0,0,0,r*1.8,.06,.065,g);b.rotation.z=i*Math.PI/3;}turning.push({id,g,speed:.18});return g;}
 function label(title,subtitle,x,y,z,rotation=0,w=2.6){const c=document.createElement('canvas');c.width=640;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#2d5053';ctx.fillRect(0,0,640,160);ctx.strokeStyle='#cebd91';ctx.lineWidth=3;ctx.strokeRect(9,9,622,142);ctx.textAlign='center';ctx.fillStyle='#f1e0bd';ctx.font='500 38px Georgia';ctx.fillText(title,320,69);ctx.font='17px sans-serif';ctx.fillText(subtitle,320,113);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map}));o.position.set(x,y,z);o.rotation.y=rotation;staticRoot.add(o);}
 function ripple(x,z,r=1){const o=new T.Mesh(new T.RingGeometry(.94,1,48),new T.MeshBasicMaterial({color:0xb8dfd6,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(x,-.20,z);o.scale.setScalar(r);group.add(o);ripples.push(o);return o;}
 // Cut into the same land and road mesh; bridges are the only crossings.
 const river=createRiverMaterial();
 for(const z of canalRows){
  const water=new T.Mesh(new T.PlaneGeometry(82,3.05,164,8),river.material);water.rotation.x=-Math.PI/2;water.position.set(0,-.24,z);group.add(water);
  for(const side of [-1,1])box(0x829d95,0,-.09,z+side*1.65,82,.55,.18);
  for(const x of canalBridges){
   for(let i=0;i<12;i++)box(i%3?0xb4a88c:0x9fa393,x,.157,z-1.65+i*.3,3.3,.055,.27);
   for(const side of [-1,1]){box(0xd3c4a4,x+side*1.58,.95,z,.10,.1,3.5);for(const dz of [-1.65,0,1.65]){box(0x708c84,x+side*1.58,.52,z+dz,.09,.95,.09);obstacle(x+side*1.58,z+dz,.045,.045);}}
  }
  // Lilies, reeds and stone edges soften the computing grid.
  for(let i=0;i<26;i++){const x=-39+i*3.1;if(canalBridges.some(b=>Math.abs(x-b)<2))continue;cylinder(0x749d85,x,-.18,z+(i%2?.5:-.45),.20,.015);sphere(i%3?0xe3d0a5:0xd6b0b8,x,-.13,z+(i%2?.5:-.45),.055);}
  for(let i=0;i<14;i++)ripple(-38+i*5.8,z,.45);
 }
 // Eighteen distinct street-level entrances: awnings, windows, flower boxes and goods.
 const shopNames=['BREAD & BITS','LEAF & LOOP','OLD SOUNDS','NIGHT BOOKS','RAIN & THREAD','WELCOME HOME'];
 for(const [i,p] of memoryPlots.entries()){
  const g=new T.Group();g.position.set(p.x,.13,p.z);g.rotation.y=p.rotation;staticRoot.add(g);const color=[0xb9958d,0x91ae99,0xb3a6bb,0x94b4bb,0xd0b28a,0x9fb7a6][i%6];
  box(0xe1d6bd,0,1.55,-1.82,3.5,2.8,.15,g);box(0x34585c,.65,1.17,-1.94,.85,1.95,.1,g);box(0xb5d5c1,.65,1.3,-2,.62,1.18,.02,g,.2);sphere(0xd4b875,.93,.99,-2.04,.047,g);
  box(0x77968a,1.26,1.3,-1.97,.19,.29,.06,g);sphere(0xe2c590,1.26,1.3,-2.03,.055,g,.15);
  box(0x59726b,-.7,1.25,-1.96,1.23,1.2,.12,g);box(0xe6ce98,-.7,1.25,-2.03,1.09,1.07,.025,g,.26);
  for(const dx of [-1.1,-.7,-.3])box(0x72897b,dx,1.25,-2.07,.035,1.2,.035,g);
  box(color,0,2.65,-2.14,3.6,.14,.82,g);for(let k=0;k<8;k++)box(k%2?color:0xe6dcc2,-1.57+k*.45,2.54,-2.49,.42,.18,.12,g);
  box(0xad977b,-.7,.57,-2.12,1.25,.3,.30,g);for(let k=0;k<5;k++){sphere(0x85a48d,-1.15+k*.22,.81,-2.13,.17,g);sphere(k%2?0xd6afb4:0xe9cf91,-1.15+k*.22,.96,-2.13,.055,g);}
  for(let k=0;k<3;k++)box([0xccad8c,0x8dadb1,0xc3b4ce][(i+k)%3],-.98+k*.29,1.03,-2.075,.16,.2+k%2*.13,.1,g);
  const dx=-Math.sin(p.rotation)*2.53,dz=-Math.cos(p.rotation)*2.53;label(shopNames[i%6],'STAY A LITTLE',p.x+dx,3.03,p.z+dz,p.rotation+Math.PI,2.7);
  const pane=new T.Mesh(new T.PlaneGeometry(.63,1.1),new T.MeshBasicMaterial({color:0xffd997,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));pane.position.set(p.x+Math.cos(p.rotation)*.65-Math.sin(p.rotation)*2.06,1.44,p.z-Math.sin(p.rotation)*.65-Math.cos(p.rotation)*2.06);pane.rotation.y=p.rotation;group.add(pane);windows.push({id:'door_'+String.fromCharCode(97+i),pane});
  if(i%3===0)plant(p.x+2.85,p.z-.2,.9);
 }
 // Each side street has places to stay, not only high-rise facades.
 for(const [x,z,r] of [[-17,52,0],[17,52,0],[-27,71.1,Math.PI],[27,71.1,Math.PI],[-5.3,70,Math.PI/2],[7.7,85,Math.PI]])bench(x,z,r);
 for(const [x,z] of [[-17,53.6],[17,53.6],[-28.6,71.1],[28.6,71.1],[7.5,86.5],[-5.3,68.5]])plant(x,z,.9);
 chime('chimes',4.5,5.2,1.5);chime('wind',-35.8,15.2,2);
 cylinder(0x829889,-3.5,.51,-.6,.12,.83);cylinder(0xcab58f,-3.5,.94,-.6,.31,.09);obstacle(-3.5,-.6,.17,.17);
 const cafeBell=new T.Group();cafeBell.position.set(-3.5,1.15,-.6);group.add(cafeBell);sphere(0xdac394,0,0,0,.16,cafeBell);cylinder(0xdac394,0,-.06,0,.19,.05,cafeBell);sphere(0x8ba79a,0,.16,0,.045,cafeBell);bells.push({id:'terrace',b:cafeBell,i:0});
 box(0x92b0a1,-32.9,.72,13,.5,1.15,.5);wheel('wind',-32.9,1.3,13.28);obstacle(-32.9,13,.25,.25);
 wheel('pump',-17.0,1.2,34.4);box(0x86a6a0,-17,.65,34.45,.32,1.1,.22);obstacle(-17,34.45,.17,.12);
 // A real rotating water wheel beside the existing intake house.
 const waterwheel=wheel('pump',-20.25,1.02,36.8,1.26);turning.at(-1).speed=.4;
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const b=box(0xb89b7a,Math.cos(a)*1.24,Math.sin(a)*1.24,0,.34,.12,.74,waterwheel);b.rotation.z=a;}
 for(const z of [36.15,37.45])box(0x799588,-20.25,.46,z,.16,1.45,.16);
 box(0x799588,-20.25,1.02,36.8,.16,.16,1.6);obstacle(-20.25,36.8,1.3,.9);
 box(0xc8b89a,-20.4,.73,32.9,.48,.1,.65);box(0x789285,-20.4,.4,32.9,.12,.65,.3);obstacle(-20.4,32.9,.24,.28);
 const bellPoint=discoveryById.river_bell;chime('river_bell',bellPoint.x,bellPoint.z+.85,1.15);
 // Reeds, stones and small lights along the actual river banks.
 for(let i=0;i<50;i++){const x=-43+i*1.7,z=46.5+Math.sin(i*1.6)*.23;if(Math.abs(x)<4.4)continue;
  const stone=sphere(i%2?0x879891:0xa8ada0,x,-.15,z,.3);stone.scale.set(.65,.26,.38);
  for(let j=0;j<3;j++){const stem=box(0x7e9e82,x+j*.1,.08+j*.06,z,.025,.62+j*.12,.025);stem.rotation.z=Math.sin(i+j)*.12;}
 }
 // Fountain bowl and dancing water; its rim has a matching footprint.
 const fp=discoveryById.fountain,fx=fp.x,fz=fp.z-1.8;
 cylinder(0xc7c1a6,fx,.31,fz,1.22,.45);cylinder(0x608e95,fx,.55,fz,1.08,.035);obstacle(fx,fz,1.23,1.23);
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7,x=fx+Math.cos(a)*.65,z=fz+Math.sin(a)*.65;const jet=cylinder(0x9dd2cc,x,1,z,.025,.8,group);jet.material=mat(0xaed8d0,.45);jets.push({jet,i});}
 ripple(fx,fz,.8).position.y=.59;
 // Tone tiles invite a player or a visiting resident to complete a chord.
 for(let i=0;i<5;i++)box([0x94c3c6,0xb8d4b6,0xe2c798,0xd3b7cc,0xb3c7dd][i],6.4+i*.55,.14,51.8,.48,.045,.9);
 chime('music',7.5,50.7,2.4);
 const cp=discoveryById.courier;box(0xadc5b4,cp.x-1.6,.85,cp.z,1.6,1.5,1);box(0x365761,cp.x-1.6,1.05,cp.z+.51,1.14,.65,.03);obstacle(cp.x-1.6,cp.z,.8,.5);label('TO TOMORROW','MEMORY POST',cp.x-1.6,1.91,cp.z+.53,0,1.8);
 for(let i=0;i<4;i++)sphere(0xe9c994,cp.x-2+i*.27,1.04,cp.z+.54,.05,staticRoot,.45);
 // The unsynchronized garden grows around a handwritten memory, never around a menu.
 const garden=new T.Group();garden.position.set(-7.5,0,70.9);group.add(garden);
 cylinder(0xb39f80,0,.49,0,.47,.73,garden);box(0xe4d6b6,0,.93,0,.65,.11,.52,garden);obstacle(-7.5,70.9,.47,.47);
 const seedColors=[0xe8c392,0xb7d4b5,0xcbbadc];
 for(let i=0;i<14;i++){const a=i*2.4,r=.9+(i%3)*.19,g=new T.Group();g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);garden.add(g);box(0x71937a,0,.31,0,.025,.56,.025,g);for(let k=0;k<5;k++)sphere(seedColors[i%3],Math.cos(k*1.257)*.085,.63,Math.sin(k*1.257)*.085,.075,g);stems.push(g);}
 const clock=wheel('clock',26.45,2.6,65.7,.66);turning.at(-1).speed=.025;box(0x77918a,26.45,1.3,65.7,.21,2.6,.21);obstacle(26.45,65.7,.14,.14);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;sphere(0xf1deb3,Math.sin(a)*.52,Math.cos(a)*.52,.02,.035,clock,.3);}
 const tp=discoveryById.telescope,scope=new T.Group();scope.position.set(tp.x,1.15,tp.z+.7);group.add(scope);
 const tube=cylinder(0xb7c5b2,0,.26,0,.16,1.1,scope);tube.rotation.x=.98;ring(0xe1cba0,0,.53,-.45,.17,scope).rotation.x=.6;
 for(const dx of [-.4,.4]){const foot=box(0x7b8e84,tp.x+dx, .55,tp.z+.85,.065,1.05,.065);foot.rotation.z=dx*.7;}obstacle(tp.x,tp.z+.85,.45,.4);turning.push({id:'telescope',g:scope,speed:0});
 box(0xa6b8a7,0,.63,77.45,1.65,1,.7);box(0x365c63,0,1.2,77.45,1.3,.11,.55);const coreSlot=box(0xa5dbd0,0,1.3,77.45,.62,.045,.22,group,.6);obstacle(0,77.45,.82,.35);
 for(const side of [-1,1]){const g=new T.Group();g.position.set(side*2.6,2.3,78.6);group.add(g);for(let i=0;i<5;i++){const r=ring(0xa2cabc,0,i*.5,0,.3,g);r.rotation.x=Math.PI/2;}turning.push({id:'core',g,speed:.08});}
 // Lantern skiffs run through the canals; a player's launch crosses the main river.
 for(let i=0;i<7;i++){const b=new T.Group();box(0xa69477,0,0,0,.7,.15,.35,b);box(0xe9d1a7,0,.25,0,.2,.4,.2,b,.3);sphere(0xffddaa,0,.28,.13,.055,b,.8);group.add(b);const fadeMaterials=[];if(i===0)b.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=false;fadeMaterials.push(o.material);}});boats.push({b,i,fadeMaterials});}
 // One discreet focus light for all interactions, rather than a forest of labels.
 const focus=new T.Mesh(new T.RingGeometry(.11,.145,24),new T.MeshBasicMaterial({color:0xf3d39b,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide}));focus.renderOrder=3;group.add(focus);focus.visible=false;
 const sparks=new T.InstancedMesh(geos.sphere,new T.MeshBasicMaterial({color:0xe8d7a9,transparent:true,opacity:.7}),20);sparks.frustumCulled=false;group.add(sparks);sparks.visible=false;const dummy=new T.Object3D();
 // Every old outlying house also answers its door, with a visible porch lamp.
 townHomes.forEach((h,i)=>{const lamp=sphere(0xf0cc96,h.x+Math.sin(h.rotation)*2.28,2.1,h.z+Math.cos(h.rotation)*2.28,.13,group,.25);lamp.material=lamp.material.clone();windows.push({id:'home_'+String.fromCharCode(97+i),lamp});});
 group.updateMatrixWorld(true);const pools=new Map();staticRoot.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!pools.has(key))pools.set(key,{geometry:o.geometry,material:o.material,matrices:[]});pools.get(key).matrices.push(o.matrixWorld.clone());});
 for(const p of pools.values()){const mesh=new T.InstancedMesh(p.geometry,p.material,p.matrices.length);p.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}group.remove(staticRoot);
 let last=0,clockTime=0,activeTouch=null,until=0,target=null;
 function touch(id,time){activeTouch=id;until=time+3;}
 return {group,touch,focus(p){target=p;},update(time,city){
  const dt=Math.min(.05,time-last);last=time;river.update(time);const e=city?.memoryGame?.exploration,pulse=time<until;
  clockTime+=dt;focus.visible=!!target&&!!city?.memoryGame?.active;
  if(focus.visible){const p=target.marker||target;focus.position.set(p.x,p.y,p.z);focus.lookAt(world.camera.position);focus.scale.setScalar(1+Math.sin(time*3)*.1);}
  for(const {id,g,speed} of turning){const boost=pulse&&activeTouch===id;g.rotation.z+=dt*(boost&&id!=='telescope'?8:speed)*(id==='pump'?(e?.waterOpen?1:.18):1);if(id==='clock')g.rotation.z+=(e?.clockOffset||0)*dt*.2;}
  for(const {id,b,i} of bells){const playing=pulse&&activeTouch===id||id==='music'&&e?.joined.some(j=>j.endsWith(':music'));b.rotation.z=Math.sin(time*(playing?15:2.5)+i)*(playing?.32:.055);}
  jets.forEach(({jet,i})=>{const h=.35+(pulse&&activeTouch==='fountain'?1.45:.25)*(1+Math.sin(time*4+i)*.5);jet.scale.y=h;jet.position.y=.55+h/2;});
  for(const {id,pane,lamp} of windows){const on=pulse&&activeTouch===id;if(pane)pane.material.opacity=on?.68:e?.borderShared?.19:0;if(lamp)lamp.material.emissiveIntensity=on?1.8:.2;}
  ripples.forEach((r,i)=>{const f=(time*.45+i*.13)%1;r.scale.setScalar(.15+f*1.1);r.material.opacity=(1-f)*.3;});
  stems.forEach((g,i)=>{g.scale.y=T.MathUtils.damp(g.scale.y,e?.localMemory?1.3:.42,2,dt);g.rotation.z=Math.sin(time*1.3+i)*.05;});coreSlot.material.emissiveIntensity=e?.centralMemory?1.2:.3;
  boats.forEach(({b,i,fadeMaterials})=>{if(i===0){const p=lanternJourney(e?.boatAt===undefined?0:city.clock-e.boatAt);b.position.set(p.x,-.08,p.z);b.rotation.y=p.angle;b.visible=p.progress<1;fadeMaterials.forEach(m=>m.opacity=p.opacity);}else{const row=canalRows[i%2];b.position.set(((time*.55+i*12)%76)-38,-.08,row+Math.sin(i)*.35);b.rotation.y=Math.PI/2;}b.position.y+=Math.sin(time*1.8+i)*.035;});
  sparks.visible=pulse;if(pulse){const p=discoveryById[activeTouch],age=3-(until-time);for(let i=0;i<20;i++){const f=(age*.7+i/20)%1;dummy.position.set(p.x+Math.cos(i*2.4)*f*.65,p.y+f*.9,p.z+Math.sin(i*2.4)*f*.65);dummy.scale.setScalar(.025*(1-f));dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);}sparks.instanceMatrix.needsUpdate=true;}
 }};
}
