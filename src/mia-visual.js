import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import * as T from '/node_modules/three/build/three.module.js';
export const expressions=['neutral','happy','surprised','confused','suspicious','thinking','glitch'];
export function upgradeMia(n){
 const arms=[],feet=[];
 for(const mesh of [...n.body.children]){
  if(!mesh.isMesh)continue;
  if(Math.abs(mesh.position.x)>.4&&Math.abs(mesh.position.y-.8)<.01){const joint=new T.Group();joint.position.set(mesh.position.x,.98,0);n.body.add(joint);joint.add(mesh);mesh.position.set(0,-.18,0);arms.push(joint);}
  else if(Math.abs(mesh.position.y-.22)<.01){const joint=new T.Group();joint.position.set(mesh.position.x,.32,0);n.body.add(joint);joint.add(mesh);mesh.position.set(0,-.1,.075);feet.push(joint);}
  if(mesh.position.y===1.3&&mesh.position.z>.4)mesh.visible=false;
  if(mesh.material&&mesh.position.z<.4){const old=mesh.material;mesh.material=new T.MeshPhysicalMaterial({color:old.color,roughness:.38,clearcoat:.35,clearcoatRoughness:.45});}
 }
 n.eyes.forEach(e=>e.visible=false);
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=224;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const screen=new T.Mesh(new T.PlaneGeometry(.68,.4),new T.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));screen.position.set(0,1.435,.454);n.body.add(screen);
 let last='',lastPos=n.root.position.clone(),waveUntil=0,head=null,imported=null;
 const fallback=[...n.body.children].filter(o=>o!==n.workProp);
 const ready=new GLTFLoader().loadAsync('/assets/characters/mia.glb').then(g=>{
  const find=name=>{let found;g.scene.traverse(o=>{if(o.name.replace(/[._]/g,'')===name)found=o;});return found;};
  const face=find('FaceScreen'),newArms=[find('ArmL'),find('ArmR')],newFeet=[find('FootL'),find('FootR')];
  if(!face||newArms.some(o=>!o)||newFeet.some(o=>!o))throw new Error('Mia model is missing animation pivots');
  g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  texture.flipY=false;texture.needsUpdate=true;
  face.material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  head=find('Head');imported=g.scene;imported.name='Mia original Blender model';
  n.body.add(imported);fallback.forEach(o=>o.visible=false);arms.splice(0,arms.length,...newArms);feet.splice(0,feet.length,...newFeet);
  return true;
 }).catch(error=>{console.warn('Original Mia unavailable; keeping existing model.',error.message);return false;});
 function paint(expression,blink){
  ctx.clearRect(0,0,384,224);ctx.fillStyle='#112a35';ctx.beginPath();ctx.roundRect(0,0,384,224,55);ctx.fill();ctx.fillStyle='#b8f4e9';ctx.strokeStyle='#b8f4e9';ctx.lineWidth=10;ctx.lineCap='round';
  for(const x of [120,264]){
   if(blink||expression==='happy'){ctx.beginPath();ctx.moveTo(x-20,100);ctx.quadraticCurveTo(x,expression==='happy'?65:100,x+20,100);ctx.stroke();}
   else {ctx.save();if(expression==='suspicious'){ctx.translate(x,98);ctx.rotate(x<190?-.2:.2);ctx.fillRect(-20,-5,40,15);}else{ctx.beginPath();ctx.ellipse(x,95,expression==='surprised'?21:17,expression==='surprised'?29:expression==='thinking'?15:24,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }
  if(expression==='surprised'){ctx.beginPath();ctx.ellipse(192,158,13,18,0,0,Math.PI*2);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(172,156);ctx.quadraticCurveTo(192,expression==='happy'?176:expression==='confused'?141:162,212,156);ctx.stroke();}
  if(expression==='thinking'){ctx.fillStyle='#e8c28c';ctx.font='bold 42px sans-serif';ctx.fillText('···',174,46);}
  if(expression==='confused'){ctx.font='bold 45px sans-serif';ctx.fillText('?',318,58);}
  if(expression==='glitch'){ctx.fillStyle='#f1ad9c';ctx.fillRect(38,91,110,10);ctx.fillStyle='#8fffe5';ctx.fillRect(225,144,90,7);}
  ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(28,15,300,22,12);ctx.fill();ctx.globalAlpha=1;texture.needsUpdate=true;
 }
 return {ready,get model(){return imported;},wave(time){waveUntil=time+2.1;},update(time,expression='neutral',talking=false){
  if(!expressions.includes(expression))expression='neutral';const blink=time%4.4<.13,key=expression+blink;if(key!==last){paint(expression,blink);last=key;}
  const moving=lastPos.distanceToSquared(n.root.position)>.000001;lastPos.copy(n.root.position);
  arms.forEach((a,i)=>{a.rotation.x=moving?Math.sin(time*8+i*Math.PI)*.38:talking?Math.sin(time*3+i)*.12:Math.sin(time*1.4+i)*.025;a.rotation.z=time<waveUntil&&i===1?2.05+Math.sin(time*9)*.13:(i===0?.08:-.08);});
  feet.forEach((f,i)=>f.rotation.x=moving?Math.sin(time*8+i*Math.PI)*.25:0);
  if(head){head.rotation.z=expression==='confused'?.12:expression==='thinking'?-.07:0;head.rotation.x=talking?Math.sin(time*2.5)*.018:0;}
 }};
}
