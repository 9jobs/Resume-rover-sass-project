// References stay in the original upload text, but are not added to its resume.
export function excludeImportedReferences(resume) {
 if(!resume?.rawImport)return resume;
 const isReference=section=>['references','referees'].includes(section.type)||/^(?:(?:professional|personal|employment|character)\s+)?(?:references?|referees?)(?:\s+(?:and|&)\s+(?:references?|referees?))?(?:\s+details)?\s*(?::.*)?$/i.test(String(section.title||'').trim());
 return {...resume,sections:resume.sections.filter(section=>!isReference(section))};
}
