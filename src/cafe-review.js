import {upgradeTown} from './town-assets.js';import {createStudio} from './studio.js';
import {createWorld} from './world.js';import {upgradeCafe} from './cafe-assets.js';import {upgradeMia,expressions} from './mia-visual.js';
const before=new URLSearchParams(location.search).has('before'),world=createWorld(document.getElementById('world'));
world.camera.position.set(-.8,1.68,3.5);world.camera.lookAt(-5.25,2.3,-5.2);world.camera.fov=53;world.camera.updateProjectionMatrix();
const mia=world.npcs.find(n=>n.id==='mia');mia.root.position.set(-3.9,.18,-.25);world.face(mia,world.camera.position);world.npcs.filter(n=>n!==mia).forEach(n=>n.root.visible=false);
const town=new URLSearchParams(location.search).has('town');let townArea;
let area,visual,t=0,last=performance.now(),frames=[];
try{if(!before){area=await upgradeCafe(world);visual=upgradeMia(mia);await visual.ready;if(town){const studio=createStudio(world);studio.update({projects:[]});townArea=await upgradeTown(world,studio);}}document.getElementById('status').textContent=before?'Before · 元のカフェ':'After · CC0アセット / カフェ1区画';}catch(e){document.getElementById('status').textContent='アセットを読み込めませんでした';throw e;}
if(town){
 document.querySelector('h1').textContent='Little Elsewhere';
 document.getElementById('status').textContent='街全体 · CC0アセット / 一人称と室内';
 const views=document.createElement('select');views.id='town-view';views.setAttribute('aria-label','街の視点');
 for(const [value,label] of [['overview','街の全景'],['plaza','広場を歩く'],['library','Libraryの室内'],['lab','Labの室内'],['homes','住宅の庭']]){const o=document.createElement('option');o.value=value;o.textContent=label;views.append(o);}
 document.querySelector('footer>div').prepend(views);
 function view(){const v=views.value;const poses={overview:[[13,13,20],[0,1,-2]],plaza:[[0,1.68,5.4],[0,1.7,-5]],library:[[60,1.68,3.4],[60,1.6,-3]],lab:[[40,1.68,3.4],[40,1.6,-3]],homes:[[5.5,1.68,3.5],[10,1.6,-1]]};world.camera.position.set(...poses[v][0]);world.camera.lookAt(...poses[v][1]);world.camera.fov=v==='overview'?55:64;world.camera.updateProjectionMatrix();frames=[];}
 views.onchange=()=>{document.getElementById('metrics').textContent='';view();};view();
}
const select=document.getElementById('expression');for(const name of expressions){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}select.value='happy';
document.getElementById('wave').onclick=()=>visual?.wave(t);document.getElementById('clean').onclick=()=>document.querySelectorAll('header,footer').forEach(e=>e.hidden=true);addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('header,footer').forEach(e=>e.hidden=false);});
function frame(now){requestAnimationFrame(frame);const dt=now-last;last=now;if(document.hidden)return;t+=Math.min(dt,50)/1000;area?.update(t);townArea?.update(t);visual?.update(t,select.value,true);world.renderer.render(world.scene,world.camera);if(t>3&&dt>0)frames.push(dt);frames=frames.slice(-300);if(frames.length>30){const avg=frames.reduce((a,b)=>a+b)/frames.length,sorted=[...frames].sort((a,b)=>a-b);document.getElementById('metrics').textContent=JSON.stringify({view:town?document.getElementById('town-view').value:before?'before':'after',samples:frames.length,meanFrameMs:+avg.toFixed(2),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,geometries:world.renderer.info.memory.geometries,textures:world.renderer.info.memory.textures,pixelRatio:world.renderer.getPixelRatio()},null,2);}}
requestAnimationFrame(frame);
