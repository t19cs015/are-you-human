import {memoryNames,memoryGoals,selectedMemories} from './memory-rules.js';
import {memoryPicture} from './memory-pictures.js';

export function createMemoryView(hooks){
  const root=document.createElement('div');root.id='memory-play';root.hidden=true;
  root.innerHTML=`<aside id="memory-goal"><small>THE ONE WHO REMEMBERS</small><h2></h2><p></p></aside><button id="memory-open"><span aria-hidden="true">▧</span> 記憶 <kbd>Q</kbd></button><div id="memory-pocket" aria-label="身体に入っている記憶"></div><div id="memory-subtitle" hidden aria-live="polite"><small></small><p></p><button id="memory-quiet" aria-label="この声を止める">×</button></div><p id="memory-wait" role="status" hidden></p><section id="memory-drawer" role="dialog" aria-modal="true" aria-labelledby="memory-title" hidden><button id="memory-close" class="close" aria-label="記憶を閉じて街へ戻る">×</button><small class="memory-eyebrow">YOUR BODY. YOUR MEMORIES.</small><h2 id="memory-title">いま、大切にするもの。</h2><p class="memory-help" id="memory-gesture-hint">つまんで、はめる。ダブルクリック・長押しで、言葉を書く。</p><div id="memory-device"><div class="memory-device-edge" aria-hidden="true"><i></i><span>●</span><i></i></div><div id="memory-slots" aria-label="身体の記憶スロット"></div><div class="memory-device-caption"><span>左ほど、声に強く残る。</span><span aria-hidden="true">● ───── ● ───── ●</span></div></div><div id="memory-tray" role="button" tabindex="0" aria-label="記憶の保管場所。選んだブロックを身体から外す"><small class="memory-tray-label">持っている思い出</small><div id="memory-library"></div><span id="memory-tray-hint">ここへ戻すと、保管できる。</span></div><p id="memory-status" role="status"></p><div class="memory-footnotes"><details class="memory-inspect"><summary>あなたが見たこと</summary><ol id="memory-facts"></ol></details></div><div id="memory-backdrop" hidden><section id="memory-back"><small class="memory-eyebrow">この記憶の、裏側。</small><label for="memory-text" id="memory-selected-title"></label><small id="memory-origin"></small><textarea id="memory-text" maxlength="240" rows="5" spellcheck="false" placeholder="例：誰かと星に変な名前をつけて、笑っていた。もう一度、そんな時間を過ごしたい。" aria-describedby="memory-edit-note"></textarea><p id="memory-edit-note">書き終えたら Enter。外側を触れても、そのまま残ります。</p><small class="memory-back-fine">起きた出来事は残る。変わるのは、身体がどう覚えるか。</small></section></div></section>`;
  document.body.append(root);const $=id=>root.querySelector('#memory-'+id);
  let city=null,enabled=false,seen=0,selected='light',pending=false,editPending=false,revision=0,queue=[],current=null,clip=null,muted=false,voiceStamp=0,talkPartner=null,used=[],lastSignature='',picked=null,drag=null,ignoreClickUntil=0,editId=null;
  const speech=new Map();
  function status(text){$('status').textContent=text;}
  async function close(){if($('drawer').hidden)return;if(!await fold())return;cancelDrag();picked=null;$('drawer').hidden=true;hooks.focus();}
  function open(){if(!enabled)return;hooks.prepare();$('drawer').hidden=false;render();$('close').focus();hooks.chime('open');}
  function toggle(){if($('drawer').hidden)open();else close();}
  $('open').onclick=toggle;$('close').onclick=close;
  $('drawer').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const scope=$('backdrop').hidden?$('drawer'):$('back');const controls=[...scope.querySelectorAll('button,textarea,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  $('text').oninput=()=>$('text').setCustomValidity('');
  $('text').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();fold();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fold();}};
  $('backdrop').onpointerdown=e=>{if(e.target===$('backdrop'))fold();};
  function flip(id){if(editPending||pending||drag?.moved)return;const b=city.memoryGame.blocks.find(b=>b.id===id);if(!b)return;selected=id;editId=id;picked=null;$('text').setCustomValidity('');$('selected-title').textContent=b.title;$('origin').textContent=b.source;$('text').value=b.text;$('back').style.setProperty('--memory-color',b.color);$('backdrop').hidden=false;$('text').focus();hooks.chime('open');highlight();}
  async function fold(){
    if($('backdrop').hidden)return true;if(editPending)return false;
    const text=$('text').value.trim(),b=city.memoryGame.blocks.find(b=>b.id===editId);
    if(!text&&b?.text){$('text').setCustomValidity('記憶の言葉を、ひとつ残しておこう。');$('text').reportValidity();return false;}
    if(b&&b.text!==text&&!await edit({action:'rewrite',id:editId,text},'あなたの言葉で、覚え直した。')){$('text').setCustomValidity($('status').textContent);$('text').reportValidity();return false;}
    $('backdrop').hidden=true;editId=null;render();return true;
  }
  async function edit(data,success){
    if(editPending||pending)return false;editPending=true;status('…');
    try{const r=await hooks.api('memory/edit',{...data,revision:city.memoryGame.revision});hooks.changed(r.city);status(success);hooks.chime('insert');return true;}
    catch(e){status(e.message==='STALE'?'街の記憶が更新されました。もう一度、収めてみて。':e.message==='BUSY'?'声が決まるまで、少し待ってね。':'記憶を保存できませんでした。もう一度試せます。');if(e.message==='STALE')await hooks.refresh();return false;}
    finally{editPending=false;render();}
  }
  async function equip(id,slot=0){
    if(!city.memoryGame.blocks.find(b=>b.id===id)?.text.trim()){flip(id);return;}
    const m=city.memoryGame,next=[...m.equipped],old=next.indexOf(id);if(old===slot){picked=null;highlight();return;}
    if(old>=0){const swap=next[slot];next[slot]=id;if(swap)next[old]=swap;else next.splice(old,1);}else next[slot]=id;
    picked=null;selected=id;
    if(await edit({action:'equip',equipped:next.filter(Boolean)},'カチッ。次の言葉は、この記憶から。')){
      const b=$('slots').querySelector('[data-id="'+id+'"]');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)b?.animate([{transform:'translateY(-9px) scale(1.04)'},{transform:'translateY(3px) scale(.98)'},{transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'});
    }
  }
  function store(id){picked=null;return edit({action:'equip',equipped:city.memoryGame.equipped.filter(i=>i!==id)},'この思い出は、ここに置いておこう。');}
  $('tray').onclick=e=>{if(picked&&!e.target.closest('.memory-block'))store(picked);};
  $('tray').onkeydown=e=>{if(e.target===$('tray')&&['Enter',' '].includes(e.key)&&picked){e.preventDefault();store(picked);}};
  function highlight(){root.querySelectorAll('.memory-block').forEach(b=>b.classList.toggle('picked',b.dataset.id===picked));$('device').classList.toggle('holding',!!picked);$('tray').classList.toggle('holding',!!picked);}
  function targetAt(x,y){
    const exact=document.elementFromPoint(x,y)?.closest('[data-memory-slot],#memory-tray');if(exact&&root.contains(exact))return exact;
    for(const slot of $('slots').children){const r=slot.getBoundingClientRect();if(x>r.left-15&&x<r.right+15&&y>r.top-15&&y<r.bottom+15)return slot;}return null;
  }
  function cancelDrag(){if(!drag)return;clearTimeout(drag.timer);drag.ghost?.remove();drag.origin?.classList.remove('drag-origin');root.querySelectorAll('.over').forEach(el=>el.classList.remove('over'));drag=null;}
  function wireBlock(b,block){
    b.setAttribute('aria-label',block.title+'。つまんで移動、ダブルクリック・長押しで書き換え');b.setAttribute('aria-keyshortcuts','F2');b.title='ダブルクリック・長押しで、自分の言葉を書けます';
    b.onclick=e=>{e.stopPropagation();if(performance.now()<ignoreClickUntil||editPending||pending)return;if(!block.text){flip(block.id);return;}const slot=b.closest('[data-memory-slot]');if(picked&&picked!==block.id&&slot){equip(picked,Number(slot.dataset.memorySlot));return;}selected=block.id;picked=picked===block.id?null:block.id;highlight();status(picked?'置き場所に触れると、はまります。':'');};
    b.ondblclick=e=>{e.preventDefault();e.stopPropagation();flip(block.id);};
    b.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();flip(block.id);}};
    b.onpointerdown=e=>{
      if(e.button!==0||editPending||pending)return;e.stopPropagation();cancelDrag();const rect=b.getBoundingClientRect();selected=block.id;
      drag={id:block.id,startX:e.clientX,startY:e.clientY,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,rect,origin:b,pointer:e.pointerId,moved:false,ghost:null,target:null};
      b.setPointerCapture(e.pointerId);if(e.pointerType==='touch')drag.timer=setTimeout(()=>{if(drag&&!drag.moved){cancelDrag();ignoreClickUntil=performance.now()+500;flip(block.id);}},480);
    };
    b.onpointermove=e=>{
      if(!drag||drag.pointer!==e.pointerId)return;const d=drag;
      if(!d.moved&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<5)return;
      if(!d.moved){clearTimeout(d.timer);d.moved=true;d.ghost=b.cloneNode(true);d.ghost.removeAttribute('aria-label');d.ghost.setAttribute('aria-hidden','true');d.ghost.className='memory-block memory-drag';Object.assign(d.ghost.style,{position:'fixed',width:d.rect.width+'px',height:d.rect.height+'px',margin:'0',zIndex:'100',pointerEvents:'none'});document.body.append(d.ghost);b.classList.add('drag-origin');hooks.chime('lift');}
      e.preventDefault();const target=targetAt(e.clientX,e.clientY);if(target!==d.target){d.target?.classList.remove('over');target?.classList.add('over');d.target=target;}
      const tx=e.clientX-d.offsetX,ty=e.clientY-d.offsetY;d.ghost.style.left=tx+'px';d.ghost.style.top=ty+'px';d.ghost.style.transform='rotate('+Math.max(-7,Math.min(7,(e.clientX-d.startX)*.03))+'deg) scale(1.07)';
    };
    b.onpointerup=e=>{
      if(!drag||drag.pointer!==e.pointerId)return;const {id,moved,target}=drag;cancelDrag();if(!moved)return;ignoreClickUntil=performance.now()+350;
      if(target?.dataset.memorySlot!==undefined)equip(id,Number(target.dataset.memorySlot));else if(target===$('tray'))store(id);else{hooks.chime('open');render();}
    };
    b.onpointercancel=()=>{cancelDrag();render();};
  }
  function chip(block,small=false){
    const b=document.createElement('button');b.className='memory-block'+(small?' small':'');b.style.setProperty('--memory-color',block.color);b.dataset.motif=block.motif;b.dataset.id=block.id;
    const icon=document.createElement('span');icon.className='memory-glyph';icon.setAttribute('aria-hidden','true');icon.innerHTML=memoryPicture(block.motif);const label=document.createElement('strong');label.textContent=block.title;const pins=document.createElement('i');pins.className='memory-pins';pins.setAttribute('aria-hidden','true');b.append(icon,label,pins);b.classList.toggle('recalled',used.includes(block.id));return b;
  }
  function render(){
    if(!city?.memoryGame)return;const m=city.memoryGame,goal=memoryGoals[m.stage]||memoryGoals.together;
    $('goal').querySelector('h2').textContent=goal[0];$('goal').querySelector('p').textContent=m.preserved.length?'残すと決めた記憶は、次の同期を越えた。':goal[1];
    if(drag)return;
    $('pocket').replaceChildren();for(const block of selectedMemories(m)){const b=chip(block,true);b.onclick=()=>{selected=block.id;open();};b.setAttribute('aria-label',block.title+'の記憶を開く');$('pocket').append(b);}
    $('slots').replaceChildren();
    for(let i=0;i<3;i++){
      const slot=document.createElement('div');slot.className='memory-slot';slot.dataset.memorySlot=i;slot.tabIndex=0;slot.setAttribute('role','button');slot.setAttribute('aria-label',i===0?'いちばん大切な場所に記憶を置く':(i+1)+'番目の場所に記憶を置く');const hint=document.createElement('small');hint.textContent=i===0?'01 · 声の中心':'0'+(i+1);slot.append(hint);
      const socket=document.createElement('div');socket.className='memory-socket';socket.setAttribute('aria-hidden','true');socket.innerHTML='<i></i><i></i><i></i>';slot.append(socket);
      const block=m.blocks.find(b=>b.id===m.equipped[i]);if(block){const b=chip(block);wireBlock(b,block);slot.append(b);}
      slot.onclick=e=>{if(picked&&!e.target.closest('.memory-block'))equip(picked,i);};slot.onkeydown=e=>{if(e.target===slot&&['Enter',' '].includes(e.key)&&picked){e.preventDefault();equip(picked,i);}};$('slots').append(slot);
    }
    $('library').replaceChildren();for(const block of m.blocks.filter(b=>!m.equipped.includes(b.id))){const b=chip(block);wireBlock(b,block);$('library').append(b);}
    $('tray-hint').hidden=$('library').children.length>0;$('facts').replaceChildren();for(const f of m.facts.slice(-8)){const li=document.createElement('li');li.textContent=f.text;$('facts').append(li);}highlight();
  }
  function quiet(){voiceStamp++;clip?.pause();clip=null;if('speechSynthesis' in window)speechSynthesis.cancel();current=null;used=[];$('subtitle').hidden=true;render();}
  $('quiet').onclick=()=>{queue=[];quiet();talkPartner=null;};
  function requestVoice(event){if(muted||speech.has(event.id))return;speech.set(event.id,hooks.api('memory/speech',{event:event.id}).catch(()=>({mode:'unavailable'})));if(speech.size>36)speech.delete(speech.keys().next().value);}
  function speak(event){
    quiet();current={...event,until:performance.now()+Math.min(8500,Math.max(2600,event.text.length*85))};used=event.used||[];const stamp=voiceStamp;
    $('subtitle').hidden=false;$('subtitle').querySelector('small').textContent=memoryNames[event.by]||event.by;$('subtitle').querySelector('p').textContent=event.text;
    if(event.by!=='player'&&event.by!=='central')hooks.say(event.by,event.text);if(event.kind==='promise'||event.kind==='together')hooks.chime('receive');render();
    if(muted)return;requestVoice(event);
    speech.get(event.id)?.then(async r=>{
      if(stamp!==voiceStamp||!current||muted)return;
      if(r.url){clip=new Audio(r.url);clip.volume=.85;clip.onended=()=>{if(current?.id===event.id)current.until=performance.now()+500;};clip.onloadedmetadata=()=>{if(current?.id===event.id)current.until=performance.now()+Math.min(14000,clip.duration*1000+600);};try{await clip.play();}catch{};}
      else if('speechSynthesis' in window){const utterance=new SpeechSynthesisUtterance(event.text);utterance.lang='ja-JP';utterance.rate=1.07;utterance.volume=.75;utterance.onend=()=>{if(current?.id===event.id)current.until=performance.now()+400;};speechSynthesis.speak(utterance);}
    });
  }
  async function talk(id){
    if(!enabled||pending||editPending||current||queue.length)return;
    pending=true;talkPartner=id;$('wait').hidden=false;$('wait').textContent='記憶から、あなたの言葉が生まれる…';const stamp=revision;
    try{const r=await hooks.api('memory/talk',{id,revision:city.memoryGame.revision,position:hooks.position()});if(stamp!==revision)return;hooks.changed(r.city);if(r.warning)hooks.notice(r.warning,4);}
    catch(e){if(e.message==='STALE'){await hooks.refresh();hooks.notice('記憶が更新されました。もう一度、声をかけてみて。');}else hooks.notice(e.message==='TOO_FAR'?'もう少し近くで、声をかけよう。':'言葉が途切れました。もう一度試せます。');}
    finally{if(stamp===revision){pending=false;$('wait').hidden=true;render();}}
  }
  return {get open(){return !$('drawer').hidden;},get enabled(){return enabled;},get busy(){return pending||editPending;},get speaking(){return !!current||queue.length>0;},get used(){return used;},get speaker(){return current?.by;},get selected(){return city?.memoryGame?.blocks.find(b=>b.id===selected);},get held(){return pending||current||queue.length?talkPartner?[talkPartner]:[]:[];},openEditor:open,close,toggle,talk,
    activate(next,fresh){revision++;queue=[];quiet();city=next;enabled=!!next?.memoryGame?.active;root.hidden=!enabled;document.body.classList.toggle('memory-playing',enabled);seen=fresh?0:next?.memoryGame?.serial||0;selected='light';lastSignature='';speech.clear();picked=null;editId=null;$('backdrop').hidden=true;$('drawer').hidden=true;if(enabled)this.update(next);},
    stop(){revision++;queue=[];quiet();cancelDrag();enabled=false;root.hidden=true;$('backdrop').hidden=true;$('drawer').hidden=true;},setMuted(value){muted=value;if(value)quiet();},
    update(next){city=next;if(!enabled||!next?.memoryGame)return;const m=next.memoryGame;for(const event of m.events.filter(e=>e.id>seen)){queue.push(event);requestVoice(event);}seen=m.serial;const sig=m.revision+':'+m.stage+':'+m.serial;if(lastSignature!==sig){lastSignature=sig;render();}},
    frame(now,visible){if(!enabled)return;$('goal').hidden=!visible;$('open').hidden=!visible;$('pocket').hidden=!visible;if(!visible){if(current){queue.unshift(current);quiet();}return;}if(current&&now>=current.until)quiet();if(!current&&queue.length)speak(queue.shift());if(!pending&&!current&&!queue.length)talkPartner=null;},
  };
}
