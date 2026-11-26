import test from 'node:test';
import assert from 'node:assert/strict';
import {excludeImportedReferences} from '../adapters/rover-import-sections.js';
import {buildResumeHtmlDocument,buildDocxFromCanonical} from '../adapters/rover-font-format.js';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';

test('import removes only reference sections and preserves original source and all other content',async()=>{
 const resume=fictionalResume('fresher');resume.rawImport={rawText:'Original reference contact text stays in the upload audit.'};
 const originalSections=structuredClone(resume.sections);
 for(const title of ['PROFESSIONAL REFERENCES','References','Referees','Personal references','References & Referees'])resume.sections.push({id:title,type:'custom',title,visible:true,content:{paragraphs:['ReferenceContactOnly'],entries:[],bullets:[]}});
 const snapshot=structuredClone(resume),next=excludeImportedReferences(resume);
 assert.deepEqual(next.sections,originalSections);assert.deepEqual(resume,snapshot);assert.deepEqual(next.profile,resume.profile);assert.deepEqual(next.documentSettings,resume.documentSettings);assert.deepEqual(next.rawImport,resume.rawImport);
 assert(!buildResumeHtmlDocument(next).includes('ReferenceContactOnly'));
 const word=validateDocxBytes(new Uint8Array(await(await buildDocxFromCanonical(next)).arrayBuffer()));assert(word.ok);assert(!word.text.includes('ReferenceContactOnly'));
});
test('reference wording in genuine projects or achievements is retained, and blank/create drafts are unaffected',()=>{
 const draft=fictionalResume('fresher');draft.sections.push({id:'architecture',type:'custom',title:'Reference Architecture',content:{paragraphs:['Built a reference architecture for internal services.']}});
 assert.equal(excludeImportedReferences(draft),draft);draft.rawImport={rawText:'source'};assert.deepEqual(excludeImportedReferences(draft).sections,draft.sections);
});
