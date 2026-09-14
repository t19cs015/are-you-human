import * as T from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {memoryPicture} from './memory-pictures.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function createPlayerVisual(world){
  const root=new T.Group();root.name='Player · a body that remembers';world.scene.add(root);world.scene.add(world.camera);
  const hand=new T.Group();hand.name='Your hand holding a memory';world.camera.add(hand);hand.position.set(.37,-.39,-.84);
  const enamel=new T.MeshStandardMaterial({color:0xe8ddc4,roughness:.46}),sage=new T.MeshStandardMaterial({color:0x85a798,roughness:.5});
  const palm=new T.Mesh(new T.SphereGeometry(1,20,12),enamel);palm.scale.set(.12,.075,.14);palm.position.set(.0,-.08,.035);hand.add(palm);
  const thumb=new T.Mesh(new T.SphereGeometry(1,16,10),enamel);thumb.scale.set(.048,.047,.074);thumb.position.set(-.095,-.035,.06);thumb.rotation.z=-.4;hand.add(thumb);
  const wrist=new T.Mesh(new T.CylinderGeometry(.062,.075,.32,20),sage);wrist.position.set(.025,-.17,.10);wrist.rotation.x=-.55;wrist.rotation.z=.1;hand.add(wrist);
  const blockMaterial=new T.MeshPhysicalMaterial({color:0xf0cc91,roughness:.35,metalness:.12,clearcoat:.35,emissive:0xf0cc91,emissiveIntensity:.12});
  const block=new T.Mesh(new RoundedBoxGeometry(.18,.22,.075,3,.022),blockMaterial);block.position.set(0,.045,-.018);block.rotation.y=-.22;hand.add(block);
  const faceCanvas=document.createElement('canvas');faceCanvas.width=256;faceCanvas.height=320;const ctx=faceCanvas.getContext('2d'),texture=new T.CanvasTexture(faceCanvas);texture.colorSpace=T.SRGBColorSpace;
  const picture=new T.Mesh(new T.PlaneGeometry(.15,.18),new T.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));picture.position.set(0,.006,.041);block.add(picture);
  for(const x of [-.05,0,.05]){const contact=new T.Mesh(new T.BoxGeometry(.021,.025,.008),new T.MeshStandardMaterial({color:0xdab777,metalness:.5,roughness:.4}));contact.position.set(x,-.112,0);block.add(contact);}
  let model=null,head=null,hatch=null,feet=[],arms=[],lastColor='',last=0,opening=0;
  const ready=new GLTFLoader().loadAsync('/assets/characters/player.glb').then(g=>{
    model=g.scene;model.traverse(o=>{const name=o.name.replace(/[._]/g,'');if(name==='Head')head=o;if(name==='MemoryHatch')hatch=o;if(name==='ArmL'||name==='ArmR')arms.push(o);if(name==='FootL'||name==='FootR')feet.push(o);if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.add(model);return true;
  }).catch(error=>{console.warn('Player model unavailable:',error.message);return false;});
  return {ready,update(time,{enabled,player,yaw,firstPerson,editing,selected,moving=false,reducedMotion=false}){
    const dt=Math.min(.05,time-last);last=time;root.visible=!!enabled;hand.visible=!!enabled&&firstPerson;
    if(!enabled)return;root.position.set(player.x,.09,player.z);root.rotation.y=yaw+Math.PI;if(head)head.visible=!firstPerson;
    opening=T.MathUtils.damp(opening,editing?1:0,8,dt);if(hatch)hatch.rotation.y=-opening*1.6;
    arms.forEach((arm,i)=>{arm.rotation.x=moving?Math.sin(time*9+i*Math.PI)*.25:0;});feet.forEach((foot,i)=>foot.rotation.x=moving?Math.sin(time*9+i*Math.PI)*.23:0);
    const color=selected?.color||'#9ecbdc',key=(selected?.id||'light')+color;
    if(lastColor!==key){lastColor=key;blockMaterial.color.set(color);blockMaterial.emissive.set(color);ctx.clearRect(0,0,256,320);ctx.fillStyle='#25434a';ctx.beginPath();ctx.roundRect(8,8,240,304,30);ctx.fill();texture.needsUpdate=true;const etched=new Image();etched.onload=()=>{if(lastColor!==key)return;ctx.drawImage(etched,36,42,184,184);ctx.globalAlpha=.55;ctx.fillStyle=color;ctx.fillRect(72,258,112,5);ctx.globalAlpha=1;texture.needsUpdate=true;};etched.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(memoryPicture(selected?.motif).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('currentColor',color));texture.needsUpdate=true;}
    // The hand stays at the edge in ordinary play and comes closer when memories open.
    hand.position.set(.37-opening*.65,-.58+opening*.36,-.84-opening*.08);hand.rotation.z=opening*.13;
    if(!reducedMotion)hand.position.y+=Math.sin(time*(moving?9:2))*(moving?.009:.003);
  }};
}
