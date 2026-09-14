import * as T from '/node_modules/three/build/three.module.js';
import {RoomEnvironment} from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {outdoorGround} from './town-layout.js';

function softDisc(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,31);
  gradient.addColorStop(0,'#ffffffd9');gradient.addColorStop(.3,'#ffffff70');gradient.addColorStop(1,'#ffffff00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(canvas);
}

export function createTownLighting(world){
  const {scene,renderer,moon,camera}=world,hemisphere=scene.children.find(o=>o.isHemisphereLight);
  const originals={hemi:hemisphere.intensity,hemiColor:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),moon:moon.intensity,moonColor:moon.color.clone(),position:moon.position.clone(),environment:scene.environment};
  const finish=new T.Group();finish.name='Soft light and contact shadows';scene.add(finish);
  const generator=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=generator.fromScene(room,.04);
  room.dispose();generator.dispose();
  const fill=new T.DirectionalLight(0xf6ceb4,.2);fill.position.set(8,14,-18);finish.add(fill);
  // A fixed light budget avoids compiling a different shader as the player walks.
  const pool=Array.from({length:16},()=>{const light=new T.PointLight(0xffffff,0,12,2);finish.add(light);return light;});
  const disc=softDisc(),shadowMat=new T.MeshBasicMaterial({map:disc,color:0x182429,transparent:true,opacity:.2,depthWrite:false});
  const residentShadows=world.npcs.map(n=>{const mesh=new T.Mesh(new T.PlaneGeometry(1.55,1.18),shadowMat);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=1;finish.add(mesh);return {n,mesh};});
  const lights=[],dummy=new T.Object3D();let contacts=null,enabled=true;
  scene.add(moon.target);
  function activeParent(o){for(let p=o.parent;p;p=p.parent)if(!p.visible)return false;return true;}
  function prepare(){
    scene.updateMatrixWorld(true);
    scene.traverse(o=>{if(o.isPointLight&&!pool.includes(o)){
      lights.push({light:o,visible:o.visible,position:new T.Vector3(),score:0});
    }});
    const obstacles=world.colliders.filter(c=>c.active!==false&&outdoorGround(c.x,c.z)&&c.hw<5&&c.hd<5);
    contacts=new T.InstancedMesh(new T.PlaneGeometry(2,2),shadowMat,obstacles.length);contacts.frustumCulled=false;contacts.renderOrder=1;finish.add(contacts);
    for(let i=0;i<obstacles.length;i++){const c=obstacles[i];dummy.position.set(c.x,.193,c.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(c.hw+.5,c.hd+.5,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);}
    // The tall city's shadow is now rendered near the camera too, not only at the plaza.
    moon.shadow.normalBias=.035;moon.shadow.bias=-.00012;moon.shadow.camera.near=.5;moon.shadow.camera.far=110;
    setEnabled(enabled);
  }
  function setEnabled(value){
    enabled=value;finish.visible=value;scene.environment=value?environment.texture:originals.environment;scene.environmentIntensity=value?.13:1;
    hemisphere.intensity=value?.75:originals.hemi;hemisphere.color.copy(value?new T.Color(0xc2d1ef):originals.hemiColor);hemisphere.groundColor.copy(value?new T.Color(0x80705c):originals.ground);
    moon.intensity=value?1.25:originals.moon;moon.color.copy(value?new T.Color(0xc3d2fa):originals.moonColor);
    for(const source of lights)source.light.visible=value?false:source.visible;
    if(!value){moon.position.copy(originals.position);moon.target.position.set(0,0,0);Object.assign(moon.shadow.camera,{left:-18,right:18,top:18,bottom:-18});moon.shadow.camera.updateProjectionMatrix();}
  }
  function update(){
    if(!enabled)return;
    const overhead=camera.position.y>12,span=overhead?66:21,texel=span*2/2048;
    const x=Math.round((overhead?-6:camera.position.x)/texel)*texel,z=Math.round((overhead?37:camera.position.z)/texel)*texel;
    moon.position.set(x-14,30,z-9);moon.target.position.set(x,0,z);moon.target.updateMatrixWorld();
    if(moon.shadow.camera.right!==span){Object.assign(moon.shadow.camera,{left:-span,right:span,top:span,bottom:-span});moon.shadow.camera.updateProjectionMatrix();}
    for(const source of lights){source.light.getWorldPosition(source.position);source.score=source.visible&&activeParent(source.light)?source.light.intensity/(9+source.position.distanceToSquared(camera.position)):0;}
    const ranked=lights.filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
    pool.forEach((light,i)=>{const source=ranked[i];light.intensity=(source?.light.intensity||0)*.65;if(!source)return;light.position.copy(source.position);light.color.copy(source.light.color);light.distance=source.light.distance;light.decay=source.light.decay;});
    for(const {n,mesh} of residentShadows){mesh.visible=n.body.visible&&Math.abs(n.root.position.x)<35;mesh.position.set(n.root.position.x,.197,n.root.position.z);}
  }
  return {prepare,update,setEnabled,dispose(){environment.dispose();disc.dispose();}};
}
