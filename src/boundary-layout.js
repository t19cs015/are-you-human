// The restored town sits between two mist gates. Its river has an actual course.
export const riverCourse=[[-58,51,3.2],[-52,49,4.8],[-44,43.6,5.7],[-33,41,5.8],[-19,41,5.9],[0,41,6],[22,41.5,5.6],[35,43.2,5.4],[46,48,4.4],[57,52,3]];
export const riverJourneySeconds=28;
const mix=(a,b,t)=>a+(b-a)*t;
function curve(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
function center(u){
  const f=Math.max(0,Math.min(1,u))*(riverCourse.length-1),i=Math.min(riverCourse.length-2,Math.floor(f)),t=f-i;
  const a=riverCourse[Math.max(0,i-1)],b=riverCourse[i],c=riverCourse[i+1],d=riverCourse[Math.min(riverCourse.length-1,i+2)];
  return {x:curve(a[0],b[0],c[0],d[0],t),z:curve(a[1],b[1],c[1],d[1],t),width:mix(b[2],c[2],t)};
}
export function riverSample(u){
  const p=center(u),a=center(u-.001),b=center(u+.001),length=Math.hypot(b.x-a.x,b.z-a.z)||1;
  return {...p,dx:(b.x-a.x)/length,dz:(b.z-a.z)/length};
}
export function lanternJourney(elapsed){
  const progress=Math.max(0,Math.min(1,elapsed/riverJourneySeconds)),p=riverSample(mix(.433,1,progress));
  return {x:p.x+p.dz*1.1,z:p.z-p.dx*1.1,angle:Math.atan2(p.dx,p.dz),progress,opacity:progress===1?0:1-Math.max(0,(progress-.91)/.09)};
}
export const mistGates=[{x:-53,z:49.5,angle:Math.PI/2+.4},{x:53,z:50.8,angle:Math.PI/2-.35}];
export const boundarySpots={shore:{x:36.7,z:50.6},margin:{x:0,z:87.1}};
