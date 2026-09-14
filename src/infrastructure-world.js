import * as T from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {asset} from './cafe-assets.js';
import {createVariedSkyline} from './skyline-variety.js';
import {infrastructureSites,infrastructureObstacles,modernPlots} from './town-layout.js';
import {createRiverMaterial} from './river-material.js';
import {riverSample} from './boundary-layout.js';

export function createInfrastructureWorld(world){
  const group=new T.Group();group.name='明日のための街';world.scene.add(group);
  world.colliders.push(...infrastructureObstacles);
  const mats=new Map(),geometry=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();
  const material=color=>{if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.8}));return mats.get(color);};
  function box(color,x,y,z,w,h,d,parent=group){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  // A timber dock makes the river an actual source, not just a blue backdrop.
  for(let i=0;i<14;i++)box(0xa18b6c,-18,.13,33+i*.3,3.5,.12,.26);
  for(const x of [-19.8,-16.2])for(const z of [33.2,35.5,37])box(0x716b59,x,.48,z,.1,.9,.1);
  for(const x of [-19.8,-16.2])box(0x9f9675,x,.87,35.15,.08,.08,4.6);
  const newLamps=new T.Group();group.add(newLamps);const newLights=[];
  for(const [x,z] of [[-2.5,13],[2.5,18],[-2.5,22],[2.5,26],[-5,28],[5,28]]){
    box(0x7f9c9e,x,1.6,z,.12,3.2,.12,newLamps);box(0xa8bfc0,x+.25,3.2,z,.65,.12,.18,newLamps);
    const glow=new T.MeshBasicMaterial({color:0xc2e7e9}),lamp=new T.Mesh(new T.SphereGeometry(.21,12,8),glow);lamp.position.set(x+.48,3.1,z);newLamps.add(lamp);
    const light=new T.PointLight(0xb4ddeb,0,6,2);light.position.copy(lamp.position);newLamps.add(light);newLights.push(light);
  }
  const foundation=new T.Group();group.add(foundation);
  for(const p of modernPlots){box(0x807f6f,p.x,.12,p.z,3.8,.1,3.8,foundation);for(const x of [-1.8,1.8])for(const z of [-1.8,1.8])box(0xbaaa80,p.x+x,.33,p.z+z,.09,.55,.09,foundation);}
  const river=createRiverMaterial({fadeEnds:true}),vertices=[],uvs=[],indices=[];
  for(let i=0;i<=192;i++){const p=riverSample(i/192);for(let j=0;j<=8;j++){const across=(j/8*2-1)*p.width;vertices.push(p.x-p.dz*across,-p.z-p.dx*across,0);uvs.push(i/192,j/8);}}
  for(let i=0;i<192;i++)for(let j=0;j<8;j++){const a=i*9+j,b=a+9;indices.push(a,a+1,b,b,a+1,b+1);}
  const riverGeometry=new T.BufferGeometry();riverGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));riverGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));riverGeometry.setIndex(indices);riverGeometry.computeVertexNormals();
  const water=new T.Mesh(riverGeometry,river.material);water.name='River between the two mist gates';water.rotation.x=-Math.PI/2;water.position.y=-.29;water.receiveShadow=true;group.add(water);
  const boat=new T.Group();boat.position.set(-30,-.08,39);group.add(boat);box(0x8b7764,0,0,0,1.5,.26,.75,boat);box(0xc2bca0,0,.2,0,1,.15,.6,boat);

  const flows=[];
  function flow(points,color,radius){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),pipe=new T.Mesh(new T.TubeGeometry(curve,100,radius,6,false),material(color));pipe.castShadow=true;group.add(pipe);
    const glow=new T.MeshBasicMaterial({color,transparent:true,opacity:.9}),beads=new T.InstancedMesh(new T.SphereGeometry(radius*1.7,8,6),glow,12);beads.frustumCulled=false;group.add(beads);flows.push({curve,beads,phase:0});return flows.at(-1);
  }
  const power=flow([[-32,1,9],[-32,.32,14],[-26,.32,20],[-14,.32,23],[-3,.32,23],[7,.32,28],[10,.65,35]],0xe8c282,.055);
  const toCentral=flow([[10,.7,34],[8,.28,29],[3,.28,28],[1,.4,30]],0xe4cc9f,.06);
  const cooling=flow([[-18,.6,37],[-18,.32,32],[-12,.32,30],[-6,.32,28],[0,.32,29]],0x8bc9d2,.12);
  const halo=new T.Mesh(new T.TorusGeometry(1.7,.035,6,64),new T.MeshBasicMaterial({color:0xd6e6ce,transparent:true,opacity:.5}));halo.rotation.x=Math.PI/2;halo.position.set(10,11.2,35);group.add(halo);
  const beacon=new T.PointLight(0xffd49a,0,22,2);beacon.position.set(10,12,35);group.add(beacon);
  for(const [x,z,intensity] of [[-34,13,45],[-24,20,25],[-18,34,22],[0,28,30]]){const l=new T.PointLight(0xffcc96,intensity,12,2);l.position.set(x,3,z);group.add(l);}
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=384;
  const screenMap=new T.CanvasTexture(screenCanvas);screenMap.colorSpace=T.SRGBColorSpace;
  const screen=new T.Mesh(new T.PlaneGeometry(3.2,1.2),new T.MeshBasicMaterial({map:screenMap}));screen.position.set(0,3.2,36.5);group.add(screen);
  // The same inscription is visible from the approach to the hall.
  const frontScreen=screen.clone();frontScreen.position.set(0,3.15,29.52);frontScreen.rotation.y=Math.PI;group.add(frontScreen);
  let inscription='';
  function updateInscription(g){
    const text=g.voice||'FOR A BETTER TOMORROW',key=g.phase+':'+g.modelEnabled+':'+text;if(key===inscription)return;inscription=key;
    const ctx=screenCanvas.getContext('2d');ctx.fillStyle='#243e4c';ctx.fillRect(0,0,1024,384);ctx.strokeStyle='#beac80';ctx.lineWidth=5;ctx.strokeRect(12,12,1000,360);
    ctx.textAlign='center';ctx.fillStyle='#e8d5a9';ctx.font='24px Georgia';ctx.fillText(g.phase>=2?'CENTRAL / A MODEL OF TOMORROW':'CENTRAL / LITTLE ELSEWHERE',512,69);
    ctx.font='34px sans-serif';const words=[...text],lines=[];while(words.length&&lines.length<3)lines.push(words.splice(0,23).join(''));lines.forEach((l,i)=>ctx.fillText(l,512,150+i*47));
    ctx.font='19px monospace';ctx.fillStyle='#a4c6cd';ctx.fillText(g.modelEnabled?'POWER · WATER · MEMORY':'HOLDING THIS MOMENT',512,335);screenMap.needsUpdate=true;
  }
  const skyline=createVariedSkyline(world.scene,modernPlots);
  const satelliteRotors=[];const models={};let rotor=null,pumpRotor=null,upper=null;const towerGlow=[];
  const loader=new GLTFLoader();
  const ready=(async()=>{
    const loaded=await Promise.all(['windmill','pump','tower','data-center','city-house'].map(async id=>[id,(await loader.loadAsync('/assets/infrastructure/'+id+'.glb')).scene]));
    const templates=Object.fromEntries(loaded);
    for(const [site,id] of [['wind','windmill'],['pump','pump'],['relay','tower'],['central','data-center']]){
      const p=infrastructureSites[site],model=templates[id];model.position.set(p.x,.13,p.z);if(site!=='wind')model.rotation.y=Math.PI;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(model);models[site]=model;
    }
    for(const [x,z,scale] of [[-40,7,.54],[-40,16,.42],[-28,8,.46]]){const model=models.wind.clone(true);model.position.set(x,.13,z);model.scale.setScalar(scale);group.add(model);satelliteRotors.push(model.getObjectByName('Rotor'));world.colliders.push({x,z,hw:2.3*scale,hd:2.1*scale});}
    rotor=models.wind.getObjectByName('Rotor');pumpRotor=models.pump.getObjectByName('Rotor');upper=models.central.getObjectByName('UpperWorks');if(upper)upper.scale.y=.001;
    models.relay.traverse(o=>{if(o.isMesh&&o.material.emissiveIntensity>0){o.material=o.material.clone();towerGlow.push(o.material);}});

    return true;
  })().catch(error=>{console.warn('Infrastructure assets unavailable.',error.message);return false;});
  const treesReady=(async()=>{
    const template=await asset('park-tree'),roots=[];
    for(let i=0;i<17;i++){
      const a=i/17*Math.PI*2,x=-34+Math.cos(a)*11.6,z=13+Math.sin(a)*11.6;
      if(x> -27&&z>15||Math.abs(x+34)<4&&z<3)continue;
      const t=template.clone(true);t.position.set(x,.1,z);t.scale.setScalar(.65+(i%3)*.16);group.add(t);roots.push(t);world.colliders.push({x,z,hw:.25,hd:.25});
    }
    // Batch the repeated vegetation exactly as the existing town does.
    group.updateMatrixWorld(true);const batches=new Map();
    for(const root of roots)root.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());});
    for(const b of batches.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;group.add(m);}roots.forEach(o=>o.removeFromParent());
  })().catch(()=>{});
  let lastTime=0,motor=0,growth=0;
  return {group,ready:Promise.all([ready,treesReady]),update(time,city){
    river.update(time);
    const g=city?.infrastructure||{phase:0,modelEnabled:true},dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
    motor=T.MathUtils.damp(motor,g.windOnline&&g.windEnabled?(city?.memoryGame?.exploration?.windTuned?1.8:.8):0,2,dt);if(rotor)rotor.rotation.z-=dt*motor;satelliteRotors.forEach((r,i)=>{if(r)r.rotation.z-=dt*motor*(1.1+i*.17);});if(pumpRotor&&g.waterRate>0)pumpRotor.rotation.z+=dt*.9;
    growth=T.MathUtils.damp(growth,g.phase>=1?1:0,1.4,dt);newLamps.scale.y=Math.max(.001,growth);newLamps.visible=growth>.003;
    newLights.forEach(l=>l.intensity=growth*(g.allocation==='town'?9:4));
    if(upper)upper.scale.y=T.MathUtils.damp(upper.scale.y,g.phase>=2?1:.001,.65,dt);
    skyline.update(city?.community?.active?city.community.central:g.phase*30);
    const powered=g.relayOnline&&(city?.community?.active?g.energyRate>0:g.energyRate>0||g.energy>1);beacon.intensity=powered?36:0;halo.visible=!!powered;halo.rotation.z=time*.2;halo.material.opacity=.28+Math.sin(time*1.6)*.12;
    towerGlow.forEach(m=>m.emissiveIntensity=powered?1.1:.03);
    for(const f of flows){const on=f===cooling?g.waterRate>0:f===power?g.windOnline&&g.windEnabled&&g.relayOnline:powered;f.beads.visible=!!on;if(!on)continue;f.phase+=dt*(f===cooling?.045:.07)*(f===toCentral&&g.allocation==='town'?.4:1);for(let i=0;i<12;i++){dummy.position.copy(f.curve.getPointAt((f.phase+i/12)%1));dummy.updateMatrix();f.beads.setMatrixAt(i,dummy.matrix);}f.beads.instanceMatrix.needsUpdate=true;}
    boat.position.y=-.08+Math.sin(time*.7)*.025;boat.rotation.z=Math.sin(time*.5)*.015;
    screen.visible=frontScreen.visible=!city?.community?.active;updateInscription(g);
  }};
}
