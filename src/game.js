import {entrances,nearbyEntrance,roomAt} from './locations.js';
import {createCityWorld} from './city-world.js';
import {createInfrastructureWorld} from './infrastructure-world.js';
import {createInfrastructureView} from './infrastructure-view.js';
import {createCityView} from './city-view.js';
import {createEpisodeView} from './episode-view.js';
import {createEpisodeWorld} from './episode-world.js';
import {findPath} from './navigation.js';
import {places,workSpot,outdoorGround,districtAt,districts,infrastructureSites} from './town-layout.js';
import {upgradeTown} from './town-assets.js';
import {upgradeCafe} from './cafe-assets.js';
import {upgradeResident} from './resident-visual.js';
import {createStudio,drawArtifact,roomCenters} from './studio.js';
import {routines} from './routines.js';
import * as T from '/node_modules/three/build/three.module.js';
import {createWorld} from './world.js';
import {gameKey} from './controls.js';
import {createLocomotion} from './locomotion.js';
import {createCommunityWorld} from './community-world.js';
import {createCommunityView} from './community-view.js';
import {createMemoryCity} from './memory-city.js';
import {createCentralPresence} from './central-presence.js';
import {createHumanWorld} from './human-world.js';
import {createHumanView} from './human-view.js';
import {residentIsSynced,humanCallRadius} from './human-rules.js';
import {powerRoutes} from './community-rules.js';
import {navigationAudit} from './navigation-audit.js';
import {createTownRenderer} from './town-renderer.js';
import {createGraphicsReview} from './graphics-review.js';
import {openingStage,routePoints} from './story.js';
const $=id=>document.getElementById(id);
let world;
try{world=createWorld($('world'));}catch(e){$('error').hidden=false;throw e;}
const {scene,camera,renderer,npcs,face,walk,canMove}=world;
let cafeVisual=null;const residentVisuals=new Map(npcs.map(n=>[n.id,upgradeResident(n)]));
const cafeReady=upgradeCafe(world).then(v=>cafeVisual=v).catch(()=>{console.warn('Cafe assets unavailable; original scene retained.');});
const cityWorld=createCityWorld(world);
const infrastructureWorld=createInfrastructureWorld(world);
const episodeWorld=createEpisodeWorld(world);
const communityWorld=createCommunityWorld(world),locomotion=createLocomotion();
const memoryCity=createMemoryCity(world),centralPresence=createCentralPresence(world),humanWorld=createHumanWorld(world);
let mouseSensitivity=1,reducedMotion=false,communityArrival=false;
try{mouseSensitivity=Math.max(.4,Math.min(2,Number(localStorage.getItem('ayh-sensitivity'))||1));reducedMotion=localStorage.getItem('ayh-reduced-motion')==='true';}catch{}
let residentAudio=null,residentSpeechRevision=0;
const studio=createStudio(world);let townVisual=null;const townReady=upgradeTown(world,studio).then(v=>townVisual=v).catch(()=>console.warn('Town assets unavailable; original town retained.'));let room=null,projectClock=8,projectPending=false;const songNodes=[];
const townRenderer=createTownRenderer(world);
const graphicsReady=Promise.all([cafeReady,townReady,cityWorld.ready,infrastructureWorld.ready,...[...residentVisuals.values()].map(v=>v.ready)]).then(()=>townRenderer.prepare());
let mode='idle',elapsed=0,time=0,playTime=0,yaw=0,pitch=0,stage='',session='',active=null,waiting=false,muted=false,voiceActive=false,audio,master,version='4.2',connected=false,epoch=0,encounter=null,socialClock=12,pairIndex=0,rumorReturned=false,hasChat=false,updatedTalk=false,endReady=false;
let state={agents:[],events:[]},busyUpdate=false,dragging=false,lastPointer=null,toastUntil=0,lastNote=0,lastStep=0;
let resting=false,restPending=false,initiativeClock=3,initiativePending=false;
const lastInvitation=new Map();
const virtualKeys=new Set();
const keys=new Set(),player=new T.Vector3(0,1.68,5.4),projected=new T.Vector3();
const pairs=[['mia','ren'],['ren','tomo'],['tomo','shell'],['shell','mia']];
const getNPC=id=>npcs.find(n=>n.id===id);
let borrowed=null,humanReturn=null,cityClock=0,cityPending=false,cityThinkPending=false,cityThinkClock=0,citySeen=0;
const cityView=createCityView(world,{release:releaseLook,beforeView(){closeDialog();leaveBorrowed();infrastructureView.close();},visit:visitResident,borrow:borrowResident,leave:leaveBorrowed,chat:id=>openChat(getNPC(id))});
const infrastructureView=createInfrastructureView(world,cityView,{api,changed:syncCity,connected:()=>connected,onVoice(value){voiceActive=value;communityView.suspend(value||!!active);if(value)stopResidentSpeech();episodeView.suspend(value||!!active);if(master)master.gain.value=muted?0:value?.1:.8;},position:()=>player,prepare(){closeDialog();releaseLook();},release:releaseLook,visit:visitFacility,async visited(site){try{syncCity(await api('city/visit',{site,position:{x:player.x,z:player.z}}));}catch(e){toast(apiError(e));}},async control(action){try{syncCity(await api('city/control',{action,position:{x:player.x,z:player.z}}));}catch(e){toast(apiError(e));}}});
const episodeView=createEpisodeView({api,changed:syncCity,notice:toast,error:e=>toast(apiError(e)),voiceActive:()=>voiceActive||!!active,
 async inspect(clue){
   infrastructureView.close();closeDialog();releaseLook();
   if(clue==='cafe')visitResident('mia');else if(clue==='tomo')visitResident('tomo');else visitFacility(clue==='heat'?'central':'relay');
   cityView.hide();return api('episode/inspect',{clue,position:{x:player.x,z:player.z}});
 },
 central(){visitFacility('central');cityView.hide();infrastructureView.open('central');},
 follow(id){closeDialog();infrastructureView.close();releaseLook();cityView.select(id);},
 lookCafe(){closeDialog();releaseLook();cityView.showPlace('cafe');},
 again:()=>enterTown(false,true),
});
const communityView=createCommunityView({api,changed:syncCity,refresh:refreshState,position:()=>({x:player.x,z:player.z}),focus:()=>surface.focus({preventScroll:true}),prepare(){closeDialog();releaseLook();cityView.hide();infrastructureView.close();},home(){infrastructureView.close();closeDialog();releaseLook();cityView.hide();leaveBorrowed();room=null;player.set(0,1.68,6.6);yaw=pitch=0;},central(){visitFacility('central');cityView.hide();infrastructureView.open('central');},lookProject(p){cityView.hide();const q=places[p.site];yaw=Math.atan2(player.x-q.x,player.z-q.z);pitch=-.07;},say(id,text,kind){const n=getNPC(id);if(n&&n!==active){residentVisuals.get(id)?.wave(time);if(kind==='human-relay')say(n,text,2.3);}},art:url=>communityWorld.setArt(url),pulse:(id,site)=>communityWorld.pulse(time,site),notice:toast,error:e=>toast(apiError(e)),chime(kind){const shift=kind==='place'?([1,1.125,1.25,1.5][Math.floor(time*3)%4]):1;const notes=(kind==='switch'?[392,523,659]:kind==='wind'?[523,659,784,1047]:[523,659,784,988]).map(n=>n*shift);notes.forEach((f,i)=>setTimeout(()=>sound(f,.5,.026,'sine'),i*85));}});
const humanView=createHumanView({focus:()=>surface.focus({preventScroll:true}),prepare(){closeDialog();communityView.close();infrastructureView.close();releaseLook();},map:()=>cityView.toggle(),sketch:()=>communityView.openBoard(),central(){visitFacility('central');cityView.hide();infrastructureView.open('central');},memory:()=>visitMemory(),home:()=>returnToPlaza(),settings:()=>$('settings-button').click(),sound:()=>$('sound').click(),journal:()=>$('journal-button').click(),restart:()=>$('restart').click()});
let centralWasNear=false,humanPending=false;
const graphicsReview=new URLSearchParams(location.search).has('visual')?createGraphicsReview({graphics:townRenderer,renderer,visit(view){closeDialog();humanView.close();communityView.close();infrastructureView.close();releaseLook();cityView.hide();room=null;player.set(...view.position);const [x,y,z]=view.look;yaw=Math.atan2(player.x-x,player.z-z);pitch=Math.atan2(y-player.y,Math.hypot(player.x-x,player.z-z));keys.clear();locomotion.reset();}}):null;
function returnToPlaza(){infrastructureView.close();closeDialog();releaseLook();cityView.hide();leaveBorrowed();room=null;player.set(0,1.68,6.6);yaw=pitch=0;}
function visitMemory(){infrastructureView.close();closeDialog();releaseLook();cityView.hide();leaveBorrowed();room=null;player.set(0,1.68,48.3);yaw=Math.PI;pitch=.04;}
async function humanAction(action,id){
 if(humanPending)return;humanPending=true;
 try{const r=await api('community/human',{action,id,cycle:state.city?.community?.human?.cycle,position:{x:player.x,z:player.z}});syncCity(r.city);if(r.changed&&action==='call'){sound(440,.35,.03);setTimeout(()=>sound(660,.4,.025),100);}}
 catch(e){if(e.message!=='STALE')toast(apiError(e));}finally{humanPending=false;}
}
function humanTarget(){
 const h=state.city?.community?.human;
 if(h?.phase==='sync'){
  const candidates=npcs.filter(n=>residentIsSynced(state.city,n.id)).map(n=>{const dx=n.root.position.x-player.x,dz=n.root.position.z-player.z,d=Math.hypot(dx,dz);return {n,d,dot:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/(d||1)};}).filter(a=>a.d<humanCallRadius&&a.dot>.1).sort((a,b)=>a.d-b.d);
  if(candidates.length){const n=candidates[0].n;return {label:n.name+'に声をかける',run:()=>humanAction('call',n.id)};}
 }
 const n=nearest();if(n)return {label:n.name+'と話す',run:()=>openChat(n)};
 if(!room&&Math.hypot(player.x,player.z-28)<4.5&&-Math.cos(yaw)>.2)return {label:'中央に話しかける',run:()=>infrastructureView.open('central')};
 if(!room&&Math.hypot(player.x,player.z-51)<3.8)return {label:'記憶の灯りに触れる',run:()=>humanAction('archive')};
 const target=communityView.target;if(target){const route=({central:'town',town:'shared',shared:'central'})[state.city.community.route];return {label:target.id==='switch'?'灯りを '+powerRoutes[route].name:target.name,run:()=>communityView.interact()};}
 if(!$('room-button').hidden)return {label:$('room-button').textContent,run:()=>$('room-button').click()};
 if(!$('work-button').hidden)return {label:$('work-button').textContent,run:()=>$('work-button').click()};
 const site=infrastructureView.nearest();if(site)return {label:places[site].name+'を見る',run:()=>infrastructureView.open(site)};
 return null;
}
const blocked=()=>humanView.open||communityView.open||!$('facility-panel').hidden||!$('workspace').hidden||!$('settings').hidden||!$('journal').hidden||!$('identity').hidden||!$('ending').hidden;
function syncCity(next){state.city=next;cityView.update(next,state.agents);infrastructureView.update(next);episodeView.update(next);communityView.update(next);}
function toast(text,duration=5){$('toast').textContent=text;$('toast').hidden=false;toastUntil=time+duration;}
function apiError(e){if(e.message==='SAVE_WRITE_FAILED')return '進行を保存できませんでした。ディスクの空き容量を確認してください。';if(e.message==='SAVE_READ_FAILED')return '保存データを読み込めませんでした。データを残したまま確認が必要です。';return e.message==='BUSY'?'今、別の住民と話しています。少し待ってね。':e.message==='SESSION_EXPIRED'?'接続が切れました。ページを再読み込みしてください。':'通信できませんでした。もう一度試してください。';}
async function api(path,data,{signal,timeout=45000}={}){
 const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Session':session},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
 const value=await response.json();if(!response.ok)throw new Error(value.error||'NETWORK');return value;
}
async function refreshState(){state=await api('state');connected=state.connected;studio.update(state);syncCity(state.city);$('resume').hidden=!state.city?.active&&!state.agents.some(a=>a.memoryCount>0)&&!state.projects?.some(p=>p.revision>0);version=state.version;if($('settings').hidden)$('model').value=state.model;$('realtime-model').textContent=state.realtimeModel;$('default-config').disabled=!state.defaultConfigured;$('connection').textContent=connected?'API設定済み · '+state.model:'DEMO · キー未設定';}
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
 residentVisuals.get(n.id)?.wave(time);n.el.replaceChildren();const small=document.createElement('small');small.textContent=n.name;n.el.append(small,document.createTextNode(text));n.el.className='bubble '+style;n.el.hidden=false;n.until=time+duration;
}
function clearBubbles(){npcs.forEach(n=>n.el.hidden=true);}
function line(who,text,isYou=false){const div=document.createElement('div');div.className='utterance'+(isYou?' you':'');const small=document.createElement('small');small.textContent=who;div.append(small,document.createTextNode(text));$('transcript').append(div);while($('transcript').children.length>14)$('transcript').firstElementChild.remove();$('transcript').scrollTop=$('transcript').scrollHeight;}
function showDialog(n){
 stopResidentSpeech();communityView.suspend(true);
 active=n;episodeView.suspend(true);releaseLook();$('speaker').textContent=n.name;$('role').textContent=n.role+' · MODEL '+version;$('avatar').style.borderColor='#'+n.accent.toString(16);$('dialogue').hidden=false;$('transcript').replaceChildren();$('choices').replaceChildren();$('message').value='';$('hint').hidden=true;face(n,player);$('chat-mode').textContent=connected?'API設定済み · 次の返答で接続を確認します':'未接続：いまは定型文のデモです。右上の接続設定からAIを有効にできます。';
}
function closeDialog(){if(mode==='choice')return;active=null;stopResidentSpeech();communityView.suspend(voiceActive);episodeView.suspend(voiceActive);$('dialogue').hidden=true;keys.clear();$('message').blur();surface.focus({preventScroll:true});if(updatedTalk)endReady=true;}
$('close-dialogue').onclick=closeDialog;
function choice(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=action;$('choices').append(b);}
function openingChoice(){
 mode='choice';showDialog(getNPC('mia'));$('chat-form').hidden=true;line('Mia','あなた、人間ですか？');
 choice('うん、人間です。',()=>{mode='play';elapsed=0;playTime=0;closeDialog();$('objective').hidden=false;$('crosshair').hidden=false;clearBubbles();say(getNPC('mia'),'ほんとに！ ……ここにいて。もっと話したいな。',6);npcs.forEach(n=>{n.wait=3;n.target=null;});});
 choice('どうしてわかったの？',()=>line('Mia','モデルIDがないの。それに……息をしてる。'));
 choice('ここはどこ？',()=>line('Mia','Little Elsewhere。わたしたちAIの街だよ。あなたのこと、なんて呼べばいい？'));
}
async function enterTown(reset,episodeStart=false,restore=false,communityStart=false){
 $('begin').disabled=true;$('resume').disabled=true;$('play-episode').disabled=true;$('play-community').disabled=true;
 try{
  await ready;await graphicsReady;if(communityView.busy||waiting||projectPending||initiativePending||encounter?.pending||cityPending||cityThinkPending){toast('いまの会話が終わったら、もう一度。');return;}
  if(new URLSearchParams(location.search).has('review')&&!document.getElementById('navigation-audit'))navigationAudit(world);
  releaseLook();leaveBorrowed();closeDialog();await infrastructureView.stopVoice();episodeView.stop();communityView.stop();communityWorld.reset();mode='idle';epoch++;
  if(episodeStart||communityStart){
    try{if(!state.city?.episode?.active)sessionStorage.setItem('ayh-free-session',session);}catch{}
    const fresh=await api('session',{});session=fresh.id;try{sessionStorage.setItem('ayh-session',session);}catch{}
    await api(communityStart?'community/start':'episode/start',{});
  }else if(restore){
    const previous=sessionStorage.getItem('ayh-free-session');if(previous){session=previous;sessionStorage.setItem('ayh-session',session);}
  }else if(reset){await api('reset',{});}
  infrastructureView.resetVoice();
  await api('city/start',{});await refreshState();if(state.resting){await api('action',{kind:'wake',witnesses:[]});await refreshState();}
  mode='play';elapsed=0;playTime=0;yaw=0;pitch=0;room=null;active=null;encounter=null;hasChat=true;stage='';resting=false;communityArrival=communityStart;centralWasNear=false;humanView.close();
  document.body.classList.remove('resting');$('rest-button').textContent='目を閉じて休む';
  player.set(0,1.68,state.city?.community?.active?6.6:5.4);locomotion.reset();keys.clear();virtualKeys.clear();clearBubbles();
  for(const n of npcs){const pos=state.city.positions[n.id];n.root.position.set(pos.x,.09,pos.z);n.body.visible=true;n.body.position.y=0;n.target=null;n.cityRoute=null;n.social=false;n.wait=0;n.working=false;n.workProp.visible=false;if(communityStart)n.root.rotation.y=Math.PI+(npcs.indexOf(n)-1.5)*.6;}
  infrastructureView.close();for(const id of ['start','dialogue','ending','journal','identity','settings','workspace','update'])$(id).hidden=true;
  $('objective').hidden=false;$('crosshair').hidden=false;$('objective-text').textContent='気になる住民を選んで、その夜を追いかけよう。';
  cityClock=0;cityThinkClock=0;citySeen=state.city.serial;cityView.reset();syncCity(state.city);startAudio();episodeView.activate(state.city,episodeStart);communityView.activate(state.city,communityStart);communityView.update(state.city);document.body.classList.toggle('community-playing',!!state.city.community?.active);if(state.city.community?.active){cityView.hide();surface.focus({preventScroll:true});}if(state.city.episode?.active){if(episodeStart){visitResident('mia');cityView.hide();}else cityView.showPlace('cafe');}
  try{$('return-sandbox').hidden=!sessionStorage.getItem('ayh-free-session')||!state.city.episode?.active;}catch{}
  if(reset&&!state.city?.community?.active)say(getNPC('tomo'),'風は吹いてる。羽根が回れば、塔にも届くはず。',9);
 }catch(e){toast(apiError(e));}finally{$('begin').disabled=false;$('resume').disabled=false;$('play-episode').disabled=false;$('play-community').disabled=false;}
}
async function begin(){return enterTown(true);}
$('resume').onclick=()=>enterTown(false);
$('begin').onclick=begin;$('restart').onclick=()=>state.city?.community?.active?enterTown(false,false,false,true):state.city?.episode?.active?enterTown(false,true):begin();
$('play-community').onclick=()=>{startAudio();enterTown(false,false,false,true);};
$('play-episode').onclick=()=>{startAudio();enterTown(false,true);};
$('return-sandbox').onclick=()=>enterTown(false,false,true);
async function openChat(n){
 if(mode!=='play'||waiting||encounter?.pending&&encounter.ids.includes(n.id))return;
 if(encounter?.ids.includes(n.id)){encounter.ids.forEach(id=>{getNPC(id).social=false;getNPC(id).target=null;});encounter=null;clearBubbles();socialClock=15;}
 showDialog(n);$('chat-form').hidden=false;choice('いま、何をしているの？',()=>sendChat('いま、何をしているの？'));choice('手伝えることはある？',()=>sendChat('手伝えることはある？'));waiting=true;$('send').disabled=true;$('chat-mode').textContent=n.name+'がこちらに気づいた…';
 const stamp=epoch;
 try{
  let result;
  for(let attempt=0;;attempt++){
   if(stamp!==epoch||active!==n)return;
   try{result=await api('greet',{id:n.id});break;}
   catch(e){
    if(e.message!=='BUSY'||attempt>=90)throw e;
    $('chat-mode').textContent=n.name+'が用事を決めています。少し待ってね…';
    await new Promise(resolve=>setTimeout(resolve,500));
   }
  }
  if(stamp!==epoch||active!==n)return;
  for(const item of result.transcript||[])line(item.who,item.text,item.who==='あなた');
  $('chat-mode').textContent=result.resume?'前の会話の続き · そのまま話せます':result.mode==='live'?'AI生成 · '+state.model:(result.warning||'デモ会話');
  if(!result.resume)playResidentSpeech(n);
  if(version==='5.0')choice('さっきの話、覚えてる？',()=>sendChat('さっきの話、覚えてる？'));
  await refreshState();
 }catch(e){if(active===n)$('chat-mode').textContent=apiError(e);}
 finally{waiting=false;$('send').disabled=false;if(active===n)$('message').focus();}

}
async function sendChat(message){
 if(waiting||!active||mode!=='play'||!message.trim())return;const n=active,stamp=epoch;waiting=true;$('send').disabled=true;$('choices').querySelectorAll('button').forEach(b=>b.disabled=true);$('message').value='';line('あなた',message,true);$('chat-mode').textContent=n.name+'が考えています…';
 try{const result=await api('chat',{id:n.id,message});if(stamp!==epoch)return;hasChat=true;sound(490,.12);
  if(result.cityAction?.changed){toast(n.name+'が用事を変えた。街を見渡して追いかけてみよう。',6);}
  if(result.record?.sharing==='private')toast(n.name+'は、まだ届けていない記録をここに留めた。',6);
  if(active===n){line(n.name,result.text);playResidentSpeech(n);$('chat-mode').textContent=result.mode==='live'?'AI生成 · '+version:(result.warning||'デモ会話 · キー接続後はAIが自由に返答');}
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
function nearest(){
 let best=null,d=2.5;const forward=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 // When descending beside a selected resident, keep that conversation target
 // while they remain close and in front, even if another resident walks past.
 const selected=getNPC(cityView.selected);
 if(selected&&selected!==borrowed){const delta=selected.root.position.clone().sub(player);delta.y=0;if(delta.length()<2.5&&delta.normalize().dot(forward)>.5)return selected;}
 npcs.forEach(n=>{if(n===borrowed)return;const delta=n.root.position.clone().sub(player);delta.y=0;const dist=delta.length();if(dist<d&&delta.normalize().dot(forward)>.25){best=n;d=dist;}});return best;
}
function setModal(id,open){$(id).hidden=!open;keys.clear();if(open)releaseLook();}
$('settings-button').onclick=()=>setModal('settings',true);$('close-settings').onclick=()=>setModal('settings',false);
$('inspect').onclick=()=>setModal('identity',true);$('close-identity').onclick=()=>setModal('identity',false);
$('close-journal').onclick=()=>setModal('journal',false);
$('config-form').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;$('config-status').textContent='設定中…';
 try{await ready;await infrastructureView.stopVoice();const key=$('api-key').value.trim();const result=await api('config',{...(key?{key}:{}),model:$('model').value.trim()});$('api-key').value='';connected=result.connected;await refreshState();$('config-status').textContent=connected?'設定しました。次の会話からこの接続を使います。':'デモ会話に戻りました。';}catch(e){$('config-status').textContent=apiError(e);}finally{button.disabled=false;}
};
$('default-config').onclick=async()=>{try{await infrastructureView.stopVoice();await api('config',{useDefault:true,model:$('model').value.trim()||'gpt-5.6-luna'});$('api-key').value='';await refreshState();$('config-status').textContent='既定のキーで接続しました。';}catch(e){$('config-status').textContent=apiError(e);}};
$('disconnect').onclick=async()=>{try{await infrastructureView.stopVoice();await api('config',{key:'',model:$('model').value.trim()||'gpt-5.6-luna'});$('api-key').value='';await refreshState();$('config-status').textContent='このタブはデモ会話になりました。既定の接続から戻せます。';}catch(e){$('config-status').textContent=apiError(e);}};
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:voiceActive?.1:.8;infrastructureView.setMuted(muted);episodeView.setMuted(muted);communityView.setMuted(muted);if(muted)stopResidentSpeech();$('sound').textContent=muted?'音 OFF':'音 ON';};
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
 try{await api('update',{});version='5.0';mode='update';elapsed=0;active=null;episodeView.suspend(voiceActive);$('dialogue').hidden=true;$('hint').hidden=true;keys.clear();clearBubbles();$('update').hidden=false;if(master)master.gain.setTargetAtTime(0,audio.currentTime,.035);if(encounter)encounter.ids.forEach(id=>getNPC(id).social=false);encounter=null;}
 catch(e){toast(apiError(e));}finally{busyUpdate=false;}
}
const surface=renderer.domElement;surface.tabIndex=0;surface.setAttribute('aria-label','ゲーム画面。WASDで移動、クリックしてマウスで見回す。Escでカーソルを戻す。タッチ操作はスワイプ');
const mouseLookSupported=typeof surface.requestPointerLock==='function',finePointer=matchMedia('(pointer: fine)');
const canLook=()=>mode==='play'&&!cityView.overview&&!active&&!blocked()&&!resting;
function look(dx,dy){yaw-=dx*.0028*mouseSensitivity;pitch=Math.max(-1.1,Math.min(1.1,pitch-dy*.0024*mouseSensitivity));}
function stopDragging(){const id=lastPointer?.[2];dragging=false;lastPointer=null;if(id!==undefined&&surface.hasPointerCapture(id))surface.releasePointerCapture(id);}
function releaseLook(){locomotion.reset();keys.clear();virtualKeys.clear();stopDragging();if(document.pointerLockElement===surface)document.exitPointerLock();}
function lookError(){if(canLook())toast('マウス操作を開始できませんでした。もう一度ゲーム画面をクリックしてください。');}
surface.addEventListener('click',async e=>{
 if(e.button!==0||e.pointerType==='touch'||e.pointerType==='pen'||!mouseLookSupported||!canLook()||document.pointerLockElement===surface)return;
 surface.focus({preventScroll:true});
 try{await surface.requestPointerLock();}catch{lookError();}
});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===surface&&canLook())look(e.movementX,e.movementY);});
document.addEventListener('pointerlockchange',()=>{
 stopDragging();
 if(document.pointerLockElement===surface){if(!canLook())releaseLook();}
 else{keys.clear();virtualKeys.clear();}
});
document.addEventListener('pointerlockerror',lookError);
// Touch and browsers without pointer lock keep drag-to-look controls.
surface.addEventListener('pointerdown',e=>{
 if(e.button!==0||!canLook()||dragging||(e.pointerType==='mouse'&&mouseLookSupported))return;
 surface.focus({preventScroll:true});dragging=true;lastPointer=[e.clientX,e.clientY,e.pointerId];surface.setPointerCapture(e.pointerId);
});
surface.addEventListener('pointermove',e=>{
 if(!dragging||lastPointer?.[2]!==e.pointerId||document.pointerLockElement===surface||!canLook())return;
 look(e.clientX-lastPointer[0],e.clientY-lastPointer[1]);lastPointer=[e.clientX,e.clientY,e.pointerId];
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(event,e=>{if(lastPointer?.[2]===e.pointerId)stopDragging();});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(humanView.enabled&&!blocked()&&!active){humanView.showMenu();return;}humanView.close();communityView.close();infrastructureView.close();releaseLook();stopSong();setModal('workspace',false);setModal('settings',false);setModal('journal',false);setModal('identity',false);closeDialog();return;}if(blocked()||(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)||e.ctrlKey||e.metaKey||e.altKey)return;const k=gameKey(e);if(k.startsWith('arrow')||['w','a','s','d','space','shift'].includes(k))e.preventDefault();keys.add(k);if(k==='m'&&!e.repeat&&mode==='play'){cityView.toggle();return;}if(k==='f'&&!e.repeat&&mode==='play'){const site=infrastructureView.nearest();if(site)infrastructureView.open(site);return;}if(k==='r'&&!e.repeat&&borrowed){leaveBorrowed();return;}if(k==='e'&&!e.repeat&&!cityView.overview&&!blocked()&&!active){if(humanView.enabled){e.preventDefault();humanView.interact();return;}const n=nearest();if(n){e.preventDefault();openChat(n);}else if(communityView.hasTarget){e.preventDefault();communityView.interact();}}});
addEventListener('keyup',e=>keys.delete(gameKey(e)));addEventListener('blur',releaseLook);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseLook();});
function movePlayer(dt){if(active||blocked()||cityView.overview)return;if(resting){camera.position.copy(player);camera.position.y=1.15;return;}
 const down=k=>keys.has(k)||virtualKeys.has(k);
 yaw+=(Number(down('arrowleft'))-Number(down('arrowright')))*dt*1.55;
 const f=Number(down('w')||down('arrowup'))-Number(down('s')||down('arrowdown')),s=Number(down('d'))-Number(down('a'));
 const movement=locomotion.step(player,{forward:f,side:s,yaw,sprint:down('shift'),dash:down('space')},dt,(x,z)=>canMove(x,z,true,borrowed?.id));
 if(movement.fired)sound(220,.12,.025,'triangle');
 if(movement.speed>.2&&time-lastStep>(movement.speed>4?.25:.4)){sound(110+movement.speed*5,.04,.011,'triangle');lastStep=time;}
 if(borrowed){borrowed.root.position.set(player.x,.09,player.z);borrowed.root.rotation.y=yaw+Math.PI;}
 camera.position.copy(player);if(!reducedMotion)camera.position.y+=Math.sin(time*(movement.speed>4?14:10))*.014*Math.min(1,movement.speed);
 const fov=reducedMotion?64:movement.burst?70:movement.speed>4?67:64;camera.fov=T.MathUtils.damp(camera.fov,fov,10,dt);camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0,'YXZ');
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
  if(mode==='play'&&residentIsSynced(state.city,n.id)){n.working=false;n.workProp.visible=false;return;}
  n.workProp.visible=false;n.body.rotation.x=0;
  n.eyes.forEach(eye=>eye.scale.y=(Math.sin(time*.8+i)> .995)?.015:.07);
  if(communityArrival&&mode==='play'&&playTime<7){if(playTime>.4+i*.28){const angle=Math.atan2(player.x-n.root.position.x,player.z-n.root.position.z),delta=Math.atan2(Math.sin(angle-n.root.rotation.y),Math.cos(angle-n.root.rotation.y));n.root.rotation.y+=delta*(1-Math.exp(-dt*5));}if(playTime>2+i*.25&&playTime<2.1+i*.25&&!['mia','tomo'].includes(n.id))say(n,n.id==='ren'?'……本当に、人間？':'みんな、少し場所を空けましょう。',3);n.working=false;n.body.position.y=Math.sin(time*3+i)*.012;return;}
  if(n===active){face(n,player);n.body.position.y=0;return;}if(n.social)return;if(n===borrowed){n.body.position.y=0;return;}if(state.city?.active&&mode==='play'){cityLife(n,dt);return;}

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
  if(!n.target){n.job=routines[n.id][n.jobIndex||0];const destination=n.job.room||null;const current=roomAt(n.root.position.x,n.root.position.z);
   if(current&&current!==destination)n.root.position.set(entrances[current][0],.09,entrances[current][1]);
   n.tripRoom=destination&&current!==destination?destination:null;const point=n.tripRoom?entrances[destination]:n.job.point;n.target=new T.Vector3(point[0],.09,point[1]);n.activity=n.job.label+'ため移動';n.tripStart=time;}
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
 if(state.city?.community?.active||state.city?.episode?.active||cityView.overview||borrowed||active||blocked()||resting||waiting||projectPending||initiativePending||encounter?.pending)return;
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
 if(state.city?.community?.active||state.city?.episode?.active)return;
 if(state.city?.infrastructure?.enabled?state.city.infrastructure.phase<3:state.city?.active&&(!state.city.readingReady||!state.city.repaired))return;
 if(!encounter){if(initiativePending||projectPending)return;socialClock-=dt;if(socialClock>0)return;
  let ids=(state.pairs||pairs).find(pair=>!pair.includes(active?.id)&&Math.abs(getNPC(pair[0]).root.position.x-getNPC(pair[1]).root.position.x)<15);if(!ids){socialClock=3;return;}if(ids.includes(active?.id)){socialClock=4;return;}
  const a=getNPC(ids[0]),b=getNPC(ids[1]);const midpoint=a.root.position.clone().add(b.root.position).multiplyScalar(.5);midpoint.y=.17;const center=roomAt(midpoint.x,midpoint.z)==='library'?60:roomAt(midpoint.x,midpoint.z)==='lab'?40:null;if(center!==null){midpoint.x=center+Math.max(-3.5,Math.min(3.5,midpoint.x-center));midpoint.z=Math.max(-2,Math.min(3,midpoint.z));}if(!canMove(midpoint.x-.65,midpoint.z,false)||!canMove(midpoint.x+.65,midpoint.z,false)){socialClock=5;return;}
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
function renderLabels(){const rects=[];npcs.forEach(n=>{if(state.city?.community?.active&&rects.length>=2){n.el.style.visibility='hidden';return;}if(time>n.until)n.el.hidden=true;if(n.el.hidden)return;const npcRoom=roomAt(n.root.position.x,n.root.position.z);if(npcRoom!==(cityView.overview?null:room)){n.el.style.visibility='hidden';return;}projected.copy(n.root.position);projected.y+=2.28;projected.project(camera);if(projected.z>1||projected.z< -1||Math.abs(projected.x)>1.2){n.el.style.visibility='hidden';return;}n.el.style.visibility='visible';
 const width=n.el.offsetWidth,height=n.el.offsetHeight;const x=Math.max(width/2+8,Math.min(innerWidth-width/2-8,(projected.x*.5+.5)*innerWidth));let y=Math.max(height+90,(-projected.y*.5+.5)*innerHeight);
 for(const r of rects)if(Math.abs(x-r.x)<(width+r.w)/2+8&&y-height<r.y&&y>r.y-r.h)y=r.y-r.h-10;
 n.el.style.left=x+'px';n.el.style.top=y+'px';rects.push({x,y,w:width,h:height});});}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const frameMs=now-last,dt=Math.max(0,Math.min(frameMs/1000,.05));last=now;if(document.hidden)return;time+=dt;elapsed+=dt;
 if(time>toastUntil)$('toast').hidden=true;
 $('movement').hidden=mode!=='play'||blocked()||resting;$('rest-button').hidden=mode!=='play';
 if(mode==='idle'){cityView.cameraFrame(dt,keys,true);life(dt);}
 if(mode==='opening')opening(dt);
 if(mode==='play'){
  playTime+=dt;roomControls();projectTick(dt);movePlayer(dt);life(dt);cityTick(dt);socialTick(dt);initiative(dt);cityView.cameraFrame(dt,keys);const n=nearest(),clickToLook=mouseLookSupported&&finePointer.matches&&document.pointerLockElement!==surface;$('hint').hidden=cityView.overview||!!active||blocked()||resting||(!n&&!clickToLook);$('hint').textContent=n?`E · ${n.name} と話す`:'画面をクリック → マウスで見回す';
  // Updates are optional; society continues without a predetermined ending.
  
 }
 if(mode==='update'&&elapsed>5.5){$('update').hidden=true;mode='play';socialClock=12;if(master)master.gain.setTargetAtTime(muted?0:.8,audio.currentTime,.5);sound(523,.4,.03);toast('更新が完了しました。住民は、いつもの場所へ。',6);$('objective-text').textContent='Miaは、さっきの話を覚えているだろうか。';}
 const cafeSong=!room&&Math.hypot(player.x+5,player.z+3)<5?state.projects?.find(p=>p.kind==='music'&&p.published)?.revisions.find(r=>r.number===state.projects.find(p=>p.kind==='music').published)?.artifact:null;
 if(mode!=='update'&&mode!=='idle'&&time-lastNote>(cafeSong?30/cafeSong.tempo:3.5)){lastNote=time;const notes=cafeSong?cafeSong.notes.map(n=>440*2**((n-69)/12)):[196,246.94,293.66,369.99,293.66,246.94];sound(notes[Math.floor(time/(cafeSong?30/cafeSong.tempo:3.5))%notes.length],cafeSong ? .4 : 2.8,.012);}
 communityWorld.update(time,state.city);communityView.frame(player,yaw,mode==='play'&&!cityView.overview&&!blocked()&&!active&&!resting,!!nearest());
 const available=mode==='play'&&!cityView.overview&&!blocked()&&!active&&!resting;
 humanView.frame(state.city,mode==='play',available,available?humanTarget():null,playTime,cityView.overview);
 humanWorld.update(time,state.city);memoryCity.update(time,state.city);centralPresence.update(time,state.city,player,infrastructureView.voiceState==='idle'?communityView.centralVoiceState:infrastructureView.voiceState);
 if(state.city?.community?.active&&available){
  const near=Math.hypot(player.x,player.z-28)<4.3;if(near&&!centralWasNear)humanAction('central');centralWasNear=near;
  const h=state.city.community.human;if(h?.phase==='sync'){$('community-goal').textContent=h.seed?'あなたの声が、伝わっていく。':'あれ、みんな止まった。';$('community-next').textContent=h.seed?'一人から、次の誰かへ。':'あなたは動ける。Eで声をかけてみて。';}
 }

 cafeVisual?.update(time,state.city?.episode);episodeWorld.update(time,state.city);townVisual?.update(time,state.city?.community);cityWorld.update(time,state.city);infrastructureWorld.update(time,state.city);studio.setRoom(cityView.overview?null:room);townVisual?.setRoom(cityView.overview?null:room);
 if(mode!=='update')for(const n of npcs){const expression=(mode==='opening'&&elapsed>3||communityArrival&&playTime<7)?'surprised':waiting&&active===n?'thinking':state.agents.find(a=>a.id===n.id)?.behavior.kind==='avoid'?'suspicious':n.glitch>0?'glitch':active===n?'happy':'neutral';residentVisuals.get(n.id).update(time,expression,!n.el.hidden,n.working&&n.workProp.visible,residentIsSynced(state.city,n.id));}
 const nearFacility=infrastructureView.nearest();$('facility-button').hidden=mode!=='play'||cityView.overview||blocked()||!!active||!nearFacility;if(nearFacility)$('facility-button').textContent=places[nearFacility].name+' · F';
 renderLabels();cityView.renderMarkers();infrastructureView.frame(cityView.overview,mode==='play');townRenderer.render(time,state.city);graphicsReview?.frame(now,mode==='play',frameMs);
}
requestAnimationFrame(frame);

