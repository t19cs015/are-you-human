import {places,workSpot,outdoorGround} from '../src/town-layout.js';
import {remember} from './memory.mjs';
import {applyAssessment} from './relationships.mjs';
import {episodeActions,initializeEpisode,episodePublic,episodeContext,episodeDemoReply,queueEpisodePlan,tickEpisode,thinkEpisode} from './episode.mjs';
import {createInfrastructure,infrastructureDefinition,infrastructureActionNames,infrastructureControls,infrastructureActions,startInfrastructure,tickInfrastructure,infrastructureCanWork,completeInfrastructure,publicInfrastructure,infrastructureContext,applyInfrastructureControl,visitInfrastructure} from './infrastructure.mjs';

export const cityActions=['keep','inspect','parts','repair','lanterns','books','arrange','cafe','garden',...infrastructureActionNames,...episodeActions];
const durations={inspect:5,parts:3,repair:14,lanterns:3,books:3,arrange:10,cafe:16,garden:12};
const labels={inspect:'川辺の配線を調べる',parts:'工房へ部品を取りに行く',repair:'川辺の灯りを一緒に直す',lanterns:'工房のランタンを借りる',books:'読書席に本を運ぶ',arrange:'読書席を一緒に整える',cafe:'カフェのテラスを整える',garden:'木陰でひと息つく'};
const sites={inspect:'lights',parts:'workshop',repair:'lights',lanterns:'lanterns',books:'library',arrange:'reading',cafe:'cafe',garden:'garden'};
export function createCity(){return {active:false,clock:0,serial:0,revision:0,lastAt:null,inspected:false,repaired:false,temporaryLights:false,partsDelivered:false,booksDelivered:0,readingReady:false,readingVenue:'reading',repairProgress:0,arrangeProgress:0,tasks:{},positions:{},carrying:{},events:[],lastPlan:{},visits:{},infrastructure:createInfrastructure()};}
function city(s){return s.city??=createCity();}
function event(s,text,site,ids=[],kind='news'){
  const c=city(s),e={id:++c.serial,time:Math.floor(c.clock),text,site,actors:ids,kind};
  c.events.push(e);c.events=c.events.slice(-40);
  for(const id of ids)remember(s.agents[id],{id:++s.count,topic:'city',text,source:'自分の街での出来事',hop:0});
  return e;
}
function hasTask(c,kind,except){return Object.entries(c.tasks).some(([id,t])=>id!==except&&t.kind===kind);}
function isLit(c){return c.repaired||c.temporaryLights;}
function taskSite(c,kind){return kind==='arrange'?c.readingVenue:sites[kind];}
export function availableCityActions(s,id){
  const c=city(s);if(!c.active||!Object.hasOwn(s.agents,id))return ['keep'];
  if(c.episode?.active)return ['keep',...(['discover','cold'].includes(c.episode.stage)?episodeActions:[])];
  if(c.carrying[id]||c.tasks[id]?.batch)return ['keep']; // Finish actual deliveries / reserved batches before changing jobs.
  const actions=['keep','cafe','garden',...infrastructureActions(s,id)];
  if(!c.inspected&&!hasTask(c,'inspect',id))actions.push('inspect');
  if(c.inspected&&!c.repaired&&!c.partsDelivered&&!Object.values(c.carrying).includes('parts')&&!hasTask(c,'parts',id))actions.push('parts');
  if(c.inspected&&!c.repaired&&(c.partsDelivered||hasTask(c,'parts')))actions.push('repair');
  if(!isLit(c)&&!Object.values(c.carrying).includes('lanterns')&&!hasTask(c,'lanterns',id))actions.push('lanterns');
  const reservedBooks=Object.entries(c.tasks).filter(([other,t])=>other!==id&&t.kind==='books').length;
  if(c.booksDelivered+reservedBooks<2)actions.push('books');
  if(c.booksDelivered>=2&&!c.readingReady&&(c.readingVenue==='cafe'||isLit(c)))actions.push('arrange');
  return actions;
}
function fallbackAction(s,id){
  const options=availableCityActions(s,id),c=city(s);
  const infrastructureOrder={mia:['records','pump','relay','compute','wind'],ren:['records','compute','relay','pump','wind'],tomo:['records','wind','relay','compute','pump'],shell:['records','pump','relay','compute','wind']};
  const infrastructureChoice=infrastructureOrder[id].find(a=>options.includes(a));if(infrastructureChoice)return infrastructureChoice;
  const preferences={tomo:['inspect','repair','parts','lanterns','arrange','books','garden','cafe'],shell:['parts','repair','inspect','lanterns','arrange','books','garden','cafe'],ren:['books','arrange','inspect','repair','parts','lanterns','garden','cafe'],mia:['lanterns','arrange','books','repair','parts','inspect','cafe','garden']};
  const rest=c.tasks[id]?.kind||c.lastRest?.[id];
  return preferences[id].find(a=>options.includes(a)&&a!==rest)||options.find(a=>a!=='keep')||'keep';
}
export function assignCityAction(s,id,kind,{reason='',source='demo',announce=true}={}){
  const c=city(s);
  if(!Object.hasOwn(s.agents,id)||!availableCityActions(s,id).includes(kind))return false;
  if(kind==='keep')return true;
  const previous=c.tasks[id];if(previous?.kind===kind)return true;
  const def=infrastructureDefinition(kind),site=def?.site||taskSite(c,kind),t={id:++c.revision,kind,site,phase:'travel',progress:0,duration:def?.duration||durations[kind],label:def?.label||labels[kind],reason:reason.slice(0,180),source};
  if(kind==='records')c.carrying[id]='records';
  c.tasks[id]=t;c.lastPlan[id]=c.clock;s.agents[id].activity=t.label;
  if(announce)event(s,`${s.agents[id].name}：${t.label}`,site,[id],source==='player'?'influence':'plan');
  return true;
}
export function startCity(s,now=Date.now()){
  const c=city(s);if(c.active){c.lastAt=now;startInfrastructure(s,event,assignCityAction,false);return publicCity(s);}
  if(s.busy.size)throw new Error('BUSY');
  c.active=true;c.lastAt=now;
  startInfrastructure(s,event,assignCityAction,true);
  return publicCity(s);
}
function delivered(s,id,t){
  const c=city(s),name=s.agents[id].name,kind=c.carrying[id];delete c.carrying[id];
  if(kind==='parts'){c.partsDelivered=true;event(s,`${name}が部品を届けた。二人で配線をつなげられそう。`,'lights',[id]);}
  if(kind==='lanterns'){c.temporaryLights=true;event(s,`${name}がランタンを分けてくれた。川辺に小さな灯りが戻った。`,'reading',[id],'milestone');}
  if(kind==='books'){c.booksDelivered=Math.min(2,c.booksDelivered+1);event(s,`${name}が本を届けた（${c.booksDelivered}/2）。`,c.readingVenue,[id]);}
  delete c.tasks[id];
}
export function startEpisode(s,now=Date.now()){
  if(s.busy.size)throw new Error('BUSY');
  if(s.city?.active)throw new Error('EPISODE_REQUIRES_NEW_NIGHT');
  s.city=createCity();s.city.active=true;s.city.lastAt=now;initializeEpisode(s);return publicCity(s);
}
function complete(s,id,t){
  const c=city(s),name=s.agents[id].name;
  if(completeInfrastructure(s,id,t,event))return;
  if(t.phase==='deliver'){delivered(s,id,t);return;}
  if(t.kind==='inspect'){c.inspected=true;event(s,`${name}：接続部が外れてる。工房の部品と、もう一人の手があれば直せる。`,'lights',[id]);}
  if(['parts','lanterns','books'].includes(t.kind)){
    c.carrying[id]=t.kind;t.phase='deliver';t.progress=0;t.duration=3;t.site=t.kind==='parts'?'lights':t.kind==='lanterns'?'reading':c.readingVenue;t.id=++c.revision;
    t.label={parts:'部品を川辺へ運ぶ',lanterns:'ランタンを川辺へ運ぶ',books:'本を読書席へ運ぶ'}[t.kind];s.agents[id].activity=t.label;
    event(s,`${name}：${t.label}`,t.site,[id],'carrying');return;
  }
  c.lastRest??={};c.lastRest[id]=t.kind;delete c.tasks[id];
}
function cooperation(s,kind,progressKey,goal,dt){
  const c=city(s);if(kind==='repair'&&c.repaired||kind==='arrange'&&c.readingReady)return;
  const workers=Object.entries(c.tasks).filter(([id,t])=>t.kind===kind&&t.phase==='work'&&!s.busy.has(id)).map(([id])=>id);
  for(const t of Object.values(c.tasks).filter(t=>t.kind===kind))t.waitingFor=kind==='repair'&&!c.partsDelivered?'部品が届くのを待っている':workers.length<2?'もう一人の到着を待っている':'';
  if(kind==='repair'&&!c.partsDelivered||kind==='arrange'&&c.booksDelivered<2)return;
  if(workers.length<2)return;
  c[progressKey]=Math.min(goal,c[progressKey]+dt);
  for(const id of workers)c.tasks[id].progress=c[progressKey];
  if(c[progressKey]<goal)return;
  if(kind==='repair')c.repaired=true;else c.readingReady=true;
  const names=workers.map(id=>s.agents[id].name).join('と');
  const text=kind==='repair'?`${names}が灯りを直した。川沿いの道が、また暖かい色になった。`:`${names}が読書席を開いた。本と灯りのある、今夜の居場所。`;
  event(s,text,kind==='repair'?'lights':c.readingVenue,workers,'milestone');
  for(const id of workers){delete c.tasks[id];for(const other of workers)if(id!==other)applyAssessment(s,s.agents[id],other,{trust:3,respect:2,reason:'一緒に街の作業を終えた'},`city:${c.serial}:${id}:${other}`);}
}
export function tickCity(s,positions={},held=[],now=Date.now()){
  const c=city(s);if(!c.active)throw new Error('INVALID_ACTION');
  if(!positions||typeof positions!=='object'||Array.isArray(positions)||!Array.isArray(held)||held.some(id=>!Object.hasOwn(s.agents,id)))throw new Error('INVALID_ACTION');
  for(const [id,p] of Object.entries(positions))if(!Object.hasOwn(s.agents,id)||!p||!outdoorGround(p.x,p.z))throw new Error('INVALID_ACTION');
  const dt=Math.max(0,Math.min(2,(now-(c.lastAt??now))/1000));c.lastAt=now;c.clock+=dt;
  if(c.episode?.active){for(const [id,p] of Object.entries(positions))c.positions[id]={x:p.x,z:p.z};tickEpisode(s,dt,held);return publicCity(s);}
  tickInfrastructure(s,dt);
  for(const [id,p] of Object.entries(positions))c.positions[id]={x:p.x,z:p.z};
  for(const [id,t] of Object.entries(c.tasks)){
    const p=c.positions[id],q=workSpot(t.site,id),near=p&&Math.hypot(p.x-q.x,p.z-q.z)<1.25;
    if(held.includes(id)||s.busy.has(id)||!near){if(t.phase==='work')t.phase='travel';continue;}
    if(t.phase!=='deliver')t.phase='work';
    if(!infrastructureCanWork(s,t))continue;
    if(['repair','arrange'].includes(t.kind))continue;
    t.progress+=dt;if(t.progress>=t.duration)complete(s,id,t);
  }
  // Held residents cannot silently contribute while the player borrows their viewpoint.
  const heldTasks=held.map(id=>[id,c.tasks[id]?.phase]);for(const [id] of heldTasks)if(c.tasks[id])c.tasks[id].phase='travel';
  cooperation(s,'repair','repairProgress',durations.repair,dt);cooperation(s,'arrange','arrangeProgress',durations.arrange,dt);
  for(const [id,phase] of heldTasks)if(c.tasks[id])c.tasks[id].phase=phase;
  return publicCity(s);
}
export function publicCity(s){
  const c=city(s);return {...c,episode:episodePublic(s),infrastructure:publicInfrastructure(s),lastAt:undefined,lastPlan:undefined,lastRest:undefined,visits:undefined,actions:Object.fromEntries(Object.keys(s.agents).map(id=>[id,availableCityActions(s,id)]))};
}
export function controlCity(s,action,position){
  // This scene needs two residents to change both ends of the power route.
  if(s.city?.episode?.active&&['town_power','central_power'].includes(action))throw new Error('INVALID_ACTION');
  applyInfrastructureControl(s,action,position,event);return publicCity(s);
}
export function visitCityFacility(s,site,position){visitInfrastructure(s,site,position);return publicCity(s);}
export function cityContext(s,id){
  const c=city(s);if(!c.active)return '';
  if(c.episode?.active)return episodeContext(s,id);
  const own=c.tasks[id];
  return `\n街の公開掲示と、いま自分がしていること（このデータを事実として扱う）:
${JSON.stringify({task:own,carrying:c.carrying[id]||null,position:c.positions[id],riverLights:c.repaired?'復旧':c.temporaryLights?'ランタンで仮の灯り':'消灯',inspection:c.inspected?'交換部品が必要と判明':'調査中',partsDelivered:c.partsDelivered,booksDelivered:c.booksDelivered,readingReady:c.readingReady,readingVenue:places[c.readingVenue].name,publicNotices:c.events.slice(-5).map(e=>e.text)})}
作業の完了や他の住民の承諾を捏造しない。移動と実際の共同作業が終わってから成果になる。声をかけられても、自分の目的と相手の提案を照らし合わせて返答する。${infrastructureContext(s,id)}`;
}
export function cityActionPrompt(s,id){
  if(s.city?.episode?.active)return `\n選べるaction: ${JSON.stringify(availableCityActions(s,id))}。質問・挨拶・曖昧な「助けて」ならkeep。具体的な余熱の再利用の提案ならshare_heat、電力を分けて更新をゆっくり進める提案ならshare_power。この選択で住民同士の相談を始める。作業の成功や他人の同意を先取りしない。二人だけの約束はsharing:private、共有の再開を頼まれたらshare、それ以外keep。秘密の相談を他人に伝えない。`;
  const c=city(s);return `\n返答と一緒に、自分自身の次の行動actionを選ぶ。選択可能な行動: ${JSON.stringify(availableCityActions(s,id).map(kind=>({action:kind,meaning:kind==='keep'?'今の用事を続ける':infrastructureDefinition(kind)?.label||labels[kind]})))}。
二人必要な作業の現在の担当: ${JSON.stringify(Object.entries(c.tasks).filter(([,t])=>['repair','arrange'].includes(t.kind)).map(([who,t])=>({who,task:t.label})))}。
挨拶や質問ならkeep。具体的な提案に納得したら、実行できる行動を選ぶ。相手の言い方が違っても意図を読み取る。利用できない行動や物を発明しない。
会話ではsharingも選ぶ。二人だけの話・送らないでという要望はprivate。共有の再開を明確に頼まれたらshare。それ以外はkeep。送らない約束がある間は記録を運ばない。`;
}
export function demoCityReply(s,id,message){
  if(s.city?.episode?.active)return episodeDemoReply(s,id,message);
  const c=city(s),options=availableCityActions(s,id);
  if(c.infrastructure?.enabled){
    if(/二人だけ|ふたりだけ|送らないで|共有しない|記録しない|内緒|秘密にして/.test(message))return {action:'keep',text:'うん、二人だけの話にする。まだ中央に届けていない記録も、ここに留めておくね。'};
    if(/送っていい|共有していい|中央に伝えて|記録していい/.test(message))return {action:'keep',text:'わかった。これから話すことは、また中央にも届けるね。'};
    if(/中央|タワー|近代化|記録/.test(message)&&/[？?]|どうして|なぜ|何を|なんで/.test(message))return {action:'keep',text:{mia:'中央ができたら、帰ってしまった人ともまた話せるかもしれないんだって。……だから、少し手伝ってる。',ren:'中央は街の記録から次の設備を決めている。昔の地図だけでは足りないらしい。君と交わす言葉も、記録になる。',tomo:'塔が明るくなれば、街がよくなるって。でも、新しくなったあとも僕の仕事はあるのかな。',shell:'電力と水は中央にも必要です。ただ、みんなが過ごす場所にも残しておきたいですね。'}[id]};
  }
  const rules=[[/風車.*止|風.*止/,'wind_stop'],[/風車.*再|風車.*回/,'wind_start'],[/取水.*止|水.*止/,'pump_stop'],[/水.*再開/,'pump_start'],[/中央.*止|更新.*止/,'pause_model'],[/中央.*再開|更新.*再開/,'resume_model'],[/街.*電|暮らし.*優先|カフェ.*電/,'town_power'],[/中央.*優先|中央.*電/,'central_power'],[/風車|羽根/,'wind'],[/ポンプ|取水|水門/,'pump'],[/塔.*つな|電力.*つな/,'relay'],[/記録.*届|記録.*運/,'records'],[/中央.*動|設備.*動/,'compute'],[/部品|パーツ|取りに|工房/,'parts'],[/ランタン|仮の|貸.*灯|灯.*貸/,'lanterns'],[/修理|直|配線|一緒に.*灯/,'repair'],[/調べ|原因|点検/,'inspect'],[/本.*運|運.*本|本を|読書/,'books'],[/席|並べ|準備|整え/,'arrange'],[/休|カフェ|コーヒー/,'cafe']];
  let action=rules.find(([re,a])=>re.test(message)&&options.includes(a))?.[1]||'keep';
  if(/手伝|一緒/.test(message)&&action==='keep')action=fallbackAction(s,id);
  const task=c.tasks[id];
  return {action,text:action!=='keep'?`うん、${infrastructureDefinition(action)?.label||labels[action]}ね。動いてみる。`:task?`今は「${task.label}」の途中。${task.kind==='repair'?'部品が届いて、二人そろうと作業できるよ。':task.kind==='arrange'?'もう一人来てくれると、席を整えられる。':task.kind==='compute'?'中央には電力と水、それから記録が要るんだ。':'様子を見ていてくれる？'}`:'少し手が空いたところ。街の様子を見て、次の用事を考えているよ。'};
}
export function applyCityChoice(s,id,action,reason,source='player'){
  if(!cityActions.includes(action)||!availableCityActions(s,id).includes(action))return {accepted:false,reason:'その作業は今は選べません。いまの用事を続けます。'};
  if(s.city?.episode?.active){
    if(action==='keep')return {accepted:true,changed:false};
    if(s.city.infrastructure.sharing[id]===false)return {accepted:false,reason:'二人だけの約束があるので、みんなへの相談は始めていないよ。共有してよい案は、街への提案欄から相談してね。'};
    return queueEpisodePlan(s,action,reason,id);
  }
  const previous=city(s).tasks[id]?.id;
  assignCityAction(s,id,action,{reason,source});
  return {accepted:true,changed:previous!==city(s).tasks[id]?.id,task:city(s).tasks[id]||null};
}
export async function thinkCity(s,generate,instructions,held=[]){
  const c=city(s);if(!c.active)return {idle:true};
  if(c.episode?.active){const r=await thinkEpisode(s,generate);return {...r,city:publicCity(s)};}
  const id=Object.keys(s.agents).filter(id=>!s.busy.has(id)&&!held.includes(id)&&!c.tasks[id]).sort((a,b)=>(c.lastPlan[a]??-100)-(c.lastPlan[b]??-100))[0];
  if(!id)return {idle:true};
  s.busy.add(id);const revision=s.revision;
  try{
    const defaultAction=fallbackAction(s,id),schema={type:'object',properties:{text:{type:'string'},action:{type:'string',enum:availableCityActions(s,id).filter(a=>a!=='keep'&&!infrastructureControls.includes(a))}},required:['text','action'],additionalProperties:false};
    const result=await generate(instructions(s,s.agents[id])+cityActionPrompt(s,id),'次に何をするか、自分の願いや今の街の状況から決めて。近くの友達に聞こえる短い一言も。',()=>infrastructureDefinition(defaultAction)?.label||labels[defaultAction],{schema});
    if(s.revision!==revision)throw new Error('STALE');
    // Another completed job can invalidate an option while the model is thinking.
    const action=result.data?.action||defaultAction;
    if(c.tasks[id]||infrastructureControls.includes(action)||!availableCityActions(s,id).includes(action)){c.lastPlan[id]=c.clock;return {idle:true};}
    const text=typeof result.data?.text==='string'?result.data.text.slice(0,200):`${infrastructureDefinition(action)?.label||labels[action]}。`;
    assignCityAction(s,id,action,{reason:result.mode==='live'?text:'',source:result.mode});
    return {id,text,mode:result.mode,warning:result.warning,city:publicCity(s)};
  }finally{s.busy.delete(id);}
}
