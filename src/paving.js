import * as T from '/node_modules/three/build/three.module.js';

const geometry=new T.BoxGeometry(.73,.045,.73);
const materials=[0x9c9c90,0xa5a498,0x92988e].map(color=>new T.MeshStandardMaterial({color,roughness:.83}));
export function squarePaving(cells){
 const group=new T.Group();group.name='Shared square paving';
 for(let palette=0;palette<materials.length;palette++){
  const selected=cells.filter(([x,z])=>Math.abs(x*13+z*7)%3===palette);
  if(!selected.length)continue;
  const mesh=new T.InstancedMesh(geometry,materials[palette],selected.length),matrix=new T.Matrix4();
  selected.forEach(([x,z],i)=>mesh.setMatrixAt(i,matrix.makeTranslation(x*.78,.15,z*.78)));
  mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
