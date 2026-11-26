import test from 'node:test';
import assert from 'node:assert/strict';
import {importRoverSource} from '../features/rover-source-import.mjs';
import {buildResumeHtmlDocument,buildDocxFromCanonical} from '../adapters/rover-font-format.js';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';
import {auditResumeContent} from '../features/resume-integrity.mjs';

const source=`Jordan Example
+61 400 123 456 | jordan@example.invalid | Melbourne, VIC
Professional Summary
Finance professional with experience in accounts payable and financial administration across diverse industries.
Proven ability to
manage high volume transactions and resolve stakeholder enquiries.
Skills
Invoice processing, Supplier reconciliation, Financial controls,
Microsoft Excel, Oracle ERP
Professional Experience
Accounts Officer | Example Company | Jan 2021 – Present
• Managed supplier invoices and reconciliations across multiple business units,
maintaining accurate records and resolving payment enquiries.
• Prepared month-end reporting and supported financial controls.
Education
Bachelor of Commerce | Example University | 2017 – 2020`;

test('offline upload keeps one contact header and reflows PDF-wrapped summary and bullets in preview and Word',async()=>{
 const {resume}=importRoverSource({rawText:source});
 assert.equal(resume.profile.location,'Melbourne, VIC');assert(!resume.sections.some(s=>s.title==='Contact details'));
 const summary=resume.sections.find(s=>s.type==='summary');assert(summary.content.text.includes('Proven ability to manage high volume'));
 const entry=resume.sections.find(s=>s.type==='experience').content.entries[0];assert.equal(entry.title,'Accounts Officer');assert.equal(entry.organization,'Example Company');assert.equal(entry.dateRange,'Jan 2021 - Present');assert.equal(entry.bullets.length,2);assert(entry.bullets[0].includes('units, maintaining'));
 const html=buildResumeHtmlDocument(resume);assert(auditResumeContent(resume,html).complete);assert.equal((html.match(/jordan@example.invalid<\/a>/g)||[]).length,1);
 const word=validateDocxBytes(new Uint8Array(await(await buildDocxFromCanonical(resume)).arrayBuffer()));assert(word.ok);assert(word.text.includes('Proven ability to manage high volume'));assert(word.text.includes('units, maintaining'));assert(resume.rawImport.rawText.includes('Proven ability to'));assert(resume.rawImport.rawText.includes('maintaining accurate records'));
});
