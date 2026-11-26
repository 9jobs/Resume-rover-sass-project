import {buildResumeHtmlDocument} from '../adapters/resume-format.js';
import {auditResumeContent} from '../features/resume-integrity.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyResumeAutofill} from '../public/resume-workflow.js';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {createDefaultWorkingResume} from '../engine/lib/ai-resume.js';
for(const [name,path] of [['old.docx','page-target-verification/exports/Arial-2.docx'],['old.pdf','page-target-verification/exports/Arial-2-browser.pdf']])test(name+' autofills contact, experience, education, projects and skills without replacing JD context',async()=>{
 const result=await createResumeWorkflow({}).importResume({file:{name,data:fs.readFileSync(path).toString('base64')}}),current=createDefaultWorkingResume();current.targetRole='Target job title';
 const meta={title:'My targeted application',jd:'Exact pasted JD stays here.',company:'Target company',jobId:'saved-job',experienceLevel:'Experienced'},original=JSON.stringify(result.resume);
 const filled=applyResumeAutofill(current,result.resume,meta,name);
 assert(filled.resume.profile.fullName);assert(filled.resume.profile.email);assert.equal(filled.counts.experience,3);assert.equal(filled.counts.projects,1);assert.equal(filled.counts.education,1);assert.equal(filled.counts.skills,8);assert.equal(filled.resume.targetRole,current.targetRole);assert.deepEqual(filled.meta,meta);assert(auditResumeContent(filled.resume,buildResumeHtmlDocument(filled.resume)).complete);assert.equal(JSON.stringify(result.resume),original);
});
test('autofill creates a title when empty and leaves unavailable details empty',()=>{const current=createDefaultWorkingResume(),imported=createDefaultWorkingResume();imported.profile.fullName='Jordan Example';const meta={title:'',jd:'Teaching role',company:'Example school'};const filled=applyResumeAutofill(current,imported,meta,'old_resume.docx');assert.equal(filled.meta.title,'old resume · tailored resume');assert.equal(filled.counts.experience,0);assert.equal(filled.counts.projects,0);assert.equal(filled.resume.profile.email,'');assert.equal(meta.title,'')});
