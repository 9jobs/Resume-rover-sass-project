// Recover document structure only from explicit dates, list markers and headings.
// No generated wording, inferred achievements or source truncation.
const month='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const date='(?:'+month+'\\s*)?(?:19|20)\\d{2}';
const rangeSource='\\b'+date+'\\s*[-–—]\\s*(?:'+date+'|Present|Current|Now)\\b';
const range=new RegExp(rangeSource,'i');
const action='(?:Design(?:ed)?|Develop(?:ed)?|Deliver(?:ed)?|Build|Built|Implement(?:ed)?|Creat(?:e|ed)|Analys(?:e|ed)|Analyz(?:e|ed)|Support(?:ed)?|Collaborat(?:e|ed)|Manag(?:e|ed)|Automat(?:e|ed)|Maintain(?:ed)?|Document(?:ed)?|Identif(?:y|ied)|Improv(?:e|ed)|Coordinat(?:e|ed)|Led|Lead|Gain(?:ed)?|Test(?:ed)?|Integrat(?:e|ed)|Optimis(?:e|ed)|Optimiz(?:e|ed))';
const actionStart=new RegExp('^'+action+'\\b');
export const sourceSkillsHeading=/^(?:(?:technical|professional|core|key|additional|soft|hard)\s+)?(?:skills?(?:\s*(?:&|and)\s*competencies)?|competencies|technical expertise)\s*:?$/i;
export function structureDatedSourceEntries(sourceLines,type='experience'){
 const restored=sourceLines.map(String).join('\n').replace(new RegExp('([.!?])\\s+(?=(?!'+action+'\\b)[A-Z][^.!?\\n]{2,150}'+rangeSource+')','g'),'$1\n');
 const lines=restored.split('\n').map(line=>line.trim()).filter(Boolean);
 const entries=[];let current=null,pending=[],buffer='',explicit=false;
 const flush=()=>{if(!buffer)return;const text=buffer.trim();
  // Unmarked prose can wrap over multiple PDF lines. Keep each original sentence
  // intact; split only at a sentence boundary followed by an action verb.
  current.bullets.push(...(explicit?[text]:text.split(new RegExp('\\s+(?='+action+'\\b)'))));buffer='';
 };
 const header=(title,dateRange)=>{const clean=title.replace(/[\s|,–—-]+$/,''),parts=clean.split(clean.includes('|')?/\s*\|\s*/:/,\s+/).filter(Boolean);return {id:'source-'+type+'-'+entries.length,title:parts.shift()||'',organization:parts.shift()||'',location:parts.join(', '),subtitle:'',dateRange,url:'',bullets:[]}};
 for(let index=0;index<lines.length;index++){
  const line=lines[index];if(sourceSkillsHeading.test(line))break;
  const marked=/^[•●▪*\uF0B7-]\s+/u.test(line),text=line.replace(/^[•●▪*\uF0B7-]\s+/u,''),match=!marked&&line.match(range);
  if(match){
   let title=line.slice(0,match.index).trim(),tail=line.slice(match.index+match[0].length).replace(/^[\s|:–—-]+/,'');
   if(!title){if(!pending.length)return null;title=pending.join(' ');pending=[]}
   else if(pending.length){title=pending.join(' ')+' '+title;pending=[]}
   if(!title||title.length>180||actionStart.test(title)||/[.!?]$/.test(title))return null;
   if(current)flush();current=header(title,match[0]);if(!current.title)return null;entries.push(current);explicit=false;buffer=tail;continue;
  }
  // A short title/company line followed by its own date starts the next role.
  if(!marked&&range.test(lines[index+1]||'')&&!(lines[index+1]||'').slice(0,(lines[index+1]||'').search(range)).trim()){
   if(current)flush();pending.push(text);continue;
  }
  if(!current){pending.push(text);continue}
  if(marked){flush();buffer=text;explicit=true}
  else{buffer=[buffer,text].filter(Boolean).join(' ')}
 }
 if(pending.length||!current)return null;flush();
 return entries.length&&entries.every(e=>e.bullets.length)?entries:null;
}
export function repairSourceEntryHeader(entry,type){
 const header=[entry.title,entry.organization,entry.location,entry.subtitle].filter(Boolean).join(' | ');
 const embeddedRole=(entry.bullets||[]).some(text=>new RegExp('[.!?]\\s+(?!'+action+'\\b)[A-Z][^.!?\\n]{2,150}'+rangeSource).test(text));
 if(header.length<=180&&!embeddedRole)return [entry];
 let line=header;
 if(!range.test(line)){
  if(embeddedRole&&entry.dateRange)line+=' | '+entry.dateRange;
  else{
  const boundary=line.search(new RegExp('\\s*\\|\\s*(?='+action+'\\b)'));
  if(boundary<0||!entry.dateRange)return [entry];
  line=line.slice(0,boundary)+' | '+entry.dateRange+' | '+line.slice(boundary).replace(/^\s*\|\s*/,'');
  }
 }
 const entries=structureDatedSourceEntries([line,entry.description||'',...(entry.bullets||[]).map(text=>'- '+text)],type);
 if(!entries)return [entry];
 entries.forEach((item,index)=>{item.id=index?entry.id+'-recovered-'+index:entry.id});if(entry.dateRange)entries[0].dateRange=entry.dateRange;if(entry.url)entries[0].url=entry.url;
 return entries;
}
