import test from 'node:test';import assert from 'node:assert/strict';
import {structureSourceProjects,recoverImportedSkills} from '../public/resume-workflow.js';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
import {buildResumeHtmlDocument,buildDocxFromCanonical,getPaginatedDocumentModel} from '../adapters/resume-format.js';
import {auditResumeContent,auditResumeText} from '../features/resume-integrity.mjs';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';
const lines=['Predictive Maintenance Platform','Technologies: Python, Databricks','- Designed a pipeline to validate records across','multiple verified source systems.','- Documented the data quality checks and results.','Knowledge Assistant','Technologies : Azure OpenAI, RAG','- Built a search workflow using existing knowledge records.'];
test('trailing Skills list is removed from a project while the original Skills and other sections stay unchanged',()=>{
 const r=fictionalResume('fresher');r.sections.find(s=>s.type==='skills').content={items:['SQL','Git','Debugging'],categories:[]};
 const projects=r.sections.find(s=>s.type==='projects');projects.content={entries:[{id:'game',title:'Spacewar',bullets:['Designed reusable components for game objects. Skill Python, SQL, Git, Debugging, Pygame','Used debugging skills in Python to test collision detection.']}]};
 const original=structuredClone(r),next=recoverImportedSkills(r);
 assert.deepEqual(next.sections.find(s=>s.type==='projects').content.entries[0].bullets,['Designed reusable components for game objects.','Used debugging skills in Python to test collision detection.']);
 assert.deepEqual(r,original);
 for(const section of original.sections.filter(s=>s.type!=='projects'))assert.deepEqual(next.sections.find(s=>s.id===section.id),section);
});
test('a project technology list without a matching Skills heading or supporting Skills section stays intact',()=>{
 const r=fictionalResume('fresher');r.sections.find(s=>s.type==='projects').content={entries:[{id:'p',bullets:['Built the service. Skills Python, Docker, Kubernetes','Technologies: Python, SQL, Git']}]};
 assert.deepEqual(recoverImportedSkills(r).sections.find(s=>s.type==='projects'),r.sections.find(s=>s.type==='projects'));
});
test('collapsed dated projects recover separate headings and bullets without changing other sections',async()=>{
 const text='Cafe Website | Nov 2025 - Mar 2026 - Developed a menu website with booking functionality. - Designed a table reservation workflow. Spacewar - Real-Time Combat | Feb 2025 - March 2026 - Developed a two-player game using Python. - Designed reusable game objects.';
 const r=fictionalResume('fresher');r.documentSettings.designId='sage-left';
 const project=r.sections.find(s=>s.type==='projects');project.content={entries:[],paragraphs:[text],bullets:[]};
 const next=recoverImportedSkills(r),parsed=next.sections.find(s=>s.type==='projects').content.entries;
 assert.equal(parsed.length,2);assert.equal(parsed[0].dateRange,'Nov 2025 - Mar 2026');assert.equal(parsed[1].title,'Spacewar - Real-Time Combat');
 assert.deepEqual(parsed.map(p=>p.bullets.length),[2,2]);
 for(const section of r.sections.filter(s=>s.type!=='projects'))assert.deepEqual(next.sections.find(s=>s.id===section.id),section);
 const html=buildResumeHtmlDocument(next),model=getPaginatedDocumentModel(next);
 for(const entry of parsed)for(const bullet of entry.bullets)assert(model.pages.flat().some(b=>b.type==='bullet'&&b.text===bullet));
 assert(html.includes('Cafe Website'));assert(auditResumeContent(next,html).complete);
 const doc=validateDocxBytes(new Uint8Array(await buildDocxFromCanonical(next).arrayBuffer()));assert(doc.ok);assert(auditResumeText(next,doc.text).complete);
});
test('project titles, technologies and wrapped bullets become separate source-preserving entries',()=>{const projects=structureSourceProjects(lines);assert.equal(projects.length,2);assert.equal(projects[0].title,lines[0]);assert.equal(projects[0].subtitle,lines[1]);assert.deepEqual(projects[0].bullets,['Designed a pipeline to validate records across multiple verified source systems.','Documented the data quality checks and results.']);assert.equal(projects[1].bullets.length,1);assert.equal(structureSourceProjects(['Unstructured source without a reliable project boundary.']),null)});
test('old paragraph repair uses current edits and leaves unrelated fields unchanged',()=>{const r=fictionalResume('fresher'),section=r.sections.find(s=>s.type==='projects');section.content={entries:[],paragraphs:[lines.join('\n')],bullets:[]};r.rawImport={rawText:'Old source text that must not replace the current edited project.'};const original=JSON.stringify(r),next=recoverImportedSkills(r);assert.equal(JSON.stringify(r),original);assert.deepEqual(next.profile,r.profile);assert.equal(next.sections.find(s=>s.type==='summary').content.text,r.sections.find(s=>s.type==='summary').content.text);assert.equal(next.sections.find(s=>s.type==='projects').content.entries.length,2)});
test('preview and Word keep bold project titles, separate technology labels and individual selectable bullets',async()=>{const r=fictionalResume('fresher');r.documentSettings.designId='classic-ruled';r.sections.find(s=>s.type==='projects').content={entries:structureSourceProjects(lines),paragraphs:[]};const m=getPaginatedDocumentModel(r),html=buildResumeHtmlDocument(r);assert.equal(m.pages.flat().filter(b=>b.type==='entry-meta'&&b.skillLabel).length,2);assert(html.includes('<strong>Technologies:</strong>'));assert.equal(m.pages.flat().filter(b=>b.type==='bullet').length,3);assert(auditResumeContent(r,html).complete);const bytes=new Uint8Array(await buildDocxFromCanonical(r).arrayBuffer()),doc=validateDocxBytes(bytes);assert(doc.ok);assert(auditResumeText(r,doc.text).complete)});
