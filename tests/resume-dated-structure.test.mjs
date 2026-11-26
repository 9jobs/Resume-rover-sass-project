import test from 'node:test';
import assert from 'node:assert/strict';
import {structureDatedSourceEntries} from '../public/source-entry-structure.js';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {recoverImportedSkills} from '../public/resume-workflow.js';
import {getPaginatedDocumentModel,buildDocxFromCanonical} from '../adapters/resume-format.js';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';

export const source=`Avery Example
avery@example.test | Perth
PROFESSIONAL SUMMARY
Analyst supporting reporting and business process improvement.
EXPERIENCE
Reporting Analyst, Example Society, Perth April 2026 – Present
Design and deliver dashboards to support operational reporting.
Develop data models and automated pipelines to ensure accurate outputs.
Data Analyst, Sample Health, Perth
March 2025 – March 2026
Analysed therapy data to identify trends, risks and anomalies.
Delivered Excel reports to provide actionable insights.
PROJECTS
Industry Project, Example Studio, Perth | July 2025 – October 2025
Delivered actionable recommendations that contributed to a ~15–20% improvement in engagement.
Analysed event and user journeys by integrating data from Google Ads and Mixpanel.
Developed dashboards to track conversion paths and user behaviour.
SKILLS & COMPETENCIES
Business Analysis: Requirements Gathering, Change Readiness, Impact Assessment
Data & Business Intelligence: Power BI, SQL, Python, Excel, Tableau
EDUCATION
Master of Business Analytics | Example University | Feb 2024 – Dec 2025`;

test('comma headings, separate dates and unmarked wrapped prose recover individual roles and achievements',()=>{
 const entries=structureDatedSourceEntries(source.split('EXPERIENCE\n')[1].split('\nPROJECTS')[0].split('\n'));
 assert.equal(entries.length,2);assert.deepEqual(entries.map(e=>e.title),['Reporting Analyst','Data Analyst']);
 assert.deepEqual(entries.map(e=>e.bullets.length),[2,2]);assert.equal(entries[0].organization,'Example Society');assert.equal(entries[0].location,'Perth');
 assert.equal(entries[1].dateRange,'March 2025 – March 2026');
});
test('same-line dates and descriptions separate headings from full original achievement text',()=>{
 const entries=structureDatedSourceEntries(['Nurse, Example Hospital | Jan 2023 - Present Supported patient care across the ward. Coordinated shift handovers and records.']);
 assert.equal(entries[0].title,'Nurse');assert.deepEqual(entries[0].bullets,['Supported patient care across the ward.','Coordinated shift handovers and records.']);
 assert.equal(structureDatedSourceEntries(['Undated role without reliable boundaries.']),null);
});
test('fresh guided imports keep competency sections out of project titles and preserve all achievements in Word and preview',async()=>{
 const parsed=await createResumeWorkflow({}).importResume({rawText:source});
 const resume=recoverImportedSkills(parsed.resume,{restoreSource:true}),experience=resume.sections.find(s=>s.type==='experience'),projects=resume.sections.find(s=>s.type==='projects'),skills=resume.sections.find(s=>s.type==='skills');
 assert.equal(experience.content.entries.length,2);assert.deepEqual(experience.content.entries.map(e=>e.bullets.length),[2,2]);
 assert.equal(projects.content.entries.length,1);assert.equal(projects.content.entries[0].title,'Industry Project');assert.equal(projects.content.entries[0].bullets.length,3);
 assert(!JSON.stringify(projects).includes('COMPETENCIES'));assert(JSON.stringify(skills).includes('Requirements Gathering'));assert(JSON.stringify(skills).includes('Mixpanel')===false);
 const achievements=[...experience.content.entries,...projects.content.entries].flatMap(e=>e.bullets);
 resume.documentSettings.resumeLength=2;
 for(const fontFamily of ['Arial','Calibri','Times New Roman']){
  resume.documentSettings.fontFamily=fontFamily;const model=getPaginatedDocumentModel(resume),doc=validateDocxBytes(new Uint8Array(await buildDocxFromCanonical(resume).arrayBuffer()));assert(doc.ok);
  for(const text of achievements){assert(model.pages.flat().some(b=>b.type==='bullet'&&b.text===text));assert(doc.text.includes(text))}
 }
});
test('previous flattened experience repairs current content without overwriting user edits from source',()=>{
 const resume={profile:{fullName:'Reviewed name'},sections:[{id:'exp',type:'experience',content:{entries:[],paragraphs:['Engineer, Example | 2022 - Present\nBuilt a reviewed workflow.\nDocumented current validation checks.']}},{id:'summary',type:'summary',content:{text:'My reviewed summary.'}}],rawImport:{rawText:'Old text must never overwrite current edits'}};
 const next=recoverImportedSkills(resume);assert.deepEqual(next.profile,resume.profile);assert.deepEqual(next.sections[1],resume.sections[1]);assert.deepEqual(next.sections[0].content.entries[0].bullets,['Built a reviewed workflow.','Documented current validation checks.']);assert(resume.sections[0].content.paragraphs.length);
});
test('legacy project title containing its description is separated into a short heading and unchanged bullets',()=>{
 const text='Industry Project | July 2025 - October 2025 | Delivered verified recommendations using customer event data and recorded the supporting evidence for business stakeholders. Analysed user journeys across existing reporting systems and documented every validation step for the project team.';
 const resume={profile:{},sections:[{id:'project',type:'projects',content:{entries:[{id:'original',title:text,dateRange:'July 2025 - October 2025',bullets:[]}]}}]};
 const next=recoverImportedSkills(resume),entry=next.sections[0].content.entries[0];assert.equal(entry.title,'Industry Project');assert.equal(entry.id,'original');assert.equal(entry.bullets.length,2);assert(text.includes(entry.bullets[0]));assert(text.includes(entry.bullets[1]));assert.equal(resume.sections[0].content.entries[0].title,text);
});
