import {createVariedSkyline as skyline} from '/src/skyline-variety.js';
// Preserve the finished film's camera composition.
export function createVariedSkyline(scene,plots){return skyline(scene,plots.map((p,i)=>i===12?{...p,x:12,z:25}:p));}
