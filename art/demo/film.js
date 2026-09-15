import * as T from '/node_modules/three/build/three.module.js';
import {createWorld} from '/src/world.js';
import {upgradeCafe} from '/src/cafe-assets.js';
import {upgradeTown} from '/src/town-assets.js';
import {upgradeResident} from '/src/resident-visual.js';
import {createCityWorld} from '/src/city-world.js';
import {createInfrastructureWorld} from '/src/infrastructure-world.js';
import {createEpisodeWorld} from '/src/episode-world.js';

const $=id=>document.getElementById(id),W=1920,H=1080,canvas=$('output'),ctx=canvas.getContext('2d',{alpha:false});
const world=createWorld($('source')),{camera,renderer,scene,npcs}=world;
renderer.setPixelRatio(1);renderer.setSize(W,H,false);camera.aspect=W/H;camera.fov=50;camera.updateProjectionMatrix();scene.fog.density=.009;
const residents=new Map(npcs.map(n=>[n.id,upgradeResident(n)])),cityVisual=createCityWorld(world),infraVisual=createInfrastructureWorld(world),episodeVisual=createEpisodeWorld(world);
const [cafe,town,audioManifest]=await Promise.all([upgradeCafe(world),upgradeTown(world,null),fetch('/audio-manifest.json').then(r=>r.json()),cityVisual.ready,infraVisual.ready,...[...residents.values()].map(v=>v.ready)]);
town.setRoom(null);
const names={mia:'Mia',ren:'Ren',tomo:'Tomo',shell:'Shell'},ink='#f4e8d1',gold='#efd09c',mint='#afdad3';
const portraitScene=new T.Scene(),portraitCamera=new T.PerspectiveCamera(37,850/400,.05,20),portraitRenderer=new T.WebGLRenderer({antialias:true,alpha:true});
portraitRenderer.setPixelRatio(1);portraitRenderer.setSize(850,400);portraitRenderer.toneMapping=T.ACESFilmicToneMapping;portraitRenderer.toneMappingExposure=1.35;
portraitScene.add(new T.HemisphereLight(0xfff5df,0x57727e,2));const portraitKey=new T.DirectionalLight(0xffdfb3,3);portraitKey.position.set(-3,5,4);portraitScene.add(portraitKey);const portraitRim=new T.DirectionalLight(0xb4e4ef,2);portraitRim.position.set(3,4,-2);portraitScene.add(portraitRim);
const portraits=new Map([...residents].map(([id,visual])=>{const model=visual.model.clone(true);portraitScene.add(model);return [id,model];}));portraitCamera.position.set(0,1.4,4.7);portraitCamera.lookAt(0,1.08,0);
let replay=null,playing=false,rendering=false,start=0,current=0,raf=0;
const subtitles=[];
for(const clip of audioManifest.clips){const parts=clip.text.match(/[^.!?]+[.!?]+/g)||[clip.text],total=parts.reduce((n,s)=>n+s.trim().split(/\s+/).length,0);let time=clip.start;
  for(const part of parts){const text=part.trim(),duration=clip.duration/clip.tempo*text.split(/\s+/).length/total;subtitles.push({start:time,end:Math.min(clip.end,time+duration),text,who:clip.id==='mia'?'MIA':null});time+=duration;}}

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const vec=a=>new T.Vector3(...a);
function panel(x,y,w,h,alpha=.87){ctx.fillStyle=`rgba(18,38,53,${alpha})`;ctx.strokeStyle='#bcd4ce40';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,w,h,22);ctx.fill();ctx.stroke();}
function text(str,x,y,size=30,color=ink,font='Arial',weight='400'){ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign='left';ctx.fillText(str,x,y);}
function tracking(str,x,y,size=16,color=gold,spacing=3){ctx.font=`500 ${size}px Arial`;ctx.fillStyle=color;for(const ch of str){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+spacing;}}
function wrap(str,x,y,width,size=31,line=43,color=ink,font='Arial'){
  ctx.font=`400 ${size}px ${font}`;let row='',rows=[];for(const word of str.split(/\s+/)){if(ctx.measureText(row+(row?' ':'')+word).width>width&&row){rows.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)rows.push(row);rows.forEach((lineText,i)=>text(lineText,x,y+i*line,size,color,font));return rows.length*line;
}
function header(kicker,title,second=''){tracking(kicker,88,150,17);text(title,84,218,59,ink,'Georgia');if(second)text(second,84,283,59,ink,'Georgia');}
function pill(label,x,y,w,color=gold){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,39,19);ctx.fill();text(label,x+18,y+26,17,'#1b3545','Arial','600');}
function card(who,line,x,y,w=635){panel(x,y,w,125);text(who,x+25,y+35,23,gold,'Georgia');wrap(line,x+25,y+74,w-50,26,34);}
function meter(label,value,x,y,color=gold){text(label,x,y,18,'#d8e0db','Arial','500');text(Math.round(value)+'%',x+225,y,22,color,'Georgia');ctx.fillStyle='#496170';ctx.beginPath();ctx.roundRect(x,y+17,280,8,4);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y+17,Math.max(1,280*value/100),8,4);ctx.fill();}
function timeMap(t){const m=replay.moments;
  if(t<31)return Math.min(44,t/31*44);
  if(t<39)return m.proposal;
  if(t<43)return lerp(m.proposal,m.heat,smooth((t-39)/4));
  if(t<47)return lerp(m.heat,m.updated,smooth((t-43)/4));
  if(t<54)return lerp(m.updated,m.won,smooth((t-47)/7));
  return m.won;
}
function sample(t){
  const sim=timeMap(t),i=Math.min(replay.poses.length-1,Math.floor(sim*10)),a=replay.poses[i],b=replay.poses[Math.min(i+1,replay.poses.length-1)],blend=sim*10-i;
  const state=replay.states[Math.min(Math.floor(sim),replay.states.length-1)].city;
  for(const n of npcs){const p=a.positions[n.id],q=b.positions[n.id];n.root.position.set(lerp(p.x,q.x,blend),.09,lerp(p.z,q.z,blend));n.root.rotation.y=a.rotations[n.id];
    const task=state.tasks[n.id],working=task?.phase==='work'&&task.duration>0&&task.job!=='join';n.workProp.visible=working;
    if(t<8&&n.id==='mia'||t>=16&&t<23&&n.id==='tomo'||t>=23&&t<31&&n.id==='shell')world.face(n,camera.position);
    if(t>=31&&t<39){if(n.id===replay.decision.lead)world.face(n,npcs.find(n=>n.id===replay.decision.partner).root.position);if(n.id===replay.decision.partner)world.face(n,npcs.find(n=>n.id===replay.decision.lead).root.position);}
    if(t>=54)world.face(n,camera.position);
    const expression=t<8&&n.id==='mia'?'confused':t>=16&&t<18&&n.id==='tomo'?'glitch':t>=47?'happy':t>=31&&t<39?'thinking':'neutral';
    const speaking=t<7.5&&n.id==='mia'||t>=31&&t<35&&n.id===replay.decision.lead||t>=35&&t<39&&n.id===replay.decision.partner;
    residents.get(n.id).update(t,expression,speaking,working);
  }
  cafe.update(t,state.episode);town.update(t);cityVisual.update(t,state);infraVisual.update(t,state);episodeVisual.update(t,state);return state;
}
function pose(a,b,ta,tb,u,fov=50){camera.position.lerpVectors(vec(a),vec(b),smooth(u));const target=vec(ta).lerp(vec(tb),smooth(u));camera.lookAt(target);camera.fov=fov;camera.updateProjectionMatrix();}
function cameraAt(t){
  if(t<8)pose([-3.7,1.95,5.4],[-3.5,1.85,4.65],[-3.85,1.25,1.25],[-3.85,1.34,1.25],t/8,49);
  else if(t<16)pose([25,28,5],[18,23,8],[-8,1,24],[-5,1,27],(t-8)/8,56);
  else if(t<23)pose([1.9,2,23.3],[1.45,1.88,23.6],[-.85,1.22,27.35],[-.85,1.24,27.35],(t-16)/7,47);
  else if(t<31)pose([.7,2.8,23.3],[1.0,2.3,24.3],[.7,1.2,27.7],[.7,1.15,28.1],(t-23)/8,52);
  else if(t<39)pose([6,5.2,22],[5.6,4.6,22.5],[-.7,.8,27.3],[-.6,1,27.3],(t-31)/8,53);
  else if(t<43){const p=npcs.find(n=>n.id===replay.decision.partner).root.position;const close=t>=41.6;pose([p.x+(close?2:-2.5),close?3.6:4.6,p.z+(close?4.4:-5.5)],[p.x+(close?2:-2.5),close?3.6:4.6,p.z+(close?4.4:-5.5)],[p.x,.8,p.z],[p.x,.8,p.z],0,close?53:46);}
  else if(t<47)pose([13,20,21],[10,19,17],[-1,0,14],[-2,0,11],(t-43)/4,59);
  else if(t<54)pose([4.5,9.4,8.5],[3.3,7.3,6.5],[-3,.4,1.4],[-3.2,.6,.8],(t-47)/7,54);
  else pose([1.5,5.2,6.7],[.7,4.4,5.6],[-6.2,.8,-.2],[-6.4,.85,-.4],(t-54)/6,57);
}
function draw(t){
  if(!replay)return;
  // Sample before following a moving resident; face the new camera after posing.
  const state=sample(t);cameraAt(t);
  if(t<8)world.face(npcs.find(n=>n.id==='mia'),camera.position);
  if(renderer.domElement.width!==W||renderer.domElement.height!==H)renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  const top=ctx.createLinearGradient(0,0,0,350);top.addColorStop(0,'#101f33d9');top.addColorStop(1,'#101f3300');ctx.fillStyle=top;ctx.fillRect(0,0,W,350);
  const side=ctx.createLinearGradient(0,0,950,0);side.addColorStop(0,'#102536bf');side.addColorStop(.6,'#10253648');side.addColorStop(1,'#10253600');ctx.fillStyle=side;ctx.fillRect(0,90,1050,750);
  const bottom=ctx.createLinearGradient(0,760,0,H);bottom.addColorStop(0,'#10213200');bottom.addColorStop(.6,'#102132da');bottom.addColorStop(1,'#102132f7');ctx.fillStyle=bottom;ctx.fillRect(0,760,W,320);
  text('Are You Human?',86,73,31,gold,'Georgia','italic');tracking('ONE WARM LIGHT',1500,70,15,'#d6dcca',2.8);
  const e=state.episode;
  if(t<8){header('A SMALL TOWN. A BIG TOMORROW.','Mia saved you a seat.');pill('MIA  /  CAFÉ KEEPER',88,323,253);}
  else if(t<16){header('THE PROBLEM','Tomorrow takes power.');panel(1438,161,390,238);meter('CENTRAL UPDATE',e.update,1480,216,mint);meter('CAFÉ WARMTH',e.warmth,1480,311,gold);text('One power grid. Two futures.',88,289,28,'#d9e0d9');}
  else if(t<23){header('YOUR GOAL','Keep both futures alive.');card('MIA','A warm place where everyone belongs.',88,336,590);card('TOMO','An upgrade that could repair his voice.',88,484,590);}
  else if(t<31){header('NOTICE WHAT OTHERS MISS','They throw away heat.','She needs warmth.');panel(88,350,515,141);text('WASTE HEAT',120,398,19,mint,'Arial','600');text('A warm café?',120,451,38,gold,'Georgia');ctx.strokeStyle=mint;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(389,393);ctx.lineTo(547,393);ctx.lineTo(536,386);ctx.moveTo(547,393);ctx.lineTo(536,400);ctx.stroke();}
  else if(t<39){
    header('MAKE YOUR OWN PROPOSAL','What if we used that heat?');panel(88,295,765,135);tracking('YOU',113,333,15,mint,2);
    const message='Use the waste heat to warm the café. Keep the upgrade running.',count=Math.floor(clamp((t-31)/1.2)*message.length);wrap(message.slice(0,count)+(t<32.2?'▏':''),113,377,715,28,37);
    const discussion=e.discussion;if(t>=33)card(names[replay.decision.lead],discussion[0].text,88,454,765);if(t>=35.8)card(names[replay.decision.partner],discussion[1].text,88,599,765);
    panel(961,295,871,453,.89);tracking('RESIDENTS MAKE THEIR OWN COMMITMENTS',990,335,15,mint,1.5);
    for(const [id,model] of portraits){model.visible=id===replay.decision.lead||id===replay.decision.partner;model.position.set(id===replay.decision.lead?-.9:.9,0,0);model.rotation.y=id===replay.decision.lead?.15:-.15;}
    portraitRenderer.render(portraitScene,portraitCamera);ctx.drawImage(portraitRenderer.domElement,969,336,850,400);
    text(names[replay.decision.lead],1118,717,24,gold,'Georgia');text(names[replay.decision.partner],1519,717,24,gold,'Georgia');
    text('OpenAI interprets the idea.',88,798,23,mint);text('Each resident decides whether to help.',88,833,23,mint);
  }else if(t<43){header('WATCH THEM FOLLOW THROUGH','A plan becomes action.');pill(names[replay.decision.lead].toUpperCase()+'  /  CENTRAL SIDE',88,324,355,mint);pill(names[replay.decision.partner].toUpperCase()+'  /  CAFÉ SIDE',88,379,330,gold);}
  else if(t<47){header('THE WORLD RESPONDS','Warmth finds a new way.');panel(88,329,430,202);meter('CENTRAL UPDATE',e.update,119,378,mint);meter('CAFÉ WARMTH',e.warmth,119,466,gold);}
  else if(t<54){header('TWO WISHES. ONE TOMORROW.','The update finishes.','The café stays.');pill('CENTRAL  /  UPDATED',88,334,280,mint);pill('CAFÉ  /  WARM',88,391,235,gold);}
  else{
    panel(70,151,826,519,.81);tracking('ONE WARM LIGHT',113,211,17,gold,3.3);text('Are You',108,325,100,ink,'Georgia');text('Human?',108,432,100,gold,'Georgia','italic');text('Conversation becomes cooperation.',113,509,33,ink,'Georgia');
    text('Observe. Propose. Watch them act.',113,567,25,'#c2d3d4');text('Built with OpenAI · Original resident characters by Haruna',113,622,18,'#a4bcc5');
  }
  const subtitle=subtitles.find(s=>t>=s.start&&t<s.end);
  if(subtitle){const max=1600;ctx.font='400 34px Arial';const words=subtitle.text.split(/\s+/),lines=[];let line='';for(const word of words){if(ctx.measureText(line+' '+word).width>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    const y=lines.length>1?901:929;ctx.textAlign='center';ctx.fillStyle=ink;ctx.font='400 34px Arial';ctx.shadowColor='#0c1b2b';ctx.shadowBlur=8;for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],W/2,y+i*45);ctx.shadowBlur=0;ctx.textAlign='left';
    if(subtitle.who)tracking(subtitle.who,88,865,16,gold,3);
  }
  text('IN-ENGINE CINEMATIC DEMO  ·  GAMEPLAY TIME CONDENSED',88,1030,14,'#9cb4c1');
  text('AI-generated voices',1650,1030,14,'#9cb4c1');
  ctx.fillStyle='#8cbcb550';ctx.fillRect(88,998,1744,2);ctx.fillStyle=gold;ctx.fillRect(88,998,1744*clamp(t/60),2);
  const cutTimes=[8,16,23,31,39,43,47,54],nearest=Math.min(...cutTimes.map(x=>Math.abs(t-x)));if(nearest<.065){ctx.fillStyle=`rgba(11,24,38,${.24*(1-nearest/.065)})`;ctx.fillRect(0,0,W,H);}
  if(t>59.4){ctx.fillStyle=`rgba(10,23,36,${clamp((t-59.4)/.6)})`;ctx.fillRect(0,0,W,H);}
  $('timestamp').textContent='00:'+String(Math.floor(t)).padStart(2,'0')+' / 01:00';$('time').value=t;
}
function stop(){playing=false;cancelAnimationFrame(raf);$('voice').pause();$('play').textContent='Preview with narration';}
function loop(now){if(!playing)return;current=Math.min(59.999,(now-start)/1000);draw(current);if(current>=59.99){stop();return;}raf=requestAnimationFrame(loop);}
$('play').onclick=async()=>{if(playing){stop();return;}$('final-player').hidden=true;start=performance.now()-current*1000;playing=true;$('play').textContent='Pause preview';$('voice').currentTime=current;await $('voice').play();raf=requestAnimationFrame(loop);};
$('time').oninput=()=>{if(rendering)return;stop();current=Number($('time').value);$('final-player').hidden=true;draw(current);};
$('prepare').onclick=async()=>{
  $('prepare').disabled=true;$('status').textContent='Residents are considering the proposal…';
  try{const r=await fetch('/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({colliders:world.colliders})});const data=await r.json();if(!r.ok)throw new Error(data.error);replay=data;
    for(let i=0;i<90;i++){infraVisual.update(i/30,replay.states[0].city);}draw(0);$('status').textContent='Live AI replay ready · '+names[replay.decision.lead]+' + '+names[replay.decision.partner];$('play').disabled=$('render').disabled=false;
  }catch(error){$('status').textContent=error.message;}finally{$('prepare').disabled=false;}
};
$('render').onclick=async()=>{
  if(rendering)return;stop();rendering=true;$('final-player').hidden=true;for(const id of ['render','prepare','play','time'])$(id).disabled=true;
  try{
    let response=await fetch('/render/start',{method:'POST'});if(!response.ok)throw new Error((await response.json()).error);
    for(let frame=0;frame<1800;frame++){
      draw(frame/30);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      response=await fetch('/render/frame?index='+frame,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});if(!response.ok)throw new Error((await response.json()).error);
      $('status').textContent=`Rendering ${Math.round((frame+1)/18)}% · ${frame+1} / 1800 frames`;
    }
    response=await fetch('/render/finish',{method:'POST'});if(!response.ok)throw new Error((await response.json()).error);$('status').textContent='Picture render complete · 1800 frames / 60.00 seconds';
  }catch(error){$('status').textContent='Render failed: '+error.message;}finally{rendering=false;for(const id of ['render','prepare','play','time'])$(id).disabled=false;}
};
$('watch').onclick=()=>{stop();$('final-player').hidden=false;$('final-player').load();$('final-player').play().catch(()=>{});};
$('prepare').disabled=false;$('status').textContent='Town loaded. Prepare a live AI replay.';
try{const response=await fetch('/replay.json');if(response.ok){replay=await response.json();draw(0);$('play').disabled=$('render').disabled=false;$('status').textContent='Saved live AI replay ready.';}}catch{}
