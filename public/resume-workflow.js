import {normalizeSourceListMarkers} from './source-list-markers.js';
import {structureDatedSourceEntries,sourceSkillsHeading,repairSourceEntryHeader} from './source-entry-structure.js';
export const RESUME_DESIGNS=[{"id":"navy-right","name":"Navy Sidebar","family":"sidebar","side":"right","color":"0B2B49","accent":"0B2B49","font":"Calibri"},{"id":"charcoal-left","name":"Charcoal Profile","family":"sidebar","side":"left","color":"34383D","accent":"34383D","font":"Arial"},{"id":"editorial-blue","name":"Editorial Blue","family":"editorial","side":"left","color":"F1F5F9","accent":"174EA6","font":"Arial","summarySide":true},{"id":"teal-left","name":"Teal Portfolio","family":"sidebar","side":"left","color":"115E59","accent":"115E59","font":"Calibri"},{"id":"violet-right","name":"Violet Studio","family":"sidebar","side":"right","color":"4C1D95","accent":"6D28D9","font":"Arial"},{"id":"sand-right","name":"Warm Editorial","family":"editorial","side":"right","color":"F4EDE3","accent":"7C4A2D","font":"Times New Roman","summarySide":true},{"id":"slate-left","name":"Slate Professional","family":"sidebar","side":"left","color":"1E3A5F","accent":"1E3A5F","font":"Calibri"},{"id":"sage-left","name":"Sage Minimal","family":"editorial","side":"left","color":"E8F0EA","accent":"35624A","font":"Arial"},{"id":"executive-serif","name":"Executive Serif","family":"single","accent":"26344A","font":"Times New Roman","rule":true},{"id":"modern-blue","name":"Modern Blue","family":"single","accent":"2563EB","font":"Calibri","topbar":true},{"id":"classic-ruled","name":"Classic Ruled","family":"single","accent":"111827","font":"Times New Roman","rule":true,"center":true},{"id":"minimal-teal","name":"Minimal Teal","family":"single","accent":"0F766E","font":"Arial","topbar":true}];
export function resumeImprovementPlan(resume,analysis){
 const bullets=guidedBulletChoices(resume),words=t=>t.trim().split(/\s+/).length;
 const short=bullets.filter(b=>words(b.text)<7),long=bullets.filter(b=>words(b.text)>32),unmeasured=bullets.filter(b=>!/[0-9]/.test(b.text));
 const entries=resume.sections.filter(s=>s.visible!==false&&['experience','projects'].includes(s.type)).flatMap(s=>s.content.entries||[]),missingDates=entries.filter(e=>!e.dateRange?.trim()).length,longHeaders=entries.filter(e=>[e.title,e.organization].filter(Boolean).join(' ').length>110).length;
 const starts=new Map();for(const b of bullets){const start=b.text.toLowerCase().split(/\s+/).slice(0,2).join(' ');starts.set(start,(starts.get(start)||0)+1)}
 const skills=resume.sections.filter(s=>s.type==='skills').flatMap(s=>[...(s.content.items||[]),...(s.content.categories||[]).flatMap(c=>c.items||[])]),missing=(analysis?.keywords||[]).filter(k=>k.status==='missing');
 const cap=analysis?.keywordCoverage===null||analysis?.keywordCoverage===undefined?null:Math.round(70+.3*analysis.keywordCoverage);
 return {score:analysis?.score,remainingTo95:Math.max(0,95-(analysis?.score||0)),missing:missing.map(k=>k.term),currentCoverageCeiling:cap,blockedByMissingFacts:cap!==null&&cap<95,weakBullets:short.length,longBullets:long.length,unmeasuredBullets:unmeasured.length,repeatedOpeners:[...starts].filter(([,n])=>n>1).map(([t])=>t),skillsCount:skills.length,issues:[
  {mode:'bullet',label:'Specific, concise achievements',detail:short.length+' vague and '+long.length+' long bullets to review.'},
  {mode:'bullet',label:'Verified outcomes',detail:unmeasured.length+' bullets have no numbers. Add measurable results only when you have real figures; qualitative outcomes are valid too.'},
  {mode:'bullet',label:'Role headings and dates',detail:missingDates+' entries need date review; '+longHeaders+' headings contain long prose. Keep title/company/date separate from achievement bullets.'},
  {mode:'summary',label:'Summary and role alignment',detail:'Keep it concise and grounded in your real background. Do not add years or qualifications you cannot support.'},
  {mode:'skills',label:'Skills and tools',detail:skills.length+' listed skills. Add missing tools only with genuine usage evidence; keep the list relevant.'},
  {mode:'contact',label:'Contact information',detail:/^(professional summary|summary|skills|experience)$/i.test(resume.profile.location||'')?'An imported heading was mistaken for your location. Correct the city.':'Verify email, phone, city and profile links.'}
 ],lostCategories:(analysis?.breakdown||[]).filter(c=>c.points<c.max).sort((a,b)=>(b.max-b.points)-(a.max-a.points)).map(c=>({label:c.label,lost:Math.round((c.max-c.points)*10)/10,issues:c.issues||[]}))};
}
export function reviseResumeSection(source,mode,fields){
 const resume=structuredClone(source),clean=t=>String(t||'').trim(),normal=t=>clean(t).toLowerCase().replace(/\s+/g,' '),placeholder=t=>/\b(lorem ipsum|TBD|XYZ Company)\b/i.test(t);
 if(mode==='summary'){
  const text=clean(fields.text);if(text.length<40||text.length>1500||placeholder(text))throw Error('Write a factual summary of 40–1500 characters without placeholders.');
  const factualText=source.sections.flatMap(s=>[s.type==='summary'?s.content.text||'':'',...(s.content.entries||[]).flatMap(e=>[e.description||'',...(e.bullets||[])])]).join(' '),knownNumbers=new Set(factualText.match(/\b\d+(?:\.\d+)?%?/g)||[]);if((text.match(/\b\d+(?:\.\d+)?%?/g)||[]).some(n=>!knownNumbers.has(n)))throw Error('Add verified numbers to your experience first; the summary cannot invent years or metrics.');
  let section=resume.sections.find(s=>s.type==='summary');if(!section){section={id:'reviewed-summary',type:'summary',title:'PROFESSIONAL SUMMARY',order:0,visible:true,contentType:'paragraph',content:{text:''}};resume.sections.unshift(section)}section.content.text=text;section.visible=true;
 }else if(mode==='skills'){
  const items=[...new Set(clean(fields.text).split(/[,;\n]/).map(clean).filter(Boolean))];if(!items.length||items.length>40||items.some(x=>x.length>100||placeholder(x)))throw Error('Use 1–40 genuine skills, one per line or separated by commas.');
  const includesTerm=(text,term)=>new RegExp('(?<![\\p{L}\\p{N}])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\const original=JSON.stringify(source.sections.filter(s=>s.visible!==false).map(s=>s.content)).toLowerCase(),newSkills=items.filter(x=>!original.includes(normal(x))),evidence=clean(fields.evidence);')+'(?![\\p{L}\\p{N}])','iu').test(text);const original=JSON.stringify(source.sections.filter(s=>s.visible!==false).map(s=>s.content)),newSkills=items.filter(x=>!includesTerm(original,x)),evidence=clean(fields.evidence);
  if(newSkills.some(x=>/\b(RN|BLS|ACLS|licen[cs]e|certification|degree|clearance)\b/i.test(x)))throw Error('Enter and verify qualifications in the certifications/education section, not as a new unsupported skill.');
  if(newSkills.length&&(evidence.length<25||newSkills.some(x=>!includesTerm(evidence,x))||/\b(never|not used|learning|aspiring|TBD)\b/i.test(evidence)))throw Error('Provide a specific genuine usage example containing each newly added skill (at least 25 characters).');
  let section=resume.sections.find(s=>s.type==='skills');if(!section){section={id:'reviewed-skills',type:'skills',title:'SKILLS',visible:true,order:1,layout:'compact-list',contentType:'mixed',content:{items:[],categories:[]}};resume.sections.push(section)}section.content.items=items;section.content.categories=[];section.layout='compact-list';section.visible=true;
  if(newSkills.length){let proof=resume.sections.find(s=>s.id==='reviewed-skill-evidence');if(!proof){proof={id:'reviewed-skill-evidence',type:'custom',title:'Additional Relevant Experience',visible:true,order:resume.sections.length,contentType:'mixed',content:{paragraphs:[],entries:[],bullets:[]}};resume.sections.push(proof)}if(!proof.content.paragraphs.includes(evidence))proof.content.paragraphs.push(evidence)}
 }else if(mode==='contact'){
  const p={...resume.profile};for(const key of ['fullName','email','phone','location','linkedin'])p[key]=clean(fields[key]);
  if(!p.fullName||placeholder(p.fullName))throw Error('Enter your real name.');if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))throw Error('Enter a valid email.');
  if(/^(professional summary|summary|skills|experience)$/i.test(p.location))throw Error('Enter your actual city, not a section heading.');
  if(p.linkedin){try{const url=new URL(p.linkedin);if(!['http:','https:'].includes(url.protocol)||!url.hostname.includes('.'))throw Error()}catch{throw Error('Enter a complete valid profile URL.')}}resume.profile=p;
 }else throw Error('Choose summary, skills or contact details.');
 if(JSON.stringify(resume)===JSON.stringify(source))throw Error('Make an edit before previewing the score.');return resume;
}

export function guidedBulletChoices(resume){
 const choices=[];
 for(const s of resume.sections||[])if(s.visible!==false&&['experience','projects'].includes(s.type))for(const e of s.content.entries||[])for(const [index,text] of (e.bullets||[]).entries()){
  const words=text.trim().split(/\s+/).length,priority=words<7?3:words>45?2:!/[0-9]/.test(text)?1:0;
  choices.push({sectionId:s.id,entryId:e.id,index,text,label:e.title||s.title,priority,reason:words<7?'Add specific work details':words>45?'Shorten this long bullet':'Add a genuine result if available'});
 }
 return choices.sort((a,b)=>b.priority-a.priority);
}
export function reviseGuidedBullet(source,choice,text){
 const resume=structuredClone(source),entry=resume.sections.find(s=>s.id===choice.sectionId)?.content.entries?.find(e=>e.id===choice.entryId);
 if(!entry||entry.bullets[choice.index]!==choice.text)throw Error('This bullet changed. Open a fresh improvement.');
 const next=String(text||'').trim().replace(/^(?:\s*[•●▪-]\s*)+/u,'');
 if(next.length<25||next.length>1500)throw Error('Describe your real work in 25–1500 characters.');
 if(/\b(?:lorem ipsum|TBD|XYZ Company)\b/i.test(next))throw Error('Use real details instead of placeholders.');
 if(next===choice.text.trim())throw Error('Edit this bullet before previewing the impact.');
 entry.bullets[choice.index]=next;return resume;
}

