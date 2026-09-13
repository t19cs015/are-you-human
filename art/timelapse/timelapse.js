import * as T from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createWorld} from '/src/world.js';
import {upgradeCafe} from '/src/cafe-assets.js';
import {upgradeTown} from '/src/town-assets.js';
import {upgradeResident} from '/src/resident-visual.js';
import {createCityWorld} from '/src/city-world.js';
import {createInfrastructureWorld} from '/src/infrastructure-world.js';

// An authored cinematic extension of the town. No gameplay save or live AI state
// is changed by the studio. Every animated property is derived from film time.
const $=id=>document.getElementById(id),W=1920,H=1080,DURATION=24;
const canvas=$('output'),ctx=canvas.getContext('2d',{alpha:false});
const world=createWorld($('source')),{scene,renderer,camera,npcs}=world;
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.toneMappingExposure=1.4;
camera.aspect=W/H;camera.fov=46;camera.far=300;camera.updateProjectionMatrix();
scene.fog.density=.0038;
scene.children.filter(o=>o.isPoints).forEach(o=>o.visible=false);
world.moon.shadow.camera.left=-65;world.moon.shadow.camera.right=65;world.moon.shadow.camera.top=60;world.moon.shadow.camera.bottom=-50;world.moon.shadow.camera.far=180;world.moon.shadow.camera.updateProjectionMatrix();
world.moon.position.set(-35,65,-25);world.moon.target.position.set(-5,0,21);scene.add(world.moon.target);
const visual=new Map(npcs.map(n=>[n.id,upgradeResident(n)])),city=createCityWorld(world),infra=createInfrastructureWorld(world);
const [cafe,town,manifest,house]=await Promise.all([
  upgradeCafe(world),upgradeTown(world,null),fetch('/audio-manifest.json').then(r=>{if(!r.ok)throw new Error('Generate narration first.');return r.json();}),
  new GLTFLoader().loadAsync('/assets/infrastructure/city-house.glb').then(g=>g.scene),city.ready,infra.ready,...[...visual.values()].map(v=>v.ready),
]);
town.setRoom(null);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const ink='#f4e6cc',gold='#e8c995',mint='#b7deda';
const extension=new T.Group();extension.name='Cinematic skyline · A Better Tomorrow';scene.add(extension);
const geo=new T.BoxGeometry(1,1,1),materials=new Map();
function mat(color,emissive=0){const key=color+':'+emissive;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.76,emissive:color,emissiveIntensity:emissive}));return materials.get(key);}
function box(parent,color,x,y,z,w,h,d,emissive=0){const m=new T.Mesh(geo,mat(color,emissive));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// A low garden foundation joins the little islands, below all existing paving.
const land=new T.Mesh(new T.CylinderGeometry(1,1,.5,96),mat(0x657267));land.scale.set(43,1,32);land.position.set(-7,-.68,19);land.receiveShadow=true;extension.add(land);
const rim=new T.Mesh(new T.CylinderGeometry(1,1,.8,96),mat(0x344950));rim.scale.set(43.2,1,32.2);rim.position.set(-7,-1.1,19);extension.add(rim);

// Back-to-front construction waves keep the same camera composition readable.
const plots=[
  [-7.5,33.5,12,4.5],[-5,41,18,5.4],[5,41,17,6.2],[-13,41,16,7.1],[14,41,19,7.8],
  [-21,19,12,8.0],[-12,31,14,8.7],[14,17,13,9.2],[22,22,16,9.6],[16,32,17,10.1],
  [-23,27,14,10.8],[-7,24,16,11.3],[7,24,17,11.8],[25,31,15,12.4],[-28,23,15,12.9],
  [-20,10,14,13.6],[-14,11,16,14.1],[17,8,17,14.7],[-10,-1,14,15.2],[10,-1,17,15.8],
  [0,-7.25,16,16.4],[5.2,-6.1,14,17.1],[-17,3,15,17.6],[-25,4,13,18.2],
].map(([x,z,height,at],i)=>({x,z,height,at,rotation:Math.PI-.4+(i%3)*.15}));
house.updateMatrixWorld(true);const parts=[];house.traverse(o=>{if(o.isMesh)parts.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()});});
const buildings=parts.map(part=>{const m=new T.InstancedMesh(part.geometry,part.material,plots.length);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;extension.add(m);return {...part,mesh:m};});
const dummy=new T.Object3D(),matrix=new T.Matrix4();

