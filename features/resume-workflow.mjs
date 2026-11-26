import {ensureCanonicalResume,getPaginatedDocumentModel,buildResumeHtmlDocument,buildDocxFromCanonical} from '../adapters/resume-format.js';
import {randomUUID} from 'node:crypto';
import mammoth from 'mammoth';
import {createDefaultWorkingResume,preserveImportedSourceCoverage,parseImportedResume,canonicalToPlainText,canonicalToLegacy,analyzeResume,buildTxtExport} from '../engine/lib/ai-resume.js';
import {pdfTextItemsToLines} from '../engine/lib/resume-import.js';
import {renderLocalPdf} from './resume-pdf.mjs';
import {inlineResumePdfFonts} from './resume-pdf-fonts.mjs';
import {auditResumeContent,auditResumeText} from './resume-integrity.mjs';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const text=(value,max=45000)=>{if(typeof value!=='string'||value.length>max)fail('Input text is invalid or too long');return value.trim()};
export function prepareWorkflowResume(input){
 const resume=ensureCanonicalResume(input||createDefaultWorkingResume());
 return {resume,legacy:canonicalToLegacy(resume),text:canonicalToPlainText(resume)};
}
export function createResumeWorkflow(store){
 async function importResume(body){
  let raw='';
  if(body.file){
   const {name,data}=body.file;
   if(typeof name!=='string'||typeof data!=='string'||data.length>1400000||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))fail('Choose a PDF, DOCX or TXT file up to 1 MB');
   const buffer=Buffer.from(data,'base64');
   if(buffer.length>1000000)fail('Choose a file up to 1 MB');
   if(/\.docx$/i.test(name)){raw=(await mammoth.extractRawText({buffer})).value}
   else if(/\.pdf$/i.test(name)){
    const {getDocument}=await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:true});
    const pdf=await task.promise;
    try{
     if(pdf.numPages>10)fail('Import up to 10 pages at a time');
     for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);raw+=pdfTextItemsToLines((await page.getTextContent()).items)+'\n'}
    }finally{await task.destroy()}
   }else if(/\.txt$/i.test(name)){raw=buffer.toString('utf8')}
   else fail('Supported files are PDF, DOCX and TXT');
  }else raw=text(body.rawText||'');
  if(!raw.trim())fail('No selectable text was found. Paste your resume text or use a text-based file.');
  if(raw.length>45000)fail('Import up to 45,000 characters at a time');
  const result=parseImportedResume(raw);
  const resume=preserveImportedSourceCoverage(ensureCanonicalResume(result.resume||result),raw);
  return {...prepareWorkflowResume(resume),source:raw,message:'Imported locally. Review each section against your original text before saving.'};
 }
 function review(body){
  const {resume}=prepareWorkflowResume(body.resume);
  const jd=text(body.jd||'',15000);
  const html=inlineResumePdfFonts(buildResumeHtmlDocument(resume));
  return {resume,analysis:analyzeResume(resume,jd),pagination:getPaginatedDocumentModel(resume),html,integrity:auditResumeContent(resume,html),provider:'existing-local-engine'};
 }
 function suggest(body){
  const bullets=Array.isArray(body.bullets)?body.bullets.map(b=>text(b,2000)).filter(Boolean):[];
  if(bullets.length>30)fail('Review up to 30 bullets at a time');
  const terms=new Set(text(body.jd||'',15000).toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[]);
  const score=b=>[...new Set(b.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[])].filter(w=>terms.has(w)).length;
  const after=bullets.map((b,i)=>({text:b.replace(/\s+/g,' ').replace(/^[-•]\s*/,''),index:i})).sort((a,b)=>score(b.text)-score(a.text)||a.index-b.index).map(b=>b.text);
  return {before:bullets,after,provider:'local-rule-based',message:'Local suggestion. Existing bullets are cleaned and ordered by job-description overlap. Review before applying.'};
 }
 function draftBullet(body){
  const action=text(body.action||'',40),task=text(body.task||'',1400),tools=text(body.tools||'',500),result=text(body.result||'',900);
  if(!['Built','Developed','Analysed','Designed','Tested','Coordinated','Maintained','Supported','Documented','Led'].includes(action)||!task)fail('Choose your action and describe work you actually did');
  const value=[action+' '+task.replace(/[.!?]+$/,''),tools?'using '+tools.replace(/[.!?]+$/,''):''].filter(Boolean).join(' ')+(result?'. '+result.replace(/[.!?]+$/,''):'')+'.';
  return {text:value,provider:'local-fact-composer',facts:{action,task,tools,result}};
 }
 function save(u,body){
  const owner=body.owner||u.id;store.access(u,owner);
  const title=text(body.title||'',200);if(!title)fail('Give this resume version a title');
  const {resume,text:content}=prepareWorkflowResume(body.resume);
  if(!resume.profile.fullName||!content.trim())fail('Add a candidate name and resume content');
  let parent=null,job=null;
  if(body.parentId){parent=store.record(u,body.parentId,'document');if(parent.owner!==owner)fail('Choose a version belonging to the same candidate',403)}
  if(body.jobId){job=store.record(u,body.jobId,'job');if(job.owner!==owner)fail('Job and resume must belong to the same candidate',403)}
  const metadata={parentId:parent?.id||'',jobId:job?.id||'',jd:text(body.jd||job?.data.jd||'',15000),company:text(body.company||job?.data.company||'',200),experienceLevel:text(body.experienceLevel||'',100)};
  store.db.exec('BEGIN IMMEDIATE');
  try{
   const doc=store.write(u,'document',{owner,title,content,canonical:resume});
   store.db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify({...doc.data,workflow:metadata}),doc.id);
   if(job)store.write(u,'job',{...job.data,docId:doc.id,owner},job.id);
   store.db.exec('COMMIT');
   return store.record(u,doc.id,'document');
  }catch(error){store.db.exec('ROLLBACK');throw error}
 }
 async function download(u,id,format){
  const doc=store.record(u,id,'document');if(!doc.data.canonical)fail('Open this text version in the guided builder and save a formatted version first');
  return renderDownload(doc.data.canonical,format);
 }
 async function exportDraft(u,body,format){
  const owner=body.owner||u.id;store.access(u,owner);
  if(body.parentId){const parent=store.record(u,body.parentId,'document');if(parent.owner!==owner)fail('Choose a resume belonging to this candidate',403)}
  return renderDownload(body.resume,format);
 }
 async function renderDownload(input,format){
  const {resume}=prepareWorkflowResume(input);
  if(!resume.profile.fullName)fail('Add a candidate name before exporting');
  if(format==='txt')return {type:'text/plain; charset=utf-8',bytes:Buffer.from(buildTxtExport(resume))};
  if(!['docx','pdf'].includes(format))fail('Choose PDF, DOCX or TXT');
  const model=getPaginatedDocumentModel(resume),html=buildResumeHtmlDocument(resume),audit=auditResumeContent(resume,html);
  if(!model.fit||!audit.complete)fail('This layout exceeds the page target or omits source content. Choose Standard or two pages, or explicitly shorten the draft before export.',422);
  if(format==='docx'){
   const blob=buildDocxFromCanonical(resume),bytes=Buffer.from(await blob.arrayBuffer()),parsed=validateDocxBytes(bytes);
   if(!parsed.ok||!auditResumeText(resume,parsed.text).complete)fail('DOCX content verification failed. Choose another existing format and review your document.',422);
   return {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes};
  }
  if(format==='pdf'){
   const bytes=await renderLocalPdf(html);
   const {getDocument}=await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');
   const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,useSystemFonts:true});
   const pdf=await task.promise;let extracted='',streamText='';const actualPages=pdf.numPages;
   try{
    if(pdf.numPages>model.allowedPages)fail('PDF exceeds the selected page target. Shorten the draft or choose two pages before export.',422);
    for(let page=1;page<=pdf.numPages;page++){
     const {items}=await(await pdf.getPage(page)).getTextContent();
     extracted+=pdfTextItemsToLines(items)+'\n';
     // A right-aligned date can interrupt a wrapped heading in geometric
     // reading order. Also verify against the PDF's actual drawing order.
     streamText+=items.map(item=>item.str||'').join(' ')+'\n';
    }
   }finally{await task.destroy()}
   if(!auditResumeText(resume,extracted+'\n'+streamText).complete)fail('PDF text verification found missing content. Choose DOCX or review the document before retrying.',422);
   return {type:'application/pdf',bytes,pages:actualPages};
  }
  fail('Choose PDF, DOCX or TXT');
 }
 return {importResume,review,suggest,draftBullet,save,download,exportDraft};
}
