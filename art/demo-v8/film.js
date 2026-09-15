import * as T from 'three';
import {createWorld} from '/src/world.js';
import {upgradeCafe} from '/src/cafe-assets.js';
import {upgradeTown} from '/src/town-assets.js';
import {upgradeResident} from '/src/resident-visual.js';
import {createCityWorld} from '/src/city-world.js';
import {createInfrastructureWorld} from '/src/infrastructure-world.js';
import {createCommunityWorld} from '/src/community-world.js';
import {createMemoryCity} from '/src/memory-city.js';
import {createCentralPresence} from '/src/central-presence.js';
import {createTownDiscoveries} from '/src/town-discoveries.js';
import {createTownBoundary} from '/src/town-boundary.js';
import {createMemoryWorld} from '/src/memory-world.js';
import {createPlayerVisual} from '/src/player-visual.js';
import {createTownRenderer} from '/src/town-renderer.js';
import {createMemoryView} from '/src/memory-view.js';
import {memoryPicture} from '/src/memory-pictures.js';
import {discoveryById} from '/src/discovery-rules.js';
import {lanternJourney} from '/src/boundary-layout.js';
import {v8Script} from './script.mjs';

const $=id=>document.getElementById(id),W=1920,H=1080,eye=1.68;
const canvas=$('output'),ctx=canvas.getContext('2d',{alpha:false});
const world=createWorld($('source')),{scene,camera,renderer,npcs}=world;
const visuals=new Map(npcs.map(n=>[n.id,upgradeResident(n)]));
const cityWorld=createCityWorld(world),infrastructure=createInfrastructureWorld(world),community=createCommunityWorld(world);
const memoryCity=createMemoryCity(world),central=createCentralPresence(world),discoveries=createTownDiscoveries(world),boundary=createTownBoundary(world),memories=createMemoryWorld(world),body=createPlayerVisual(world);
const finish=createTownRenderer(world);finish.setQuality('high');
const [cafe,town]=await Promise.all([upgradeCafe(world),upgradeTown(world,null),cityWorld.ready,infrastructure.ready,body.ready,...[...visuals.values()].map(v=>v.ready)]);
town.setRoom(null);finish.prepare();renderer.setPixelRatio(1);renderer.setSize(W,H,false);
camera.aspect=W/H;camera.far=230;camera.updateProjectionMatrix();
const fixedColliders=world.colliders.filter(c=>c.active!==false).map(({x,z,hw,hd})=>({x,z,hw,hd}));
const response=await fetch('/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({colliders:fixedColliders})});
if(!response.ok)throw new Error((await response.json()).error);
const replay=await response.json();let script=v8Script(replay),manifest=null;
try{const r=await fetch('/audio-manifest.json');if(r.ok)manifest=await r.json();}catch{}
let drawerCity=structuredClone(replay.states.remembering),pending=null;
const view=createMemoryView({
  async api(path,data){pending=fetch('/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.error);return value;});return pending;},
  changed(r){drawerCity=r;view.update(r);translateDrawer();},refresh:async()=>{},position:()=>camera.position,focus(){},prepare(){},notice(){},say(){},chime(){},
});
view.setMuted(true);view.activate(drawerCity,false);
function translateDrawer(){
  $('memory-title').textContent='What matters to you?';
  $('memory-gesture-hint').textContent='Drag a memory into place. Double-click to write.';
  $('memory-close').setAttribute('aria-label','Close memories');
  document.querySelector('.memory-device-caption span').textContent='First in line. First on your mind.';
  document.querySelector('.memory-tray-label').textContent='MOMENTS YOU KEEP';
  [...$('memory-slots').children].forEach((el,i)=>el.querySelector('small').textContent=i===0?'01 · YOUR VOICE':'0'+(i+1));
  document.querySelector('#memory-back .memory-eyebrow').textContent='IN YOUR OWN WORDS';
  $('memory-edit-note').textContent='Enter to keep this memory.';
  document.querySelector('.memory-back-fine').textContent='The past stays. How you remember it can change.';
  $('memory-status').textContent=drawerCity.memoryGame.equipped[0]==='promise'?'Click. Your next words start here.':'';
}
translateDrawer();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
const ink='#f5ebd6',gold='#efd099',mint='#b7ddd0',icons=new Map();
for(const b of replay.states.restored.memoryGame.blocks){const img=new Image();img.src='data:image/svg+xml,'+encodeURIComponent(memoryPicture(b.motif).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('currentColor',b.color));await img.decode();icons.set(b.id,img);}
function text(value,x,y,size=32,color=ink,font='Arial',align='left'){ctx.font=`${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);ctx.textAlign='left';}
function panel(x,y,w,h,color='#173442e8',r=18){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function wrap(value,x,y,max,size=38,leading=49,align='center'){ctx.font=`${size}px Arial`;let line='',rows=[];for(const word of value.split(/\s+/)){if(ctx.measureText(line+' '+word).width>max&&line){rows.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)rows.push(line);rows.forEach((s,i)=>text(s,x,y+i*leading,size,ink,'Arial',align));return rows.length;}
function key(label,x,y,pressed=false){panel(x,y,42,42,pressed?gold:'#1d3944dd',10);text(label,x+21,y+29,24,pressed?'#203b43':ink,'Arial','center');}
function hint(label,press=false){const width=ctx.measureText(label).width+130;panel(W/2-width/2,866,width,64);key('E',W/2-width/2+10,877,press);text(label,W/2-width/2+66,906,25);}
function card(id,x,y,scale=1){const b=replay.states.restored.memoryGame.blocks.find(b=>b.id===id);if(!b)return;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);panel(0,7,136,144,'#091f2d66',18);panel(0,0,136,140,b.color,18);panel(30,17,76,72,'#29454a',13);ctx.drawImage(icons.get(id),33,19,70,70);text(b.title,68,121,16,'#26434a','Arial','center');for(let i=0;i<4;i++)panel(40+i*15,138,9,13,'#dbbd81',2);ctx.restore();}
function ground(x,z,look,fov=64,bob=0){camera.position.set(x,eye+bob,z);camera.lookAt(...look);camera.fov=fov;}
function lookNPC(x,z,id,fov=63){const p=npcs.find(n=>n.id===id).root.position;ground(x,z,[p.x,1.32,p.z],fov);}
function loc(title,sub=''){text(title,64,76,30,ink,'Georgia');if(sub)text(sub,65,107,17,mint);}
function stateFor(t){if(t<6.2)return 'arrival';if(t<8.25)return 'wind';if(t<10.35)return 'pump';if(t<12.2)return 'fountain';if(t<14.45)return 'promised';if(t<16.65)return 'syncing';if(t<30.9)return 'remembering';if(t<38.65)return 'invited';if(t<41.2)return 'together';if(t<42.5)return 'music';if(t<46.3)return 'boat';if(t<49)return 'entrusted';if(t<51)return 'syncAgain';return 'restored';}
const opening={mia:{x:-1.55,z:1.2,yaw:2.1,at:.65},tomo:{x:1.4,z:2,yaw:-1.7,at:1.0},ren:{x:3.45,z:.1,yaw:-2.6,at:1.6},shell:{x:-3.45,z:-.7,yaw:1.9,at:1.35}};
let lastTime=-1;
function pose(t,city){
  const time=t+30;
  for(const n of npcs){const p=city.positions[n.id];n.root.visible=true;n.root.position.set(p.x,.09,p.z);n.body.position.y=0;n.root.rotation.y=0;n.workProp.visible=false;}
  if(t<6.2){
    const u=smooth(t/4.8);ground(mix(.25,0,u),mix(8.2,5.0,u),[Math.sin(t*1.6)*.24,1.28,1],65,Math.sin(t*8)*.012*(1-u));
    for(const n of npcs){const p=opening[n.id],notice=smooth((t-p.at)/.78),lean=Math.sin(Math.PI*clamp((t-p.at)/.82))*.045;
      n.root.position.set(p.x,.09+lean,p.z+(n.id==='tomo'?smooth((t-3.15)/2.05)*.62:0));
      const to=Math.atan2(camera.position.x-n.root.position.x,camera.position.z-n.root.position.z);n.root.rotation.y=p.yaw+Math.atan2(Math.sin(to-p.yaw),Math.cos(to-p.yaw))*notice;
    }
  }else if(t<8.25){const u=smooth((t-6.2)/2.05);ground(mix(-34.4,-34,u),mix(16.1,14.7,u),[-33.4,mix(1.3,4,u),10.4],67,Math.sin(t*11)*.012);}
  else if(t<10.35){const u=smooth((t-8.25)/2.1);ground(mix(-24.6,-23.7,u),32.3,[-20.25,1.1,36.8],66);}
  else if(t<12.2){const u=smooth((t-10.35)/1.85);ground(mix(-8.9,-8.3,u),48.7,[-7.1,1.2,50.8],70,Math.sin(t*10)*.008);}
  else if(t<14.45)lookNPC(.2,6.6,'tomo',62);
  else if(t<15.5){ground(0,24.25,[0,2.5,28.9],64);}
  else if(t<18.85)lookNPC(.2,6.6,'tomo',62);
  else if(t<30.9){ground(.2,6.6,[.6,1.30,3.6],64);}
  else if(t<38.65){
    if(t>=36.9){const u=clamp((t-36.9)/1.65),p=replay.journey[Math.floor(u*(replay.journey.length-1))],n=npcs.find(n=>n.id==='tomo');n.root.position.set(p.x,.09,p.z);n.root.rotation.y=p.yaw;ground(mix(.2,1.1,u),mix(6.6,6,u),[p.x,1.35,p.z],66,Math.sin(t*11)*.014);}
    else lookNPC(.2,6.6,'tomo',62);
  }else if(t<41.2){lookNPC(1.25,6,'tomo',65);const shell=npcs.find(n=>n.id==='shell');shell.root.position.set(1.15,.09,1.9);}
  else if(t<42.5){const u=smooth((t-41.2)/1.3);ground(mix(8.5,8.0,u),48.9,[7.5,1.4,51.4],70,Math.sin(t*10)*.014);}
  else if(t<43.5){const age=12+(t-42.5)*1.2,p=lanternJourney(age);ground(25,48.75,[p.x,.18,p.z],62);city.clock=city.memoryGame.exploration.boatAt+age;}
  else if(t<44.1){ground(35.2,50.6,[53,2.2,51],67);}
  else if(t<46.3){const u=smooth((t-44.1)/2.2);ground(.25,46.8,[.25,mix(3.8,7.1,u),70],77);}
  else if(t<47.75){ground(.3,24.65,[0,2.75,28.9],61);}
  else if(t<49.2){ground(0,74.8,[0,mix(1.6,4.5,smooth((t-47.75)/1.45)),80],70);}
  else if(t<53.25){const u=smooth((t-49.2)/4.05);ground(mix(-5.2,-3.65,u),mix(89.4,90.45,u),[0,mix(2.35,3.05,u),97],54);}
  else{const n=npcs.find(n=>n.id==='tomo');n.root.position.set(.9,.09,3.5);lookNPC(.15,6.55,'tomo',61);}
  for(const n of npcs){
    if(t>=6.2&&!(t>=36.9&&t<38.65&&n.id==='tomo'))world.face(n,camera.position);
    const speaking=(manifest?.clips||script.segments).some(s=>s.who===n.id.toUpperCase()&&t>=s.start&&t<s.start+(s.renderedDuration??s.end-s.start)),syncing=t>=15.5&&t<16.65;
    const waveAt=opening[n.id].at+.42;if(t<6.2&&lastTime<waveAt&&t>=waveAt)visuals.get(n.id).wave(30+waveAt);
    visuals.get(n.id).update(time,t<4?'surprised':t>=16.65&&t<18.85?'confused':'happy',speaking,false,syncing,t<6.2?'still':'auto');
    if(t>=36.9&&t<38.65&&n.id==='tomo')n.body.position.y=Math.abs(Math.sin(t*11))*.04;
  }
  camera.aspect=W/H;camera.updateProjectionMatrix();
  if(Math.abs(camera.position.y-eye)>.025)throw new Error('Camera left first person');
}
function overlay(t){
  const bottom=ctx.createLinearGradient(0,790,0,H);bottom.addColorStop(0,'#102d3900');bottom.addColorStop(1,'#102331dd');ctx.fillStyle=bottom;ctx.fillRect(0,790,W,290);
  const top=ctx.createLinearGradient(0,0,0,170);top.addColorStop(0,'#152c3899');top.addColorStop(1,'#152c3800');ctx.fillStyle=top;ctx.fillRect(0,0,W,170);
  if(t>=6.2&&t<8.25){loc('Windmill hill');hint('Catch the wind',t>6.7&&t<7);}
  else if(t<10.35&&t>=8.25){loc('The river gate');hint('Let it flow',t>8.6&&t<8.85);}
  else if(t>=10.35&&t<12.2){loc('The city fountain');hint('A little splash',t>10.6&&t<10.85);}
  else if(t>=12.2&&t<14.45){loc('A promise in the old square');}
  else if(t>=14.45&&t<16.65){loc('Central');text('REFRESHING MEMORIES',960,838,22,mint,'Arial','center');}
  else if(t>=16.65&&t<18.85){card('promise',64,703,.85);text('You kept this.',204,773,25,gold);key('Q',64,867);text('Memories',123,896,25);}
  else if(t>=18.85&&t<30.9){
    const shade=ctx.createLinearGradient(0,0,820,0);shade.addColorStop(0,'#173443aa');shade.addColorStop(1,'#17344300');ctx.fillStyle=shade;ctx.fillRect(0,255,820,230);
    text(t<24.4?'Your memories.':'What would you write?',87,345,t<24.4?52:40,ink,'Georgia');
    if(t<24.4)text('Pick up a moment.',89,395,26,mint);
  }else if(t>=30.9&&t<36.9){card('promise',64,698,.84);text('YOUR VOICE',65,671,19,mint);if(t<31.3)hint('Speak',true);}
  else if(t>=36.9&&t<39.1){text('Tomo chose to come.',65,81,28,ink,'Georgia');}
  else if(t>=39.1&&t<41.2){const a=smooth((t-39.1)/.4);ctx.save();ctx.globalAlpha=a;card('together',67,695+(1-a)*40,.9);text('A new memory.',220,765,28,gold);ctx.restore();}
  else if(t>=41.2&&t<42.5){loc('The music stop');hint('Make a little music',t>41.55&&t<41.8);}
  else if(t>=42.5&&t<44.1){loc(t<43.5?'A light on the river':'Beyond the mist gate');}
  else if(t>=44.1&&t<46.3){loc('A town that keeps changing');}
  else if(t>=46.3&&t<47.75){loc('Central');card('together',64,703,.85);}
  else if(t>=47.75&&t<49.2){loc('The heart of the city');hint('Keep this moment',t>48&&t<48.25);}
  else if(t>=49.2&&t<53.25){loc('The edge of the remembered town');}
  const clips=manifest?.clips||script.segments;
  const c=clips.find(c=>!c.crowd&&t>=c.start&&t<Math.min(c.end,c.start+(c.renderedDuration??(c.duration??c.end-c.start)/(c.tempo||1)))+.1);
  if(c&&t<56.2){const who=c.who==='NARRATOR'?'':c.who;ctx.font='38px Arial';const wide=Math.min(1540,ctx.measureText(c.text).width+100),two=ctx.measureText(c.text).width>1460;panel((W-wide)/2,two?925:952,wide,two?127:82,'#112b38e8',18);if(who)text(who,W/2,(two?925:952)-16,19,gold,'Arial','center');wrap(c.text,W/2,two?970:1003,1460,38,47);}
  if(t>=56){
    const a=smooth((t-56)/.65);ctx.fillStyle=`rgba(18,39,47,${a*.97})`;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=a;
    text('ARE YOU',960,430,88,ink,'Georgia','center');text('HUMAN?',960,557,122,gold,'Georgia','center');
    text('A little town. The memories you make.',960,662,30,mint,'Arial','center');
    text('Created by Haruna & Ilya',960,816,21,ink,'Arial','center');
    text('OpenAI-powered voices & resident decisions',960,852,20,mint,'Arial','center');
    text('In-engine demo · recorded AI decisions · AI-generated voices',960,1029,17,'#a4bdb9','Arial','center');ctx.restore();
  }
}
async function draw(t){
  const city=structuredClone(replay.states[stateFor(t)]),time=t+30;
  if(t>=18.85&&t<30.9)city.memoryGame=drawerCity.memoryGame;
  pose(t,city);town.setOpeningTreesVisible(t>=6.2);cafe.setTreesVisible(t>=6.2);const pumpShot=t>=8.25&&t<10.35;infrastructure.setTreesVisible(!pumpShot);cityWorld.setTreesVisible(!pumpShot);
  cityWorld.update(time,city);infrastructure.update(time,city);community.update(time,city);memoryCity.update(time,city);central.update(time,city,camera.position,(manifest?.clips||script.segments).some(c=>c.who==='CENTRAL'&&t>=c.start&&t<c.start+(c.renderedDuration??c.end-c.start))?'speaking':'idle');
  const touches=[[6.7,8.25,'wind'],[8.6,10.35,'pump'],[10.6,12.2,'fountain'],[41.46,42.5,'music'],[42.55,44.1,'boat'],[48,49.2,'core']];
  for(const [start,end,id] of touches)if(t>=start&&t<end)discoveries.touch(id,30+start);
  const growing=t>=44.1&&t<46.3,growthProgress=growing?clamp((t-44.32)/1.64):1;
  const development=memoryCity.develop(growthProgress);
  discoveries.focus(null);discoveries.update(time,city);boundary.update(time,city);memories.update(time,city);cafe.update(time,city.episode);town.update(time,city.community);
  const selected=t>=46.3?replay.states.together.memoryGame.blocks.find(b=>b.id==='together'):t>=18.85?drawerCity.memoryGame.blocks.find(b=>b.id==='promise'):city.memoryGame.blocks[0];
  body.update(time,{enabled:t>=6.2&&t<56&&!growing,player:camera.position,yaw:camera.rotation.y,firstPerson:true,editing:t>=18.85&&t<30.9,selected,moving:t>=36.9&&t<38.65,reducedMotion:false});
  finish.render(time,city);ctx.drawImage(renderer.domElement,0,0,W,H);overlay(t);lastTime=t;
  $('film-pointer').style.display=t>=19&&t<30.7?'block':'none';
  return {t,shot:growing?'town-development':stateFor(t),development:growing?{progress:growthProgress,heights:development}:null,camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},drawer:view.open,pending:view.busy,renderInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}};
}
window.film={
  ready:true,replay,draw,
  async openDrawer(){view.openEditor();translateDrawer();},
  async closeDrawer(){await view.close();},
  async resetDrawer(){const r=await fetch('/drawer/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});drawerCity=(await r.json()).city;view.activate(drawerCity,false);translateDrawer();},
  async settled(){if(pending)await pending;await new Promise(resolve=>setTimeout(resolve,0));translateDrawer();return {busy:view.busy,equipped:drawerCity.memoryGame.equipped,text:drawerCity.memoryGame.blocks.find(b=>b.id==='promise').text};},
  pointer(x,y,down=false){const el=$('film-pointer');el.style.left=x+'px';el.style.top=y+'px';el.classList.toggle('down',down);},
  bounds(selector){const e=document.querySelector(selector);if(!e)throw new Error('Missing '+selector);const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,left:r.x,top:r.y,width:r.width,height:r.height};},
  async reloadAudio(){const r=await fetch('/audio-manifest.json');manifest=await r.json();},
};
await draw(0);$('loading').hidden=true;
