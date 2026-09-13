// Bounded A* with collision checks along every edge, including diagonal corners.
// Pure JavaScript so the same routes can be checked without WebGL.
export function clearSegment(a,b,canWalk,step=.24){
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/step));
  for(let i=1;i<=count;i++)if(!canWalk(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;
  return true;
}
export function findPath(start,goal,canWalk,{step=.65,maxNodes=9000}={}){
  if(clearSegment(start,goal,canWalk))return [{x:goal.x,z:goal.z}];
  const key=(x,z)=>x+','+z,point=(x,z)=>({x:x*step,z:z*step});
  function snap(p){
    const x=Math.round(p.x/step),z=Math.round(p.z/step),options=[];
    for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
      const q=point(x+dx,z+dz);
      if(canWalk(q.x,q.z)&&clearSegment(p,q,canWalk))options.push({x:x+dx,z:z+dz,d:Math.hypot(q.x-p.x,q.z-p.z)});
    }
    return options.sort((a,b)=>a.d-b.d)[0];
  }
  const first=snap(start),last=snap(goal);if(!first||!last)return [];
  const heuristic=(x,z)=>Math.hypot(x-last.x,z-last.z),open=[{...first,g:0,f:heuristic(first.x,first.z)}],cost=new Map([[key(first.x,first.z),0]]),parents=new Map(),closed=new Set();
  let count=0;
  while(open.length&&count++<maxNodes){
    let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
    const current=open.splice(best,1)[0],ck=key(current.x,current.z);if(closed.has(ck))continue;closed.add(ck);
    if(current.x===last.x&&current.z===last.z){
      const path=[{x:goal.x,z:goal.z},point(current.x,current.z)];let cursor=ck;
      while(parents.has(cursor)){const p=parents.get(cursor);path.push(point(p.x,p.z));cursor=key(p.x,p.z);}
      path.reverse();const smooth=[];let from=start;
      for(let i=0;i<path.length;){let j=i;while(j+1<path.length&&clearSegment(from,path[j+1],canWalk))j++;smooth.push(path[j]);from=path[j];i=j+1;}
      return smooth;
    }
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=current.x+dx,z=current.z+dz,k=key(x,z);if(closed.has(k))continue;
      const p=point(x,z);if(!canWalk(p.x,p.z)||!clearSegment(point(current.x,current.z),p,canWalk))continue;
      const g=current.g+Math.hypot(dx,dz);if(g>=(cost.get(k)??Infinity))continue;
      cost.set(k,g);parents.set(k,current);open.push({x,z,g,f:g+heuristic(x,z)});
    }
  }
  return [];
}
