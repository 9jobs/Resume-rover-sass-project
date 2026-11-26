import { createDefaultWorkingResume, ensureCanonicalResume } from '../engine/lib/ai-resume.js';
import { combineResumeImportSources } from '../engine/lib/resume-import.js';

// Offline recovery copies source text; it never writes AI claims or JD qualifications.
export function importRoverSource(input) {
  const source = combineResumeImportSources(input.uploadedText || '', input.rawText || '');
  if (source.trim().length < 30) throw Object.assign(new Error('Upload readable resume text before converting.'), {status:400});
  const resume = createDefaultWorkingResume();
  resume.sections = [];
  resume.targetRole = String(input.targetRole || '').trim();
  const lines = source.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const first = lines[0] || '';
  resume.profile.fullName = /^[\p{L}][\p{L} .'-]{1,79}$/u.test(first) && !/resume|curriculum|summary|about the job/i.test(first) ? first : '';
  resume.profile.email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  resume.profile.phone = lines.slice(0,10).join('\n').match(/(?:\+\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d[\d ()-]{6,}\d/)?.[0]?.trim() || '';
  for (const field of ['linkedin','github']) resume.profile[field] = source.match(new RegExp('https?://(?:www\\.)?'+field+'\\.com/[^\\s|]+','i'))?.[0] || '';
  const heading = /^(?:(?:professional|personal|career|technical|key|core|work|employment|academic)\s+)?(?:summary|profile|objective|skills?|competencies|experience|history|education|qualifications|projects?|certifications?|training|achievements?|awards?|languages?|references?)\s*:?$/i;
  const contactEnd=lines.findIndex(line=>heading.test(line));
  const contact=lines.slice(1,contactEnd<0?Math.min(lines.length,6):contactEnd);
  resume.profile.location=(contact.flatMap(line=>line.split('|')).map(line=>line.trim()).find(line=>/\b(?:VIC|NSW|QLD|WA|SA|TAS|ACT|NT)\b(?:\s*,?\s*\d{4})?$/i.test(line)&&!/@|https?:/i.test(line))||'').replace(/^(?:location|address)\s*:\s*/i,'');
  let current;
  const add = title => { const type=/summary|profile|objective/i.test(title)?'summary':/skills?|competencies/i.test(title)?'skills':/experience|history/i.test(title)?'experience':/education|qualifications/i.test(title)?'education':/projects?/i.test(title)?'projects':'custom';const section={id:'source-'+resume.sections.length,type,title,visible:true,order:resume.sections.length,contentType:'mixed',content:{text:'',items:[],categories:[],entries:[],paragraphs:[],bullets:[],blocks:[]}};resume.sections.push(section);return section; };
  for (const line of lines) {
    if(!current&&/^(?:contact(?:\s+details)?|personal\s+details)\s*:?$/i.test(line))continue;
    if (heading.test(line)) {current=add(line.replace(/:$/,''));continue;}
    if (!current) {
      if(line===resume.profile.fullName)continue;
      let remainder=line;
      for(const value of Object.values(resume.profile).filter(Boolean))remainder=remainder.replace(value,'');
      if(!remainder.replace(/(?:phone|mobile|email|location|address|linkedin|contact)\s*:?/gi,'').replace(/[\s|,:;•+()-]/g,''))continue;
      current=add('Profile');
    }
    const marker=/^\s*(?:[•●▪◦‣⁃\uF0B7]|[-*]\s)\s*/u;
    const text=line.replace(marker,'').trim(),isBullet=marker.test(line);
    if(current.type==='summary'){current.content.text+=(current.content.text?' ':'')+text;continue;}
    if(current.type==='skills'){
      if(isBullet||!current.content.items.length)current.content.items.push(text);
      else current.content.items[current.content.items.length-1]+=' '+text;
      continue;
    }
    const entries=current.content.entries,last=entries[entries.length-1];
    if(['experience','education','projects'].includes(current.type)&&!isBullet&&/\b(?:19|20)\d{2}\b.*(?:[-–—]|\bPresent\b)/i.test(text)&&text.length<220){
      const date=text.match(/(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}\s*[-–—]\s*(?:Present|Current|(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2})/i);
      const title=date?text.replace(date[0],'').replace(/[\s|,()–—-]+$/,'').trim():text;
      const parts=title.split(/\s*\|\s*/);
      entries.push({id:'source-entry-'+resume.sections.length+'-'+entries.length,title:parts.shift(),organization:parts.join(' | '),dateRange:date?.[0]||'',bullets:[]});continue;
    }
    if(last){if(isBullet)last.bullets.push(text);else if(last.bullets.length)last.bullets[last.bullets.length-1]+=' '+text;else last.title+=' '+text;continue;}
    const blocks=current.content.blocks,previous=blocks[blocks.length-1];
    if(isBullet){if(previous?.type==='bullets')previous.bullets.push(text);else blocks.push({type:'bullets',bullets:[text]});}
    else if(previous?.type==='bullets')previous.bullets[previous.bullets.length-1]+=' '+text;
    else if(previous?.type==='paragraph')previous.text+=' '+text;
    else blocks.push({type:'paragraph',text});
  }
  resume.rawImport={rawText:source,provider:'source-preserving-local'};
  return {resume:ensureCanonicalResume(resume),provider:'source-preserving-local',message:'AI is temporarily unavailable. Your original source was imported without AI rewriting. Review the editable sections before downloading.'};
}
