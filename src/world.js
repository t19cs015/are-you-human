import * as T from '/node_modules/three/build/three.module.js';
import {residents} from './story.js';
import {outdoorGround} from './town-layout.js';
import {onPlazaApproach,insideObstacle,segmentHitsObstacle} from './street-layout.js';
export function createWorld(container){
 const scene=new T.Scene();scene.background=new T.Color('#172741');scene.fog=new T.FogExp2('#172741',.022);
 const camera=new T.PerspectiveCamera(64,innerWidth/innerHeight,.06,220);camera.rotation.order='YXZ';
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;container.append(renderer.domElement);
 scene.add(new T.HemisphereLight(0x9dbceb,0x45574d,1.45));
 const moon=new T.DirectionalLight(0xadc8ff,1.25);moon.position.set(-9,16,-3);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-18,right:18,top:18,bottom:-18});moon.shadow.normalBias=.03;scene.add(moon);
 const materials=new Map(),colliders=[],cafeObjects=[],townObjects={buildings:[],lamps:[],benches:[],trees:[],flowers:[],paving:[]};
 function mat(color,glow=0){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.88,emissive:glow?color:0,emissiveIntensity:glow}));return materials.get(key);}
 function mesh(geometry,color,parent=scene,x=0,y=0,z=0,glow=0){const m=new T.Mesh(geometry,mat(color,glow));m.position.set(x,y,z);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;}
 function box(p,c,x,y,z,w,h,d,glow=0){return mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z,glow);}
 function ball(p,c,x,y,z,sx,sy=sx,sz=sx,glow=0){const m=mesh(new T.SphereGeometry(1,20,14),c,p,x,y,z,glow);m.scale.set(sx,sy,sz);return m;}
 function cyl(p,c,x,y,z,r,h){return mesh(new T.CylinderGeometry(r,r,h,40),c,p,x,y,z);}
 function textSign(text,x,y,z,w=2.5,h=.6,color='#f5d495',bg='#2d4050',parent=scene){
  const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,192);ctx.strokeStyle='#b78b55';ctx.lineWidth=10;ctx.strokeRect(9,9,750,174);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 68px Georgia';ctx.fillText(text,384,102);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);parent.add(m);return m;
 }
 function warmLight(x,y,z,intensity=10,range=8){const l=new T.PointLight(0xffad57,intensity,range,2);l.position.set(x,y,z);scene.add(l);return l;}
 cyl(scene,0x354a45,0,-.4,0,15,.8);cyl(scene,0x667362,0,.015,0,14.8,.1);
 const pavingStart=scene.children.length;
 box(scene,0x8f8b79,0,.075,0,13,.12,11);box(scene,0x8f8b79,0,.08,8,3.2,.1,7);
 // Shallow seams give the plaza texture without a new asset pipeline.
 for(let x=-6;x<=6;x+=1.25)for(let z=-4.5;z<5;z+=1.15){box(scene,((Math.round(x*4)+Math.round(z*10))%3)?0x999480:0x888877,x,.145,z,1.18,.035,1.07);}
 townObjects.paving.push(...scene.children.slice(pavingStart));
 function house(x,z,title,c,roof){
  const g=new T.Group();g.position.set(x,0,z);scene.add(g);
  box(g,c,0,1.7,0,3.8,3.4,3);const r=mesh(new T.ConeGeometry(3.1,1.5,4),roof,g,0,4.12,0);r.rotation.y=Math.PI/4;r.scale.z=.9;
  box(g,0x39414a,0,1,1.55,.88,1.9,.12);box(g,0xffd391,0,1.45,1.63,.56,.65,.05,1);
  for(const sx of [-1.2,1.2]){box(g,0x514b45,sx,1.65,1.57,.9,1.2,.15);box(g,0xffb65c,sx,1.65,1.67,.72,.95,.035,.85);box(g,0x5b5148,sx,1.65,1.71,.055,1,.06);box(g,0x5b5148,sx,1.65,1.71,.8,.05,.06);}
  textSign(title,0,2.95,1.67,2.7,.55,'#ffe3a5','#31434a',g);box(g,roof,0,2.5,2,3.7,.15,1.1);
  box(g,0xb2a08a,0,.22,1.9,1.5,.3,.7);warmLight(x,2,z+2,11,7);
  colliders.push({x,z,hw:2.12,hd:1.85});return g;
 }
 cafeObjects.push(house(-5.2,-6,'CAFE',0xab8070,0x78586b));townObjects.buildings.push(house(0,-7.2,'LIBRARY',0x82949d,0x4a6570),house(5.2,-6,'LAB',0x84918a,0x616b89));
 townObjects.buildings.push(house(-10,-1,'HOME',0x8c847c,0x6c657c),house(10,-1,'HOME',0x9a8e79,0x765e70));
 function lamp(x,z){cyl(scene,0x354351,x,1.55,z,.065,3.1);box(scene,0x3c4a54,x,3,z,.4,.08,.4);ball(scene,0xffbb67,x,2.77,z,.17,.25,.17,1.2);const cap=mesh(new T.ConeGeometry(.32,.3,4),0x334653,scene,x,3.18,z);cap.rotation.y=Math.PI/4;warmLight(x,2.7,z,14,8);colliders.push({x,z,hw:.18,hd:.18});}
 [[-3.1,-3.6],[3.1,-3.6],[-6,4],[6,4],[2.6,10]].forEach(p=>{const start=scene.children.length;lamp(...p);if(p[0]===-3.1)cafeObjects.push(...scene.children.slice(start));else townObjects.lamps.push(...scene.children.slice(start));});
 function bench(x,z){const g=new T.Group();g.position.set(x,0,z);scene.add(g);box(g,0x9f7962,0,.56,0,1.9,.13,.65);box(g,0xa9876b,0,1,-.3,1.9,.62,.1);for(const a of [-.72,.72])box(g,0x344858,a,.28,0,.12,.55,.6);colliders.push({x,z,hw:1.1,hd:.5});return g;}
 cafeObjects.push(bench(-5,2.5));townObjects.benches.push(bench(5,2.5));
 // Cafe terrace: occupied places, rather than empty decorative buildings.
 const terraceStart=scene.children.length;
 cyl(scene,0xaa8063,-5,-.02,-2.7,.09,.1);cyl(scene,0xb18c69,-5,.78,-2.7,.68,.1);cyl(scene,0x5b6261,-5,.4,-2.7,.075,.7);
 colliders.push({x:-5,z:-2.7,hw:.78,hd:.78});cyl(scene,0xe5d2ad,-5,.92,-2.7,.08,.18);
 cafeObjects.push(...scene.children.slice(terraceStart));
 function tree(x,z,s){const g=new T.Group();townObjects.trees.push(g);g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);cyl(g,0x74614f,0,1,0,.19,2);ball(g,0x42665d,0,2.6,0,1.15,1.5,1.05);ball(g,0x547264,-.45,3.1,.2,.75,.9,.75);colliders.push({x,z,hw:.4*s,hd:.4*s});}
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=Math.cos(a)*13,z=Math.sin(a)*13;if(!onPlazaApproach(x,z))tree(x,z,.85+(i%3)*.18);}
 for(const [x,z] of [[-7,4],[7,4],[-8,-4],[8,-4]])tree(x,z,.85);
 const flowersStart=scene.children.length;
 for(let i=0;i<65;i++){const a=i*2.4,r=7.5+(i%4)*.8,x=Math.cos(a)*r,z=Math.sin(a)*r;if(z<-4)continue;ball(scene,i%2?0xb295aa:0xd2b375,x,.23,z,.1,.18,.1);}
 townObjects.flowers.push(...scene.children.slice(flowersStart));
 // Quiet sky: moon, stars and layered silhouettes.
 const moonDisc=ball(scene,0xffdfb2,-15,19,-35,2.1,2.1,2.1,1.1);moonDisc.material=new T.MeshBasicMaterial({color:0xf1d3a2,fog:false,toneMapped:false});
 const starPositions=[];for(let i=0;i<170;i++){const a=i*2.399;const y=12+(i%23);starPositions.push(Math.cos(a)*45,y,Math.sin(a)*45);}
 const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));scene.add(new T.Points(stars,new T.PointsMaterial({color:0xe8dbba,size:.075,fog:false})));
 const npcs=residents.map((data,i)=>{
  const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);root.position.set(data.x,.09,data.z);
  ball(body,data.color,0,.72,0,.39,.48,.3);box(body,data.accent,0,.78,.3,.25,.18,.045);
  if(data.kind==='square')box(body,data.color,0,1.4,0,.9,.72,.67);else ball(body,data.color,0,1.42,0,.5,.46,.4);
  const face=ball(body,0x182e45,0,1.43,.3,.395,.285,.14);
  const eyes=[];for(const side of [-1,1]){eyes.push(ball(body,0xa6ece9,side*.14,1.46,.433,.055,.07,.025,1.2));ball(body,data.color,side*.44,.8,0,.13,.25,.14);ball(body,0x39485a,side*.18,.22,.075,.16,.14,.22);}
  ball(body,0x91ddd8,0,1.3,.441,.064,.015,.016,.8);
  if(data.kind==='round'){cyl(body,data.accent,0,1.03,0,.35,.12);box(body,data.accent,-.23,.84,.3,.18,.42,.09);}
  if(data.kind==='square'){
   for(const side of [-1,1]){const ring=mesh(new T.TorusGeometry(.14,.023,8,24),0x394351,body,side*.17,1.46,.46);}
   box(body,0x394351,0,1.46,.46,.07,.025,.03);box(body,0x667e91,-.46,.73,.1,.16,.44,.38);
  }
  if(data.kind==='cat')for(const side of [-1,1])mesh(new T.ConeGeometry(.18,.39,3),data.accent,body,side*.33,1.87,0);
  if(data.kind==='sprout'){cyl(body,0x6b9370,0,1.98,0,.035,.3);const leaf=ball(body,0xa7c08d,.12,2.07,0,.2,.07,.1);leaf.rotation.z=.4;}
  const workProp=new T.Group();body.add(workProp);workProp.visible=false;
  box(workProp,0x294158,0,.96,.56,.48,.3,.045);
  for(let row=0;row<3;row++)box(workProp,row===0?0xeac887:0x9ee1d9,-.03,1.04-row*.075,.59,.31,.018,.012);
  const el=document.createElement('div');el.className='bubble';el.hidden=true;document.getElementById('labels').append(el);
  return {...data,root,body,eyes,workProp,el,until:0,target:null,wait:0,activity:'立ち話',social:false,glitch:0};
 });
 function canMove(x,z,includeNPC=true,ignoreId=null){return (outdoorGround(x,z)||(Math.abs(x-40)<5.65&&Math.abs(z)<4.65)||(Math.abs(x-60)<5.65&&Math.abs(z)<4.65))&&!colliders.some(c=>insideObstacle(x,z,c))&&(!includeNPC||!npcs.some(n=>n.id!==ignoreId&&Math.hypot(x-n.root.position.x,z-n.root.position.z)<.6));}
 function face(n,p){n.root.rotation.y=Math.atan2(p.x-n.root.position.x,p.z-n.root.position.z);}
 const navigation=(x,z)=>canMove(x,z,false);navigation.segmentClear=(a,b)=>!colliders.some(c=>segmentHitsObstacle(a,b,c));
 function walk(n,target,dt,time,speed=.7){const dx=target.x-n.root.position.x,dz=target.z-n.root.position.z,d=Math.hypot(dx,dz);if(d<.12){n.body.position.y=0;return true;}
  face(n,target);const step=Math.min(d,speed*dt),x=n.root.position.x+dx/d*step,z=n.root.position.z+dz/d*step;
  if(canMove(x,z,false)){n.root.position.x=x;n.root.position.z=z;}
  else if(canMove(x,n.root.position.z,false))n.root.position.x=x;
  else if(canMove(n.root.position.x,z,false))n.root.position.z=z;
  else return true;
  n.body.position.y=Math.abs(Math.sin(time*8))* .035;return false;
 }
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
 addEventListener('resize',resize);
 return {scene,camera,renderer,npcs,canMove,navigation,face,walk,moon,colliders,cafeObjects,townObjects};
}
