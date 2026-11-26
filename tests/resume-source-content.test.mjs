import test from 'node:test';
import assert from 'node:assert/strict';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {recoverImportedSkills} from '../public/resume-workflow.js';
import {rawText,summary,roles} from '../ats-simple-verification/source-content-fixture.mjs';
import {analyseOptimizer} from '../features/resume-optimizer.mjs';
test('fresh import restores the entire uploaded summary and every original bullet across repeated role titles',async()=>{
 const parsed=await createResumeWorkflow({}).importResume({rawText}),r=recoverImportedSkills(parsed.resume,{restoreSource:true});
 assert.equal(r.sections.find(s=>s.type==='summary').content.text,summary);
 const entries=r.sections.find(s=>s.type==='experience').content.entries;assert.equal(entries.length,roles.length);
 for(let i=0;i<roles.length;i++){assert.equal(entries[i].organization,roles[i].organization);assert.equal(entries[i].dateRange,roles[i].dateRange);assert.deepEqual(entries[i].bullets,roles[i].bullets)}
 assert(!r.sections.find(s=>s.type==='skills').content.categories.flatMap(c=>c.items).includes('Git'));
 r.documentSettings.resumeLength=2;r.documentSettings.designId='classic-ruled';const checked=analyseOptimizer(r);assert(checked.fit);assert(checked.integrity.complete);
});
test('opening an edited saved resume does not restore old source over current edits',async()=>{const parsed=await createResumeWorkflow({}).importResume({rawText}),r=recoverImportedSkills(parsed.resume,{restoreSource:true});r.sections.find(s=>s.type==='summary').content.text='My reviewed current summary.';assert.equal(recoverImportedSkills(r).sections.find(s=>s.type==='summary').content.text,'My reviewed current summary.')});
