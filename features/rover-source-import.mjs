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
  let current;
  const add = title => { const section={id:'source-'+resume.sections.length,type:'custom',title,visible:true,order:resume.sections.length,contentType:'mixed',content:{entries:[],paragraphs:[],bullets:[],blocks:[]}};resume.sections.push(section);return section; };
  for (const line of lines) {
    if (heading.test(line)) {current=add(line.replace(/:$/,''));continue;}
    if (!current) {if(line===resume.profile.fullName)continue;current=add('Contact details');}
    // Keep original order and wording, including any source list markers.
    current.content.paragraphs.push(line);
  }
  resume.rawImport={rawText:source,provider:'source-preserving-local'};
  return {resume:ensureCanonicalResume(resume),provider:'source-preserving-local',message:'AI is temporarily unavailable. Your original source was imported without AI rewriting. Review the editable sections before downloading.'};
}
