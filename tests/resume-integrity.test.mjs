import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {auditResumeContent} from '../features/resume-integrity.mjs';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
const store=createStore(':memory:'),workflow=createResumeWorkflow(store);
const user=store.signup({name:'Export Audit Fictional',email:'exports@audit.invalid',password:'FictionalAudit!2026'});
store.plan(user,{plan:'Pro'});
test('both existing formats preserve short fictional resumes in preview',()=>{
 for(const format of ['default','harshibar'])for(const kind of ['fresher','experienced','unicode']){
  const resume=fictionalResume(kind,format);
  assert(auditResumeContent(resume).complete);
 }
});
test('overlong Harshibar content is preserved and blocked by the readable page limit',async()=>{
 const resume=fictionalResume('overflow','harshibar');resume.sections.find(s=>s.type==='experience').content.entries.length=3;
 const review=workflow.review({resume});
 assert.equal(review.pagination.fit,false);
 assert.equal(review.integrity.complete,true);
 assert.equal(review.integrity.missing.length,0);
 const doc=workflow.save(user,{title:'Omitted bullets example',resume});
 for(const format of ['pdf','docx'])await assert.rejects(workflow.download(user,doc.id,format),error=>error.status===422);
 const txt=await workflow.download(user,doc.id,'txt');
 assert(txt.bytes.toString().includes('component 3-9'));
});
test('direct download API enforces page limits while TXT preserves overlong content',async()=>{
 const resume=fictionalResume('overflow','default'),doc=workflow.save(user,{title:'Overlong source',resume});
 assert.equal(workflow.review({resume}).pagination.fit,false);
 await assert.rejects(workflow.download(user,doc.id,'pdf'),e=>e.status===422);
 await assert.rejects(workflow.download(user,doc.id,'docx'),e=>e.status===422);
 assert((await workflow.download(user,doc.id,'txt')).bytes.toString().includes('component 10-9'));
});
test('PDF uses real printed page count within the selected two-page target',async()=>{
 const resume=fictionalResume('two-page','default'),doc=workflow.save(user,{title:'Two-page output',resume});
 const output=await workflow.download(user,doc.id,'pdf');
 assert.equal(output.pages,2);
 assert.equal(output.bytes.subarray(0,5).toString(),'%PDF-');
});
