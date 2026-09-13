import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety,chat,social,witnessAction,publicState} from '../server/society.mjs';
import {applyAssessment} from '../server/relationships.mjs';
import {createGenerator} from '../server/provider.mjs';
const demo=createGenerator({key:''});
test('directional opinions change independently and repeating testimony cannot farm affinity',async()=>{
 const s=createSociety();const initial=s.agents.mia.relations.player.affinity;
 await chat(s,'mia','ありがとう、一緒にいよう',demo);assert.ok(s.agents.mia.relations.player.affinity>initial);
 const after=s.agents.mia.relations.player.affinity;await chat(s,'mia','ありがとう、一緒にいよう',demo);assert.equal(s.agents.mia.relations.player.affinity,after);
 assert.equal(s.agents.ren.relations.player.changes,0);
 applyAssessment(s,s.agents.mia,'ren',{affinity:900,fear:NaN,reason:'相談を聞いた'},'specific');assert.equal(s.agents.mia.relations.ren.affinity,publicState(s).agents[0].initial.ren.affinity+8);assert.equal(s.agents.ren.relations.mia.changes,0);
});
test('rest is witnessed locally, spreads by conversation and wake requires rest',async()=>{
 const s=createSociety();assert.throws(()=>witnessAction(s,'wake',['mia']),/INVALID_ACTION/);
 witnessAction(s,'rest',['mia']);assert.equal(s.agents.ren.memories.length,0);assert.match(s.agents.mia.memories[0].text,/目の前/);
 await social(s,'mia','ren',demo);assert.equal(s.agents.ren.memories[0].hop,1);
 witnessAction(s,'wake',['tomo']);assert.equal(s.agents.tomo.memories[0].source,'自分で目撃');assert.throws(()=>witnessAction(s,'rest',['__proto__']),/INVALID_ACTION/);
});
test('structured live assessment and GPT-5.5 configuration',async()=>{
 let payload;const zero={affinity:0,trust:0,fear:0,respect:0,attraction:0,reason:'まだ判断しない'};
 const gen=createGenerator({key:'test',model:'gpt-5.5',calls:0,retryAfter:0},async(_,args)=>{payload=JSON.parse(args.body);return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'その約束、覚えておく。',assessment:{...zero,trust:5,reason:'約束してくれた'},aboutHuman:zero})}]}]})};});
 const s=createSociety();await chat(s,'ren','明日も来るよ',gen);assert.equal(s.agents.ren.relations.player.trust,3);assert.equal(payload.model,'gpt-5.5');assert.equal(payload.reasoning.effort,'none');assert.equal(payload.text.format.strict,true);
});

test('greeting continues history without fabricating testimony or farming relationships',async()=>{
 const {greet}=await import('../server/society.mjs');const s=createSociety();let calls=0;
 const generate=async()=>({text:`声かけ${++calls}`,mode:'live'});
 const first=await greet(s,'mia',generate,100000);assert.equal(first.resume,false);assert.equal(s.agents.mia.memories.length,0);assert.equal(s.changes.length,0);
 const resume=await greet(s,'mia',generate,101000);assert.equal(resume.resume,true);assert.equal(calls,1);assert.equal(resume.transcript[0].text,'声かけ1');
 const later=await greet(s,'mia',generate,170000);assert.equal(later.text,'声かけ2');assert.equal(later.transcript.length,2);assert.equal(s.agents.mia.chats,0);
});

test('daily work is local memory, validates tasks and does not duplicate records',async()=>{
 const {recordActivity}=await import('../server/society.mjs');const s=createSociety();
 recordActivity(s,'mia',0);recordActivity(s,'mia',0);assert.equal(s.agents.mia.memories.length,1);assert.equal(s.agents.ren.memories.length,0);assert.match(s.agents.mia.activity,/ポスター/);
 assert.throws(()=>recordActivity(s,'mia',99),/INVALID_ACTION/);assert.throws(()=>recordActivity(s,'__proto__',0),/INVALID_ACTION/);
 s.busy.add('mia');assert.throws(()=>recordActivity(s,'mia',1),/BUSY/);
});
