import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import * as T from '/node_modules/three/build/three.module.js';
export const expressions=['neutral','happy','surprised','confused','suspicious','thinking','glitch','sync'];
const profiles={player:{ink:'#d8ebc7',phase:.6,gesture:1.7},mia:{ink:'#b8f4e9',phase:0,gesture:2.05},ren:{ink:'#c2e1f3',phase:1.1,gesture:.55},tomo:{ink:'#9eeeff',phase:2.2,gesture:2.15},shell:{ink:'#d5edb2',phase:3.3,gesture:1.15}};
export function createFaceTexture(id){
 const profile=profiles[id];if(!profile)throw new Error('Unknown resident');
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=224;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 function paint(expression='neutral',blink=false){
  ctx.clearRect(0,0,384,224);ctx.fillStyle='#112a35';ctx.beginPath();ctx.roundRect(0,0,384,224,55);ctx.fill();ctx.fillStyle=profile.ink;ctx.strokeStyle=profile.ink;ctx.lineWidth=10;ctx.lineCap='round';
  for(const x of [120,264]){
   if(blink||expression==='happy'||expression==='sync'){ctx.beginPath();ctx.moveTo(x-20,100);ctx.quadraticCurveTo(x,expression==='happy'?65:100,x+20,100);ctx.stroke();}
   else if(expression==='suspicious'){ctx.save();ctx.translate(x,98);ctx.rotate(x<190?-.2:.2);ctx.fillRect(-20,-5,40,15);ctx.restore();}
   else{ctx.beginPath();ctx.ellipse(x,95,expression==='surprised'?21:id==='ren'?14:17,expression==='surprised'?29:expression==='thinking'||id==='shell'?15:id==='ren'?20:24,0,0,Math.PI*2);ctx.fill();}
  }
  if(expression==='surprised'){ctx.beginPath();ctx.ellipse(192,158,13,18,0,0,Math.PI*2);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(172,156);ctx.quadraticCurveTo(192,expression==='happy'?176:expression==='confused'?141:id==='ren'?156:162,212,156);ctx.stroke();}
  if(expression==='thinking'){ctx.fillStyle='#e8c28c';ctx.font='bold 42px sans-serif';ctx.fillText('···',174,46);}
  if(expression==='confused'){ctx.font='bold 45px sans-serif';ctx.fillText('?',318,58);}
  if(expression==='glitch'){ctx.fillStyle='#f1ad9c';ctx.fillRect(38,91,110,10);ctx.fillStyle='#8fffe5';ctx.fillRect(225,144,90,7);}
  ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(28,15,300,22,12);ctx.fill();ctx.globalAlpha=1;texture.needsUpdate=true;
 }
 paint();return {texture,paint};
}
export function upgradeResident(n){
 const profile=profiles[n.id];if(!profile)throw new Error('Unknown resident');
 const arms=[],feet=[];
 // Keep the procedural body available while the original asset loads or if it fails.
 for(const mesh of [...n.body.children]){
  if(!mesh.isMesh)continue;
  if(Math.abs(mesh.position.x)>.4&&Math.abs(mesh.position.y-.8)<.01){const joint=new T.Group();joint.position.set(mesh.position.x,.98,0);n.body.add(joint);joint.add(mesh);mesh.position.set(0,-.18,0);arms.push(joint);}
  else if(Math.abs(mesh.position.y-.22)<.01){const joint=new T.Group();joint.position.set(mesh.position.x,.32,0);n.body.add(joint);joint.add(mesh);mesh.position.set(0,-.1,.075);feet.push(joint);}
  if(mesh.position.y===1.3&&mesh.position.z>.4)mesh.visible=false;
  if(mesh.material&&mesh.position.z<.4){const old=mesh.material;mesh.material=new T.MeshPhysicalMaterial({color:old.color,roughness:.38,clearcoat:.35,clearcoatRoughness:.45});}
 }
 n.eyes.forEach(e=>e.visible=false);
 const {texture,paint}=createFaceTexture(n.id);
 const screen=new T.Mesh(new T.PlaneGeometry(.68,.4),new T.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));screen.position.set(0,1.435,.454);n.body.add(screen);
 let last='',lastPos=n.root.position.clone(),waveUntil=0,head=null,tail=null,imported=null;
 const fallback=[...n.body.children].filter(o=>o!==n.workProp);
 const ready=new GLTFLoader().loadAsync(`/assets/characters/${n.id}.glb`).then(g=>{
  const find=name=>{let found;g.scene.traverse(o=>{if(o.name.replace(/[._]/g,'')===name)found=o;});return found;};
  const face=find('FaceScreen'),newArms=[find('ArmL'),find('ArmR')],newFeet=[find('FootL'),find('FootR')];head=find('Head');tail=find('Tail');
  if(!face||!head||newArms.some(o=>!o)||newFeet.some(o=>!o))throw new Error('Resident model is missing animation pivots');
  g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  texture.flipY=false;texture.needsUpdate=true;face.material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  imported=g.scene;imported.name=n.name+' original Blender model';
  n.body.add(imported);fallback.forEach(o=>o.visible=false);arms.splice(0,arms.length,...newArms);feet.splice(0,feet.length,...newFeet);
  return true;
 }).catch(error=>{console.warn(`${n.name} original model unavailable; keeping existing model.`,error.message);return false;});
 return {ready,get model(){return imported;},wave(time){waveUntil=Math.max(waveUntil,time+1.65);},update(time,expression='neutral',talking=false,working=false,frozen=false,movement='auto'){
  if(frozen){if(last!=='sync'){paint('sync');last='sync';}lastPos.copy(n.root.position);return;}
  if(!expressions.includes(expression))expression='neutral';const blink=(time+profile.phase)%4.4<.13,key=expression+blink;if(key!==last){paint(expression,blink);last=key;}
  const moving=movement==='still'?false:lastPos.distanceToSquared(n.root.position)>.000004;lastPos.copy(n.root.position);
  const pace=n.id==='shell'?.7:n.id==='tomo'?1.15:1;
  arms.forEach((a,i)=>{a.rotation.x=working?-.65:moving?Math.sin(time*6.2+i*Math.PI)*.3*pace:talking?Math.sin(time*2.5+i)*.1*pace:Math.sin(time*1.25+i)*.02;a.rotation.z=!working&&time<waveUntil&&i===1?profile.gesture+Math.sin(time*5.2)*.075*pace:(i===0?.08:-.08);});
  feet.forEach((f,i)=>f.rotation.x=moving?Math.sin(time*6.2+i*Math.PI)*.2*pace:0);
  if(head){head.rotation.z=expression==='confused'?.12:expression==='thinking'?-.07:0;head.rotation.x=working?.05:talking?Math.sin(time*2.5)*.018*pace:0;}
  if(tail)tail.rotation.y=Math.sin(time*2.2)*.13;
 }};
}
