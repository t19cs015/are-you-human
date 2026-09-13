const names={mia:'Mia',tomo:'Tomo',ren:'Ren',shell:'Shell',central:'CENTRAL'};
const facts={cafe:'カフェは灯りに 2、暖房も含めると 5 必要。今は 2 しかない。',heat:'冷却水は中央から戻るときも暖かい。余熱は 3。',tomo:'Tomoは、声の不調を直すために中央の更新を待っている。',power:'供給は 10。中央は 8 を使うが、5 でもゆっくり更新できる。'};

export function createEpisodeView(callbacks){
  const root=document.createElement('section');root.id='episode';root.hidden=true;
  root.innerHTML=`<aside class="episode-goal"><small class="eyebrow">ONE WARM LIGHT · EPISODE 01</small><h2>この灯りを、明日にも。</h2><p>中央の更新を終えて、<br>Miaの暖かいカフェも残そう。</p><div class="episode-meter"><span>中央の更新 <strong id="episode-update-text"></strong></span><progress id="episode-update" max="100" aria-label="中央の更新"></progress></div><div class="episode-meter warm"><span>カフェの暖かさ <strong id="episode-warmth-text"></strong></span><progress id="episode-warmth" max="100" aria-label="カフェの暖かさ"></progress></div><small id="episode-supply"></small></aside>
  <aside class="episode-notebook panel"><small class="eyebrow">LOOK · NOTICE · TALK</small><div class="episode-clues"><button data-clue="cafe">☕ カフェを見る</button><button data-clue="heat">♨ 中央の水を見る</button><button data-clue="tomo">♡ Tomoの話を聞く</button><button data-clue="power">ϟ 電力を調べる</button></div><p id="episode-fact">まずは、気になる場所へ。住民にも事情がある。</p><button id="episode-central">中央のAIと話す ↗</button><p id="episode-status" role="status"></p><small id="episode-fallback" hidden>接続できないため、定型の相談で進めています。</small><form id="episode-form"><label for="episode-message">思いついたことを、みんなに</label><input id="episode-message" maxlength="1000" autocomplete="off" placeholder="両方を残すには、どうしたらいい？"><div class="episode-submit"><button id="episode-hint" type="button">少しヒント</button><button id="episode-send" class="primary">相談する ↗</button></div></form><div id="episode-workers" aria-label="住民の今の仕事"></div><details class="episode-log"><summary>今夜の会話</summary><div id="episode-log-lines"></div></details></aside>
  <div id="episode-caption" hidden aria-live="polite"><span id="episode-speaker"></span><p id="episode-line"></p><button id="episode-replay" aria-label="今の台詞をもう一度聴く">↻ 声を聴く</button><small>声はAI生成</small></div>
  <div id="episode-finish" class="panel" hidden><small class="eyebrow">TWO WISHES. ONE TOMORROW.</small><h2>あなたの席も、残った。</h2><p id="episode-result"></p><button id="episode-again" class="primary">別の方法でもう一度 ↗</button><button id="episode-stay">このまま、ここにいる</button></div><audio id="episode-audio" preload="auto"></audio>`;
  document.body.append(root);const $=id=>root.querySelector('#'+id);
  let city=null,enabled=false,seen=0,muted=false,suspended=false,queue=[],current=null,token=0,timer=null,finished=false,pending=false;
  const audio=$('episode-audio'),workers=new Map();
  function log(event){const p=document.createElement('p');p.textContent=(names[event.by]||event.by)+(event.source==='ai'?' · AI':event.source==='demo'?' · デモ':'')+'：'+event.text;$('episode-log-lines').append(p);}
  for(const id of ['mia','tomo','shell','ren']){const button=document.createElement('button');const name=document.createElement('strong'),job=document.createElement('span');name.textContent=names[id];button.append(name,job);button.onclick=()=>callbacks.follow(id);$('episode-workers').append(button);workers.set(id,job);}
  function silence(){token++;clearTimeout(timer);audio.pause();audio.removeAttribute('src');audio.load();}
  function stop(){silence();current=null;queue=[];$('episode-caption').hidden=true;}
  function next(){
    if(!enabled||suspended||current||!queue.length)return;
    current=queue.shift();const event=current,stamp=++token;
    $('episode-speaker').textContent=names[event.by]||event.by;$('episode-line').textContent=event.text;$('episode-caption').hidden=false;
    const advance=()=>{if(stamp!==token)return;silence();current=null;$('episode-caption').hidden=true;next();};
    timer=setTimeout(advance,Math.max(6500,Math.min(16000,event.text.length*95)));
    if(muted)return;
    callbacks.api('episode/speech',{event:event.id}).then(async r=>{
      if(stamp!==token||muted||suspended||!r.url)return;
      audio.src=r.url;audio.volume=.85;audio.onended=()=>{clearTimeout(timer);timer=setTimeout(advance,900);};audio.onerror=advance;
      try{await audio.play();if(stamp!==token)return;clearTimeout(timer);timer=setTimeout(advance,30000);}catch{/* Subtitles remain; the replay button is a fresh user gesture. */}
    }).catch(()=>{});
  }
  $('episode-replay').onclick=()=>{if(audio.src&&!muted){audio.currentTime=0;audio.play().catch(()=>{});}};
  function suspendedChanged(value){if(suspended===value)return;suspended=value;if(value){if(current)queue.unshift(current);silence();current=null;$('episode-caption').hidden=true;}else next();}
  for(const button of root.querySelectorAll('[data-clue]'))button.onclick=async()=>{
    button.disabled=true;try{const r=await callbacks.inspect(button.dataset.clue);$('episode-fact').textContent=facts[button.dataset.clue];callbacks.changed(r.city);}catch(e){callbacks.error(e);}finally{button.disabled=false;}
  };
  $('episode-central').onclick=callbacks.central;
  $('episode-hint').onclick=()=>{$('episode-fact').textContent=city?.episode.clues.includes('heat')?'捨てている暖かさと、足りない暖かさ。同じ街の中なのに。':'中央は電力で何を作り、何を捨てているんだろう？ 水の戻り道を見てみよう。';};
  $('episode-form').onsubmit=async event=>{
    event.preventDefault();const message=$('episode-message').value.trim();if(!message||pending)return;
    pending=true;$('episode-send').disabled=true;$('episode-status').textContent='Shellが、あなたの案を考えている…';
    try{const r=await callbacks.api('episode/propose',{message});$('episode-message').value='';callbacks.changed(r.city);if(r.warning)callbacks.notice(r.warning);}
    catch(e){callbacks.error(e);}finally{pending=false;render();}
  };
  $('episode-again').onclick=()=>callbacks.again();$('episode-stay').onclick=()=>{$('episode-finish').hidden=true;callbacks.lookCafe();};
  function render(){
    const e=city?.episode;if(!enabled||!e)return;
    for(const [field,word] of [['update','%'],['warmth',' / 100']]){$('episode-'+field).value=e[field];$('episode-'+field+'-text').textContent=Math.round(e[field])+word;}
    root.dataset.stage=e.stage;root.dataset.cold=String(e.warmth<25);
    $('episode-supply').textContent=`電力 ${e.supply.total} → 中央 ${e.supply.central} · カフェ ${e.supply.cafe}${e.supply.heat?' ＋ 余熱 '+e.supply.heat:''}`;
    if(!pending)$('episode-status').textContent=e.stage==='work'&&!city.infrastructure.modelEnabled?'カフェのための作業中。中央と話して、更新も再開しよう。':e.status;
    $('episode-fallback').hidden=!city.events.some(x=>x.episode&&x.source==='demo');
    $('episode-send').disabled=pending||!['discover','cold'].includes(e.stage);
    for(const button of root.querySelectorAll('[data-clue]'))button.classList.toggle('discovered',e.clues.includes(button.dataset.clue));
    for(const [id,job] of workers){const t=city.tasks[id];job.textContent=(t.duration?(t.phase==='travel'?'↗ ':'⚒ '):'')+(t.label||'');}
    const events=city.events.filter(x=>x.episode&&x.id>seen);seen=city.serial;
    for(const event of events){queue.push(event);log(event);}
    if(events.length)next();
    if(e.stage==='won'&&!finished){finished=true;$('episode-result').textContent=e.methodLabel+'。中央は更新され、みんながカフェへ帰ってきた。';$('episode-finish').hidden=false;callbacks.lookCafe();}
  }
  document.addEventListener('visibilitychange',()=>suspendedChanged(document.hidden||callbacks.voiceActive()));
  return {
    activate(nextCity,replay=false){stop();city=nextCity;enabled=!!city?.episode?.active;root.hidden=!enabled;document.body.classList.toggle('episode-active',enabled);seen=replay?0:city?.serial||0;finished=false;$('episode-finish').hidden=true;$('episode-log-lines').replaceChildren();if(!replay)for(const event of city?.events||[])if(event.episode)log(event);$('episode-fact').textContent='まずは、気になる場所へ。住民にも事情がある。';suspended=false;render();},
    update(nextCity){city=nextCity;render();},
    setMuted(value){muted=value;audio.muted=value;},
    suspend(value){suspendedChanged(value||document.hidden);},
    stop,
  };
}
