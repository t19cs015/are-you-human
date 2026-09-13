// Shared, walkable arrival points in front of the imported entrance steps.
export const entrances={lab:[5.2,-2.35],library:[0,-3.5]};
export function roomAt(x,z){return Math.abs(z)<5.3?(Math.abs(x-40)<6.3?'lab':Math.abs(x-60)<6.3?'library':null):null;}
export function nearbyEntrance(x,z){
 return Object.entries(entrances).map(([id,p])=>({id,d:Math.hypot(x-p[0],z-p[1])})).filter(e=>e.d<2.1).sort((a,b)=>a.d-b.d)[0]?.id||null;
}
