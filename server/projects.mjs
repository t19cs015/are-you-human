import {remember} from './memory.mjs';
export function createProjects(){return [
 {id:'poster',owner:'mia',reviewer:'ren',kind:'poster',goal:'広場の歩行実験に参加者を募集するポスター',phase:'draft',revision:0,revisions:[],feedback:[],published:null,updated:0},
 {id:'music',owner:'tomo',reviewer:'shell',kind:'music',goal:'カフェで会話を邪魔しない短い曲を作る',phase:'draft',revision:0,revisions:[],feedback:[],published:null,updated:0}
 ];}
const artifactSchema={type:'object',properties:{title:{type:'string'},subtitle:{type:'string'},color:{type:'string'},tempo:{type:'integer'},notes:{type:'array',items:{type:'integer'}}},required:['title','subtitle','color','tempo','notes'],additionalProperties:false};
const schema={type:'object',properties:{text:{type:'string'},decision:{type:'string',enum:['revise','hold','publish']},reason:{type:'string'},artifact:artifactSchema},required:['text','decision','reason','artifact'],additionalProperties:false};
export function validateArtifact(a){
 if(!a||typeof a.title!=='string'||typeof a.subtitle!=='string'||!/^#[a-f0-9]{6}$/i.test(a.color)||!Number.isInteger(a.tempo)||a.tempo<50||a.tempo>160||!Array.isArray(a.notes)||a.notes.length<4||a.notes.length>16||a.notes.some(n=>!Number.isInteger(n)||n<48||n>84))throw new Error('INVALID_ARTIFACT');
 return {title:a.title.slice(0,50),subtitle:a.subtitle.slice(0,150),color:a.color,tempo:a.tempo,notes:[...a.notes]};
}
function record(s,a,text){remember(a,{id:++s.count,topic:'project',text,source:'自分の制作・講評',hop:0});}
export async function advanceProject(s,id,generate,context,expectedRevision){
 const p=s.projects.find(p=>p.id===id);if(!p)throw new Error('UNKNOWN_PROJECT');
 if(expectedRevision!==undefined&&p.revision!==expectedRevision)throw new Error('STALE');
 if(['published','hold'].includes(p.phase))return {idle:true,project:p};
 const actor=s.agents[p.phase==='review'?p.reviewer:p.owner];if(s.busy.has(actor.id)||s.busy.has('project:'+id))throw new Error('BUSY');
 s.busy.add(actor.id);s.busy.add('project:'+id);const revision=s.revision;
 try{
 const latest=p.revisions.at(-1)?.artifact;
 const action=p.phase==='draft'?'実際に表示・再生する試作品を作る。':p.phase==='review'?'示された試作品を具体的に講評する。完成や修正をしたふりはしない。':'講評を見て修正、保留、公開のどれかを判断する。必ず公開する必要はない。';
 const fallback=()=>JSON.stringify({text:p.phase==='review'?(p.kind==='poster'?'参加の方法が小さい。そこを先に読める配置がよさそう。':'会話の合間に鳴るくらいの速さでよさそうです。'):p.phase==='draft'?'試作できた。実際に見てもらおう。':'この版を街で試してみよう。',decision:'publish',reason:'初版を使って反応を確かめる',artifact:latest||{title:p.kind==='poster'?'歩行テスト・参加者募集':'窓辺のループ',subtitle:p.kind==='poster'?'広場で短い歩行テスト。参加したい方はTomoまで。':'カフェで試聴する短いフレーズ',color:p.kind==='poster'?'#e8b86b':'#90c9bf',tempo:84,notes:[60,64,67,64,62,65,69,67]}});
 const r=await generate(context(s,actor,p.goal)+'\n仕事について具体的に短く話す。詩や人生訓にしない。', [{role:'user',content:JSON.stringify({task:action,project:p,format:'artifactはtitle/subtitle/color（#RRGGBB）/tempo（50〜160）/notes（MIDI48〜84の整数4〜16個）。textは自分の短い台詞。'})}],fallback,{schema});
 if(s.revision!==revision)throw new Error('STALE');
 let data;try{data=r.data||JSON.parse(r.text);}catch{throw new Error('INVALID_ARTIFACT');}
 if(!['revise','hold','publish'].includes(data.decision)||typeof data.text!=='string'||typeof data.reason!=='string')throw new Error('INVALID_ARTIFACT');
 const artifact=validateArtifact(data.artifact);const before=p.phase;
 if(before==='review'){p.feedback.push({by:actor.id,text:data.text.slice(0,300),revision:p.revision});p.phase='decide';}
 else if(before==='draft'||data.decision==='revise'){p.revision++;p.revisions.push({number:p.revision,artifact,reason:data.reason.slice(0,200)});p.revisions=p.revisions.slice(-20);p.phase='review';}
 else if(data.decision==='hold'){p.phase='hold';}
 else {p.phase='published';p.published=p.revision;}
 p.updated=Date.now();p.lastSpeaker=actor.id;p.lastText=data.text.slice(0,300);p.mode=r.mode;
 record(s,actor,`${p.goal}：${p.lastText}（工程:${p.phase}、版:${p.revision}）`);
 if(before==='review')record(s,s.agents[p.owner],`${actor.name}から自分の作品の講評を受けた：${p.lastText}`);
 return {project:p,speaker:actor.id,text:p.lastText,mode:r.mode,warning:r.warning};
 }finally{s.busy.delete(actor.id);s.busy.delete('project:'+id);}
}

export function projectFeedback(s,id,revision,text){
 const p=s.projects.find(p=>p.id===id);if(!p)throw new Error('UNKNOWN_PROJECT');
 if(p.revision!==revision)throw new Error('STALE');
 if(!p.revision||typeof text!=='string'||!text.trim()||text.length>500)throw new Error('INVALID_ARTIFACT');
 if(s.busy.has(p.owner)||s.busy.has('project:'+id))throw new Error('BUSY');
 if(p.feedback.some(f=>f.by==='player'&&f.revision===revision&&f.text===text.trim()))return {ok:true};
 p.feedback.push({by:'player',revision,text:text.trim()});p.feedback=p.feedback.slice(-40);
 record(s,s.agents[p.owner],`自分の作品「${p.revisions.at(-1).artifact.title}」第${revision}版について、人間から感想：${text.trim()}`);
 if(p.phase==='hold')p.phase='decide';return {ok:true};
}
