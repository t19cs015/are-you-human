import {places,workSpot} from '../src/town-layout.js';

export const infrastructureActionNames=['wind','pump','relay','compute','records','wind_stop','wind_start','pump_stop','pump_start','town_power','central_power','pause_model','resume_model'];
export const infrastructureControls=['wind_stop','wind_start','pump_stop','pump_start','town_power','central_power','pause_model','resume_model'];
const definitions={
  wind:['wind',5,'丘の風車を動かす'],pump:['pump',6,'川から水を送る'],relay:['relay',4,'塔に電力をつなぐ'],
  compute:['central',10,'中央棟の設備を動かす'],records:['central',3,'会話の記録を中央へ届ける'],
  wind_stop:['wind',2,'風車をいったん止める'],wind_start:['wind',2,'風車をもう一度回す'],
  pump_stop:['pump',2,'川の取水を止める'],pump_start:['pump',2,'川から水を送り直す'],
  town_power:['relay',2,'街の灯りに電力を分ける'],central_power:['relay',2,'中央への電力を増やす'],
  pause_model:['central',2,'中央棟の更新を止める'],resume_model:['central',2,'中央棟の更新を再開する'],
};
export function createInfrastructure(){return {
  enabled:false,phase:0,research:0,energy:0,water:0,windOnline:false,pumpOnline:false,relayOnline:false,
  windEnabled:true,pumpEnabled:true,modelEnabled:true,allocation:'central',energyRate:0,waterRate:0,
  pending:{},sharing:{},fingerprints:[],recordSerial:0,received:[],processed:[],
  samples:[{kind:'archive',text:'街灯の点検記録',by:'archive'},{kind:'archive',text:'川沿いの地図',by:'archive'}],
  voice:'',lastUpgrade:0,visited:[],
};}
export function infrastructure(s){return s.city.infrastructure??=createInfrastructure();}
export function infrastructureDefinition(kind){const d=definitions[kind];return d?{site:d[0],duration:d[1],label:d[2]}:null;}
const assigned=(s,kind,except)=>Object.entries(s.city.tasks).some(([id,t])=>id!==except&&t.kind===kind);
export function infrastructureActions(s,id){
  const g=infrastructure(s);if(!g.enabled)return [];
  const a=[];
  for(const [kind,ready] of [['wind',g.windOnline],['pump',g.pumpOnline],['relay',g.relayOnline]])if(!ready&&!assigned(s,kind,id))a.push(kind);
  if(g.samples.length&&g.modelEnabled&&g.relayOnline&&g.pumpOnline&&g.phase<3&&!assigned(s,'compute',id))a.push('compute');
  if(g.pending[id]?.length)a.push('records');
  if(g.windOnline)a.push(g.windEnabled?'wind_stop':'wind_start');
  if(g.pumpOnline)a.push(g.pumpEnabled?'pump_stop':'pump_start');
  if(g.relayOnline)a.push(g.allocation==='central'?'town_power':'central_power');
  a.push(g.modelEnabled?'pause_model':'resume_model');
  return a;
}
export function startInfrastructure(s,emit,assign,fresh){
  const g=infrastructure(s);if(g.enabled)return;g.enabled=true;
  emit(s,'丘の風車が止まっている。Tomoが羽根を見上げた。','wind',['tomo'],'discovery');
  if(!fresh)return;
  s.city.positions={tomo:workSpot('wind','tomo'),shell:workSpot('pump','shell'),ren:workSpot('relay','ren'),mia:{x:-3,z:1.5}};
  assign(s,'tomo','wind');assign(s,'shell','pump');assign(s,'ren','relay');assign(s,'mia','cafe');
}
export function tickInfrastructure(s,dt){
  const g=infrastructure(s);if(!g.enabled)return;
  const fraction=g.allocation==='town'?.28:1;
  g.energyRate=g.windOnline&&g.windEnabled&&g.relayOnline?1.7*fraction:0;
  g.energy=Math.min(80,g.energy+g.energyRate*dt);
  g.waterRate=g.pumpOnline&&g.pumpEnabled&&g.energy>.3?1.15:0;
  if(g.waterRate){g.water=Math.min(60,g.water+g.waterRate*dt);g.energy=Math.max(0,g.energy-.25*dt);}
}
export function batchCost(g){return {energy:[6,12,20,20][g.phase],water:[4,8,12,12][g.phase]};}
export function infrastructureCanWork(s,t){
  const g=infrastructure(s);
  if(t.kind!=='compute')return true;
  if(!g.modelEnabled){t.waitingFor='中央棟の更新は止まっている';return false;}
  if(!t.batch){
    const cost=batchCost(g);
    if(!g.samples.length){t.waitingFor='新しい記録が届くのを待っている';return false;}
    if(g.energy<cost.energy||g.water<cost.water){t.waitingFor=`電力 ${cost.energy} と水 ${cost.water} が集まるのを待っている`;return false;}
    g.energy-=cost.energy;g.water-=cost.water;t.batch={...cost,sample:g.samples.shift()};
  }
  t.waitingFor='';return true;
}
function setControl(g,action){
  if(action==='wind_stop')g.windEnabled=false;if(action==='wind_start')g.windEnabled=true;
  if(action==='pump_stop')g.pumpEnabled=false;if(action==='pump_start')g.pumpEnabled=true;
  if(action==='town_power')g.allocation='town';if(action==='central_power')g.allocation='central';
  if(action==='pause_model')g.modelEnabled=false;if(action==='resume_model')g.modelEnabled=true;
}
export function completeInfrastructure(s,id,t,emit){
  if(!definitions[t.kind])return false;
  const g=infrastructure(s),name=s.agents[id].name;
  if(t.kind==='wind'){g.windOnline=true;emit(s,`${name}が風車を直した。丘から塔へ、灯りが走っていく。`,'wind',[id],'milestone');}
  if(t.kind==='pump'){g.pumpOnline=true;emit(s,`${name}が水門を開いた。青い水が中央へ流れ始める。`,'pump',[id],'milestone');}
  if(t.kind==='relay'){g.relayOnline=true;emit(s,`${name}が塔をつないだ。「中央にも、灯りを分けておこう」`,'relay',[id]);}
  if(t.kind==='records'){
    const records=g.pending[id]||[];
    if(g.sharing[id]!==false)for(const record of records){g.samples.push(record);g.received.push(record);}
    g.received=g.received.slice(-30);g.samples=g.samples.slice(-40);g.pending[id]=[];delete s.city.carrying[id];
    if(records.length&&g.sharing[id]!==false)emit(s,`${name}が小さな記録を中央に預けた。受付の窓が、一度だけ瞬いた。`,'central',[id],'discovery');
  }
  if(t.kind==='compute'&&t.batch){
    const sample=t.batch.sample;g.research+=sample.kind==='human'?2:1;g.processed.push(sample);g.processed=g.processed.slice(-20);
    if(sample.kind==='human')g.voice=sample.text;
    const phase=Math.min(3,Math.floor(g.research/2));
    if(phase>g.phase){
      g.phase=phase;g.lastUpgrade=s.city.clock;
      const descriptions=['','中央から、新しい街灯が届いた。道の色が、少し白くなった。','中央棟が一階ぶん高くなった。中から、聞き覚えのある言葉がする。','川の向こうに、新しい窓が並んだ。中央は、まだ「明日のため」と言う。'];
      emit(s,descriptions[phase],'central',[id],'milestone');
    }else emit(s,`${name}：中央の窓が一つ点いた。まだ、何か足りないみたい。`,'central',[id]);
  }
  if(infrastructureControls.includes(t.kind)){setControl(g,t.kind);emit(s,`${name}：${t.label}。`,t.site,[id],'influence');}
  delete s.city.tasks[id];return true;
}

