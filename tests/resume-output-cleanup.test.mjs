import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {recoverImportedSkills} from '../public/resume-workflow.js';
import {buildResumeHtmlDocument,buildDocxFromCanonical,getPaginatedDocumentModel} from '../adapters/resume-format.js';
import {RESUME_DESIGNS} from '../adapters/resume-designs.js';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
import {auditResumeContent,auditResumeText} from '../features/resume-integrity.mjs';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';
export function cleanupFixture(){const r=fictionalResume('fresher');r.profile.location='Professional Summary';r.documentSettings.resumeLength=1;r.documentSettings.designId='classic-ruled';r.sections.push({id:'source-recovery',type:'custom',title:'IMPORTED SOURCE RECOVERY',visible:true,order:99,content:{paragraphs:['Internal import recovery copy.']}});return r}
test('working copy hides import diagnostics and removes only the mistaken header location',()=>{
 const source=cleanupFixture(),before=JSON.stringify(source),r=recoverImportedSkills(source),html=buildResumeHtmlDocument(r);
 assert.equal(JSON.stringify(source),before);assert.equal(r.profile.location,'');
 assert.equal(r.sections.find(s=>s.id==='source-recovery').visible,false);
 assert.deepEqual(r.sections.find(s=>s.id==='source-recovery').content,source.sections.find(s=>s.id==='source-recovery').content);
 assert(!html.includes('IMPORTED SOURCE RECOVERY'));assert(html.includes('PROFESSIONAL SUMMARY'));assert(auditResumeContent(r,html).complete);
 source.profile.location='Melbourne, VIC';assert.equal(recoverImportedSkills(source).profile.location,'Melbourne, VIC');
});
test('every new format keeps education facts together and exports right-aligned dates when there is room',async()=>{
 for(const design of RESUME_DESIGNS){const r=recoverImportedSkills(cleanupFixture());r.documentSettings.designId=design.id;
 const m=getPaginatedDocumentModel(r),row=m.pages.flat().find(b=>b.educationRow),education=r.sections.find(s=>s.type==='education').content.entries[0];
 assert(row,design.id);assert(row.text.includes(education.title));assert(row.text.includes(education.organization));assert.equal(row.dateText,education.dateRange);
 if(design.family!=='sidebar')assert(row.inlineDate,design.id);
 const html=buildResumeHtmlDocument(r);assert(auditResumeContent(r,html).complete,design.id);
 const bytes=new Uint8Array(await buildDocxFromCanonical(r).arrayBuffer()),parsed=validateDocxBytes(bytes);assert(parsed.ok);assert(auditResumeText(r,parsed.text).complete,design.id);
 const xml=new TextDecoder().decode(unzipSync(bytes)['word/document.xml']);assert(!xml.includes('IMPORTED SOURCE RECOVERY'));if(row.inlineDate)assert(xml.includes('<w:tab w:val="right"'));
 }
});
test('categorized skill recovery retains visible categories and the designed renderer bolds only their labels',async()=>{
 const r=cleanupFixture(),skills=r.sections.find(s=>s.type==='skills');skills.layout='categorized';skills.content.items=[];skills.content.categories=[{name:'Tools',items:['React','Git','Python']}];
 const recovered=recoverImportedSkills(r);assert.deepEqual(recovered.sections.find(s=>s.type==='skills').content.categories,skills.content.categories);
 const m=getPaginatedDocumentModel(recovered),group=m.pages.flat().find(b=>b.skillLabel==='Tools:');assert.equal(group.type,'paragraph');assert.equal(group.skillValue,'React, Git, Python');assert(auditResumeContent(recovered,buildResumeHtmlDocument(recovered)).complete);
 const xml=new TextDecoder().decode(unzipSync(new Uint8Array(await buildDocxFromCanonical(recovered).arrayBuffer()))['word/document.xml']);assert(xml.includes('Tools: '));assert(xml.includes('React, Git, Python'));
});
test('single-column experience keeps role and company together with right-aligned dates',()=>{
 const r=cleanupFixture(),section=r.sections.find(s=>s.type==='experience');section.content.entries=[{id:'role',title:'Construction Laborer',organization:'Fictional Construction',dateRange:'2024 - 2025',bullets:['Supported site activities while following documented safety procedures and project plans.']}];
 const m=getPaginatedDocumentModel(recoverImportedSkills(r)),row=m.pages.flat().find(b=>b.entryRow);assert.equal(row.text,'Construction Laborer | Fictional Construction');assert.equal(row.dateText,'2024 - 2025');assert(row.inlineDate);
});
