import * as T from '/node_modules/three/build/three.module.js';
import {world,visual,sceneAt,canvas,ctx,project} from '/timelapse.js';

const $=id=>document.getElementById(id),W=1920,H=1080,DURATION=60;
const {scene,camera,renderer,npcs}=world;
const manifest=await fetch('/arrival-manifest.json').then(r=>r.json());
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const ink='#f5e7d0',gold='#edc995',mint='#b1ddd7';
function text(value,x,y,size=27,color=ink,font='Arial',align='left'){
  ctx.font=`${font.startsWith('italic ')?'italic ':''}${size}px ${font.replace(/^italic /,'')}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);ctx.textAlign='left';
}
function tracking(value,x,y,size=14,color=gold,gap=2.5){ctx.font=`${size}px Arial`;ctx.fillStyle=color;for(const ch of value){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+gap;}}
function card(value,x,y,color=ink){ctx.font='24px Arial';const width=ctx.measureText(value).width+38;ctx.fillStyle='#1c3543e8';ctx.strokeStyle=color+'80';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x-width/2,y-28,width,44,12);ctx.fill();ctx.stroke();text(value,x,y+1,24,color,'Arial','center');}

// An original, simple human visitor: warm skin, eyes, hair, scarf and backpack.
// It has no screen face, antenna or connection to the central network.
const human=new T.Group(),humanBody=new T.Group();human.add(humanBody);scene.add(human);
const mats=new Map();
function material(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.72}));return mats.get(color);}
function sphere(parent,color,x,y,z,sx,sy=sx,sz=sx){const m=new T.Mesh(new T.SphereGeometry(1,24,16),material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,color,x,y,z,w,h,d){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;parent.add(m);return m;}
const coat=sphere(humanBody,0xe3c990,0,.95,0,.34,.48,.25);
const head=new T.Group();head.position.y=1.61;humanBody.add(head);
sphere(head,0xe8b68f,0,0,0,.32,.36,.30);
sphere(head,0x4c3932,0,.16,-.035,.33,.24,.30);
sphere(head,0x4c3932,-.23,.025,-.10,.11,.24,.2);
sphere(head,0x4c3932,.23,.06,-.10,.10,.22,.2);
for(const side of [-1,1]){sphere(head,0xe8b68f,side*.32,-.04,0,.065,.10,.065);sphere(head,0x3c3732,side*.105,-.025,.286,.026,.033,.016);}
sphere(head,0xdba582,0,-.085,.306,.045,.055,.035);
const smile=new T.Mesh(new T.TorusGeometry(.049,.008,6,20,Math.PI),material(0x9f6953));smile.rotation.z=Math.PI;smile.position.set(0,-.18,.277);head.add(smile);
const scarf=new T.Mesh(new T.TorusGeometry(.25,.068,10,24),material(0xc07852));scarf.rotation.x=Math.PI/2;scarf.position.y=1.30;humanBody.add(scarf);box(humanBody,0xc07852,.16,1.02,.245,.105,.44,.045);
const arms=[],legs=[];
for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.35,1.16,0);humanBody.add(arm);sphere(arm,0xe0c38f,side*.02,-.19,0,.09,.25,.095);sphere(arm,0xe8b68f,side*.03,-.4,0,.07,.085,.07);arms.push(arm);
  const leg=new T.Group();leg.position.set(side*.14,.60,0);humanBody.add(leg);sphere(leg,0x526b79,0,-.17,0,.105,.23,.10);sphere(leg,0x3f4746,0,-.39,.055,.125,.08,.19);legs.push(leg);
}
sphere(humanBody,0x8b6a4d,0,.94,-.26,.24,.31,.12);box(humanBody,0xc39c63,0,1.02,-.385,.32,.06,.035);
const humanRing=new T.Mesh(new T.RingGeometry(.50,.55,56),new T.MeshBasicMaterial({color:0xeac58e,transparent:true,opacity:.55,side:T.DoubleSide}));humanRing.rotation.x=-Math.PI/2;humanRing.position.y=.15;human.add(humanRing);
const humanLight=new T.PointLight(0xffd9a6,8,5,2);humanLight.position.set(0,2.4,0);human.add(humanLight);

const network=new T.Group();scene.add(network);
const links=npcs.map(n=>{
  const geometry=new T.BufferGeometry().setFromPoints(Array.from({length:49},()=>new T.Vector3()));
  const line=new T.Line(geometry,new T.LineBasicMaterial({color:0xa5dcd6,transparent:true,opacity:0}));line.frustumCulled=false;network.add(line);
  const dots=new T.InstancedMesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:0xc0e5da,transparent:true,opacity:0}),8);dots.frustumCulled=false;network.add(dots);return {id:n.id,line,dots};
});
const alliances=new T.Group();scene.add(alliances);
const bonds=['mia','shell'].map(id=>{const m=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xeec990,transparent:true,opacity:.8}));alliances.add(m);return {id,m};});
const dummy=new T.Object3D();
const intro={mia:{x:-2.7,z:1.2,yaw:.9,notice:.9},ren:{x:-.8,z:-.7,yaw:2.7,notice:1.35},tomo:{x:2.1,z:.7,yaw:-1.6,notice:1.8},shell:{x:2.9,z:3.1,yaw:-2.6,notice:2.2}};
function blendAngle(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}
function arrange(t,after=false){
  const travel=smooth(t/3.5);human.position.set(.1,.12,after?4.5:lerp(9.2,4.5,travel));human.rotation.y=Math.PI;
  const walking=!after&&t<3.5;
  arms.forEach((arm,i)=>arm.rotation.x=walking?Math.sin(t*9+i*Math.PI)*.35:Math.sin(t*1.4+i)*.025);
  legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(t*9+i*Math.PI)*.34:0);humanBody.position.y=walking?Math.abs(Math.sin(t*9))*.032:0;
  head.rotation.y=after?Math.sin(t*.35)*.13:lerp(0,-.25,smooth((t-2)/2));
  for(const n of npcs){const p=intro[n.id];let x=p.x,z=p.z;
    if(after){const a=smooth((t-44)/4);if(n.id==='mia'){x=lerp(p.x,-1.3,a);z=lerp(p.z,4,a);}if(n.id==='shell'){x=lerp(p.x,1.6,a);z=lerp(p.z,4,a);}}
    n.root.position.set(x,.09,z);const look=Math.atan2(human.position.x-x,human.position.z-z),turn=after?1:smooth((t-p.notice)/.9);
    n.root.rotation.y=blendAngle(p.yaw,look,turn);n.workProp.visible=false;
    visual.get(n.id).update(t,!after&&t>p.notice&&t<7.5?'surprised':after&&t>46?'thinking':'neutral',n.id==='mia'&&t>1.6&&t<4.6||n.id==='ren'&&t>5&&t<8.6,false);
  }
}
function updateLinks(t){
  const opacity=t<7?smooth((t-2.2)/2)*.13:t<16?.62:t<40?.23:.34;
  const center=new T.Vector3(0,t<16?5.6:25,33);
  for(const link of links){const n=npcs.find(n=>n.id===link.id),p=n.root.position.clone().add(new T.Vector3(0,1.8,0));
    const curve=new T.CatmullRomCurve3([p,p.clone().add(new T.Vector3(0,3,0)),new T.Vector3((p.x+center.x)/2,center.y+3,(p.z+33)/2),center]);
    const positions=link.line.geometry.attributes.position;
    curve.getPoints(48).forEach((point,i)=>positions.setXYZ(i,point.x,point.y,point.z));positions.needsUpdate=true;link.line.material.opacity=opacity;
    link.dots.material.opacity=opacity+.05;for(let i=0;i<8;i++){dummy.position.copy(curve.getPointAt((t*.14+i/8)%1));dummy.updateMatrix();link.dots.setMatrixAt(i,dummy.matrix);}link.dots.instanceMatrix.needsUpdate=true;
  }
  alliances.visible=t>45;
  for(const b of bonds){const n=npcs.find(n=>n.id===b.id),p=n.root.position.clone().add(new T.Vector3(0,.2,0));b.m.geometry.setFromPoints([human.position.clone().add(new T.Vector3(0,.08,0)),p]);b.m.material.opacity=smooth((t-45)/3)*.8;}
}
function cameraAt(t){
  if(t<8){const u=smooth(t/8);camera.position.set(lerp(7.5,6.0,u),lerp(4.7,4.1,u),lerp(12.3,10.8,u));camera.lookAt(-.05,1.1,3.0);camera.fov=49;}
  else if(t<16){camera.position.set(30,26,-17);camera.lookAt(-2,3,14);camera.fov=50;}
  else if(t<40){camera.position.set(47,42,-44);camera.lookAt(-7,7.5,21);camera.fov=46;}
  else if(t<55){camera.position.set(6.6,3.8,-3.7);camera.lookAt(.1,1.35,4.1);camera.fov=54;}
  else{camera.position.set(6.6,4.3,-3.7);camera.lookAt(-5,1.6,4.8);camera.fov=60;}
  camera.aspect=W/H;camera.updateProjectionMatrix();
}
function draw(t){
  const age=t<16?0:t<40?t-16:23.25;
  sceneAt(age);human.visible=true;
  if(t<16)arrange(t);else if(t>=40)arrange(t,true);else{human.position.set(.1,.12,4.5);human.rotation.y=Math.PI;}
  updateLinks(t);cameraAt(t);
  if(renderer.domElement.width!==W||renderer.domElement.height!==H)renderer.setSize(W,H,false);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  const top=ctx.createLinearGradient(0,0,0,270);top.addColorStop(0,'#142734db');top.addColorStop(1,'#14273400');ctx.fillStyle=top;ctx.fillRect(0,0,W,270);
  const bottom=ctx.createLinearGradient(0,800,0,H);bottom.addColorStop(0,'#10263300');bottom.addColorStop(1,'#102633f5');ctx.fillStyle=bottom;ctx.fillRect(0,800,W,280);
  text('Are You Human?',80,69,29,gold,'italic Georgia');tracking('A HUMAN ARRIVES. A COMMUNITY CHANGES.',1377,65,11,'#c3d3cd',1.65);
  if(t<8){
    if(t<1.8){ctx.globalAlpha=1-smooth((t-1)/.8);tracking('AN ORDINARY EVENING.',80,143,15);ctx.globalAlpha=1;}
    const h=project(human.position.clone().add(new T.Vector3(0,2.6,0)));if(t>2.5){ctx.globalAlpha=smooth((t-2.5)/1);card('YOU · HUMAN',h.x,h.y,gold);ctx.globalAlpha=1;}
    for(const n of npcs){const p=intro[n.id],u=(t-p.notice)/1.5;if(u>0&&u<1){const a=project(n.root.position.clone().add(new T.Vector3(0,2.75,0)));ctx.globalAlpha=Math.sin(Math.PI*u);card(n.id==='mia'?'Human?':'?',a.x,a.y,mint);ctx.globalAlpha=1;}}
  }else if(t<16){
    text('Everyone is connected.',80,165,53,ink,'Georgia');text('Except you.',80,227,53,gold,'Georgia');
    const h=project(human.position.clone().add(new T.Vector3(0,2.7,0)));card('NO CENTRAL LINK',h.x,h.y,gold);
    const central=project(new T.Vector3(0,7.0,33));card('CENTRAL',central.x,central.y,mint);
    if(t>12)tracking('INDIVIDUAL MINDS. A SHARED NETWORK.',80,289,13,'#b5d5d2',1.65);
  }else if(t<40){
    const day=1+Math.floor(smooth((age-3.5)/18.7)*30);tracking('NIGHT '+String(day).padStart(2,'0'),80,851,15,'#dce1d2',2.8);
    tracking('POWER  ·  WATER  ·  YOUR WORDS',80,886,12,'#b0c9cf',1.7);
    if(t<21){ctx.globalAlpha=1-smooth((t-19.4)/1.6);text('For a better tomorrow.',80,157,54,ink,'Georgia');ctx.globalAlpha=1;}
    if(t>27&&t<36){const words=['“I like it here.”','“We could help.”','“Maybe tomorrow.”'];for(let i=0;i<3;i++){
      const u=(t-27-i*1.25)/4.4;if(u<0||u>1)continue;const p=new T.Vector3(lerp(-3,0,u),lerp(2,23,u),lerp(2,33,u)),s=project(p);ctx.globalAlpha=Math.sin(Math.PI*u);card(words[i],s.x,s.y,'#e0bec7');ctx.globalAlpha=1;
    }}
  }else if(t<55){
    if(t<43.5)text('“It’s all for you.”',80,167,53,ink,'Georgia');
    else{
      const shade=ctx.createLinearGradient(0,0,720,0);shade.addColorStop(0,'#142a36d9');shade.addColorStop(1,'#142a3600');ctx.fillStyle=shade;ctx.fillRect(0,95,730,904);
      tracking('THE FUTURE IS A RELATIONSHIP.',80,151,13,mint,1.7);text('Work with Central.',80,217,47,ink,'Georgia');text('Or stand against it.',80,277,47,gold,'Georgia');
      if(t>46){ctx.globalAlpha=smooth((t-46)/.8);text('Who you trust.',82,386,29);ctx.globalAlpha=1;}
      if(t>48){ctx.globalAlpha=smooth((t-48)/.8);text('Who they work with.',82,433,29);ctx.globalAlpha=1;}
      if(t>50){ctx.globalAlpha=smooth((t-50)/.8);text('What this community becomes.',82,490,31,gold,'Georgia');ctx.globalAlpha=1;}
      if(t>52){const h=project(human.position.clone().add(new T.Vector3(0,2.55,0)));card('“Let’s decide together.”',h.x,h.y,gold);}
    }
  }else{
    const shade=ctx.createLinearGradient(0,0,920,0);shade.addColorStop(0,'#142a36eb');shade.addColorStop(.68,'#142a36cc');shade.addColorStop(1,'#142a3600');ctx.fillStyle=shade;ctx.fillRect(0,90,920,909);
    tracking('ONE HUMAN. A CONNECTED WORLD.',83,211,15,mint,2.2);text('Are You',77,344,103,ink,'Georgia');text('Human?',77,467,114,gold,'italic Georgia');
    text('A community shaped by you.',83,561,36,ink,'Georgia');text('Speak. Listen. See what they choose.',83,621,25,'#bdd2d3');
    text('Original residents & little world by Haruna · Built with OpenAI',83,700,16,'#adc0c6');
  }
  const clip=manifest.clips.find(c=>t>=c.start&&t<Math.min(c.end,c.start+c.duration/c.tempo)+.2);
  if(clip){
    ctx.font='32px Arial';const words=clip.text.split(/\s+/),lines=[];let line='';for(const word of words){if(ctx.measureText(line+' '+word).width>1630&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    if(clip.who!=='NARRATOR')tracking(clip.who,80,915-(lines.length-1)*20,13,mint,2.7);
    lines.forEach((l,i)=>text(l,W/2,lines.length>1?927+i*41:960,32,ink,'Arial','center'));
  }
  tracking('IN-ENGINE CONCEPT FILM · CINEMATIC STAGING',80,1031,11,'#9eb4bb',1.3);text('AI-generated voices',1670,1031,13,'#9eb4bb');
  ctx.fillStyle='#cdbf9b55';ctx.fillRect(80,999,1760,2);ctx.fillStyle=gold;ctx.fillRect(80,999,1760*t/DURATION,2);
  if(t>59.55){ctx.fillStyle=`rgba(16,31,41,${smooth((t-59.55)/.45)*.8})`;ctx.fillRect(0,0,W,H);}
  $('timestamp').textContent='00:'+String(Math.floor(t)).padStart(2,'0')+' / 01:00';$('time').value=t;
}
let current=0,playing=false,rendering=false,start=0,raf=0;
function stop(){playing=false;cancelAnimationFrame(raf);$('voice').pause();$('play').textContent='Preview with sound';}
function loop(now){if(!playing)return;current=Math.min(59.999,(now-start)/1000);draw(current);if(current>=59.99){stop();return;}raf=requestAnimationFrame(loop);}
$('play').onclick=async()=>{if(playing){stop();return;}if(current>59.8)current=0;playing=true;start=performance.now()-current*1000;$('play').textContent='Pause';$('voice').currentTime=current;await $('voice').play();raf=requestAnimationFrame(loop);};
$('time').oninput=()=>{if(rendering)return;stop();current=Number($('time').value);draw(current);};
$('render').onclick=async()=>{
  if(rendering)return;stop();rendering=true;for(const id of ['render','play','time'])$(id).disabled=true;
  try{
    let r=await fetch('/arrival/render/start',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);
    for(let frame=0;frame<1800;frame++){
      draw(frame/30);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      r=await fetch('/arrival/render/frame?index='+frame,{method:'POST',headers:{'Content-Type':'image/png'},body:png});if(!r.ok)throw new Error((await r.json()).error);$('status').textContent=`Rendering ${Math.round((frame+1)/18)}% · ${frame+1} / 1800`;
    }
    r=await fetch('/arrival/render/finish',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);$('status').textContent='Picture complete · 1800 frames / 60 seconds';
  }catch(error){$('status').textContent='Render failed: '+error.message;}finally{rendering=false;for(const id of ['render','play','time'])$(id).disabled=false;}
};
draw(0);$('play').disabled=$('render').disabled=false;$('status').textContent='Arrival, modernization, community · ready to preview';
