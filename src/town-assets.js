import {squarePaving} from './paving.js';
import {roomAt} from './locations.js';
import * as T from '/node_modules/three/build/three.module.js';
import {asset} from './cafe-assets.js';
import {townHedges,onPlazaApproach} from './street-layout.js';
import {addPropFootprint} from './street-props.js';

// Exterior footprints remain compatible with the original routes and entry buttons.
export const townFootprints=[
 {x:0,z:-7.1,hw:2.18,hd:1.94},
 {x:5.2,z:-5.95,hw:2.18,hd:1.94},
 {x:-10,z:-1,hw:1.6,hd:2.05},
 {x:10,z:-1,hw:1.6,hd:2.05},
];
export async function upgradeTown(world,studio){
 const names=['house-house','house-fence_straight','house-package','park-bench','park-street_lantern','park-tree','park-bush','park-hedge_straight','park-flower_A','park-flower_B','park-grass_A','furniture-book_set','furniture-book_single','furniture-shelf_B_large_decorated','furniture-table_medium_long','furniture-chair_C','furniture-lamp_standing','furniture-rug_rectangle_A','furniture-armchair_pillows','furniture-cabinet_medium_decorated','furniture-cactus_small_A'];
 const templates=Object.fromEntries(await Promise.all(names.map(async name=>[name,await asset(name)])));
 const group=new T.Group();group.name='Little Elsewhere • town upgrade';
 const pools={town:[],openingTrees:[],lab:[],library:[]},motions=[],lights=[],colliders=[];
 const materials=new Map(),unitBox=new T.BoxGeometry(1,1,1);
 function material(color,glow=0){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.83,emissive:glow?color:0,emissiveIntensity:glow}));return materials.get(key);}
 function box(color,x,y,z,w,h,d,parent=group){const m=new T.Mesh(unitBox,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function put(name,x,z,s=1,y=.18,rotation=0,zone='town',size){
  const model=templates[name].clone(true),holder=new T.Group();holder.add(model);
  if(name==='house-fence_straight')model.position.x-=.5;
  if(size){const bounds=new T.Box3().setFromObject(model),v=bounds.getSize(new T.Vector3());model.scale.set(size[0]/v.x,size[1]/v.y,size[2]/v.z);model.position.set(-(bounds.min.x+bounds.max.x)/2*model.scale.x,-bounds.min.y*model.scale.y,-(bounds.min.z+bounds.max.z)/2*model.scale.z);}
  holder.position.set(x,y,z);holder.scale.setScalar(s);holder.rotation.y=rotation;group.add(holder);pools[zone].push(holder);if(['park-bush','park-hedge_straight','house-fence_straight'].includes(name))addPropFootprint(colliders,holder);return holder;
 }
 function roof(model,color){
  model.traverse(o=>{if(!o.isMesh||o.name!=='house')return;const mat=o.material.clone(),tint=new T.Color(color);
   mat.onBeforeCompile=shader=>{shader.uniforms.roofTint={value:tint};shader.vertexShader='varying float roofY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroofY=position.y;');shader.fragmentShader='varying float roofY;uniform vec3 roofTint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(roofY>2.95 && diffuseColor.r>diffuseColor.g*1.22 && diffuseColor.r>diffuseColor.b*1.45){float shade=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=roofTint*(.65+shade*1.1);}');};
   mat.customProgramCacheKey=()=>String(color);o.material=mat;
  });
 }
 function sign(title,subtitle,x,y,z,w=2.55,h=.58,color='#253c49',rotation=0){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const c=canvas.getContext('2d');
  c.fillStyle=color;c.fillRect(0,0,768,192);c.strokeStyle='#cab37b';c.lineWidth=5;c.strokeRect(8,8,752,176);c.textAlign='center';c.fillStyle='#f4e3bd';c.font='bold 64px Georgia';c.fillText(title,384,96);c.font='20px sans-serif';c.fillText(subtitle,384,145);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}));m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);return m;
 }
 function lantern(x,z,height=3.1){
  put('park-street_lantern',x,z,1,.18,0,'town',[.55,height,.55]);
  // Warm panes on the four sides of the existing lantern frame.
  for(let i=0;i<4;i++){const pane=new T.Mesh(new T.PlaneGeometry(.16,.24),new T.MeshBasicMaterial({color:0xffdc9c,side:T.DoubleSide}));pane.position.set(x+Math.sin(i*Math.PI/2)*.12,height-.22,z+Math.cos(i*Math.PI/2)*.12);pane.rotation.y=i*Math.PI/2;group.add(pane);}
  const l=new T.PointLight(0xffc787,10,6.2,2);l.position.set(x,height-.15,z);group.add(l);lights.push(l);
 }
 // A quieter, cooler palette for the library; the same roof kit gives the town a shared style.
 for(const [x,z,label,subtitle,accent] of [[0,-7.25,'LIBRARY','READ · REMEMBER · DISCOVER',0x778896],[5.2,-6.1,'LAB','DESIGN · SOUND · EXPERIMENT',0x688b81]]){
  const building=put('house-house',x,z,.74,.18);roof(building,label==='LAB'?0x4b796e:0x49627f);
  sign(label,subtitle,x,3.22,z+2.06,2.55,.58,label==='LAB'?'#304b43':'#2a4158');
  // A colored shallow canopy identifies the entrance without blocking the door.
  box(accent,x,2.8,z+2.25,3.15,.12,.8);box(0xdfcfaa,x,2.65,z+2.65,3.15,.18,.05);
  for(const side of [-1,1])put('furniture-cactus_small_A',x+side*1.55,z+2.05,.6,.2);
  colliders.push({x,z:z+2.79,hw:.7,hd:.42});
  // Illuminated upper window, plus external reading/work notice.
  box(0xffd493,x,3.75,z+1.91,.35,.25,.035).material=material(0xffd493,.55);
 }
 // Readable street-level activity: books outside the library, sample storage outside the lab.
 put('furniture-shelf_B_large_decorated',-1.7,-4.8,1,.9,0,'town',[.85,.52,.4]);
 box(0x94795b,-1.7,.54,-4.8,.85,.72,.4);
 sign('TAKE A BOOK','RETURN A THOUGHT',-1.7,1.82,-4.53,.93,.3);
 colliders.push({x:-1.7,z:-4.8,hw:.46,hd:.24});
 put('house-package',6.8,-4.05,.46);put('furniture-cabinet_medium_decorated',7.1,-4.6,1,.18,0,'town',[.65,1.2,.55]);
 // Solar test panels are mounted on the lab roof, not on the walking route.
 for(let i=0;i<3;i++){
  const panel=box(0x34495c,5.25+i*.48,4.09,-5.75,.44,.045,.9);panel.rotation.z=-.46;
  for(let j=0;j<3;j++){const cell=box(0x7298a5,5.25+i*.48,4.125,-6.03+j*.27,.37,.016,.018);cell.rotation.z=-.46;}
 }
 // Houses face the plaza; yards stay behind the existing building collision footprints.
 for(const [x,rot,title,accent] of [[-10,Math.PI/2,'WILLOW HOUSE',0x849277],[10,-Math.PI/2,'JUNIPER HOUSE',0x9b7e87]]){
  const home=put('house-house',x,-1,.64,.18,rot);roof(home,x<0?0x786883:0x8a7860);
  const sx=x+(x<0?1.74:-1.74);
  colliders.push({x:x+(x<0?2.05:-2.05),z:-1,hw:.4,hd:.7});
  sign(title,'A PLACE TO RECHARGE',sx,2.8,-1,2.1,.45,'#3b4c46',rot);
  const awning=box(accent,sx,2.42,-1,.75,.1,2.6);awning.rotation.z=0;
  for(const z of [-3.1,1.4])put('house-fence_straight',x,z,.75,.18,Math.PI/2);
  put('park-bush',x,2,.65);put('furniture-cactus_small_A',sx,-2,.65);
 }
 // A warm stone surface with small variations; one draw call per palette rather than per tile.
 const tiles=[];
 for(let xi=-9;xi<=9;xi++)for(let zi=-7;zi<=6;zi++){
  const x=xi*.78,z=zi*.78;
  if(x<-2.7&&z<1.5)continue; // Cafe owns these cells on the shared paving grid.
  if(z<-3.8&&Math.abs(x-5.2)<2.3)continue;
  if(z<-4.9&&Math.abs(x)<2.3)continue;
  tiles.push([xi,zi]);
 }
 for(let zi=7;zi<=14;zi++)for(let xi=-2;xi<=2;xi++)tiles.push([xi,zi]);
 group.add(squarePaving(tiles));
 box(0x707e73,0,.075,0,14.8,.09,11.4);box(0x707e73,0,.08,8.3,4,.09,6.9);
 // Flush plaza medallion: an identifiable meeting place that never obstructs NPC paths.
 const disc=new T.Mesh(new T.CircleGeometry(1.9,64),material(0xa8ad9f));disc.rotation.x=-Math.PI/2;disc.position.set(0,.184,.7);disc.receiveShadow=true;group.add(disc);
 const ring=new T.Mesh(new T.RingGeometry(1.73,1.79,64),material(0x777f73));ring.rotation.x=-Math.PI/2;ring.position.set(0,.187,.7);group.add(ring);
 for(let i=0;i<8;i++){const m=box(0xc5ba93,Math.sin(i*Math.PI/4)*1.38,.19,.7+Math.cos(i*Math.PI/4)*1.38,.1,.014,.24);m.rotation.y=i*Math.PI/4;}
 put('park-bench',5,2.5,.95,.18,-Math.PI/10);
 for(const [x,z] of [[3.1,-3.6],[-6,4],[6,4],[2.6,10]])lantern(x,z);
 // Planting repeats existing CC0 models. Static instances share geometry, maps and materials.
 for(let i=0;i<24;i++){
  const a=i/24*Math.PI*2,x=Math.cos(a)*13,z=Math.sin(a)*13;
  if(onPlazaApproach(x,z))continue;
  put('park-tree',x,z,.95+(i%3)*.13,.13,a,'openingTrees');
 }
 // Keep the four foreground trees in their own batch. The demo can clear them
 // for its crowded opening composition without changing the playable town.
 for(const [x,z] of [[-7,4],[7,4],[-8,-4],[8,-4]])put('park-tree',x,z,.88,.15,x,'openingTrees');
 for(const [x,z,rot] of townHedges)put('park-hedge_straight',x,z,.72,.18,rot);
 for(let i=0;i<90;i++){
  const side=i%2?1:-1,z=4.6+Math.floor(i/2)*.13,x=side*(2.3+(i%5)*.22);
  if(Math.hypot(x,z)>11.4)continue;
  put(i%4?'park-flower_A':'park-flower_B',x,z,.3+(i%3)*.08,.18,i*.4);
  if(i%3===0)put('park-grass_A',x+side*.3,z,.42);
 }
 for(const [x,z] of [[7,-3.1],[7.7,.8],[-7.5,3.7],[-2.8,-5.3],[2.6,-5.2]]){
  put('park-bush',x,z,.53);
  for(let i=0;i<6;i++)put(i%2?'park-flower_A':'park-flower_B',x-.45+i*.18,z+.42,.4);
 }
 // Warm string lights frame the plaza from above; no cables at player height.
 const curve=new T.CatmullRomCurve3([new T.Vector3(-6,3.35,4),new T.Vector3(0,3.05,4),new T.Vector3(6,3.35,4)]);
 group.add(new T.Mesh(new T.TubeGeometry(curve,32,.013,4,false),material(0x42544f)));
 const bulbGeo=new T.SphereGeometry(.047,8,6),bulbMat=new T.MeshBasicMaterial({color:0xffd49b});
 for(let i=0;i<17;i++){const bulb=new T.Mesh(bulbGeo,bulbMat);bulb.position.copy(curve.getPoint(i/16));bulb.position.y-=.09;group.add(bulb);motions.push({bulb,y:bulb.position.y,phase:i});}
 // Furniture in the existing rooms. Work surfaces and live project monitors keep their coordinates.
 if(studio){for(const [zone,cx] of [['lab',40],['library',60]]){
  for(const dx of [-2.8,2.8]){
   put('furniture-table_medium_long',cx+dx,-1.9,1,.08,0,zone,[2.7,.87,1.3]);
   put('furniture-chair_C',cx+dx,.35,1,.08,Math.PI,zone,[.72,1.04,.7]);
   if(zone==='lab'){box(0x405766,cx+dx,1.11,-2.3,.07,.4,.09);box(0x405766,cx+dx,.96,-2.3,.7,.05,.35);}
   put('furniture-book_set',cx+dx-.7,-1.75,.3,.97,0,zone);
   put('furniture-cactus_small_A',cx+dx+1,-2.1,.3,.98,0,zone);
  }
  put('furniture-rug_rectangle_A',cx,1.4,1,.04,0,zone,[3.4,.025,3]);
  for(const side of [-1,1]){
   put('furniture-armchair_pillows',cx+side*4.6,1.4,1,.08,side<0?Math.PI/2:-Math.PI/2,zone,[1.15,1.25,1.1]);
   put('furniture-lamp_standing',cx+side*5,2.7,1,.08,0,zone,[.5,2,.5]);
   colliders.push({x:cx+side*4.6,z:1.4,hw:.58,hd:.56});
  }
  // Timber wainscoting and pendants make the rooms feel inhabited at night.
  box(0x857763,cx,.65,-4.88,11.8,1.3,.08);
  box(0xb4a58a,cx,1.32,-4.81,11.8,.07,.08);
  for(const side of [-1,1]){box(0x857763,cx+side*5.86,.65,0,.08,1.3,9.8);box(0xb4a58a,cx+side*5.81,1.32,0,.08,.07,9.8);}
  for(const dx of [-2.8,2.8]){
   box(0x40565d,cx+dx,3.88,-1.7,.035,.6,.035);
   const shade=new T.Mesh(new T.ConeGeometry(.35,.25,20,1,true),material(0xb8a07b));shade.position.set(cx+dx,3.54,-1.7);group.add(shade);
   const glow=new T.Mesh(new T.SphereGeometry(.11,12,8),new T.MeshBasicMaterial({color:0xffdc9c}));glow.position.set(cx+dx,3.45,-1.7);group.add(glow);
  }
  if(zone==='library')for(const dx of [-3.7,0,3.7]){
   box(0x706352,cx+dx,1.45,-4.73,2.95,2.75,.08);
   for(const side of [-1,1])box(0x947954,cx+dx+side*1.45,1.45,-4.35,.07,2.75,.6);
   for(let row=0;row<3;row++)put('furniture-shelf_B_large_decorated',cx+dx,-4.35,1,.15+row*.84,0,zone,[2.8,.72,.6]);
   colliders.push({x:cx+dx,z:-4.35,hw:1.4,hd:.35});
  }
  else for(const dx of [-4.8,4.8]){
   put('furniture-cabinet_medium_decorated',cx+dx,-4.2,1,.08,0,zone,[1.65,2,.65]);
   colliders.push({x:cx+dx,z:-4.2,hw:.84,hd:.34});
  }
  sign(zone==='library'?'THE READING ROOM':'ELSEWHERE STUDIO',zone==='library'?'REFERENCE · NOTES · QUIET COMPANY':'POSTERS · MELODIES · WORK IN PROGRESS',cx,3.65,-4.84,4.2,.6);
  for(let i=0;i<13;i++)box(0x8d816e,cx-5.5+i*.9,.045,0,.035,.018,9.8);
 }}
 // Batch by geometry and material within each room, preserving room-level frustum culling.
 for(const [zone,roots] of Object.entries(pools)){
  group.updateMatrixWorld(true);const batches=new Map();
  for(const root of roots)root.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());});
  for(const b of batches.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();m.userData.room=['town','openingTrees'].includes(zone)?null:zone;m.userData.openingTrees=zone==='openingTrees';group.add(m);}
  for(const root of roots)root.removeFromParent();
 }
 // Atomic visual swap after all assets loaded. Existing gameplay objects are preserved.
 for(const objects of Object.values(world.townObjects))objects.forEach(o=>o.visible=false);
 studio?.furniture.forEach(o=>{o.visible=false;o.userData.replaced=true;});
 // Update only the four replaced buildings' footprints; leave all other collision records intact.
 const originals=[[0,-7.2],[5.2,-6],[-10,-1],[10,-1]];
 originals.forEach(([x,z],i)=>{const c=world.colliders.find(c=>c.x===x&&c.z===z&&c.hw===2.12);if(c)Object.assign(c,townFootprints[i]);});
 for(const x of [-10,10]){const light=world.scene.children.find(o=>o.isPointLight&&o.position.x===x&&o.position.z===1);if(light)light.position.set(x+(x<0?2.4:-2.4),2,-1);}
 world.colliders.push(...colliders);world.scene.add(group);
 return {group,assetCount:names.length,setOpeningTreesVisible(visible){for(const o of group.children)if(o.userData.openingTrees)o.visible=visible;},setRoom(room){for(const o of group.children){const zone=o.userData.room||roomAt(o.position.x,o.position.z);if(zone)o.visible=zone===room;}},update(t,community){const lightLevel=community?.active?(community.route==='central'?.08:community.route==='shared'?.7:1):1;bulbMat.color.set(lightLevel<.2?0x657e84:0xffd49b);for(const light of lights){light.userData.originalPower??=light.intensity;light.intensity=light.userData.originalPower*lightLevel;}for(const m of motions)m.bulb.position.y=m.y+Math.sin(t*.8+m.phase*.4)*.012;}};
}