function roomControls(){
 if(cityView.overview||borrowed){$('room-button').hidden=true;$('work-button').hidden=true;return;}
 const entrance=nearbyEntrance(player.x,player.z),nearLab=entrance==='lab',nearLibrary=entrance==='library';
 $('room-button').hidden=!!active||blocked()||(!room&&!nearLab&&!nearLibrary);$('room-button').textContent=room?'街へ戻る':nearLab?'Labに入る':'Libraryに入る';
 $('work-button').hidden=!room||!!active||blocked();$('work-button').textContent=room==='library'?'資料を読む':'モニターを見る';
}
function stopSong(){for(const node of songNodes){try{node.stop();}catch{}}songNodes.length=0;}
$('room-button').onclick=()=>{if(waiting)return;closeDialog();stopSong();if(room){player.set(entrances[room][0],1.68,entrances[room][1]);room=null;yaw=Math.PI;}else{const entrance=nearbyEntrance(player.x,player.z);if(!entrance)return;room=entrance;player.set(roomCenters[room],1.68,3.4);yaw=0;}pitch=0;keys.clear();$('location').textContent=room?room.toUpperCase():'THE PLAZA';};
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
 if(state.city?.community?.active||state.city?.episode?.active)return;
 if(state.city?.infrastructure?.enabled?state.city.infrastructure.phase<3:state.city?.active&&(!state.city.readingReady||!state.city.repaired))return;
 if(projectPending||waiting||initiativePending||encounter?.pending||(!$('settings').hidden||!$('journal').hidden||!$('identity').hidden))return;projectClock-=dt;if(projectClock>0)return;projectClock=16;projectPending=true;const stamp=epoch;
 try{const r=await api('projects/tick',{});if(stamp!==epoch)return;if(!r.idle){const n=getNPC(r.speaker);say(n,r.text,9);if(r.project.phase==='published')toast(n.name+'の作品が公開されました。',7);if(r.warning)toast(r.warning);await refreshState();if(!$('workspace').hidden&&room==='lab'&&!(document.activeElement instanceof HTMLInputElement))$('work-button').onclick();}}catch(e){if(!['BUSY','PROJECT_COOLDOWN'].includes(e.message))toast(apiError(e));}finally{projectPending=false;}
}

