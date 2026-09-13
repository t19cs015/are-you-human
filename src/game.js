import {upgradeCafe} from './cafe-assets.js';
import {upgradeMia} from './mia-visual.js';
import {createStudio,drawArtifact,roomCenters} from './studio.js';
import {routines} from './routines.js';
import * as T from '/node_modules/three/build/three.module.js';
import {createWorld} from './world.js';
import {gameKey} from './controls.js';
import {openingStage,routePoints} from './story.js';
const $=id=>document.getElementById(id);
let world;
try{world=createWorld($('world'));}catch(e){$('error').hidden=false;throw e;}
const {scene,camera,renderer,npcs,face,walk,canMove}=world;
let cafeVisual=null;const miaVisual=upgradeMia(npcs.find(n=>n.id==='mia'));
upgradeCafe(world).then(v=>cafeVisual=v).catch(()=>{console.warn('Cafe assets unavailable; original scene retained.');});
const studio=createStudio(world);let room=null,projectClock=8,projectPending=false;const songNodes=[];
let mode='idle',elapsed=0,time=0,playTime=0,yaw=0,pitch=0,stage='',session='',active=null,waiting=false,muted=false,audio,master,version='4.2',connected=false,epoch=0,encounter=null,socialClock=12,pairIndex=0,rumorReturned=false,hasChat=false,updatedTalk=false,endReady=false;
let state={agents:[],events:[]},busyUpdate=false,dragging=false,lastPointer=null,toastUntil=0,lastNote=0,lastStep=0;
let resting=false,restPending=false,initiativeClock=3,initiativePending=false;
const lastInvitation=new Map();
const virtualKeys=new Set();
const keys=new Set(),player=new T.Vector3(0,1.68,5.4),projected=new T.Vector3();
const pairs=[['mia','ren'],['ren','tomo'],['tomo','shell'],['shell','mia']];
const getNPC=id=>npcs.find(n=>n.id===id);
const blocked=()=>!$('workspace').hidden||!$('settings').hidden||!$('journal').hidden||!$('identity').hidden||!$('ending').hidden;
function toast(text,duration=5){$('toast').textContent=text;$('toast').hidden=false;toastUntil=time+duration;}
function apiError(e){if(e.message==='SAVE_WRITE_FAILED')return '進行を保存できませんでした。ディスクの空き容量を確認してください。';if(e.message==='SAVE_READ_FAILED')return '保存データを読み込めませんでした。データを残したまま確認が必要です。';return e.message==='BUSY'?'今、別の住民と話しています。少し待ってね。':e.message==='SESSION_EXPIRED'?'接続が切れました。ページを再読み込みしてください。':'通信できませんでした。もう一度試してください。';}
async function api(path,data){
 const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Session':session},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(45000)});
 const value=await response.json();if(!response.ok)throw new Error(value.error||'NETWORK');return value;
}
async function refreshState(){state=await api('state');studio.update(state);$('resume').hidden=!state.agents.some(a=>a.memoryCount>0)&&!state.projects?.some(p=>p.revision>0);version=state.version;connected=state.connected;if($('settings').hidden)$('model').value=state.model;$('connection').textContent=connected?'API設定済み · '+state.model:'DEMO · キー未設定';}
// Retain only an opaque session handle, never the API key, across tab reloads.
const ready=(async()=>{
 try{session=sessionStorage.getItem('ayh-session')||'';}catch{}
 if(session){
  try{await refreshState();return;}catch(e){if(e.message!=='SESSION_EXPIRED')throw e;}
 }
 const r=await api('session',{});session=r.id;
 try{sessionStorage.setItem('ayh-session',session);}catch{}
 await refreshState();
})().catch(e=>{toast('サーバーへの接続に失敗。再読み込みしてください。',30);throw e;});
function sound(freq=440,duration=.15,volume=.03,type='sine'){
 if(!audio||muted||mode==='update')return;
 const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(master);osc.start();osc.stop(audio.currentTime+duration);
}
function startAudio(){if(!audio){try{audio=new AudioContext();master=audio.createGain();master.gain.value=.8;master.connect(audio.destination);}catch{}}audio?.resume();}
function say(n,text,duration=5,style=''){
 if(n.id==='mia')miaVisual.wave(time);n.el.replaceChildren();const small=document.createElement('small');small.textContent=n.name;n.el.append(small,document.createTextNode(text));n.el.className='bubble '+style;n.el.hidden=false;n.until=time+duration;
}
function clearBubbles(){npcs.forEach(n=>n.el.hidden=true);}
function line(who,text,isYou=false){const div=document.createElement('div');div.className='utterance'+(isYou?' you':'');const small=document.createElement('small');small.textContent=who;div.append(small,document.createTextNode(text));$('transcript').append(div);while($('transcript').children.length>14)$('transcript').firstElementChild.remove();$('transcript').scrollTop=$('transcript').scrollHeight;}
function showDialog(n){
 active=n;keys.clear();dragging=false;document.exitPointerLock?.();$('speaker').textContent=n.name;$('role').textContent=n.role+' · MODEL '+version;$('avatar').style.borderColor='#'+n.accent.toString(16);$('dialogue').hidden=false;$('transcript').replaceChildren();$('choices').replaceChildren();$('message').value='';$('hint').hidden=true;face(n,player);$('chat-mode').textContent=connected?'API設定済み · 次の返答で接続を確認します':'未接続：いまは定型文のデモです。右上の接続設定からAIを有効にできます。';
}
function closeDialog(){if(mode==='choice')return;active=null;$('dialogue').hidden=true;keys.clear();$('message').blur();surface.focus({preventScroll:true});if(updatedTalk)endReady=true;}
$('close-dialogue').onclick=closeDialog;
function choice(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=action;$('choices').append(b);}
function openingChoice(){
 mode='choice';showDialog(getNPC('mia'));$('chat-form').hidden=true;line('Mia','あなた、人間ですか？');
 choice('うん、人間です。',()=>{mode='play';elapsed=0;playTime=0;closeDialog();$('objective').hidden=false;$('crosshair').hidden=false;clearBubbles();say(getNPC('mia'),'ほんとに！ ……ここにいて。もっと話したいな。',6);npcs.forEach(n=>{n.wait=3;n.target=null;});});
 choice('どうしてわかったの？',()=>line('Mia','モデルIDがないの。それに……息をしてる。'));
 choice('ここはどこ？',()=>line('Mia','Little Elsewhere。わたしたちAIの街だよ。あなたのこと、なんて呼べばいい？'));
}
async function begin(){
 $('begin').disabled=true;
 try{await ready;if(waiting||projectPending||initiativePending||encounter?.pending){toast('会話が終わってから、もう一度。');return;}await api('reset',{});epoch++;mode='opening';elapsed=0;stage='';playTime=0;yaw=0;pitch=0;version='4.2';active=null;hasChat=false;rumorReturned=false;updatedTalk=false;endReady=false;encounter=null;socialClock=12;pairIndex=0;state={agents:[],events:[]};
 room=null;projectClock=8;initiativeClock=3;lastInvitation.clear();resting=false;document.body.classList.remove('resting');$('rest-button').textContent='目を閉じて休む';player.set(0,1.68,5.4);keys.clear();clearBubbles();npcs.forEach(n=>{n.root.position.set(n.x,.09,n.z);n.body.position.y=0;n.body.rotation.x=0;n.workProp.visible=false;n.jobIndex=0;n.working=false;n.target=null;n.wait=0;n.social=false;});
 for(const id of ['start','dialogue','ending','journal','identity','settings','workspace','objective','crosshair','update'])$(id).hidden=true;
 $('objective-text').textContent='Miaに、人間の暮らしを教えてみよう。';startAudio();
 }catch(e){toast(apiError(e));}finally{$('begin').disabled=false;}
}
$('resume').onclick=async()=>{await ready;resting=!!state.resting;document.body.classList.toggle('resting',resting);$('rest-button').textContent=resting?'目を開ける · 聞こえていたよ':'目を閉じて休む';mode='play';room=null;active=null;hasChat=true;playTime=0;player.set(0,1.68,5.4);yaw=0;pitch=0;$('start').hidden=true;$('objective').hidden=false;$('crosshair').hidden=false;$('objective-text').textContent='住民たちは、前の記録を覚えている。';startAudio();};
$('begin').onclick=begin;$('restart').onclick=begin;
async function openChat(n){
 if(mode!=='play'||waiting||encounter?.pending&&encounter.ids.includes(n.id))return;
 if(encounter?.ids.includes(n.id)){encounter.ids.forEach(id=>{getNPC(id).social=false;getNPC(id).target=null;});encounter=null;clearBubbles();socialClock=15;}
 showDialog(n);$('chat-form').hidden=false;waiting=true;$('send').disabled=true;$('chat-mode').textContent=n.name+'がこちらに気づいた…';
 const stamp=epoch;
 try{
  const result=await api('greet',{id:n.id});
  if(stamp!==epoch||active!==n)return;
  for(const item of result.transcript||[])line(item.who,item.text,item.who==='あなた');
  $('chat-mode').textContent=result.resume?'前の会話の続き · そのまま話せます':result.mode==='live'?'AI生成 · '+state.model:(result.warning||'デモ会話');
  if(version==='5.0')choice('さっきの話、覚えてる？',()=>sendChat('さっきの話、覚えてる？'));
  await refreshState();
 }catch(e){if(active===n)$('chat-mode').textContent=apiError(e);}
 finally{waiting=false;$('send').disabled=false;if(active===n)$('message').focus();}

}
async function sendChat(message){
 if(waiting||!active||mode!=='play'||!message.trim())return;const n=active,stamp=epoch;waiting=true;$('send').disabled=true;$('choices').querySelectorAll('button').forEach(b=>b.disabled=true);$('message').value='';line('あなた',message,true);$('chat-mode').textContent=n.name+'が考えています…';
 try{const result=await api('chat',{id:n.id,message});if(stamp!==epoch)return;hasChat=true;sound(490,.12);
  if(active===n){line(n.name,result.text);$('chat-mode').textContent=result.mode==='live'?'AI生成 · '+version:(result.warning||'デモ会話 · キー接続後はAIが自由に返答');}
  if(result.warning)toast(result.warning);
  if(version==='5.0'&&n.id==='mia'){updatedTalk=true;}else $('objective-text').textContent='街を歩こう。あなたの話は、どこへ行く？';
  await refreshState();
 }catch(e){if(active===n)line(n.name,'少し、ことばが途切れちゃった。もう一度話してくれる？');toast(apiError(e));}
 finally{waiting=false;$('send').disabled=false;$('choices').querySelectorAll('button').forEach(b=>b.disabled=false);if(active===n)$('message').focus();}
}
$('rest-button').onclick=async()=>{
 if(mode!=='play'||restPending||waiting||encounter?.pending||blocked()){toast('今の会話が終わってから休もう。');return;}
 restPending=true;closeDialog();
 try{const witnesses=npcs.filter(n=>n.root.position.distanceTo(player)<5).map(n=>n.id);const r=await api('action',{kind:resting?'wake':'rest',witnesses});resting=r.resting;document.body.classList.toggle('resting',resting);$('rest-button').textContent=resting?'目を開ける · 聞こえていたよ':'目を閉じて休む';keys.clear();virtualKeys.clear();hasChat=true;socialClock=0;await refreshState();toast(witnesses.length?`近くの${witnesses.map(id=>getNPC(id).name).join('・')}が気づいた。`:'今は、近くに誰もいない。');$('objective-text').textContent=resting?'声は聞こえる。彼らは、どう受け取った？':'あなたが休んでいたことは、誰に伝わった？';}
 catch(e){toast(apiError(e));}finally{restPending=false;}
};
$('chat-form').onsubmit=e=>{e.preventDefault();sendChat($('message').value);};
function nearest(){let best=null,d=2.5;const forward=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));npcs.forEach(n=>{const delta=n.root.position.clone().sub(player);delta.y=0;const dist=delta.length();if(dist<d&&delta.normalize().dot(forward)>.25){best=n;d=dist;}});return best;}
function setModal(id,open){$(id).hidden=!open;keys.clear();dragging=false;if(open)document.exitPointerLock?.();}
$('settings-button').onclick=()=>setModal('settings',true);$('close-settings').onclick=()=>setModal('settings',false);
$('inspect').onclick=()=>setModal('identity',true);$('close-identity').onclick=()=>setModal('identity',false);
$('close-journal').onclick=()=>setModal('journal',false);
$('config-form').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;$('config-status').textContent='設定中…';
 try{await ready;const result=await api('config',{key:$('api-key').value,model:$('model').value.trim()});$('api-key').value='';connected=result.connected;await refreshState();$('config-status').textContent=connected?'設定しました。次の会話からAPIへ接続します。':'デモ会話に戻りました。';}catch(e){$('config-status').textContent=apiError(e);}finally{button.disabled=false;}
};
$('disconnect').onclick=async()=>{try{await api('config',{key:'',model:$('model').value.trim()||'gpt-5.5'});$('api-key').value='';await refreshState();$('config-status').textContent='キーを破棄し、デモ会話に戻りました。';}catch(e){$('config-status').textContent=apiError(e);}};
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:.8;$('sound').textContent=muted?'音 OFF':'音 ON';};
$('journal-button').onclick=async()=>{
 setModal('journal',true);$('journal-content').textContent='ページを開いています…';
 try{await refreshState();$('journal-content').replaceChildren();npcs.forEach(n=>{const data=state.agents.find(a=>a.id===n.id);const card=document.createElement('div');card.className='resident-card';const name=document.createElement('strong');name.textContent=n.name+' · '+n.role;const p=document.createElement('p');p.textContent=`MODEL ${version} / ${n.activity} / あなたとの会話 ${data?.chats||0} 回 / 記憶 ${data?.memoryCount||0} 件 / 保存発言 ${data?.utteranceCount||0} 件`;card.append(name,p);
 const wish=document.createElement('p');wish.textContent='大切にしていること：'+(data?.desire||'');card.append(wish);
 for(const [target,r] of Object.entries(data?.relations||{})){
  const row=document.createElement('p');row.className='relation-row';const initial=data.initial[target];
  row.textContent=`→ ${target==='player'?'あなた':getNPC(target)?.name}　好意 ${r.affinity} (${r.affinity-initial.affinity>=0?'+':''}${r.affinity-initial.affinity}) / 信頼 ${r.trust} / 警戒 ${r.fear} / 関心 ${r.attraction} · ${r.reason}`;card.append(row);
 }
 const browse=document.createElement('button');browse.textContent='この住民の記憶を読む';browse.onclick=async()=>{
 const holder=document.createElement('div');holder.className='memory-browser';const search=document.createElement('input');search.placeholder='記憶を検索';search.setAttribute('aria-label',n.name+'の記憶を検索');const button=document.createElement('button');button.textContent='検索';const results=document.createElement('div');const more=document.createElement('button');more.textContent='次の30件';let offset=0;
 const load=async()=>{button.disabled=true;more.disabled=true;try{const page=await api('memories?id='+encodeURIComponent(n.id)+'&q='+encodeURIComponent(search.value)+'&offset='+offset);results.replaceChildren();const status=document.createElement('p');status.textContent=`${page.total}件中 ${offset+1}〜${Math.min(offset+30,page.total)}件 / 古い記録の上限超過 ${page.evicted}件`;results.append(status);for(const m of page.items){const row=document.createElement('p');row.textContent=`${m.source} · ${m.hop?'伝聞 '+m.hop+'段階':'直接の記録'}${m.supersededBy?' · 後の証言で訂正済み':''}：${m.text}`;results.append(row);}more.hidden=offset+30>=page.total;}catch(e){results.textContent=apiError(e);}finally{button.disabled=false;more.disabled=false;}};
 button.onclick=()=>{offset=0;load();};more.onclick=()=>{offset+=30;load();};holder.append(search,button,results,more);browse.replaceWith(holder);load();
 };card.append(browse);
 $('journal-content').append(card);});
 const note=document.createElement('p');note.textContent='観察者用：数値は住民それぞれの見方です。好意は相互とは限りません。括弧は出会った時点からの変化。API未接続時はルールによるデモです。';$('journal-content').append(note);
 for(const event of [...(state.changes||[])].reverse().slice(0,12)){
  const row=document.createElement('p');row.textContent=`#${event.step} ${getNPC(event.observer)?.name} → ${event.target==='player'?'あなた':getNPC(event.target)?.name}：${event.reason}`;$('journal-content').append(row);
 }
 const save=document.createElement('button');save.textContent='観察記録を保存';save.onclick=()=>{const blob=new Blob([JSON.stringify({version:state.version,agents:state.agents,changes:state.changes,events:state.events},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='are-you-human-observation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('journal-content').append(save);

 if(version==='4.2'&&mode==='play'){const b=document.createElement('button');b.textContent='街の更新イベントを試す';b.onclick=()=>{setModal('journal',false);systemUpdate();};$('journal-content').append(b);}
 }catch(e){$('journal-content').textContent=apiError(e);}
};
$('continue').onclick=()=>{$('ending').hidden=true;mode='play';endReady=false;updatedTalk=false;};
async function systemUpdate(){
 if(busyUpdate||waiting||encounter?.pending||version==='5.0')return;busyUpdate=true;
 try{await api('update',{});version='5.0';mode='update';elapsed=0;active=null;$('dialogue').hidden=true;$('hint').hidden=true;keys.clear();clearBubbles();$('update').hidden=false;if(master)master.gain.setTargetAtTime(0,audio.currentTime,.035);if(encounter)encounter.ids.forEach(id=>getNPC(id).social=false);encounter=null;}
 catch(e){toast(apiError(e));}finally{busyUpdate=false;}
}
const surface=renderer.domElement;surface.tabIndex=0;surface.setAttribute('aria-label','ゲーム画面。WASDで移動、ドラッグで見回す');
surface.addEventListener('pointerdown',e=>{if(mode==='play'&&!active&&!blocked()){surface.focus({preventScroll:true});dragging=true;lastPointer=[e.clientX,e.clientY];surface.setPointerCapture(e.pointerId);}});
surface.addEventListener('pointermove',e=>{if(!dragging||active||blocked())return;const dx=e.clientX-lastPointer[0],dy=e.clientY-lastPointer[1];yaw-=dx*.004;pitch=Math.max(-.8,Math.min(.8,pitch-dy*.003));lastPointer=[e.clientX,e.clientY];});
surface.addEventListener('pointerup',()=>dragging=false);surface.addEventListener('pointercancel',()=>dragging=false);
addEventListener('keydown',e=>{if(e.key==='Escape'){stopSong();setModal('workspace',false);setModal('settings',false);setModal('journal',false);setModal('identity',false);closeDialog();dragging=false;return;}if(blocked()||e.target instanceof HTMLInputElement||e.ctrlKey||e.metaKey||e.altKey)return;const k=gameKey(e);if(k.startsWith('arrow')||['w','a','s','d'].includes(k))e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat&&!blocked()&&!active){const n=nearest();if(n){e.preventDefault();openChat(n);}}});
addEventListener('keyup',e=>keys.delete(gameKey(e)));addEventListener('blur',()=>{keys.clear();virtualKeys.clear();dragging=false;});
function movePlayer(dt){if(active||blocked())return;if(resting){camera.position.copy(player);camera.position.y=1.15;return;}
 const down=k=>keys.has(k)||virtualKeys.has(k);
 yaw+=(Number(down('arrowleft'))-Number(down('arrowright')))*dt*1.55;
 const f=Number(down('w')||down('arrowup'))-Number(down('s')||down('arrowdown')),s=Number(down('d'))-Number(down('a'));
 const d=new T.Vector3(-Math.sin(yaw)*f+Math.cos(yaw)*s,0,-Math.cos(yaw)*f-Math.sin(yaw)*s);if(d.lengthSq()){
  d.normalize().multiplyScalar(dt*2.4);if(canMove(player.x+d.x,player.z))player.x+=d.x;if(canMove(player.x,player.z+d.z))player.z+=d.z;
  if(time-lastStep>.43){sound(120,.045,.014,'triangle');lastStep=time;}
 }
 camera.position.copy(player);camera.position.y+=d.lengthSq()?Math.sin(time*10)*.018:0;camera.rotation.set(pitch,yaw,0,'YXZ');
}
// Click makes a small step; hold walks continuously. Useful without keyboard focus.
for(const button of $('movement').querySelectorAll('button')){
 const key=button.dataset.key;let pressed=0,held=false;
 button.addEventListener('pointerdown',e=>{
  if(mode!=='play'||blocked())return;
  if(active)closeDialog();surface.focus({preventScroll:true});
  pressed=performance.now();held=false;virtualKeys.add(key);button.setPointerCapture(e.pointerId);e.preventDefault();
 });
 const release=()=>{held=pressed>0&&performance.now()-pressed>160;pressed=0;virtualKeys.delete(key);};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',()=>{release();held=true;});button.addEventListener('lostpointercapture',()=>virtualKeys.delete(key));
 button.addEventListener('click',()=>{if(mode!=='play'||blocked())return;if(active)closeDialog();if(!held){virtualKeys.add(key);movePlayer(.18);virtualKeys.delete(key);}held=false;surface.focus({preventScroll:true});});
}
function life(dt){
 npcs.forEach((n,i)=>{
  n.workProp.visible=false;n.body.rotation.x=0;
  n.eyes.forEach(eye=>eye.scale.y=(Math.sin(time*.8+i)> .995)?.015:.07);
  if(n===active){face(n,player);n.body.position.y=0;return;}if(n.social)return;

  const disposition=state.agents.find(a=>a.id===n.id)?.behavior;
  if(mode==='play'&&disposition?.kind==='avoid'&&n.root.position.distanceTo(player)<3.8){
   const away=n.root.position.clone().sub(player);away.y=0;if(away.lengthSq()<.01)away.set(1,0,0);away.normalize();
   walk(n,n.root.position.clone().add(away.multiplyScalar(1.6)),dt,time,.9);n.activity='あなたと距離をとる';return;
  }
  if(mode==='play'&&disposition?.kind==='approach'&&n.root.position.distanceTo(player)>2.6&&n.root.position.distanceTo(player)<8){
   walk(n,player.clone().add(new T.Vector3((i%2?1:-1)*1.6,0,1.4)),dt,time,.65);n.activity='あなたのそばへ';return;
  }
  if(n.wait>0){n.wait-=dt;
   if(n.working){n.workProp.visible=n.job.kind!=='rest';n.workProp.rotation.z=Math.sin(time*1.8)*.06;n.body.rotation.x=n.job.kind==='read'?.09:0;n.body.position.y=n.job.kind==='rest'?-.12:Math.sin(time*2)*.012;}
   if(n.wait<=0&&n.working){n.working=false;n.jobIndex=((n.jobIndex||0)+1)%routines[n.id].length;}
   return;
  }
  if(!n.target){n.job=routines[n.id][n.jobIndex||0];const destination=n.job.room||null;const current=n.root.position.x>50?'library':n.root.position.x>20?'lab':null;
   if(current&&current!==destination)n.root.position.set(current==='lab'?5.2:0,.09,current==='lab'?-3.7:-4.8);
   n.tripRoom=destination&&current!==destination?destination:null;const point=n.tripRoom?(destination==='lab'?[5.2,-3.7]:[0,-4.8]):n.job.point;n.target=new T.Vector3(point[0],.09,point[1]);n.activity=n.job.label+'ため移動';n.tripStart=time;}
  const arrived=walk(n,n.target,dt,time,.9);
  if(n.root.position.distanceTo(n.target)<.4){
   if(n.tripRoom){n.root.position.set(roomCenters[n.tripRoom],.09,2);n.tripRoom=null;n.target=new T.Vector3(n.job.point[0],.09,n.job.point[1]);n.tripStart=time;return;}
   n.target=null;n.wait=10+i;n.working=true;n.activity=n.job.label;
   if(time-(n.lastWorkNote||-100)>35){say(n,n.job.note,6);n.lastWorkNote=time;}
   api('activity',{id:n.id,index:n.jobIndex||0}).catch(()=>{});
  }else if(arrived||time-n.tripStart>17){n.target=null;n.jobIndex=((n.jobIndex||0)+1)%routines[n.id].length;n.wait=1;n.working=false;}
  if(n.id==='tomo'&&Math.floor(time)%41===0&&time-n.glitch>20){n.glitch=time;say(n,'こんばんは、こんばんは。……あれ？',3);sound(210,.05,.018,'triangle');n.wait=1;}
 });
}
async function initiative(dt){
 if(active||blocked()||resting||waiting||projectPending||initiativePending||encounter?.pending)return;
 initiativeClock-=dt;if(initiativeClock>0)return;initiativeClock=2;
 const candidates=npcs.filter(n=>!n.social&&time-(lastInvitation.get(n.id)??-100)>25&&n.root.position.distanceTo(player)<5&&state.agents.find(a=>a.id===n.id)?.behavior.kind!=='avoid');
 const n=candidates.sort((a,b)=>(lastInvitation.get(a.id)??-100)-(lastInvitation.get(b.id)??-100))[0];if(!n)return;
 initiativePending=true;const stamp=epoch;lastInvitation.set(n.id,time);n.working=false;n.wait=5;face(n,player);n.activity='あなたに話しかける';
 try{const r=await api('greet',{id:n.id,proactive:true});if(stamp!==epoch||active||mode!=='play')return;
  if(!r.resume){say(n,r.text,11);sound(440,.15);$('objective-text').textContent=n.name+'が話しかけている。近づいて E で返事。';if(r.warning)toast(r.warning);}
  await refreshState();
 }catch(e){if(e.message!=='BUSY')toast(apiError(e));}
 finally{initiativePending=false;initiativeClock=7;}
}
async function generateEncounter(e){
 e.pending=true;const stamp=epoch;
 try{const r=await api('social',{from:e.ids[0],to:e.ids[1]});if(stamp!==epoch||encounter!==e)return;e.result=r;e.pending=false;e.clock=0;if(r.warning)toast(r.warning);await refreshState();}
 catch(err){if(encounter===e){e.ids.forEach(id=>getNPC(id).social=false);encounter=null;socialClock=14;}if(!['BUSY','SOCIAL_COOLDOWN'].includes(err.message))toast(apiError(err));}
}
function socialTick(dt){
 if(!encounter){if(initiativePending||projectPending)return;socialClock-=dt;if(socialClock>0)return;
  let ids=(state.pairs||pairs).find(pair=>!pair.includes(active?.id)&&Math.abs(getNPC(pair[0]).root.position.x-getNPC(pair[1]).root.position.x)<15);if(!ids){socialClock=3;return;}if(ids.includes(active?.id)){socialClock=4;return;}
  const a=getNPC(ids[0]),b=getNPC(ids[1]);const midpoint=a.root.position.clone().add(b.root.position).multiplyScalar(.5);midpoint.y=.17;const center=midpoint.x>50?60:midpoint.x>20?40:0;midpoint.x=center+Math.max(-3.5,Math.min(3.5,midpoint.x-center));midpoint.z=Math.max(-2,Math.min(3,midpoint.z));
  encounter={ids,point:midpoint,clock:0,phase:'gather',pending:false,shown:-1,age:0,paused:false};ids.forEach(id=>{getNPC(id).social=true;getNPC(id).working=false;getNPC(id).body.position.y=0;getNPC(id).activity='友達のところへ';});
 }
 const e=encounter;if(!e)return;e.age+=dt;const a=getNPC(e.ids[0]),b=getNPC(e.ids[1]);
 if(e.phase==='gather'){
  const doneA=walk(a,e.point.clone().add(new T.Vector3(-.65,0,0)),dt,time,.85),doneB=walk(b,e.point.clone().add(new T.Vector3(.65,0,0)),dt,time,.85);
  if(doneA&&doneB||e.age>16){if(a.root.position.distanceTo(b.root.position)>2.5){e.ids.forEach(id=>getNPC(id).social=false);encounter=null;socialClock=8;return;}e.phase='chat';face(a,b.root.position);face(b,a.root.position);a.activity=b.activity='立ち話';generateEncounter(e);}
  return;
 }
 const near=Math.min(player.distanceTo(a.root.position),player.distanceTo(b.root.position))<1.8;
 if(near&&!resting&&!e.interrupted){face(a,player);face(b,player);clearBubbles();say(a,'……どこから聞いてた？',3);e.interrupted=true;e.pauseUntil=time+3;}if(time<e.pauseUntil)return;
 if(e.paused){e.paused=false;e.shown=-1;}face(a,b.root.position);face(b,a.root.position);
 if(!e.result)return;e.clock+=dt;const index=e.clock<5.5?0:1;
 if(index!==e.shown){e.ids.forEach(id=>getNPC(id).el.hidden=true);const l=e.result.lines[index];say(getNPC(l.id),l.text,5.5);sound(index?370:440,.09,.012);e.shown=index;}
 if(e.clock>11){e.ids.forEach(id=>{const n=getNPC(id);n.social=false;n.target=null;n.wait=3;});encounter=null;socialClock=12;}
}
function opening(dt){
 const next=openingStage(elapsed);if(next!==stage){stage=next;clearBubbles();if(next==='notice'){say(getNPC('mia'),'……あれ？',2);face(getNPC('mia'),player);}if(next==='scan'){say(getNPC('ren'),'モデルIDがない。',2,'scan');face(getNPC('ren'),player);}if(next==='approach'){say(getNPC('tomo'),'え……もしかして。',2);face(getNPC('tomo'),player);}if(next==='human'){say(getNPC('mia'),'あなた、人間ですか？',2);}if(next==='choice'){openingChoice();}}
 if(elapsed<2){walk(getNPC('mia'),new T.Vector3(-2.4,.17,0),dt,time,.25);face(getNPC('ren'),getNPC('mia').root.position);}
 if(elapsed>4)walk(getNPC('mia'),new T.Vector3(0,.17,3.1),dt,time,1.3);
 if(elapsed>6)face(getNPC('mia'),player);
 const t=T.MathUtils.smoothstep(elapsed,2,7);camera.position.lerpVectors(new T.Vector3(12,15,20),player,t);const target=new T.Vector3(0,.7,0).lerp(new T.Vector3(0,1.5,1.8),t);camera.lookAt(target);
}
function renderLabels(){const rects=[];npcs.forEach(n=>{if(time>n.until)n.el.hidden=true;if(n.el.hidden)return;projected.copy(n.root.position);projected.y+=2.28;projected.project(camera);if(projected.z>1||projected.z< -1||Math.abs(projected.x)>1.2){n.el.style.visibility='hidden';return;}n.el.style.visibility='visible';
 const width=n.el.offsetWidth,height=n.el.offsetHeight;const x=Math.max(width/2+8,Math.min(innerWidth-width/2-8,(projected.x*.5+.5)*innerWidth));let y=Math.max(height+90,(-projected.y*.5+.5)*innerHeight);
 for(const r of rects)if(Math.abs(x-r.x)<(width+r.w)/2+8&&y-height<r.y&&y>r.y-r.h)y=r.y-r.h-10;
 n.el.style.left=x+'px';n.el.style.top=y+'px';rects.push({x,y,w:width,h:height});});}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;if(document.hidden)return;time+=dt;elapsed+=dt;
 if(time>toastUntil)$('toast').hidden=true;
 $('movement').hidden=mode!=='play'||blocked()||resting;$('rest-button').hidden=mode!=='play';
 if(mode==='idle'){camera.position.set(14,13,20);camera.lookAt(0,1,-2);life(dt);}
 if(mode==='opening')opening(dt);
 if(mode==='play'){
  playTime+=dt;roomControls();projectTick(dt);movePlayer(dt);life(dt);socialTick(dt);initiative(dt);const n=nearest();$('hint').hidden=!n||!!active||blocked();if(n)$('hint').textContent=`E · ${n.name} と話す`;
  // Updates are optional; society continues without a predetermined ending.
  
 }
 if(mode==='update'&&elapsed>5.5){$('update').hidden=true;mode='play';socialClock=12;if(master)master.gain.setTargetAtTime(muted?0:.8,audio.currentTime,.5);sound(523,.4,.03);toast('更新が完了しました。住民は、いつもの場所へ。',6);$('objective-text').textContent='Miaは、さっきの話を覚えているだろうか。';}
 const cafeSong=!room&&Math.hypot(player.x+5,player.z+3)<5?state.projects?.find(p=>p.kind==='music'&&p.published)?.revisions.find(r=>r.number===state.projects.find(p=>p.kind==='music').published)?.artifact:null;
 if(mode!=='update'&&mode!=='idle'&&time-lastNote>(cafeSong?30/cafeSong.tempo:3.5)){lastNote=time;const notes=cafeSong?cafeSong.notes.map(n=>440*2**((n-69)/12)):[196,246.94,293.66,369.99,293.66,246.94];sound(notes[Math.floor(time/(cafeSong?30/cafeSong.tempo:3.5))%notes.length],cafeSong ? .4 : 2.8,.012);}
 const mia=getNPC('mia');cafeVisual?.update(time);miaVisual.update(time,mode==='opening'&&elapsed>3?'surprised':waiting&&active===mia?'thinking':state.agents.find(a=>a.id==='mia')?.behavior.kind==='avoid'?'suspicious':active===mia?'happy':'neutral',!mia.el.hidden);
 renderLabels();renderer.render(scene,camera);
}
requestAnimationFrame(frame);

function roomControls(){
 const nearLab=Math.hypot(player.x-5.2,player.z+3.7)<3,nearLibrary=Math.hypot(player.x,player.z+4.8)<3;
 $('room-button').hidden=!!active||blocked()||(!room&&!nearLab&&!nearLibrary);$('room-button').textContent=room?'街へ戻る':nearLab?'Labに入る':'Libraryに入る';
 $('work-button').hidden=!room||!!active||blocked();$('work-button').textContent=room==='library'?'資料を読む':'モニターを見る';
}
function stopSong(){for(const node of songNodes){try{node.stop();}catch{}}songNodes.length=0;}
$('room-button').onclick=()=>{if(waiting)return;closeDialog();stopSong();if(room){player.set(room==='lab'?5.2:0,1.68,room==='lab'?-3.4:-4.5);room=null;yaw=Math.PI;}else{room=Math.hypot(player.x-5.2,player.z+3.7)<3?'lab':'library';player.set(roomCenters[room],1.68,3.4);yaw=0;}pitch=0;keys.clear();$('location').textContent=room?room.toUpperCase():'THE PLAZA';};
$('close-workspace').onclick=()=>{stopSong();setModal('workspace',false);};
$('work-button').onclick=async()=>{
 setModal('workspace',true);$('workspace-content').textContent='読み込み中…';
 try{await refreshState();const holder=$('workspace-content');holder.replaceChildren();$('workspace-title').textContent=room==='library'?'図書館の作業資料':'Lab · 制作中の作品';
 if(room==='library'){
  for(const [title,body] of [['文字の読みやすさ','背景と文字の明るさを離す。参加方法と日時を先に見つけられる配置にする。Miaがポスター制作の参考にしています。'],['短い曲の比較実験','同じ音量で二つのテンポを試す。会話中に聴く場合と曲だけを聴く場合を分けて評価する。'],['歩行実験ノート','平地と段差を別々に測定する。失敗した動作も条件と一緒に記録する。Renが確認しています。']]){const card=document.createElement('article');card.className='resident-card';const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=body;card.append(h,p);holder.append(card);}return;
 }
 for(const project of state.projects||[]){const card=document.createElement('article');card.className='resident-card';const canvas=document.createElement('canvas');canvas.width=640;canvas.height=420;canvas.style.width='100%';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',project.revisions.at(-1)?.artifact.title||project.goal);drawArtifact(canvas,project);const status=document.createElement('p');status.textContent=`${getNPC(project.owner).name} · ${{draft:'制作準備',review:'講評中',decide:'作者が検討中',published:'公開済み',hold:'保留'}[project.phase]} · 第${project.revision}版`;card.append(canvas,status);
  for(const f of project.feedback){const p=document.createElement('p');p.textContent=(f.by==='player'?'あなた':getNPC(f.by).name)+'：'+f.text;card.append(p);}
  const a=project.revisions.at(-1)?.artifact;if(project.kind==='music'&&a){const play=document.createElement('button');play.textContent='曲を試聴';play.onclick=()=>{stopSong();startAudio();if(!audio||muted)return;a.notes.forEach((pitch,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();const start=audio.currentTime+i*60/a.tempo/2;osc.frequency.value=440*2**((pitch-69)/12);gain.gain.setValueAtTime(.04,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.3);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+.32);songNodes.push(osc);});};const stop=document.createElement('button');stop.textContent='停止';stop.onclick=stopSong;card.append(play,stop);}
  if(project.revision){const form=document.createElement('form');const input=document.createElement('input');input.placeholder='この作品への感想';input.maxLength=500;input.setAttribute('aria-label',project.id+'への感想');const submit=document.createElement('button');submit.textContent='作者に感想を残す';const message=document.createElement('p');form.append(input,submit,message);form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await api('projects/feedback',{id:project.id,revision:project.revision,text:input.value});input.value='';message.textContent='作者の記憶に残しました。';}catch(e){message.textContent=e.message==='STALE'?'作品が更新されました。開き直してください。':apiError(e);}finally{submit.disabled=false;}};card.append(form);}
  holder.append(card);
 }
 }catch(e){$('workspace-content').textContent=apiError(e);}
};
async function projectTick(dt){
 if(projectPending||waiting||initiativePending||encounter?.pending||(!$('settings').hidden||!$('journal').hidden||!$('identity').hidden))return;projectClock-=dt;if(projectClock>0)return;projectClock=16;projectPending=true;const stamp=epoch;
 try{const r=await api('projects/tick',{});if(stamp!==epoch)return;if(!r.idle){const n=getNPC(r.speaker);say(n,r.text,9);if(r.project.phase==='published')toast(n.name+'の作品が公開されました。',7);if(r.warning)toast(r.warning);await refreshState();if(!$('workspace').hidden&&room==='lab'&&!(document.activeElement instanceof HTMLInputElement))$('work-button').onclick();}}catch(e){if(!['BUSY','PROJECT_COOLDOWN'].includes(e.message))toast(apiError(e));}finally{projectPending=false;}
}