// Existing houses and planting recede only at occupied construction footprints.
// Keep snapshots of the instance matrices so seeking the timeline is reversible.
const cleared=[];
for(const group of [city.group,town.group]){
  if(!group)continue;
  group.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){
    const original=new T.Matrix4();o.getMatrixAt(i,original);const p=new T.Vector3().setFromMatrixPosition(original);
    const plot=plots.find(b=>Math.abs(p.x-b.x)<2.35&&Math.abs(p.z-b.z)<2.35);
    if(plot)cleared.push({mesh:o,index:i,original,plot});
  }});
}
// upgradeTown intentionally exposes only its room interface; find that group by
// the name assigned by the existing asset loader when it is not in the interface.
const townGroup=scene.getObjectByName('Little Elsewhere • town upgrade');
if(townGroup&&!town.group)townGroup.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){
  const original=new T.Matrix4();o.getMatrixAt(i,original);const p=new T.Vector3().setFromMatrixPosition(original),plot=plots.find(b=>Math.abs(p.x-b.x)<2.4&&Math.abs(p.z-b.z)<2.4);
  if(plot)cleared.push({mesh:o,index:i,original,plot});
}});

// The data center grows in real architectural storeys, rather than stretching
// one window texture. Rounded game assets remain visible at its feet.
const central=new T.Group();central.position.set(0,3.95,33);extension.add(central);
const storeys=[];
for(let i=0;i<10;i++){
  const floor=new T.Group(),w=i<6?7.2:5.8,d=i<6?5.6:4.5;central.add(floor);
  box(floor,i%3===0?0x809f98:0xc1cabb,0,1,0,w,1.93,d);
  box(floor,0x728e91,0,2,0,w+.3,.16,d+.3);
  for(const side of [-1,1]){
    for(let j=0;j<6;j++)box(floor,0xb7ded9,(j-2.5)*(w/7),1.05,side*(d/2+.026),w/10,1.13,.045,.75);
    for(let j=0;j<4;j++)box(floor,0xb7ded9,side*(w/2+.026),1.05,(j-1.5)*(d/5),.045,1.13,d/7,.75);
  }
  storeys.push({floor,at:4.3+i*1.28,y:i*2.12});
}
const crown=new T.Group();central.add(crown);box(crown,0x91b5ab,0,.23,0,6.3,.42,4.9);
const dome=new T.Mesh(new T.SphereGeometry(1.9,32,16),new T.MeshStandardMaterial({color:0x8bb7bf,emissive:0x8bb7bf,emissiveIntensity:.3,metalness:.25,roughness:.35}));dome.scale.y=.5;dome.position.y=.65;crown.add(dome);
const antenna=box(crown,0xc5cdb3,0,2.1,0,.085,2.4,.085);
const centralGlow=new T.PointLight(0xabcdd4,0,25,2);centralGlow.position.set(0,22,33);extension.add(centralGlow);
const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=256;
const signCtx=signCanvas.getContext('2d');signCtx.fillStyle='#273f4b';signCtx.fillRect(0,0,1024,256);signCtx.fillStyle='#d1e1cf';signCtx.textAlign='center';signCtx.font='30px Georgia';signCtx.fillText('FOR A BETTER TOMORROW',512,93);signCtx.font='18px sans-serif';signCtx.fillText('WE ARE LEARNING TO CARE FOR YOU',512,162);
const signMap=new T.CanvasTexture(signCanvas);signMap.colorSpace=T.SRGBColorSpace;
const centralSign=new T.Mesh(new T.PlaneGeometry(6.9,1.72),new T.MeshBasicMaterial({map:signMap}));centralSign.rotation.y=Math.PI;centralSign.position.set(0,0,-2.84);central.add(centralSign);

