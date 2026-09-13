import test from 'node:test';import assert from 'node:assert/strict';
import {createSociety,instructions} from '../server/society.mjs';
import {advanceProject,validateArtifact} from '../server/projects.mjs';
import {createGenerator} from '../server/provider.mjs';
const demo=createGenerator({key:''});
test('draft, actual critique and publish share one artifact revision and private memories',async()=>{
 const s=createSociety();await advanceProject(s,'poster',demo,instructions,0);const p=s.projects[0];assert.equal(p.phase,'review');assert.equal(p.revision,1);assert.equal(p.published,null);assert.equal(s.agents.tomo.memories.length,0);
 await advanceProject(s,'poster',demo,instructions,1);assert.equal(p.feedback.length,1);assert.equal(p.phase,'decide');const original=JSON.stringify(p.revisions[0]);await advanceProject(s,'poster',demo,instructions,1);assert.equal(p.published,1);assert.equal(JSON.stringify(p.revisions[0]),original);assert.equal((await advanceProject(s,'poster',demo,instructions,1)).idle,true);
});
test('invalid output and stale versions cannot mutate a project; hold is a valid outcome',async()=>{
 const s=createSociety();await assert.rejects(advanceProject(s,'poster',demo,instructions,8),/STALE/);
 await assert.rejects(advanceProject(s,'poster',async()=>({text:'bad',mode:'live'}),instructions,0),/INVALID_ARTIFACT/);assert.equal(s.projects[0].revision,0);assert.equal(s.busy.size,0);
 await advanceProject(s,'poster',demo,instructions,0);await advanceProject(s,'poster',demo,instructions,1);
 const artifact=s.projects[0].revisions[0].artifact;await advanceProject(s,'poster',async()=>({data:{text:'もう少し検証する。',decision:'hold',reason:'読みやすさが不十分',artifact},mode:'live'}),instructions,1);assert.equal(s.projects[0].phase,'hold');assert.equal(s.projects[0].published,null);
 assert.throws(()=>validateArtifact({...artifact,notes:[999]}),/INVALID_ARTIFACT/);
});

test('human feedback is revision-bound and remembered by the author only',async()=>{
 const {projectFeedback}=await import('../server/projects.mjs');const s=createSociety();await advanceProject(s,'poster',demo,instructions,0);
 projectFeedback(s,'poster',1,'文字をもっと大きくして');assert.ok(s.agents.mia.memories.some(m=>m.text.includes('文字をもっと大きくして')));assert.equal(s.agents.ren.memories.length,0);
 assert.throws(()=>projectFeedback(s,'poster',0,'古い案への感想'),/STALE/);
});
