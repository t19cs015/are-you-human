import * as T from '/node_modules/three/build/three.module.js';
export const roomCenters={lab:40,library:60};
export function drawArtifact(canvas,project){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;const a=project?.revisions?.at(-1)?.artifact;
 ctx.fillStyle='#162c42';ctx.fillRect(0,0,w,h);ctx.fillStyle=a?.color||'#e8b86b';ctx.font='bold 22px sans-serif';ctx.fillText(project?.kind==='music'?'SOUND WORKSPACE':'DESIGN WORKSPACE',24,38);
 ctx.font='bold 30px sans-serif';wrap(ctx,a?.title||'作業を準備しています',24,90,w-48,39);
 ctx.font='18px sans-serif';ctx.fillStyle='#d5e0e8';wrap(ctx,a?.subtitle||project?.goal||'住民の試作品がここに表示されます。',24,180,w-48,28);
 if(project?.kind==='music'&&a){ctx.strokeStyle='#557588';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(24,300+i*14);ctx.lineTo(w-24,300+i*14);ctx.stroke();}ctx.fillStyle=a.color;a.notes.forEach((n,i)=>{ctx.beginPath();ctx.ellipse(35+i*(w-70)/a.notes.length,352-(n-48)*2,6,4,-.3,0,Math.PI*2);ctx.fill();});}
 else {ctx.fillStyle=a?.color||'#e8b86b';ctx.beginPath();ctx.arc(w-100,h-100,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#162c42';ctx.font='bold 40px sans-serif';ctx.fillText('↗',w-122,h-86);}
 ctx.fillStyle='#94b2c5';ctx.font='15px sans-serif';ctx.fillText(`${project?.owner||'LAB'} · v${project?.revision||0} · ${project?.phase||'draft'}`,24,h-24);
}
function wrap(ctx,text,x,y,max,line){let row='';for(const c of String(text)){if(ctx.measureText(row+c).width>max){ctx.fillText(row,x,y);y+=line;row='';}row+=c;}ctx.fillText(row,x,y);}
export function createStudio(world){
 const {scene}=world,displays=[],furniture=[];
 function box(color,x,y,z,w,h,d){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);scene.add(m);return m;}
 function screen(x,y,z,id){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=420;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(2.1,1.38),new T.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);scene.add(m);displays.push({canvas,texture,id,key:''});return canvas;}
 for(const [room,x] of Object.entries(roomCenters)){
  box(0x69757c,x,-.05,0,12,.15,10);box(0x34495c,x,2.1,-5,12,4.2,.2);box(0x34495c,x-6,2.1,0,.2,4.2,10);box(0x34495c,x+6,2.1,0,.2,4.2,10);box(0x24354a,x,4.25,0,12,.2,10);
  const light=new T.PointLight(0xffd4a0,70,18);light.position.set(x,3,0);scene.add(light);
  const deskStart=scene.children.length;
  for(const dx of [-2.8,2.8]){box(0x9a7e68,x+dx,.88,-1.9,2.7,.15,1.3);box(0x314452,x+dx,.44,-1.9,.16,.9,.9);box(0x516c78,x+dx,.5,-.45,.8,.14,.8);world.colliders.push({x:x+dx,z:-1.9,hw:1.35,hd:.65});}
  furniture.push(...scene.children.slice(deskStart));
  if(room==='lab'){screen(x-2.8,1.95,-2.25,'poster');screen(x+2.8,1.95,-2.25,'music');}
  else {const shelvesStart=scene.children.length;for(let shelf=-1;shelf<=1;shelf++){box(0x856d5c,x+shelf*3.3,1.3,-4.4,2.6,2.6,.6);for(let row=0;row<3;row++)for(let col=0;col<8;col++)box([0x9caeaf,0xba916a,0x617d94][col%3],x+shelf*3.3-1+col*.28,.6+row*.7,-4,.2,.5,.3);}furniture.push(...scene.children.slice(shelvesStart));const c=screen(x,2.3,-3.95,'library');const ctx=c.getContext('2d');ctx.fillStyle='#183449';ctx.fillRect(0,0,640,420);ctx.fillStyle='#f0d5a0';ctx.font='30px sans-serif';ctx.fillText('LIBRARY / 技術資料',25,55);ctx.font='22px sans-serif';['文字の可読性とコントラスト','音楽のテンポと音量の比較','歩行制御の実験ノート'].forEach((t,i)=>ctx.fillText(t,25,135+i*72));}
 }
 box(0x755f50,-2.2,1.1,4.6,.15,2.2,.2);screen(-2.2,2.2,4.7,'published');
 return {furniture,update(state){for(const d of displays){if(d.id==='library')continue;const p=d.id==='published'?state.projects?.find(p=>p.kind==='poster'&&p.published):state.projects?.find(p=>p.id===d.id);const key=JSON.stringify([p?.revision,p?.phase]);if(key===d.key)continue;d.key=key;drawArtifact(d.canvas,p);d.texture.needsUpdate=true;}}};
}
