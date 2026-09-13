import * as T from '/node_modules/three/build/three.module.js';
import {places,infrastructureSites} from './town-layout.js';
import {powerRoutes} from './community-rules.js';
import {createCentralVoice} from './central-voice.js';

export function createInfrastructureView(world,cityView,callbacks){
  const $=id=>document.getElementById(id),markers=new Map(),point=new T.Vector3();let city=null,site=null,pending=false,logsKey='';
  const voice=createCentralVoice({api:callbacks.api,position:()=>({x:callbacks.position().x,z:callbacks.position().z}),changed:callbacks.changed,onVoice:callbacks.onVoice});
  for(const [id,p] of Object.entries(infrastructureSites)){
    const button=document.createElement('button');button.className='facility-marker';button.textContent=p.label;button.setAttribute('aria-label',p.name+'を見る');button.onclick=()=>open(id,true);$('facility-markers').append(button);markers.set(id,button);
  }
  function open(id,fromOverview=false){
    if(!infrastructureSites[id]||!city?.infrastructure?.enabled)return;callbacks.prepare();site=id;logsKey='';
    if(fromOverview)cityView.showPlace(id);$('facility-panel').hidden=false;render();
    if(near())callbacks.visited(id);
  }
  function close(){voice.setAvailable(false,callbacks.connected());site=null;$('facility-panel').hidden=true;callbacks.release();}
  $('facility-close').onclick=close;$('central-peek').onclick=()=>open('central',true);
  $('facility-near').onclick=()=>{if(site){callbacks.visit(site);cityView.hide();render();if(near())callbacks.visited(site);}};
  const near=()=>site&&Math.hypot(callbacks.position().x-places[site].x,callbacks.position().z-places[site].z)<4.5;
  function render(){
    if(!site||!city)return;const g=city.infrastructure,e=city.episode;
    $('central-conversation').hidden=site!=='central';voice.setAvailable(site==='central'&&!!near(),callbacks.connected());
    $('facility-title').textContent=site==='central'&&g.phase>=2?'中央データセンター':infrastructureSites[site].name;
    $('facility-eyebrow').textContent=infrastructureSites[site].label+' / LITTLE ELSEWHERE';
    const descriptions={wind:g.windOnline?'羽根が回ると、真鍮の線を灯りが走っていく。行き先は、中央の塔。':'Tomoが、止まった羽根を調べている。',pump:g.pumpOnline?'川の水が青い管を通っていく。中央棟の床は、さっきより少し冷たい。':'水を通す準備をしている。動かすには、塔からの電力も必要だ。',relay:g.allocation==='town'?'カフェにも、道にも、灯りを残す。中央に集まる電力はゆっくりになる。':'丘から届く電力の多くを、中央へ送っている。扉には「明日のため」と書いてある。',central:g.phase>=2?'街の記録から学んで、次の街を作る。見覚えのある言葉も、その中にあった。':g.phase===1?'古い地図と点検の記録から、新しい街灯が作られた。次は、どんな記録が必要なのだろう。':'電力と水と、小さな記録。住民はそれぞれの用事を終えると、ここへやってくる。'};
    $('facility-description').textContent=descriptions[site];
    $('facility-readings').textContent=site==='wind'?(g.windOnline?(g.windEnabled?'風車は回っている':'風車は停止中'):'羽根を点検中'):site==='pump'?(g.pumpOnline?(g.pumpEnabled?'取水中 · '+g.waterRate.toFixed(1)+' / 秒':'取水を停止中'):'ポンプを点検中'):site==='relay'?`蓄えた電力 ${Math.floor(g.energy)} · 中央へ ${g.energyRate.toFixed(1)} / 秒`:`電力 ${Math.floor(g.energy)} / 水 ${Math.floor(g.water)} · ${g.phase>=3?"今夜の増築は完了":"次の更新に "+g.cost.energy+" / "+g.cost.water}`;
    $('facility-near').hidden=!!near();$('facility-distance').textContent=near()?'ここで設備を操作できます。':'操作するには、施設のそばへ降りてください。';
    if(e?.active){
      const notes={central:'街を更新する中央。Tomoは自分の声がよくなるのを待っている。冷却水は、戻るときも暖かい。',relay:'中央とカフェへ電力を届ける塔。配分を変えるには、塔と中央の両方で住民の作業が必要。',pump:'川から中央へ水を送り、計算で生まれる熱を逃がしている。',wind:'今夜の電力を作る風車。中央も、カフェも、この風を待っている。'};
      $('facility-description').textContent=notes[site];
      $('facility-readings').textContent=site==='central'?`中央の更新 ${Math.round(e.update)}% · 電力 ${e.supply.central} · 冷却 ${e.supply.cooled?'稼働中':'停止中'}`:site==='relay'?`供給 ${e.supply.total} → 中央 ${e.supply.central} / カフェ ${e.supply.cafe}`:site==='wind'?`発電 ${e.supply.total} · ${g.windEnabled?'運転中':'停止中'}`:`冷却水 ${e.supply.cooled?'循環中':'停止中'} · カフェへの余熱 ${e.supply.heat}`;
    }
    if(city.community?.active){const c=city.community;if(site==='central'){$('facility-description').textContent='みんなの声と、この街の電力・水から、明日の街を描いている。あなたの案も、そこに届く。';$('facility-readings').textContent=`中央の更新 ${Math.round(c.central)}% · ${g.modelEnabled?'更新中':'停止中'} · 街の灯り ${Math.round(c.energy)}`;}if(site==='relay')$('facility-readings').textContent='配分：'+powerRoutes[c.route].name;}
    const controls=site==='wind'?(g.windOnline?[[g.windEnabled?'wind_stop':'wind_start',g.windEnabled?'風車を止める':'風車を回す']]:[]):site==='pump'?(g.pumpOnline?[[g.pumpEnabled?'pump_stop':'pump_start',g.pumpEnabled?'取水を止める':'水を送る']]:[]):site==='relay'?(g.relayOnline?[[g.allocation==='central'?'town_power':'central_power',g.allocation==='central'?'街の暮らしに電力を分ける':'中央への供給を優先する']]:[]):[[g.modelEnabled?'pause_model':'resume_model',g.modelEnabled?'中央の更新を止める':'中央の更新を再開する']];
    if(e?.active&&site==='relay')controls.length=0;
    const controlsKey=controls.map(c=>c[0]).join(',');
    if($('facility-actions').dataset.controls!==controlsKey){
      $('facility-actions').dataset.controls=controlsKey;$('facility-actions').replaceChildren();
      for(const [action,label] of controls){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{if(pending||!near())return;pending=true;render();try{await callbacks.control(action);}finally{pending=false;render();}};$('facility-actions').append(b);}
    }
    for(const b of $('facility-actions').children)b.disabled=pending||!near();
    $('facility-records').hidden=!!e?.active;
    const records=site==='central'&&g.visited.includes('central')?g.received.slice(-3).reverse():[],key=site+':'+g.voice+':'+records.map(r=>r.id).join(',')+':'+g.visited.includes('central');
    if(key!==logsKey){logsKey=key;$('facility-records').replaceChildren();if(site==='central'&&g.visited.includes('central')){
      const title=document.createElement('small');title.textContent='中央に届いた記録';$('facility-records').append(title);
      for(const r of records){const card=document.createElement('article'),source=document.createElement('small'),quote=document.createElement('p');source.textContent=(world.npcs.find(n=>n.id===r.by)?.name||'街')+'が届けたことば';quote.textContent='「'+r.text+'」';card.append(source,quote);$('facility-records').append(card);}
      if(!records.length){const p=document.createElement('p');p.textContent='古い地図と点検記録。まだ、あなたの言葉はここにない。';$('facility-records').append(p);}
      if(g.voice){const p=document.createElement('p');p.className='central-voice';p.textContent='中央の声：「'+g.voice+'」';$('facility-records').append(p);}
    }}
  }
  function update(next){city=next;const g=city?.infrastructure;if(!g?.enabled)return;
    $('infrastructure-status').hidden=false;
    $('supply-power').textContent=Math.floor(g.energy);$('supply-water').textContent=Math.floor(g.water);
    $('supply-note').textContent=!g.modelEnabled?'中央は更新を止めている':g.phase===3?'新しい街にも、夜が来る。':!g.availableSamples?'中央は、新しいことばを待っている。':g.energy<g.cost.energy||g.water<g.cost.water?'電力と水が、中央へ集まっている。':'中央の窓が、少しずつ点いていく。';render();
  }
  function nearest(){const p=callbacks.position();return Object.keys(infrastructureSites).find(id=>Math.hypot(p.x-places[id].x,p.z-places[id].z)<4.5);}
  function frame(overview,playing){
    $('facility-markers').hidden=!playing||!overview;
    if(!playing||!overview)return;world.camera.updateMatrixWorld();
    for(const [id,p] of Object.entries(infrastructureSites)){const b=markers.get(id);point.set(p.x,p.height+.8,p.z).project(world.camera);b.hidden=point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;b.style.left=(point.x*.5+.5)*innerWidth+'px';b.style.top=(-point.y*.5+.5)*innerHeight+'px';}
  }
  return {open,close,update,frame,nearest,setMuted:voice.setMuted,stopVoice:voice.stop,resetVoice:voice.reset};
}
