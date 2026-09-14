import * as T from '/node_modules/three/build/three.module.js';
export function createCentralPresence(world){
  const group=new T.Group();group.name='中央 · always present';group.position.set(0,.15,28.9);world.scene.add(group);
  const lightMat=new T.MeshBasicMaterial({color:0xbce6d9,transparent:true,opacity:.45,depthWrite:false});
  const pedestal=new T.Mesh(new T.CylinderGeometry(.75,.95,.25,36),new T.MeshStandardMaterial({color:0x7a9b93,roughness:.5}));pedestal.position.y=.12;group.add(pedestal);
  world.colliders.push({x:0,z:28.9,hw:.8,hd:.8});
  const beam=new T.Mesh(new T.CylinderGeometry(.9,.3,2.3,40,1,true),new T.MeshBasicMaterial({color:0x9ddbd5,transparent:true,opacity:.05,depthWrite:false,side:T.DoubleSide}));beam.position.y=1.4;group.add(beam);
  const head=new T.Group();head.position.y=2.65;head.rotation.y=Math.PI;group.add(head);
  // A shaded projection keeps the face legible against the lit windows behind it.
  const shell=new T.Mesh(new T.SphereGeometry(1,40,24),new T.MeshBasicMaterial({color:0x173f48,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));shell.scale.set(1.2,.94,.38);head.add(shell);
  const halo=new T.Mesh(new T.TorusGeometry(1.21,.014,6,80),lightMat);halo.scale.y=.78;head.add(halo);
  for(let i=0;i<3;i++){const y=(i-1)*.55,r=new T.Mesh(new T.TorusGeometry(1,.007,4,64),new T.MeshBasicMaterial({color:0xa5d6c8,transparent:true,opacity:.16,depthWrite:false}));r.rotation.x=Math.PI/2;r.scale.set(1.2*Math.sqrt(1-y*y/.94**2),.39,1);r.position.y=y;head.add(r);}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const face=new T.Mesh(new T.PlaneGeometry(2.05,1.45),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));face.position.z=.4;face.renderOrder=2;head.add(face);
  const glow=new T.PointLight(0x9ddbd5,2,5,2);glow.position.y=2.3;group.add(glow);
  let painted=-1;
  return {group,update(time,city,player,voiceState='idle'){
    const active=!!city?.community?.active;group.visible=active;if(!active)return;
    const distance=Math.hypot(player.x,player.z-28.9),attention=distance<10;
    const angle=attention?Math.atan2(player.x,player.z-28.9):Math.PI;
    const delta=Math.atan2(Math.sin(angle-head.rotation.y),Math.cos(angle-head.rotation.y));head.rotation.y+=delta*.045;
    head.position.y=2.65+Math.sin(time*.9)*.07;head.rotation.z=attention?Math.sin(time*.8)*.025:0;
    const speaking=voiceState==='speaking',thinking=voiceState==='thinking'||voiceState==='connecting';
    beam.material.opacity=attention?.07:.04;glow.intensity=attention?2.4:1.5;
    const frame=Math.floor(time*12);if(frame===painted)return;painted=frame;ctx.clearRect(0,0,512,384);ctx.fillStyle=thinking?'#efd9aa':'#c8f5e6';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=12;ctx.lineCap='round';
    const blink=time%5.5<.15,look=attention?Math.max(-9,Math.min(9,player.x*2)):0;
    for(const x of [166,346]){ctx.beginPath();ctx.ellipse(x+look,149,22,blink?3:thinking?13:32,0,0,Math.PI*2);ctx.fill();}
    if(speaking){ctx.beginPath();ctx.ellipse(256,254,24,7+Math.abs(Math.sin(time*11))*21,0,0,Math.PI*2);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(226,248);ctx.quadraticCurveTo(256,attention?279:260,286,248);ctx.stroke();}
    texture.needsUpdate=true;
  }};
}
