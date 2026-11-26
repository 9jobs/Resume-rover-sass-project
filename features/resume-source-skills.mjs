import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {analyseOptimizer} from './resume-optimizer.mjs';
const vocabulary=Object.keys(JSON.parse(fs.readFileSync(new URL('../ontology/aliases.json',import.meta.url),'utf8')));
const pattern=term=>new RegExp('(?<![\\p{L}\\p{N}])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','iu');
// Only exact skills asserted in visible candidate content qualify as evidence.
// The JD, imported diagnostics, wishes and qualification names are excluded.
export function sourceSkillCandidates(resume){
 const sections=resume.sections.filter(s=>s.visible!==false);
 const existing=sections.filter(s=>s.type==='skills').flatMap(s=>[...(s.content.items||[]),...(s.content.categories||[]).flatMap(c=>c.items||[])]).join('\n');
 const evidence=sections.filter(s=>['summary','experience','projects'].includes(s.type)).flatMap(s=>[s.content.text||'',...(s.content.entries||[]).flatMap(e=>e.bullets||[])]).flatMap(line=>line.split(/(?<=[.!?])\s+|\n/)).filter(line=>! /\b(no|not|never|without|lack|lacking|learning|aspiring|seeking|interested|required|requirements|preferred|willing)\b/i.test(line));
 return vocabulary.filter(term=>!['RN','BLS','ACLS'].includes(term)&&!pattern(term).test(existing)).flatMap(term=>{const proof=evidence.find(line=>pattern(term).test(line));return proof?[{term,evidence:proof}]:[]});
}
export function consolidateSourceSkills(input){
 const resume=structuredClone(input);
 for(const section of resume.sections.filter(s=>s.type==='skills'&&s.visible!==false)){
  const seen=new Set(),unique=value=>{const text=String(value||'').trim(),key=text.toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu,' ').trim();if(!key||seen.has(key))return null;seen.add(key);return text};
  const categories=[],items=[];
  for(const category of section.content.categories||[]){const values=(category.items||[]).map(unique).filter(Boolean);if(values.length)categories.push({...category,items:values})}
  for(const item of section.content.items||[]){
   const match=String(item).match(/^([^:]{2,60})\s*:\s*(.+)$/);
   if(match){const value=unique(match[2]);if(value){const label=match[1].trim(),existing=categories.find(c=>(c.name||c.label||'').toLowerCase()===label.toLowerCase());if(existing)existing.items.push(value);else categories.push({name:label,items:[value]})}}
   else{const value=unique(item);if(value)items.push(value)}
  }
  if(categories.length){if(items.length)categories.push({name:'Additional skills',items});section.layout='categorized';section.content.items=[];section.content.categories=categories}
  else{section.content.items=items;section.content.categories=[]}
 }
 return resume;
}
export function applySourceSkills(input,jd='',expectedHash){
 let result=analyseOptimizer(input,jd);
 if(result.hash!==expectedHash)throw Object.assign(Error('Draft changed. Analyse again.'),{status:409});
 const added=[],changes=[];
 const consolidated=consolidateSourceSkills(result.resume);
 if(JSON.stringify(consolidated.sections)!==JSON.stringify(result.resume.sections)){
  const checked=analyseOptimizer(consolidated,jd);
  if(checked.fit&&checked.integrity.complete&&checked.analysis.score>=result.analysis.score){changes.push({label:'Consolidate repeated skills and preserve category labels',before:result.analysis.score,after:checked.analysis.score});result=checked}
 }
 for(const proof of sourceSkillCandidates(result.resume)){
  const candidate=structuredClone(result.resume);let skills=candidate.sections.find(s=>s.type==='skills'&&s.visible!==false);
  if(!skills){skills={id:randomUUID(),type:'skills',title:'Skills',visible:true,order:1,contentType:'mixed',content:{items:[],categories:[]}};candidate.sections.push(skills)}
  if(skills.layout==='categorized'){let category=skills.content.categories.find(c=>c.name==='Additional skills');if(!category){category={name:'Additional skills',items:[]};skills.content.categories.push(category)}category.items.push(proof.term)}
  else skills.content.items=[...(skills.content.items||[]),proof.term];
  const checked=analyseOptimizer(candidate,jd);
  if(!checked.fit||!checked.integrity.complete||checked.analysis.score<result.analysis.score)continue;
  result=checked;added.push(proof);
 }
 return {...result,sourcedSkills:added,sourceChanges:changes};
}