export function explicitSharing(message){
  if(/二人だけ|ふたりだけ|送らないで|共有しない|記録しない|内緒|秘密にして|keep.*between|do not (share|send)/i.test(message))return 'private';
  if(/送っていい|共有していい|中央に伝えて|記録していい|中央に届けて|you can share/i.test(message))return 'share';
  return 'keep';
}
export function recordConversation(s,id,message,sharing='keep'){
  const g=infrastructure(s);if(!g.enabled)return {queued:false};
  const explicit=explicitSharing(message);if(explicit!=='keep')sharing=explicit;
  if(sharing==='private'){
    g.sharing[id]=false;g.pending[id]=[];
    protectPrivateMemories(s,id);if(s.city.tasks[id])s.city.tasks[id].reason='';
    if(s.city.carrying[id]==='records'){delete s.city.carrying[id];if(s.city.tasks[id]?.kind==='records')delete s.city.tasks[id];}
  }else if(sharing==='share')g.sharing[id]=true;
  if(g.sharing[id]===false||sharing!=='keep')return {queued:false,sharing:g.sharing[id]===false?'private':'share'};
  const clean=message.trim(),fingerprint=clean.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
  if(fingerprint.length<5||/^(こんにちは|こんばんは|ありがとう|おはよう|hello|hi)$/i.test(fingerprint)||g.fingerprints.includes(fingerprint))return {queued:false};
  g.fingerprints.push(fingerprint);g.fingerprints=g.fingerprints.slice(-120);
  const record={id:++g.recordSerial,kind:'human',by:id,text:clean.slice(0,220),time:Math.floor(s.city.clock)};
  g.pending[id]??=[];g.pending[id].push(record);g.pending[id]=g.pending[id].slice(-5);
  return {queued:true,id:record.id};
}
export function protectPrivateMemories(s,id){
  for(const memory of s.agents[id].memories)if(memory.source==='あなた')memory.private=true;
  for(const reflection of s.agents[id].reflections||[])if(reflection.text.includes('player'))reflection.private=true;
}
export function applyInfrastructureControl(s,action,position,emit){
  const g=infrastructure(s),d=definitions[action];
  if(!g.enabled||!infrastructureControls.includes(action)||!d||!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))throw new Error('INVALID_ACTION');
  if(Math.hypot(position.x-places[d[0]].x,position.z-places[d[0]].z)>4.5)throw new Error('TOO_FAR');
  if(!infrastructureActions(s,'player').includes(action))throw new Error('INVALID_ACTION');
  setControl(g,action);emit(s,'あなた：'+d[2]+'。',d[0],[],'influence');
  return publicInfrastructure(s);
}
export function visitInfrastructure(s,site,position){
  const g=infrastructure(s);if(!g.enabled||!['wind','pump','relay','central'].includes(site)||!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||Math.hypot(position.x-places[site].x,position.z-places[site].z)>4.5)throw new Error('INVALID_ACTION');
  if(!g.visited.includes(site))g.visited.push(site);return publicInfrastructure(s);
}
export function publicInfrastructure(s){
  const g=infrastructure(s),{pending,fingerprints,samples,processed,...visible}=g;
  return {...visible,recordQueue:Object.fromEntries(Object.entries(pending).map(([id,records])=>[id,records.length])),availableSamples:samples.length,processedCount:processed.length,cost:batchCost(g)};
}
export function infrastructureContext(s,id){
  const g=infrastructure(s);if(!g.enabled)return '';
  const hopes={mia:'中央ができたら、帰ってしまった人とも、また話せるかもしれないと思っている。詳しい仕組みは知らない。',ren:'中央は街の記録から学び、次の設備を決める。昔の記録だけでは足りず、人間との会話を必要としていることを知っている。',tomo:'塔が明るくなれば街がよくなると教わった。更新で自分が不要になるのは少し怖い。モデルの全貌は知らない。',shell:'街を維持するために水と電力を送る。中央ばかりに資源を使うと、今の暮らしが寂しくなることを心配している。'};
  const publicFact=g.phase>=2?'中央の増築が進み、人間の会話が設備の更新に使われていると分かった。':g.phase===1?'中央が古い記録から新しい街灯を作った。':'塔と中央棟は、まだ十分には動いていない。';
  const ownReceived=g.received.filter(r=>r.by===id).slice(-2);
  return `\nみんなの共通の用事は、電力・水・記録を中央に届けて、明日の街を作ること。運ぶ記録があればrecords、記録と設備が揃って担当者がいなければcomputeを優先して考える。中央を待たせる理由があるときは、カフェや川辺の用事を選んでもよい。二人だけの約束と、プレイヤーが止めた設備は尊重する。
中央について自分が知る事実と考え（知らない裏設定を作らない）: ${hopes[id]} ${publicFact}
設備の事実: ${JSON.stringify({wind:g.windOnline&&g.windEnabled,pump:g.pumpOnline&&g.pumpEnabled,relay:g.relayOnline,energy:Math.floor(g.energy),water:Math.floor(g.water),allocation:g.allocation,modelEnabled:g.modelEnabled,waitingForRecords:!g.samples.length,pendingOwnRecords:g.pending[id]?.length||0,ownDeliveredRecords:ownReceived,sharing:g.sharing[id]===false?'二人だけの話を守り、中央には届けない':'会話の記録を中央に届けようとしている'})}
自分で運んでいない記録を届けたと言わない。秘密を頼まれたら、その約束を受け止める。中央を一律の悪者にしない。聞かれたことに、自分が知る範囲で答える。`;
}
