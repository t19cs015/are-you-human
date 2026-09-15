import test from 'node:test';
import assert from 'node:assert/strict';
import {createSociety} from '../server/society.mjs';
import {startCommunity,tickCity} from '../server/city.mjs';
import {initializeMemoryGame,editMemoryGame,talkMemoryGame} from '../server/memory-game.mjs';
import {createGenerator} from '../server/provider.mjs';
import {memoryGuide,guideDirection} from '../src/memory-guide.js';
import {translateText} from '../src/locales.js';
import {memoryGameSpeech} from '../server/speech.mjs';

function game(){
 const s=createSociety();let now=1000;startCommunity(s,now);initializeMemoryGame(s);
 return {s,get m(){return s.city.memoryGame;},guide:()=>memoryGuide(s.city),
  tick(seconds){for(let i=0;i<seconds;i++)tickCity(s,s.city.positions,[],now+=1000);},
  talk(generate=createGenerator({key:''})){return talkMemoryGame(s,{id:'tomo',revision:s.city.memoryGame.revision,position:s.city.positions.tomo},generate);},
  equip(id){editMemoryGame(s,{action:'equip',equipped:[id],revision:s.city.memoryGame.revision});}};
}

test('the opening guide follows the actual promise, edit, arrival, consent and delivered memory',async()=>{
 const g=game(),guides=[],check=id=>{const guide=g.guide();guides.push(guide);assert.equal(guide.id,id);};
 check('hello');await g.talk();check('promise');g.tick(10);check('sync');g.tick(5);check('forgotten');await g.talk();check('equip-promise');
 g.equip('promise');check('invite');await g.talk();check('follow');g.tick(3);check('follow');
 g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(1);check('equip-together');
 g.equip('together');check('ask-keep');await g.talk();check('keep-wait');
 assert.equal(g.m.reunionHeard,undefined);g.tick(19);check('remembered');
 const reply=await g.talk(()=>{throw new Error('The grounded closing greeting needs no model request');});
 assert.equal(reply.mode,'authored');assert.equal(g.m.reunionHeard,true);check('kept');
 assert.equal(g.m.events.at(-1).kind,'remembered');
 const second=await g.talk();assert.notEqual(second.mode,'authored','normal memory-driven dialogue resumes');
 for(const guide of guides)for(const value of [guide.title,guide.detail])assert.doesNotMatch(translateText(value,'en'),/[ぁ-んァ-ヶ一-龠]/);
});

test('a resident declining an invitation or sharing never completes the guide',async()=>{
 const g=game();await g.talk();g.tick(15);await g.talk();g.equip('promise');let call=0;
 const decline=async()=>++call%2?{mode:'live',data:{text:'Will you join me?',used:['promise']}}:{mode:'live',data:{text:'I need to work for now.',action:'work',place:'none',reason:'I have a task'}};
 await g.talk(decline);assert.equal(g.m.meeting,false);assert.equal(g.guide().part,2);assert.equal(g.m.shared.length,0);assert.equal(g.m.reunionHeard,undefined);
 await g.talk();g.s.city.positions.tomo={...g.s.city.tasks.tomo.target};g.tick(1);g.equip('together');
 let sharing=0;await g.talk(async()=>++sharing%2?{mode:'live',data:{text:'Can we keep this?',used:['together']}}:{mode:'live',data:{text:'Let me listen first.',action:'listen',place:'none',reason:'Still deciding'}});
 g.tick(25);assert.equal(g.guide().part,3);assert.equal(g.m.preserved.length,0);assert.equal(g.m.reunionHeard,undefined);
});

test('written memories can be tried freely and paused synchronization has a recovery direction',async()=>{
 const g=game();await g.talk();g.tick(15);await g.talk();
 editMemoryGame(g.s,{action:'rewrite',id:'blank',text:'I want to watch the lights with Tomo.',revision:g.m.revision});g.equip('blank');
 assert.equal(g.guide().id,'invite');assert.equal(g.guide().block,'blank');
 g.m.nextSync=g.s.city.clock+12;g.s.city.infrastructure.modelEnabled=false;
 assert.equal(g.guide().id,'paused');assert.equal(g.guide().target.id,'central');
 g.s.city.infrastructure.modelEnabled=true;assert.equal(g.guide().id,'invite');
});

test('guidance is derived on resume and a compass points relative to the actual view',()=>{
 const g=game();g.m.meeting=true;g.m.stage='together';g.m.shared=['tomo'];g.m.preserved=['tomo'];
 assert.equal(g.guide().id,'remembered','older saves do not need new progress flags');
 g.m.reunionHeard=true;assert.equal(g.guide().id,'kept');
 const p={x:0,z:0};assert.equal(guideDirection(p,0,{x:0,z:-10}).angle,0);
 assert.equal(guideDirection(p,0,{x:10,z:0}).angle,Math.PI/2);
 assert.equal(guideDirection(p,-Math.PI/2,{x:10,z:0}).angle,0);
 assert.equal(guideDirection(p,0,{x:3,z:4}).distance,5);
 assert.ok(Number.isFinite(guideDirection(p,0,p).angle));assert.equal(memoryGuide({}),null);
});

test('the English opening plays a prepared voice even without an API connection',async()=>{
 const g=game(),event=g.m.events[0];
 const result=await memoryGameSpeech({world:g.s,language:'en',config:{key:''}},event.id,()=>{throw new Error('The authored opening must not wait for live speech generation');});
 assert.equal(result.mode,'generated');assert.match(result.url,/^\/assets\/memory\/en_opening_arrival_[a-f0-9]+\.mp3$/);
});
