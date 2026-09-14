import {communityObjects,powerRoutes,communityIdeas} from './community-rules.js';
import {places} from './town-layout.js';
const names={mia:'Mia',ren:'Ren',tomo:'Tomo',shell:'Shell',central:'中央'};
export function createCommunityView(hooks){
  const root=document.createElement('div');root.id='community';root.hidden=true;
  root.innerHTML=`<aside class="community-goal"><small id="community-chapter">YOUR FIRST RIPPLE</small><h2 id="community-goal"></h2><p id="community-next"></p><progress id="community-progress" max="12" value="0" hidden></progress><div class="community-flows"><span>街の灯り <b id="community-power">0</b></span><span>中央の更新 <b id="community-central">0</b></span></div><div class="community-shortcuts"><button id="community-plan">明日のスケッチ ↗</button><button id="community-visit">中央に会いにいく ↗</button></div></aside><button id="community-interact" hidden></button><div id="community-subtitle" hidden aria-live="polite"><small id="community-speaker"></small><span id="community-line"></span></div><section id="community-board" class="modal panel" hidden aria-label="明日のスケッチ"><button id="community-close" class="close" aria-label="スケッチを閉じる">×</button><small class="eyebrow">MAKE ROOM FOR SOMETHING UNEXPECTED</small><h2>明日は、どんな街にしよう。</h2><p>中央は、街をもっと便利にしたい。<br>あなたと住人たちは、どんな場所を増やす？</p><div id="community-ideas"></div><form id="community-form"><label for="community-message">みんなに相談する案</label><textarea id="community-message" maxlength="700" rows="3" placeholder="例：中央にも電力を残して、音が鳴る花の庭を…"></textarea><button id="community-submit" class="primary">みんなに相談する ↗</button></form><p id="community-status" role="status"></p><button id="community-redraw" hidden>スケッチの生成をもう一度試す</button><div id="community-discussion" role="log"></div><figure id="community-art" hidden><img id="community-image" alt="住人とあなたの提案から生成した場所のスケッチ"><figcaption id="community-art-note"></figcaption></figure><p class="community-fine">ここに書く案は、みんなと共有されます。絵と声はAIが生成します。庭・遊び場・星を見る場所として形になり、絵は街のスケッチに残ります。</p></section>`;
  document.body.append(root);const $=id=>root.querySelector('#community-'+id);
  let city=null,enabled=false,seen=0,pending=false,actionPending=false,current=null,away=false,muted=false,suspended=false,generation=0,queue=[],speaking=false,voiceRevision=0,clip=null,clipBy=null,subtitleUntil=0,artId=null,artPending=false,lastEvent=null;
  for(const idea of communityIdeas){const b=document.createElement('button');b.textContent=idea;b.onclick=()=>{$('message').value=idea;$('message').focus();};$('ideas').append(b);}
  function close(){$('board').hidden=true;hooks.focus();}
  function open(){if(!enabled)return;hooks.prepare();$('board').hidden=false;render();}
  $('close').onclick=close;$('plan').onclick=open;$('visit').onclick=()=>{close();if(away)hooks.home();else hooks.central();};
  const near=(p,q,r)=>Math.hypot(p.x-q.x,p.z-q.z)<r;
  function target(position,yaw){
    if(!enabled)return null;
    const options=Object.entries(communityObjects).map(([id,p])=>({id,...p}));
    for(const p of new Map(city.community.completed.map(p=>[p.site,p])).values()){if(city.community.project?.stage==='building'&&city.community.project.site===p.site)continue;options.push({id:'place',revision:p.revision,...places[p.site],name:p.kind==='playground'?'音の遊具を鳴らす':p.kind==='observatory'?'星を揺らす':'花の灯りに触れる',radius:3});}
    return options.filter(p=>near(p,position,p.radius)).filter(p=>{const dx=p.x-position.x,dz=p.z-position.z,d=Math.hypot(dx,dz);return d<1.4||(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/(d||1)>.1;}).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0]||null;
  }
  async function interact(){
    if(!current||actionPending)return false;
    if(current.id==='board'){open();return true;}
    actionPending=true;const id=current.id,revision=current.revision,stamp=generation;
    try{const r=await hooks.api('community/interact',{object:id,revision,position:hooks.position()});if(stamp!==generation)return true;hooks.changed(r.city);
      if(r.changed){hooks.pulse(id,r.site);hooks.chime(id);if(id==='switch')hooks.notice('灯りの流れ → '+powerRoutes[r.city.community.route].name,3);}
      else if(r.cooldown)hooks.notice('風をためています。あと '+Math.ceil(r.cooldown)+' 秒。',2);
    }catch(e){hooks.error(e);}finally{actionPending=false;}return true;
  }
  $('interact').onclick=interact;
  $('form').onsubmit=async e=>{
    e.preventDefault();if(pending)return;pending=true;const stamp=generation;$('status').textContent='みんなが案を読んで、相談しています。外を歩いていても大丈夫。';render();
    try{const r=await hooks.api('community/propose',{message:$('message').value});if(stamp!==generation)return;hooks.changed(r.city);
      $('status').textContent=r.accepted?(r.mode==='live'?'住人二人が合意しました。現地で作り始めます。':'デモの相談です。APIを接続すると住人が案を考えます。'):'少し違う案なら、一緒に作れそう。';
      if(r.warning)hooks.notice(r.warning);
      if(r.accepted){close();hooks.lookProject(r.city.community.project);requestArt(r.city.community.project.revision,stamp);}
    }catch(e){$('status').textContent=e.message==='TRY_SWITCH_FIRST'?'まず、目の前の分配器を切り替えてみよう。':e.message==='BUSY'?'住人が別の相談中です。少し待って、もう一度。':'相談が途切れました。もう一度試せます。';}
    finally{pending=false;render();}
  };
  async function requestArt(revision,stamp){
    artPending=true;render();
    try{await hooks.api('community/image',{revision},{timeout:100000});if(stamp===generation)await hooks.refresh();}catch{if(stamp===generation)hooks.notice('絵が届くのを待っています。場所づくりは続けられます。');}finally{artPending=false;render();}
  }
  $('redraw').onclick=()=>{if(city.community.project&&!artPending)requestArt(city.community.project.revision,generation);};
  async function loadArt(id){
    artId=id;const stamp=generation;
    try{const r=await hooks.api('community/art?id='+encodeURIComponent(id));if(stamp!==generation||artId!==id)return;$('image').src=r.url;hooks.art(r.url);$('art').hidden=false;}catch{if(stamp===generation)$('art-note').textContent='スケッチを読み込めませんでした。';}
  }
  function render(){
    if(!enabled||!city?.community)return;const c=city.community,p=c.project;
    $('goal').textContent=!c.switches?'まず、その灯りに触れてみて。':p?.stage==='building'?p.title:p?.stage==='complete'?'あなたの案が、街の一部になった。':'この灯りで、何を作ろう。';
    $('next').textContent=!c.switches?'Eで分配器を切り替える。':p?.stage==='building'?`${names[p.lead]} と ${names[p.partner]} · ${places[p.site].name}へ。${p.waitingFor||'一緒に作業中'}`:p?.stage==='complete'?'できた場所で遊ぶ。次の案を出す。中央の声も聞いてみよう。':'明日のスケッチへ。あなたの案を二人に相談しよう。';
    $('chapter').textContent=p?.stage==='complete'?'A PLACE THAT WASN’T IN THE PLAN':p?.stage==='building'?'MADE TOGETHER':'YOUR FIRST RIPPLE';
    $('power').textContent=Math.round(c.energy);$('central').textContent=Math.round(c.central)+'%'+(city.infrastructure.modelEnabled?'':' · 停止中');
    $('redraw').hidden=!p||pending||artPending||c.art?.status==='ready'||c.artRequests>=3;
    $('progress').hidden=p?.stage!=='building';$('progress').value=p?.progress||0;
    $('submit').disabled=pending||p?.stage==='building';$('submit').textContent=pending?'二人が相談中…':p?.stage==='building'?'この場所を作っています':'みんなに相談する ↗';
    $('plan').disabled=!c.switches;$('plan').textContent=p?.stage==='building'?'相談とスケッチを見る ↗':'明日のスケッチ ↗';
    $('art-note').textContent=c.art?.status==='ready'?'あなたと住人の案から生成 · '+c.art.model:c.art?.status==='generating'?'みんなの案を絵にしています…':c.art?.reason||'';
    if(c.art?.status==='ready'&&c.art.id!==artId)loadArt(c.art.id);
    if(c.art?.status!=='ready')$('art').hidden=true;
    if(!pending&&p){$('status').textContent=c.art?.status==='generating'?'みんなの案を、一枚の絵にしています…':c.art?.status==='unavailable'?c.art.reason:p.stage==='complete'?'場所が完成しました。次の案も、ここから相談できます。':'二人が現地で作っています。街の灯りを分けて応援しよう。';if(p.mode==='demo')$('status').textContent+=' · 定型の相談で進行中';}
    const discussion=city.events.filter(e=>e.community&&['live','demo'].includes(e.source)).slice(-4);
    $('discussion').replaceChildren(...discussion.map(e=>{const p=document.createElement('p');p.textContent=names[e.by]+'：'+e.text;return p;}));
  }
  function show(e){lastEvent=e;hooks.say(e.by,e.text,e.kind);$('speaker').textContent=names[e.by];$('line').textContent=e.text;$('subtitle').hidden=false;subtitleUntil=performance.now()+6500;}
  async function speakNext(){
    if(speaking||muted||suspended||!queue.length||!enabled)return;speaking=true;const e=queue.shift(),stamp=generation,voiceStamp=voiceRevision;
    try{const r=await hooks.api('community/speech',{event:e.id});if(stamp!==generation||voiceStamp!==voiceRevision||muted||suspended)return;
      if(r.url){show(e);clipBy=e.by;clip=new Audio(r.url);clip.volume=.85;await clip.play();await new Promise(resolve=>{clip.onended=resolve;clip.onerror=resolve;setTimeout(resolve,15000);});}
    }catch{}finally{if(stamp===generation&&voiceStamp===voiceRevision){speaking=false;clip=null;speakNext();}}
  }
  return {get centralVoiceState(){return clipBy==='central'&&clip&&!clip.paused&&!clip.ended?'speaking':'idle';},get hasTarget(){return !!current;},get target(){return current;},openBoard:open,get open(){return !$('board').hidden;},get busy(){return pending;},get enabled(){return enabled;},get artPending(){return artPending;},close,interact,
    stop(){generation++;enabled=false;root.hidden=true;close();clip?.pause();clip=null;queue=[];speaking=false;},
    activate(next,fresh){generation++;enabled=!!next?.community?.active&&!next?.memoryGame?.active;root.hidden=!enabled;city=next;seen=fresh?0:next?.serial||0;artId=null;$('art').hidden=true;$('subtitle').hidden=true;queue=[];clip?.pause();speaking=false;render();},
    setMuted(value){muted=value;if(muted){voiceRevision++;clip?.pause();queue=[];speaking=false;}else speakNext();},
    suspend(value){suspended=value;if(value){voiceRevision++;clip?.pause();queue=[];speaking=false;}else speakNext();},
    update(next){city=next;if(!enabled||!city?.community)return;render();
      const events=next.events.filter(e=>e.community&&e.id>seen);seen=next.serial;
      if(events.some(e=>e.kind==='sync')){voiceRevision++;clip?.pause();queue=[];speaking=false;}
      for(const e of events){if(e.kind==='human-relay'){hooks.say(e.by,e.text,e.kind);continue;}show(e);queue.push(e);if(e.kind==='milestone'){hooks.pulse('place');hooks.chime('complete');hooks.notice(e.text,7);}}
      if(queue.length>5)queue=queue.slice(-5);speakNext();
    },
    frame(position,yaw,available,residentNearby=false){
      if(!enabled)return;away=Math.hypot(position.x,position.z)>14;$('visit').textContent=away?'広場の灯りへ戻る ↗':'中央に会いにいく ↗';current=available?target(position,yaw):null;$('interact').hidden=!current;
      if(current){let label=current.name;if(current.id==='switch')label='灯り → '+powerRoutes[({central:'town',town:'shared',shared:'central'})[city.community.route]].name;$('interact').textContent=(residentNearby?'触れる　':'E　')+label;}
      root.querySelector('.community-goal').hidden=!available||away&&city.community.project?.stage!=='building';$('subtitle').hidden=suspended||performance.now()>subtitleUntil;
    },
  };
}
