import * as T from '/node_modules/three/build/three.module.js';
import {communityObjects,powerRoutes,projectKinds} from './community-rules.js';
import {places} from './town-layout.js';

export function createCommunityWorld(world){
  const group=new T.Group();group.name='あなたから変わる街';group.visible=false;world.scene.add(group);
  const obstacles=Object.entries(communityObjects).map(([id,p])=>({x:p.x,z:p.z,hw:id==='board'?1:id==='wind'?.85:.55,hd:id==='board'?.13:id==='wind'?.4:.55,active:false}));world.colliders.push(...obstacles);
  const mats=new Map(),shapes={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,12,8),cylinder:new T.CylinderGeometry(1,1,1,16)};
  function mat(color,glow=false){const key=color+':'+glow;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.7,emissive:glow?color:0,emissiveIntensity:glow?.8:0}));return mats.get(key);}
  function part(parent,shape,color,x,y,z,w,h,d,glow=false){const m=new T.Mesh(shapes[shape],mat(color,glow));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;}
  function at(object){const g=new T.Group();g.position.set(object.x,.13,object.z);group.add(g);return g;}
  function sign(parent,text,w=2.2,h=.55,y=2){
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');
    ctx.fillStyle='#ebe1ca';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#76958c';ctx.lineWidth=10;ctx.strokeRect(6,6,756,180);ctx.fillStyle='#314e4b';ctx.font='600 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96,700);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.y=y;m.userData.ownsResources=true;parent.add(m);return m;
  }
  const beacon=at(communityObjects.switch);
  part(beacon,'cylinder',0x89a69a,0,.38,0,.57,.7,.57);part(beacon,'cylinder',0xd8cbae,0,.79,0,.66,.12,.66);
  const lever=new T.Group();lever.position.y=.85;beacon.add(lever);part(lever,'cylinder',0x677f77,0,.26,0,.045,.52,.045);part(lever,'sphere',0xf0c092,0,.53,0,.16,.16,.16,true);
  const orb=part(beacon,'sphere',0xa7dbe4,0,1.58,0,.105,.105,.105,true);sign(beacon,'灯りの分配器',1,.24,.46).position.z=.565;
  const lamp=new T.PointLight(0xffc286,0,11,2);lamp.position.set(0,2.2,3.4);group.add(lamp);
  const organ=at(communityObjects.wind),rotors=[];
  part(organ,'box',0x9eaa8b,0,.28,0,1.7,.52,.7);sign(organ,'風のオルガン',2.1,.45,2.4);
  for(let i=0;i<5;i++){
    part(organ,'cylinder',[0xd4ac9c,0xa9c6b4,0xc9bad8][i%3],(i-2)*.3,.8+i*.09,0,.095,.9+i*.18,.095);
    const rotor=new T.Group();rotor.position.set((i-2)*.3,1.5+i*.09,.15);organ.add(rotor);rotors.push(rotor);
    part(rotor,'sphere',0xf0dab2,0,0,0,.05,.05,.05,true);
    for(let j=0;j<4;j++){const petal=part(rotor,'sphere',i%2?0xb7d6c5:0xe7bb9e,Math.cos(j*Math.PI/2)*.13,Math.sin(j*Math.PI/2)*.13,0,.14,.07,.03);petal.rotation.z=j*Math.PI/2;}
  }
  const board=at(communityObjects.board);
  for(const x of [-.75,.75])part(board,'box',0x87795f,x,.9,-.05,.11,1.8,.12);
  part(board,'box',0xaa9675,0,1.65,0,2.05,1.7,.14);sign(board,'明日のスケッチ',2.2,.4,2.7);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#e6dfcd';ctx.fillRect(0,0,768,768);ctx.strokeStyle='#aec5ad';ctx.lineWidth=4;
  for(let y=140;y<700;y+=100){ctx.beginPath();ctx.moveTo(80,y);ctx.lineTo(690,y);ctx.stroke();}
  ctx.fillStyle='#537465';ctx.font='52px sans-serif';ctx.textAlign='center';ctx.fillText('ここに、どんな場所を？',384,310);ctx.font='35px sans-serif';ctx.fillText('あなたの案を聞かせて。',384,410);
  const placeholder=new T.CanvasTexture(canvas);placeholder.colorSpace=T.SRGBColorSpace;
  const picture=new T.Mesh(new T.PlaneGeometry(1.83,1.5),new T.MeshBasicMaterial({map:placeholder,side:T.DoubleSide}));picture.position.set(0,1.65,.082);board.add(picture);
  const dust=new T.InstancedMesh(shapes.sphere,new T.MeshBasicMaterial({color:0xf3d9a9,transparent:true,opacity:.8}),45),dummy=new T.Object3D();dust.frustumCulled=false;group.add(dust);
  const flows=[];
  for(const [points,route,color] of [[[[0,.17,3.4],[-1.8,.17,2],[-2.5,.17,.5],[-4,.17,-2]],'town',0xf5c590],[[[0,.17,3.4],[1.8,.17,8],[0,.17,18],[0,.17,27.5]],'central',0xa4dce5]]){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),pipe=new T.Mesh(new T.TubeGeometry(curve,48,.04,6,false),mat(0x8a9c92));group.add(pipe);
    const beads=new T.InstancedMesh(shapes.sphere,new T.MeshBasicMaterial({color}),14);beads.frustumCulled=false;group.add(beads);flows.push({curve,beads,route});
  }
  const projects=new Map();let lit=0,lastTime=0,pulseAt=-100,pulseSite=null,currentArt=null;
  function makeProject(p){
    const root=at(places[p.site]);root.position.y=.15;const content=new T.Group();root.add(content);content.scale.y=.001;
    part(root,'cylinder',0x99ad93,0,-.02,0,2.7,.06,2.7);
    const decor=[];
    if(p.kind==='garden'){
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.cos(a)*2.25,z=Math.sin(a)*2.25;part(content,'cylinder',0x6b937b,x,.3,z,.035,.55,.035);const flower=part(content,'sphere',[0xeac3a0,0xbfcbb1,0xc3bde2][i%3],x,.65,z,.17,.13,.17,true);flower.userData.baseY=flower.position.y;decor.push(flower);for(let j=0;j<4;j++)part(content,'sphere',0xd6c5a6,x+Math.cos(j*Math.PI/2)*.14,.61,z+Math.sin(j*Math.PI/2)*.14,.12,.055,.12);}
      for(const x of [-1.9,1.9]){part(content,'cylinder',0xa89273,x,1.25,0,.045,2.4,.045);decor.push(part(content,'sphere',0xf8d8a0,x,2.5,0,.23,.28,.23,true));}
    }else if(p.kind==='playground'){
      for(let i=0;i<7;i++){const x=(i-3)*.38,z=-1.8;decor.push(part(content,'box',[0xdba595,0xb3cbae,0xb7bfde][i%3],x,.35,z,.3,.15,1-i*.07,true));part(content,'cylinder',0x927b60,x,.18,z,.04,.36,.04);}
      for(const x of [-1.9,1.9]){part(content,'cylinder',0xa5bfb0,x,.6,0,.05,1.2,.05);const toy=part(content,'sphere',0xf0cd9f,x,1.3,0,.38,.38,.12,true);decor.push(toy);}
    }else{
      const dome=new T.Mesh(new T.SphereGeometry(2.3,18,10,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xb9c7e3,wireframe:true,transparent:true,opacity:.24}));dome.userData.ownsResources=true;dome.position.y=.1;content.add(dome);
      for(let i=0;i<14;i++){const a=i*2.4,star=part(content,'sphere',0xe7dcba,Math.cos(a)*1.8,1.1+Math.sin(i*1.7)*.8,Math.sin(a)*1.8,.055,.055,.055,true);decor.push(star);}
      part(content,'cylinder',0x91a8a7,0,.55,-1.4,.035,1.1,.035);const telescope=part(content,'cylinder',0xd6c2a5,0,1.15,-1.4,.12,.65,.12);telescope.rotation.z=-.75;
    }
    const plaque=sign(root,p.title,2.2,.4,2.9);plaque.position.z=-2.2;
    return {root,content,decor,revision:p.revision,site:p.site,kind:p.kind};
  }
  function disposeProject(p){p.root.traverse(o=>{if(o.userData.ownsResources){o.material.map?.dispose();o.material.dispose();o.geometry.dispose();}});p.root.removeFromParent();}
  return {group,pulse(time,site){pulseAt=time;pulseSite=site;},setArt(url){
    if(currentArt?.image?.src===url)return;
    new T.TextureLoader().load(url,map=>{map.colorSpace=T.SRGBColorSpace;currentArt?.dispose();currentArt=map;picture.material.map=map;picture.material.needsUpdate=true;});
  },reset(){for(const p of projects.values())disposeProject(p);projects.clear();picture.material.map=placeholder;currentArt?.dispose();currentArt=null;},update(time,city){
    const c=city?.community;group.visible=!!c?.active;obstacles.forEach(o=>o.active=!!c?.active);if(!c?.active)return;
    const dt=Math.min(.06,Math.max(0,time-lastTime));lastTime=time;const boosting=city.clock<c.boostUntil;
    lit=T.MathUtils.damp(lit,powerRoutes[c.route].town?1:.12,5,dt);lamp.intensity=lit*22;
    orb.material.emissive.set(powerRoutes[c.route].color);orb.position.y=1.58+Math.sin(time*2)*.06;lever.rotation.z=T.MathUtils.damp(lever.rotation.z,{central:-.65,town:.65,shared:0}[c.route],12,dt);
    rotors.forEach((r,i)=>r.rotation.z+=dt*(boosting?12:1)*(i%2?-1:1));
    const ps=[...c.completed,...(c.project?.stage==='building'?[c.project]:[])];const latest=new Map(ps.map(p=>[p.site,p]));
    for(const p of latest.values()){let model=projects.get(p.site);if(model?.revision!==p.revision){if(model)disposeProject(model);model=makeProject(p);projects.set(p.site,model);}const scale=p.stage==='complete'?1:.06+.94*p.progress/12;model.content.scale.y=T.MathUtils.damp(model.content.scale.y,scale,5,dt);for(let i=0;i<model.decor.length;i++){const m=model.decor[i];m.rotation.y=time*.4+i;const pop=time-pulseAt<1.5?Math.sin((time-pulseAt)*8+i)*.1:Math.sin(time*2+i)*.018;m.userData.baseY??=m.position.y;m.position.y=m.userData.baseY+pop;}}
    for(const f of flows){f.beads.visible=boosting||powerRoutes[c.route][f.route]>0;for(let i=0;i<14;i++){dummy.position.copy(f.curve.getPointAt((time*(boosting?.16:.07)+i/14)%1));dummy.scale.setScalar(.09);dummy.updateMatrix();f.beads.setMatrixAt(i,dummy.matrix);}f.beads.instanceMatrix.needsUpdate=true;}
    const center=time-pulseAt<1.5&&pulseSite?places[pulseSite]:c.project?places[c.project.site]:communityObjects.switch;
    for(let i=0;i<45;i++){const a=i*2.4+time*.22,r=1.1+(i%7)*.28;dummy.position.set(center.x+Math.cos(a)*r,.35+((time*.3+i*.13)%2.7),center.z+Math.sin(a)*r);dummy.scale.setScalar((time-pulseAt<1.5?.065:.025)*lit);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);}dust.instanceMatrix.needsUpdate=true;
  }};
}
