export function createHumanView(hooks){
  const root=document.createElement('div');root.id='human-interface';root.hidden=true;
  root.innerHTML=`<nav class="human-nav" aria-label="街のメニュー"><button id="human-map" aria-label="街を見渡す">街を見る <kbd>M</kbd></button><button id="human-menu-button" aria-label="メニューを開く">☰</button></nav><button id="world-action" hidden></button><p id="human-controls">WASDで歩く · クリックしてマウスで見回す</p><section id="human-menu" class="modal panel" hidden aria-label="街のメニュー"><button class="close" id="human-close" aria-label="メニューを閉じる">×</button><h2>少し、ひと息。</h2><button class="primary" id="human-continue">街に戻る</button><div class="human-menu-links"><button id="human-sketch">明日のスケッチ</button><button id="human-central">中央のそばへ</button><button id="human-memory">記憶の都市へ</button><button id="human-home">広場へ戻る</button></div><details><summary>操作と設定</summary><p>WASD：歩く<br>マウス：見回す<br>E：目の前に触る・話す<br>Shift：小走り / Space：ダッシュ</p><button id="human-settings">音声・操作の設定</button><button id="human-sound">音を切り替える</button><label><input id="human-touch" type="checkbox">画面に移動ボタンを出す</label></details><details><summary>街の記録</summary><button id="human-journal">住人のこと</button><p id="human-resources"></p><button id="human-restart">新しい夜を始める</button></details></section>`;
  document.body.append(root);const $=id=>root.querySelector('#'+id);let enabled=false,target=null,pending=false;
  const close=()=>{$('human-menu').hidden=true;hooks.focus();};
  const showMenu=()=>{if(!enabled)return;hooks.prepare();$('human-menu').hidden=false;};
  $('human-menu-button').onclick=showMenu;$('human-close').onclick=close;$('human-continue').onclick=close;
  const actions={'human-map':'map','human-sketch':'sketch','human-central':'central','human-memory':'memory','human-home':'home','human-settings':'settings','human-sound':'sound','human-journal':'journal','human-restart':'restart'};
  for(const [id,key] of Object.entries(actions))$(id).onclick=()=>{close();hooks[key]();};
  $('human-touch').onchange=e=>document.body.classList.toggle('show-touch-controls',e.target.checked);
  async function interact(){if(!target||pending)return false;const chosen=target;pending=true;try{await chosen.run();}finally{pending=false;}return true;}
  $('world-action').onclick=interact;
  return {get open(){return !$('human-menu').hidden;},get enabled(){return enabled;},showMenu,close,interact,frame(city,playing,available,next,playTime,overview=false){
    enabled=playing&&!!city?.community?.active;root.hidden=!enabled;document.body.classList.toggle('human-interface',enabled);if(!enabled)return;
    if($('human-map').dataset.overview!==String(overview)){$('human-map').dataset.overview=String(overview);$('human-map').innerHTML=(overview?'街へ戻る':'街を見る')+' <kbd>M</kbd>';$('human-map').setAttribute('aria-label',overview?'街へ戻る':'街を見渡す');}
    target=available?next:null;$('world-action').hidden=!target;
    if(target)$('world-action').textContent='E　'+target.label;
    $('human-controls').hidden=!available||playTime>25;
    $('human-resources').textContent='街の灯り '+Math.round(city.community.energy)+' · 中央の更新 '+(city.infrastructure.modelEnabled?Math.round(city.community.central)+'%':'停止中')+' · 呼び声がつながった夜 '+(city.community.human?.moments.length||0)+'回';
  }};
}
