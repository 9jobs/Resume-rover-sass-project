import { analyseOptimizer, applyOptimizer } from './resume-optimizer.mjs';

export function matchRoverResume(input) {
  const title = typeof input.jobTitle === 'string' ? input.jobTitle.trim() : '';
  const description = typeof input.jobDescription === 'string' ? input.jobDescription.trim() : '';
  if ((!title && !description) || title.length > 200 || description.length > 15000) {
    throw Object.assign(new Error('Enter a job title or a job description of up to 15,000 characters.'), { status: 400 });
  }
  const jd = description || title;
  const before = analyseOptimizer(input.resume, jd);
  const resume = structuredClone(before.resume);
  if (title) resume.targetRole = title;
  if ([1, 2].includes(input.targetPages)) resume.documentSettings.resumeLength = input.targetPages;
  let result = analyseOptimizer(resume, jd);
  const diff = [];
  const applied = new Set();
  for (let i = 0; i < 12; i++) {
    const proposal = result.suggestions.find(item => item.delta >= 0 && !applied.has(item.id));
    if (!proposal) break;
    applied.add(proposal.id);
    const next = applyOptimizer(result.resume, jd, proposal.id, result.hash);
    if (!next.integrity.complete || (result.fit && !next.fit)) continue;
    result = next;
    diff.push({ id: proposal.id, title: proposal.label, before: proposal.beforeText, after: proposal.afterText });
  }
  return {
    ok: true,
    resume: result.resume,
    beforeScore: before.analysis.readiness,
    afterScore: result.analysis.readiness,
    beforeMatchScore: before.analysis.keywordCoverage,
    afterMatchScore: result.analysis.keywordCoverage,
    matchedKeywords: result.analysis.keywords.filter(term => term.status === 'matched').map(term => term.term),
    missingKeywords: result.analysis.keywords.filter(term => term.status === 'missing').map(term => term.term),
    diff,
  };
}
