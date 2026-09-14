import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {roadSigns,signObstacles} from './street-layout.js';
export function addPropFootprint(colliders,object){
  object.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(object);
  colliders.push({x:(bounds.min.x+bounds.max.x)/2,z:(bounds.min.z+bounds.max.z)/2,hw:(bounds.max.x-bounds.min.x)/2,hd:(bounds.max.z-bounds.min.z)/2});
}
export function createRoadSigns(world){
  const wood=new T.MeshStandardMaterial({color:0x8e7357,roughness:.78}),rim=new T.MeshStandardMaterial({color:0xc6b58c,roughness:.55});
  for(const p of roadSigns){
    const root=new T.Group();root.position.set(p.x,.12,p.z);world.scene.add(root);
    const post=new T.Mesh(new T.CylinderGeometry(.075,.105,1.8,10),wood);post.position.y=.9;root.add(post);
    p.labels.forEach((label,i)=>{
      const plank=new T.Mesh(new RoundedBoxGeometry(p.width,.36,.12,2,.05),rim);plank.position.y=1.58-i*.43;root.add(plank);
      const c=document.createElement('canvas');c.width=640;c.height=144;const ctx=c.getContext('2d');ctx.fillStyle='#425e54';ctx.fillRect(0,0,640,144);ctx.fillStyle='#f6e6bf';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=label.length>10?'44px Georgia':'bold 54px sans-serif';ctx.fillText(label,320,74);
      const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
      for(const side of [-1,1]){const face=new T.Mesh(new T.PlaneGeometry(p.width-.10,.28),new T.MeshBasicMaterial({map}));face.position.set(0,plank.position.y,side*.066);face.rotation.y=side===1?0:Math.PI;root.add(face);}
    });
  }
  world.colliders.push(...signObstacles);
}
