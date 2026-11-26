import {createInterviewCoach} from './features/interview-coach.mjs';
import {exportDesignedResume} from './adapters/resume-design-export.mjs';
import {resumeDesign,RESUME_DESIGNS} from './adapters/resume-designs.js';
import {analyseOptimizer,applyOptimizer,confirmOptimizer} from './features/resume-optimizer.mjs';
import {applySourceSkills} from './features/resume-source-skills.mjs';
import {importResumeWithSourceLists} from './adapters/resume-docx-source.mjs';
import {previewOriginalFile,applyOriginalWordSuggestion,validateOriginalSource} from './adapters/resume-original.mjs';
import {createResumeCrud} from './features/resume-crud.mjs';
import {analyseUniversal} from './features/ats-python.mjs';
import {buildDocxFromCanonical,buildResumeHtmlDocument,getPaginatedDocumentModel} from './adapters/resume-format.js';
import {renderLocalPdf} from './features/resume-pdf.mjs';
import {auditResumeContent} from './features/resume-integrity.mjs';
import {extractDocxResumeText} from './engine/lib/docx-resume-import.js';
import {MAX_IMPORT_BYTES} from './engine/lib/resume-import.js';
// Local wrapper; all files under engine/ remain byte-for-byte copies.

import http from 'node:http';
import {createResumeWorkflow} from './features/resume-workflow.mjs';

import https from 'node:https';

import fs from 'node:fs';

import path from 'node:path';

import {fileURLToPath} from 'node:url';

import {createStore} from './store.mjs';
import {createTursoDatabase} from './features/turso-store.mjs';
import {getMarketingPage} from './public/marketing-pages.js';
import {loadGeminiConfig,createGemini,createReloadingGemini} from './features/gemini.mjs';
import {createCareerFeatures} from './features/career.mjs';
import {loadAuthConfig,createAuthExtensions,sessionCookie} from './features/auth.mjs';

import {createDefaultWorkingResume,ensureCanonicalResume,canonicalToPlainText,analyzeResume} from './engine/lib/ai-resume.js';

const hosted=process.env.VERCEL==='1';
const root=hosted?process.cwd():path.dirname(fileURLToPath(import.meta.url));
if(!hosted)process.chdir(root);

const geminiConfig={key:process.env.GEMINI_API_KEY||'',model:process.env.GEMINI_MODEL||''};
const authConfig=loadAuthConfig(root);
const privateGeminiFetch=globalThis.fetch.bind(globalThis);
if(!hosted)globalThis[Symbol.for("rover.native.geminiFetch")]=(input,init)=>{const url=new URL(String(input));if(url.protocol!=="https:"||url.hostname!=="generativelanguage.googleapis.com")throw new Error("Unsupported Rover AI destination");return privateGeminiFetch(input,init)};
if(!hosted)for(const k of Object.keys(process.env))if(/CLERK|GEMINI|OPENAI|STRIPE|RAZORPAY|DATABASE_URL|DOCRAPTOR|GOOGLE_CLIENT|GOOGLE_REDIRECT/i.test(k))delete process.env[k];

process.env.NEXT_TELEMETRY_DISABLED='1';

const local=u=>{try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(u).hostname)}catch{return false}};

const originalFetch=globalThis.fetch;
if(!hosted)globalThis.fetch=(u,o)=>{if(!local(typeof u==='string'||u instanceof URL?String(u):u.url))throw new Error('External network disabled in local demo');return originalFetch(u,o)};

if(!hosted)for(const mod of [http,https]){const request=mod.request.bind(mod);mod.request=function(...args){const a=args[0];const host=typeof a==='string'||a instanceof URL?new URL(a).hostname:(a.hostname||a.host||'localhost');if(!['localhost','127.0.0.1','::1'].includes(host))throw new Error('External network disabled');return request(...args)};mod.get=function(...args){const r=mod.request(...args);r.end();return r}}