// Clearly directional resource streams. All three terminate inside the center.
const flows=[];
function stream(points,color,count,radius,speed){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  const m=new T.InstancedMesh(new T.SphereGeometry(radius,8,6),new T.MeshBasicMaterial({color,transparent:true,opacity:.72}),count);m.frustumCulled=false;extension.add(m);flows.push({curve,m,count,speed});return curve;
}
stream([[-34,5,9],[-25,8,15],[-12,7,24],[0,5,33]],0xf0cd8e,32,.095,.11);
stream([[-18,.4,37],[-17,2.5,32],[-8,4,29],[0,5,33]],0xa5dbe4,30,.085,.15);
const memories=stream([[-3,1.5,1],[0,7,12],[-4,10,24],[0,7,33]],0xe4b9bb,20,.08,.10);
const river=infra.group.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry'&&o.geometry.parameters.width===108);
if(river)river.scale.x=.56;
const seabed=new T.Mesh(new T.PlaneGeometry(60.48,12),mat(0x687779));seabed.rotation.x=-Math.PI/2;seabed.position.set(-7,-.34,41);extension.add(seabed);
const oldUpper=infra.group.getObjectByName('UpperWorks');
const oldTowers=infra.group.children.filter(o=>o.isGroup&&Math.abs(o.position.y-.12)<.001&&o.children.some(c=>c.name==='city-house'));
const warmLights=[];scene.traverse(o=>{if(o.isPointLight&&o!==centralGlow&&o.color.r>o.color.b*1.1)warmLights.push({light:o,intensity:o.intensity});});
const baseState={active:true,repaired:true,booksDelivered:2,readingReady:true,carrying:{ren:'records',tomo:'parts',shell:'records'},tasks:{},infrastructure:{phase:0,modelEnabled:true,windOnline:true,windEnabled:true,pumpOnline:true,pumpEnabled:true,relayOnline:true,allocation:'central',energy:30,energyRate:1.7,waterRate:1.15,voice:'FOR A BETTER TOMORROW'}};