export function structureSourceProjects(sourceLines){
 const month='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
 const date='(?:'+month+'\\s+)?(?:19|20)\\d{2}';
 const range=date+'\\s*[-–—]\\s*(?:'+date+'|Present|Current)';
 const datedTitle=new RegExp('^(.+?)\\s*\\|\\s*('+range+')\\s*$','i');
 // Restore explicit inline list markers, without splitting date ranges or hyphenated titles.
 const text=sourceLines.map(String).join('\n').replace(/[ \t]+-[ \t]+(?=(?:Developed|Designed|Gained|Built|Implemented|Created|Integrated|Tested|Delivered|Maintained|Documented|Optimized|Optimised|Used|Collaborated|Managed)\b)/g,'\n- ')
  .replace(new RegExp('([.!?])\\s+(?=[^\\n.!?]{2,120}\\s*\\|\\s*'+range+')','g'),'$1\n');
 const lines=text.split('\n').map(line=>line.trim()).filter(Boolean),entries=[];let current=null,lastBullet=false;
 const technology=line=>/^(?:technologies|technology|tech\s*stack|tools(?:\s*(?:and|&)\s*technologies)?)\s*:/i.test(line||'');
 for(let i=0;i<lines.length;i++){
  const line=lines[i],bullet=/^[•●▪*-]\s+/u.test(line),text=line.replace(/^[•●▪*-]\s+/u,''),dated=!bullet&&line.match(datedTitle);
  if(!bullet&&!technology(line)&&(dated||technology(lines[i+1]))){current={id:'source-project-'+entries.length,title:dated?dated[1].trim():text,organization:'',location:'',subtitle:'',dateRange:dated?dated[2].trim():'',url:'',bullets:[]};entries.push(current);lastBullet=false;continue}
  if(!current)return null;
  if(technology(line)){current.subtitle=line;lastBullet=false;continue}
  if(bullet){current.bullets.push(text);lastBullet=true;continue}
  if(lastBullet)current.bullets[current.bullets.length-1]+=' '+text;
  else if(current.subtitle)current.subtitle+=' '+text;
  else return null;
 }
 return entries.length?entries:null;
}
export function restoreImportedSourceContent(input){
 const resume=structuredClone(input),raw=normalizeSourceListMarkers(resume.rawImport?.rawText);if(!raw)return resume;
 const headings={summary:/^(?:professional\s+|career\s+)?(?:summary|profile|objective)$/i,skills:sourceSkillsHeading,experience:/^(?:(?:professional|work|employment|career)\s+)?(?:experience|history)$/i,education:/^(?:education|qualifications|academic background)$/i,projects:/^(?:(?:personal|academic|key|industry)\s+)?projects?$/i,certifications:/^(?:(?:licenses?|licences?)\s+(?:and|&)\s+certifications?|certifications?|licenses?|licences?|training)$/i,achievements:/^(?:key\s+)?achievements?$/i,awards:/^awards$/i,interests:/^interests$/i,languages:/^languages$/i,references:/^references$/i};
 const segments={};let active='';
 for(const rawLine of raw.replace(/\r/g,'').split('\n')){const line=rawLine.trim(),plain=line.replace(/^[•●▪*-]\s*/u,'').replace(/\s*:\s*$/,'');const type=Object.keys(headings).find(k=>headings[k].test(plain));if(type){active=type;segments[type]||=[];continue}if(active&&line&&!/^page\s+\d+(?:\s+of\s+\d+)?$/i.test(line))segments[active].push(line)}
 const norm=value=>String(value||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const section=type=>{let s=resume.sections.find(s=>s.type===type);if(!s){s={id:'source-'+type,type,title:type.toUpperCase(),visible:true,order:resume.sections.length,content:{}};resume.sections.push(s)}return s};
 if(segments.summary?.length){const s=section('summary');s.visible=true;s.content.text=segments.summary.join(' ')}
 for(const type of ['experience','projects']){
  const lines=segments[type];if(!lines?.length)continue;const s=section(type),old=s.content.entries||[],entries=[];let current=null,lastBullet=false,unassigned=[];
  if(type==='projects'){const projects=structureSourceProjects(lines);if(projects){s.content={entries:projects,paragraphs:[],bullets:[],blocks:[]};s.visible=true;continue}}
  const datedEntries=structureDatedSourceEntries(lines,type);if(datedEntries){s.content={entries:datedEntries,paragraphs:[],bullets:[],blocks:[]};s.visible=true;continue}
  for(const line of lines){
   const bullet=/^[•●▪*-]\s+/u.test(line),text=line.replace(/^[•●▪*-]\s+/u,'');
   const matches=!bullet?old.filter(e=>norm(e.title)&&norm(line).startsWith(norm(e.title))&&(line.includes('|')||norm(line)===norm(e.title))):[];
   const match=matches.find(e=>norm(e.organization)&&norm(line).includes(norm(e.organization)))||matches.find(e=>!entries.some(item=>item.id===e.id));
   if(match){current={...structuredClone(match),subtitle:'',description:'',bullets:[]};const parts=line.split('|').map(p=>p.trim());if(parts.length>1){current.title=parts[0];current.organization=parts[1]||match.organization;const dated=part=>/\b(?:(?:19|20)\d{2}|present|current)\b/i.test(part);const metadata=parts.slice(2);current.location=metadata.filter(part=>!dated(part)).join(' | ');const dates=metadata.filter(dated);if(dates.length)current.dateRange=dates.join(' | ')}entries.push(current);lastBullet=false;continue}
   if(current&&bullet){current.bullets.push(text);lastBullet=true}
   else if(current&&lastBullet){current.bullets[current.bullets.length-1]+=' '+text}
   else if(current){const metadata=norm([current.organization,current.location,current.dateRange].join(' '));if(!metadata.includes(norm(text))&&(!norm(current.dateRange)||!norm(text).includes(norm(current.dateRange)))){current.subtitle=[current.subtitle,text].filter(Boolean).join(' ')}lastBullet=false}
   else unassigned.push(line);
  }
  if(entries.length&&!unassigned.length){s.content={...s.content,entries,paragraphs:[],bullets:[],blocks:[]};s.visible=true}
  else{s.content={entries:[],paragraphs:[lines.join('\n')],bullets:[],blocks:[]};s.visible=true}
 }
 const logicalParagraphs=lines=>{const paragraphs=[];let bullet=false;for(const line of lines){const marked=/^[•●▪*-]\s+/u.test(line),text=line.replace(/^[•●▪*-]\s+/u,'');if(!marked&&bullet&&paragraphs.length)paragraphs[paragraphs.length-1]+=' '+text;else paragraphs.push(text);if(marked)bullet=true}return paragraphs};
 if(segments.certifications?.length){const s=section('certifications');s.visible=true;s.content={entries:[],paragraphs:[],bullets:logicalParagraphs(segments.certifications),blocks:[]}}
 for(const kind of ['achievements','awards','interests','languages','references'])if(segments[kind]?.length){let s=resume.sections.find(s=>s.type==='custom'&&s.title?.toLowerCase()===kind);if(!s){s={id:'source-'+kind,type:'custom',title:kind.toUpperCase(),visible:true,order:resume.sections.length,content:{}};resume.sections.push(s)}s.visible=true;s.content={entries:[],paragraphs:[],bullets:logicalParagraphs(segments[kind]),blocks:[]}}
 if(segments.education?.length){const s=section('education'),entries=[];let current=null;
  for(const line of segments.education){if(/^(?:master|bachelor|doctor|ph\.?d|diploma|associate|certificate|b\.?(?:sc|tech|eng)|m\.?(?:sc|tech|eng))\b/i.test(line)){const parts=line.split('|').map(x=>x.trim()).filter(Boolean),title=parts.shift(),dateRange=parts.length&&/\b(?:19|20)\d{2}\b/.test(parts.at(-1))?parts.pop():'';current={id:'source-education-'+entries.length,title,organization:parts.join(' | '),dateRange,bullets:[]};entries.push(current)}else if(current)current.bullets.push(line)}
  if(entries.length){s.visible=true;s.content={entries,paragraphs:[],bullets:[],blocks:[]}}
 }
 if(segments.skills?.length){
  const s=section('skills'),logical=[];let inBullet=false;
  for(const line of segments.skills){const bullet=/^[•●▪*-]\s+/u.test(line),text=line.replace(/^[•●▪*-]\s+/u,'');if(!bullet&&logical.length&&(inBullet||(!text.includes(':')&&logical.at(-1).includes(':'))))logical[logical.length-1]+=' '+text;else logical.push(text);if(bullet)inBullet=true}
  const split=text=>text.split(/[,;•]/u).map(x=>x.trim()).filter(Boolean),categories=[],items=[];
  for(const line of logical){const match=line.match(/^([^:]{2,60})\s*:\s*(.+)$/);if(match)categories.push({name:match[1].trim(),items:split(match[2])});else items.push(...split(line))}
  if(segments.skills.some(line=>/^-\s+/.test(line))){s.layout='source-bullets';s.content={items:logical,categories:[]}}
  else if(categories.length){if(items.length)categories.push({name:'Additional skills',items});s.layout='categorized';s.content={items:[],categories}}
  else{s.layout='compact-list';s.content={items,categories:[]}}s.visible=true;
 }
 return resume;
}
export function recoverImportedSkills(input,{restoreSource=false}={}){
 if(restoreSource)input=restoreImportedSourceContent(input);
 const resume=structuredClone(input),source=restoreSource?'':resume.rawImport?.rawText||'',found=[];
 // A flattened import can append the following Skills heading to the last project.
 // Remove only an explicit trailing list corroborated by the existing Skills section.
 const skillKey=text=>String(text||'').trim().toLowerCase().replace(/\s+/g,' ');
 const knownSkills=new Set((resume.sections||[]).filter(s=>s.type==='skills').flatMap(s=>[...(s.content.items||[]),...(s.content.categories||[]).flatMap(c=>c.items||[])]).flatMap(text=>String(text).split(/[,;|\n]/)).map(skillKey).filter(Boolean));
 const cleanProjectText=value=>{
  if(typeof value!=='string')return value;
  const boundary=/(?:^|[.!?]\s+|\n\s*|\s+(?=SKILLS\s*(?:&|and)\s*COMPETENCIES))(?:technical\s+)?skills?(?:\s*(?:&|and)\s*competencies)?\s*:?\s+([^\n]+(?:\n[^\n]+)*)$/i.exec(value);
  if(!boundary)return value;
  const items=boundary[1].split(/[,;|\n]/).map(skillKey).filter(Boolean);
  if(items.length<3||new Set(items.filter(item=>knownSkills.has(item))).size<3)return value;
  // Keep the punctuation ending the genuine project bullet.
  return value.slice(0,boundary.index+( /^[.!?]/.test(boundary[0])?1:0)).trimEnd();
 };
 for(const section of resume.sections||[])if(section.type==='projects'){
  for(const field of ['paragraphs','bullets'])if(Array.isArray(section.content[field]))section.content[field]=section.content[field].map(cleanProjectText).filter(Boolean);
  for(const entry of section.content.entries||[]){
   if(Array.isArray(entry.bullets))entry.bullets=entry.bullets.map(cleanProjectText).filter(Boolean);
   for(const field of ['title','description','subtitle'])if(typeof entry[field]==='string')entry[field]=cleanProjectText(entry[field]);
  }
 }
 // Repair a previously imported project paragraph from its own current text,
 // without restoring old source over a user's subsequent edits.
 for(const s of resume.sections||[])if(['experience','projects'].includes(s.type)&&!s.content.entries?.length&&s.content.paragraphs?.length){const lines=s.content.paragraphs.join('\n').split('\n'),entries=(s.type==='projects'&&structureSourceProjects(lines))||structureDatedSourceEntries(lines,s.type);if(entries)s.content={entries,paragraphs:[],bullets:[],blocks:[]}}
 // Some legacy imports placed the dated heading AND its prose into a title.
 // Repair only that malformed entry, using its current text rather than old source.
 for(const s of resume.sections||[])if(['experience','projects'].includes(s.type)&&s.content.entries?.length)s.content.entries=s.content.entries.flatMap(entry=>repairSourceEntryHeader(entry,s.type));
 resume.sections=resume.sections.filter(s=>!['references','referees'].includes(s.type)&&!/^(?:(?:professional|personal|employment|character)\s+)?(?:references?|referees?)(?:\s*(?:and|&)\s*(?:references?|referees?))?\s*:?$/i.test(s.title?.trim()||''));
 // Import diagnostics stay in the draft/source, never in the candidate's document.
 for(const section of resume.sections||[])if(/^imported source recovery$/i.test(section.title?.trim()||''))section.visible=false;
 if(/^professional\s+summary\s*:?$/i.test(resume.profile?.location?.trim()||''))resume.profile.location='';
 const split=text=>{let depth=0;return [...text].map(c=>{if(c==='(')depth++;if(c===')')depth=Math.max(0,depth-1);return !depth&&/[,;|•]/.test(c)?'\n':c}).join('').split('\n').map(x=>x.replace(/^[\s•▪*-]+/,'').trim()).filter(x=>x&&x.length<=100&&x.split(/\s+/).length<=12)};
 let active=false,buffer=[];
 const finish=()=>{if(buffer.length)found.push(...split(buffer.join(buffer.some(x=>/[,;|]/.test(x))?' ':'; ')));buffer=[]};
 for(const raw of source.replace(/\r/g,'').split('\n')){
  const line=raw.trim(),heading=line.match(/^(?:(?:technical|professional|core|key|additional|soft|hard)\s+)?(?:skills?(?:\s*(?:&|and)\s*competencies)?|competencies|technical expertise)(?:\s*:\s*(.*))?$/i);
  if(heading){finish();active=true;if(heading[1])buffer.push(heading[1]);continue}
  if(active&&/^(?:(?:professional|work|employment|career|project)\s+)?(?:experience|history|summary|profile|objective|projects?|education|qualifications|certifications?|licenses?|licences?|awards|achievements|references?|interests|languages)\s*:?$/i.test(line)){finish();active=false}
  if(!active||!line)continue;
  const category=line.match(/^(?:programming languages?|testing(?: tools?| skills?)?|tools?(?:\s*(?:&|and)\s*technologies)?|frameworks?|databases?|methodologies|soft skills?|technical skills?)\s*:\s*(.*)$/i);
  if(category){finish();buffer.push(category[1]);continue}
  if(/^(?:programming languages?|tools?|frameworks?|databases?|methodologies)\s*:?$/i.test(line)){finish();continue}
  buffer.push(line);
 }
 finish();
 // The legacy importer sometimes converts the explicit skills inventory into one synthetic bullet.
 for(const section of resume.sections||[])for(const entry of section.content?.entries||[]){entry.bullets=(entry.bullets||[]).filter(b=>{if(!/^Configured skill\s+/i.test(b))return true;const items=split(b.replace(/^Configured skill\s+/i,''));if(items.length<6)return true;found.push(...items);return false})}
 let skills=resume.sections.find(s=>s.type==='skills');
 const existing=skills?[...(skills.content.items||[]),...(skills.content.categories||[]).flatMap(c=>c.items||[])]:[];
 const seen=new Set(),items=[...existing,...found].filter(x=>{if(typeof x!=='string')return false;const k=x.toLowerCase().replace(/\s+/g,' ').replace(/[.]+$/,'').trim();if(!k||seen.has(k))return false;seen.add(k);return true});
 if(items.length){
  if(!skills){skills={id:'recovered-skills',type:'skills',title:'SKILLS',visible:true,order:1,contentType:'mixed',content:{items:[],categories:[]}};resume.sections.push(skills)}
  if(skills.layout==='categorized'&&skills.content.categories?.some(c=>c.name&&c.items?.length)){
   const present=new Set(skills.content.categories.flatMap(c=>c.items||[]).map(x=>String(x).toLowerCase().replace(/\s+/g,' ').replace(/[.]+$/,'').trim()));
   const extra=items.filter(x=>!present.has(x.toLowerCase().replace(/\s+/g,' ').replace(/[.]+$/,'').trim()));
   if(extra.length){let category=skills.content.categories.find(c=>c.name==='Additional skills');if(!category){category={name:'Additional skills',items:[]};skills.content.categories.push(category)}category.items.push(...extra)}skills.content.items=[];
  }else{skills.layout=skills.layout==='categorized'?'compact-list':skills.layout;skills.content.items=items;skills.content.categories=[]}
 }
 return resume;
}

export function keywordTermsAdded(before,after){
 const previous=new Set((before||[]).filter(t=>t.status==='matched').map(t=>t.term));
 return (after||[]).filter(t=>t.status==='matched'&&!previous.has(t.term)).map(t=>t.term);
}
export function highlightResumeKeywords(frame,terms){
 const doc=frame?.contentDocument;if(!doc?.body)return;
 doc.querySelectorAll('mark[data-resume-keyword]').forEach(m=>m.replaceWith(doc.createTextNode(m.textContent)));doc.body.normalize();
 const values=[...new Set(terms||[])].filter(Boolean).sort((a,b)=>b.length-a.length);if(!values.length)return;
 const pattern=values.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const re=new RegExp('(?<![\\p{L}\\p{N}])('+pattern+')(?![\\p{L}\\p{N}])','giu');
 const walker=doc.createTreeWalker(doc.body,4),nodes=[];while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest('.block')&&!n.parentElement.closest('style,script'))nodes.push(n)}
 for(const node of nodes){const text=node.textContent;re.lastIndex=0;const matches=[...text.matchAll(re)];if(!matches.length)continue;const fragment=doc.createDocumentFragment();let pos=0;for(const m of matches){fragment.append(doc.createTextNode(text.slice(pos,m.index)));const mark=doc.createElement('mark');mark.dataset.resumeKeyword=m[0];mark.textContent=m[0];mark.style.cssText='background:#bbf7d0;color:#064e3b;border-radius:2px;padding:0;';fragment.append(mark);pos=m.index+m[0].length}fragment.append(doc.createTextNode(text.slice(pos)));node.replaceWith(fragment)}
}


