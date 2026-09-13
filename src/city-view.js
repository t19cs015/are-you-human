import * as T from '/node_modules/three/build/three.module.js';
import {districts,places} from './town-layout.js';

export function createCityView(world,callbacks){
  const $=id=>document.getElementById(id),{camera,renderer,npcs}=world,surface=renderer.domElement;
  let active=false,overview=false,selected=null,borrowed=null,city=null,agents=[],orbit=.2,distance=73,drag=null,clickedAfterDrag=false,following=false;
  const focus=new T.Vector3(-6,0,22),wanted=new T.Vector3(),lookCamera=new T.PerspectiveCamera(),markers=new Map(),cards=new Map(),projected=new T.Vector3();
  const oldFog=world.scene.fog.density;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function overviewChanged(){
    document.body.classList.toggle('city-overview',overview);$('city-overview').hidden=!overview;$('city-markers').hidden=!overview;
    $('city-button').textContent=overview?'街へ降りる · M':'街を見渡す · M';
    $('city-detail').hidden=!overview||!selected;
    if(overview)callbacks.release();
  }
  function select(id){
    if(!npcs.some(n=>n.id===id))return;selected=id;following=true;distance=27;
    if(!overview){overview=true;overviewChanged();}
    $('city-detail').hidden=false;renderDetail();
  }
  function show(){active=true;overview=true;overviewChanged();$('city-button').hidden=false;}
  function hide(){overview=false;overviewChanged();}
  function toggle(){if(!active)return;callbacks.beforeView();overview=!overview;overviewChanged();}
  function district(id){
    const d=districts.find(d=>d.id===id);if(!d)return;callbacks.beforeView();show();following=false;selected=null;focus.set(d.x,0,d.z);distance=31;$('city-detail').hidden=true;
  }
  for(const d of districts){const b=document.createElement('button');b.textContent=d.name;b.onclick=()=>district(d.id);$('districts').append(b);}
  for(const n of npcs){
    const card=document.createElement('button');card.className='city-resident';card.style.setProperty('--resident-color','#'+n.accent.toString(16).padStart(6,'0'));
    const icon=document.createElement('span');icon.className='resident-dot';icon.textContent=n.name[0];const copy=document.createElement('span'),name=document.createElement('strong'),status=document.createElement('small');name.textContent=n.name;copy.append(name,status);card.append(icon,copy);card.onclick=()=>select(n.id);$('city-residents').append(card);cards.set(n.id,{card,status});
    const marker=document.createElement('button');marker.className='city-marker';marker.textContent=n.name;marker.style.setProperty('--resident-color','#'+n.accent.toString(16));marker.setAttribute('aria-label',n.name+'を追いかける');marker.onclick=e=>{e.stopPropagation();select(n.id);};$('city-markers').append(marker);markers.set(n.id,marker);
  }
  $('city-button').onclick=toggle;
  $('city-all').onclick=()=>{callbacks.beforeView();show();selected=null;following=false;focus.set(-6,0,22);distance=73;$('city-detail').hidden=true;};
  $('city-close-detail').onclick=()=>{selected=null;following=false;$('city-detail').hidden=true;};
  $('city-visit').onclick=()=>{if(!selected)return;callbacks.visit(selected);hide();};
  $('city-borrow').onclick=()=>{if(!selected)return;callbacks.borrow(selected);hide();};
  $('leave-resident').onclick=()=>callbacks.leave();
  $('borrowed-talk').onclick=()=>borrowed&&callbacks.chat(borrowed);
  function renderDetail(){
    if(!selected)return;const n=npcs.find(n=>n.id===selected),t=city?.tasks[selected],a=agents.find(a=>a.id===selected);
    $('city-name').textContent=n.name;$('city-role').textContent=n.role;$('city-desire').textContent=city?.episode?.wishes[selected]||a?.desire||'この街で、今日の続きを。';
    $('city-task').textContent=t?.label||'次にすることを考えている';
    $('city-destination').textContent=t?(t.phase==='work'&&t.waitingFor?t.waitingFor:(t.phase==='work'?(t.duration?'ここで作業中 · ':'ここで待っている · '):'向かう先 · ')+places[t.site].name):'少し手が空いている';
    $('city-reason').textContent=t?.reason||'';$('city-reason').hidden=!t?.reason;
    $('city-progress').hidden=!t||!t.duration||t.phase!=='work';$('city-progress').value=t?.progress||0;$('city-progress').max=t?.duration||1;
    $('city-visit').textContent=n.name+'のそばへ';$('city-borrow').textContent='目線を借りる';
    for(const [id,c] of cards)c.card.setAttribute('aria-pressed',String(id===selected));
  }
  let eventKey='';
  function update(next,nextAgents){
    city=next;agents=nextAgents||agents;if(!city?.active)return;
    for(const [id,c] of cards){const t=city.tasks[id];c.status.textContent=t?.label||'次の用事を考え中';}
    const minutes=19*60+42+Math.floor(city.clock/25);$('town-clock').textContent=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
    const g=city.infrastructure;
    const progress=g?.enabled?['風が吹くと、中央の塔が灯る。','白い街灯が、いつもの道に増えた。','中央棟が、聞き覚えのある言葉を繰り返す。','便利になった街に、あの場所は残るだろうか。'][g.phase]:city.readingReady?'川辺に、今夜の居場所ができた。':city.repaired?'灯りが戻った。住民たちは次の用事へ。':'川辺の灯りが消えている。誰かが動き始めた。';
    $('city-headline').textContent=progress;
    const latest=city.events.slice(-3).reverse(),key=latest.map(e=>e.id).join(',');
    if(key!==eventKey){eventKey=key;$('city-events').replaceChildren();for(const e of latest){const button=document.createElement('button');button.className='city-event '+e.kind;const dot=document.createElement('span');dot.textContent=e.kind==='milestone'?'✦':'·';const text=document.createElement('span');text.textContent=e.text;button.append(dot,text);button.onclick=()=>{callbacks.beforeView();show();selected=null;following=false;const p=places[e.site];focus.set(p.x,0,p.z);distance=26;$('city-detail').hidden=true;};$('city-events').append(button);}}
    renderDetail();
  }
  function setBorrowed(id){borrowed=id;$('borrowed-view').hidden=!id;document.body.classList.toggle('borrowed-view',!!id);if(id){const n=npcs.find(n=>n.id===id);$('borrowed-name').textContent=n.name+'の目線';$('borrowed-talk').textContent=n.name+'に声をかける';}}
  surface.addEventListener('pointerdown',e=>{if(!overview||e.button!==0)return;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,id:e.pointerId,moved:false};surface.setPointerCapture(e.pointerId);});
  surface.addEventListener('pointermove',e=>{
    if(!overview||!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
    if(drag.moved){following=false;const amount=distance/innerHeight*1.15;focus.x-=Math.cos(orbit)*dx*amount+Math.sin(orbit)*dy*amount;focus.z+=Math.sin(orbit)*dx*amount-Math.cos(orbit)*dy*amount;focus.x=T.MathUtils.clamp(focus.x,-43,27);focus.z=T.MathUtils.clamp(focus.z,-7,42);}
    drag.x=e.clientX;drag.y=e.clientY;
  });
  surface.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;clickedAfterDrag=drag.moved;drag=null;if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);});
  surface.addEventListener('pointercancel',()=>drag=null);
  surface.addEventListener('click',e=>{
    if(!overview||clickedAfterDrag){clickedAfterDrag=false;return;}
    const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
    const hit=ray.intersectObjects(npcs.map(n=>n.root),true)[0];if(hit){let object=hit.object;while(object){const n=npcs.find(n=>n.root===object);if(n){select(n.id);break;}object=object.parent;}}
  });
  surface.addEventListener('wheel',e=>{if(!overview)return;e.preventDefault();distance=T.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),15,100);},{passive:false});
  function cameraFrame(dt,keys,preview=false){
    if(!overview&&!preview)return;
    if(following&&selected){const n=npcs.find(n=>n.id===selected);focus.lerp(new T.Vector3(n.root.position.x,0,n.root.position.z),1-Math.exp(-dt*4));}
    if(!preview){const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));if(dx||dz){following=false;focus.x=T.MathUtils.clamp(focus.x+dx*dt*distance*.3,-43,27);focus.z=T.MathUtils.clamp(focus.z+dz*dt*distance*.3,-7,42);}}
    const spread=innerWidth/innerHeight<1.15?1.4:1;wanted.set(focus.x+Math.sin(orbit)*distance*.65*spread,distance*.85*spread,focus.z+Math.cos(orbit)*distance*.65*spread);
    const blend=reduced.matches?1:1-Math.exp(-dt*4.5);camera.position.lerp(wanted,blend);lookCamera.position.copy(camera.position);lookCamera.lookAt(focus.x,0,focus.z);camera.quaternion.slerp(lookCamera.quaternion,blend);world.scene.fog.density=T.MathUtils.lerp(world.scene.fog.density,.006,blend);
  }
  function renderMarkers(){
    if(!overview){world.scene.fog.density=T.MathUtils.lerp(world.scene.fog.density,oldFog,.07);return;}
    camera.updateMatrixWorld();
    for(const n of npcs){const marker=markers.get(n.id);projected.copy(n.root.position);projected.y=2.65;projected.project(camera);marker.hidden=projected.z< -1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;marker.style.left=(projected.x*.5+.5)*innerWidth+'px';marker.style.top=(-projected.y*.5+.5)*innerHeight+'px';marker.classList.toggle('selected',selected===n.id);}
  }
  return {get overview(){return overview;},get selected(){return selected;},show,hide,toggle,select,district,update,setBorrowed,cameraFrame,renderMarkers,showPlace(site){const p=places[site];if(!p)return;show();selected=null;following=false;focus.set(p.x,0,p.z);distance=site==='relay'?34:28;$('city-detail').hidden=true;},reset(){selected=null;following=false;focus.set(-6,0,22);distance=73;eventKey='';setBorrowed(null);show();}};
}
