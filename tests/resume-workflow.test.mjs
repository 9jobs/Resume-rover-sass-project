import {buildResumeHtmlDocument} from '../adapters/resume-format.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStore} from '../store.mjs';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {createDefaultWorkingResume,canonicalToPlainText,analyzeResume} from '../engine/lib/ai-resume.js';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';
const store=createStore(':memory:'),workflow=createResumeWorkflow(store);
const a=store.signup({email:'avery@workflow.test',name:'Avery Fictional',password:'FictionalTest!2026'});
const b=store.signup({email:'riley@workflow.test',name:'Riley Fictional',password:'FictionalTest!2026'});
const resume=createDefaultWorkingResume();
resume.profile={...resume.profile,fullName:'Avery Fictional',email:'avery@example.test',location:'Portland'};
resume.targetRole='Frontend Developer';
resume.sections.find(s=>s.type==='summary').content.text='Frontend developer building accessible React interfaces.';
resume.sections.find(s=>s.type==='skills').content.items=['React','JavaScript','CSS','Accessibility'];
resume.sections.find(s=>s.type==='experience').content.entries=[{id:'one',title:'Frontend Developer',organization:'Fictional Studio',dateRange:'2023 – Present',location:'Portland',bullets:['Built a responsive project website using React.','Documented keyboard interactions for accessible forms.']}];
resume.sections.find(s=>s.type==='education').content.entries=[{id:'education',title:'Bachelor of Design',organization:'Example College',dateRange:'2023',bullets:[]}];
const job=store.write(a,'job',{company:'Fictional Product Studio',role:'Frontend Developer',jd:'React accessibility keyboard forms',stage:'Preparing'});
let first,second,pdf,docx;
test('new resume versions preserve canonical source and job stage',()=>{
 first=workflow.save(a,{resume,title:'Avery v1',jobId:job.id});
 const next=structuredClone(resume);next.sections.find(s=>s.type==='summary').content.text='Frontend developer building accessible forms with React.';
 second=workflow.save(a,{resume:next,title:'Avery v2',parentId:first.id,jobId:job.id});
 assert.notEqual(first.id,second.id);
 assert.equal(store.record(a,first.id).data.canonical.sections.find(s=>s.type==='summary').content.text,resume.sections.find(s=>s.type==='summary').content.text);
 assert.equal(store.record(a,job.id).data.stage,'Preparing');
 assert.equal(store.record(a,job.id).data.docId,second.id);
 assert.equal(second.data.workflow.parentId,first.id);
});
test('cross-organisation source, parent, job and downloads remain inaccessible',async()=>{
 assert.throws(()=>workflow.save(b,{resume,title:'Wrong candidate',parentId:first.id}),/not found/);
 assert.throws(()=>workflow.save(b,{resume,title:'Wrong job',jobId:job.id}),/not found/);
 await assert.rejects(workflow.download(b,first.id,'docx'),/not found/);
 assert.equal(store.list(b,'document').length,0);
});
test('existing scores remain unchanged and preview uses the local export layout',()=>{
 const review=workflow.review({resume,jd:job.data.jd});
 assert.deepEqual(review.analysis,analyzeResume(resume,job.data.jd));
 assert.equal(review.html.replace(/<style data-resume-export-fonts>[\s\S]*?<\/style>/,''),buildResumeHtmlDocument(resume));
 assert(review.html.includes('data-resume-export-fonts'));
 for(const font of ['Arial','Times New Roman','Calibri'])assert(review.html.includes(`font-family:"${font}"`));
 assert.equal(review.pagination.fit,true);
 assert(review.analysis.breakdown.every(c=>Number.isFinite(c.points)));
});
test('suggestions preserve facts and require explicit caller application',()=>{
 const before=['Documented team processes.',' Built accessible React forms. '];
 const result=workflow.suggest({bullets:before,jd:'React forms accessibility'});
 assert.deepEqual(before,['Documented team processes.',' Built accessible React forms. ']);
 assert.equal(result.after[0],'Built accessible React forms.');
 assert.deepEqual(result.after.slice().sort(),before.map(t=>t.trim()).sort());
 const draft=workflow.draftBullet({action:'Built',task:'a project website',tools:'React',result:''});
 assert.equal(draft.text,'Built a project website using React.');
 assert(!/\d|percent|years/.test(draft.text));
 assert.throws(()=>workflow.draftBullet({action:'Invented',task:'anything'}),/Choose/);
});
test('real DOCX and PDF preserve the engine content and source layout',async()=>{
 docx=(await workflow.download(a,first.id,'docx')).bytes;
 pdf=(await workflow.download(a,first.id,'pdf')).bytes;
 assert(validateDocxBytes(docx).ok);
 assert(validateDocxBytes(docx).text.includes('Avery Fictional'));
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 fs.writeFileSync('workflow-verification/resume.docx',docx);
 fs.writeFileSync('workflow-verification/resume.pdf',pdf);
 fs.writeFileSync('workflow-verification/resume.html',buildResumeHtmlDocument(resume));
});
test('PDF/DOCX/TXT imports retain source text and stay local',async()=>{
 const fromDocx=await workflow.importResume({file:{name:'resume.docx',data:docx.toString('base64')}});
 assert(fromDocx.source.includes('Avery Fictional'));
 assert(fromDocx.resume.rawImport.rawText.includes('Fictional Studio'));
 const fromPdf=await workflow.importResume({file:{name:'resume.pdf',data:pdf.toString('base64')}});
 assert(fromPdf.source.includes('Avery Fictional'));
 const fromTxt=await workflow.importResume({rawText:'Riley Fictional\nriley@example.test\nSKILLS\nSQL, reporting\nPROJECTS\nDocumented a reporting project.'});
 assert(fromTxt.source.includes('SQL'));
 assert(canonicalToPlainText(fromTxt.resume).includes('Riley'));
 await assert.rejects(workflow.importResume({file:{name:'image.png',data:'aGVsbG8='}}),/Supported/);
});
test('document usage limits roll back atomically and earlier versions survive',()=>{
 workflow.save(a,{resume,title:'Avery v3'});
 assert.equal(store.list(a,'document').length,3);
 assert.throws(()=>workflow.save(a,{resume,title:'Over limit',jobId:job.id}),/allowance/);
 assert.equal(store.list(a,'document').length,3);
 assert.equal(store.record(a,job.id).data.docId,second.id);
 assert.equal(store.record(a,first.id).data.title,'Avery v1');
});