export function applyResumeAutofill(current,imported,metadata,fileName=''){
 const resume=recoverImportedSkills(imported,{restoreSource:true}),meta=structuredClone(metadata);
 resume.targetRole=current.targetRole?.trim()||resume.targetRole||'';
 resume.documentSettings={...resume.documentSettings,...current.documentSettings};
 if(!meta.title?.trim())meta.title=(fileName.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||resume.profile.fullName||'Imported resume')+' · tailored resume';
 const skills=resume.sections.find(s=>s.type==='skills');
 if(skills){const items=[...(skills.content.items||[]),...(skills.content.categories||[]).flatMap(c=>c.items||[])];skills.content.items=[...new Set(items.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];skills.content.categories=[];if(skills.layout==='categorized')skills.layout='compact-list'}
 const counts=Object.fromEntries(['experience','education','projects'].map(type=>[type,resume.sections.filter(s=>s.type===type).reduce((n,s)=>n+(s.content.entries?.length||0),0)]));
 counts.skills=skills?.content.items?.length||0;
 return {resume,meta,counts};
}
// Build a shorter, reversible edition using source excerpts only. No AI facts.
const clone=value=>structuredClone(value);
const normal=value=>String(value||'').replace(/^[\s•●▪-]+/,'').replace(/\s+/g,' ').trim();
const key=value=>normal(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
function unique(items){const seen=new Set();return items.filter(value=>{const k=key(value);if(!k||seen.has(k))return false;seen.add(k);return true})}
function sentences(text){return normal(text).split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean)}
function rank(text,terms){const words=new Set(normal(text).toLowerCase().match(/[\p{L}\p{N}+#]+/gu)||[]);return [...terms].filter(t=>words.has(t)).length*3+(/\d/.test(text)?2:0)}
function top(items,limit,terms){return items.map((text,index)=>({text,index,score:rank(text,terms)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).sort((a,b)=>a.index-b.index).map(x=>x.text)}
export function conciseEdition(source,jd='',level=0){
 const result=clone(source),terms=new Set((jd.toLowerCase().match(/[\p{L}\p{N}+#]{3,}/gu)||[]).filter(w=>!['the','and','with','for','you','will','our','that','this','have','from'].includes(w)));
 const limits=[{recent:4,older:3,project:2,summary:3,skills:28},{recent:3,older:2,project:2,summary:2,skills:22},{recent:2,older:2,project:1,summary:2,skills:18},{recent:2,older:1,project:1,summary:1,skills:14},{recent:1,older:1,project:1,summary:1,skills:10}][Math.min(4,level)];
 let omittedBullets=0,shortenedSummaries=0,omittedSkills=0,omittedParagraphs=0,omittedEntries=0;
 for(const section of result.sections||[]){
  const c=section.content||{};
  if(section.type==='summary'&&c.text){const original=c.text,parts=unique(sentences(original));c.text=parts.slice(0,limits.summary).join(' ');const max=[110,90,75,60,45][Math.min(4,level)],words=c.text.split(/\s+/);if(words.length>max)c.text=words.slice(0,max).join(' ').replace(/[,:;]+$/,'')+'…';if(c.text!==original)shortenedSummaries++}
  if(Array.isArray(c.entries)){
   const caps={experience:[6,5,4,3,2],projects:[3,2,2,1,1],education:[4,3,3,2,2],certifications:[6,5,4,3,2]},cap=caps[section.type]?.[Math.min(4,level)];
   if(cap&&c.entries.length>cap){omittedEntries+=c.entries.length-cap;c.entries=c.entries.slice(0,cap)}
  }
  for(const [index,entry] of (c.entries||[]).entries()){
   const original=entry.bullets||[];let bullets=unique(original);
   if(section.type==='experience'||section.type==='projects')bullets=top(bullets,section.type==='projects'?limits.project:index===0?limits.recent:limits.older,terms);
   entry.bullets=bullets;omittedBullets+=original.length-bullets.length;
  }
  if(section.type==='skills'){
   if(Array.isArray(c.items)){const old=c.items;c.items=top(unique(old),limits.skills,terms);omittedSkills+=old.length-c.items.length}
   if(c.categories?.length){
    const all=c.categories.flatMap((category,index)=>unique(category.items||[]).map(text=>({text,index}))),chosen=top(unique(all.map(item=>item.text)),limits.skills,terms),remaining=new Set(chosen.map(key));
    c.categories=c.categories.map(category=>({...category,items:unique(category.items||[]).filter(item=>{const id=key(item);if(!remaining.has(id))return false;remaining.delete(id);return true})})).filter(category=>category.items.length);omittedSkills+=all.length-c.categories.reduce((n,category)=>n+category.items.length,0);
   }
  }
  // Preserve custom certifications/licences. Only deduplicate their identical text.
  for(const field of ['paragraphs','bullets'])if(Array.isArray(c[field])){const old=c[field];c[field]=unique(old);if(['experience','projects','custom'].includes(section.type)&&!/certif|licen[cs]|qualification/i.test(section.title||'')){const max=[240,180,130,90,60][Math.min(4,level)];c[field]=c[field].slice(0,[4,3,3,2,1][Math.min(4,level)]).map(text=>{const words=text.split(/\s+/);return words.length>max?words.slice(0,max).join(' ').replace(/[,:;]+$/,'')+'…':text})}omittedParagraphs+=old.length-c[field].length}
 }
 // Import recovery is an audit copy of the original import, not another resume section.
 // Keep its full text in the source edition and omit it only in this explicit concise edition.
 for(const section of result.sections||[])if(/imported source recovery/i.test(section.title||'')){section.visible=false;omittedParagraphs++}
 result.documentSettings={...result.documentSettings,resumeLength:1};
 return {resume:result,changes:{omittedBullets,shortenedSummaries,omittedSkills,omittedParagraphs,omittedEntries}};
}
export async function fitConciseEdition(source,jd,review,current=()=>true){
 let last;
 for(let level=0;level<5;level++){
  if(!current())return null;
  const candidate=conciseEdition(source,jd,level),result=await review(candidate.resume);
  if(!current())return null;
  last={...candidate,result,level};if(result.pagination.fit&&result.integrity.complete)return last;
 }
 return last;
}
// Apply edits made in the concise edition to its full source before restoring it.
export function mergeConciseEdits(source,before,after){
 if(JSON.stringify(before)===JSON.stringify(after))return clone(source);
 if(before&&after&&typeof before==='object'&&typeof after==='object'&&Array.isArray(before)===Array.isArray(after)){
  if(Array.isArray(after)){
   const identity=v=>v&&typeof v==='object'?(v.id||v.name):null;
   if(after.every(identity)&&before.every(identity)&&Array.isArray(source)&&source.every(identity)){
    const result=source.flatMap(full=>{const old=before.find(v=>identity(v)===identity(full)),next=after.find(v=>identity(v)===identity(full));if(!old)return [clone(full)];return next?[mergeConciseEdits(full,old,next)]:[]});
    for(const next of after)if(!source.some(full=>identity(full)===identity(next)))result.push(clone(next));return result;
   }
   if(before.length===after.length&&after.every(v=>typeof v==='string')&&Array.isArray(source)&&source.length>before.length){const result=clone(source);let cursor=0;for(let i=0;i<before.length;i++){const index=source.indexOf(before[i],cursor);if(index<0)return clone(after);if(before[i]!==after[i])result[index]=after[i];cursor=index+1}return result}
   if(before.every(v=>typeof v==='string')&&after.every(v=>typeof v==='string')&&Array.isArray(source)&&source.length>before.length){const result=clone(source);for(const old of before)if(!after.includes(old)){const index=result.indexOf(old);if(index>=0)result.splice(index,1)}for(const next of after)if(!before.includes(next)&&!result.includes(next))result.push(next);return result}
   if(before.length!==after.length||after.some(v=>v===null||typeof v!=='object'))return clone(after);
   return after.map((value,i)=>mergeConciseEdits(source?.[i],before[i],value));
  }
  const result=clone(source||{});
  for(const field of new Set([...Object.keys(before),...Object.keys(after)])){
   if(!(field in after))delete result[field];
   else if(JSON.stringify(before[field])!==JSON.stringify(after[field]))result[field]=mergeConciseEdits(source?.[field],before[field],after[field]);
  }
  return result;
 }
 return clone(after);
}

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps=['Setup','Contact','Experience','Education','Projects','Skills','Review & Export'];
const titles={summary:'PROFESSIONAL SUMMARY',experience:'EXPERIENCE',education:'EDUCATION',projects:'PROJECTS',skills:'SKILLS'};
const input=(name,label,value='',type='text')=>'<label>'+label+'<input data-bind="'+name+'" type="'+type+'" value="'+escape(value)+'"></label>';
const area=(name,label,value='')=>'<label>'+label+'<textarea data-bind="'+name+'" rows="5">'+escape(value)+'</textarea></label>';
const option=(value,label,current)=>'<option value="'+escape(value)+'"'+(value===current?' selected':'')+'>'+escape(label)+'</option>';
export function createResumeWorkflow({api,getState,getOwner,onSaved,onCover,onAdvanced,onOptimise}){
 const editedFields=new Set();
 let fullEdit=null,exportValidation=null;
 let guidedEdit=null,guidedChangedText='';
 let liveFieldsOpen=false;
 let liveAts=null,atsHistory=[],highlightedTerms=[],scoreChange=null;
 let universal=null,onePageSource=null,onePageApplied=null,conciseChanges=null;
 let liveTimer;
 let integrity=null,host=null,resume=null,meta={},step=0,savedId='',savedUpdated='',analysis=null,preview='',suggestion=null,message='',busy=false,revision=0,autosaveTimer,readyOwner='',readyUser='',previewObserver=null,pageCount=1,pagination=null;
 const key=()=> 'resume-guided-draft:'+getState().user.id+':'+getOwner();
 const section=type=>resume.sections.find(s=>s.type===type);
 function ensureSection(type){
  let s=section(type);
  if(!s){s={id:crypto.randomUUID(),type,title:titles[type]||type,order:resume.sections.length,visible:true,layout:type==='skills'?'compact-list':'default',contentType:['experience','education','projects'].includes(type)?'entry':type==='skills'?'mixed':'paragraph',content:type==='skills'?{items:[],categories:[]}:['experience','education','projects'].includes(type)?{entries:[]}:{text:''}};resume.sections.push(s)}
  return s;
 }
 function capture(){return {resume,meta,step,savedId,savedUpdated,onePageSource,onePageApplied,conciseChanges,updatedAt:new Date().toISOString()}}
 function stash(){
  revision++;exportValidation=null;liveAts=null;pagination=null;analysis=null;integrity=null;preview='';suggestion=null;
  if(step!==6)host?.querySelector('.wf-preview-shell')?.remove();host?.querySelector('.wf-integrity')?.remove();host?.querySelector('.wf-scores')?.remove();
  clearTimeout(autosaveTimer);
  const draftKey=key(),draft=JSON.stringify(capture());
  autosaveTimer=setTimeout(()=>{try{localStorage.setItem(draftKey,draft)}catch{message='Browser draft storage is full. Save a server version.'}},180);
 }
 function notify(text){message=text;const status=host?.querySelector('.wf-status');if(status)status.textContent=text}
 function currentJob(){return getState().jobs.find(j=>j.id===meta.jobId&&j.owner===getOwner())}
 async function open(doc=null,{fresh=false,initialTemplate}={}){
  fullEdit=null;exportValidation=null;guidedEdit=null;guidedChangedText='';editedFields.clear();universal=null;liveAts=null;atsHistory=[];highlightedTerms=[];scoreChange=null;
  const user=getState().user.id,owner=getOwner();
  let draft=null;
  if(!doc&&!fresh){try{draft=JSON.parse(localStorage.getItem(key())||'null')}catch{}}
  const seed=doc ? (doc.data.canonical||(await api('/api/resume-workflow/import','POST',{rawText:doc.data.content})).resume) : (draft?.resume||(await api('/api/engine-seed?owner='+encodeURIComponent(owner))).resume);
  if(getOwner()!==owner||getState().user.id!==user)return;
  resume=recoverImportedSkills(seed);meta=doc?{title:doc.data.title,...doc.data.workflow}:draft?.meta||{title:'',company:'',jd:'',jobId:'',experienceLevel:'Early career'};
  // Optional dashboard choice only initializes a fresh draft; saved versions and
  // continuation keep their own settings and use the existing rendering path.
  if(fresh&&!doc&&initialTemplate){
   const design=RESUME_DESIGNS.find(d=>d.id===initialTemplate),preset={standard:['default','default','Arial'],compact:['default','compact','Calibri'],classic:['harshibar','default','Times New Roman']}[initialTemplate];
   if(design){resume.documentSettings={...resume.documentSettings,designId:design.id,template:'default',typographyPreset:'default',fontFamily:design.font}}
   else if(preset){delete resume.documentSettings.designId;[resume.documentSettings.template,resume.documentSettings.typographyPreset,resume.documentSettings.fontFamily]=preset}
  }
  onePageSource=!doc&&draft?.onePageSource?recoverImportedSkills(draft.onePageSource):null;onePageApplied=!doc&&draft?.onePageApplied?recoverImportedSkills(draft.onePageApplied):null;conciseChanges=doc?null:draft?.conciseChanges||null;
  savedId=doc?.id||draft?.savedId||'';savedUpdated=doc?.updated||draft?.savedUpdated||'';step=doc?1:draft?.step||0;readyOwner=owner;readyUser=user;pagination=null;analysis=null;preview='';suggestion=null;message=doc?'Opened a saved version. Saving creates another version.':draft?'Your draft is ready. Continue where you left off.':'Let’s build your resume, one step at a time.';revision++;
  if(draft&&!doc&&JSON.stringify(seed)!==JSON.stringify(resume)){clearTimeout(autosaveTimer);try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}}
 }
 async function mount(container){
  host=container;
  if(!resume||readyOwner!==getOwner()||readyUser!==getState().user.id)await open();
  if(!host.isConnected)return;
  render();
  if(!host.dataset.bound){
   host.dataset.bound='true';
   host.addEventListener('input',onInput);
   host.addEventListener('change',onChange);
   host.addEventListener('click',onClick);
   host.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation()});
  }
  if(step===6&&!preview){
   const mountedHost=host,version=revision;
   try{await analyze();if(host===mountedHost&&mountedHost.isConnected&&version===revision)render()}
   catch(error){if(host===mountedHost&&mountedHost.isConnected&&version===revision)notify('Preview could not refresh: '+error.message+'. Use Refresh preview and analysis to retry.')}
  }
 }
 function reset(){fullEdit=null;exportValidation=null;guidedEdit=null;guidedChangedText='';liveAts=null;atsHistory=[];highlightedTerms=[];scoreChange=null;onePageSource=null;onePageApplied=null;conciseChanges=null;clearTimeout(autosaveTimer);previewObserver?.disconnect();host=null;resume=null;pagination=null;suggestion=null;analysis=null;preview='';savedId='';savedUpdated='';readyOwner='';readyUser=''}
 function entryFields(type){
  const entries=section(type)?.content.entries||[];
  return '<div class="wf-panel-title"><h2>'+type[0].toUpperCase()+type.slice(1)+'</h2><button type="button" class="secondary" data-wf="add-entry" data-type="'+type+'">＋ Add '+(type==='experience'?'role':type==='education'?'education':'project')+'</button></div>'+
   (entries.length?entries.map((e,i)=>'<article class="wf-entry"><div class="wf-panel-title"><h3>'+escape(e.title||'Entry '+(i+1))+'</h3><button class="quiet" type="button" data-wf="remove-entry" data-type="'+type+'" data-index="'+i+'">Remove</button></div><div class="wf-fields">'+input(type+'.'+i+'.title',type==='education'?'Degree or qualification':type==='experience'?'Job title':'Project name',e.title)+input(type+'.'+i+'.organization',type==='education'?'School or institution':type==='experience'?'Company':'Organisation (optional)',e.organization)+input(type+'.'+i+'.dateRange','Dates',e.dateRange)+input(type+'.'+i+'.location','Location (optional)',e.location)+'</div>'+(['experience','projects'].includes(type)?area(type+'.'+i+'.bullets','Contributions and achievements · one bullet per line',(e.bullets||[]).join('\n'))+'<div class="wf-inline"><button class="secondary" data-wf="suggest" data-type="'+type+'" data-index="'+i+'">Review bullet order</button><button class="secondary" data-wf="compose" data-type="'+type+'" data-index="'+i+'">Build a factual bullet</button></div>':'')+'</article>').join(''):'<div class="empty">'+(type==='experience'?'No work experience added yet.':type==='education'?'No education added yet.':'No projects added yet.')+'</div>')+suggestionPanel(type);
 }
 function suggestionPanel(type){
  if(!suggestion||suggestion.type!==type)return '';
  if(suggestion.mode==='compose')return '<section class="wf-suggestion"><h3>Build a bullet from confirmed facts</h3><p>Choose the action you performed and add only details you can support.</p><label>Your action<select id="wf-action">'+['Built','Developed','Analysed','Designed','Tested','Coordinated','Maintained','Supported','Documented','Led'].map(v=>option(v,v,'Built')).join('')+'</select></label><label>What did you do?<textarea id="wf-task" rows="2"></textarea></label><label>Tools you used (optional)<input id="wf-tools"></label><label>Verified result (optional)<input id="wf-result"></label><button data-wf="compose-preview">Preview bullet</button><button class="quiet" data-wf="dismiss">Cancel</button></section>';
  const before=suggestion.before||[],after=suggestion.after||[];
  return '<section class="wf-suggestion"><p class="pill">'+(suggestion.mode==='bullet'?'Local fact composer':'Local rule-based suggestion')+'</p><h3>Review before applying</h3><div class="wf-fields"><div><h4>Current</h4><ul>'+before.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ul></div><div><h4>Suggested</h4><ul>'+after.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ul></div></div><p>'+escape(suggestion.message||'The bullet uses only the facts you entered.')+'</p><button data-wf="apply">Apply suggestion</button><button class="quiet" data-wf="dismiss">Discard</button></section>';
 }
 function setup(){
  const jobs=getState().jobs.filter(j=>j.owner===getOwner());
  return '<h2>Create your resume</h2><p>Start blank, import an existing document, or open a saved version from Documents.</p>'+input('meta.title','Resume version title',meta.title)+
   '<div class="wf-fields"><label>Experience level<select data-bind="meta.experienceLevel">'+['Student / Fresher','Early career','Experienced'].map(v=>option(v,v,meta.experienceLevel)).join('')+'</select></label><label>Target a saved job<select data-bind="meta.jobId"><option value="">No saved job</option>'+jobs.map(j=>option(j.id,j.data.role+' · '+j.data.company,meta.jobId)).join('')+'</select></label></div><div class="wf-fields">'+input('targetRole','Target role (optional)',resume.targetRole)+input('meta.company','Target company (optional)',meta.company)+'</div>'+area('meta.jd','Job description (optional)',meta.jd)+
   '<section class="wf-import"><h3>Upload old resume & autofill</h3><p>Choose your existing resume to automatically fill contact details, summary, experience, education, projects and skills. Your job description and target company stay unchanged.</p><label>Resume file · PDF, DOCX or TXT<input id="wf-file" type="file" accept=".pdf,.docx,.txt" aria-describedby="wf-import-help"></label><p id="wf-import-help" class="subtle">Autofill starts when you choose a file. Up to 1 MB and 10 PDF pages; scanned PDFs need selectable text. Review extracted details before generating.</p><details><summary>Or paste resume / LinkedIn text</summary><textarea id="wf-import-text" rows="6" aria-label="Existing resume text"></textarea><button type="button" class="secondary" data-wf="import">Autofill from resume text</button></details></section>'+
   (resume.rawImport?.rawText?'<section class="wf-autofill-result" role="status"><h3>Resume fields autofilled</h3><p>'+['experience','projects','education'].map(type=>(section(type)?.content.entries?.length||0)+' '+type).join(' · ')+' · '+(section('skills')?.content.items?.length||0)+' skills</p><p>Review the populated sections below. Missing details remain empty; nothing is invented.</p><div class="wf-inline">'+[1,2,3,4,5].map(i=>'<button class="secondary" type="button" data-wf="step" data-step="'+i+'">Review '+steps[i]+'</button>').join('')+'</div></section><details><summary>Original imported text</summary><pre>'+escape(resume.rawImport.rawText)+'</pre></details>':'');
 }

 function optimizerJD(){return [resume.targetRole,meta.jd||''].filter(Boolean).join('\n')}
 function atsRail(){
  const a=liveAts?.analysis;
  if(!a)return '<h3>Estimated ATS score</h3><p>Refresh preview to analyse this working resume and target job.</p>';
  return '<section class="wf-ats-card"><small>Local ATS estimate</small><strong class="wf-live-score" data-score="'+a.score+'">'+a.score+'<small>/100</small></strong>'+(scoreChange?'<p class="wf-score-change">Recalculated: '+scoreChange.before+' → '+scoreChange.after+'</p>':'')+'<p>'+escape(a.formula)+'</p><details><summary>Score breakdown</summary>'+a.breakdown.map(c=>'<p>'+escape(c.label)+' <b>'+c.points+' / '+c.max+'</b></p>').join('')+'</details><p class="subtle">Local estimate. Employer ATS results differ; a click alone does not guarantee an increase.</p><button data-wf="whole-open">Review whole resume for 95+</button><button class="secondary" data-wf="guide-open">Improve one bullet</button><button class="secondary" data-wf="improve-inline">Find automatic improvements</button><button class="secondary" data-wf="optimise">Open full ATS workspace</button><button class="secondary" data-wf="ats-undo" '+(!atsHistory.length?'disabled':'')+'>Undo improvement</button></section>'+
   '<section class="wf-ats-card"><h3>Job keyword targeting</h3><p>'+escape(resume.targetRole||'Choose a target position')+'</p>'+(!meta.jd?'<p>Add a JD in Setup for specific job requirements.</p>':'')+'<h4>Matched keywords</h4><div class="wf-keyword-chips">'+(!a.keywords.length?'<p>No tracked terms found. Paste a detailed JD above; a target title alone is not a requirements list.</p>':'')+a.keywords.filter(t=>t.status==='matched').map(t=>'<span>'+escape(t.term)+' ✓</span>').join('')+'</div><h4>Missing requirements</h4><p>These are requirements from the current JD. Removing a skill from your resume keeps it missing here; skip it if you do not have it.</p>'+liveAts.questions.map((q,i)=>(meta.skippedKeywords||[]).includes(q.term)?'':'<details class="wf-keyword-question"><summary>'+escape(q.term)+'</summary><button class="quiet" data-wf="ats-skip" data-index="'+i+'">Skip this requirement</button><p>'+escape(q.message)+'</p>'+(q.credential?'<p>Add real licence/qualification details through the editor; no automatic claim.</p>':'<label><input type="checkbox" data-wf-confirm="'+i+'"> I have this experience</label><label>Give a genuine example<textarea data-wf-evidence="'+i+'" rows="3" maxlength="1500"></textarea></label><button data-wf="ats-confirm" data-index="'+i+'">Add confirmed example & re-score</button>')+'</details>').join('')+((meta.skippedKeywords||[]).length?'<p class="subtle">Skipped (still counted as gaps): '+meta.skippedKeywords.map(escape).join(', ')+'</p><button class="secondary" data-wf="ats-show-skipped">Review skipped requirements</button>':'')+'<p class="subtle">Added keywords are highlighted green in this preview. Downloads keep clean formatting.</p></section>'+
   '<section class="wf-ats-card"><h3>Improve ATS</h3>'+wholePlanCard()+liveAts.suggestions.map((p,i)=>'<article class="wf-inline-suggestion"><h4>'+escape(p.label)+'</h4><p>'+escape(p.description)+'</p><p class="wf-score-change">'+p.beforeScore+' → '+p.afterScore+' ('+(p.delta>0?'+':'')+p.delta+')</p><details><summary>See before / after</summary><small>Before</small><p>'+escape(p.beforeText)+'</p><small>After</small><p>'+escape(p.afterText)+'</p></details><button data-wf="ats-apply" data-index="'+i+'">Apply improvement & re-score</button></article>').join('')+'<div class="wf-guided-callout"><h4>Improve your existing experience</h4><p>Skipped skills do not block this. Add specific work details, shorten long bullets or include genuine results.</p>'+ (guidedBulletChoices(resume).length?'<button data-wf="guide-open">Improve a bullet & preview score</button>':'<button data-wf="step" data-step="2">Add real experience or projects</button>')+'<p class="subtle">The score is recalculated from your edit. If missing job requirements limit it, we show that honestly.</p></div>'+'</section>';
 }


 function wholePlanCard(){
  const plan=resumeImprovementPlan(resume,liveAts.analysis);
  return '<div class="wf-whole-plan"><p><strong>Target: 95+ local estimate</strong> · '+plan.remainingTo95+' points remaining.</p>'+(plan.blockedByMissingFacts?'<p class="wf-plan-blocked">With the current tracked keyword coverage, even perfect local readiness is capped at approximately '+plan.currentCoverageCeiling+'/100. Missing genuine requirements must be addressed to reach 95; skipping does not add points.</p>':'<p>Review every incomplete category. 95+ is a target, not a guaranteed result.</p>')+'<p>Unverified JD requirements: '+escape(plan.missing.join(', ')||'None among tracked terms')+'</p><p>'+plan.unmeasuredBullets+' bullets have no verified numbers. Review genuine outcomes; qualitative results are acceptable. Never invent metrics to raise a score.</p><p class="subtle">A high local score does not mean external grammar, credibility or untracked JD checks have passed.</p><button data-wf="whole-open">Review summary, skills & contact</button><button class="secondary" data-wf="verify-exports">Verify PDF / Word readability</button>'+(exportValidation?'<p class="wf-export-verified">PDF and DOCX generated and passed the existing server text-recovery checks. No external checker score was measured.</p>':'')+'<details><summary>Why points are missing</summary>'+plan.lostCategories.map(c=>'<p>'+escape(c.label)+' · '+c.lost+' category points lost</p>').join('')+'</details></div>';
 }
 function wholeDialog(){
  if(!fullEdit)return '';const e=fullEdit,plan=resumeImprovementPlan(resume,liveAts.analysis),result=e.result;
  const tabs=[['summary','Summary'],['skills','Skills'],['contact','Contact'],['bullet','Experience / projects']];
  const form=e.mode==='contact'?['fullName','email','phone','location','linkedin'].map(k=>'<label>'+({fullName:'Full name',email:'Email',phone:'Phone',location:'City / location',linkedin:'LinkedIn / profile URL'})[k]+'<input data-whole="'+k+'" value="'+escape(e.fields[k])+'"></label>').join(''):e.mode==='bullet'?'<p>Review all your existing achievements, not just one bullet.</p><button class="secondary" data-wf="whole-entries">Edit role titles, dates or add experience</button>'+guidedBulletChoices(resume).map((c,i)=>'<article class="wf-whole-bullet"><strong>'+escape(c.label)+'</strong><p>'+escape(c.text)+'</p><button class="secondary" data-wf="whole-bullet" data-index="'+i+'">Improve this bullet</button></article>').join(''):'<label>'+(e.mode==='summary'?'Professional summary — actual background only':'Genuine skills — one per line')+'<textarea data-whole="text" rows="6">'+escape(e.fields.text)+'</textarea></label>'+(e.mode==='skills'?'<label>Evidence for newly added skills<textarea data-whole="evidence" rows="3" placeholder="Describe where and how you actually used every new tool or skill.">'+escape(e.fields.evidence||'')+'</textarea></label>':'');
  return '<dialog class="wf-whole-dialog"><header><h2>Whole-resume improvement review</h2><button class="quiet" data-wf="whole-close" aria-label="Close whole resume review">✕</button></header><p>Current local estimate '+plan.score+'/100. External checkers use different criteria; no 95+ result is guaranteed.</p><nav>'+tabs.map(([mode,label])=>'<button class="'+(e.mode===mode?'':'secondary')+'" data-wf="whole-tab" data-mode="'+mode+'">'+label+'</button>').join('')+'</nav><p class="subtle">Need education or qualification changes? <button class="quiet" data-wf="whole-education">Open education form</button> <button class="quiet" data-wf="whole-certifications">Open certifications / licences</button></p>'+form+(e.mode==='bullet'?'':'<label class="wf-whole-confirm"><input data-whole="confirmed" type="checkbox" '+(e.confirmed?'checked':'')+'> These details are accurate. New skills have genuine evidence.</label>')+(e.error?'<p class="error" role="alert">'+escape(e.error)+'</p>':'')+(result?'<section class="wf-guide-impact"><strong>Calculated estimate: '+e.beforeScore+' → '+result.analysis.score+'</strong><p>'+(result.analysis.score>=95?'95+ reached under the current local rules. This does not certify an external checker result.':result.analysis.score===e.beforeScore?'Score unchanged. Review missing job requirements and other categories.':'Score recalculated from your changes; review the remaining requirements.')+'</p>'+(!result.fit?'<p>Content exceeds the page target. Trim it or choose two pages.</p>':'')+'</section>':'')+(e.mode==='bullet'?'':'<div class="wf-guide-actions"><button data-wf="whole-preview">Preview section impact</button><button class="secondary" data-wf="whole-apply" '+(!e.confirmed||!result?.fit||!result?.integrity.complete?'disabled':'')+'>Apply confirmed section & re-score</button></div>')+'<details><summary>Full quality checklist</summary>'+plan.issues.map(i=>'<p><strong>'+escape(i.label)+'</strong>: '+escape(i.detail)+'</p>').join('')+'<p>Repeated openers: '+escape(plan.repeatedOpeners.join(', ')||'None detected')+'</p></details></dialog>';
 }
 function startWholeEdit(mode='summary'){
  const fields=mode==='contact'?{...resume.profile}:mode==='skills'?{text:(section('skills')?.content.items||[]).join('\n'),evidence:''}:{text:section('summary')?.content.text||''};
  fullEdit={mode,fields,confirmed:false,result:null,revision,beforeScore:liveAts.analysis.score};render();
 }

 function guidedDialog(){
  if(!guidedEdit)return '';
  const choices=guidedBulletChoices(resume),g=guidedEdit,preview=g.result;
  return '<dialog class="wf-guide-dialog"><header><h2>Improve your experience</h2><button class="quiet" data-wf="guide-close" aria-label="Close improvement editor">✕</button></header><p>Use only work you actually did. Your employers, dates and other bullets stay unchanged.</p><label>Choose an existing bullet<select data-guide="choice">'+choices.map((c,i)=>option(String(i),c.label+' · '+c.text.slice(0,85),String(g.selected))).join('')+'</select></label><p class="wf-guide-reason">'+escape(choices[g.selected]?.reason||'Review this bullet')+'</p><label>Your revised bullet<textarea data-guide="text" rows="5" maxlength="1500">'+escape(g.text)+'</textarea></label><p class="subtle">Describe action + task + method + real result. Add numbers only when you know them. A result can also be better accuracy, reliability, turnaround time or service quality.</p><label class="wf-guide-confirm"><input type="checkbox" data-guide="confirmed" '+(g.confirmed?'checked':'')+'> I confirm these details are accurate.</label>'+(g.error?'<p class="error" role="alert">'+escape(g.error)+'</p>':'')+(preview?'<section class="wf-guide-impact"><strong>Estimated ATS score: '+g.beforeScore+' → '+preview.analysis.score+'</strong><p>'+(preview.analysis.score>g.beforeScore?'This edit improves the current calculated score.':preview.analysis.score===g.beforeScore?'This edit improves your content, but does not change the current calculated score. Missing job requirements can still limit it.':'This edit lowers the current estimate. Review the wording and job relevance before applying.')+'</p><p>'+(!preview.fit?'This edit exceeds the page target. Shorten it or choose two pages before applying.':'Page fit checked.')+'</p></section>':'')+'<div class="wf-guide-actions"><button data-wf="guide-preview">Preview score impact</button><button class="secondary" data-wf="guide-apply" '+(!preview?.fit||!preview?.integrity.complete||!g.confirmed?'disabled':'')+'>Apply my edit & re-score</button></div></dialog>';
 }

 function templateDialog(){
 const old=[['standard','Original — Standard','default','default','Arial'],['compact','Original — Compact','default','compact','Calibri'],['classic','Original — Classic','harshibar','default','Times New Roman']];
 return '<dialog class="wf-format-dialog"><header><h2>Choose your resume template</h2><button class="quiet" data-wf="close-templates" aria-label="Close template gallery">✕</button></header><p>Your original format is preserved. Choose a different layout for this draft only.</p><nav class="wf-gallery-filters">'+[['all','All templates'],['original','Original formats'],['sidebar','Sidebar'],['editorial','Editorial'],['single','Single column']].map(([id,label])=>'<button class="secondary" data-wf="filter-templates" data-family="'+id+'">'+label+'</button>').join('')+'</nav><p class="subtle">Single-column formats are the conservative choice for ATS parsing. Sidebar Word layouts use editable tables. No photo or skill rating is invented.</p><div class="wf-format-grid">'+old.map(([id,label,template,spacing,font])=>'<button class="wf-format-card secondary" data-family="original" data-wf="choose-template" data-template="'+template+'" data-spacing="'+spacing+'" data-format="'+id+'" data-font="'+font+'" data-design=""><span class="wf-format-mini" aria-hidden="true"><b>YOUR NAME</b><i></i><i></i><b>EXPERIENCE</b><i></i><i></i><b>EDUCATION</b><i></i></span><strong>'+label+'</strong><small>Existing original renderer</small></button>').join('')+RESUME_DESIGNS.map(d=>'<button class="wf-format-card wf-design-card secondary '+(resume.documentSettings.designId===d.id?'is-selected':'')+'" aria-pressed="'+(resume.documentSettings.designId===d.id)+'" data-family="'+d.family+'" data-wf="choose-template" data-template="default" data-spacing="default" data-format="'+d.id+'" data-design="'+d.id+'" data-font="'+d.font+'"><span class="wf-design-thumbnail" data-thumb="'+d.id+'"><span class="wf-thumb-placeholder" style="border-'+(d.side||'top')+':22px solid #'+(d.color||d.accent)+'">Loading actual resume preview…</span></span><strong>'+escape(d.name)+'</strong><small>'+escape(d.family)+' · '+escape(d.font)+'</small></button>').join('')+'</div></dialog>';
 }
 async function loadTemplatePreviews(){
  const version=revision,owner=getOwner(),dialog=host.querySelector('.wf-format-dialog');
  dialog.thumbnailObserver?.disconnect();
  const fitThumbnail=box=>{const frame=box.querySelector('iframe');if(frame&&box.clientWidth){frame.style.transform='scale('+box.clientWidth/Number(frame.dataset.pageWidth)+')'}};
  const observer=new ResizeObserver(entries=>entries.forEach(({target})=>fitThumbnail(target)));
  dialog.thumbnailObserver=observer;
  dialog.addEventListener('close',()=>{if(!dialog.open)observer.disconnect()},{once:true});
  dialog.querySelectorAll('.wf-design-thumbnail').forEach(box=>observer.observe(box));
  for(const d of RESUME_DESIGNS){if(version!==revision||owner!==getOwner()||!dialog?.open)return;const box=dialog.querySelector('[data-thumb="'+d.id+'"]');if(!box||box.querySelector('iframe'))continue;
   try{const candidate=structuredClone(resume);candidate.documentSettings.designId=d.id;candidate.documentSettings.fontFamily=d.font;const r=await api('/api/resume-workflow/review','POST',{resume:candidate,jd:''});if(version!==revision||!dialog.open)return;box.innerHTML='<iframe tabindex="-1" title="'+escape(d.name)+' actual resume preview" sandbox="allow-same-origin" scrolling="no"></iframe>';const frame=box.querySelector('iframe'),width=(r.pagination.pageWidth||595.28)*96/72,height=(r.pagination.pageHeight||841.89)*96/72;frame.dataset.pageWidth=width;frame.style.width=width+'px';frame.style.height=height+'px';frame.addEventListener('load',()=>fitThumbnail(box));frame.srcdoc=r.html.replace('</head>','<style>html,body{margin:0!important;overflow:hidden!important;background:white!important}.resume-page{margin:0!important}.resume-page~.resume-page{display:none!important}</style></head>');fitThumbnail(box);}
   catch{box.innerHTML='<span class="wf-thumb-placeholder">Preview unavailable. Select to load this template.</span>'}
  }
 }
 function highlightGuidedEdit(frame){if(!guidedChangedText)return;const text=guidedChangedText.replace(/\s+/g,' ').trim();for(const block of frame.contentDocument?.querySelectorAll('.block')||[])if(block.textContent.replace(/\s+/g,' ').includes(text)){block.style.background='#ddf3e9';block.style.color='#064e3b';block.style.boxShadow='inset 3px 0 #36b58b'}}
 function refreshAtsRail(){const rail=host?.querySelector('.wf-live-ats');if(rail){rail.innerHTML=atsRail();if(busy)rail.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true)}}

 function contact(){
  return '<h2>Contact and summary</h2><div class="wf-fields">'+input('profile.fullName','Full name',resume.profile.fullName)+input('profile.email','Email',resume.profile.email,'email')+input('profile.phone','Phone (optional)',resume.profile.phone)+input('profile.location','Location (optional)',resume.profile.location)+input('profile.linkedin','LinkedIn URL (optional)',resume.profile.linkedin,'url')+input('profile.portfolio','Portfolio URL (optional)',resume.profile.portfolio,'url')+'</div>'+area('summary','Professional summary',section('summary')?.content.text||'');
 }
 function skills(){
  const other=resume.sections.filter(s=>!['summary','experience','education','projects','skills'].includes(s.type));
  return '<h2>Skills and section order</h2>'+area('skills','Verified skills · comma-separated',(section('skills')?.content.items||[]).join(', '))+area('certifications','Certifications and licences (optional)',(resume.sections.find(s=>s.id==='guided-certifications')?.content.paragraphs||[]).join('\n'))+'<p>Enter only qualifications you hold, including issuer and dates. Add a skill only when you have evidence for it.</p><h3>Document sections</h3><div class="wf-sections">'+resume.sections.map(s=>'<div><label><input type="checkbox" data-visible="'+escape(s.id)+'" '+(s.visible!==false?'checked':'')+'>'+escape(s.title)+'</label><button class="quiet" data-wf="move-up" data-section="'+escape(s.id)+'" aria-label="Move '+escape(s.title)+' up">↑</button><button class="quiet" data-wf="move-down" data-section="'+escape(s.id)+'" aria-label="Move '+escape(s.title)+' down">↓</button></div>').join('')+'</div>'+(other.length?'<p class="subtle">Additional imported sections are preserved. Use the advanced editor to edit their content.</p>':'');
 }
 function universalPanel(){
  return '<section class="wf-universal"><h3>ATS Resume Maker · any profession</h3><p>Review only confirmed facts against your target job. No skill, licence or metric is invented.</p>'+'<p class="subtle">Uses the current job description from Target job above.</p><button data-wf="universal">Analyse profile and job</button>'+(universal?
  '<h3>'+escape(universal.label)+'</h3><strong>'+universal.estimated_score+'/100</strong><p>Role family: '+escape(universal.jd.family)+'</p>'+universal.breakdown.map(c=>'<details><summary>'+escape(c.category)+' · '+c.points+' / '+c.max+'</summary><p>'+escape(c.explanation)+'</p></details>').join('')+'<h4>Gaps and questions for you</h4><p>Confirm facts in your profile fields before analysing again. A yes answer alone is not evidence.</p><ul>'+universal.questions.map(q=>'<li>'+escape(q.question)+(q.status?' — '+escape(q.status):'')+'</li>').join('')+'</ul><p>'+escape(universal.warnings.join(' '))+'</p><p>'+escape(universal.blocked_improvements.join(' '))+'</p><button class="secondary" data-wf="apply-universal">Apply suggested bullet order</button><p>Local rules only. Semantic models and LLM rewriting are not configured. Export round-trip points are withheld in this estimate.</p>':'')+'</section>';
 }
 function resumeTemplateOptions(){
  const selected=resume.documentSettings.designId||(resume.documentSettings.template==='harshibar'?'classic':resume.documentSettings.typographyPreset==='compact'?'compact':'standard');
  return [['standard','Original — Standard'],['compact','Original — Compact'],['classic','Original — Classic'],...RESUME_DESIGNS.map(d=>[d.id,d.name])].map(([id,name])=>option(id,name,selected)).join('');
 }
 function reviewTemplatePicker(){
  return '<section class="wf-review-template-picker" aria-labelledby="wf-review-template-title"><div><h3 id="wf-review-template-title">Choose your resume template</h3><p>Use your completed resume in any layout. Your existing details stay in this draft.</p></div><div class="wf-review-template-controls"><label>Resume template<select data-wf-template aria-label="Resume template">'+resumeTemplateOptions()+'</select></label><button type="button" class="secondary" data-wf="templates">Browse template previews</button></div><label class="wf-font-choices">Resume font<select data-bind="setting.fontFamily" aria-label="Resume font">'+['Arial','Times New Roman','Calibri'].map(font=>option(font,font,resume.documentSettings.fontFamily||'Arial')).join('')+'</select></label><small>Selection updates the preview and PDF/Word downloads. Save as a new version to keep your original.</small></section>';
 }
 function review(){
  const a=analysis;
  return reviewTemplatePicker()+'<section class="wf-optimise-entry"><div><p class="wf-opt-eyebrow">YOUR NEXT STEP</p><h2>Review your resume. Improve your job fit.</h2><p>Open your current draft beside its calculated score, keyword gaps and reviewable improvements.</p></div><button type="button" data-wf="improve-inline">Improve ATS →</button></section><h2>Review and export</h2>'+'<section class="wf-target-job"><h3>Target job</h3><p>Paste the actual requirements to get job-specific keywords and improvements.</p>'+area('meta.jd','Job description',meta.jd||'')+'</section><details class="wf-secondary-checks"><summary>Advanced profile analysis</summary>'+universalPanel()+'</details><details class="wf-layout-settings"><summary>Page, font & spacing</summary><div class="wf-fields"><label>Selected template<select data-bind="setting.template">'+option('default','Original — Standard',resume.documentSettings.designId?'design:'+resume.documentSettings.designId:resume.documentSettings.template==='harshibar'?'harshibar':'default')+option('harshibar','Original — Classic',resume.documentSettings.designId?'design:'+resume.documentSettings.designId:resume.documentSettings.template)+RESUME_DESIGNS.map(d=>option('design:'+d.id,d.name,resume.documentSettings.designId?'design:'+resume.documentSettings.designId:'')).join('')+'</select></label><label>Font family<select data-bind="setting.fontFamily">'+['Arial','Calibri','Times New Roman'].map(v=>option(v,v,resume.documentSettings.fontFamily||'Arial')).join('')+'</select></label><label>Spacing<select data-bind="setting.typographyPreset">'+['spacious','default','compact','tighter'].map(v=>option(v,({spacious:'Comfortable',default:'Standard',compact:'Compact',tighter:'Tight'})[v],resume.documentSettings.typographyPreset)).join('')+'</select></label><label>Page target<select data-bind="setting.resumeLength">'+[1,2].map(v=>option(String(v),v===1?'1 page · shorten & fit':'2 pages · balanced',String(resume.documentSettings.resumeLength))).join('')+'</select></label></div><button data-wf="analyze">Refresh preview and analysis</button></details><div class="wf-page-status" role="status">'+escape(pagination?.explanation||'One page automatically reduces repeated text and extra bullets. Your full source is kept; two pages restores it.')+'</div>'+
   '<details class="wf-secondary-checks"><summary>Detailed readiness checks & source coverage</summary>'+(a?'<div class="wf-scores"><article><small>Resume readiness</small><strong>'+a.readinessScore+'/100</strong></article><article><small>Job keyword match</small><strong>'+(meta.jd?a.jobMatchScore+'/100':'Add a JD')+'</strong></article></div><p class="subtle">Local resume guidance from your existing engine. Scores help you review the document.</p><div class="wf-fields"><div><h3>Matched keywords</h3><p>'+escape((a.matchedKeywords||[]).map(termText).join(', ')||'No matched keywords')+'</p></div><div><h3>Missing keywords</h3><p>'+escape((a.missingKeywords||[]).map(termText).join(', ')||'No missing keywords identified')+'</p></div></div><details><summary>Readiness breakdown</summary>'+a.breakdown.map(c=>'<div class="wf-breakdown"><b>'+escape(c.name||c.label||c.title)+'</b><span>'+escape(c.points)+' / '+escape(c.max)+'</span></div>').join('')+'</details><h3>Recommended edits</h3><ul>'+(a.recommendations||[]).map(r=>'<li>'+escape(typeof r==='string'?r:r.message||r.title||r.action||JSON.stringify(r))+'</li>').join('')+'</ul>':'<p>Refresh to see the current preview, existing ATS analysis and matched/missing terms.</p>')+
   (integrity?'<section class="wf-integrity '+(integrity.complete?'wf-integrity-pass':'wf-integrity-warning')+'"><h3>'+(integrity.complete?'Source coverage passed':'Source coverage needs attention')+'</h3><p>'+integrity.present+' of '+integrity.checked+' recorded fields are present in the preview.</p>'+(integrity.complete?'':'<ul>'+integrity.missing.slice(0,8).map(item=>'<li>'+escape(item.section)+': '+escape(item.text)+'</li>').join('')+'</ul><p>Choose Standard or two pages, or shorten the draft yourself. Downloads are protected against omitted content.</p>')+'</section>':'')+
   '</details>'+(conciseChanges?'<p class="wf-concise-note" role="status">One-page concise edition · '+conciseChanges.omittedBullets+' extra/repeated bullets and '+conciseChanges.omittedSkills+' skills omitted; summary shortened where needed. Full source retained. <button class="quiet" data-wf="restore-full">Restore full content (2 pages)</button></p>':'')+'<div class="wf-export">'+(savedId?'<button data-wf="update">Update this resume</button>':'')+'<button class="secondary" data-wf="save">'+(savedId?'Save as new version':'Save resume version')+'</button><button class="secondary" data-wf="download-pdf">Download PDF</button><button class="secondary" data-wf="download-docx">Download DOCX</button><button class="secondary" data-wf="cover">Write cover letter</button><button class="quiet" data-wf="advanced">Open advanced editor</button></div><p class="subtle">Downloads include your current edits. Save resume version separately to keep a version in your workspace.</p>'+
   '<div class="wf-live-toolbar"><h3>Live resume editor</h3><button class="secondary" data-wf="toggle-fields" aria-expanded="'+liveFieldsOpen+'">'+(liveFieldsOpen?'Hide editing fields':'Edit resume fields')+'</button>'+'<label class="wf-preview-template-picker">Resume template<select data-wf-template aria-label="Live preview resume template">'+resumeTemplateOptions()+'</select></label>'+input('targetRole','Target position',resume.targetRole)+'<button class="secondary" data-wf="templates">Choose resume format</button><label>Resume version<select data-wf-source><option value="">Current working draft</option>'+getState().documents.filter(d=>d.owner===getOwner()&&d.data.canonical).map(d=>option(d.id,d.data.title,savedId)).join('')+'</select></label><button class="secondary" data-wf="advanced">Open advanced editor ↗</button><p>Edit below to update the preview automatically.</p></div><div class="wf-live-layout '+(liveFieldsOpen?'wf-editing':'')+'"><aside class="wf-live-fields"><details open><summary>Contact & summary</summary>'+contact()+'</details>'+['experience','education','projects'].map(type=>'<details><summary>'+escape(titles[type])+'</summary>'+entryFields(type)+'</details>').join('')+'<details><summary>Skills</summary>'+skills()+'</details></aside>'+ (preview?'<div class="wf-preview-shell"><iframe class="wf-preview" title="Resume preview from existing engine" sandbox="allow-same-origin" srcdoc="'+escape(preview)+'"></iframe></div>':'<p>Preparing live preview…</p>')+'<aside class="wf-live-ats" aria-label="ATS score and job keywords">'+atsRail()+'</aside></div>'+templateDialog()+guidedDialog()+wholeDialog();
 }
 const termText=t=>typeof t==='string'?t:t.keyword||t.term||t.label||'';
const stepHints=[
 'Name this resume and optionally choose a job you want to apply for.',
 'Add your name and contact details so employers can reach you.',
 'Add your jobs, internships or freelance work. If you are starting out, you can skip this step.',
 'Add your college, degree, courses or other relevant education.',
 'Add a college, personal or work project that shows what you can do.',
 'List the skills you can support with your experience. Choose the section order below.',
 'Check the preview, save your resume and choose a download format.'
];
const stepTitles=['Start your resume','Your details','Work experience','Education','Projects','Skills & sections','Review & download'];
function render(){
 if(!host?.isConnected)return;
 const body=step===0?setup():step===1?contact():step===2?entryFields('experience'):step===3?entryFields('education'):step===4?entryFields('projects'):step===5?skills():review();
 const optional=step>=2&&step<=5;
 host.innerHTML='<section class="wf-shell"><nav class="wf-steps" aria-label="Resume creation steps">'+steps.map((name,i)=>'<button class="quiet" type="button" data-wf="step" data-step="'+i+'" '+(step===i?'aria-current="step"':'')+'><i aria-hidden="true">'+(i<step?'✓':i+1)+'</i><span>'+name+'</span></button>').join('')+'</nav><div class="wf-content"><header class="wf-step-heading"><div><p>Step '+(step+1)+' of '+steps.length+(optional?' <span>Optional</span>':'')+'</p><h2>'+stepTitles[step]+'</h2><p>'+stepHints[step]+'</p></div><button class="quiet" type="button" data-wf="save-draft">Save draft</button></header><p class="wf-status" role="status">'+escape(message)+'</p><div class="wf-body">'+body+'</div><div class="wf-navigation">'+(step?'<button class="secondary" data-wf="back">← Back</button>':'')+(optional?'<button class="quiet" data-wf="skip">Skip for now</button>':'')+(step<6?'<button data-wf="next">Continue to '+steps[step+1]+' →</button>':'')+'</div></div></section>';
 previewObserver?.disconnect();
 const shell=host.querySelector('.wf-preview-shell');
 if(shell){
  const fit=()=>{
   if(!shell.isConnected)return;
   const iframe=shell.querySelector('iframe');if(!iframe)return;
   const scale=Math.min(1,shell.clientWidth/850),height=Math.max(pageCount*1150,iframe.contentDocument?.documentElement?.scrollHeight||0);
   shell.style.height=height*scale+'px';iframe.style.height=height+'px';iframe.style.transform='scale('+scale+')';
  };
  shell.querySelector('iframe').addEventListener('load',()=>{highlightResumeKeywords(shell.querySelector('iframe'),highlightedTerms);highlightGuidedEdit(shell.querySelector('iframe'));fit()});previewObserver=new ResizeObserver(fit);previewObserver.observe(shell);fit();
 }
 host.querySelectorAll('[data-bind]').forEach(el=>{if(editedFields.has(el.dataset.bind))el.classList.add('wf-edited')});
 if(fullEdit){const dialog=host.querySelector('.wf-whole-dialog');dialog?.addEventListener('cancel',()=>{fullEdit=null},{once:true});dialog?.showModal()}
 if(guidedEdit){const dialog=host.querySelector('.wf-guide-dialog');dialog?.addEventListener('cancel',()=>{guidedEdit=null},{once:true});dialog?.showModal()}
 if(!busy&&step===6)updatePageStatus();if(busy)host.querySelectorAll('button').forEach(b=>{b.disabled=true});
}
 function updatePageStatus(){const box=host?.querySelector('.wf-page-status');if(box){box.textContent=pagination?.explanation||'Updating page layout…';box.classList.toggle('wf-page-overflow',Boolean(pagination&&!pagination.fit));box.dataset.fit=String(Boolean(pagination?.fit))}host?.querySelectorAll('[data-wf="download-pdf"],[data-wf="download-docx"]').forEach(b=>b.disabled=!pagination?.fit||!integrity?.complete)}
 function onInput(event){
  event.stopPropagation();const el=event.target;if(el.dataset.whole&&fullEdit){const key=el.dataset.whole;if(key==='confirmed')fullEdit.confirmed=el.checked;else{fullEdit.fields[key]=el.value;fullEdit.result=null;fullEdit.error='';host.querySelector('.wf-whole-dialog .wf-guide-impact')?.remove()}const apply=host.querySelector('[data-wf=whole-apply]');if(apply)apply.disabled=!fullEdit.confirmed||!fullEdit.result?.fit||!fullEdit.result?.integrity.complete;return}if(el.dataset.guide&&guidedEdit){if(el.dataset.guide==='text'){guidedEdit.text=el.value;guidedEdit.result=null;guidedEdit.error='';host.querySelector('[data-wf=guide-apply]').disabled=true;host.querySelector('.wf-guide-impact')?.remove()}if(el.dataset.guide==='confirmed'){guidedEdit.confirmed=el.checked;host.querySelector('[data-wf=guide-apply]').disabled=!el.checked||!guidedEdit.result?.fit||!guidedEdit.result?.integrity.complete}return}if(!el.dataset.bind||!resume)return;
  editedFields.add(el.dataset.bind);el.classList.add('wf-edited');
  const [kind,index,property]=el.dataset.bind.split('.');
  if(kind==='meta'){meta[index]=el.value;if(index==='jd')meta.skippedKeywords=[]}
  else if(kind==='profile'){resume.profile[index]=el.value}
  else if(kind==='summary'){ensureSection('summary').content.text=el.value}
  else if(kind==='certifications'){let s=resume.sections.find(s=>s.id==='guided-certifications');if(!s){s={id:'guided-certifications',type:'custom',title:'Certifications & Licences',visible:true,order:resume.sections.length,contentType:'mixed',content:{paragraphs:[],entries:[],bullets:[]}};resume.sections.push(s)}s.content.paragraphs=el.value.split('\n').map(t=>t.trim()).filter(Boolean)}
  else if(kind==='skills'){ensureSection('skills').content={items:el.value.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean),categories:[]}}
  else if(kind==='setting'){if(index==='resumeLength'&&Number(el.value)===2&&onePageSource){resume=mergeConciseEdits(onePageSource,onePageApplied,resume);onePageSource=null;onePageApplied=null;conciseChanges=null;}resume.documentSettings[index]=index==='resumeLength'?Number(el.value):el.value;if(index==='template'){const d=RESUME_DESIGNS.find(d=>'design:'+d.id===el.value);if(d){resume.documentSettings.designId=d.id;resume.documentSettings.template='default';resume.documentSettings.fontFamily=d.font;resume.documentSettings.pageSize='A4'}else{delete resume.documentSettings.designId;resume.documentSettings.pageSize=el.value==='harshibar'?'US Letter':'A4'}}}
  else if(kind==='targetRole'){resume.targetRole=el.value}
  else {const e=section(kind)?.content.entries?.[Number(index)];if(e)e[property]=property==='bullets'?el.value.split('\n').map(s=>s.trim()).filter(Boolean):el.value}
  stash();
  notify('Changes saved on this device.');
  if(step===6){updatePageStatus();clearTimeout(liveTimer);const version=revision;liveTimer=setTimeout(async()=>{try{const r=await reviewCurrentDraft(version);if(!r||version!==revision||step!==6)return;preview=r.html;analysis=r.analysis;integrity=r.integrity;pagination=r.pagination;pageCount=r.pagination.pageCount;refreshAtsRail();updatePageStatus();const frame=host.querySelector('.wf-preview');if(frame){const old=[...frame.contentDocument.querySelectorAll('.block')].map(b=>b.textContent);frame.onload=()=>{highlightResumeKeywords(frame,highlightedTerms);[...frame.contentDocument.querySelectorAll('.block')].forEach((b,i)=>{if(old[i]!==b.textContent){b.style.background='#DDF3E9';b.style.boxShadow='inset 3px 0 #36B58B';b.style.borderRadius='3px'}})};frame.srcdoc=preview;}notify(pagination.explanation+(conciseChanges?' Content shortened; full source retained.':'')+' Save a version to keep edits.');if(kind==='setting'||Boolean(conciseChanges)!==Boolean(host.querySelector('.wf-concise-note')))render()}catch(error){notify(error.message)}},400)}
 }
 async function onChange(event){
  event.stopPropagation();
  if(event.target.matches('[data-wf-template]')){const selected=event.target.value,card=[...host.querySelectorAll('.wf-format-card')].find(card=>card.dataset.format===selected);card?.click();return}
  if(event.target.dataset.guide==='choice'&&guidedEdit){const selected=Number(event.target.value),choice=guidedBulletChoices(resume)[selected];guidedEdit={selected,choice,text:choice.text,confirmed:false,result:null,beforeScore:liveAts?.analysis.score,revision};render();return}
  if(event.target.matches('[data-wf-source]')){const doc=getState().documents.find(d=>d.id===event.target.value&&d.owner===getOwner());if(doc){if(!confirm('Switch the working resume? Saved versions remain unchanged.'))return;const context={...meta};await open(doc);meta={...meta,jd:context.jd,company:context.company,jobId:context.jobId};step=6;stash();await analyze();render()}return}
  if(event.target.id==='wf-file'&&event.target.files?.length&&!busy){host.querySelector('[data-wf=import]')?.click();return}
  if(event.target.dataset.visible){const s=resume.sections.find(s=>s.id===event.target.dataset.visible);if(s){s.visible=event.target.checked;stash()}}
  if(event.target.dataset.bind==='meta.jobId'){
   const job=currentJob();
   if(job){resume.targetRole=job.data.role;meta.company=job.data.company;meta.jd=job.data.jd}
   stash();render();
  }
 }
 async function reviewCurrentDraft(version){
  const owner=getOwner(),user=getState().user.id,current=()=>version===revision&&owner===getOwner()&&user===getState().user.id;
  let r=await api('/api/resume-workflow/review','POST',{resume:structuredClone(resume),jd:meta.jd||''});
  if(!current())return null;
  // Restore the full retained source while preserving edits made to its concise copy.
  if(onePageSource){
   resume=recoverImportedSkills(mergeConciseEdits(onePageSource,onePageApplied,resume));
   onePageSource=null;onePageApplied=null;conciseChanges=null;
   r=await api('/api/resume-workflow/review','POST',{resume:structuredClone(resume),jd:meta.jd||''});
   if(!current())return null;
   clearTimeout(autosaveTimer);try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}
  }
  // Try additional page space, never silently omit or truncate candidate content.
  if(Number(resume.documentSettings.resumeLength)===1&&!r.pagination.fit){
   const candidate=structuredClone(resume);candidate.documentSettings.resumeLength=2;
   const full=await api('/api/resume-workflow/review','POST',{resume:candidate,jd:meta.jd||''});
   if(!current())return null;
   if(full.pagination.fit&&full.integrity.complete){resume=full.resume;r=full;clearTimeout(autosaveTimer);try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}}
  }
  const checked=await api('/api/ats-optimizer/analyse','POST',{resume:r.resume,jd:[r.resume.targetRole,meta.jd||''].filter(Boolean).join('\n'),owner});if(!current())return null;liveAts=checked;meta.skippedKeywords=(meta.skippedKeywords||[]).filter(term=>checked.questions.some(q=>q.term===term));
  return r;
 }
 async function analyze(){
  const owner=getOwner(),version=revision;
  const r=await reviewCurrentDraft(version);
  if(!r||owner!==getOwner()||version!==revision)return;
  analysis=r.analysis;integrity=r.integrity;preview=r.html;resume=r.resume;pagination=r.pagination;pageCount=r.pagination.pages.length;
  message=!integrity?.complete?'This layout omits source content. Review the warning and choose another layout before export.':r.pagination.explanation+(conciseChanges?' Content shortened for one page; full source retained.':'');
 }
 async function save(update=false){
  const owner=getOwner(),user=getState().user.id;
  if(update&&!savedId)throw new Error('Open or save a resume before updating it.');
  const doc=await api(update?'/api/resumes/'+savedId:'/api/resume-workflow/save',update?'PUT':'POST',{resume,...meta,parentId:savedId,owner,expectedUpdated:savedUpdated});
  if(getOwner()!==owner||getState().user.id!==user)throw new Error('Version saved in its original workspace.');
  savedId=doc.id;savedUpdated=doc.updated;resume=doc.data.canonical;clearTimeout(autosaveTimer);
  try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}
  await onSaved(doc);
  message=update?'Resume updated. The previous content is retained in revision history.':'Saved as a new resume version. Earlier versions are available in Documents.';
  return doc;
 }
 async function ensureSaved(){
  if(!savedId)return save();
  const saved=getState().documents.find(d=>d.id===savedId);
  if(!saved||saved.data.title!==meta.title||JSON.stringify(saved.data.canonical)!==JSON.stringify(resume)||['jd','company','jobId','experienceLevel'].some(field=>(saved.data.workflow?.[field]||'')!==(meta[field]||'')))return save();
  return saved;
 }
 async function onClick(event){
  const control=event.target.closest('[data-wf]');if(!control)return;
  event.preventDefault();event.stopPropagation();if(busy)return;
  const action=control.dataset.wf;
  if(action==='whole-close'){fullEdit=null;host.querySelector('.wf-whole-dialog')?.close();return}
  if(action==='whole-open'){if(!liveAts){await analyze();render()}startWholeEdit();return}
  if(action==='whole-tab'){startWholeEdit(control.dataset.mode);return}
  if(['whole-entries','whole-education','whole-certifications'].includes(action)){fullEdit=null;step=action==='whole-entries'?2:action==='whole-education'?3:5;stash();render();return}
  if(action==='whole-bullet'){const selected=Number(control.dataset.index),choice=guidedBulletChoices(resume)[selected];fullEdit=null;guidedEdit={selected,choice,text:choice.text,confirmed:false,result:null,beforeScore:liveAts.analysis.score,revision};render();return}
  if(action==='guide-close'){guidedEdit=null;host.querySelector('.wf-guide-dialog')?.close();return}
  if(action==='guide-open'){const choice=guidedBulletChoices(resume)[0];if(!choice){step=2;stash();render();notify('Add real experience or a project first.');return}guidedEdit={selected:0,choice,text:choice.text,confirmed:false,result:null,beforeScore:liveAts?.analysis.score,revision};render();return}
  if(action==='ats-skip'){const q=liveAts?.questions[Number(control.dataset.index)];if(q){meta.skippedKeywords=[...new Set([...(meta.skippedKeywords||[]),q.term])];try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}refreshAtsRail();notify('Skipped '+q.term+'. It remains a JD gap; your score and resume were not changed.')}return}
  if(action==='ats-show-skipped'){meta.skippedKeywords=[];try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}refreshAtsRail();return}
  if(action==='toggle-fields'){liveFieldsOpen=!liveFieldsOpen;render();return}
  if(action==='improve-inline'){await analyze();render();const rail=host.querySelector('.wf-live-ats');const target=rail?.lastElementChild||rail;target?.scrollIntoView({behavior:'smooth',block:'center'});if(target?.tagName==='DETAILS')target.open=true;target?.querySelector('button,textarea')?.focus({preventScroll:true});return}
  if(action==='templates'){host.querySelector('.wf-format-dialog').showModal();void loadTemplatePreviews();return}
  if(action==='filter-templates'){host.querySelectorAll('.wf-format-card').forEach(card=>card.hidden=control.dataset.family!=='all'&&card.dataset.family!==control.dataset.family);return}
  if(action==='close-templates'){host.querySelector('.wf-format-dialog').close();return}
  if(action==='optimise'){if(!onOptimise){notify('Open ATS score & improve from the navigation.');return}await onOptimise({id:savedId,updated:savedUpdated,data:{title:meta.title||'Working resume',canonical:structuredClone(resume),workflow:{...meta}}});return}
  if(action==='save-draft'){clearTimeout(autosaveTimer);try{localStorage.setItem(key(),JSON.stringify(capture()));notify('Draft saved. You can continue from your dashboard.')}catch{notify('Unable to save on this device. Save a resume version from Review & Export.')}return}
  if(action==='step'||action==='back'||action==='next'||action==='skip'){
   if(action==='next'&&step===0&&!meta.title?.trim()){notify('Give your resume a name before continuing.');host.querySelector('[data-bind="meta.title"]').focus();return}
   if(action==='next'&&step===1&&!resume.profile.fullName?.trim()){notify('Add your full name before continuing.');host.querySelector('[data-bind="profile.fullName"]').focus();return}
   suggestion=null;step=action==='step'?Number(control.dataset.step):step+(action==='back'?-1:1);stash();render();if(step===6){await analyze();render()}return;
  }
  busy=true;host.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=true);
  const startRevision=revision,startOwner=getOwner();
  try{
   if(action==='whole-preview'){
    if(!fullEdit||fullEdit.revision!==revision)throw Error('Draft changed. Reopen the review.');const next=reviseResumeSection(resume,fullEdit.mode,fullEdit.fields),result=await api('/api/ats-optimizer/analyse','POST',{resume:next,jd:optimizerJD(),owner:getOwner()});if(startRevision!==revision||startOwner!==getOwner())return;fullEdit.result=result;fullEdit.error='';
   }
   if(action==='whole-apply'){
    if(!fullEdit?.confirmed||fullEdit.revision!==revision||!fullEdit.result?.fit||!fullEdit.result?.integrity.complete)throw Error('Confirm your details and preview the current section before applying.');const before=liveAts.analysis.score,keywords=liveAts.analysis.keywords,next=fullEdit.result,mode=fullEdit.mode,changedContact=mode==='contact'?['fullName','email','phone','location','linkedin'].find(k=>next.resume.profile[k]!==resume.profile[k]):null;atsHistory.push(structuredClone(resume));atsHistory=atsHistory.slice(-10);resume=next.resume;highlightedTerms=keywordTermsAdded(keywords,next.analysis.keywords);guidedChangedText=mode==='summary'?resume.sections.find(s=>s.type==='summary').content.text:mode==='skills'?fullEdit.fields.text.split(/[,;\n]/).map(t=>t.trim()).filter(Boolean).at(-1):resume.profile[changedContact]||'';fullEdit=null;stash();await analyze();scoreChange={before,after:liveAts.analysis.score};message='Confirmed section updated. Local estimate: '+before+' → '+liveAts.analysis.score+'.';
   }
   if(action==='verify-exports'){
    if(!pagination?.fit||!integrity?.complete)throw Error('Resolve page fit and source coverage before verifying exports.');const checked={};for(const format of ['docx','pdf']){const response=await fetch('/api/resume-workflow/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resume,format,owner:getOwner(),parentId:savedId||undefined})});if(!response.ok)throw Error((await response.json()).error);const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length<100)throw Error('Export is empty.');checked[format]={bytes:bytes.length,pages:response.headers.get('X-Resume-Pages')||null}}if(startRevision!==revision||startOwner!==getOwner())return;exportValidation=checked;message='PDF and Word passed the existing server re-extraction checks. No external checker score was measured.';
   }
   if(action==='guide-preview'){
    if(!guidedEdit||guidedEdit.revision!==revision)throw Error('Draft changed. Reopen the improvement editor.');
    const next=reviseGuidedBullet(resume,guidedEdit.choice,guidedEdit.text),checked=await api('/api/ats-optimizer/analyse','POST',{resume:next,jd:optimizerJD(),owner:getOwner()});
    if(startRevision!==revision||startOwner!==getOwner())return;guidedEdit.result=checked;guidedEdit.error='';
   }
   if(action==='guide-apply'){
    if(!guidedEdit?.confirmed)throw Error('Confirm that your revised details are accurate.');
    if(guidedEdit.revision!==revision||!guidedEdit.result?.fit||!guidedEdit.result?.integrity.complete)throw Error('Preview the current edit and check page fit first.');
    const old=structuredClone(resume),before=liveAts.analysis.score,keywords=liveAts.analysis.keywords,next=guidedEdit.result,choice=guidedEdit.choice;
    atsHistory.push(old);atsHistory=atsHistory.slice(-10);resume=next.resume;highlightedTerms=keywordTermsAdded(keywords,next.analysis.keywords);guidedChangedText=resume.sections.find(s=>s.id===choice.sectionId).content.entries.find(e=>e.id===choice.entryId).bullets[choice.index];guidedEdit=null;stash();await analyze();scoreChange={before,after:liveAts.analysis.score};message='Your confirmed edit was applied. Estimated ATS score: '+before+' → '+liveAts.analysis.score+'.';
   }
   if(action==='choose-template'){if(control.dataset.design)resume.documentSettings.designId=control.dataset.design;else delete resume.documentSettings.designId;resume.documentSettings.fontFamily=control.dataset.font;resume.documentSettings.template=control.dataset.template;resume.documentSettings.typographyPreset=control.dataset.spacing;resume.documentSettings.pageSize=control.dataset.template==='harshibar'?'US Letter':'A4';stash();await analyze();message='Selected template applied to preview and exports. Your original format remains available in the gallery.';}
   if(action==='ats-apply'||action==='ats-confirm'){
    if(!liveAts)throw Error('Refresh the current draft first.');
    const before=structuredClone(resume),beforeResult=liveAts,index=Number(control.dataset.index),item=action==='ats-apply'?liveAts.suggestions[index]:liveAts.questions[index];if(!item)throw Error('Review a fresh suggestion.');
    const body={resume,jd:optimizerJD(),owner:getOwner(),expectedHash:liveAts.hash};
    if(action==='ats-apply')body.suggestionId=item.id;
    else{body.term=item.term;body.confirmed=host.querySelector('[data-wf-confirm="'+index+'"]').checked;body.details=host.querySelector('[data-wf-evidence="'+index+'"]').value;}
    const next=await api('/api/ats-optimizer/'+(action==='ats-apply'?'apply':'confirm'),'POST',body);if(startRevision!==revision||startOwner!==getOwner())return;
    atsHistory.push(before);atsHistory=atsHistory.slice(-10);resume=next.resume;highlightedTerms=keywordTermsAdded(beforeResult.analysis.keywords,next.analysis.keywords);if(action==='ats-confirm')highlightedTerms.push(item.term);if(item.id?.startsWith('skill:'))highlightedTerms.push(item.id.slice(6));scoreChange={before:beforeResult.analysis.score,after:next.analysis.score};stash();await analyze();scoreChange.after=liveAts.analysis.score;message='Applied to this draft and re-scored: '+scoreChange.before+' → '+liveAts.analysis.score+'. Review the green keyword highlights.';
   }
   if(action==='ats-undo'&&atsHistory.length){resume=atsHistory.pop();guidedChangedText='';highlightedTerms=[];scoreChange=null;stash();await analyze();message='Previous draft restored and score recalculated.';}
   if(action==='add-entry'){ensureSection(control.dataset.type).content.entries.push({id:crypto.randomUUID(),title:'',organization:'',location:'',dateRange:'',bullets:[]});stash()}
   if(action==='remove-entry'){if(confirm('Remove this entry from the current draft? Saved versions are kept.')){section(control.dataset.type).content.entries.splice(Number(control.dataset.index),1);stash()}}
   if(action==='move-up'||action==='move-down'){
    const i=resume.sections.findIndex(s=>s.id===control.dataset.section),j=i+(action==='move-up'?-1:1);
    if(j>=0&&j<resume.sections.length){[resume.sections[i],resume.sections[j]]=[resume.sections[j],resume.sections[i]];resume.sections.forEach((s,i)=>s.order=i);stash()}
   }
   if(action==='import'){
    if(resume.sections.some(s=>s.content.text||s.content.entries?.length||s.content.items?.length)&&!confirm('Replace this working draft with the import? Saved versions are kept.'))return;
    const file=host.querySelector('#wf-file').files[0];let payload={rawText:host.querySelector('#wf-import-text').value};
    if(file){if(file.size>1000000)throw new Error('Choose a file up to 1 MB');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('File could not be read'));reader.readAsDataURL(file)});payload={file:{name:file.name,data}}}
    notify('Reading resume and autofilling all sections…');const result=await api('/api/resume-workflow/import','POST',payload);
    if(getOwner()!==startOwner||revision!==startRevision)return;
    const filled=applyResumeAutofill(resume,result.resume,meta,file?.name||'');
    onePageSource=null;onePageApplied=null;conciseChanges=null;resume=filled.resume;meta=filled.meta;savedId='';savedUpdated='';step=0;stash();try{localStorage.setItem(key(),JSON.stringify(capture()))}catch{}message='Autofilled '+filled.counts.experience+' roles, '+filled.counts.projects+' projects, '+filled.counts.education+' education entries and '+filled.counts.skills+' skills. Review details, then continue. Your JD and target company were preserved.';
   }
   if(action==='suggest'){const type=control.dataset.type,index=Number(control.dataset.index),bullets=section(type).content.entries[index].bullets;
    const result=await api('/api/resume-workflow/suggest','POST',{bullets,jd:meta.jd||''});
    if(getOwner()!==startOwner||revision!==startRevision)return;
    suggestion={...result,type,index,mode:'order',revision};
   }
   if(action==='compose')suggestion={type:control.dataset.type,index:Number(control.dataset.index),mode:'compose',revision};
   if(action==='compose-preview'){
    const result=await api('/api/resume-workflow/bullet','POST',{action:host.querySelector('#wf-action').value,task:host.querySelector('#wf-task').value,tools:host.querySelector('#wf-tools').value,result:host.querySelector('#wf-result').value});
    if(getOwner()!==startOwner||revision!==startRevision)return;
    const entry=section(suggestion.type).content.entries[suggestion.index];
    suggestion={...suggestion,mode:'bullet',before:[...entry.bullets],after:[...entry.bullets,result.text]};
   }
   if(action==='apply'){
    if(!suggestion||suggestion.revision!==revision)throw new Error('The draft changed. Review a new suggestion before applying.');
    section(suggestion.type).content.entries[suggestion.index].bullets=[...suggestion.after];stash();message='Applied to the working draft. Save a new version when ready.';
   }
   if(action==='dismiss')suggestion=null;
   if(action==='universal'){notify('Parsing JD, matching confirmed facts and calculating the estimate…');universal=await api('/api/ats/analyse','POST',{resume,jd:meta.jd||'',owner:getOwner()});message='Analysis ready. Review missing evidence before applying any suggestion.';}
   if(action==='apply-universal'&&universal){for(const role of universal.profile.experience){const entry=section('experience')?.content.entries.find(e=>e.title===role.title&&e.organization===role.company);if(entry){const ordered=role.bullets.map(b=>b.text);if(ordered.length===entry.bullets.length&&ordered.every(b=>entry.bullets.includes(b)))entry.bullets=ordered}}stash();await analyze();message='Reordered existing bullets only. No new facts were added.';}
   if(action==='restore-full'&&onePageSource){resume=mergeConciseEdits(onePageSource,onePageApplied,resume);resume.documentSettings.resumeLength=2;onePageSource=null;onePageApplied=null;conciseChanges=null;stash();await analyze();}
   if(action==='analyze'){notify('Preparing preview and local analysis…');await analyze()}
   if(action==='save')await save();
   if(action==='update')await save(true);
   if(action.startsWith('download-')){
    const format=action.slice(9);await analyze();
    let r=await api('/api/resume-workflow/review','POST',{resume,jd:meta.jd||''});
    if(format!=='txt'&&(!r.pagination.fit||!r.integrity.complete))throw new Error('The document exceeds the selected page target. Shorten it or choose two pages before export.');
    notify('Rendering '+format.toUpperCase()+' locally…');
    const response=await fetch('/api/resume-workflow/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resume,format,owner:getOwner(),parentId:savedId||undefined})});
    if(!response.ok)throw new Error((await response.json()).error);
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.style.display='none';link.download=(meta.title||'resume').replace(/[^a-z0-9-]/gi,'_')+'.'+format;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    message='Download ready'+(response.headers.get('X-Resume-Pages')?' · '+response.headers.get('X-Resume-Pages')+' PDF pages':'')+'. Current edits included.';
   }
   if(action==='cover'){const doc=await ensureSaved();await onCover(doc,meta);return}
   if(action==='advanced'){const doc=await ensureSaved();await onAdvanced(doc.id);return}
  }catch(error){message=error.message;if(guidedEdit&&action.startsWith('guide-'))guidedEdit.error=error.message;if(fullEdit&&action.startsWith('whole-'))fullEdit.error=error.message}
  finally{busy=false;if(host?.isConnected)render()}
 }
 return {open,mount,reset};
}
