import * as T from '/node_modules/three/build/three.module.js';
import {surfaces} from './surface-data.js';
import {groundMaterial} from './ground-material.js';

export function createTownSurfaces(scene){
  const group=new T.Group();group.name='Continuous town ground and paths';scene.add(group);
  function shapes(polygons){return polygons.map(([outer,...holes])=>{
    const vectors=ring=>ring.map(([x,z])=>new T.Vector2(x,-z));
    const shape=new T.Shape(vectors(outer));shape.holes=holes.map(r=>new T.Path(vectors(r)));return shape;
  });}
  const land=new T.Mesh(new T.ExtrudeGeometry(shapes(surfaces.land),{depth:.7,bevelEnabled:false,steps:1}),groundMaterial(0x697d65));
  land.rotation.x=-Math.PI/2;land.position.y=-.66;land.receiveShadow=true;group.add(land);
  const road=new T.Mesh(new T.ShapeGeometry(shapes(surfaces.roads)),groundMaterial(0xa6a08c));
  road.rotation.x=-Math.PI/2;road.position.y=.115;road.receiveShadow=true;road.name='Single road surface';group.add(road);
  return group;
}
