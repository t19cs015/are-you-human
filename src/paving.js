import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Fine mineral grain and worn edges, at the same height and footprint as the paths.
const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
for(let i=0;i<128*128;i++){const grain=204+Math.floor((Math.sin(i*12.9898)*43758.5453%1+1)*19);pixels.data.set([grain,grain,grain,255],i*4);}
ctx.putImageData(pixels,0,0);
const grain=new T.CanvasTexture(canvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;
const geometry=new RoundedBoxGeometry(.73,.045,.73,1,.012);
const materials=[0x999b90,0xa8a595,0x929a91].map(color=>new T.MeshStandardMaterial({color,roughness:.9,roughnessMap:grain,bumpMap:grain,bumpScale:.021}));
export function squarePaving(cells){
 const group=new T.Group();group.name='Shared square paving';
 for(let palette=0;palette<materials.length;palette++){
  const selected=cells.filter(([x,z])=>Math.abs(x*13+z*7)%3===palette);
  if(!selected.length)continue;
  const mesh=new T.InstancedMesh(geometry,materials[palette],selected.length),matrix=new T.Matrix4(),tint=new T.Color();
  selected.forEach(([x,z],i)=>{mesh.setMatrixAt(i,matrix.makeTranslation(x*.78,.15,z*.78));mesh.setColorAt(i,tint.setScalar(.94+Math.abs(Math.sin(x*34.17+z*19.83))*.06));});
  mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
