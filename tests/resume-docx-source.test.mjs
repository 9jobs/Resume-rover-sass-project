import test from 'node:test';import assert from 'node:assert/strict';
import {docxHtmlToSource,importResumeWithSourceLists} from '../adapters/resume-docx-source.mjs';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {buildDocxFromCanonical} from '../adapters/resume-format.js';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
import {recoverImportedSkills} from '../public/resume-workflow.js';
test('preserves Word list boundaries, nested lists and decoded source text without executing HTML',()=>{assert.equal(docxHtmlToSource('<h2>Experience</h2><p>Engineer | Example</p><ul><li>Used Python &amp; SQL.</li><li><p>Reviewed records.</p><ul><li>Checked validation.</li></ul></li></ul>'),'Experience\nEngineer | Example\n- Used Python & SQL.\n- Reviewed records.\n- Checked validation.')});
test('real Word numbering survives the established import interface as individual bullets',async()=>{const r=fictionalResume('experienced'),blob=buildDocxFromCanonical(r),file={name:'fictional.docx',data:Buffer.from(await blob.arrayBuffer()).toString('base64')};const imported=await importResumeWithSourceLists(createResumeWorkflow({}),{file});assert((imported.source.match(/^- /gm)||[]).length>=7);const restored=recoverImportedSkills(imported.resume,{restoreSource:true}),bullets=restored.sections.filter(s=>['experience','projects'].includes(s.type)).flatMap(s=>(s.content.entries||[]).flatMap(e=>e.bullets||[]));assert(bullets.length>=7)});
