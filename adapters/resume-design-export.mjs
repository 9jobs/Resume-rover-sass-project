// Isolated export path for explicitly selected gallery designs. Original export stays unchanged.
import {ensureCanonicalResume,getPaginatedDocumentModel,buildResumeHtmlDocument,buildDocxFromCanonical} from './resume-format.js';
import {resumeDesign} from './resume-designs.js';
import {renderLocalPdf} from '../features/resume-pdf.mjs';
import {auditResumeContent,auditResumeText} from '../features/resume-integrity.mjs';
import {validateDocxBytes} from '../engine/lib/zip-utils.js';
import {pdfTextItemsToLines} from '../engine/lib/resume-import.js';
const fail=message=>{throw Object.assign(new Error(message),{status:422})};
// Validate right-aligned dates separately so they cannot split a wrapped title.
function columnReadingText(items){const date=/^(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}\s*[-–—]\s*(?:present|current|(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2})$/i;const dates=items.filter(item=>date.test(item.str?.trim()||'')),body=items.filter(item=>!dates.includes(item));return pdfTextItemsToLines(body)+(dates.length?'\n'+dates.map(item=>item.str).join('\n'):'')}
export function designedPdfColumns(items,model){
 if(model.design.family==='single')return {main:columnReadingText(items),side:''};
 const boundary=model.margin+(model.design.side==='left'?model.sideWidth:model.mainWidth)+model.gap/2;
 const left=items.filter(item=>Number(item.transform?.[4]||0)<boundary),right=items.filter(item=>Number(item.transform?.[4]||0)>=boundary);
 return {main:columnReadingText(model.design.side==='left'?right:left),side:columnReadingText(model.design.side==='left'?left:right)};
}
export async function exportDesignedResume(user,body,format,store){
 if(!resumeDesign(body.resume))fail('Select a valid gallery template.');
 const owner=body.owner||user.id;store.access(user,owner);if(body.parentId){const parent=store.record(user,body.parentId,'document');if(parent.owner!==owner)throw Object.assign(new Error('Choose a resume belonging to this candidate.'),{status:403})}
 if(!['pdf','docx'].includes(format))fail('Choose PDF or Word.');
 const resume=ensureCanonicalResume(body.resume),model=getPaginatedDocumentModel(resume),html=buildResumeHtmlDocument(resume);
 if(!resume.profile.fullName||!model.fit||!auditResumeContent(resume,html).complete)fail('Review name, page fit and source coverage before exporting this template.');
 if(format==='docx'){const bytes=Buffer.from(await buildDocxFromCanonical(resume).arrayBuffer()),parsed=validateDocxBytes(bytes);if(!parsed.ok||!auditResumeText(resume,parsed.text).complete)fail('Template Word export failed source-text verification.');return {bytes,type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}}
 const bytes=await renderLocalPdf(html),{getDocument}=await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs'),task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,useSystemFonts:true}),pdf=await task.promise;
 const main=[],side=[];const actual=pdf.numPages;
 try{if(actual!==model.allowedPages)fail('Template PDF does not match the selected page count. Review layout before export.');for(let p=1;p<=actual;p++){const col=designedPdfColumns((await(await pdf.getPage(p)).getTextContent()).items,model);main.push(col.main);side.push(col.side)}}finally{await task.destroy()}
 if(!auditResumeText(resume,main.join('\n')+'\n'+side.join('\n')).complete)fail('Template PDF is missing source text. Review the layout before exporting.');
 return {bytes,type:'application/pdf',pages:actual};
}