test('cover-letter emphasis must come from the selected resume and reaches generation context',async()=>{
 const {createCareerFeatures}=await import('../features/career.mjs');
 const captured=[];
 const gemini={status:()=>({configured:true,model:'offline-fixture'}),request:async(kind,data)=>{
  captured.push(data);
  return {paragraphs:[{text:'I am interested in discussing the frontend role.',evidence:[]},{text:'Thank you for considering my application.',evidence:[]}]};
 }};
 const career=createCareerFeatures(store,gemini);
 const result=await career.generateLetter(a,{resumeId:first.id,highlightRole:'Frontend Developer',highlightSkills:'React, Accessibility'});
 assert.equal(captured[0].HIGHLIGHT_ROLE,'Frontend Developer');
 assert.equal(captured[0].HIGHLIGHT_SKILLS,'React, Accessibility');
 assert.equal(result.data.highlightRole,'Frontend Developer');
 assert.equal(result.data.signature.name,'Avery Fictional');
 await assert.rejects(career.generateLetter(a,{resumeId:first.id,highlightSkills:'Kubernetes'}),/recorded/);
 await assert.rejects(career.generateLetter(a,{resumeId:first.id,highlightRole:'Chief Executive'}),/present/);
});
test('team candidates cannot save versions for or download another candidate',async()=>{
 store.plan(a,{plan:'Team'});
 const ca=store.member(a,{name:'Candidate A',email:'ca@wf.test',password:'FictionalTest!2026',role:'candidate'});
 const cb=store.member(a,{name:'Candidate B',email:'cb@wf.test',password:'FictionalTest!2026',role:'candidate'});
 const ua=store.login(ca.email,'FictionalTest!2026'),ub=store.login(cb.email,'FictionalTest!2026');
 const doc=workflow.save(ua,{title:'Candidate A resume',resume,owner:ua.id});
 assert.throws(()=>workflow.save(ub,{title:'Wrong candidate',resume,owner:ua.id}),/not found/);
 await assert.rejects(workflow.download(ub,doc.id,'txt'),/not found/);
});
