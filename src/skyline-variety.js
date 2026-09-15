import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Six architectural families, all in the little town's ceramic/wood palette.
// Geometry is instanced by material; floors and silhouettes differ, not just tint.
export function createVariedSkyline(scene,originalPlots){
  const plots=originalPlots.map((p,i)=>({...p,family:i%6}));
  const group=new T.Group();group.name='明日の街 · six building families';scene.add(group);
  const geometries={box:new RoundedBoxGeometry(1,1,1,2,.065),pane:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,20),cone:new T.ConeGeometry(1,1,20),sphere:new T.SphereGeometry(1,16,10)};
  for(const geometry of Object.values(geometries))geometry.computeBoundingBox();
  const palettes=[{wall:0xd6cbbb,trim:0x83a093,glass:0x648c99},{wall:0x8faba8,trim:0xccc6ac,glass:0x426d83},{wall:0xbda2a1,trim:0x526d7a,glass:0x739398},{wall:0xaec4bc,trim:0x607f88,glass:0x507481},{wall:0xd6c9aa,trim:0x9f7f83,glass:0x729fa8},{wall:0xc4cbb5,trim:0x98a88b,glass:0x70939b}];
  const pools=new Map(),materials=new Map(),local=new T.Object3D();
  function piece(id,shape,color,x,y,z,w,h,d,rotation=0,glow=0){
    const key=shape+':'+color+':'+glow;
    if(!materials.has(color+':'+glow))materials.set(color+':'+glow,new T.MeshPhysicalMaterial({color,roughness:glow?.28:.54,metalness:glow?.1:.025,clearcoat:glow?.38:.16,clearcoatRoughness:.3,emissive:glow?color:0,emissiveIntensity:glow}));
    if(!pools.has(key))pools.set(key,{geometry:geometries[shape],material:materials.get(color+':'+glow),parts:[]});
    local.position.set(x,y,z);local.rotation.set(0,rotation,0);local.scale.set(w,h,d);local.updateMatrix();
    const bounds=geometries[shape].boundingBox;
    pools.get(key).parts.push({id,matrix:local.matrix.clone(),bottom:y+bounds.min.y*h,top:y+bounds.max.y*h});
  }
  function block(id,color,x,y,z,w,h,d,glow=0){piece(id,'box',color,x,y,z,w,h,d,0,glow);}
  function windowStyle(id,y,col,side){const n=Math.abs(id*17+Math.round(y*10)+col*7+side*11)%11;return n<3?{color:0x355663,glow:0}:n<6?{color:0x9cc6c5,glow:.4}:{color:0xefc989,glow:.55};}
  function windows(id,x,y,z,w,d,columns=3,height=.7){
    for(const side of [-1,1]){
      for(let col=0;col<columns;col++){
        const px=x+(col-(columns-1)/2)*w/(columns+.8),ww=w/(columns+2.1),s=windowStyle(id,y,col,side);
        piece(id,'pane',0x536970,px,y,z+side*(d/2+.025),ww+.09,height+.1,.07);
        piece(id,'pane',s.color,px,y,z+side*(d/2+.07),ww,height,.024,0,s.glow);
        piece(id,'pane',0x627876,px,y,z+side*(d/2+.09),.028,height,.028);
        piece(id,'pane',0x849b93,px,y-height*.53,z+side*(d/2+.105),ww+.15,.07,.17);
        piece(id,'pane',0x627876,px,y+height*.14,z+side*(d/2+.095),ww,.027,.028);
      }
      for(let col=0;col<2;col++){
        const pz=z+(col-.5)*d/2.1,ww=d/3.7,s=windowStyle(id,y,col+columns,side);
        piece(id,'pane',0x536970,x+side*(w/2+.025),y,pz,.07,height+.1,ww+.09);
        piece(id,'pane',s.color,x+side*(w/2+.07),y,pz,.024,height,ww,0,s.glow);
        piece(id,'pane',0x627876,x+side*(w/2+.09),y,pz,.028,height,.028);
      }
    }
  }
  function garden(id,y,w,d){
    block(id,0x8b7a60,0,y,0,w,.16,d);
    for(const side of [-1,1]){block(id,0x718a79,side*(w/2-.35),y+.21,0,.42,.34,d*.75);for(let j=0;j<2;j++)piece(id,'sphere',0x80a291,side*(w/2-.35),y+.48,(j-.5)*d*.45,.38,.40,.36);}
  }
  for(let i=0;i<plots.length;i++){
    const p=plots[i],a=palettes[(i+Math.floor(i/6))%6],h=p.height*[.94,1.03,.9,1.0,.84,.48][p.family];
    block(i,0x5f7276,0,.14,0,3.55,.28,3.5);
    if(p.family===0){ // Terraced apartments, three setbacks and planted roofs.
      const floors=Math.max(5,Math.floor(h/1.45));
      for(let f=0;f<floors;f++){
        const w=3.45-Math.floor(f/(floors/3))*.45,d=3.3-Math.floor(f/(floors/3))*.28,y=.34+f*1.4;
        block(i,a.wall,0,y+.63,0,w,1.3,d);block(i,a.trim,0,y+1.28,0,w+.12,.12,d+.12);windows(i,0,y+.62,0,w,d,3,.7);
      }
      garden(i,.34+floors*1.4,2.05,2.1);
    }else if(p.family===1){ // A round municipal tower with a copper cone cap.
      piece(i,'cylinder',a.wall,0,h/2+.3,0,1.56,h,1.56);
      for(let y=1.2;y<h;y+=1.55){piece(i,'cylinder',a.trim,0,y-.58,0,1.64,.12,1.64);
        for(let f=0;f<10;f++){const angle=f*Math.PI/5,s=windowStyle(i,y,f,1);
          piece(i,'pane',0x536970,Math.sin(angle)*1.57,y,Math.cos(angle)*1.57,.56,.94,.075,angle);
          piece(i,'pane',s.color,Math.sin(angle)*1.62,y,Math.cos(angle)*1.62,.47,.85,.024,angle,s.glow);}}
      piece(i,'cylinder',a.trim,0,h+.37,0,1.71,.2,1.71);piece(i,'cone',0xaa8c85,0,h+1,0,1.7,1.12,1.7);
      piece(i,'sphere',0xd8c99c,0,h+1.68,0,.14,.22,.14,0,.3);
    }else if(p.family===2){ // Unequal twin towers with a small connecting bridge.
      for(const side of [-1,1]){const height=h*(side<0?1:.77),x=side*.92;
        block(i,a.wall,x,height/2+.35,0,1.55,height,2.8);
        for(let y=1.15;y<height;y+=1.35){windows(i,x,y,0,1.55,2.8,1,.74);block(i,a.trim,x,y+.55,0,1.67,.11,2.93);}
        block(i,a.trim,x,height+.38,0,1.8,.32,3.08);
      }
      block(i,0x9ab7af,0,h*.59,0,3.5,.78,1.12);block(i,0xd9e2d5,0,h*.59,.58,3.2,.38,.04,.38);
    }else if(p.family===3){ // Glazed office, vertical fins, broad low podium.
      block(i,a.wall,0,1.35,0,3.9,2.4,3.5);windows(i,0,1.4,0,3.9,3.5,4,1.1);
      block(i,a.glass,0,(h+2.6)/2,0,3.08,h-2.6,2.7);
      for(let y=3.25;y<h;y+=1.3)windows(i,0,y,0,3.08,2.7,4,.72);
      for(const x of [-1.55,-.52,.52,1.55])for(const side of [-1,1])block(i,a.wall,x,(h+2.5)/2,side*1.42,.13,h-2.3,.19);
      block(i,a.trim,0,h+.17,0,3.5,.34,3.1);block(i,a.trim,.6,h+.65,.5,.75,.9,.8);
    }else if(p.family===4){ // Art-deco stepped cap, warm narrow windows.
      for(let tier=0;tier<3;tier++){
        const th=h/3,w=3.45-tier*.55,d=3.2-tier*.36,y=.3+tier*th;
        block(i,a.wall,0,y+th/2,0,w,th,d);for(let f=0;f<Math.floor(th/1.3);f++)windows(i,0,y+.75+f*1.3,0,w,d,3,.84);
        block(i,a.trim,0,y+th,0,w+.17,.18,d+.17);
      }
      piece(i,'sphere',a.glass,0,h+.5,0,.65,.55,.65);block(i,0xc6b48a,0,h+1.4,0,.06,1.2,.06);
    }else{ // A low civic building with a greenhouse and a small clock turret.
      block(i,a.wall,0,h/2+.3,0,3.8,h,3.6);
      for(let y=1.2;y<h;y+=1.5){windows(i,0,y,0,3.8,3.6,3,.82);block(i,a.trim,0,y+.66,0,3.95,.13,3.8);}
      piece(i,'sphere',0x85afa9,-.3,h+.35,0,1.5,.72,1.3);block(i,a.trim,1.25,h+.75,.5,.65,1.25,.7);
      piece(i,'cone',0xa98a82,1.25,h+1.58,.5,.56,.58,.56);
      piece(i,'sphere',0xe4d4a7,1.25,h+.94,.89,.2,.2,.035,0,.18);
    }
  }
  const batches=[];
  for(const pool of pools.values()){const mesh=new T.InstancedMesh(pool.geometry,pool.material,pool.parts.length);mesh.castShadow=pool.geometry!==geometries.pane;mesh.receiveShadow=true;group.add(mesh);batches.push({...pool,mesh});}
  const roots=plots.map(()=>new T.Matrix4()),root=new T.Object3D(),m=new T.Matrix4();
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const finishedAt=Math.max(...plots.map(p=>p.at))+2.7;let previousTime=null,previousDevelopment=null;
  const heights=plots.map((_,id)=>Math.max(...batches.flatMap(b=>b.parts.filter(p=>p.id===id).map(p=>p.top)))),pieceMatrix=new T.Matrix4(),hiddenScale=new T.Vector3(.000001,.000001,.000001);let previousCaps=heights;
  return {group,plots,update(time){
    time=Math.min(time,finishedAt);if(time===previousTime&&previousDevelopment===null)return;previousTime=time;previousDevelopment=null;
    plots.forEach((p,i)=>{root.position.set(p.x,.13,p.z);root.rotation.set(0,p.rotation,0);root.scale.set(1,Math.max(.00001,smooth((time-p.at)/2.7)),1);root.updateMatrix();roots[i].copy(root.matrix);});
    for(const b of batches){b.parts.forEach((part,i)=>{m.multiplyMatrices(roots[part.id],part.matrix);b.mesh.setMatrixAt(i,m);});b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere();}
  },develop(progress){
    // Reveal the current buildings from the ground up. Existing floors, windows
    // and doors keep their proportions; roofs arrive after the final floor.
    progress=T.MathUtils.clamp(progress,0,1);if(progress===previousDevelopment)return previousCaps;
    previousDevelopment=progress;previousTime=null;
    // Each block has a deterministic start and pace. The skyline feels like
    // many local decisions accumulating instead of one duplicated extrusion.
    const caps=plots.map((p,i)=>{
      const delay=((i*7)%18)/18*.34;
      // Four landmark buildings take the whole remaining shot to finish. The
      // rest range from quick infill to medium growth, all in a shuffled order.
      const duration=i%5===0?1-delay:Math.min(1-delay,.24+((i*11)%7)/6*.36);
      const g=smooth((progress-delay)/duration);
      return T.MathUtils.lerp(Math.min(3.65,heights[i]),heights[i],g);
    });
    plots.forEach((p,i)=>{root.position.set(p.x,.13,p.z);root.rotation.set(0,p.rotation,0);root.scale.set(1,1,1);root.updateMatrix();roots[i].copy(root.matrix);});
    for(const b of batches){b.parts.forEach((part,i)=>{
      pieceMatrix.copy(part.matrix);const cap=caps[part.id];
      if(cap<=part.bottom)pieceMatrix.scale(hiddenScale);
      else if(cap<part.top){const ratio=(cap-part.bottom)/(part.top-part.bottom);pieceMatrix.elements[5]*=ratio;pieceMatrix.elements[13]=(part.bottom+cap)/2;}
      m.multiplyMatrices(roots[part.id],pieceMatrix);b.mesh.setMatrixAt(i,m);
    });b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere();}
    previousCaps=caps;return caps;
  }};
}
