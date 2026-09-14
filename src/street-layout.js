export const roadSigns=[{x:-3.25,z:10.5,labels:['Little Elsewhere'],width:1.7},{x:-3.35,z:20.1,labels:['← 川辺','工房 →'],width:1.55}];
export const signObstacles=roadSigns.map(p=>({x:p.x,z:p.z,hw:p.width/2+.08,hd:.18}));
export const townHedges=[[-8.8,3.25,0],[9.3,2.2,0],[7.5,2.1,0],[-3.1,6.5,Math.PI/2],[3.1,6.5,Math.PI/2]];
export function onPlazaApproach(x,z){return z>9&&Math.abs(x)<3.15;}
export function insideObstacle(x,z,c,padding=.35){return c.active!==false&&Math.abs(x-c.x)<c.hw+padding&&Math.abs(z-c.z)<c.hd+padding;}
// Segment / padded rectangle intersection catches even a very short corner crossing.
export function segmentHitsObstacle(a,b,c,padding=.35){
  if(c.active===false)return false;let lo=0,hi=1;
  for(const [axis,half] of [['x','hw'],['z','hd']]){const min=c[axis]-c[half]-padding+1e-8,max=c[axis]+c[half]+padding-1e-8,d=b[axis]-a[axis];
    if(Math.abs(d)<1e-12){if(a[axis]<=min||a[axis]>=max)return false;continue;}
    const t1=(min-a[axis])/d,t2=(max-a[axis])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;
  }
  return lo<hi;
}
