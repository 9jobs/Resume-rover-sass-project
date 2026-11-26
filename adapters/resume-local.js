export * from '../engine/lib/ai-resume.js';
import {createDefaultWorkingResume as originalDefault} from '../engine/lib/ai-resume.js';
export {ensureCanonicalResume,getPaginatedDocumentModel,buildResumeHtmlDocument,buildDocxFromCanonical} from './resume-format.js';
import {ensureCanonicalResume} from './resume-format.js';
// The preserved editor intentionally clears its old draft on mount. Supply the
// selected saved version through a one-time factory adapter; later New actions
// still receive the original blank resume.
export function createDefaultWorkingResume(){
 if(typeof window!=='undefined'&&!window.__saasSeedConsumed){window.__saasSeedConsumed=true;try{const seed=JSON.parse(window.localStorage.getItem('saas_seed')||'null');if(seed)return ensureCanonicalResume(seed)}catch{}}
 return originalDefault();
}
