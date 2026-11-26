const clean=value=>String(value||'').replace(/^[\s•●▪\uF0B7*-]+/u,'').replace(/\s+/g,' ').trim();
const key=value=>clean(value).toLowerCase();
// Correct only mappings corroborated by the retained upload; never infer skills,
// contact digits, credentials or work history from a target role or job advert.
export function recoverAtsSourceMappings(input){
 const source=String(input.rawImport?.rawText||'');if(!source)return input;
 const resume=structuredClone(input),lines=source.split(/\r?\n/).map(clean).filter(Boolean);
 const contactLines=lines.slice(0,lines.findIndex(line=>/^(?:(?:professional|career|work)\s+)?(?:summary|experience|education|references?)\s*:?$/i.test(line))<0?8:lines.findIndex(line=>/^(?:(?:professional|career|work)\s+)?(?:summary|experience|education|references?)\s*:?$/i.test(line)));
 if(!resume.profile.location||/^(?:professional\s+)?summary$|^contact$/i.test(resume.profile.location)){
  const labelled=contactLines.join('\n').match(/(?:^|\|)\s*(?:location|address|based in)\s*:\s*([^|\n]+)/i);
  const candidate=labelled?.[1]||contactLines.flatMap(line=>line.split('|')).map(clean).find(part=>/\b(?:VIC|NSW|QLD|WA|SA|TAS|ACT|NT)\b(?:\s*,?\s*\d{4})?$/i.test(part)&&!/@|https?:|\b(?:phone|mobile|tel)\s*:/i.test(part));
  if(candidate)resume.profile.location=candidate.trim();
 }
 // Pipes and semicolons delimit separate skills in common exported resumes.
 // Keep literal phrases; never infer a skill from a target position.
 for(const section of resume.sections.filter(s=>s.type==='skills')){
  section.content.items=(section.content.items||[]).flatMap(item=>String(item).split(/\s*[|;•]\s*/).map(clean).filter(Boolean));
  for(const category of section.content.categories||[])category.items=(category.items||[]).flatMap(item=>String(item).split(/\s*[|;•]\s*/).map(clean).filter(Boolean));
 }
 if(String(resume.profile.phone||'').replace(/\D/g,'').length<8){
  const contact=source.split(/^\s*(?:(?:professional|career|work)\s+)?(?:summary|experience|education|references?|referees?)\s*:?\s*$/im)[0];
  const match=contact.match(/^\s*(?:phone|mobile|tel(?:ephone)?)\s*:\s*(\+?\d[\d ()+.-]{6,}\d)/im);
  if(match&&match[1].replace(/\D/g,'').length>=8)resume.profile.phone=match[1].trim();
 }
 for(const section of resume.sections)for(const entry of section.content.entries||[]){
  const title=String(entry.title||''),prefix=title.replace(/\s*\(\s*$/,'').trim();
  if(prefix===title||!entry.dateRange||!/^\)(?:\s|$)/.test(entry.bullets?.[0]||''))continue;
  if(!lines.some(line=>line.startsWith(prefix)&&line.includes(entry.dateRange)&&line.endsWith(')')))continue;
  entry.title=prefix;entry.bullets=[entry.bullets[0].replace(/^\)\s*/,''),...entry.bullets.slice(1)].filter(Boolean);
  if(!entry.organization&&/\s+[–—]\s+/.test(prefix)){const parts=prefix.split(/\s+[–—]\s+/);entry.title=parts.shift();entry.organization=parts.join(' – ')}
 }
 const heading=/^(?:tools?\s*(?:&|and)\s*technologies|technical\s+(?:skills|expertise)|skills\s*(?:&|and)\s*(?:tools|expertise))\s*:?$/i;
 const stop=/^(?:(?:professional|work|academic)\s+)?(?:certifications?|licen[cs]es?|education|qualifications|experience|projects?|references?|summary)\s*:?$/i;
 const rows=[];let active=false;
 for(const line of lines){if(heading.test(line)){active=true;continue}if(active&&stop.test(line))active=false;if(active)rows.push(line)}
 const categories=rows.flatMap(line=>{const m=line.match(/^([^:]{2,60}):\s*(.+)$/);return m?[{name:m[1].trim(),items:m[2].split(/[,;]/).map(clean).filter(Boolean)}]:[]});
 if(categories.length){
  let skills=resume.sections.find(s=>s.type==='skills');if(!skills){skills={id:'source-tools-skills',type:'skills',title:'Skills',order:1,visible:true,content:{items:[],categories:[]}};resume.sections.push(skills)}
  const existing=[...(skills.content.items||[]),...(skills.content.categories||[]).flatMap(c=>c.items||[])],seen=new Set();
  const recovered=categories.map(c=>({...c,items:c.items.filter(item=>{const k=key(item);if(seen.has(k))return false;seen.add(k);return true})})).filter(c=>c.items.length);
  const extra=existing.filter(item=>{const k=key(item);if(seen.has(k))return false;seen.add(k);return true});if(extra.length)recovered.push({name:'Additional skills',items:extra});
  skills.layout='categorized';skills.visible=true;skills.content={items:[],categories:recovered};
  const inventory=new Set(rows.map(key));
  for(const section of resume.sections.filter(s=>['experience','projects'].includes(s.type)))for(const entry of section.content.entries||[]){
   entry.bullets=(entry.bullets||[]).filter(text=>!inventory.has(key(text))).map(text=>text.replace(/\s+Tools?\s*(?:&|and)\s*Technologies\s*$/i,''));
  }
 }
 const education=resume.sections.find(s=>s.type==='education');
 if(education?.content.entries?.some(e=>!String(e.title||'').trim())){
  const rows=[];let active=false;
  for(const line of lines){if(/^education\s*:?$/i.test(line)){active=true;continue}if(!active)continue;if(/^(?:certifications?|references?|experience|skills|tools\s*&\s*technologies)\s*:?$/i.test(line))break;
   if(/^(?:bachelor|master|diploma|certificate|doctor|ph\.?d)\b/i.test(line))rows.push(line);else if(rows.length)rows[rows.length-1]+=' '+line;
  }
  const entries=rows.flatMap((row,index)=>{const date=row.match(/\(((?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))\)\s*$/i),text=date?row.slice(0,date.index).trim():row,comma=text.lastIndexOf(',');if(!date||comma<0)return [];return [{id:'source-education-row-'+index,title:text.slice(0,comma).trim(),organization:text.slice(comma+1).trim(),dateRange:date[1],bullets:[]}]});
  if(entries.length===rows.length&&entries.length)education.content={entries,paragraphs:[],bullets:[],blocks:[]};
 }
 return resume;
}
