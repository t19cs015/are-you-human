import {squarePaving} from './paving.js';
import * as T from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {addPropFootprint} from './street-props.js';
const loader=new GLTFLoader(),cache=new Map(),atlases=new Map();
export async function asset(name){
 if(!cache.has(name))cache.set(name,loader.loadAsync('/assets/cafe/'+name+'.glb').then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const atlas=name.startsWith('house-')||name.startsWith('park-')?'tiny-treats':name.split('-')[0];if(o.material.map){const original=o.material.map;if(!atlases.has(atlas))atlases.set(atlas,original);else if(original!==atlases.get(atlas)){o.material.map=atlases.get(atlas);original.dispose();}}o.material.roughness=name.startsWith('furniture-')?.65:name.startsWith('park-')?.9:.8;o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722))), diffuseColor.rgb, 0.82);');};}});return g.scene;}));
 return (await cache.get(name)).clone(true);
}
export async function upgradeCafe(world){
 const names=['house-house','house-fence_straight','house-package','park-bench','park-street_lantern','park-tree','park-bush','park-hedge_straight','park-flower_A','park-flower_B','park-grass_A','furniture-table_small','furniture-chair_A_wood','furniture-book_single','furniture-cactus_medium_A','furniture-cactus_small_A','city-box_A'];
 const loaded=await Promise.all(names.map(async n=>[n,await asset(n)]));const templates=Object.fromEntries(loaded);
 const group=new T.Group();group.name='Cafe benchmark • CC0 assets';const sway=[],steam=[],lights=[],trees=[];
 const palette={cream:0xf3dfb4,green:0x647f6e,wood:0x795a48,metal:0x344952};
 function box(color,x,y,z,w,h,d,parent=group){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.75}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function put(name,x,z,scale=1,y=.18,rotation=0){const model=templates[name].clone(true),holder=new T.Group();holder.add(model);if(name==='house-fence_straight')model.position.x-=.5;holder.position.set(x,y,z);holder.scale.setScalar(scale);holder.rotation.y=rotation;group.add(holder);if(['park-bush','park-hedge_straight','house-fence_straight'].includes(name))addPropFootprint(world.colliders,holder);return holder;}
 // All large and medium forms below are existing licensed meshes.
 const house=put('house-house',-5.35,-6.1,.79,.18);house.name='Tiny Treats house adapted as cafe';
 put('park-bench',-5,2.5,.95,.18,Math.PI/10);
 put('park-street_lantern',-3.1,-3.6,.78,.18);
 put('park-street_lantern',-7.75,-.25,.72,.18);
 for(const [x,z,s] of [[-8.6,-6.3,1.3],[-8.2,-1.1,1.12],[-7.9,2.1,.9]]){const tree=put('park-tree',x,z,s);trees.push(tree);sway.push({object:tree,amount:.008,phase:x});}
 for(const [x,z,r] of [[-8,-3.4,0],[-7.8,-5.4,0],[-7.6,2.1,Math.PI/2]])put('park-hedge_straight',x,z,.8,.18,r);
 for(const [x,z] of [[-7,-3.4],[-3.2,-4.7],[-7.4,.8]])put('park-bush',x,z,.6);
 put('house-fence_straight',-7.4,1.2,.65,.18,Math.PI/2);
 // Keep the central path and original cafe-table collision footprint open.
 for(const [x,z] of [[-5,-2.7],[-5.8,.3]]){
  put('furniture-table_small',x,z,.75);
  put('furniture-chair_A_wood',x-.75,z,.72,.18,Math.PI/2);put('furniture-chair_A_wood',x+.75,z,.72,.18,-Math.PI/2);
  put('furniture-book_single',x-.15,z,.24,.955,Math.PI/6);
  put('furniture-cactus_small_A',x+.15,z-.16,.22,.94);
  // The original coffee cup is reused; a small steam effect is added above it.
  const cup=new T.Mesh(new T.CylinderGeometry(.07,.06,.13,16),new T.MeshStandardMaterial({color:0xf7e5bd,roughness:.35}));cup.position.set(x+.17,1,z+.18);group.add(cup);
  const handle=new T.Mesh(new T.TorusGeometry(.04,.015,6,12),cup.material);handle.position.set(x+.24,1,z+.18);group.add(handle);
  for(let i=0;i<3;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:steamTexture(),transparent:true,opacity:.13,depthWrite:false,color:0xffecd6}));puff.position.set(x+.17,1.13+i*.13,z+.18);puff.scale.set(.18,.18,.18);group.add(puff);steam.push({object:puff,x:x+.17,z:z+.18,phase:i/3});}
 }
 put('furniture-cactus_medium_A',-3.8,-4.15,.53);put('furniture-cactus_medium_A',-6.9,-4.15,.46);
 put('house-package',-7.1,-5.15,.45);put('city-box_A',-7.45,-4.55,.42);
 // Same grid, height, joints and palette as the rest of the plaza.
 const paving=[];
 for(let x=-10;x<=-4;x++)for(let z=-7;z<=1;z++)paving.push([x,z]);
 group.add(squarePaving(paving));
 for(let i=0;i<32;i++){const x=i<16?-7.55+(i%4)*.22:-3.15+(i%3)*.14,z=i<16?-3.4+Math.floor(i/4)*.85:-5.4+Math.floor((i-16)/3)*.3;const flower=put(i%3?'park-flower_A':'park-flower_B',x,z,.32+(i%3)*.09);sway.push({object:flower,amount:.045,phase:i});}
 for(let i=0;i<12;i++)put('park-grass_A',-7.8+(i%3)*.2,-3.7+Math.floor(i/3)*1.1,.4);
 // Modifications to the existing house: fabric canopy, sign and warm windows.
 for(let i=0;i<12;i++){const strip=box(i%2?palette.cream:palette.green,-6.82+i*.27,2.85,-3.76,.275,.08,1.03);strip.rotation.x=.12;box(i%2?palette.cream:palette.green,-6.82+i*.27,2.68,-3.22,.275,.25,.04);}
 box(palette.metal,-6.98,2.28,-3.26,.045,.9,.045);box(palette.metal,-3.66,2.28,-3.26,.045,.9,.045);
 label('ELSEWHERE','COFFEE · IDEAS · COMPANY',-5.35,3.27,-3.91,2.6,.61);
 const board=box(palette.wood,-3.22,.8,-2.1,.66,1.2,.1);board.rotation.y=-.2;const menu=label('OPEN','COFFEE + IDEAS',-3.232,.88,-2.03,.59,.85,true);menu.rotation.y=-.2;
 // Warm light is local to this block, keeping the rest of the town intact.
 for(const [x,y,z,power] of [[-5.35,2.25,-3.95,8],[-3.1,2.75,-3.6,9],[-7.75,2.65,-.25,10]]){const light=new T.PointLight(0xffc47e,power,5.5,2);light.position.set(x,y,z);group.add(light);lights.push({light,power});}
 for(const [x,y,z] of [[-3.1,2.97,-3.6],[-7.75,2.78,-.25]]){const bulb=new T.Mesh(new T.SphereGeometry(.11,12,8),new T.MeshBasicMaterial({color:0xffd597}));bulb.scale.y=1.4;bulb.position.set(x,y,z);group.add(bulb);}
 const fill=new T.PointLight(0xb9cce8,9,10,2);fill.position.set(-5,5,0);group.add(fill);
 // Commit only after every dependency loaded successfully; retain original colliders.
 world.cafeObjects.forEach(o=>o.visible=false);world.scene.add(group);
 world.colliders.push({x:-3.22,z:-2.1,hw:.32,hd:.12},{x:-8.2,z:-1.1,hw:.25,hd:.25},{x:-5.35,z:-3.65,hw:.7,hd:.35},{x:-5.8,z:.3,hw:.65,hd:.65},{x:-7.75,z:-.25,hw:.18,hd:.18});
 return {group,assetCount:names.length,setTreesVisible(visible){for(const tree of trees)tree.visible=visible;},update(t,episode){const warmth=episode?.active?Math.max(.08,episode.warmth/100):1;for(const s of sway)s.object.rotation.z=Math.sin(t*1.2+s.phase)*s.amount;for(const s of steam){const p=(t*.23+s.phase)%1;s.object.position.set(s.x+Math.sin(t+s.phase)*.035,1.08+p*.45,s.z);s.object.material.opacity=(1-p)*.12*warmth;s.object.scale.setScalar(.10+p*.15);}for(const l of lights){l.light.intensity=l.power*(.15+.85*warmth)*(1+Math.sin(t*2.4)*.008);l.light.color.set(episode?.active&&warmth<.25?0xb4cedf:0xffc47e);}}};
 function label(title,subtitle,x,y,z,w,h,portrait=false){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=portrait?1106:256;const c=canvas.getContext('2d');if(portrait){c.scale(1,1106/256);}c.fillStyle='#283f3f';c.fillRect(0,0,768,256);c.strokeStyle='#d2b982';c.lineWidth=5;c.strokeRect(12,12,744,232);c.fillStyle='#f1dfb3';c.textAlign='center';c.font=portrait?'bold 116px Georgia':'bold 65px Georgia';c.fillText(title,384,portrait?105:115);c.font=portrait?'32px sans-serif':'22px sans-serif';c.fillText(subtitle,384,177);if(portrait){c.setTransform(1,0,0,1,0,0);c.fillStyle='#283f3f';c.fillRect(0,0,768,1106);c.strokeStyle='#d2b982';c.lineWidth=12;c.strokeRect(24,24,720,1058);c.fillStyle='#f1dfb3';c.font='bold 145px Georgia';c.fillText(title,384,310);c.font='46px sans-serif';c.fillText('COFFEE',384,560);c.fillText('+ IDEAS',384,650);c.font='35px sans-serif';c.fillText('COME ON IN',384,890);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));plane.position.set(x,y,z);group.add(plane);return plane;}
}
let steamMap;
function steamTexture(){if(steamMap)return steamMap;const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);return steamMap=new T.CanvasTexture(c);}
