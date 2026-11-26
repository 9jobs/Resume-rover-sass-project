import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {ensureCanonicalResume,analyzeResume,getVisibleSections} from '../engine/lib/ai-resume.js';
import {buildResumeHtmlDocument,getPaginatedDocumentModel} from '../adapters/resume-format.js';
import {auditResumeContent} from './resume-integrity.mjs';
import {recoverAtsSourceMappings} from './ats-source-recovery.mjs';
const ontology=JSON.parse(fs.readFileSync(new URL('../ontology/aliases.json',import.meta.url),'utf8'));
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const key=s=>String(s||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
const escape=s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
const includes=(text,term)=>new RegExp('(?<![\\p{L}\\p{N}])'+escape(key(term))+'(?![\\p{L}\\p{N}])','u').test(key(text));
const negative=text=>/\b(no|not|never|without|lack|learning|aspiring)\b/i.test(text);
const credential=term=>['RN','BLS','ACLS'].includes(term)||/\blicen[cs]e|certification|degree\b/i.test(term);
function validate(input,jd){if(!input||typeof input!=='object'||JSON.stringify(input).length>500000)fail('Choose a resume of up to 500 KB.');if(typeof jd!=='string'||jd.length>15000)fail('Use a JD of up to 15,000 characters.');return ensureCanonicalResume(input)}
const digest=(resume,jd)=>createHash('sha256').update(JSON.stringify({resume,jd})).digest('hex');
function strings(v,out=[]){if(typeof v==='string'&&v.trim())out.push(v);else if(Array.isArray(v))v.forEach(x=>strings(x,out));else if(v&&typeof v==='object')Object.entries(v).filter(([k])=>!['id','url','layout','type'].includes(k)).forEach(([,x])=>strings(x,out));return out}
function terms(resume,jd){
 const visible=resume.sections.filter(s=>s.visible!==false),lines=visible.flatMap(s=>strings(s.content));
 return Object.entries(ontology).filter(([n,a])=>[n,...a].some(t=>includes(jd,t))).map(([term,aliases])=>{
  const variants=[term,...aliases],proof=lines.find(l=>!negative(l)&&variants.some(t=>includes(l,t))),cert=credential(term);
  const qualified=cert&&visible.filter(s=>/certif|licen[cs]/i.test(s.type+' '+s.title)).some(s=>(s.content.entries||[]).some(e=>variants.some(t=>includes(strings(e).join(' '),t))&&/^\d{4}-\d{2}-\d{2}$/.test(e.expiryDate||'')&&e.expiryDate>=new Date().toISOString().slice(0,10)));
  return {term,variants,status:proof&&(!cert||qualified)?'matched':'missing',evidence:proof||'',credential:cert};
 });
}
function score(resume,jd){
 const base=analyzeResume(resume,jd),layout=getPaginatedDocumentModel(resume),visible=getVisibleSections(resume);
 const links=['linkedin','github','portfolio','website'].map(k=>resume.profile[k]).filter(Boolean);
 const validLink=v=>{try{const u=new URL(/^https?:\/\//i.test(v)?v:'https://'+v);return ['http:','https:'].includes(u.protocol)&&u.hostname.includes('.')}catch{return false}};
 const replacements={'Formatting Safety':[[visible.every(s=>s.title),'Add section headings.'],[layout.fit,'Content exceeds the selected page target.'],[links.every(validLink),'Review your profile links.']],'General ATS Structure':[[visible.length>=4,'Add relevant core sections.'],[visible.some(s=>['experience','projects'].includes(s.type)&&s.content.entries?.length),'Add genuine role or project evidence.'],[layout.fit,'Review document page fit.']]};
 const breakdown=base.breakdown.map(c=>{const checks=replacements[c.label];if(!checks)return c;const points=Math.round(checks.filter(([passed])=>passed).length/checks.length*c.max*10)/10;return {...c,points,issues:checks.filter(([passed])=>!passed).map(([,message])=>({message,label:c.label}))}});
 const readiness=Math.round(breakdown.reduce((n,c)=>n+c.points,0)),keywords=terms(resume,jd),coverage=keywords.length?Math.round(keywords.filter(t=>t.status==='matched').length/keywords.length*100):null;
 return {score:coverage===null?readiness:Math.round(readiness*.7+coverage*.3),readiness,keywordCoverage:coverage,breakdown,issues:base.recommendations,keywords,label:'Estimated ATS score',formula:coverage===null?'Readiness only; no tracked JD terms detected.':'70% local readiness + 30% tracked JD keyword coverage.',disclaimer:'Local estimate, not a Rezi score or an employer ATS result. Unknown JD requirements require human review.'};
}
function proposals(resume,jd,before){
 const out=[];
 function add(id,label,description,change,oldText,newText){if(out.length>=24)return;const next=structuredClone(resume);change(next);if(JSON.stringify(next)===JSON.stringify(resume))return;
  // Separating dense text adds real paragraph space. Score the complete fitted
  // copy, rather than cancelling its wording gains with an obsolete one-page cap.
  if(id.startsWith('structure-bullets:')&&Number(next.documentSettings.resumeLength)===1){const layout=getPaginatedDocumentModel(next);if(!layout.fit&&layout.pageCount===2)next.documentSettings.resumeLength=2}
  const after=score(next,jd);out.push({id,label,description,beforeText:oldText,afterText:newText,beforeScore:before.score,afterScore:after.score,delta:after.score-before.score,next})}
 const sourceMapped=recoverAtsSourceMappings(resume);
 if(JSON.stringify(sourceMapped)!==JSON.stringify(resume))add('source-recovery','Restore verified contact, tools and role structure from upload','Uses literal information already present in the original file; removes only stray date-parenthesis fragments and relocates the existing tool inventory.',r=>{r.profile=sourceMapped.profile;r.sections=sourceMapped.sections},'Original imported field mappings','Source-verified contact, skills and role mappings');
 const skills=resume.sections.find(s=>s.type==='skills'&&s.visible!==false);
 if(skills){const values=[...(skills.content.items||[]),...(skills.content.categories||[]).flatMap(c=>c.items||[])],seen=new Set(),unique=values.filter(v=>{const k=key(v);if(seen.has(k))return false;seen.add(k);return true});
 if(unique.length!==values.length)add('dedupe-skills','Remove duplicate skills','Keeps existing skills once; no skills invented.',r=>{const s=r.sections.find(s=>s.id===skills.id),seen=new Set(),filter=a=>(a||[]).filter(v=>{const k=key(v);if(seen.has(k))return false;seen.add(k);return true});s.content.items=filter(s.content.items);for(const c of s.content.categories||[])c.items=filter(c.items)},values.join(', '),unique.join(', '))}
 const summary=resume.sections.find(s=>s.type==='summary');
 if(!summary?.content.text?.trim()){const e=resume.sections.filter(s=>s.visible!==false&&['experience','education','projects'].includes(s.type)).flatMap(s=>s.content.entries||[])[0],text=e?[e.title,e.organization].filter(Boolean).join(' · ')+(e.bullets?.[0]?' — '+e.bullets[0]:''):'';
 if(text&&text.length<=500)add('summary','Add a summary from existing facts','Review this source extract. No years or achievements inferred.',r=>{let s=r.sections.find(s=>s.type==='summary');if(!s){s={id:randomUUID(),type:'summary',title:'Professional Summary',order:0,visible:true,contentType:'paragraph',content:{text:''}};r.sections.unshift(s)}s.content.text=text;s.visible=true},'(No summary)',text)}
 const replacements=[[/^helped with\s+/i,'Assisted with '],[/^worked on\s+/i,'Contributed to '],[/^responsible for managing\s+/i,'Managed '],[/^responsible for coordinating\s+/i,'Coordinated '],[/^responsible for maintaining\s+/i,'Maintained '],[/^responsible for preparing\s+/i,'Prepared '],[/^responsible for supporting\s+/i,'Supported ']];
 const denseEdits=[];
 for(const s of resume.sections.filter(s=>s.visible!==false&&['experience','projects'].includes(s.type)))for(const e of s.content.entries||[]){
  const seen=new Set(),unique=(e.bullets||[]).filter(b=>{const k=key(b);if(seen.has(k))return false;seen.add(k);return true});
  if(unique.length!==e.bullets.length)add('dedupe:'+s.id+':'+e.id,'Remove identical repeated bullets','Only duplicate text within this entry is removed.',r=>{r.sections.find(x=>x.id===s.id).content.entries.find(x=>x.id===e.id).bullets=unique},e.bullets.join('\n'),unique.join('\n'));
  (e.bullets||[]).forEach((b,i)=>{let after=b.replace(/^(?:\s*[•●▪◦‣⁃]\s*)+/u,'').replace(/[ \t]+/g,' ').trim();for(const [pattern,value]of replacements)if(pattern.test(after)){after=after.replace(pattern,value);break}if(after!==b)add('bullet:'+s.id+':'+e.id+':'+i,'Improve bullet wording','Review this rephrasing. Task, tools and numbers remain from your bullet.',r=>{r.sections.find(x=>x.id===s.id).content.entries.find(x=>x.id===e.id).bullets[i]=after},b,after)});
  (e.bullets||[]).forEach((b,i)=>{
   const parts=b.split(/(?<=[.!?])\s+(?=(?:Design|Develop|Deliver|Engage|Support|Build|Built|Implement|Create|Analyse|Analyze|Collaborate|Manage|Automate|Maintain|Document|Improve|Coordinate|Lead|Led|Test|Review|Identify|Optimise|Optimize)(?:d|ed|s)?\b)/);
   if(parts.length<2)return;
   denseEdits.push({section:s.id,entry:e.id,index:i,parts,before:b});
   add('structure-bullets:'+s.id+':'+e.id+':'+i,'Separate dense achievements into source bullets','Retains every source sentence, figure and tool; only separates the existing achievements.',r=>{r.sections.find(x=>x.id===s.id).content.entries.find(x=>x.id===e.id).bullets.splice(i,1,...parts)},b,parts.join('\n'));
  });
 }
 if(denseEdits.length>1){if(out.length>=24)out.pop();add('structure-bullets:all','Separate all dense source achievements','Organises existing sentences together so aggregate wording checks can be recalculated. No source facts are added or removed.',r=>{
  for(const edit of [...denseEdits].reverse())r.sections.find(s=>s.id===edit.section).content.entries.find(e=>e.id===edit.entry).bullets.splice(edit.index,1,...edit.parts);
 },denseEdits.map(e=>e.before).join('\n'),denseEdits.flatMap(e=>e.parts).join('\n'));}
 const layout=getPaginatedDocumentModel(resume);
 if(!layout.fit&&layout.pageCount===2&&resume.documentSettings.resumeLength===1)add('two-pages','Fit the complete resume to two pages','No content is cut.',r=>{r.documentSettings.resumeLength=2},'1-page target','2-page target');
 const context=resume.sections.filter(s=>s.visible!==false&&['experience','projects'].includes(s.type)).flatMap(s=>(s.content.entries||[]).flatMap(e=>e.bullets||[])),existing=resume.sections.filter(s=>s.type==='skills').flatMap(s=>strings(s.content));
 // Recover skills literally evidenced by work even when there is no JD. Apply
 // the set together: one skill alone may not cross the skills-quality threshold.
 const evidenced=Object.entries(ontology).filter(([term,aliases])=>!credential(term)&&![term,...aliases].some(v=>existing.some(line=>includes(line,v)))&&context.some(line=>!/\b(no|not|never|without|lack|lacking|learning|aspiring|seeking|interested|required|requirements|preferred|willing)\b/i.test(line)&&[term,...aliases].some(v=>includes(line,v)))).map(([term])=>term);
 const existingCount=resume.sections.filter(s=>s.type==='skills').flatMap(s=>[...(s.content.items||[]),...(s.content.categories||[]).flatMap(c=>c.items||[])]).length;
 const additions=evidenced.slice(0,Math.max(0,40-existingCount));
 if(additions.length)add('skill:source-evidence','Surface skills already demonstrated in work','Only skills explicitly evidenced by existing work bullets are added. The job title or JD alone is never evidence.',r=>{let s=r.sections.find(s=>s.type==='skills');if(!s){s={id:randomUUID(),type:'skills',title:'Skills',visible:true,order:1,contentType:'mixed',layout:'compact-list',content:{items:[],categories:[]}};r.sections.push(s)}s.content.items=[...(s.content.items||[]),...additions]},context.filter(line=>additions.some(t=>includes(line,t))).join('\n'),additions.join(', '));
 for(const t of before.keywords.filter(t=>t.status==='matched'&&!t.credential)){if(t.variants.some(v=>existing.some(s=>includes(s,v))))continue;const proof=context.find(l=>!negative(l)&&t.variants.some(v=>includes(l,v)));if(!proof)continue;
 add('skill:'+t.term,'Surface '+t.term+' in Skills','This term already appears in your experience/project evidence.',r=>{let s=r.sections.find(s=>s.type==='skills');if(!s){s={id:randomUUID(),type:'skills',title:'Skills',visible:true,order:1,contentType:'mixed',layout:'compact-list',content:{items:[],categories:[]}};r.sections.push(s)}s.content.items=[...(s.content.items||[]),t.term]},proof,'Skills: '+t.term)}
 return out.sort((a,b)=>b.delta-a.delta).slice(0,24);
}
export function analyseOptimizer(input,jd=''){
 const resume=validate(input,jd),analysis=score(resume,jd),list=proposals(resume,jd,analysis),html=buildResumeHtmlDocument(resume),layout=getPaginatedDocumentModel(resume);
 return {resume,analysis,hash:digest(resume,jd),suggestions:list.map(({next,...data})=>data),html,pages:layout.pageCount,fit:layout.fit,integrity:auditResumeContent(resume,html),questions:analysis.keywords.filter(t=>t.status==='missing').map(t=>({term:t.term,credential:t.credential,message:t.credential?'Enter and review current qualification evidence in the editor; no automatic licence claim.':'Confirm genuine experience and supply an example before adding.'}))};
}
export function applyOptimizer(input,jd,id,expectedHash){
 const r=validate(input,jd);if(digest(r,jd)!==expectedHash)fail('Draft or JD changed. Analyse again before applying.',409);const before=score(r,jd),suggestion=proposals(r,jd,before).find(s=>s.id===id);if(!suggestion)fail('Suggestion no longer applies. Analyse again.',409);
 return {...analyseOptimizer(suggestion.next,jd),applied:{id,label:suggestion.label,before:before.score,after:suggestion.afterScore}};
}
export function confirmOptimizer(input,jd,b){
 const r=validate(input,jd);if(digest(r,jd)!==b.expectedHash)fail('Draft changed. Analyse again.',409);const t=terms(r,jd).find(t=>t.status==='missing'&&t.term===b.term);if(!t||t.credential)fail('Review qualification evidence in the profile editor.');
 if(b.confirmed!==true||typeof b.details!=='string'||b.details.trim().length<25||b.details.length>1500)fail('Confirm this is true and provide a specific example of 25–1500 characters.');const details=b.details.trim();
 if(!t.variants.some(v=>includes(details,v))||negative(details)||/\b(lorem ipsum|TBD|XYZ Company)\b/i.test(details))fail('Provide a genuine example containing the keyword, without placeholders or negative claims.');
 let s=r.sections.find(s=>s.type==='custom'&&s.title==='Additional Relevant Experience');if(!s){s={id:randomUUID(),type:'custom',title:'Additional Relevant Experience',visible:true,order:r.sections.length,contentType:'mixed',content:{paragraphs:[],bullets:[],entries:[]}};r.sections.push(s)}s.content.paragraphs.push(details);
 return {...analyseOptimizer(r,jd),confirmed:{term:t.term,message:'Only your explicitly confirmed evidence was added. Save to keep it.'}};
}
