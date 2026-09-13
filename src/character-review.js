import * as T from '/node_modules/three/build/three.module.js';
import {residents} from './story.js';
import {upgradeResident} from './resident-visual.js';
const $=id=>document.getElementById(id),scene=new T.Scene();scene.background=new T.Color('#172b3e');
const camera=new T.PerspectiveCamera(36,1,.05,40),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('stage').append(renderer.domElement);
scene.add(new T.HemisphereLight(0xfff9eb,0x718896,2));const key=new T.DirectionalLight(0xffedd2,3);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=4;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;scene.add(key);
const rim=new T.DirectionalLight(0xb7d8ef,2);rim.position.set(3,4,-3);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#172b3e',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.065;floor.receiveShadow=true;scene.add(floor);
const entries=residents.map(data=>{const root=new T.Group(),body=new T.Group(),workProp=new T.Group();root.add(body);body.add(workProp);workProp.visible=false;scene.add(root);const n={...data,root,body,workProp,eyes:[]};return {n,visual:upgradeResident(n)};});
let selected='all',angle=.06,clock=1,gestureUntil=0,previous=performance.now();
const descriptions={all:'左から Mia · Ren · Tomo · Shell',mia:'Mia · 好奇心旺盛な聞き手。ピーチ色の外装とマフラー。',ren:'Ren · 理論派の研究者。メガネと紺のベスト。',tomo:'Tomo · 試して学ぶ開発者。猫耳、しっぽ、試作道具。',shell:'Shell · 静かな街の管理者。緑の外装と二枚の葉。'};
function layout(){entries.forEach(({n},i)=>{n.root.visible=selected==='all'||selected===n.id;n.root.position.set(selected==='all'?(i-1.5)*1.5:0,0,0);});$('description').textContent=descriptions[selected];}
$('residents').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;selected=b.dataset.id;angle=.16;$('zoom').value=100;for(const button of $('residents').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button===b));layout();});
$('wave').onclick=()=>{gestureUntil=clock+2.1;for(const e of entries)e.visual.wave(clock);};
let drag=null;$('stage').onpointerdown=e=>{drag={x:e.clientX,angle};$('stage').setPointerCapture(e.pointerId);};$('stage').onpointermove=e=>{if(drag)angle=drag.angle+(e.clientX-drag.x)*.008;};$('stage').onpointerup=$('stage').onpointercancel=()=>drag=null;
new ResizeObserver(()=>{const width=$('stage').clientWidth,height=$('stage').clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe($('stage'));
layout();const loaded=await Promise.all(entries.map(e=>e.visual.ready));$('status').textContent=loaded.every(Boolean)?'Blenderのオリジナルモデル · 表情と動作を確認できます':'一部モデルの読み込みに失敗しました';if(!loaded.every(Boolean))$('status').dataset.error='true';
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;clock+=dt;for(const {n,visual} of entries)visual.update(clock,$('expression').value,clock<gestureUntil&&n.root.visible);const distance=(selected==='all'?Math.max(6.8,10/camera.aspect):Math.max(3.8,3/camera.aspect))*100/Number($('zoom').value);camera.position.set(Math.sin(angle)*distance,selected==='all'?2.7:1.42,Math.cos(angle)*distance);camera.lookAt(0,1.05,0);renderer.render(scene,camera);}
requestAnimationFrame(frame);
