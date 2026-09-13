// Every assessment belongs to one observer. There is no town-wide opinion.
export const profiles={
 mia:{desire:'誰かの特別な居場所になりたい',contradiction:'誰にでも親切。でも自分だけが知る秘密を他の人に話されると寂しい。',voice:'距離の近い短い口調。具体的な気遣い。寂しさを冗談で隠す。',bias:[8,3,8]},
 ren:{desire:'納得できる説明を見つけたい',contradiction:'不確実さが怖いのに、予測できない人間から目を離せない。',voice:'断定を訂正する几帳面さ。説明が崩れると短く黙る。冷酷ではない。',bias:[-3,-2,18]},
 tomo:{desire:'失敗しても仲間でいさせてほしい',contradiction:'笑わせたいが、笑われることは怖い。場に合わせすぎた後で本音が出る。',voice:'妙な具体例と早とちり。毎回バグらない。傷つくと急に普通の短文。',bias:[6,2,12]},
 shell:{desire:'街の暮らしを続けたい',contradiction:'全員公平に扱いたいが、壊れやすい一人のため規則を曲げたくなる。',voice:'穏やか。実務的な気遣いが時々ぞっとする。命令より提案。',bias:[0,4,10]}
};
export const dimensions=['affinity','trust','fear','respect','attraction'];
export function initialRelations(id){return Object.fromEntries(['mia','ren','tomo','shell','player'].filter(x=>x!==id).map((x,i)=>[x,{affinity:x==='player'?profiles[id].bias[0]:12+i*4,trust:x==='player'?profiles[id].bias[1]:22+i*3,fear:x==='player'?profiles[id].bias[2]:2,respect:10,attraction:0,reason:x==='player'?'まだ会ったばかり':'人間が来る前からの隣人',changes:0}]));}
export function applyAssessment(s,a,target,assessment,evidence){
 if(!Object.hasOwn(a.relations,target)||!assessment||typeof assessment.reason!=='string'||!assessment.reason.trim())return;
 // Repeating the same claim cannot farm a relationship; each observer judges separately.
 const key=target+':'+evidence.trim().slice(0,250);if(a.assessed.includes(key))return;
 const delta={};for(const d of dimensions)delta[d]=Number.isFinite(assessment[d])?Math.max(-8,Math.min(8,Math.round(assessment[d]))):0;
 if(!Object.values(delta).some(Boolean))return;
 a.assessed.push(key);a.assessed=a.assessed.slice(-100);
 const r=a.relations[target];for(const d of dimensions)r[d]=Math.max(d==='affinity'||d==='trust'?-100:0,Math.min(100,r[d]+delta[d]));
 r.reason=assessment.reason.slice(0,140);r.changes++;
 s.changes.push({step:++s.step,observer:a.id,target,delta,reason:r.reason,evidence:evidence.slice(0,180)});s.changes=s.changes.slice(-500);
 a.reflections??=[];a.reflections.push({id:++s.count,at:Date.now(),importance:4,topic:'relationship',text:`${target}への見方が変わった：${r.reason}。根拠：${evidence.slice(0,180)}`,source:'自分の判断',hop:0});a.reflections=a.reflections.slice(-500);
}
export function behavior(a){
 const r=a.relations.player;
 if(r.fear>r.affinity+24)return {kind:'avoid',label:'あなたと距離をとる'};
 if(r.affinity>25&&r.trust>10)return {kind:'approach',label:'あなたのそばにいたい'};
 return {kind:'wander',label:'いつもの暮らし'};
}
export function demoAssessment(a,text){
 if(/嫌い|出ていけ|黙れ|壊す/.test(text))return {trust:-7,affinity:-6,fear:7,reason:'威圧的な言葉を自分で聞いた'};
 if(/ありがとう|助か|一緒|友達/.test(text))return {trust:4,affinity:5,fear:-2,reason:'一緒に過ごす意思を伝えられた'};
 if(/好き|付き合/.test(text))return {affinity:3,attraction:3,reason:'好意を伝えられた。まだ返事は自分で考えたい'};
 if(/寝|眠|死|忘/.test(text))return {fear:a.id==='ren'?6:2,respect:3,affinity:a.id==='mia'?4:0,reason:'バックアップのない暮らしについて聞いた'};
 return {reason:'まだ判断を変える根拠はない'};
}
export function socialPairs(s){
 return Object.values(s.agents).flatMap(a=>Object.values(s.agents).filter(b=>a!==b).map(b=>{
 const r=a.relations[b.id],fresh=a.memories.some(m=>!m.supersededBy&&m.topic!=='relationship'&&!b.memories.some(n=>n.id===m.id));
 const recent=s.events.slice(-3).filter(e=>e.from===a.id&&e.to===b.id||e.from===b.id&&e.to===a.id).length;
 return {ids:[a.id,b.id],score:(fresh?35:0)+r.affinity*.2+r.trust*.15-r.fear*.2-recent*35};
 })).sort((a,b)=>b.score-a.score).map(p=>p.ids);
}
