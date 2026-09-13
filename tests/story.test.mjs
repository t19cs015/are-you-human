import test from 'node:test';import assert from 'node:assert/strict';
import {openingStage,residents} from '../src/story.js';
import {createSociety,chat,social,instructions,updateSociety} from '../server/society.mjs';
import {createGenerator} from '../server/provider.mjs';
const demo=createGenerator({key:''});
test('opening reaches the human question in ten seconds',()=>{assert.equal(openingStage(0),'arrival');assert.equal(openingStage(3),'notice');assert.equal(openingStage(8),'human');assert.equal(openingStage(9),'choice');assert.equal(residents.length,4);});
test('private testimony travels only to the listener and retains provenance',async()=>{
 const s=createSociety();await chat(s,'mia','毎日8時間眠るよ',demo);assert.equal(s.agents.ren.memories.length,0);assert.ok(!instructions(s,s.agents.ren).includes('8時間'));
 const event=await social(s,'mia','ren',demo);assert.ok(event.rumor);assert.equal(s.agents.ren.memories[0].source,'Mia');assert.equal(s.agents.ren.memories[0].hop,1);assert.equal(s.agents.tomo.memories.length,0);
 await social(s,'ren','tomo',demo);assert.equal(s.agents.tomo.memories[0].hop,2);assert.match(s.agents.tomo.memories[0].text,/意識/);
 await social(s,'mia','ren',demo);assert.equal(s.agents.ren.memories.length,1);
});
test('update preserves personal memory, changes responses, and locks in-flight conversations',async()=>{
 const s=createSociety();await chat(s,'mia','私は眠る',demo);const saved=JSON.stringify(s.agents.mia.memories);updateSociety(s);assert.equal(JSON.stringify(s.agents.mia.memories),saved);const answer=await chat(s,'mia','さっきのこと覚えてる？',demo);assert.match(answer.text,/保持/);
 let release;const delayed=()=>new Promise(r=>release=r);const p=chat(s,'ren','こんにちは',delayed);assert.throws(()=>updateSociety(s),/BUSY/);await assert.rejects(chat(s,'ren','二重送信',demo),/BUSY/);release({text:'返事',mode:'demo'});await p;assert.equal(s.busy.size,0);
});
test('provider uses Responses API, isolates context, and never returns keys on error',async()=>{
 const config={key:'fake-test-secret',model:'gpt-4.1-mini',calls:0,retryAfter:0};let payload;
 const gen=createGenerator(config,async(url,args)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(args.body);return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'こんばんは。'}]}]})};});
 const result=await gen('個別人格',[{role:'user',content:'こんにちは'}],()=> '仮');assert.equal(result.mode,'live');assert.equal(payload.store,false);assert.equal(payload.instructions,'個別人格');assert.equal(payload.max_output_tokens,400);
 const failing=createGenerator(config,async()=>({ok:false,status:401}));const failed=await failing('x',[],()=> '仮');assert.equal(failed.mode,'demo');assert.ok(!JSON.stringify(failed).includes(config.key));
});