let handle,store,resumeWorkflow,resumeCrud,career,interviewCoach,authExtensions;
const careerGemini=createReloadingGemini(root,geminiConfig,{transport:privateGeminiFetch});
function initializeWorkspace(){
 if(store)return;
 const db=hosted?createTursoDatabase(root,process.env.TURSO_DATABASE_URL,process.env.TURSO_AUTH_TOKEN):undefined;
 const workspace=createStore(path.join(root,'data/local.sqlite'),db);
 if(!hosted)workspace.seed();
 authExtensions=hosted?{
  configFor:()=>({googleConfigured:false,recoveryEnabled:false,rememberMeSupported:true}),
  finishPendingLink:()=>false,
 }:createAuthExtensions(workspace,{root,config:authConfig,transport:privateGeminiFetch});
 resumeWorkflow=createResumeWorkflow(workspace);
 resumeCrud=createResumeCrud(workspace);
 career=createCareerFeatures(workspace,careerGemini);
 interviewCoach=createInterviewCoach(workspace,careerGemini);
 store=workspace;
}
const authCookie=(sid,remember)=>sessionCookie(sid,remember)+(hosted?'; Secure':'');
const cookie=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sid='))?.slice(4)||'';

const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};

async function body(req){let data='';for await(const chunk of req){data+=chunk;if(data.length>2_000_000)throw Object.assign(new Error('Request too large'),{status:413})}try{return data?JSON.parse(data):{}}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}}

const attempts=new Map();

function safeImport(raw){if(typeof raw!=='string'||!raw.trim()||raw.length>45000)throw Object.assign(new Error('Paste 1–45000 characters of source resume text'),{status:400});const r=createDefaultWorkingResume();r.sections=[{id:'source',type:'custom',title:'IMPORTED SOURCE',visible:true,order:0,contentType:'mixed',content:{paragraphs:raw.split(/\n+/),entries:[],bullets:[],blocks:[]}}];r.rawImport={rawText:raw};return ensureCanonicalResume(r)}

