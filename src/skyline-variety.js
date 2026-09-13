import * as T from '/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Six architectural families, all in the little town's ceramic/wood palette.
// Geometry is instanced by material; floors and silhouettes differ, not just tint.
export function createVariedSkyline(scene,originalPlots){
  const plots=originalPlots.map((p,i)=>({...p,...(i===12?{x:12,z:25}:{}),family:i%6}));
  const group=new T.Group();group.name='明日の街 · six building families';scene.add(group);
  const geometries={box:new RoundedBoxGeometry(1,1,1,2,.065),cylinder:new T.CylinderGeometry(1,1,1,20),cone:new T.ConeGeometry(1,1,20),sphere:new T.SphereGeometry(1,16,10)};
  const palettes=[{wall:0xd6cbbb,trim:0x83a093,glass:0x648c99},{wall:0x8faba8,trim:0xccc6ac,glass:0x426d83},{wall:0xbda2a1,trim:0x526d7a,glass:0x739398},{wall:0xaec4bc,trim:0x607f88,glass:0x507481},{wall:0xd6c9aa,trim:0x9f7f83,glass:0x729fa8},{wall:0xc4cbb5,trim:0x98a88b,glass:0x70939b}];
  const pools=new Map(),materials=new Map(),local=new T.Object3D();
  function piece(id,shape,color,x,y,z,w,h,d,rotation=0,glow=0){
    const key=shape+':'+color+':'+glow;
    if(!materials.has(color+':'+glow))materials.set(color+':'+glow,new T.MeshStandardMaterial({color,roughness:.64,emissive:glow?color:0,emissiveIntensity:glow}));
    if(!pools.has(key))pools.set(key,{geometry:geometries[shape],material:materials.get(color+':'+glow),parts:[]});
    local.position.set(x,y,z);local.rotation.set(0,rotation,0);local.scale.set(w,h,d);local.updateMatrix();pools.get(key).parts.push({id,matrix:local.matrix.clone()});
  }
  function block(id,color,x,y,z,w,h,d,glow=0){piece(id,'box',color,x,y,z,w,h,d,0,glow);}
  function windows(id,x,y,z,w,d,columns=3,height=.7,color=0xf0d7a2){
    for(const side of [-1,1]){
      for(let col=0;col<columns;col++)block(id,color,x+(col-(columns-1)/2)*w/(columns+.8),y,z+side*(d/2+.025),w/(columns+2.1),height,.044,.42);
      for(let col=0;col<2;col++)block(id,color,x+side*(w/2+.025),y,z+(col-.5)*d/2.1,.044,height,d/3.7,.42);
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
        for(let f=0;f<10;f++){const angle=f*Math.PI/5;piece(i,'box',0xc9e0d5,Math.sin(angle)*1.57,y,Math.cos(angle)*1.57,.47,.85,.055,angle,.42);}}
      piece(i,'cylinder',a.trim,0,h+.37,0,1.71,.2,1.71);piece(i,'cone',0xaa8c85,0,h+1,0,1.7,1.12,1.7);
      piece(i,'sphere',0xd8c99c,0,h+1.68,0,.14,.22,.14,0,.3);
    }else if(p.family===2){ // Unequal twin towers with a small connecting bridge.
      for(const side of [-1,1]){const height=h*(side<0?1:.77),x=side*.92;
        block(i,a.wall,x,height/2+.35,0,1.55,height,2.8);
        for(let y=1.15;y<height;y+=1.35){windows(i,x,y,0,1.55,2.8,1,.74,0xd3e3d4);block(i,a.trim,x,y+.55,0,1.67,.11,2.93);}
        block(i,a.trim,x,height+.38,0,1.8,.32,3.08);
      }
      block(i,0x9ab7af,0,h*.59,0,3.5,.78,1.12);block(i,0xd9e2d5,0,h*.59,.58,3.2,.38,.04,.38);
    }else if(p.family===3){ // Glazed office, vertical fins, broad low podium.
      block(i,a.wall,0,1.35,0,3.9,2.4,3.5);windows(i,0,1.4,0,3.9,3.5,4,1.1);
      block(i,a.glass,0,(h+2.6)/2,0,3.08,h-2.6,2.7);
      for(let y=3.25;y<h;y+=1.3)windows(i,0,y,0,3.08,2.7,4,.72,0xc0d9d6);
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
  for(const pool of pools.values()){const mesh=new T.InstancedMesh(pool.geometry,pool.material,pool.parts.length);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);batches.push({...pool,mesh});}
  const roots=plots.map(()=>new T.Matrix4()),root=new T.Object3D(),m=new T.Matrix4();
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  return {group,plots,update(time){
    plots.forEach((p,i)=>{root.position.set(p.x,.13,p.z);root.rotation.set(0,p.rotation,0);root.scale.set(1,Math.max(.00001,smooth((time-p.at)/2.7)),1);root.updateMatrix();roots[i].copy(root.matrix);});
    for(const b of batches){b.parts.forEach((part,i)=>{m.multiplyMatrices(roots[part.id],part.matrix);b.mesh.setMatrixAt(i,m);});b.mesh.instanceMatrix.needsUpdate=true;}
  }};
}
