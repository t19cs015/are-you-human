import * as T from '/node_modules/three/build/three.module.js';

export function createEpisodeWorld(world){
  const group=new T.Group();group.name='One warm light — recovered heat';group.visible=false;world.scene.add(group);
  const route=new T.CatmullRomCurve3([[1.8,.45,29],[2.2,.45,25],[2.2,.45,18],[2.2,.45,10],[1.8,.45,4],[-2.2,.45,2.5],[-4.4,.65,-2.2]].map(p=>new T.Vector3(...p)),false,'catmullrom',.06);
  const pipeMaterial=new T.MeshStandardMaterial({color:0x667d81,roughness:.55,metalness:.3,emissive:0xf9b769,emissiveIntensity:0});
  const pipe=new T.Mesh(new T.TubeGeometry(route,100,.07,8,false),pipeMaterial);group.add(pipe);
  const flowing=new T.Group();group.add(flowing);const beads=[];
  for(let i=0;i<18;i++){const bead=new T.Mesh(new T.SphereGeometry(.11,8,6),new T.MeshBasicMaterial({color:0xffcc83}));flowing.add(bead);beads.push(bead);}
  const glow=new T.PointLight(0xffc47e,0,7,2);glow.position.set(-4,1,-1.8);group.add(glow);
  const steam=[];
  for(let i=0;i<7;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(.24,1),new T.MeshBasicMaterial({color:0xe9d3b6,transparent:true,opacity:.15,depthWrite:false}));group.add(puff);steam.push(puff);}
  const seat=new T.Group();seat.position.set(-4.3,.18,-.3);seat.rotation.y=.35;group.add(seat);
  const wood=new T.MeshStandardMaterial({color:0x755a4a,roughness:.8}),cushion=new T.MeshStandardMaterial({color:0xe4ac8e,roughness:.9});
  function part(w,h,d,x,y,z,mat){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);seat.add(mesh);}
  part(.52,.11,.52,0,.5,0,cushion);part(.52,.45,.08,0,.83,-.22,wood);
  for(const x of [-.2,.2])for(const z of [-.2,.2])part(.06,.5,.06,x,.25,z,wood);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#eee0bd';c.fillRect(0,0,256,128);c.fillStyle='#634d45';c.font='italic 31px Georgia';c.textAlign='center';c.fillText('Your seat.',128,73);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const card=new T.Mesh(new T.PlaneGeometry(.45,.22),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));card.position.set(0,.85,-.165);seat.add(card);
  return {update(t,city){const e=city?.episode;group.visible=!!e?.active;if(!e?.active)return;
    const connected=!!e.supply.heat;pipe.visible=!!e.installed.heat_route||!!e.installed.heat_coil;flowing.visible=connected;pipeMaterial.emissiveIntensity=connected?.6:0;glow.intensity=connected?6:0;seat.visible=['returning','won'].includes(e.stage);
    for(let i=0;i<beads.length;i++)beads[i].position.copy(route.getPointAt((t*.035+i/beads.length)%1));
    for(let i=0;i<steam.length;i++){const p=(t*.25+i/steam.length)%1;steam[i].position.set(.6+Math.sin(i+t*.5)*.25,1+p*2,29.3);steam[i].scale.setScalar(.6+p*2);steam[i].material.opacity=e.supply.central?(1-p)*(connected?.055:.18):0;}
  }};
}