export async function handleWorkspaceRequest(req,res){

 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self' blob:; frame-ancestors 'self'; form-action 'self'; object-src 'none'; base-uri 'self'");

 try{

 const url=new URL(req.url,hosted?'https://'+req.headers.host:'http://127.0.0.1');const p=url.pathname;

 if(!hosted&&!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'Loopback Host required'});

 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&((req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)||req.headers['sec-fetch-site']==='cross-site'))return json(res,403,{error:'Same-origin requests required'});

 if(hosted&&/^\/api\/auth\/(google|recovery)\//.test(p))return json(res,503,{error:'Use email and password to sign in to this workspace.'});
 initializeWorkspace();
 if(p==='/api/health')return json(res,200,{ok:true,mode:hosted?'hosted':'local-only'});

 if(p==='/api/newsletter/subscribe'){
  if(req.method!=='POST')return json(res,405,{error:'POST required'});
  const input=await body(req);
  const email=typeof input?.email==='string'?input.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||email.indexOf('@')!==email.lastIndexOf('@')){
   return json(res,400,{error:'Enter a valid email address.'});
  }
  store.db.exec('CREATE TABLE IF NOT EXISTS newsletter_signups (email TEXT PRIMARY KEY, created_at TEXT NOT NULL)');
  store.db.prepare('INSERT OR IGNORE INTO newsletter_signups (email, created_at) VALUES (?, ?)').run(email,new Date().toISOString());
  return json(res,200,{ok:true});
 }

 if(p==='/api/auth/config'&&req.method==='GET')return json(res,200,{...authExtensions.configFor(req),roverWorkspace:true});
 if(p==='/api/auth/recovery/request'&&req.method==='POST'){const b=await body(req);return json(res,200,authExtensions.requestRecovery(b.email,req.socket.remoteAddress,'http://'+req.headers.host))}
 if(p==='/api/auth/recovery/complete'&&req.method==='POST'){const result=authExtensions.resetPassword(await body(req),req.socket.remoteAddress);res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,result)}
 if(p==='/api/auth/google/start'&&req.method==='GET'){if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Start Google sign-in from the login page'});const result=authExtensions.startGoogle(req.headers.host);if(result.binding)res.setHeader('Set-Cookie',`oauth_bind=${result.binding}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);res.writeHead(302,{Location:result.canonical||result.url});return res.end()}
 if(p==='/api/auth/google/callback'&&req.method==='GET'){
  const c=Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length===2));
  try{const result=await authExtensions.finishGoogle({state:url.searchParams.get('state'),code:url.searchParams.get('code'),binding:c.oauth_bind,error:url.searchParams.get('error')});if(result.pendingLink){res.setHeader('Set-Cookie',`oauth_link=${result.pendingLink}; HttpOnly; SameSite=Strict; Path=/; Max-Age=300`);res.writeHead(302,{Location:'/#login?google=link'});return res.end()}const sid=store.session(result.user);res.setHeader('Set-Cookie',[sessionCookie(sid),'oauth_bind=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0','oauth_link=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0']);res.writeHead(302,{Location:'/'});return res.end()}
  catch(e){console.error(e.code||'GOOGLE_AUTH_ERROR');res.setHeader('Set-Cookie',['oauth_bind=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0','oauth_link=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0']);res.writeHead(302,{Location:'/#login?google='+encodeURIComponent(e.code==='GOOGLE_CANCELLED'?'cancelled':e.code==='GOOGLE_NOT_CONFIGURED'?'configuration':'failed')});return res.end()}
 }
 if(p==='/api/auth/signup'||p==='/api/auth/login'){

 if(req.method!=='POST')return json(res,405,{error:'POST required'});const key=req.socket.remoteAddress;const a=attempts.get(key)||{n:0,at:Date.now()};if(Date.now()-a.at>60000){a.n=0;a.at=Date.now()}if(++a.n>30)return json(res,429,{error:'Too many attempts. Try again in one minute.'});attempts.set(key,a);

 const b=await body(req);const u=p.endsWith('signup')?store.signup(b):store.login(b.email,b.password);authExtensions.finishPendingLink(u,req);const sid=store.session(u);res.setHeader('Set-Cookie',[authCookie(sid,b.remember!==false),'oauth_link=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0','oauth_bind=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0']);return json(res,200,{user:store.publicUser(u)})}

 const isPublicPage = p === '/' || getMarketingPage(p);
 if(isPublicPage || ['/app.js','/style.css','/marketing-pages.js','/resume-workflow.js','/source-list-markers.js','/ats-workbench.js','/template-showcase.js','/interview-voice.js','/template-previews/catalog.json',...RESUME_DESIGNS.map(d=>'/template-previews/'+d.id+'.html')].includes(p)){const f=path.join(root,'public',isPublicPage?'index.html':p.slice(1));res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html');return res.end(fs.readFileSync(f))}

 const u=store.authenticate(cookie(req));if(!u){if(p.startsWith('/api/'))return json(res,401,{error:'Please sign in'});res.writeHead(302,{Location:'/'});return res.end()}

 if(p==='/api/auth/logout'){if(req.method!=='POST')return json(res,405,{error:'POST required'});store.logout(cookie(req));res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}

 
 if(p==='/api/ats/analyse'&&req.method==='POST'){const b=await body(req);if(b.owner)store.access(u,b.owner);if(b.parentId)store.record(u,b.parentId,'document');return json(res,200,await analyseUniversal({resume:b.resume,profile:b.profile,jd:b.jd}))}
 if(p==='/api/ats-optimizer/source-skills'){if(req.method!=='POST')return json(res,405,{error:'POST required'});const b=await body(req);store.access(u,b.owner||u.id);return json(res,200,applySourceSkills(b.resume,b.jd||'',b.expectedHash))}
 if(p==='/api/ats-source/preview'){if(req.method!=='POST')return json(res,405,{error:'POST required'});const b=await body(req);store.access(u,b.owner||u.id);const source=await previewOriginalFile(b.file);res.setHeader('Content-Type','application/pdf');res.setHeader('X-Source-Hash',source.hash);res.setHeader('X-Source-Pages',String(source.pages));return res.end(source.bytes)}
 if(p==='/api/ats-source/apply'){if(req.method!=='POST')return json(res,405,{error:'POST required'});const b=await body(req);store.access(u,b.owner||u.id);return json(res,200,await applyOriginalWordSuggestion(b))}
 if(p==='/api/ats-source/save'){if(req.method!=='POST')return json(res,405,{error:'POST required'});const b=await body(req);store.access(u,b.owner||u.id);validateOriginalSource(b.originalSource?.original);if(b.originalSource.current)validateOriginalSource(b.originalSource.current);const doc=resumeWorkflow.save(u,b);const data={...doc.data,originalSource:b.originalSource};store.db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(data),doc.id);return json(res,200,store.record(u,doc.id,'document'))}
 const optimizerRoute=p.match(/^\/api\/ats-optimizer\/(analyse|apply|confirm|save)$/);
 if(optimizerRoute){if(req.method!=='POST')return json(res,405,{error:'POST required'});const b=await body(req);store.access(u,b.owner||u.id);if(b.resumeId)store.record(u,b.resumeId,'document');
  if(optimizerRoute[1]==='save'){analyseOptimizer(b.resume,b.jd||'');const doc=b.updateId?resumeCrud.update(u,b.updateId,b):resumeWorkflow.save(u,b);const checked=analyseOptimizer(doc.data.canonical,b.jd||'');const data={...doc.data,optimizer:{score:checked.analysis.score,readiness:checked.analysis.readiness,keywordCoverage:checked.analysis.keywordCoverage,hash:checked.hash,scoredAt:new Date().toISOString()}};store.db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(data),doc.id);return json(res,200,store.record(u,doc.id,'document'))}
  const result=optimizerRoute[1]==='analyse'?analyseOptimizer(b.resume,b.jd||''):optimizerRoute[1]==='apply'?applyOptimizer(b.resume,b.jd||'',b.suggestionId,b.expectedHash):confirmOptimizer(b.resume,b.jd||'',b);return json(res,200,result);
 }
 const workflowMatch=p.match(/^\/api\/resume-workflow\/(import|review|suggest|bullet|save)$/);
 if(workflowMatch){
  if(req.method!=='POST')return json(res,405,{error:'POST required'});
  const b=await body(req);
  const methods={import:()=>importResumeWithSourceLists(resumeWorkflow,b),review:()=>resumeWorkflow.review(b),suggest:()=>resumeWorkflow.suggest(b),bullet:()=>resumeWorkflow.draftBullet(b),save:()=>resumeWorkflow.save(u,b)};
  return json(res,200,await methods[workflowMatch[1]]());
 }
 if(p==='/api/resume-workflow/export'){
 if(req.method!=='POST')return json(res,405,{error:'POST required'});
 const b=await body(req),format=b.format;
 if(!['pdf','docx'].includes(format))return json(res,400,{error:'Choose PDF or Word'});
 const result=resumeDesign(b.resume)?await exportDesignedResume(u,b,format,store):await resumeWorkflow.exportDraft(u,b,format);
 res.setHeader('Content-Type',result.type);
 res.setHeader('Content-Disposition','attachment; filename="resume.'+format+'"');
 if(result.pages)res.setHeader('X-Resume-Pages',String(result.pages));
 return res.end(result.bytes);
 }
 const workflowDownload=p.match(/^\/api\/resume-workflow\/download\/([a-zA-Z0-9-]+)$/);
 if(workflowDownload){
  if(req.method!=='GET')return json(res,405,{error:'GET required'});
  const format=url.searchParams.get('format')||'pdf';
  const result=await resumeWorkflow.download(u,workflowDownload[1],format);
  res.setHeader('Content-Type',result.type);
  if(result.pages)res.setHeader('X-Resume-Pages',String(result.pages));
  res.setHeader('Content-Disposition','attachment; filename="resume.'+format+'"');
  return res.end(result.bytes);
 }

 if(p==='/api/state'&&req.method==='GET')return json(res,200,{...store.state(u),...career.state(u)});

 if(!hosted&&p.startsWith('/api/rover-workspace/')&&req.method==='POST'){
  if(p==='/api/rover-workspace/parse-docx'){
   const chunks=[];
   let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>MAX_IMPORT_BYTES+65536)return json(res,413,{error:'Choose a DOCX file up to 10 MB.'});
    chunks.push(chunk);
   }
   const form=await new Request(url,{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:Buffer.concat(chunks)}).formData().catch(()=>null);
   const file=form?.get('file');
   if(!file||typeof file.arrayBuffer!=='function'||!/\.docx$/i.test(file.name))return json(res,400,{error:'Choose a DOCX file.'});
   const source=await extractDocxResumeText(Buffer.from(await file.arrayBuffer()));
   return json(res,200,{ok:true,text:source});
  }
  const b=await body(req);
  if(p==='/api/rover-workspace/import'){
   const imported=await resumeWorkflow.importResume({rawText:b.rawText||b.uploadedText});
   for(const section of imported.resume.sections.filter(section=>section.type==='skills'&&section.layout==='compact-list')){
    const {items,categories}=section.content;
    section.content.items=[...new Set([...items,...categories.flatMap(category=>category.items)])];
    section.content.categories=[];
   }
   const role=typeof b.targetRole==='string'?b.targetRole.trim().slice(0,200):'';
   if(role)imported.resume.targetRole=role;
   return json(res,200,{ok:true,resume:imported.resume,provider:'local'});
  }
 }

 if(p==='/api/gemini/status'&&req.method==='GET')return json(res,200,career.state(u).gemini);
 if(p==='/api/interview-resumes'&&req.method==='POST')return json(res,200,career.uploadResume(u,await body(req),'interview'));
 if(p==='/api/cover-letter-resumes'&&req.method==='POST')return json(res,200,career.uploadResume(u,await body(req)));
 if(p==='/api/cover-letters/generate-local'&&req.method==='POST')return json(res,200,career.generateLocalLetter(u,await body(req)));
 if(p==='/api/cover-letters/generate'&&req.method==='POST')return json(res,200,await career.generateLetter(u,await body(req)));
 if(p==='/api/interviews/coach'&&req.method==='POST')return json(res,200,await interviewCoach.ask(u,await body(req)));
 if(p==='/api/interviews/generate'&&req.method==='POST')return json(res,200,await career.prepare(u,await body(req)));
 const aiRoute=p.match(/^\/api\/(cover-letters|interviews)\/([a-zA-Z0-9-]+)(?:\/(download|feedback))?$/);
 if(aiRoute){const [,kind,id,action]=aiRoute;if(kind==='cover-letters'&&action==='download'&&req.method==='GET'){const format=url.searchParams.get('format')||'docx';if(!['docx','pdf'].includes(format))return json(res,400,{error:'Choose DOCX or PDF'});const out=await career.download(u,id,format);res.setHeader('Content-Type',out.type);res.setHeader('Content-Disposition',`attachment; filename="cover-letter.${format}"`);return res.end(out.bytes)}if(action==='feedback'&&kind==='interviews'&&req.method==='POST')return json(res,200,await career.feedback(u,id,await body(req)));if(!action&&req.method==='GET')return json(res,200,store.record(u,id,kind==='cover-letters'?'cover-letter':'interview-session'));if(!action&&req.method==='PUT')return json(res,200,kind==='cover-letters'?career.editLetter(u,id,await body(req)):career.practice(u,id,await body(req)));return json(res,405,{error:'Method not allowed'})}
 if(p==='/api/team'&&req.method==='POST')return json(res,200,store.member(u,await body(req)));

 if(p==='/api/plan'&&req.method==='POST')return json(res,200,store.plan(u,await body(req)));

 if(p==='/api/draft'&&req.method==='POST')return json(res,200,store.draft(u,await body(req)));

 const resumeRoute=p.match(/^\/api\/resumes\/([a-zA-Z0-9-]+)(?:\/(rename|duplicate|restore))?$/);
 if(resumeRoute){const [,id,action]=resumeRoute;
  if(!action&&req.method==='GET')return json(res,200,store.record(u,id,'document'));
  if(!action&&req.method==='PUT')return json(res,200,resumeCrud.update(u,id,await body(req)));
  if(!action&&req.method==='DELETE')return json(res,200,resumeCrud.remove(u,id,await body(req)));
  if(action&&req.method==='POST')return json(res,200,resumeCrud[action](u,id,await body(req)));
  return json(res,405,{error:'Method not allowed'});
 }
 const match=p.match(/^\/api\/records\/([^/]+)(?:\/([^/]+))?(?:\/(download|review))?$/);

 if(match){const [,kind,id,action]=match;if(action==='download'&&req.method==='GET'){const d=store.record(u,id,'document');const fmt=url.searchParams.get('format')||'txt';if(fmt==='docx'){if(!d.data.canonical)return json(res,400,{error:'Open this version in the resume editor and save it first'});const layout=getPaginatedDocumentModel(d.data.canonical);if(!layout.fit)return json(res,422,{error:'Content exceeds your selected page target. Choose two pages or shorten the draft.'});const blob=buildDocxFromCanonical(d.data.canonical);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');res.setHeader('Content-Disposition','attachment; filename="resume.docx"');return res.end(Buffer.from(await blob.arrayBuffer()))}res.setHeader('Content-Type',fmt==='json'?'application/json':'text/plain; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="resume.${fmt==='json'?'json':'txt'}"`);return res.end(fmt==='json'?JSON.stringify(d.data,null,2):d.data.content)}if(action==='review'&&req.method==='POST')return json(res,200,store.review(u,id,await body(req)));if(req.method==='GET')return json(res,200,id?store.record(u,id,kind):store.list(u,kind));if(req.method==='POST'||req.method==='PUT'){const b=await body(req);if(kind==='document'&&b.canonical)b.content=canonicalToPlainText(ensureCanonicalResume(b.canonical));return json(res,200,store.write(u,kind,b,id))}return json(res,405,{error:'Method not allowed'})}

 if(p==='/api/engine-seed'&&req.method==='GET'){const id=url.searchParams.get('document');const owner=url.searchParams.get('owner')||u.id;store.access(u,owner);let resume=createDefaultWorkingResume();if(id){const d=store.record(u,id,'document');resume=d.data.canonical||safeImport(d.data.content)}return json(res,200,{resume,user:u.id,owner})}

 if(p.startsWith('/api/rover-native/')){
  if(!store.authenticate(cookie(req)))return json(res,401,{error:'Please sign in'});
  if(p==='/api/rover-native/pdf'&&req.method==='POST'){
   const {resume}=await body(req);
   const native=await import('./engine/lib/ai-resume.js');
   const model=native.getPaginatedDocumentModel(resume);
   if(!model.fit)return json(res,422,{error:'Content exceeds your page target. Review Fit Suggestions or choose two pages.'});
   const bytes=await renderLocalPdf(native.buildResumeHtmlDocument(resume));
   res.setHeader('Content-Type','application/pdf');return res.end(bytes);
  }
  if(hosted){
   if(req.method!=='POST')return json(res,405,{error:'POST required'});
   const action=p.split('/').pop();
   if(action==='optimize'){
    const input=await body(req);
    if(input.mode!=='import')return json(res,400,{error:'Use resume import or the job tailoring action.'});
    const {importRoverResume}=await import('./features/rover-import-retry.mjs');
    const config=loadGeminiConfig(root);
    const result=await importRoverResume(input,{apiKey:config.key,backupModel:config.model,fetchImpl:privateGeminiFetch});
    return json(res,200,{ok:true,...result,provider:result.provider||'gemini'});
   }
   const handlers={'tailor-jd':()=>import('./features/rover-native-tailor-jd.mjs'),'parse-docx':()=>import('./features/rover-native-parse-docx.mjs'),'validate-docx':()=>import('./features/rover-native-validate-docx.mjs')};
   if(!handlers[action])return json(res,404,{error:'Unknown resume action'});
   const route=await handlers[action]();
   const result=await route.POST(new Request(url,{method:req.method,headers:req.headers,body:req,duplex:'half'}));
   res.statusCode=result.status;res.setHeader('Content-Type',result.headers.get('content-type')||'application/json');
   return res.end(Buffer.from(await result.arrayBuffer()));
  }
  return handle(req,res);
 }

 if(p==='/api/payments/status')return json(res,200,{premium:true,simulation:true});

 if(p==='/api/resume/optimize'&&req.method==='POST'){const b=await body(req);return json(res,200,{ok:true,resume:safeImport(b.rawText),provider:'local-demo',message:'Source-preserving demo import; no AI service called'})}

 if(p==='/api/resume/score'&&req.method==='POST'){const b=await body(req);return json(res,200,{ok:true,ats:analyzeResume(ensureCanonicalResume(b.resume),b.jobDescription||''),provider:'deterministic-local'})}

 if(p==='/api/resume/tailor-jd'&&req.method==='POST'){const b=await body(req),r=ensureCanonicalResume(b.resume),a=analyzeResume(r,b.jobDescription||'');return json(res,200,{ok:true,resume:r,beforeScore:a.readinessScore,afterScore:a.readinessScore,beforeMatchScore:a.jobMatchScore,afterMatchScore:a.jobMatchScore,matchedKeywords:a.matchedKeywords||[],missingKeywords:a.missingKeywords||[],changes:[],provider:'local-demo',message:'Demo analysis only. Resume facts preserved; edit wording yourself.'})}

 if(['/api/resume/parse-docx','/api/resume/validate-docx'].includes(p)){
  if(!hosted)return handle(req,res);
  if(req.method!=='POST')return json(res,405,{error:'POST required'});
  const route=p.endsWith('parse-docx')?await import('./engine/app/api/resume/parse-docx/route.js'):await import('./engine/app/api/resume/validate-docx/route.js');
  const result=await route.POST(new Request(url,{method:req.method,headers:req.headers,body:req,duplex:'half'}));
  const contentType=result.headers.get('content-type');
  if(contentType)res.setHeader('Content-Type',contentType);
  res.statusCode=result.status;
  return res.end(Buffer.from(await result.arrayBuffer()));
 }

 if(p==='/api/resume/pdf'&&req.method==='POST'){const input=await body(req);const model=getPaginatedDocumentModel(input.resume);const html=buildResumeHtmlDocument(input.resume);if(!model.fit||!auditResumeContent(input.resume,html).complete)return json(res,422,{error:'Content exceeds your page target. Choose two pages or shorten the draft before downloading.'});const bytes=await renderLocalPdf(html);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="resume.pdf"');return res.end(bytes)}

 if(p.startsWith('/api/'))return json(res,403,{error:'Live integrations disabled; use the local Account simulation'});

 const editorRoute = p === '/career-cockpit' || p === '/original-resume-editor';
 if(editorRoute){const scope=url.searchParams.get('localScope')||'';const parts=scope.split(':');if(parts[0]!=='resume'||parts[1]!==u.id)return json(res,403,{error:'Open the editor from your workspace'});store.access(u,parts[2]);}

 if(editorRoute||p.startsWith('/_next/')||(!hosted&&p.startsWith('/__nextjs'))||p.startsWith('/img/')||p==='/favicon.ico')return handle(req,res);

 res.writeHead(302,{Location:'/'});res.end();

 }catch(e){console.error(e.code||'LOCAL_REQUEST_ERROR');if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Unable to complete request',...(e.code?{code:e.code}:{})});else res.end()}

}

if(!hosted){
const {default:next}=await import('next');

const app=next({dev:true,dir:path.join(root,'wrapper-next'),hostname:'127.0.0.1',conf:{distDir:'.local-saas-build',webpack(config){config.resolve.alias['@clerk/nextjs$']=path.join(root,'adapters/clerk-local.jsx');return config}}});

await app.prepare();handle=app.getRequestHandler();

try{initializeWorkspace()}catch(error){console.error('LOCAL_DATABASE_STARTUP_FAILED',error);process.exit(1)}
const server=http.createServer(handleWorkspaceRequest);
const preferred=Number(process.env.LOCAL_PORT||3210);let port=preferred;server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<preferred+20){server.listen(++port,'127.0.0.1')}else{console.error(e);process.exit(1)}});server.listen(port,'127.0.0.1',()=>console.log(`LOCAL_SAAS_URL=http://127.0.0.1:${server.address().port}`));
}
