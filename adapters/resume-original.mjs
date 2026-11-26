import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {unzipSync,zipSync,strToU8} from 'fflate';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {analyseOptimizer,applyOptimizer} from '../features/resume-optimizer.mjs';
const run=promisify(execFile),ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const root=path.resolve(process.cwd(),'data','ats-original');
const script=fileURLToPath(new URL('../scripts/render-source-word.ps1',import.meta.url));
let conversion=Promise.resolve();
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status})};
export const originalFileHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateOriginalSource(file){return originalFileHash(sourceBytes(file))}
function sourceBytes(file){if(!file||typeof file.name!=='string'||!/\.(?:pdf|docx)$/i.test(file.name)||typeof file.data!=='string'||file.data.length>1400000||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))fail('Use the original PDF or DOCX, up to 1 MB.',400);const bytes=Buffer.from(file.data,'base64');if(bytes.length>1000000)fail('Use an original file up to 1 MB.',400);return bytes}
export async function originalPdfPages(bytes){const {getDocument}=await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,useSystemFonts:true});try{const pdf=await task.promise;return pdf.numPages}finally{await task.destroy()}}
async function wordPreview(bytes){
 if(process.env.VERCEL==='1')fail('Upload a PDF to preview the original file online. You can still import DOCX into the Resume Builder.',503);
 const work=async()=>{await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'source-'));try{const source=path.join(dir,'source.docx'),output=path.join(dir,'source.pdf');await fs.writeFile(source,bytes);await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Source',source,'-Output',output],{windowsHide:true,timeout:60000,maxBuffer:100000});return await fs.readFile(output)}catch{fail('Original Word preview requires a working local Microsoft Word installation. The uploaded Word file has not been changed.',503)}finally{const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(root)+path.sep))await fs.rm(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100}).catch(()=>{})}};
 const pending=conversion.then(work,work);conversion=pending.catch(()=>{});return pending;
}
export async function previewOriginalFile(file){const bytes=sourceBytes(file);const pdf=/\.pdf$/i.test(file.name)?bytes:await wordPreview(bytes);if(pdf.subarray(0,5).toString()!=='%PDF-')fail('The original preview is not a valid PDF.');return {bytes:pdf,pages:await originalPdfPages(pdf),hash:originalFileHash(bytes)}}
const compact=text=>text.replace(/\s+/g,' ').trim();
export function replaceOriginalWordText(bytes,before,after){
 if(typeof before!=='string'||typeof after!=='string'||!before.trim()||before===after||after.length>1500||/[\r\n]/.test(after))fail('Choose one existing bullet to edit.');
 const figures=text=>(text.match(/\d+(?:[.,]\d+)*(?:\s*%|\s*[x×])?/g)||[]).map(compact).sort();if(JSON.stringify(figures(before))!==JSON.stringify(figures(after)))fail('The original numbers must stay unchanged.');
 const files=unzipSync(new Uint8Array(bytes));if(!files['word/document.xml'])fail('Choose the original editable Word document.');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(files['word/document.xml']),'text/xml'),matches=[];
 for(const paragraph of Array.from(doc.getElementsByTagNameNS(ns,'p'))){const nodes=Array.from(paragraph.getElementsByTagNameNS(ns,'t'));const text=nodes.map(n=>n.textContent).join(''),map=[];let normal='';for(let i=0;i<text.length;i++){const value=/\s/.test(text[i])?' ':text[i];if(value===' '&&normal.endsWith(' '))continue;normal+=value;map.push(i)}const index=normal.indexOf(compact(before));if(index>=0){if(normal.indexOf(compact(before),index+1)>=0)fail('This text cannot be matched uniquely in the original Word file. No guessed change was made.');matches.push({nodes,start:map[index],end:map[index+compact(before).length-1]+1,text})}}
 if(matches.length!==1)fail('This text cannot be matched uniquely in the original Word file. Edit it in the source document; no guessed change was made.');
 const {nodes,start,end}=matches[0];let offset=0,inserted=false;
 for(const node of nodes){const text=node.textContent,left=offset,right=left+text.length;offset=right;if(right<=start||left>=end)continue;const prefix=text.slice(0,Math.max(0,start-left)),suffix=text.slice(Math.min(text.length,end-left));node.textContent=prefix+(inserted?'':after)+suffix;node.setAttribute('xml:space','preserve');inserted=true}
 files['word/document.xml']=strToU8(new XMLSerializer().serializeToString(doc));return Buffer.from(zipSync(files));
}
export async function applyOriginalWordSuggestion(body){
 const bytes=sourceBytes(body.file);if(!/\.docx$/i.test(body.file.name))fail('To preserve the original layout while editing text, use its original Word document. The PDF is unchanged.');
 if(originalFileHash(bytes)!==body.expectedFileHash)fail('The uploaded source changed. Review the current document first.',409);
 const current=analyseOptimizer(body.resume,body.jd||'');if(current.hash!==body.expectedHash)fail('The resume changed. Review fresh suggestions.',409);
 const suggestion=current.suggestions.find(s=>s.id===body.suggestionId&&s.id.startsWith('bullet:'));if(!suggestion)fail('Only a reviewed edit to one existing bullet can preserve this original format.');
 const changed=applyOptimizer(body.resume,body.jd||'',suggestion.id,current.hash),updated=replaceOriginalWordText(bytes,suggestion.beforeText,suggestion.afterText),preview=await wordPreview(updated),pages=await originalPdfPages(preview);
 if(body.expectedPages&&pages!==body.expectedPages)fail('This edit changes the original page count. No change was applied; shorten the wording in the original Word document.');
 return {result:changed,file:{name:body.file.name,data:updated.toString('base64')},preview:{data:preview.toString('base64'),pages},hash:originalFileHash(updated),appliedText:{before:suggestion.beforeText,after:suggestion.afterText}};
}
