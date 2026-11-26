import {ensureCanonicalResume,buildResumeHtmlDocument} from '../engine/lib/ai-resume.js';
const normalise=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}+#]/gu,'');
function htmlText(html){
 const links=[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]).join(' ');
 return (html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')+' '+links)
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ');
}
function contentFields(value,path,output){
 if(typeof value==='string'){if(value.trim())output.push({section:path,text:value.trim()});return}
 if(Array.isArray(value)){value.forEach(item=>contentFields(item,path,output));return}
 if(value&&typeof value==='object'){
  for(const [key,item] of Object.entries(value)){
   if(['id','type','contentType','order','visible','layout','url'].includes(key))continue;
   contentFields(item,path,output);
  }
 }
}
export function auditResumeContent(input,html){
 const resume=ensureCanonicalResume(input),expected=[];
 for(const [key,value] of Object.entries(resume.profile||{})){
  if(value&&key!=='github'&&key!=='linkedin'&&key!=='portfolio'&&key!=='website')expected.push({section:'Contact',text:String(value)});
 }
 for(const section of resume.sections.filter(s=>s.visible!==false))contentFields(section.content,section.title||section.type,expected);
 const rendered=normalise(htmlText(html||buildResumeHtmlDocument(resume)));
 const unique=[...new Map(expected.filter(item=>normalise(item.text).length>1).map(item=>[normalise(item.text),item])).values()];
 const missing=unique.filter(item=>!rendered.includes(normalise(item.text))).map(item=>({section:item.section,text:item.text.slice(0,240)}));
 return {complete:missing.length===0,checked:unique.length,present:unique.length-missing.length,missing,label:'Source-to-preview content check'};
}

export function auditResumeText(input,text){return auditResumeContent(input,String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))}
