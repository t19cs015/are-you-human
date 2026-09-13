import * as T from '/node_modules/three/build/three.module.js';
import {world,visual,sceneAt,canvas,ctx,project,cafe,city,plots,buildings} from '/timelapse.js';
import {createEpisodeWorld} from '/src/episode-world.js';
import {createVariedSkyline} from '/skyline-variety.js';

const $=id=>document.getElementById(id),W=1920,H=1080;
const {scene,camera,renderer,npcs}=world;
const [manifest,replay]=await Promise.all([fetch('/v3-manifest.json').then(r=>r.json()),fetch('/v1-replay.json').then(r=>r.json())]);
if(replay.decision.mode!=='live'||!replay.moments.won)throw new Error('The recorded AI cooperation must be live and reach its game-rule ending.');
const {lead,partner}=replay.decision,names={mia:'Mia',ren:'Ren',tomo:'Tomo',shell:'Shell'};
const discussion=replay.states[replay.moments.proposal].city.episode.discussion;
// Narrated excerpts must be present in the original model replies.
if(!discussion[0].text.includes(manifest.clips.find(c=>c.id==='shell_plan').text))throw new Error('Lead dialogue differs from the recorded decision.');
if(!discussion[1].text.includes('Yes.')||!discussion[1].text.includes('I’m heading to the cafe now.'))throw new Error('Partner dialogue differs from the recorded decision.');
buildings.forEach(b=>b.mesh.visible=false);
const skyline=createVariedSkyline(scene,plots),episode=createEpisodeWorld(world);
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const ink='#f5e7d0',gold='#edc995',mint='#b1ddd7';
const eye=1.67;
function text(value,x,y,size=27,color=ink,font='Arial',align='left'){
  ctx.font=`${font.startsWith('italic ')?'italic ':''}${size}px ${font.replace(/^italic /,'')}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);ctx.textAlign='left';
}
function tracking(value,x,y,size=14,color=gold,gap=2.5){ctx.font=`${size}px Arial`;ctx.fillStyle=color;for(const ch of value){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+gap;}}
function panel(x,y,w,h,opacity=.89){ctx.fillStyle=`rgba(20,42,53,${opacity})`;ctx.strokeStyle='#b8cec04d';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,w,h,17);ctx.fill();ctx.stroke();}
function wrap(value,x,y,width,size=27,lineHeight=37,color=ink){
  ctx.font=`${size}px Arial`;const rows=[];let line='';for(const word of value.split(/\s+/)){if(ctx.measureText(line+' '+word).width>width&&line){rows.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)rows.push(line);rows.forEach((line,i)=>text(line,x,y+i*lineHeight,size,color));return rows.length;
}
function bubble(value,point,who,color=mint,offset=0){
  const p=project(point);if(p.z>1||p.x<40||p.x>1880||p.y<120||p.y>850)return;
  ctx.font='24px Arial';const w=ctx.measureText(value).width+36,x=Math.min(W-w-45,Math.max(45,p.x-w/2+offset)),y=p.y-48;
  panel(x,y,w,68,.93);tracking(who,x+17,y+20,10,color,1.3);text(value,x+17,y+48,24,color);
  ctx.strokeStyle=color+'88';ctx.beginPath();ctx.moveTo(x+w/2,y+68);ctx.lineTo(p.x,p.y+25);ctx.stroke();
}
function meter(label,value,x,y,color){text(label,x,y,17,'#c9d8d5');text(Math.round(value)+'%',x+220,y,20,color,'Georgia');ctx.fillStyle='#647b7f66';ctx.fillRect(x,y+14,276,7);ctx.fillStyle=color;ctx.fillRect(x,y+14,276*clamp(value/100),7);}
function yaw(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}

const intro={mia:{x:-1.75,z:1.2,yaw:2.4,notice:.65},ren:{x:.4,z:-.35,yaw:-2.5,notice:1.35},tomo:{x:2.2,z:1.35,yaw:-2.15,notice:1.02},shell:{x:-3.05,z:.8,yaw:2.7,notice:1.65}};
function introAt(t){
  const u=smooth(Math.min(t,4.8)/4.8),walk=t<4.8;
  camera.position.set(lerp(.3,.05,u),eye+(walk?Math.sin(t*7.5)*.016:0),lerp(8.7,4.8,u));
  // A small glance toward the residents' voices; always the visitor's own eyes.
  camera.lookAt(t<4?lerp(-.2,.15,smooth(t/4)):Math.sin((t-4)*.6)*.28,1.35,1.15);camera.fov=65;
  for(const n of npcs){const p=intro[n.id],turn=smooth((t-p.notice)/.7),jump=Math.max(0,Math.sin((t-p.notice)*7))*Math.exp(-Math.max(0,t-p.notice)*2)*.07;
    n.root.position.set(p.x,.09+(t>p.notice?jump:0),p.z);const target=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
    n.root.rotation.y=yaw(p.yaw,target,turn);n.workProp.visible=false;
    const speaking=manifest.clips.some(c=>c.who===n.id.toUpperCase()&&t>=c.start&&t<Math.min(c.end,c.start+c.duration/c.tempo));
    visual.get(n.id).update(t,t>p.notice&&t<5.3?'surprised':t>=5.3?'happy':'neutral',speaking,false);
  }
  city.update(t,{active:true,repaired:true,booksDelivered:2,readingReady:true,carrying:{}});
}
function simulationAt(t){
  const m=replay.moments;
  if(t<32.8)return 44;
  if(t<40.5)return m.proposal;
  if(t<43.3)return lerp(m.proposal,60,smooth((t-40.5)/2.8));
  if(t<46.2)return lerp(60,m.heat,smooth((t-43.3)/2.9));
  if(t<49)return lerp(m.heat,m.updated,smooth((t-46.2)/2.8));
  if(t<53)return lerp(m.updated,m.won,smooth((t-49)/4));
  return m.won;
}
function replayAt(t){
  const sim=simulationAt(t),i=Math.min(replay.poses.length-1,Math.floor(sim*10)),p=replay.poses[i],q=replay.poses[Math.min(i+1,replay.poses.length-1)],u=sim*10-i;
  const state=replay.states[Math.min(Math.floor(sim),replay.states.length-1)].city;
  for(const n of npcs){const a=p.positions[n.id],b=q.positions[n.id],task=state.tasks[n.id],working=task?.phase==='work'&&task.duration>0&&task.job!=='join';
    n.root.position.set(lerp(a.x,b.x,u),.09,lerp(a.z,b.z,u));n.root.rotation.y=p.rotations[n.id];n.workProp.visible=working;
    const expression=t<27&&n.id==='mia'?'confused':t>=32.8&&t<40.5?'thinking':t>=49?'happy':'neutral';
    const speaking=t>=32.8&&t<37.2&&n.id===lead||t>=37.5&&t<40.5&&n.id===partner;
    visual.get(n.id).update(t,expression,speaking,working);
  }
  cafe.update(t,state.episode);city.update(t,state);episode.update(t,state);return state;
}
function groundCamera(x,z,target,fov=62){camera.position.set(x,eye,z);camera.lookAt(...target);camera.fov=fov;}
function gameplayCamera(t){
  if(t<27.4)groundCamera(-1.7,4.4,[-3.85,1.4,1.25],61);
  else if(t<37.4)groundCamera(2.75,24.65,[.85,1.38,27.35],65);
  else if(t<40.5){const p=npcs.find(n=>n.id===partner).root.position;groundCamera(8.5,28.65,[p.x,1.4,p.z],59);}
  else if(t<43.3){const p=npcs.find(n=>n.id===partner).root.position;groundCamera(p.x+.6,p.z-3,[p.x,1.32,p.z],66);}
  else if(t<46.2){const p=npcs.find(n=>n.id===partner).root.position;groundCamera(-3.8,-1.6,[p.x,1.1,p.z],63);}
  else if(t<49)groundCamera(0,9.4,[1.8,.85,17.8],67);
  else if(t<55.5)groundCamera(.7,4.7,[-3.1,1.35,.75],66);
  else groundCamera(.7,4.7,[-5.8,1.4,.1],68);
  if(t<27.4||t>=49)for(const n of npcs){if(n.id==='mia'||t>=53)world.face(n,camera.position);}
  if(t>=27.4&&t<37.4)world.face(npcs.find(n=>n.id===lead),camera.position);
  if(t>=37.4&&t<40.5)world.face(npcs.find(n=>n.id===partner),camera.position);
}
function draw(t){
  const age=t<14?0:t<22?(t-14)*3:23.9;
  sceneAt(age);skyline.update(age);let state=null;
  if(t<8){introAt(t);episode.update(t,null);}
  else if(t<14){groundCamera(0,24.8,[0,2.8,33],67);episode.update(t,null);}
  else if(t<22){const u=(t-14)/8;groundCamera(0,16.5,[0,lerp(3.2,10,smooth(u)),33],70);episode.update(t,null);}
  else{state=replayAt(t);gameplayCamera(t);}
  if(t>=8&&t<22){
    // Keep the authored supply traffic beside the viewer, clear of the center
    // of the frame so no following NPC silhouette resembles a player avatar.
    const ren=npcs.find(n=>n.id==='ren'),tomo=npcs.find(n=>n.id==='tomo');
    ren.root.position.set(-6.2,.09,24+Math.sin(t*.7)*2.5);
    ren.root.rotation.y=Math.cos(t*.7)>0?0:Math.PI;
    tomo.root.position.set(6.2,.09,24+Math.cos(t*.55)*2);
    tomo.root.rotation.y=Math.sin(t*.55)<0?0:Math.PI;
    for(const n of [ren,tomo])visual.get(n.id).update(t,'neutral',false,false);
  }
  camera.aspect=W/H;camera.updateProjectionMatrix();
  if(camera.position.y<1.6||camera.position.y>1.72)throw new Error('Every v3 shot must stay at human eye height.');
  if(renderer.domElement.width!==W||renderer.domElement.height!==H)renderer.setSize(W,H,false);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  const top=ctx.createLinearGradient(0,0,0,250);top.addColorStop(0,'#142734d9');top.addColorStop(1,'#14273400');ctx.fillStyle=top;ctx.fillRect(0,0,W,250);
  const bottom=ctx.createLinearGradient(0,780,0,H);bottom.addColorStop(0,'#10263300');bottom.addColorStop(1,'#102633f5');ctx.fillStyle=bottom;ctx.fillRect(0,780,W,300);
  text('Are You Human?',80,69,29,gold,'italic Georgia');
  if(t<8){
    for(const n of npcs){const clip=manifest.clips.find(c=>c.who===n.id.toUpperCase()&&c.crowd&&t>=c.start&&t<Math.min(c.end,c.start+c.duration/c.tempo)+.25);if(clip)bubble(clip.text,n.root.position.clone().add(new T.Vector3(0,2.35,0)),clip.who,mint,n.id==='shell'?-20:n.id==='tomo'?25:0);}
  }else if(t<14){tracking('POWER · WATER · HUMAN STORIES',80,144,14,mint,2.1);}
  else if(t<22){tracking('THE TOWN KEEPS GROWING.',80,146,15,mint,2.2);tracking('TIME LAPSE',1587,68,12,'#b8d1d3',2.1);}
  else if(t<27.4){
    tracking('ONE MOMENT IN A CHANGING TOWN',80,143,12,mint,1.75);text('Can both futures survive?',80,206,43,ink,'Georgia');
  }else if(t<32.8){
    tracking('NOTICE. THEN PROPOSE.',80,143,13,mint,2);panel(78,634,840,205);
    tracking('YOUR PROPOSAL',104,672,13,gold,1.8);
    const request='Use the waste heat from the data center to warm the cafe. Keep the upgrade running for Tomo.',amount=Math.floor(clamp((t-27.7)/2)*request.length);
    wrap(request.slice(0,amount)+(t<29.7?'▏':''),104,715,786,28,39);if(t>=30)text('Sent to '+names[lead]+' · considering your idea…',104,811,18,mint);
  }else if(t<37.4){
    tracking('RESIDENTS DECIDE HOW TO HELP',80,144,13,mint,2);panel(78,660,787,160);text(names[lead],104,703,25,gold,'Georgia');wrap(discussion[0].text.split('. ')[0]+'.',104,752,734,29,39);
    text('OpenAI interpreted your idea. '+names[lead]+' chose '+names[partner]+'.',81,860,20,mint);
  }else if(t<40.5){
    tracking('A PARTNER MAKES A COMMITMENT',80,144,13,mint,2);panel(78,664,725,150);text(names[partner],104,706,25,gold,'Georgia');wrap('Yes. … I’m heading to the cafe now.',104,756,670,29,39);
  }else if(t<46.2){
    tracking('WATCH THEM FOLLOW THROUGH',80,143,13,mint,2);text(t<43.3?'On the way to the café.':'Connecting the heating line.',80,207,39,ink,'Georgia');
    panel(80,740,450,82);text(names[lead]+' · central side',104,773,21,mint);text(names[partner]+' · café side',104,804,21,gold);
  }else if(t<49){tracking('THE PLAN CHANGES THE WORLD',80,143,13,mint,2);text('Recovered heat. Shared warmth.',80,206,42,ink,'Georgia');}
  else if(t<55.5){tracking('A SMALL CHANGE. A SHARED FUTURE.',80,144,13,mint,2);text('What happens next is up to you.',80,207,42,ink,'Georgia');}
  else{
    const shade=ctx.createLinearGradient(0,0,940,0);shade.addColorStop(0,'#142a36eb');shade.addColorStop(.6,'#142a36b8');shade.addColorStop(1,'#142a3600');ctx.fillStyle=shade;ctx.fillRect(0,90,940,909);
    tracking('A COMMUNITY SHAPED BY YOU.',81,218,14,mint,2.2);text('Are You',75,342,98,ink,'Georgia');text('Human?',75,458,108,gold,'italic Georgia');
    text('Speak. Listen. See what they choose.',81,553,28,ink);text('Work with Central. Or push back.',81,602,27,gold,'Georgia');
    text('Hina’s little world · Built with OpenAI',81,697,18,'#afc8cb');
  }
  if(state&&t<53){panel(1463,128,375,194,.84);meter('CENTRAL UPDATE',state.episode.update,1498,179,mint);meter('CAFÉ WARMTH',state.episode.warmth,1498,260,gold);}
  const clip=manifest.clips.find(c=>!c.crowd&&t>=c.start&&t<Math.min(c.end,c.start+c.duration/c.tempo)+.18);
  if(clip){ctx.font='32px Arial';const rows=[];let row='';for(const word of clip.text.split(/\s+/)){if(ctx.measureText(row+' '+word).width>1650&&row){rows.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)rows.push(row);
    if(clip.who!=='NARRATOR')tracking(clip.who,80,907,13,mint,2.4);rows.forEach((line,i)=>text(line,W/2,rows.length>1?928+i*41:960,32,ink,'Arial','center'));
  }
  const footer=t>=22&&t<55.5?'RECORDED OPENAI DECISIONS · GAMEPLAY TIME CONDENSED':'IN-ENGINE CINEMATIC DEMO';
  tracking(footer,80,1031,11,'#9eb4bb',1.3);text('AI-generated voices',1670,1031,13,'#9eb4bb');
  ctx.fillStyle='#cdbf9b55';ctx.fillRect(80,999,1760,2);ctx.fillStyle=gold;ctx.fillRect(80,999,1760*t/60,2);
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
    let r=await fetch('/v3/render/start',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);
    for(let frame=0;frame<1800;frame++){
      draw(frame/30);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      r=await fetch('/v3/render/frame?index='+frame,{method:'POST',headers:{'Content-Type':'image/png'},body:png});if(!r.ok)throw new Error((await r.json()).error);$('status').textContent=`Rendering ${Math.round((frame+1)/18)}% · ${frame+1} / 1800`;
    }
    r=await fetch('/v3/render/finish',{method:'POST'});if(!r.ok)throw new Error((await r.json()).error);$('status').textContent='Picture complete · 1800 frames / 60 seconds';
  }catch(error){$('status').textContent='Render failed: '+error.message;}finally{rendering=false;for(const id of ['render','play','time'])$(id).disabled=false;}
};
current=Math.min(59.999,Math.max(0,Number(new URLSearchParams(location.search).get('t'))||0));
draw(current);$('play').disabled=$('render').disabled=false;$('status').textContent='First person · six building families · live AI replay ready';
