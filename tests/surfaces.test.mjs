import test from 'node:test';
import assert from 'node:assert/strict';
import {ShapeUtils,Vector2} from 'three';
import {surfaces} from '../src/surface-data.js';
import {buildSurfaces} from '../scripts/build-surfaces.mjs';

test('roads form one connected surface and triangulate without overlapping faces',()=>{
  assert.deepEqual(surfaces,buildSurfaces(),'regenerate surfaces after changing the paths');
  assert.equal(surfaces.roads.length,1);assert.equal(surfaces.land.length,1);
  for(const polygons of Object.values(surfaces))for(const [outer,...holes] of polygons){
    const vectors=ring=>ring.slice(0,-1).map(([x,z])=>new Vector2(x,-z));
    const contour=vectors(outer),cutouts=holes.map(vectors),vertices=[...contour,...cutouts.flat()];
    const triangles=ShapeUtils.triangulateShape(contour,cutouts);
    const area=Math.abs(ShapeUtils.area(contour))-cutouts.reduce((a,h)=>a+Math.abs(ShapeUtils.area(h)),0);
    const triangleArea=triangles.reduce((sum,indices)=>sum+Math.abs(ShapeUtils.area(indices.map(i=>vertices[i]))),0);
    assert.ok(Math.abs(area-triangleArea)<1e-6,'triangulation neither doubles nor omits surface area');
  }
});
