import test from 'node:test';import assert from 'node:assert/strict';import {unzipSync} from 'fflate';
import {normalizeSourceListMarkers} from '../public/source-list-markers.js';import {createResumeWorkflow} from '../features/resume-workflow.mjs';import {recoverImportedSkills} from '../public/resume-workflow.js';import {getPaginatedDocumentModel,buildDocxFromCanonical} from '../adapters/resume-format.js';import {analyseOptimizer} from '../features/resume-optimizer.mjs';
const raw=`Avery Example
avery@example.test | Melbourne
PROFESSIONAL SUMMARY
Construction supervisor documenting site operations and coordinating project teams.
PROFESSIONAL EXPERIENCE
Site Supervisor | Example Construction | Jan 2023 - Present
\uF0B7 Supervised 10 workers across residential construction projects.
\uF0B7 Coordinated subcontractors and maintained accurate site records.
Construction Laborer | Sample Builders | Jan 2021 - Dec 2022
\uF0B7 Assisted with site preparation and followed safety procedures.
\uF0B7 Maintained tools and materials for the project team.
SKILLS
\uF0B7 Site Supervision, WHS Compliance
\uF0B7 Subcontractor Coordination, Project Documentation
and Reporting
LICENCES AND CERTIFICATIONS
\uF0B7 White Card, Forklift Licence
\uF0B7 First Aid and CPR
EDUCATION
Diploma of Construction | Example College | 2020`;
async function fixture(){const parsed=await createResumeWorkflow({}).importResume({rawText:normalizeSourceListMarkers(raw)});return recoverImportedSkills(parsed.resume,{restoreSource:true})}
test('Symbol-font markers normalize only at line starts without changing metrics or prose',()=>{assert.equal(normalizeSourceListMarkers('\uF0B7 Supervised 10 workers\n  • Improved quality by 15%\nA literal \uF0B7 inside prose'),'- Supervised 10 workers\n  - Improved quality by 15%\nA literal \uF0B7 inside prose')});
test('import keeps separate experience bullets, wrapped skill rows and combined licence headings',async()=>{const r=await fixture(),roles=r.sections.find(s=>s.type==='experience').content.entries;assert.deepEqual(roles.map(e=>e.bullets.length),[2,2]);assert(roles.every(e=>!e.subtitle.includes('Supervised')));assert(roles.every(e=>!e.location.includes('Supervised')&&!e.location.includes('Coordinated')));const skills=r.sections.find(s=>s.type==='skills');assert.equal(skills.layout,'source-bullets');assert.deepEqual(skills.content.items,['Site Supervision, WHS Compliance','Subcontractor Coordination, Project Documentation and Reporting']);assert.deepEqual(r.sections.find(s=>s.type==='certifications').content.bullets,['White Card, Forklift Licence','First Aid and CPR']);assert(!JSON.stringify(r.sections).includes('\uF0B7'))});
test('standard and designed fitted copies render every source list row as a separate bullet',async()=>{for(const designId of [undefined,'classic-ruled','navy-right']){const r=await fixture();r.documentSettings.designId=designId;r.documentSettings.resumeLength=1;r.documentSettings.fullContentFit=true;const expected=[...r.sections.find(s=>s.type==='skills').content.items,...r.sections.find(s=>s.type==='certifications').content.bullets,...r.sections.find(s=>s.type==='experience').content.entries.flatMap(e=>e.bullets)];const m=getPaginatedDocumentModel(r);const blocks=m.pages.flat();for(const text of expected)assert(blocks.some(b=>b.type==='bullet'&&b.text===text),designId+' missing bullet '+text);assert(analyseOptimizer(r).integrity.complete)}});
test('Word export keeps source list rows as separate bullet paragraphs',async()=>{const r=await fixture();r.documentSettings.designId='classic-ruled';r.documentSettings.resumeLength=1;r.documentSettings.fullContentFit=true;const files=unzipSync(new Uint8Array(await buildDocxFromCanonical(r).arrayBuffer()));const xml=new TextDecoder().decode(files['word/document.xml']);assert(!xml.includes('\uF0B7'));const paragraph=xml.match(/<w:p>[\s\S]*?<\/w:p>/g)||[];for(const value of ['Supervised 10 workers','Site Supervision, WHS Compliance','White Card, Forklift Licence'])assert(paragraph.some(p=>p.includes(value)&&(p.includes('<w:numPr>')||p.includes('• '))),value) });
