import {discoveryById,explorationGoal} from './discovery-rules.js';

// One next action, derived from real progress. This never chooses an NPC's reply.
export function memoryGuide(city){
  const m=city?.memoryGame;if(!m?.active)return null;
  const resident=id=>({id,label:id==='tomo'?'Tomo':id,x:city.positions?.[id]?.x??0,z:city.positions?.[id]?.z??0,resident:true});
  const place=id=>{const p=discoveryById[id];return {id,label:p.name,x:p.x,z:p.z};};
  const step=(id,part,title,detail,extra={})=>({id,part,title,detail,...extra});
  const tomo=resident('tomo'),lead=m.blocks.find(b=>b.id===m.equipped[0]);
  if(m.stage==='syncing')return step('sync',m.cycle===1?1:3,'街の記憶が、入れ替わる。','少し待とう。あなたの記憶は、そのまま残る。');
  if(m.nextSync!=null&&city.infrastructure?.modelEnabled===false)return step('paused',3,'中央の更新が、止まっている。','中央に更新の再開を頼むと、次の記憶が届く。',{target:{id:'central',label:'中央',x:0,z:25}});
  if(m.stage==='arrival')return step('hello',1,'Tomoに、こんにちは。','Eで返事。次の灯りを見る約束をしよう。',{target:tomo});
  if(m.stage==='promised')return step('promise',1,'小さな約束を、受け取った。','灯りが変わるのを待とう。歩いて見回しても大丈夫。',{target:tomo});
  if(m.stage==='changed')return step('forgotten',1,'さっきの約束、覚えてる？','Tomoに、もう一度 E で聞いてみよう。',{target:tomo});
  if(!m.meeting){
    if(m.stage==='invited')return step('follow',2,'言葉が、Tomoを動かした。','灯りの下へ歩くTomoを追いかけよう。',{target:tomo});
    if(lead?.id==='promise'||lead?.edited)return step('invite',2,'記憶を、言葉にしてみよう。','Tomoに E。選んだ記憶から、どんな言葉が生まれる？',{target:tomo,block:lead.id});
    return step('equip-promise',2,'約束を、声の中心へ。','Qで記憶を開き「ここで、また」を一番左へ。',{block:'promise',gesture:'equip'});
  }
  if(!m.reunionHeard){
    if(m.preserved?.includes('tomo'))return step('remembered',3,'今度は、覚えているかな。','Tomoに E。次の記憶に、約束が残ったか確かめよう。',{target:tomo});
    if(m.shared?.includes('tomo'))return step('keep-wait',3,'次のTomoへ、届けよう。','もう一度、灯りが変わるのを待とう。',{target:tomo});
    if(lead?.id==='together'||lead?.edited&&m.edits?.some(e=>e.id===lead.id&&e.at>=m.phaseAt))return step('ask-keep',3,'この時間を、次の記憶にも。','Tomoに E。この思い出を残したいと相談してみよう。',{target:tomo,block:lead.id});
    return step('equip-together',3,'一緒にいた時間を、残そう。','Qで「今、ここにいる」を一番左へ。次の自分たちに残せるかな。',{block:'together',gesture:'equip'});
  }
  const e=m.exploration||{};
  if(!e.visited?.chimes)return step('kept',4,'約束が、次の記憶にも残った。','近くの風鈴に触れてみよう。ここからは、自由な寄り道。',{target:place('chimes')});
  const goal=explorationGoal(m);
  const target=!e.visited?.archive?'archive':!e.windTuned?'wind':!e.waterOpen?'pump':!e.centralMemory?'core':!e.localMemory?'garden':!e.shoreRead?'shore':null;
  return step('explore',4,goal?.[0]||'次は、あなたの言葉で。',goal?.[1]||'記憶を書き換えて、誰かを誘ってみよう。',{target:target?place(target):null});
}

export function guideDirection(position,yaw,target){
  const dx=target.x-position.x,dz=target.z-position.z;
  const angle=Math.atan2(dx,-dz)+yaw;
  return {distance:Math.hypot(dx,dz),angle:Math.atan2(Math.sin(angle),Math.cos(angle))};
}