function label(value,x,y,size=26,color=ink,font='Arial'){ctx.font=`${font.startsWith('italic ')?'italic ':''}${size}px ${font.replace(/^italic /,'')}`;ctx.fillStyle=color;ctx.fillText(value,x,y);}
function tracking(value,x,y,size=14,color=gold,gap=2.6){ctx.font=`${size}px Arial`;ctx.fillStyle=color;for(const ch of value){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+gap;}}
function project(point){const p=point.clone().project(camera);return {x:(p.x+1)*W/2,y:(1-p.y)*H/2,z:p.z};}
function sceneAt(t){
  const progress=smooth((t-3.5)/17),sim=t*(1+t*.1);
  baseState.infrastructure.phase=t>=8?1:0;
  cafe.update(sim);town.update(sim);city.update(sim,baseState);infra.update(sim,baseState);
  if(oldUpper)oldUpper.visible=false;oldTowers.forEach(o=>o.visible=false);
  for(const b of buildings){for(let i=0;i<plots.length;i++){
    const p=plots[i],growth=smooth((t-p.at)/2.7);dummy.position.set(p.x,.13,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(1,Math.max(.00001,p.height/8*growth),1);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,b.matrix);b.mesh.setMatrixAt(i,matrix);
  }b.mesh.instanceMatrix.needsUpdate=true;}
  for(const c of cleared){const amount=1-smooth((t-c.plot.at+.45)/1.1);matrix.makeScale(1,Math.max(.00001,amount),1).multiply(c.original);c.mesh.setMatrixAt(c.index,matrix);c.mesh.instanceMatrix.needsUpdate=true;}
  let height=0;for(const s of storeys){const amount=smooth((t-s.at)/1.8);s.floor.visible=amount>.001;s.floor.position.y=s.y*amount;s.floor.scale.y=Math.max(.001,amount);height=Math.max(height,(s.y+2.12)*amount);}
  crown.position.y=height;crown.scale.setScalar(smooth((t-5)/2));centralSign.visible=t>12;centralSign.position.y=height-3.15;centralGlow.intensity=progress*55;
  for(const f of flows){f.m.visible=t>4;f.m.material.opacity=(.25+.55*progress)*smooth((t-4)/2);for(let i=0;i<f.count;i++){
    dummy.position.copy(f.curve.getPointAt((t*f.speed*(1+progress)+i/f.count)%1));dummy.rotation.set(0,0,0);dummy.scale.setScalar(.8+progress*.7);dummy.updateMatrix();f.m.setMatrixAt(i,dummy.matrix);
  }f.m.instanceMatrix.needsUpdate=true;}
  if(river){river.scale.y=1-.66*smooth((t-7)/14);river.position.z=41+2.8*smooth((t-7)/14);}
  warmLights.forEach(({light,intensity})=>light.intensity=intensity*(1-.25*progress));
  scene.background.set('#192e3e').lerp(new T.Color('#0c1c2b'),progress);scene.fog.color.copy(scene.background);
  const routes={mia:[[-4,1],[-2,2],[2,3],[3,8],[-2,5]],ren:[[1,4],[1,19],[-1,25],[0,28],[2,24]],tomo:[[-31,12],[-24,20],[-12,23],[0,25],[0,28]],shell:[[-18,34],[-15,31],[-11,27],[-3,27],[0,28]]};
  for(const n of npcs){const points=routes[n.id],phase=(sim*.038+({mia:.02,ren:.3,tomo:.55,shell:.78}[n.id]))%1,index=phase*points.length,i=Math.floor(index),a=points[i],b=points[(i+1)%points.length],p=index-i;
    n.root.position.set(lerp(a[0],b[0],p),.09,lerp(a[1],b[1],p));n.root.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);n.workProp.visible=n.id!=='mia';visual.get(n.id).update(sim,n.id==='mia'?'happy':'neutral',false,false);
  }
  camera.position.set(47,42,-44);camera.lookAt(-7,7.5,21);camera.fov=46;camera.aspect=W/H;camera.updateProjectionMatrix();
}
function draw(t){
  sceneAt(t);if(renderer.domElement.width!==W||renderer.domElement.height!==H)renderer.setSize(W,H,false);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  const top=ctx.createLinearGradient(0,0,0,240);top.addColorStop(0,'#12232ecc');top.addColorStop(1,'#12232e00');ctx.fillStyle=top;ctx.fillRect(0,0,W,240);
  const bottom=ctx.createLinearGradient(0,790,0,H);bottom.addColorStop(0,'#12232e00');bottom.addColorStop(1,'#12232eef');ctx.fillStyle=bottom;ctx.fillRect(0,790,W,290);
  label('Are You Human?',78,67,28,gold,'italic Georgia');tracking('A BETTER TOMORROW',1495,64,13,'#c7d5c8',2.2);
  const intro=1-smooth((t-3.8)/1.3);ctx.globalAlpha=intro;label('A little town.',77,154,58,ink,'Georgia');label('Learning from you.',80,200,27,'#d0d6cc');ctx.globalAlpha=1;
  // A single familiar sentence returns to the data center, without pretending
  // that this staged film is an actual microphone recording or model decision.
  const words=['“I like it here.”','“We could help.”','“Maybe tomorrow.”'];
  if(t>10.8&&t<18.8){for(let i=0;i<3;i++){
    const u=(t-10.8-i*1.2)/4.4;if(u<0||u>1)continue;const p=project(memories.getPointAt(.12+u*.78));
    ctx.globalAlpha=Math.sin(Math.PI*u)*.95;ctx.font='italic 24px Georgia';const w=ctx.measureText(words[i]).width+34;ctx.fillStyle='#223a49dc';ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-25,w,42,9);ctx.fill();label(words[i],p.x-w/2+17,p.y+3,24,'#e4c9ca','italic Georgia');ctx.globalAlpha=1;
  }}
  const shown=manifest.clips.find(c=>t>=c.start&&t<Math.min(c.end,c.start+c.duration/c.tempo)+.18);
  if(shown){ctx.textAlign='center';label(shown.text,W/2,964,33,ink);ctx.textAlign='left';tracking('CENTRAL',80,922,13,mint,2.7);}
  const day=1+Math.floor(smooth((t-3.5)/18.7)*30);tracking('NIGHT '+String(day).padStart(2,'0'),80,858,15,'#dce1d2',2.8);
  if(t>5){ctx.globalAlpha=smooth((t-5)/1.4);tracking('POWER  ·  WATER  ·  YOUR WORDS',80,888,12,'#b0c9cf',1.7);ctx.globalAlpha=1;}
  const final=smooth((t-21.8)/1.3);ctx.globalAlpha=final;ctx.textAlign='right';label('What would you keep?',1840,870,38,ink,'Georgia');ctx.textAlign='left';ctx.globalAlpha=1;
  tracking('CONCEPT TIMELAPSE · IN-ENGINE VISUALIZATION',80,1031,11,'#9eb4bb',1.3);label('AI-generated voice',1682,1031,13,'#9eb4bb');
  ctx.fillStyle='#cdbf9b55';ctx.fillRect(80,999,1760,2);ctx.fillStyle=gold;ctx.fillRect(80,999,1760*t/DURATION,2);
  // No jump scare: hold the changed town in view, then a short gentle fade.
  if(t>23.65){ctx.fillStyle=`rgba(16,31,41,${smooth((t-23.65)/.35)*.65})`;ctx.fillRect(0,0,W,H);}
  $('timestamp').textContent='00:'+String(Math.floor(t)).padStart(2,'0')+' / 00:24';$('time').value=t;
}
export {world,visual,sceneAt,canvas,ctx,project,extension,central,manifest,cafe,town,city,infra,plots,buildings};
const standalone=!['arrival','firstperson'].includes(document.body.dataset.film);
let current=0,playing=false,rendering=false,start=0,raf=0;
function stop(){playing=false;cancelAnimationFrame(raf);$('voice').pause();$('play').textContent='Preview with sound';}
function loop(now){if(!playing)return;current=Math.min(DURATION-.001,(now-start)/1000);draw(current);if(current>=DURATION-.01){stop();return;}raf=requestAnimationFrame(loop);}
if(standalone){
$('play').onclick=async()=>{if(playing){stop();return;}if(current>23.8)current=0;playing=true;start=performance.now()-current*1000;$('play').textContent='Pause';$('voice').currentTime=current;await $('voice').play();raf=requestAnimationFrame(loop);};
$('time').oninput=()=>{if(rendering)return;stop();current=Number($('time').value);draw(current);};
$('render').onclick=async()=>{
  if(rendering)return;stop();rendering=true;for(const id of ['render','play','time'])$(id).disabled=true;
  try{
    let r=await fetch('/render/start',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);
    for(let frame=0;frame<720;frame++){
      draw(frame/30);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      r=await fetch('/render/frame?index='+frame,{method:'POST',headers:{'Content-Type':'image/png'},body:png});if(!r.ok)throw new Error((await r.json()).error);
      $('status').textContent=`Rendering ${Math.round((frame+1)/7.2)}% · ${frame+1} / 720`;
    }
    r=await fetch('/render/finish',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);$('status').textContent='Picture complete · 720 frames / 24 seconds';
  }catch(error){$('status').textContent='Render failed: '+error.message;}finally{rendering=false;for(const id of ['render','play','time'])$(id).disabled=false;}
};
draw(0);$('play').disabled=$('render').disabled=false;$('status').textContent='Town ready · seek to compare before and after';
}