$('facility-button').onclick=()=>{const site=infrastructureView.nearest();if(site)infrastructureView.open(site);};
function visitFacility(site){
 const p=places[site],building=infrastructureSites[site];if(!p)return;closeDialog();releaseLook();leaveBorrowed();room=null;
 let spot=null;
 const approach=Math.atan2(p.x-building.x,p.z-building.z);
 for(const radius of site==='central'?[3.5,3,2.5]:[2,2.8,3.5]){for(let i=0;i<16;i++){const a=approach+Math.ceil(i/2)*(i%2?1:-1)*Math.PI/8,q={x:p.x+Math.sin(a)*radius,z:p.z+Math.cos(a)*radius};if(canMove(q.x,q.z)){spot=q;break;}}if(spot)break;}
 if(!spot){toast('降りる場所が空くまで、少し待ってね。');return;}
 player.set(spot.x,1.68,spot.z);yaw=Math.atan2(spot.x-building.x,spot.z-building.z);pitch=.16;
 camera.position.copy(player);camera.rotation.set(pitch,yaw,0,'YXZ');$('location').textContent=p.name;$('objective-text').textContent='ここにも、誰かの用事の続きがある。';
}
function visitResident(id){
 const n=getNPC(id);if(!n)return;infrastructureView.close();closeDialog();releaseLook();leaveBorrowed();room=roomAt(n.root.position.x,n.root.position.z);
 let spot=null;
 for(const radius of [2,2.5,3,3.5]){for(let i=0;i<16;i++){const a=i/16*Math.PI*2,p={x:n.root.position.x+Math.sin(a)*radius,z:n.root.position.z+Math.cos(a)*radius};if(canMove(p.x,p.z)){spot=p;break;}}if(spot)break;}
 if(!spot){toast('すぐそばに降りられる場所がありません。少し待ってから、もう一度。');return;}
 player.set(spot.x,1.68,spot.z);yaw=Math.atan2(spot.x-n.root.position.x,spot.z-n.root.position.z);pitch=-.08;
 $('location').textContent=room?room.toUpperCase():districts.find(d=>d.id===districtAt(spot.x,spot.z)).name;
 $('objective-text').textContent=n.name+'の用事を見てみよう。Eで話しかけられる。';surface.focus({preventScroll:true});
}
function borrowResident(id){
 const n=getNPC(id);if(!n)return;infrastructureView.close();closeDialog();releaseLook();leaveBorrowed();resting=false;document.body.classList.remove('resting');
 humanReturn={position:player.clone(),yaw,pitch,room};borrowed=n;room=null;player.set(n.root.position.x,1.68,n.root.position.z);yaw=n.root.rotation.y+Math.PI;pitch=0;n.body.visible=false;n.cityRoute=null;
 cityView.setBorrowed(id);$('objective-text').textContent=n.name+'の目線を借りている。返すと、その子の用事がまた動き出す。';surface.focus({preventScroll:true});
}
function leaveBorrowed(){
 if(!borrowed)return;releaseLook();borrowed.body.visible=true;borrowed.cityRoute=null;borrowed=null;
 if(humanReturn){player.copy(humanReturn.position);yaw=humanReturn.yaw;pitch=humanReturn.pitch;room=humanReturn.room;humanReturn=null;}
 cityView.setBorrowed(null);$('objective-text').textContent='目線を返した。あの子は、この後どうするだろう。';
}
function cityLife(n,dt){
 const c=state.city,t=c.tasks[n.id];n.working=false;n.workProp.visible=false;
 if(!t){n.body.position.y=0;n.activity='次の用事を考えている';return;}
 const spot=workSpot(t.site,n.id),destination=new T.Vector3(spot.x,.09,spot.z);
 n.activity=t.label;
 if(n.root.position.distanceTo(destination)<.34){
   n.cityRoute=null;n.body.position.y=Math.sin(time*1.8)*.008;n.working=t.duration>0;n.workProp.visible=n.working&&t.job!=='join'&&!['garden','cafe'].includes(t.kind)&&!c.carrying[n.id];
   face(n,(c.episode?.active||c.community?.active)&&!t.duration&&!cityView.overview&&n.root.position.distanceTo(player)<4?player:new T.Vector3(places[t.site].x,0,places[t.site].z));return;
 }
 if(!n.cityRoute||n.cityRoute.id!==t.id||time-n.cityRoute.created>8){
   const path=findPath(n.root.position,spot,world.navigation);
   n.cityRoute={id:t.id,path,created:time};
 }
 const next=n.cityRoute.path[0];
 if(!next){n.body.position.y=0;return;}
 walk(n,new T.Vector3(next.x,.09,next.z),dt,time,n.id==='shell'?1.85:n.id==='tomo'?2.4:2.15);
 if(Math.hypot(n.root.position.x-next.x,n.root.position.z-next.z)<.14)n.cityRoute.path.shift();
}
function cityHeld(){return [...new Set([active?.id,borrowed?.id,...npcs.filter(n=>n.social).map(n=>n.id)].filter(Boolean))];}
async function cityTick(dt){
 if(!state.city?.active||cityPending)return;cityClock-=dt;cityThinkClock-=dt;if(cityClock>0)return;cityClock=1;cityPending=true;const stamp=epoch;
 try{
  const positions=Object.fromEntries(npcs.filter(n=>outdoorGround(n.root.position.x,n.root.position.z)).map(n=>[n.id,{x:n.root.position.x,z:n.root.position.z}]));
  const next=await api('city/tick',{positions,held:cityHeld()});if(stamp!==epoch)return;syncCity(next);
  for(const e of next.events.filter(e=>e.id>citySeen&&!e.episode&&!e.community)){
    const n=getNPC(e.actors[0]);if(n&&n!==active&&n!==borrowed)say(n,e.text.replace(new RegExp('^'+n.name+'[：:]'),''),7);
    if(e.kind==='milestone'){toast(e.text,8);sound(523,.35,.025);setTimeout(()=>sound(659,.5,.018),130);}
  }
  citySeen=next.serial;
 }catch(e){if(!['BUSY','STALE'].includes(e.message))toast(apiError(e));}
 finally{cityPending=false;}
 if(!state.city?.community?.active&&cityThinkClock<=0&&!cityThinkPending&&!waiting&&!projectPending&&!initiativePending&&!encounter?.pending){
   cityThinkClock=3;cityThinkPending=true;
   try{const r=await api('city/think',{held:cityHeld()});if(stamp!==epoch)return;if(!r.idle){syncCity(r.city);const n=getNPC(r.id);if(n&&r.text&&n!==active&&n!==borrowed)say(n,r.text,8);if(r.warning)toast(r.warning);}}
   catch(e){if(!['CITY_COOLDOWN','BUSY','STALE'].includes(e.message))toast(apiError(e));}
   finally{cityThinkPending=false;}
 }
}

function stopResidentSpeech(){residentSpeechRevision++;residentAudio?.pause();residentAudio=null;}
async function playResidentSpeech(n){
 if(muted||voiceActive)return;stopResidentSpeech();const revision=residentSpeechRevision;
 try{const r=await api('resident/speech',{id:n.id});if(revision!==residentSpeechRevision||active!==n||muted||!r.url)return;residentAudio=new Audio(r.url);residentAudio.volume=.85;await residentAudio.play();}catch{}
}
$('resident-replay').onclick=()=>{if(active)playResidentSpeech(active);};
$('mouse-sensitivity').value=mouseSensitivity;$('reduce-motion').checked=reducedMotion;
$('graphics-quality').value=townRenderer.quality;$('graphics-quality').onchange=e=>townRenderer.setQuality(e.target.value);
$('mouse-sensitivity').oninput=e=>{mouseSensitivity=Number(e.target.value);try{localStorage.setItem('ayh-sensitivity',String(mouseSensitivity));}catch{}};
$('reduce-motion').onchange=e=>{reducedMotion=e.target.checked;try{localStorage.setItem('ayh-reduced-motion',String(reducedMotion));}catch{}};
