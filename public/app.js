import {createInterviewVoice,voiceMicButton,voiceReadButton} from '/interview-voice.js';
import {createAtsWorkbench} from '/ats-workbench.js';
import {createResumeWorkflow,RESUME_DESIGNS} from '/resume-workflow.js';
import {mountTemplateShowcase} from '/template-showcase.js';
import {getMarketingPage} from '/marketing-pages.js';
const $=s=>document.querySelector(s),root=$('#app');let state=null,page=({'#resume-builder':'Resume Builder','#ats-score':'ATS Optimizer','#cover-letter':'Cover Letter','#interview-prep':'Interview Prep','#documents':'Documents','#profile':'Profile','#jobs':'Jobs','#account':'Account'}[location.hash]||'Dashboard'),scope='',authMode='login',editingJob=null,editorContext=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const options=(xs,value)=>xs.map(x=>{const [v,t]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`}).join('');

const field=(name,label,value='',type='text')=>`<label>${esc(label)}${type==='textarea'?`<textarea name="${name}">${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${['name','email','password','company','role','title'].includes(name)?'required':''} ${type==='password'?'minlength="12" autocomplete="current-password"':''}>`}</label>`;

const select=(name,label,values,value)=>`<label>${esc(label)}<select name="${name}">${options(values,value)}</select></label>`;

const button=(action,label,id='',cls='secondary')=>`<button class="${cls}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;

const empty=t=>`<div class="empty">${t}</div>`;

const own=xs=>xs.filter(x=>x.owner===scope);

const person=id=>state.members.find(m=>m.id===id)?.name||state.user.name;

function toast(t){const el=$('#toast');el.textContent=t;el.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.style.display='none',6000)}

async function api(url,method='GET',data){const r=await fetch(url,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const b=await r.json();if(!r.ok)throw new Error(b.error||'Request failed');return b}

async function refresh(){state=await api('/api/state');if(!scope||scope!==state.user.id&&!state.members.some(m=>m.id===scope))scope=state.user.id}

const workflow=createResumeWorkflow({
 api,getState:()=>state,getOwner:()=>scope,
 onSaved:async()=>{await refresh()},
 onCover:async(doc,meta)=>{
  careerReset();
  careerInputs.letter={resumeId:doc.id,jobId:meta.jobId||'',targetRole:doc.data.canonical?.targetRole||'',company:meta.company||'',jd:meta.jd||''};
  page='Cover Letter';history.replaceState(null,'','#cover-letter');render();
 },
 onOptimise:async doc=>{atsWorkbench.open(doc);page='ATS Optimizer';history.replaceState(null,'','#ats-score');render()},
 onAdvanced:async id=>{await openEditor(id)}
});

const atsWorkbench=createAtsWorkbench({api,getState:()=>state,getOwner:()=>scope,onSaved:refresh,onEdit:async doc=>{await workflow.open(doc);page='Resume Builder';history.replaceState(null,'','#resume-builder');render()}});
function authIcon(name){const paths={home:'<path d="m2 13 12-10 12 10M5 11v14h18V11M11 25v-8h6v8"/>',lock:'<rect x="5" y="12" width="18" height="14" rx="3"/><path d="M9 12V8a5 5 0 0 1 10 0v4M14 18v3"/>',document:'<path d="M7 3h9l5 5v16H7z"/><path d="M16 3v6h5M10 13h8M10 17h8M10 21h5"/>',spark:'<path d="m14 3 3.2 7.8L25 14l-7.8 3.2L14 25l-3.2-7.8L3 14l7.8-3.2z"/>',mail:'<rect x="3" y="5" width="22" height="18" rx="3"/><path d="m4 7 10 8L24 7"/>',chat:'<path d="M5 4h18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-9l-7 5v-5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 12h.01M14 12h.01M19 12h.01"/>',upload:'<path d="M14 19V3m-6 6 6-6 6 6M4 17v7h20v-7"/>',edit:'<path d="m17 4 7 7M4 24l2-8L20 2l6 6-14 14z"/>',download:'<path d="M14 3v17m-6-6 6 6 6-6M4 20v5h20v-5"/>',eye:'<path d="M2 14s4-8 12-8 12 8 12 8-4 8-12 8S2 14 2 14z"/><circle cx="14" cy="14" r="3"/>',arrow:'<path d="M3 14h21m-7-7 7 7-7 7"/>',shield:'<path d="m14 2 10 4v8c0 6-10 12-10 12S4 20 4 14V6z"/><path d="m9 14 3 3 7-7"/>'};return `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.document}</svg>`}
let authCapabilities={googleConfigured:false,recoveryEnabled:false,rememberMeSupported:true},authNotice='',authResetToken='';
const googleLogo=()=>`<svg class="google-logo" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.22-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.49H3.07A9.99 9.99 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.32-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.52l2.88-2.88A9.61 9.61 0 0 0 12 2a9.99 9.99 0 0 0-8.93 5.49l3.32 2.59A5.99 5.99 0 0 1 12 5.96Z"/></svg>`;

function renderGoogleOption() {
  const disabled = authCapabilities.googleConfigured ? '' : 'disabled aria-describedby="google-setup"';
  return `<button type="button" class="secondary auth-google" data-action="auth-google" ${disabled}>
    ${googleLogo()} Continue with Google
  </button>${disabled ? '<p class="google-config-note" id="google-setup">Google sign-in requires configuration.</p>' : ''}`;
}
function authShowcase() {
  const features = [
    ['document', 'Resume Workspace', 'Build, tailor and export your resume.'],
    ['mail', 'AI Cover Letters', 'Draft a letter for your target role.'],
    ['chat', 'Interview Preparation', 'Practise with role-specific questions.']
  ];
  const benefits = ['ATS-Friendly', 'AI-Powered', 'Resume Templates', 'Private Workspace'];
  return `<section class="auth-intro" aria-labelledby="auth-headline">
    <div class="auth-copy">
      <p class="auth-eyebrow">AI-POWERED CAREER WORKSPACE</p>
      <h1 id="auth-headline">Your experience.<br><span>Your next chapter.</span></h1>
      <p class="auth-lead">Create tailored resumes, write professional cover letters, and prepare confidently for your next opportunity.</p>
    </div>
    <div class="career-laptop" role="img" aria-label="Laptop showing an illustrative resume and example ATS analysis"></div><p class="auth-illustration-note">Illustrative preview · example score</p>
    <div class="auth-feature-grid">${features.map(([icon,title,description]) => `
      <article class="auth-feature"><span class="auth-symbol">${authIcon(icon)}</span>
        <h2>${title}</h2><p>${description}</p>
      </article>`).join('')}</div>
    <ul class="auth-benefits">${benefits.map(text => `<li><span aria-hidden="true">✓</span>${text}</li>`).join('')}</ul>
  </section>`;
}
function auth() {
  const signup = authMode === 'signup', forgot = authMode === 'forgot', reset = authMode === 'reset';
  const normal = !forgot && !reset;
  const title = reset ? 'Set a new password' : forgot ? 'Forgot password?' : signup ? 'Create your account' : 'Welcome back';
  const subtitle = reset ? 'Choose a strong password for your account.' : forgot ? 'Recover access to your workspace.' : signup ? 'Start building your next chapter.' : 'Sign in to continue your career journey.';
  root.innerHTML = `<div class="reference-auth">
    <header class="auth-bar"><div class="auth-frame">
      <a class="auth-brand" href="/" aria-label="AI Resume Maker home"><span class="auth-symbol">${authIcon('document')}</span>AI Resume Maker</a>
      <a class="auth-home-link" href="/">${authIcon('home')} Back to Home</a>
    </div></header>
    <main class="auth-frame auth-main">
      <section class="auth-form-panel" aria-labelledby="auth-form-title">
        <h2 id="auth-form-title">${title}</h2><p class="auth-subtitle">${subtitle}</p>
        ${authNotice ? `<div class="premium-auth-notice" role="status">${esc(authNotice)}</div>` : ''}
        ${normal ? `${renderGoogleOption()}<div class="auth-divider">or continue with email</div>
            <form id="auth">
            ${signup ? `<label class="auth-label">Full name<input name="name" autocomplete="name" placeholder="Your full name" required maxlength="120"></label>
            <label class="auth-label">Organisation (optional)<input name="organisation" autocomplete="organization" placeholder="Your workspace name" maxlength="120"></label>` : ''}
            <div><label for="auth-email">Email address</label>
              <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required maxlength="200"></div>
            <div><div class="auth-label-row"><label for="auth-password">Password</label>
              ${signup ? '<small>12+ characters</small>' : '<button type="button" class="quiet" data-action="auth-forgot">Forgot password?</button>'}</div>
              <div class="auth-password-wrap"><input id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="Enter your password" required minlength="12" maxlength="200">
              <button type="button" class="quiet auth-eye" data-action="auth-toggle-password" aria-label="Show password" aria-pressed="false">${authIcon('eye')}</button></div></div>
            ${authCapabilities.rememberMeSupported ? '<label class="auth-remember"><input type="checkbox" name="remember" checked>Remember me</label>' : ''}
            <p id="auth-error" class="auth-error" role="alert"></p>
            <button type="submit" class="auth-submit">${signup ? 'Create account' : 'Sign in →'}</button>
          </form>
          <p class="auth-switch">${signup ? 'Already have an account?' : 'New here?'} <button type="button" class="quiet" data-action="${signup ? 'login-tab' : 'signup-tab'}">${signup ? 'Sign in' : 'Create an account'}</button></p>`:forgot?`<div class="premium-recovery-note">${authCapabilities.recoveryEnabled?'Email delivery is unavailable in this local installation. A one-time recovery link can be retrieved by the person running the app from the private local recovery inbox.':'Password recovery is unavailable. Contact the workspace owner.'}</div><form id="auth-recovery"><label class="auth-label" for="auth-email">Email address</label><div class="auth-input-wrap">${authIcon('mail')}<input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required maxlength="200"></div><p id="auth-error" class="danger auth-error" role="alert" aria-live="polite"></p><button type="submit" class="auth-submit" ${authCapabilities.recoveryEnabled?'':'disabled'}>Request recovery link</button></form><p class="auth-switch"><button type="button" class="quiet" data-action="login-tab">Back to sign in</button></p>`:`<form id="auth-reset"><label class="auth-label" for="auth-password">New password</label><div class="auth-input-wrap auth-password-wrap">${authIcon('lock')}<input id="auth-password" name="password" type="password" autocomplete="new-password" placeholder="At least 12 characters" minlength="12" maxlength="200" required><button type="button" class="quiet auth-eye" data-action="auth-toggle-password" aria-label="Show password" aria-pressed="false">${authIcon('eye')}</button></div><label class="auth-label" for="auth-confirm-password">Confirm new password</label><div class="auth-input-wrap"><input id="auth-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Enter the new password again" minlength="12" maxlength="200" required></div><p id="auth-error" class="danger auth-error" role="alert" aria-live="polite"></p><button class="auth-submit" type="submit" ${authResetToken?'':'disabled'}>Reset password</button></form><p class="auth-switch"><button type="button" class="quiet" data-action="auth-forgot">Request a new recovery link</button></p>`}</section>
      ${authShowcase()}
    </main></div>`;
  window.scrollTo(0,0);
}


const workspaceLabels={'ATS Optimizer':'ATS score & improve',Dashboard:'Dashboard',Profile:'Career profile',Jobs:'Job tracker',Documents:'My resumes','Resume Builder':'Resume builder','Cover Letter':'Cover letters','Interview Prep':'Interview prep',Clients:'Clients','Review Queue':'Review queue',Team:'Team',Account:'Account'};
function workspaceIcon(name){
 const paths={Dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',Profile:'M4 21v-2a8 8 0 0 1 16 0v2 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',Jobs:'M3 8h18v13H3z M8 8V5h8v3 M3 12l9 3 9-3',Documents:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h4','Resume Builder':'m4 16 12-12 4 4L8 20l-5 1z M13 7l4 4','Cover Letter':'M3 5h18v14H3z m1 1 8 7 8-7','Interview Prep':'M3 4h18v13H9l-6 4z M7 9h10 M7 13h6',Account:'M4 6h16v14H4z M8 3v6m8-6v6 M8 14h8'};
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.Profile)+'"/></svg>';
}
function hasResumeDraft(){
 try{return Boolean(JSON.parse(localStorage.getItem('resume-guided-draft:'+state.user.id+':'+scope)||'null')?.resume)}catch{return false}
}
let lastDeletedResume=null;
function resumeScoreButton(d){return '<button class="secondary resume-score-link" data-action="resume-optimise" data-id="'+esc(d.id)+'" title="Open calculated ATS analysis and review improvements">'+(d.data.optimizer?'ATS '+d.data.optimizer.score+'/100':'Check ATS')+' <span aria-hidden="true">↗</span></button>'}
function resumeActions(d){return '<div class="resume-row-actions"><details class="resume-action-menu"><summary aria-label="Actions for '+esc(d.data.title)+'" title="Resume actions"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></summary><div class="resume-action-list">'+button('guided-open','Edit',d.id)+button('resume-optimise','Improve ATS',d.id)+button('resume-rename','Rename',d.id)+button('resume-duplicate','Duplicate',d.id)+button('resume-delete','Delete',d.id,'resume-delete secondary')+'</div></details></div>'}
function resumeDialog(action,doc){return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='resume-dialog';dialog.innerHTML='<form method="dialog"><h2>'+ (action==='delete'?'Delete resume?':'Rename resume')+'</h2><p>'+esc(doc.data.title)+'</p>'+(action==='delete'?'<p>This removes the resume from My resumes and frees its saved-resume slot. Linked cover letters and interview history stay available. You can undo this deletion.</p>':'<label>Resume name<input name="title" required maxlength="200" value="'+esc(doc.data.title)+'"></label>')+'<div class="actions"><button value="cancel" type="button">Cancel</button><button value="confirm" class="'+(action==='delete'?'resume-delete':'')+'">'+(action==='delete'?'Delete resume':'Save name')+'</button></div></form>';document.body.appendChild(dialog);dialog.querySelector('[value=cancel]').onclick=()=>dialog.close('cancel');dialog.addEventListener('close',()=>{const value=dialog.returnValue==='confirm'?(action==='delete'?true:dialog.querySelector('input').value.trim()):null;dialog.remove();resolve(value)},{once:true});dialog.showModal();if(action==='rename'){dialog.querySelector('input').focus();dialog.querySelector('input').select()}})}
function render(){
 interviewVoice.beforeRender();
 if(!state)return auth();
 const team=['owner','staff'].includes(state.user.role)&&state.organisation.plan==='Team';
 const nav=['Dashboard','Documents','Resume Builder','ATS Optimizer','Cover Letter','Interview Prep','Profile','Jobs',...(team?['Clients','Review Queue','Team']:[]),'Account'];
 const descriptions={'ATS Optimizer':'Review your score, apply supported improvements and see what changed.',Dashboard:'Create a resume, pick up a draft, or prepare your next application.',Profile:'Keep your experience and skills ready to use.',Jobs:'Keep each opportunity, deadline and resume together.',Documents:'Your saved resumes and previous versions.','Resume Builder':'Add your details, then review and download your resume.','Cover Letter':'Turn a selected resume into a tailored cover letter.','Interview Prep':'Practise for your next interview with AI voice coaching.',Clients:'Choose a candidate workspace.',Team:'Manage your team and candidate assignments.','Review Queue':'Review documents and share feedback.',Account:'Your account, plan and usage.'};
 root.innerHTML=`<div class="layout workspace-app ${page==='Interview Prep'?'interview-workspace':''}"><aside class="sidebar"><a class="brand" href="/#home"><span class="mark">${workspaceIcon('Documents')}</span><span>AI Resume Maker<small>Your career workspace</small></span></a><nav aria-label="Workspace navigation">${nav.map(n=>`<button class="nav ${page===n?'active':''}" data-page="${n}" ${page===n?'aria-current="page"':''}>${workspaceIcon(n)}<span>${workspaceLabels[n]}</span></button>`).join('')}</nav><div class="foot"><div class="workspace-user"><span class="workspace-avatar">${esc((state.user.name||'G')[0].toUpperCase())}</span><div><strong>${esc(state.user.name)}</strong><small>${esc(state.organisation.plan)} plan · local demo</small></div></div>${button('logout','Sign out','','quiet')}</div></aside><main class="main"><div class="topline"><span>${esc(state.organisation.name)}</span>${team?`<label>Candidate workspace<select id="scope" class="scope">${options([[state.user.id,'My workspace'],...state.members.filter(m=>m.role==='candidate').map(m=>[m.id,m.name])],scope)}</select></label>`:`<button class="quiet workspace-plan" data-page="Account">${esc(state.organisation.plan)} plan</button>`}</div><div class="heading"><div><h1>${esc(workspaceLabels[page]||page)}</h1><p>${esc(descriptions[page]||'Edit your resume and save a version when ready.')}</p></div>${!['Resume Builder','Editor','Dashboard','Interview Prep'].includes(page)?button('guided-new','＋ Create resume','',''):page==='Resume Builder'?`<button class="quiet" data-page="Documents">← My resumes</button>`:''}</div><div id="view">${lastDeletedResume?.owner===scope?'<div class="notice resume-undo" role="status">Resume removed. <button class="secondary" data-action="resume-restore" data-id="'+esc(lastDeletedResume.id)+'">Undo delete</button></div>':''}${content(team)}</div></main></div>`;
 fitLetterPreview();
 if(page==='Resume Builder')void workflow.mount(document.getElementById('resume-workflow-host'));
 if(page==='Interview Prep')interviewVoice.mount();
 if(page==='ATS Optimizer')void atsWorkbench.mount(document.getElementById('ats-workbench-host'));
}
function dashboardContent(jobs,docs,profiles){
 const reminders=jobs.filter(j=>j.data.followUp&&j.data.followUp<=new Date().toLocaleDateString('en-CA')&&!['Closed','Offer'].includes(j.data.stage));
 const templatePicker='<label class="dashboard-template-picker" for="dashboard-resume-template">Resume template<select id="dashboard-resume-template"><optgroup label="Original formats"><option value="standard">Original — Standard</option><option value="compact">Original — Compact</option><option value="classic">Original — Classic</option></optgroup><optgroup label="More layouts">'+RESUME_DESIGNS.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>').join('')+'</optgroup></select><small>Select a layout, then fill the same resume fields.</small></label>';
 return `<section class="dashboard-start"><div><p class="dashboard-eyebrow">Your next step</p><h2>${docs.length?'Keep your next application moving.':'Your first resume starts here.'}</h2><p>${docs.length?'Create a tailored version or continue the draft you were working on.':'Add your details or import an existing resume. We’ll guide you through each section.'}</p>${templatePicker}<div class="actions">${button('guided-new','＋ Create resume','','')}${hasResumeDraft()?button('guided-continue','Continue draft','','secondary'):''}</div></div><div class="dashboard-mini-document" aria-hidden="true"><span>YOUR RESUME</span><b></b><i></i><i></i><strong></strong><i></i><i></i><i></i></div></section>
 <div class="dashboard-tools">${[['Documents','My resumes',docs.length+' saved versions'],['ATS Optimizer','ATS score & improve','Review and apply supported improvements'],['Cover Letter','Write a cover letter','Use one of your saved resumes'],['Interview Prep','Prepare for an interview','Practise with your resume and job description']].map(([key,title,hint])=>`<button class="dashboard-tool secondary" data-page="${key}">${workspaceIcon(key)}<span><strong>${title}</strong><small>${hint}</small></span><b aria-hidden="true">→</b></button>`).join('')}</div>
 <div class="dashboard-columns"><section class="dashboard-panel"><div class="dashboard-panel-title"><h2>Recent resumes</h2><button class="quiet" data-page="Documents">View all →</button></div>${docs.length?docs.slice(0,3).map(d=>`<article class="dashboard-resume"><span class="dashboard-file">${workspaceIcon('Documents')}</span><div><h3>${esc(d.data.title)}</h3><p>${esc(d.data.canonical?.targetRole||'Resume version')} · ${esc(new Date(d.updated).toLocaleDateString())}</p></div><div class="resume-row-actions dashboard-score-actions">${resumeScoreButton(d)}${resumeActions(d)}</div></article>`).join(''):`<div class="dashboard-empty">${workspaceIcon('Documents')}<h3>No saved resumes yet</h3><p>Start a resume above. Your saved versions will appear here.</p></div>`}</section></div>
`;
}

function content(team){const jobs=own(state.jobs),docs=own(state.documents),profiles=own(state.profiles),profile=profiles[0]?.data||{};

 if(page==='ATS Optimizer')return '<div id="ats-workbench-host"></div>';
 if(page==='Dashboard')return dashboardContent(jobs,docs,profiles);

 if(page==='Profile')return `<form id="profile" class="card"><div class="two">${field('name','Full name',profile.name||'')}${field('headline','Career headline',profile.headline||'')}${field('skills','Verified skills',profile.skills||'','textarea')}${field('experience','Employment and achievements (facts only)',profile.experience||'','textarea')}${field('education','Education and qualifications',profile.education||'','textarea')}</div><button>Save profile</button></form>`;

 if(page==='Jobs'){const j=state.jobs.find(x=>x.id===editingJob),b=j?.data||{};return `<div class="two"><section><div class="row between"><h2>Saved opportunities</h2>${button('new-job','New job')}</div>${jobs.map(j=>`<article class="card"><span class="pill">${esc(j.data.stage)}</span><h3 style="margin-top:14px">${esc(j.data.role)}</h3><p>${esc(j.data.company)}</p><p class="subtle">Resume: ${esc(state.documents.find(d=>d.id===j.data.docId)?.data.title||'Not linked')}<br>Follow-up: ${esc(j.data.followUp||'Not set')}</p>${button('edit-job','Open application',j.id)+button('job-match','Review resume match',j.id)}</article>`).join('')||empty('No saved jobs. Add a company, role and job description.')}</section><section class="card"><h2>${j?'Application workspace':'Save an opportunity'}</h2><form id="job" data-id="${esc(j?.id||'')}">${field('company','Company',b.company||'')}${field('role','Role',b.role||'')}${field('jd','Job description',b.jd||'','textarea')}${field('link','Job link',b.link||'','url')}${select('stage','Tracker stage',state.stages,b.stage||'Saved')}${select('docId','Resume version',[['','No resume linked'],...docs.map(d=>[d.id,d.data.title])],b.docId||'')}<div class="two">${field('deadline','Application deadline',b.deadline||'','date')}${field('followUp','In-app follow-up date',b.followUp||'','date')}</div>${field('notes','Notes',b.notes||'','textarea')}${field('coverLetter','Previously saved cover-letter draft',b.coverLetter||'','textarea')}${field('applicationAnswer','Editable application answer · local draft',b.applicationAnswer||'','textarea')}<button>Save application</button></form>${j?`<div class="actions">${button('draft','Create cover letter',j.id)}${button('interview','Prepare interview',j.id)}</div><small>Drafting uses the saved profile and job. It never changes the tracker stage.</small>`:''}</section></div>`}

 if(page==='Resume Builder')return '<div id="resume-workflow-host"></div>';

 if(page==='Documents')return documentsContent(docs);

 if(page==='Cover Letter')return coverLetterScreen();
 if(page==='Interview Prep')return interviewScreen();
 if(page==='Clients'&&team)return state.members.filter(m=>m.role==='candidate').map(m=>`<div class="card row between"><div><h2>${esc(m.name)}</h2><span class="subtle">Assigned to ${esc(state.members.find(s=>s.id===m.assigned)?.name||'Unassigned')}</span></div>${button('client','Open candidate workspace',m.id)}</div>`).join('')||empty('No candidates assigned to you yet.');

 if(page==='Review Queue'&&team)return state.documents.filter(d=>d.data.review!=='Draft').map(d=>docCard(d,true)).join('')||empty('No reviews waiting. Submit a document from Documents.');

 if(page==='Team'&&team)return `<div class="two"><section class="card"><h2>Organisation members</h2>${state.members.map(m=>`<div class="list-item"><strong>${esc(m.name)}</strong><p>${esc(m.email)} · ${esc(m.role)}</p>${state.user.role==='owner'&&m.role==='candidate'?`<form class="assignment" data-id="${esc(m.id)}">${select('assigned','Assigned staff',[['','Unassigned'],...state.members.filter(x=>x.role==='staff').map(x=>[x.id,x.name])],m.assigned||'')}<button>Save assignment</button></form>`:''}</div>`).join('')}</section>${state.user.role==='owner'?`<form id="member" class="card"><h2>Create local team account</h2><p>No invitation email is sent. Share fictional demo credentials locally.</p>${field('name','Name')}${field('email','Email','','email')}${field('password','Initial password','','password')}${select('role','Role',['candidate','staff'],'candidate')}<button>Create account</button></form>`:'<div class="card">Only your organisation owner can manage accounts and assignments.</div>'}</div>`;

 if(page==='Account')return `<div class="card"><h2>${esc(state.user.name)}</h2><p>${esc(state.user.email)} · ${esc(state.user.role)}</p>${button('logout','Sign out')}</div><div class="notice">Billing simulation only. No card details, payment gateway or charges. Cancellation immediately returns to Free. Existing documents remain accessible when over the new allowance.</div><div class="grid">${['Free','Pro','Team'].map((p,i)=>`<section class="card"><h2>${p}</h2><p>${p==='Pro'?'Unlimited organisation documents<br>Unlimited demo drafts':`${[3,0,300][i]} organisation documents<br>${[5,0,1000][i]} lifetime demo drafts`}${p==='Team'?'<br>Staff, clients and document review':''}</p>${state.user.role==='owner'?button('plan',p===state.organisation.plan?'Current plan':'Simulate '+p,p,p===state.organisation.plan?'quiet':''):''}</section>`).join('')}</div><div class="card"><h2>Current allowance · ${state.organisation.plan}</h2><p>${state.allowance.documents === null ? 'Unlimited documents' : `${state.allowance.documents} documents remaining`} · ${state.allowance.drafts === null ? 'Unlimited demo drafts' : `${state.allowance.drafts} demo drafts remaining`}</p><p>Allowances are shared across the organisation. Stored data survives restarts.</p>${state.user.role==='owner'?button('cancel','Simulate cancellation'):''}</div>`;

 if(page==='Editor')return `<div class="notice">The resume editor below is an unchanged local copy. Any Gemini/AI labels inside it are inherited UI text: all live services are blocked here. Import preserves raw source; tailoring analyses facts without rewriting them. Use Print to PDF if native PDF conversion is unavailable.</div><div class="actions">${field('snapshot-title','New resume version title','Resume · '+new Date().toLocaleDateString())}${button('snapshot','Save editor as new version','','')}${button('documents','Back to Documents')}</div><iframe id="editor" title="Original resume editor" src="${esc(editorContext?.url||'')}"></iframe>`;

 return empty('Choose a section from the navigation.');}


function documentsContent(docs){return '<section class="resumes-page"><div class="resumes-list-heading"><h2>Saved resumes <span>'+docs.length+'</span></h2><p>Open a version to edit it, or use the three-dot menu to manage it.</p></div><div class="resumes-layout"><section class="resumes-list" aria-label="Saved resume versions">'+(docs.map(d=>docCard(d)).join('')||'<div class="card resumes-empty"><h2>No resumes yet</h2><p>Create your first resume or save an existing text draft.</p>'+button('guided-new','Create resume','','')+'</div>')+'</section><aside class="resumes-aside"><section class="card resumes-help"><span class="resumes-help-icon">'+workspaceIcon('Documents')+'</span><h2>One resume, different opportunities.</h2><p>Use <strong>Duplicate</strong> from the three-dot menu to tailor a separate version while keeping your original.</p><p class="subtle">PDF and Word downloads are available for formatted resumes.</p></section><details class="card resumes-text-draft"><summary>Save a text draft<span aria-hidden="true">＋</span></summary><p>Keep an existing resume as text. Open it in the builder to format and export it.</p><form id="document">'+field('title','Draft name')+field('content','Resume content','','textarea')+'<button>Save text draft</button></form></details></aside></div></section>'}
function docCard(d,reviewer=false){
 const summary=d.data.canonical?.sections?.find(s=>s.type==='summary'&&s.visible!==false)?.content?.text;
 const raw=(summary||d.data.content||'').replace(/\s+/g,' ').trim(),snippet=raw.length>280?raw.slice(0,280).replace(/\s+\S*$/,'')+'…':raw;
 const downloads=d.data.canonical?'<div class="resume-card-downloads"><span>Download</span><a class="button secondary" href="/api/resume-workflow/download/'+esc(d.id)+'?format=pdf" aria-label="Download PDF for '+esc(d.data.title)+'">PDF</a><a class="button secondary" href="/api/resume-workflow/download/'+esc(d.id)+'?format=docx" aria-label="Download Word for '+esc(d.data.title)+'">Word</a></div>':'<p class="resume-card-format-note">Text draft · Open in the builder to format and download.</p>';
 return '<article class="card resume-library-card"><header class="resume-card-header"><div class="resume-card-name"><span class="resume-card-icon">'+workspaceIcon('Documents')+'</span><div><h3>'+esc(d.data.title)+'</h3><p>'+esc(d.data.canonical?.targetRole||'Resume draft')+'</p></div></div><div class="resume-card-header-actions"><span class="pill">'+esc(d.data.review)+'</span>'+resumeActions(d)+'</div></header><div class="resume-card-meta"><span>'+esc(person(d.owner))+'</span><span>Updated <time datetime="'+esc(d.updated)+'">'+esc(new Date(d.updated).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}))+'</time></span></div><div class="resume-card-overview"><p class="resume-card-label">Resume overview</p><p>'+esc(snippet||'Add your career details to complete this resume.')+'</p></div><footer class="resume-card-footer">'+resumeScoreButton(d)+downloads+'</footer><details class="resume-card-options" '+(reviewer?'open':'')+'><summary>Review & advanced options</summary><div class="resume-card-secondary">'+button('edit-document','Advanced editor',d.id)+button('submit-review','Submit for review',d.id)+'<a class="button quiet" href="/api/records/document/'+esc(d.id)+'/download?format=json">JSON backup</a></div>'+d.data.comments.map(c=>'<div class="comment"><strong>'+esc(c.author)+'</strong><p>'+esc(c.text)+'</p></div>').join('')+'<form class="review" data-id="'+esc(d.id)+'">'+field('comment','Add a comment')+(reviewer?select('action','Review decision',[['','Comment only'],'Approved','Changes requested'],''):'')+'<button class="secondary">Save '+(reviewer?'review':'comment')+'</button></form></details></article>';
}

async function openEditor(id){const doc=id?state.documents.find(d=>d.id===id):null;const owner=doc?.owner||scope;const seed=await api('/api/engine-seed?owner='+encodeURIComponent(owner)+(id?'&document='+id:''));const key=`resume:${state.user.id}:${owner}:${id||'draft'}:`;localStorage.setItem(key+'ai_resume_maker_v2',JSON.stringify(seed.resume));localStorage.setItem(key+'saas_seed',JSON.stringify(seed.resume));editorContext={key,owner,url:'/career-cockpit?localScope='+encodeURIComponent(key)};page='Editor';render()}

root.addEventListener('change',e=>{if(e.target.id==='scope'){scope=e.target.value;workflow.reset();if(page==='Resume Builder')page='Documents';editingJob=null;careerReset();if(page==='Editor')page='Documents';render()}});

root.addEventListener('click',async e=>{const el=e.target.closest('button');const actionMenu=el?.closest('.resume-action-menu');if(actionMenu){actionMenu.open=false;actionMenu.querySelector('summary').focus()}if(!el)return;if(el.dataset.page){page=el.dataset.page;const route={'Dashboard':'resume-dashboard','ATS Optimizer':'ats-score','Resume Builder':'resume-builder','Cover Letter':'cover-letter','Interview Prep':'interview-prep','Documents':'documents','Profile':'profile','Jobs':'jobs','Account':'account'}[page];if(route)history.replaceState(null,'','#'+route);render();return}const a=el.dataset.action,id=el.dataset.id;if(!a)return;el.disabled=true;try{

 if(['resume-rename','resume-duplicate','resume-delete'].includes(a)){
  const doc=state.documents.find(d=>d.id===id);if(!doc)throw new Error('Resume not found. Refresh your workspace.');
  if(a==='resume-rename'){const title=await resumeDialog('rename',doc);if(title===null)return;if(!title)throw new Error('Enter a resume name.');await api('/api/resumes/'+id+'/rename','POST',{title,expectedUpdated:doc.updated})}
  if(a==='resume-duplicate')await api('/api/resumes/'+id+'/duplicate','POST',{});
  if(a==='resume-delete'){if(!await resumeDialog('delete',doc))return;await api('/api/resumes/'+id,'DELETE',{expectedUpdated:doc.updated});lastDeletedResume={id,owner:doc.owner};const draftKey='resume-guided-draft:'+state.user.id+':'+doc.owner;try{if(JSON.parse(localStorage.getItem(draftKey)||'null')?.savedId===id){localStorage.removeItem(draftKey);workflow.reset()}}catch{}}
  await refresh();render();toast(a==='resume-delete'?'Resume removed. Use Undo delete to restore it.':a==='resume-rename'?'Resume renamed.':'Resume duplicated.');return;
 }
 if(a==='resume-restore'){await api('/api/resumes/'+id+'/restore','POST',{});lastDeletedResume=null;await refresh();render();toast('Resume restored.');return;}
 if(a==='job-match'){const job=state.jobs.find(j=>j.id===id&&j.owner===scope);if(!job)throw new Error('Job not found');const doc=own(state.documents).find(d=>d.id===job.data.docId)||own(state.documents).find(d=>d.data.canonical);atsWorkbench.open(doc||null,{jobId:job.id,jd:job.data.jd||'',company:job.data.company||''});page='ATS Optimizer';history.replaceState(null,'','#ats-score');render();return}
 if(a==='resume-optimise'){const doc=state.documents.find(d=>d.id===id);if(!doc)throw new Error('Resume not found');atsWorkbench.open(doc);page='ATS Optimizer';history.replaceState(null,'','#ats-score');render();return}
 if(a==='guided-continue'){await workflow.open();page='Resume Builder';history.replaceState(null,'','#resume-builder');render();return}
 if(a==='guided-new'||a==='guided-open'){await workflow.open(a==='guided-open'?state.documents.find(d=>d.id===id):null,{fresh:a==='guided-new',initialTemplate:a==='guided-new'?document.getElementById('dashboard-resume-template')?.value:undefined});page='Resume Builder';history.replaceState(null,'','#resume-builder');render();return}
 if(await careerAction(a,id))return;
 if(a==='auth-google'){if(!authCapabilities.googleConfigured)throw new Error('Google sign-in requires configuration');window.location.assign('/api/auth/google/start');return}
 if(a==='auth-forgot'){authMode='forgot';authNotice='';authResetToken='';auth();return}
 if(a==='auth-toggle-password'){const input=$('#auth-password'),show=input.type==='password';input.type=show?'text':'password';if($('#auth-confirm-password'))$('#auth-confirm-password').type=input.type;el.setAttribute('aria-label',show?'Hide password':'Show password');el.setAttribute('aria-pressed',String(show));return}
 if(a==='login-tab'||a==='signup-tab'){authMode=a==='login-tab'?'login':'signup';authNotice='';authResetToken='';auth();return}

 if(a==='logout'){lastDeletedResume=null;atsWorkbench.reset();workflow.reset();await api('/api/auth/logout','POST',{});for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k.startsWith('resume:'))localStorage.removeItem(k)}careerReset();state=null;scope='';page='Dashboard';authMode='login';auth();return}

 if(a==='new-job'){editingJob=null;render();return}if(a==='edit-job'){editingJob=id;scope=state.jobs.find(j=>j.id===id).owner;page='Jobs';render();return}

 if(a==='open-editor'||a==='edit-document'){await openEditor(id);return}if(a==='documents'){page='Documents';render();return}

 if(a==='client'){scope=id;page='Dashboard';render();return}

 if(a==='snapshot'){
  const context=editorContext,title=$('[name="snapshot-title"]').value,userId=state.user.id;
  const fresh=await api('/api/state');
  if(fresh.user.id!==userId)throw new Error('Account changed. Reload before saving.');
  const canonical=JSON.parse(localStorage.getItem(context.key+'ai_resume_maker_v2')||'null');
  if(!canonical)throw new Error('No editor content found');
  await api('/api/records/document','POST',{owner:context.owner,title,content:'Editor snapshot',canonical});
  await refresh();
  if(page!=='Editor')render();
  toast('Saved new resume version. Tracker stages unchanged.');
  return;
 }

 if(a==='plan'||a==='cancel'){await api('/api/plan','POST',{plan:a==='cancel'?'Free':id,cancel:a==='cancel'});await refresh();render();toast('Simulated plan updated. No payment occurred.');return}

 if(a==='submit-review'){await api(`/api/records/document/${id}/review`,'POST',{action:'In review'});await refresh();render();toast('Submitted for review');return}

 if(a==='draft'||a==='interview'){const j=state.jobs.find(j=>j.id===id);const kind=a==='draft'?'letter':'interview';careerInputs[kind]={jobId:j.id,resumeId:j.data.docId||'',targetRole:j.data.role,company:j.data.company,jd:j.data.jd};scope=j.owner;page=kind==='letter'?'Cover Letter':'Interview Prep';careerMessage='Review the selected resume and generate with Gemini.';render();return}

 }catch(err){toast(err.message)}finally{el.disabled=false}});

root.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=Object.fromEntries(new FormData(f)),submit=f.id.startsWith('auth')?f.querySelector('button[type=submit]'):f.querySelector('button');let authButtonText=submit?.textContent;if(submit){submit.disabled=true;if(f.id.startsWith('auth'))submit.textContent=f.id==='auth-recovery'?'Requesting…':f.id==='auth-reset'?'Updating password…':authMode==='signup'?'Creating account…':'Signing in…'}try{

 if(f.id==='auth-recovery'){const result=await api('/api/auth/recovery/request','POST',b);authNotice=result.message;auth();return}
 if(f.id==='auth-reset'){await api('/api/auth/recovery/complete','POST',{...b,token:authResetToken});authResetToken='';authMode='login';authNotice='Password updated. Sign in with your new password.';auth();return}
 if(await careerSubmit(f,b,e.submitter?.value))return;
 if(f.id==='auth'){b.remember=f.elements.remember?f.elements.remember.checked:true;await api('/api/auth/'+authMode,'POST',b);scope='';await refresh();page='Dashboard';render();return}

 if(f.id==='profile')await api('/api/records/profile','POST',{...b,owner:scope});

 if(f.id==='document')await api('/api/records/document','POST',{...b,owner:scope});

 if(f.id==='job'){const r=await api('/api/records/job'+(f.dataset.id?'/'+f.dataset.id:''),f.dataset.id?'PUT':'POST',{...b,owner:scope});editingJob=r.id}

 if(f.id==='prepare')await api('/api/draft','POST',{...b,type:'interview'});

 if(f.classList.contains('practice')){const p=state.practice.find(x=>x.id===f.dataset.id);await api('/api/records/practice/'+p.id,'PUT',{owner:p.owner,jobId:p.data.jobId,questions:p.data.questions.map((q,i)=>({...q,answer:b['answer'+i]}))})}

 if(f.classList.contains('review'))await api('/api/records/document/'+f.dataset.id+'/review','POST',b);

 if(f.id==='member')await api('/api/team','POST',b);

 if(f.classList.contains('assignment'))await api('/api/team','POST',{...b,id:f.dataset.id});

 await refresh();render();toast('Saved locally');

 }catch(err){if(f.id.startsWith('auth'))$('#auth-error').textContent=err.message;else toast(err.message)}finally{if(submit){submit.disabled=false;if(f.id.startsWith('auth'))submit.textContent=authButtonText}}});

let interviewUpload=null;
let letterResizeObserver=null;
let letterUpload=null;
let letterDraft=null,activeInterview='',careerBusy=false,careerMessage='',careerInputs={},careerFailed=false;
const interviewVoice=createInterviewVoice({root,api,getIdentity:()=>state?.user?.id?state.user.id+':'+scope:'',getContext:()=>{const form=document.getElementById('interview-generate');return {...(careerInputs.interview||{}),...(form?Object.fromEntries(new FormData(form)):{}),owner:scope}}});
const careerInput=(name,label,value='',textarea=false)=>`<label>${esc(label)}${textarea?`<textarea name="${name}">${esc(value)}</textarea>`:`<input name="${name}" value="${esc(value)}">`}</label>`;
function careerBanner(){return `<div class="notice" role="status">${state.gemini?.configured?'Gemini generation is enabled for these features. Only selected resume content, JD and relevant practice answers are sent. Contact details are added locally.':'Gemini AI needs a backend API key. Generate Cover Letter works locally without a key. To enable Gemini, run: powershell -File scripts/configure-gemini.ps1. Refresh this page after setup.'}</div>`}
function coverLetterFocus(values,documents){
 const selected=documents.find(d=>d.id===values.resumeId);
 const roles=(selected?.data.canonical?.sections||[]).filter(s=>s.type==='experience').flatMap(s=>(s.content?.entries||[]).map(e=>e.title).filter(Boolean));
 return select('highlightRole','Previous role to highlight (optional)',[['','Let the resume guide the letter'],...roles.map(r=>[r,r])],values.highlightRole||'')+careerInput('highlightSkills','Skills to highlight · from your resume, comma-separated',values.highlightSkills||'');
}
function letterProvider(data){return data.provider==='local-rule-based'?(data.manualEdits?'Edited resume-based draft · not AI':'Resume-based draft · not AI'):data.provider==='offline-test-fixture'?'Offline test fixture · not live AI':data.manualEdits?'Manually edited':'Gemini-generated'}
function letterUploadScreen(){
 const upload=letterUpload?.owner===scope?letterUpload:null;
 const selected=[...state.documents,...(state.coverResumeSources||[])].find(d=>d.id===careerInputs.letter?.resumeId&&d.owner===scope);
 return '<section class="card cover-upload"><h2>Upload your resume</h2><p>Choose a file, check its details, then generate your cover letter.</p><form id="letter-resume-upload"><label>Resume file · PDF or DOCX, up to 1 MB<input type="file" name="resumeFile" accept=".pdf,.docx" required '+(careerBusy?'disabled':'')+'></label></form>'+(upload?'<form id="letter-upload-confirm"><h3>Check resume details</h3><p class="subtle">'+esc(upload.filename)+'</p>'+careerInput('uploadName','Candidate full name',upload.resume.profile.fullName||'')+careerInput('uploadEmail','Email (optional)',upload.resume.profile.email||'')+careerInput('uploadPhone','Phone (optional)',upload.resume.profile.phone||'')+'<details><summary>View extracted resume text</summary><pre class="uploaded-resume-text">'+esc(upload.text)+'</pre></details><button '+(careerBusy?'disabled':'')+' name="intent" value="generate-ai">Generate AI Cover Letter</button></form>':'<p class="subtle">'+(selected?'Selected resume: '+esc(selected.data.title):'Upload a resume first, or select a saved resume below.')+'</p><button type="button" data-action="letter-generate-ai" '+(careerBusy?'disabled':'')+'>Generate AI Cover Letter</button>')+'<p class="subtle cover-action-help">Uses Gemini AI with the selected resume and job details below.</p></section>';
}
function careerSelection(kind){const docs=own(kind==='letter'?[...state.documents,...(state.coverResumeSources||[])]:state.documents),jobs=own(state.jobs),v=careerInputs[kind]||{};return `<form id="${kind}-generate" class="card"><h2>${kind==='letter'?'Create a cover letter':'Prepare for an interview'}</h2><label>Resume version (required)<select name="resumeId" required>${options([['','Select a saved resume'],...docs.map(d=>[d.id,d.data.title])],v.resumeId||'')}</select></label>${select('jobId','Saved job (optional)',[['','No saved job'],...jobs.map(j=>[j.id,j.data.role+' · '+j.data.company])],v.jobId||'')}${careerInput('targetRole','Target role (optional)',v.targetRole||'')}${kind==='letter'?careerInput('company','Company (optional)',v.company||''):''}${careerInput('jd','Job description (optional)',v.jd||'',true)}${kind==='letter'?coverLetterFocus(v,docs):''}${kind==='interview'?select('language','Practice language',['English','Hinglish'],v.language||'English')+select('mode','Practice mode',[['preparation','Preparation'],['mock','Mock interview']],v.mode||'preparation'):''}<button ${careerBusy?'disabled':''}>${careerBusy?'Generating with Gemini…':kind==='letter'?'Generate AI Cover Letter':'Generate Interview Preparation'}</button><p class="subtle">${kind==='letter'?'Generated versions are saved separately. Regeneration never replaces an earlier saved version.':'Coaching guidance only. No hiring guarantees or official Google assessment.'}</p></form>`}
function letterPreview(data,editable=true){const font=['Arial','Times New Roman','Calibri'].includes(data.fontFamily)?data.fontFamily:'Arial';const signature=data.signature||{};return `<div class="letter-scroll" data-fit-letter><article class="cover-paper" style="--cover-font:${esc(font)}" aria-label="Cover letter A4 preview"><p>Hi,</p><div class="cover-paragraphs">${data.paragraphs.map((p,i)=>`<p ${editable?'contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Letter paragraph '+(i+1)+'"':''} data-letter-paragraph="${i}">${esc(p.text||p)}</p>`).join('')}</div><div class="cover-signature"><strong>Kind regards,</strong>${[signature.name,signature.phone].filter(Boolean).map(t=>`<div>${esc(t)}</div>`).join('')}${signature.email?`<div><a href="mailto:${esc(signature.email)}">${esc(signature.email)}</a></div>`:''}</div></article></div>`}
function fitLetterPreview(){letterResizeObserver?.disconnect();const panel=document.querySelector('[data-fit-letter]');if(!panel)return;const page=panel.querySelector('.cover-paper');const fit=()=>{page.style.zoom=String(Math.min(1,(panel.clientWidth-36)/(210*96/25.4)))};fit();letterResizeObserver=new ResizeObserver(fit);letterResizeObserver.observe(panel)}
function coverLetterScreen(){const letters=own(state.coverLetters||[]);if(letterDraft&&letterDraft.owner!==scope)letterDraft=null;return careerBanner()+`<p class="${careerFailed?'danger':careerMessage?'notice':'subtle'}" role="${careerFailed?'alert':'status'}">${esc(careerMessage)}</p><div class="career-grid"><section>${letterUploadScreen()}${careerSelection('letter')}<div class="card"><h2>Saved versions</h2>${letters.map(l=>`<div class="list-item"><strong>${esc(l.data.title)}</strong><p class="subtle">${esc(new Date(l.updated).toLocaleString())} · ${letterProvider(l.data)}</p>${button('letter-open','Open version',l.id)}</div>`).join('')||empty('Select a resume and generate your first letter. Existing job drafts are preserved in Jobs.')}</div></section><section>${letterDraft?`<div class="card"><div class="row between"><h2>Editable letter preview</h2><span class="pill">${letterProvider(letterDraft.data)}</span></div><label class="cover-font-control">Cover-letter font<select id="cover-letter-font">${options(['Arial','Times New Roman','Calibri'],letterDraft.data.fontFamily||'Arial')}</select></label><p class="subtle">Click a paragraph to edit it. Signature comes from the selected resume. Only “Kind regards,” is bold.</p><div class="actions">${button('letter-copy','Copy')}${button('letter-save','Save new edited version','','')}${button('letter-regenerate','Regenerate')}${button('letter-download-docx','Download DOCX')}${button('letter-download-pdf','Download PDF')}</div><p class="subtle">${letterDraft.dirty?'Unsaved edits. Downloads include the current edited text.':'This version is saved locally.'}</p></div>${letterPreview(letterDraft.data)}`:empty('Your formatted A4 letter will appear here. No AI content is shown until Gemini returns a validated response.')}</section></div>`}
function feedbackView(f,offline=false){return `<div class="feedback"><h3>${offline?'Offline coaching fixture':'Gemini coaching guidance'}</h3>${['relevance','clarity','structure','examples'].map(k=>`<p><strong>${k[0].toUpperCase()+k.slice(1)}:</strong> ${esc(f[k])}</p>`).join('')}<h3>Suggested improvements</h3><ul>${f.improvements.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><h3>Improved answer using confirmed facts</h3><p>${esc(f.improvedAnswer)}</p>${f.needsExample?'<p class="notice">Add a real example before practising this answer.</p>':''}</div>`}
function interviewSetup(){const docs=own([...state.documents,...(state.interviewResumeSources||[])]),jobs=own(state.jobs),v=careerInputs.interview||{},upload=interviewUpload?.owner===scope?interviewUpload:null,selected=docs.find(d=>d.id===v.resumeId);return `<form id="interview-generate" class="interview-setup"><div class="interview-setup-row"><span class="interview-setup-icon" aria-hidden="true">${workspaceIcon('Jobs')}</span>${careerInput('targetRole','Target position',v.targetRole||'')}<label class="interview-upload-control">Upload resume<input type="file" name="resumeFile" data-interview-resume-file accept=".pdf,.docx,.txt" ${careerBusy?'disabled':''}><small>${esc(upload?.filename||selected?.data.title||'PDF, DOCX or TXT · up to 1 MB')}</small></label>${select('language','Practice language',['English','Hinglish'],v.language||'English')}<button ${careerBusy?'disabled':''}>${careerBusy?'Preparing…':'▷ Start conversation'}</button></div>${upload?`<div class="interview-upload-details">${careerInput('candidateName','Candidate name · check extracted details',upload.resume.profile.fullName||'')}<details><summary>Review extracted resume</summary><pre class="uploaded-resume-text">${esc(upload.text)}</pre></details></div>`:''}<details class="interview-options"><summary>More options · saved resume, job description & practice mode</summary><div class="interview-options-grid">${select('resumeId','Or use a saved resume',[['','Upload a resume above'],...docs.map(d=>[d.id,d.data.title])],v.resumeId||'')}${select('jobId','Saved job (optional)',[['','No saved job'],...jobs.map(j=>[j.id,j.data.role+' · '+j.data.company])],v.jobId||'')}${select('mode','Practice mode',[['preparation','Preparation'],['mock','Mock interview']],v.mode||'preparation')}${careerInput('jd','Job description (optional)',v.jd||'',true)}</div><button type="submit" name="intent" value="generate-questions" ${careerBusy||upload||!v.resumeId?'disabled':''}>Generate practice questions</button></details></form>`}

function interviewTips(){return `<aside class="interview-tips card"><div class="interview-headphones" aria-hidden="true"><svg viewBox="0 0 180 120" fill="none"><defs><linearGradient id="headset-blue" x2="1" y2="1"><stop stop-color="#94c5ff"/><stop offset="1" stop-color="#2474ef"/></linearGradient></defs><ellipse cx="90" cy="105" rx="45" ry="6" fill="#d9e9ff"/><path d="M46 70V57a44 44 0 0 1 88 0v18" stroke="#c9dfff" stroke-width="14"/><path d="M46 70V57a44 44 0 0 1 88 0v18" stroke="url(#headset-blue)" stroke-width="7"/><rect x="34" y="59" width="24" height="37" rx="12" fill="url(#headset-blue)"/><rect x="122" y="59" width="24" height="37" rx="12" fill="url(#headset-blue)"/><path d="M132 95q-12 16-39 12" stroke="#376cb9" stroke-width="4" stroke-linecap="round"/><rect x="83" y="102" width="20" height="8" rx="4" fill="#22509b"/><path d="m144 25 7-8m-12 1 2-10m13 28 10-3" stroke="#74b2ff" stroke-width="3" stroke-linecap="round"/></svg></div><h2>AI Coach Tips</h2><div class="interview-tip"><span>◎</span><div><h3>Be specific & relevant</h3><p>Connect your answer to the target role and your real experience.</p></div></div><div class="interview-tip"><span>☷</span><div><h3>Use a clear structure</h3><p>Try STAR: Situation, Task, Action and Result.</p></div></div><div class="interview-tip"><span>☆</span><div><h3>Be natural & confident</h3><p>Speak clearly, keep a positive tone and highlight your strengths.</p></div></div><details class="interview-privacy"><summary>About your AI coach</summary>${careerBanner()}<p>Interview guidance uses supported facts. Review answers before practising.</p></details></aside>`}
function interviewScreen(){const sessions=own(state.interviews||[]),session=sessions.find(s=>s.id===activeInterview),legacy=own(state.practice);return `<div class="interview-studio">${careerMessage?`<p class="${careerFailed?'danger':'notice'}" role="${careerFailed?'alert':'status'}">${esc(careerMessage)}</p>`:''}<div class="interview-studio-grid"><section class="interview-studio-main"><div class="interview-stage card"><ol class="interview-steps" aria-label="Interview practice steps"><li class="active"><span>1</span>Set target position</li><li><span>2</span>Ask a question</li><li><span>3</span>Get AI guidance</li></ol>${interviewSetup()}${interviewVoice.markup()}</div>${session?interviewSession(session):''}<details class="interview-history card"><summary>Practice history <span>${sessions.length} saved sessions</span></summary>${sessions.map(s=>`<div class="list-item"><strong>${esc(s.data.targetRole||'Interview preparation')}</strong><p class="subtle">${esc(s.data.language)} · ${esc(s.data.mode)} · ${esc(s.data.status)}</p>${button('interview-open','Open session',s.id)}</div>`).join('')||'<p>Your saved preparation sessions will appear here.</p>'}${legacy.map(p=>`<form class="practice" data-id="${esc(p.id)}"><h3>Previously saved practice</h3>${p.data.questions.map((q,i)=>`<h3>${esc(q.question)}</h3>${field('answer'+i,'Saved practice answer',q.answer||'','textarea')}`).join('')}<button>Save practice answers</button></form>`).join('')}</details></section>${interviewTips()}</div></div>`}

function interviewSession(s){const d=s.data,done=d.status==='Finished';if(d.mode==='mock'){const q=d.questions[d.current],attempts=d.attempts.filter(a=>a.index===d.current);return `<div class="card"><span class="pill">${d.provider==='offline-test-fixture'?'Offline test fixture · not live AI':'Gemini'} · ${esc(d.language)} · ${esc(d.status)}</span><h2 style="margin-top:16px">Question ${d.current+1} of ${d.questions.length}</h2><h3>${esc(q.question)}</h3>${voiceReadButton(q.question)}<p>${esc(q.why)}</p><p class="subtle">A strong answer should cover: ${esc(q.strongAnswer)}</p>${q.starGuidance?`<p class="notice">STAR: ${esc(q.starGuidance)}</p>`:''}<form id="mock-answer" data-id="${s.id}">${careerInput('answer','Your answer',q.answer||'',true)}${voiceMicButton('#mock-answer [name=answer]')}<button ${done||careerBusy?'disabled':''}>${careerBusy?'Getting Gemini feedback…':'Send answer & get feedback'}</button></form><div class="actions">${button('mock-save','Save answer',s.id)}${!done?button('mock-retry','Retry this question',s.id)+button('mock-next',d.current+1<d.questions.length?'Continue':'Finish session',s.id)+button('mock-finish','Finish now',s.id):''}</div>${attempts.map(a=>`<details open><summary>Feedback · ${esc(new Date(a.createdAt).toLocaleString())}</summary><p class="subtle">Answered: ${esc(a.answer)}</p>${d.provider==='offline-test-fixture'?'<p class="notice">Offline test feedback; no live Gemini call.</p>':''}${feedbackView(a.feedback,d.provider==='offline-test-fixture')}${voiceReadButton(a.feedback.improvedAnswer,'Listen to improved answer')}</details>`).join('')}</div>`}
return `<form id="preparation-save" data-id="${s.id}" class="card"><span class="pill">${d.provider==='offline-test-fixture'?'Offline test fixture · not live AI':'Gemini'} · ${esc(d.language)} · Preparation</span><h2 style="margin-top:16px">${esc(d.targetRole||'Interview preparation')}</h2>${d.questions.map((q,i)=>`<section class="practice-question"><h3>${i+1}. ${esc(q.question)}</h3>${voiceReadButton(q.question)}<p><strong>Why:</strong> ${esc(q.why)}</p><p><strong>Cover:</strong> ${esc(q.strongAnswer)}</p><p><strong>Suggested answer:</strong> ${esc(q.suggestedAnswer)}</p>${q.starGuidance?`<p><strong>STAR guidance:</strong> ${esc(q.starGuidance)}</p>`:''}${q.needsExample?'<p class="notice">A real example is needed; no personal story has been invented.</p>':''}${careerInput('answer'+i,'Your editable practice answer',q.answer||'',true)}${voiceMicButton('#preparation-save [name=answer'+i+']')}</section>`).join('')}<button>Save practice answers</button>${button('interview-regenerate','Generate a new session',s.id)}</form>`}
function careerReset(){interviewUpload=null;interviewVoice.reset();letterUpload=null;letterDraft=null;activeInterview='';careerMessage='';careerInputs={}}
function readLetterEdits(){if(!letterDraft)return;document.querySelectorAll('[data-letter-paragraph]').forEach(e=>{const i=Number(e.dataset.letterParagraph);letterDraft.data.paragraphs[i]={text:e.innerText.trim(),evidence:[]}})}
async function careerSaveLetter(){readLetterEdits();if(!letterDraft)throw new Error('Open a letter first');if(!letterDraft.dirty)return letterDraft;const saved=await api('/api/cover-letters/'+letterDraft.id,'PUT',{paragraphs:letterDraft.data.paragraphs,title:letterDraft.data.title,fontFamily:letterDraft.data.fontFamily||'Arial'});letterDraft={...saved,dirty:false};await refresh();return letterDraft}
async function careerTask(message,fn){if(careerBusy)throw new Error('Please wait for the current request');careerBusy=true;careerFailed=false;careerMessage=message;const currentScope=scope;render();try{await fn(currentScope)}catch(e){careerFailed=true;careerMessage=e.message;toast(e.message)}finally{careerBusy=false;render()}}
async function careerAction(a,id){if(a==='letter-generate-ai'){const form=$('#letter-generate');if(!form.reportValidity()){toast('Upload a resume or select a saved resume first.');return true}form.requestSubmit();return true;}if(a==='letter-open'){const l=state.coverLetters.find(l=>l.id===id);if(l.owner!==scope)return true;letterDraft=structuredClone(l);careerInputs.letter={resumeId:l.data.resumeId,jobId:l.data.jobId,targetRole:l.data.targetRole,company:l.data.company,jd:l.data.jd,highlightRole:l.data.highlightRole||'',highlightSkills:l.data.highlightSkills||''};careerMessage='';render();return true}
 if(a==='letter-copy'){readLetterEdits();const d=letterDraft.data;const text=['Hi,',...d.paragraphs.map(p=>p.text),['Kind regards,',d.signature.name,d.signature.phone,d.signature.email].filter(Boolean).join('\n')].join('\n\n');await navigator.clipboard.writeText(text);toast('Letter copied');return true}
 if(a==='letter-save'){await careerSaveLetter();careerMessage='Saved as a new version. Previous versions remain unchanged.';render();return true}
 if(a==='letter-regenerate'){readLetterEdits();const old=letterDraft;const form=$('#letter-generate');careerInputs.letter={...Object.fromEntries(new FormData(form)),fontFamily:old.data.fontFamily||'Arial'};await careerTask('Generating a separate version with Gemini…',async initial=>{const fresh=await api(old.data.provider==='local-rule-based'?'/api/cover-letters/generate-local':'/api/cover-letters/generate','POST',{...careerInputs.letter,owner:initial,previousId:old.id});await refresh();if(scope===initial)letterDraft=structuredClone(fresh);careerMessage='New version generated; earlier versions were preserved.'});return true}
 if(a==='letter-download-docx'||a==='letter-download-pdf'){const saved=await careerSaveLetter();const format=a.endsWith('pdf')?'pdf':'docx';const r=await fetch(`/api/cover-letters/${saved.id}/download?format=${format}`);if(!r.ok){const b=await r.json();throw new Error(b.error)}const blob=await r.blob(),link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='cover-letter.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
 if(a==='interview-open'){activeInterview=id;const s=state.interviews.find(s=>s.id===id);careerInputs.interview={resumeId:s.data.resumeId,jobId:s.data.jobId,targetRole:s.data.targetRole,jd:s.data.jd,language:s.data.language,mode:s.data.mode};careerMessage='';render();return true}
 if(a==='mock-save'||a==='mock-next'||a==='mock-finish'){const s=state.interviews.find(s=>s.id===id),answers=s.data.questions.map(q=>q.answer||'');answers[s.data.current]=$('#mock-answer [name="answer"]').value;await api('/api/interviews/'+id,'PUT',{answers,...(a==='mock-next'?(s.data.current+1<s.data.questions.length?{current:s.data.current+1}:{finish:true}):a==='mock-finish'?{finish:true}:{})});await refresh();render();toast('Practice saved');return true}
 if(a==='mock-retry'){$('#mock-answer [name="answer"]').value='';toast('Try a revised answer. Earlier feedback stays saved.');return true}
 if(a==='interview-regenerate'){const s=state.interviews.find(s=>s.id===id);careerInputs.interview={resumeId:s.data.resumeId,jobId:s.data.jobId,targetRole:s.data.targetRole,jd:s.data.jd,language:s.data.language,mode:s.data.mode};await careerTask('Generating a new session…',async initial=>{const r=await api('/api/interviews/generate','POST',{...careerInputs.interview,owner:initial,previousId:id});await refresh();if(scope===initial)activeInterview=r.id;careerMessage='New session saved. Your previous answers and feedback were preserved.'});return true}
 return false}
async function careerSubmit(f,b,intent){
 if(f.id==='interview-generate'&&intent!=='generate-questions'){
  careerInputs.interview={...b};delete careerInputs.interview.resumeFile;
  const upload=interviewUpload?.owner===scope?interviewUpload:null;
  if(!upload&&!b.resumeId){careerFailed=true;careerMessage='Upload your resume first, or choose a saved resume in More options.';render();return true}
  if(upload){
   if(!b.candidateName?.trim()){careerFailed=true;careerMessage='Check the candidate name extracted from your resume before starting.';render();return true}
   const reviewed=structuredClone(upload.resume);reviewed.profile.fullName=b.candidateName.trim();
   await careerTask('Preparing your uploaded resume…',async owner=>{const doc=await api('/api/interview-resumes','POST',{resume:reviewed,title:upload.filename.replace(/\.(pdf|docx|txt)$/i,'')+' · interview resume',owner});await refresh();if(scope!==owner)return;careerInputs.interview={...careerInputs.interview,resumeId:doc.id};interviewUpload=null;careerMessage='Resume ready. Your interview conversation has started.';interviewVoice.startConversation({targetRole:b.targetRole,language:b.language,resumeId:doc.id})});
  }else{careerFailed=false;careerMessage='Your interview conversation has started.';interviewVoice.startConversation({targetRole:b.targetRole,language:b.language});render()}
  document.getElementById('interview-coach-question')?.focus();return true;
 }

 if(f.id==='letter-resume-upload'){
  const file=f.elements.resumeFile.files[0];if(!file||file.size>1000000||!(/\.(pdf|docx)$/i.test(file.name)))throw new Error('Choose a PDF or DOCX file up to 1 MB.');
  const form=document.getElementById('letter-generate');if(form)careerInputs.letter=Object.fromEntries(new FormData(form));
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Unable to read this file. Please select it again.'));reader.readAsDataURL(file)});
  await careerTask('Reading your resume locally…',async owner=>{const result=await api('/api/resume-workflow/import','POST',{file:{name:file.name,data}});if(scope!==owner)return;letterUpload={owner,filename:file.name,resume:result.resume,text:result.source};careerInputs.letter={...(careerInputs.letter||{}),resumeId:'',highlightRole:'',highlightSkills:''};letterDraft=null;careerMessage='Resume uploaded. Review the candidate details and extracted text, then choose Use this resume.'});return true;
 }
 if(f.id==='letter-upload-confirm'){
  if(!letterUpload||letterUpload.owner!==scope)throw new Error('Upload a resume for this workspace first.');
  if(!b.uploadName?.trim())throw new Error('Confirm the candidate full name.');
  const upload=structuredClone(letterUpload);upload.resume.profile={...upload.resume.profile,fullName:b.uploadName.trim(),email:b.uploadEmail?.trim()||'',phone:b.uploadPhone?.trim()||''};
  await careerTask('Preparing the reviewed resume…',async owner=>{const doc=await api('/api/cover-letter-resumes','POST',{resume:upload.resume,title:upload.filename.replace(/\.(pdf|docx)$/i,'')+' · uploaded resume',owner});await refresh();if(scope!==owner)return;careerInputs.letter={...(careerInputs.letter||{}),resumeId:doc.id,highlightRole:'',highlightSkills:''};letterUpload=null;letterDraft=null;if(intent==='generate-ai'){const result=await api('/api/cover-letters/generate','POST',{...careerInputs.letter,owner});await refresh();if(scope===owner)letterDraft=structuredClone(result);careerMessage='Gemini AI cover letter generated and saved. Review the preview before downloading.';return}careerMessage='Uploaded resume selected. Add the target role or JD, then click Generate AI Cover Letter.'});return true;
 }
 if(f.id==='letter-generate'||f.id==='interview-generate'){const kind=f.id==='letter-generate'?'letter':'interview';careerInputs[kind]=b;await careerTask('Generating with Gemini. Please wait…',async initial=>{const r=await api(kind==='letter'?'/api/cover-letters/generate':'/api/interviews/generate','POST',{...b,owner:initial});await refresh();if(scope===initial){if(kind==='letter')letterDraft=structuredClone(r);else activeInterview=r.id}careerMessage='Gemini content validated and saved locally. Please review the facts.'});return true}
 if(f.id==='mock-answer'){const s=state.interviews.find(s=>s.id===f.dataset.id),id=s.id,index=s.data.current;await careerTask('Getting Gemini coaching feedback…',async()=>{await api('/api/interviews/'+id+'/feedback','POST',{index,answer:b.answer});await refresh();careerMessage='Feedback saved. This is coaching guidance, not a hiring assessment.'});return true}
 if(f.id==='preparation-save'){const s=state.interviews.find(s=>s.id===f.dataset.id);await api('/api/interviews/'+s.id,'PUT',{answers:s.data.questions.map((q,i)=>b['answer'+i]||'')});await refresh();render();toast('Practice answers saved');return true}return false}
root.addEventListener('input',e=>{if(e.target.matches('[data-letter-paragraph]')&&letterDraft){letterDraft.dirty=true;readLetterEdits()}});
root.addEventListener('change',e=>{const f=e.target.closest('form');if(f&&['letter-generate','interview-generate'].includes(f.id)){const kind=f.id==='letter-generate'?'letter':'interview';if(e.target.name==='jobId'){const j=state.jobs.find(j=>j.id===e.target.value);if(j){f.elements.targetRole.value=j.data.role;f.elements.jd.value=j.data.jd;if(f.elements.company)f.elements.company.value=j.data.company;if(j.data.docId)f.elements.resumeId.value=j.data.docId}}careerInputs[kind]=Object.fromEntries(new FormData(f));if(kind==='letter'&&['resumeId','jobId'].includes(e.target.name)){letterDraft=null;careerInputs.letter.highlightRole='';careerInputs.letter.highlightSkills='';render()}}});

const incomingAuthHash=location.hash;const incomingAuthParams=new URLSearchParams(incomingAuthHash.split('?')[1]||'');
if(incomingAuthHash.startsWith('#reset-password')){authMode='reset';const token=incomingAuthParams.get('token')||'';if(/^[A-Za-z0-9_-]{43}$/.test(token))authResetToken=token;else authNotice='This recovery link is incomplete. Request a new one.';history.replaceState(null,'',location.pathname+'#reset-password')}
try{authCapabilities=await api('/api/auth/config')}catch{authCapabilities={googleConfigured:false,recoveryEnabled:false,rememberMeSupported:true}}
const googleReturn=incomingAuthParams.get('google');if(googleReturn||authCapabilities.pendingGoogleLink){authMode='login';authNotice=authCapabilities.pendingGoogleLink?'Google verified your email. Sign in once with your existing password to link your account securely.':({cancelled:'Google sign-in was cancelled. You can use email instead.',configuration:'Google sign-in requires configuration.',failed:'Google sign-in could not be verified. Please try again or use email.'}[googleReturn]||'');history.replaceState(null,'',location.pathname+'#login')}
// Presentation-only, one-time homepage reveals. Default CSS never hides content.
function mountHomepageMotion(home) {
  if (!home || !('IntersectionObserver' in window)) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return;
  const seen = new WeakSet(), targets = new Set(), timers = new Map();
  const finish = element => {
    element.classList.remove('home-motion-active');
    element.style.removeProperty('--reveal-delay');
    clearTimeout(timers.get(element));timers.delete(element);
  };
  const reveal = element => {
    if (seen.has(element)) return;
    seen.add(element);observer.unobserve(element);
    element.dataset.homeRevealed = 'true';
    if (preference.matches || document.hidden || element.contains(document.activeElement)) return;
    element.classList.add('home-motion-active');
    timers.set(element,setTimeout(() => finish(element),1100));
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
  },{threshold:0.08,rootMargin:'0px 0px -16px 0px'});
  const register = (element,kind,delay=0) => {
    if (targets.has(element) || element.closest('[data-loop-clone],dialog,[contenteditable],.ref-paper,.resume-page')) return;
    targets.add(element);element.dataset.homeMotion=kind;
    element.style.setProperty('--reveal-delay',Math.min(delay,240)+'ms');
    observer.observe(element);
  };
  const group = (selector,kind,stagger=0) => home.querySelectorAll(selector).forEach((element,index) => register(element,kind,(index%4)*stagger));
  group('.hp-header','down');
  group('#landing-title>span','up',100);
  group('.landing-copy>.landing-description','in');
  group('.landing-actions>a','bottom',100);
  group('.restored-benefits>div','up',80);
  group('.dashboard-art','left');
  group('#features .ref-browser','scale-up');
  group('.career-toolkit .toolkit-label','top');
  group('.toolkit-heading h2,.workflow-copy h2,.home-template-heading h2,.ref-examples h2,#faq h2','up');
  group('.toolkit-heading>p:last-child,.workflow-intro,.home-template-heading>div>p:not(.section-pill),.examples-intro','in',80);
  group('.toolkit-card','up',90);
  group('.workflow-copy>.ref-tag','right');
  group('.workflow-primary','up');
  group('.workflow-feature-row','right',90);
  group('#workflow-demo .ref-document','left');
  group('.ref-parserhead>div','right');
  group('.ref-parserhead>p','in');
  group('.ref-scanner','in');
  group('.home-template-heading>a,.home-template-steps>span','slide',80);
  group('.home-template-filters,.home-template-slider-controls','in');
  group('.home-template-card:not([data-loop-clone])','up',80);
  group('.ref-categories>.career-role-card,.ref-categories>.ref-lasttile','up',90);
  group('.ref-endnote','bottom');
  group('.price-badge','top');
  group('.price-intro','up');
  group('.price-card','scale',100);
  group('#faq .final-eyebrow','top');
  group('#faq details','up',80);
  group('.homepage-footer>.ref-frame','in');
  // The existing asynchronous gallery owns its cards and loop clones.
  const grid = home.querySelector('.home-template-grid');
  const galleryObserver = new MutationObserver(records => {
    for (const record of records) for (const element of record.addedNodes)
      if (element.nodeType===1 && element.matches('.home-template-card:not([data-loop-clone])')) register(element,'up',([...grid.children].indexOf(element)%3)*80);
  });
  if (grid) galleryObserver.observe(grid,{childList:true});
  const onEnd = event => { if (event.animationName==='homepageReveal') finish(event.target); };
  const onFocus = event => {
    for (const element of targets) if (element.contains(event.target)) {seen.add(element);observer.unobserve(element);finish(element);}
  };
  const onPreference = () => {
    if (!preference.matches) return;
    observer.disconnect();
    for (const element of targets) {seen.add(element);finish(element);}
  };
  home.addEventListener('animationend',onEnd);
  home.addEventListener('focusin',onFocus);
  preference.addEventListener('change',onPreference);
  const lifecycle = new MutationObserver(() => {
    if (home.isConnected) return;
    observer.disconnect();galleryObserver.disconnect();lifecycle.disconnect();
    home.removeEventListener('animationend',onEnd);home.removeEventListener('focusin',onFocus);
    preference.removeEventListener('change',onPreference);
    for (const element of timers.keys()) finish(element);
  });
  lifecycle.observe(home.parentElement,{childList:true});
}

function mountHeroTypewriter(home) {
  const accent = home.querySelector('#landing-title > .hero-heading-accent');
  if (!accent || !('IntersectionObserver' in window)) return;

  const phrases = [
    accent.textContent.trim(),
    'Job Description–Tailored Resumes',
    'Generate a Cover Letter',
    'Interview Preparation'
  ];
  // Overlap the full phrases to reserve space even when a phrase wraps on mobile.
  const sizers = phrases.map((phrase, index) => {
    const span = document.createElement('span');
    span.className = 'hero-phrase-sizer';
    span.textContent = phrase;
    if (index > 0) span.setAttribute('aria-hidden', 'true');
    return span;
  });
  const typed = document.createElement('span');
  typed.className = 'hero-phrase-typed';
  typed.setAttribute('aria-hidden', 'true');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  typed.textContent = motion.matches ? phrases[0] : '';
  accent.replaceChildren(...sizers, typed);
  accent.classList.add('hero-typewriter');

  let phraseIndex = 0;
  let letters = 0;
  let deleting = false;
  let visible = false;
  let timer;

  function step() {
    const phrase = phrases[phraseIndex];
    letters += deleting ? -1 : 1;
    typed.textContent = phrase.slice(0, letters);
    let delay = deleting ? 34 : 65;
    if (letters === phrase.length) {
      deleting = true;
      delay = 1900;
    } else if (letters === 0) {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      deleting = false;
      delay = 180;
    }
    timer = setTimeout(step, delay);
  }

  function sync() {
    clearTimeout(timer);
    if (motion.matches) {
      typed.textContent = phrases[0];
      phraseIndex = 0;
      letters = 0;
      deleting = false;
    } else if (visible && !document.hidden) {
      timer = setTimeout(step, 120);
    }
  }
  const viewport = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  viewport.observe(accent);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  const lifecycle = new MutationObserver(() => {
    if (home.isConnected) return;
    clearTimeout(timer);
    viewport.disconnect();
    lifecycle.disconnect();
    motion.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  });
  lifecycle.observe(home.parentElement, { childList: true });
}

// Homepage illustration only: never calls scoring APIs or changes a saved resume.
function mountResumeDemoProgress(home) {
  const panel=home?.querySelector('#panel-resumes'),value=panel?.querySelector('[data-demo-score]');
  if (!value) return;
  const arc=panel.querySelector('[data-demo-score-arc]'),dot=panel.querySelector('[data-demo-score-dot]');
  const chip=panel.querySelector('[data-demo-keyword-current]'),count=panel.querySelector('[data-demo-keyword-count]');
  const keywords=[...panel.querySelectorAll('[data-demo-keyword]')];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const duration=3000;let elapsed=0,last=null,raf=0,complete=false,lastCount=0;
  const paint=progress=>{
    const score=Math.round(72+20*progress),matched=Math.min(keywords.length,2+Math.floor(progress*5));
    value.textContent=String(score);arc.setAttribute('stroke-dasharray',score+' 100');
    const angle=Math.PI*(1-score/100);
    dot.setAttribute('cx',String(125+103*Math.cos(angle)));dot.setAttribute('cy',String(122-103*Math.sin(angle)));
    keywords.forEach((item,index)=>{const wasHidden=item.hidden;item.hidden=index>=matched;if(wasHidden&&!item.hidden&&!preference.matches)item.classList.add('demo-keyword-entering')});
    count.textContent=matched+' / '+keywords.length;
    if(matched!==lastCount){chip.textContent=keywords[Math.max(0,matched-1)].firstChild.textContent.trim();lastCount=matched}
    panel.dataset.demoProgress=String(progress);panel.dataset.demoScoreValue=String(score);
  };
  const tick=now=>{
    if(!home.isConnected){cleanup();return}
    if(last!==null)elapsed+=Math.min(100,now-last);last=now;
    const progress=Math.min(1,elapsed/duration);paint(progress);
    if(progress===1){complete=true;panel.dataset.demoPlayback='finished';raf=0;return}
    raf=requestAnimationFrame(tick);
  };
  const sync=()=>{
    cancelAnimationFrame(raf);raf=0;last=null;
    if(complete)return;
    if(!document.hidden){panel.dataset.demoPlayback='running';raf=requestAnimationFrame(tick)}
    else panel.dataset.demoPlayback='paused';
  };
  const reduce=()=>{if(!preference.matches)return;cancelAnimationFrame(raf);raf=0;complete=true;paint(1);panel.dataset.demoPlayback='finished'};
  const lifecycle=new MutationObserver(()=>{if(!home.isConnected)cleanup()});
  function cleanup(){cancelAnimationFrame(raf);lifecycle.disconnect();document.removeEventListener('visibilitychange',sync);preference.removeEventListener('change',reduce)}
  lifecycle.observe(home.parentElement,{childList:true});
  document.addEventListener('visibilitychange',sync);preference.addEventListener('change',reduce);
  if(preference.matches){complete=true;paint(1);panel.dataset.demoPlayback='finished'}
  else{paint(0);sync()}
}

// Concise homepage summary; the complete privacy-safe source remains separately accessible.
function mountOnePageResumeDemo(home) {
  for(const host of home?.querySelectorAll('[data-resume-demo-host]')||[]){
    const dialog=host.querySelector('.demo-full-resume-dialog'),template=host.querySelector('[data-demo-full-source]');
    if(!dialog||!template)continue;
    const fragment=template.content.cloneNode(true);
    fragment.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
    const paper=fragment.querySelector('.ref-paper');paper.classList.add('demo-full-resume-paper');
    paper.setAttribute('aria-label','Complete resume with contact details hidden');
    dialog.querySelector('.demo-full-resume-body').replaceChildren(fragment);
    const onClick=event=>{if(event.target.closest('[data-demo-full-open]'))dialog.showModal();else if(event.target.closest('[data-demo-full-close]')||event.target===dialog)dialog.close()};
    const onClose=()=>host.querySelector('[data-demo-full-open]').focus({preventScroll:true});
    host.addEventListener('click',onClick);dialog.addEventListener('close',onClose);
    const lifecycle=new MutationObserver(()=>{if(home.isConnected)return;host.removeEventListener('click',onClick);dialog.removeEventListener('close',onClose);lifecycle.disconnect()});
    lifecycle.observe(home.parentElement,{childList:true});
  }
}

// Fit the unabridged source into one portrait preview sheet; never rewrite its text.
function mountExactResumeSheet(home) {
  const host=home?.querySelector('#panel-resumes'),sheet=host?.querySelector('.demo-exact-sheet'),paper=sheet?.querySelector('.demo-exact-resume');
  if(!paper)return;
  let raf=0;
  const fit=()=>{
    if(!sheet.clientWidth)return;
    const output=host.querySelector('[data-preview-font-size]');
    const requested=Number(output.value||output.textContent)||13;
    let low=6,high=Math.max(6,requested);
    paper.style.transform='none';
    for(let i=0;i<13;i++){
      const size=(low+high)/2;paper.style.setProperty('--exact-font-size',size+'px');
      const bottom=paper.lastElementChild.offsetTop+paper.lastElementChild.offsetHeight+parseFloat(getComputedStyle(paper).paddingBottom);
      if(paper.scrollHeight<=paper.clientHeight+1&&bottom<=paper.clientHeight)low=size;else high=size;
    }
    paper.style.setProperty('--exact-font-size',Math.floor(low*100)/100+'px');
    paper.style.transform='scale('+sheet.clientWidth/794+')';
    host.dataset.exactSourceFit='ready';
  };
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fit)};
  const onChange=event=>{if(event.target.matches('[data-preview-font],[data-preview-spacing]'))schedule()};
  const onClick=event=>{if(event.target.closest('[data-preview-size]'))schedule()};
  host.addEventListener('change',onChange);host.addEventListener('click',onClick);
  const observer=new ResizeObserver(schedule);observer.observe(sheet);
  document.fonts.ready.then(()=>{if(home.isConnected)schedule()});schedule();
  const lifecycle=new MutationObserver(()=>{if(home.isConnected)return;cancelAnimationFrame(raf);observer.disconnect();lifecycle.disconnect();host.removeEventListener('change',onChange);host.removeEventListener('click',onClick)});
  lifecycle.observe(home.parentElement,{childList:true});
}

const marketingAnchorRoutes = new Map([
  ['#home', '/'], ['#features', '/features'], ['#resume-layouts', '/templates'],
  ['#how-it-works', '/how-it-works'], ['#workflow-demo', '/how-it-works'],
  ['#ats-walkthrough', '/ats-demo'], ['#resume-examples', '/career-roles'],
  ['#pricing', '/pricing'], ['#faq', '/faq']
]);
const marketingPage = getMarketingPage(location.pathname);
const publicPreview = document.querySelector('meta[name="resume-maker-deployment"]')?.content === 'public-preview';

function updateHomepageNavigation(home) {
  const currentPath = marketingPage
    ? marketingPage.path ?? location.pathname.replace(/\/$/, '')
    : marketingAnchorRoutes.get(location.hash) ?? '/';
  for (const link of home.querySelectorAll('.hp-header nav a')) {
    if (link.getAttribute('href') === currentPath) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function mountMobileNavigation(home) {
  const menu = home.querySelector('.hp-menu');
  const toggle = menu.querySelector('summary');
  const brand = home.querySelector('.hp-brand');
  const background = [home.querySelector('main'), home.querySelector('footer'), home.querySelector('.hp-skip'), brand];

  function syncMenu() {
    toggle.setAttribute('aria-expanded', String(menu.open));
    for (const element of background) element.inert = menu.open;
    if (menu.open && !menu.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  }

  menu.addEventListener('toggle', syncMenu);
  menu.addEventListener('click', event => {
    if (event.target.closest('a') || event.target.closest('.hp-menu-backdrop')) {
      menu.open = false;
      toggle.focus({ preventScroll: true });
    }
  });
  menu.addEventListener('keydown', event => {
    if (!menu.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      menu.open = false;
      toggle.focus({ preventScroll: true });
    }
    if (event.key === 'Tab') {
      const lastLink = menu.querySelector('nav a:last-child');
      if (event.shiftKey && document.activeElement === toggle) {
        event.preventDefault();
        lastLink.focus();
      } else if (!event.shiftKey && document.activeElement === lastLink) {
        event.preventDefault();
        toggle.focus({ preventScroll: true });
      }
    }
  });
  const desktop = matchMedia('(min-width: 1201px)');
  function closeOnDesktop() {
    if (!desktop.matches || !menu.open) return;
    menu.open = false;
    syncMenu();
    brand.focus({ preventScroll: true });
  }
  const controller = new AbortController();
  desktop.addEventListener('change', closeOnDesktop, { signal: controller.signal });
  const lifecycle = new MutationObserver(() => {
    if (home.isConnected) return;
    controller.abort();
    lifecycle.disconnect();
  });
  lifecycle.observe(home.parentElement, { childList: true });
  window.addEventListener('pagehide', () => {
    menu.open = false;
    syncMenu();
  }, { signal: controller.signal });
}

function showPublicHomepage() {
  const content = document.getElementById('public-home').content.cloneNode(true);
  if (publicPreview) {
    const demoButton = content.querySelector('.landing-primary[href="/?workspace=1#resume-dashboard"]');
    if (demoButton) {
      demoButton.href = '/#workflow-demo';
      demoButton.firstChild.textContent = 'Try AI Resume Maker Demo ';
    }
  }
  if (marketingPage) {
    const main = content.querySelector('#hp-main');
    for (const section of [...main.children]) {
      if (!marketingPage.sections.some(selector => section.matches(selector))) section.remove();
    }
    const heading = document.createElement('h1');
    heading.className = 'marketing-page-title';
    heading.textContent = marketingPage.title;
    main.prepend(heading);
    main.classList.add('marketing-page');
    document.title = marketingPage.title + ' · AI Resume Maker';
  }
  for (const link of content.querySelectorAll(marketingPage ? 'a[href^="#"]' : '.homepage-footer a[href^="#"]')) {
    const hash = link.getAttribute('href');
    if (marketingAnchorRoutes.has(hash)) link.setAttribute('href', marketingAnchorRoutes.get(hash));
  }
  root.replaceChildren(content);
  const signup = root.querySelector('.footer-signup');
  signup.addEventListener('submit', async event => {
    event.preventDefault();
    const button = signup.querySelector('button');
    if (button.disabled) return;
    const status = signup.querySelector('[role="status"]');
    button.disabled = true;
    status.textContent = '';
    try {
      await api('/api/newsletter/subscribe', 'POST', { email: signup.elements.email.value });
      signup.reset();
      status.textContent = 'Email saved for this local preview.';
    } catch {
      status.textContent = 'Could not save your email. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
  void mountTemplateShowcase(root);
  for (const group of root.querySelectorAll('[data-switcher]')) {
    const belongsToGroup = element => element.closest('[data-switcher]') === group;
    const choices = [...group.querySelectorAll('[data-choice]')].filter(belongsToGroup);
    const panels = [...group.querySelectorAll('[data-panel]')].filter(belongsToGroup);
    group.addEventListener('click', event => {
      const choice = event.target.closest('[data-choice]');
      if (!choices.includes(choice)) return;
      choices.forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
      panels.forEach(panel => { panel.hidden = panel.dataset.panel !== choice.dataset.choice; });
      const documentPreview = group.querySelector('.ref-document');
      if (documentPreview) documentPreview.dataset.mode = choice.dataset.choice;
    });
  }

  const jobsPreview = root.querySelector('#panel-jobs');
  const filtersByStage = jobsPreview?.querySelectorAll('[data-stage-filter]') ?? [];
  const jobChoices = [...(jobsPreview?.querySelectorAll('[data-stage]') ?? [])];
  for (const filter of filtersByStage) {
    filter.addEventListener('click', () => {
      for (const button of filtersByStage) button.setAttribute('aria-pressed', String(button === filter));
      for (const job of jobChoices) {
        job.hidden = filter.dataset.stageFilter !== 'all' && job.dataset.stage !== filter.dataset.stageFilter;
      }
      jobChoices.find(job => !job.hidden).click();
    });
  }

  mountHomepageScanner(root);

  const home = root.querySelector('.hp');
  mountMobileNavigation(home);
  updateHomepageNavigation(home);
  document.getElementById(location.hash.slice(1))?.scrollIntoView();
  mountHomepageMotion(root.querySelector('.hp'));
  mountHeroTypewriter(root.querySelector('.hp'));
  mountResumeDemoProgress(root.querySelector('.hp'));
  mountOnePageResumeDemo(root.querySelector('.hp'));
  mountExactResumeSheet(root.querySelector('.hp'));
}

function mountHomepageScanner(home) {
  const scanner = home.querySelector('.ref-scanner');
  if (!scanner) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scanButton = scanner.querySelector('[data-replay]');
  const output = scanner.querySelector('.ref-parseout');
  const status = output.querySelector('.scan-status');
  const beam = scanner.querySelector('.ref-beam');
  const templateFrame = scanner.querySelector('[data-scan-template]');
  const resumeDialog = home.querySelector('.scan-resume-dialog');
  const dialogStage = resumeDialog.querySelector('.scan-dialog-page');
  const dialogFrame = templateFrame.cloneNode();
  dialogFrame.removeAttribute('data-scan-template');
  dialogFrame.title = 'Navy Sidebar · full resume template preview';
  dialogStage.replaceChildren(dialogFrame);
  let samplePaper = null, running = false, inView = false, autoStarted = false, raf = 0, scanTravel = 0, elapsed = 0, lastFrameTime = null;
  const duration = 8000;
  const textOf = element => element?.textContent.trim() || '';
  function fitFrame(frame, box) {
    if (!box.clientWidth) return;
    const page = frame.contentDocument?.querySelector('.resume-page');
    if (page) page.style.margin = '0';
    const width = page?.getBoundingClientRect().width || 794;
    const height = page?.getBoundingClientRect().height || 1123;
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = 'scale(' + box.clientWidth / width + ')';
    const borders = getComputedStyle(box);
    box.style.height = height * box.clientWidth / width + (parseFloat(borders.borderTopWidth)||0) + (parseFloat(borders.borderBottomWidth)||0) + 'px';
  }
  const sizeObserver = new ResizeObserver(() => {
    fitFrame(templateFrame, templateFrame.parentElement);
    scanTravel = Math.max(0,templateFrame.parentElement.clientHeight-3);
    if (resumeDialog.open) fitFrame(dialogFrame, dialogStage);
  });
  sizeObserver.observe(templateFrame.parentElement);
  sizeObserver.observe(dialogStage);
  dialogFrame.addEventListener('load', () => { if (resumeDialog.open) fitFrame(dialogFrame, dialogStage); });
  function nodesInSection(title) {
    const heading = [...samplePaper.querySelectorAll('.heading')].find(node => textOf(node).toLowerCase() === title);
    const nodes = [];
    for (let node = heading?.nextElementSibling; node && !node.classList.contains('heading'); node = node.nextElementSibling) nodes.push(node);
    return nodes;
  }
  function visiblePlayback() {
    lastFrameTime = null;
    if (running) scanner.dataset.scanPlayback = inView && !document.hidden ? 'running' : 'paused';
  }
  function removeListeners() {
    cancelAnimationFrame(raf);sizeObserver.disconnect();scanObserver?.disconnect();document.removeEventListener('visibilitychange', visiblePlayback);
  }
  scanButton.disabled = true;
  status.textContent = 'Loading our resume template…';
  function startScan() {
    if (running || !samplePaper) return;
    cancelAnimationFrame(raf);elapsed=0;lastFrameTime=null;scanTravel=Math.max(0,templateFrame.parentElement.clientHeight-3);
    output.querySelector('[data-scan-after]').textContent='72';output.querySelector('[data-scan-ats-progress]').value=72;
    scanner.dataset.scanDuration=String(duration);scanner.dataset.scanProgress='0';beam.style.transform='translate3d(0,0,0)';
    running = true;autoStarted = true;scanButton.disabled = true;scanButton.textContent = 'Scanning…';
    scanner.classList.remove('has-keyword-gaps');scanner.classList.add('is-scanning');scanner.setAttribute('aria-busy','true');
    output.querySelector('.scan-empty').hidden = true;
    output.querySelectorAll('section,.scan-match').forEach(element => { element.hidden = true; });
    const fields = output.querySelector('.scan-fields dl');fields.replaceChildren();
    const fullText = textOf(samplePaper);
    const data = [
      ['Name', textOf(samplePaper.querySelector('.name'))],
      ['Location', textOf(samplePaper.querySelector('[data-contact-kind="location"] .resume-contact-text')) || 'Not provided'],
      ['Experience', nodesInSection('experience').filter(node => node.classList.contains('entry-title')).length + ' roles detected'],
      ['Education', nodesInSection('education').map(textOf).join(' ')],
      ['Skills', nodesInSection('skills').map(textOf).join(' ')]
    ];
    const requirements = ['Campaign planning','Content strategy','Customer research','Email marketing','Google Analytics','Microsoft Excel','SQL','Jira'];
    const matched = requirements.filter(skill => fullText.toLowerCase().includes(skill.toLowerCase()));
    const missing = requirements.filter(skill => !matched.includes(skill));
    const percent = Math.round(matched.length / requirements.length * 100);
    const thresholds = [.12,.27,.43,.59,.74];let revealed = 0, keywordsShown = false;
    output.querySelector('.scan-fields').hidden = false;
    status.textContent = 'Scanning our Navy Sidebar template…';
    const paperState = scanner.querySelector('.scan-paper-state');paperState.textContent = 'Navy Sidebar · scanning';
    visiblePlayback();
    function showKeywords() {
      for (const [selector, skills] of [['.scan-skills',matched],['.scan-missing',missing]]) {
        const section = output.querySelector(selector),tags = section.querySelector('div');tags.replaceChildren();
        for (const skill of skills) { const tag = document.createElement('span');tag.textContent=skill;tags.append(tag); }
        section.hidden = !skills.length;
      }
      output.querySelector('[data-match-score]').textContent = percent+'%';
      output.querySelector('[data-match-progress]').value = percent;
      output.querySelector('.scan-match').hidden = false;
    }
    function tick(now) {
      if (!scanner.isConnected) { removeListeners();return; }
      const playing = inView && !document.hidden;
      if (playing && lastFrameTime !== null) elapsed += Math.min(100,Math.max(0,now-lastFrameTime));
      lastFrameTime = playing ? now : null;
      const progress = reducedMotion.matches ? 1 : Math.min(1,elapsed/duration);
      beam.style.transform = 'translate3d(0,'+(scanTravel*progress)+'px,0)';
      scanner.dataset.scanProgress = progress.toFixed(4);
      const demoScore=Math.round(72+20*progress);
      output.querySelector('[data-scan-after]').textContent=String(demoScore);
      output.querySelector('[data-scan-ats-progress]').value=demoScore;
      scanner.dataset.scanPlayback = playing ? 'running' : 'paused';
      while (revealed < data.length && progress >= thresholds[revealed]) {
        const [label,value] = data[revealed++],row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');
        term.textContent='✓ '+label;detail.textContent=value||'Not provided';row.append(term,detail);fields.append(row);status.textContent='Reading '+label.toLowerCase()+'…';
      }
      if (progress >= .87 && !keywordsShown) { showKeywords();keywordsShown=true;status.textContent='Comparing sample role keywords…'; }
      if (progress < 1) { raf=requestAnimationFrame(tick);return; }
      running=false;scanner.dataset.scanPlayback='finished';scanner.classList.remove('is-scanning');scanner.classList.toggle('has-keyword-gaps',missing.length>0);scanner.setAttribute('aria-busy','false');
      paperState.textContent=missing.length?'Navy Sidebar · keyword gaps found':'Navy Sidebar · scan complete';
      status.textContent='Scan complete';scanButton.disabled=false;scanButton.textContent='Scan again ↻';
    }
    raf=requestAnimationFrame(tick);
  }
  const scanObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    inView=entries.some(entry=>entry.isIntersecting);visiblePlayback();
    if (inView && samplePaper && !autoStarted) startScan();
    if (!scanner.isConnected) removeListeners();
  },{threshold:.15}) : null;
  if (scanObserver) scanObserver.observe(scanner);else inView=true;
  document.addEventListener('visibilitychange',visiblePlayback);
  function templateLoaded() {
    if (!scanner.isConnected) return;
    samplePaper=templateFrame.contentDocument?.querySelector('.resume-page');
    if (!samplePaper) { status.textContent='Template could not load. Refresh to try again.';return; }
    fitFrame(templateFrame,templateFrame.parentElement);scanButton.disabled=false;status.textContent='Ready to scan';
    if (inView && !autoStarted) startScan();
  }
  templateFrame.addEventListener('load',templateLoaded);
  if (templateFrame.contentDocument?.readyState==='complete' && templateFrame.contentDocument.querySelector('.resume-page')) templateLoaded();
  scanButton.addEventListener('click',startScan);
  scanner.querySelector('[data-expand-resume]').addEventListener('click',()=>{resumeDialog.showModal();fitFrame(dialogFrame,dialogStage)});
  resumeDialog.querySelector('[data-close-resume]').addEventListener('click',()=>resumeDialog.close());
  resumeDialog.addEventListener('click',event=>{if(event.target===resumeDialog)resumeDialog.close()});
}

async function openResumeDashboard() {
  root.innerHTML = '<main class="direct-workspace-entry"><p role="status">Opening your resume workspace…</p></main>';
  try {
    const response = await fetch('/api/state');
    if (response.status === 401) {
      const guestId = crypto.randomUUID();
      await api('/api/auth/signup', 'POST', {
        name: 'Guest',
        organisation: 'My resume workspace',
        email: 'guest-' + guestId + '@local.invalid',
        password: crypto.randomUUID() + crypto.randomUUID(),
        remember: true
      });
    } else if (!response.ok) {
      throw new Error('The workspace could not be opened. Please try again.');
    }
    await refresh();
    page = 'Dashboard';
    render();
  } catch (error) {
    root.innerHTML = '<main class="direct-workspace-entry"><h1>Unable to open your workspace</h1><p role="alert">' + esc(error.message) + '</p><button type="button" id="retry-direct-workspace">Try again</button><a href="/#home">Back to home</a></main>';
    root.querySelector('#retry-direct-workspace').addEventListener('click', openResumeDashboard, { once: true });
  }
}

const publicSections = ['', '#home', '#hp-main', '#features', '#how-it-works', '#ats-walkthrough', '#pricing', '#resume-layouts', '#resume-examples', '#faq', '#workflow-demo'];
const publicEntry = publicSections.includes(incomingAuthHash) && !authCapabilities.pendingGoogleLink;
if (marketingPage) {
  showPublicHomepage();
} else if (publicPreview && new URLSearchParams(location.search).has('workspace')) {
  root.innerHTML = '<main class="direct-workspace-entry"><h1>Explore the resume demo</h1><p>The public preview includes sample resumes, templates and an ATS walkthrough. The hosted workspace for signing in, saving and exporting resumes is still being set up.</p><a class="button" href="/#workflow-demo">Open interactive demo</a><a href="/#home">Back to home</a></main>';
} else if (publicPreview) {
  showPublicHomepage();
} else if (incomingAuthHash === '#resume-dashboard') {
  await openResumeDashboard();
} else if (authMode === 'reset') {
  auth();
} else {
  if (incomingAuthHash === '#signup') authMode = 'signup';
  try {
    await refresh();
    if (publicEntry && (incomingAuthHash || !new URLSearchParams(location.search).has('workspace'))) showPublicHomepage();
    else render();
  } catch {
    if (publicEntry) showPublicHomepage();
    else auth();
  }
}

// A workspace-to-home link can be a same-document hash navigation.
window.addEventListener('hashchange',()=>{
 const home = root.querySelector('.hp');
 if (home) updateHomepageNavigation(home);
 else if (publicSections.includes(location.hash)) showPublicHomepage();
});




root.addEventListener('change',event=>{if(event.target.matches('#letter-resume-upload input[type=file]')&&event.target.files.length)event.target.form.requestSubmit()});

root.addEventListener('change',event=>{if(event.target.id==='cover-letter-font'&&letterDraft){readLetterEdits();letterDraft.data.fontFamily=event.target.value;letterDraft.dirty=true;const paper=document.querySelector('.cover-paper');if(paper)paper.style.setProperty('--cover-font',event.target.value);careerMessage='Font updated. Saving and downloads include this selection.';fitLetterPreview()}});

// Native disclosure keeps actions accessible to mouse, touch and keyboard users.
document.addEventListener('click',event=>{document.querySelectorAll('.resume-action-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false})});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;document.querySelectorAll('.resume-action-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus()})});

root.addEventListener('change',async event=>{
 if(!event.target.matches('[data-interview-resume-file]'))return;
 const file=event.target.files?.[0];if(!file)return;const uploadScope=scope,uploadUser=state.user.id;
 const form=document.getElementById('interview-generate');careerInputs.interview={...careerInputs.interview,...Object.fromEntries(new FormData(form))};delete careerInputs.interview.resumeFile;careerInputs.interview.resumeId='';interviewUpload=null;
 if(file.size>1000000||!(/\.(pdf|docx|txt)$/i.test(file.name))){careerFailed=true;careerMessage='Choose a PDF, DOCX or TXT resume up to 1 MB.';render();return}
 try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Unable to read the resume. Choose the file again.'));reader.readAsDataURL(file)});
 if(scope!==uploadScope||state.user.id!==uploadUser)return;await careerTask('Reading your resume locally…',async owner=>{const result=await api('/api/resume-workflow/import','POST',{file:{name:file.name,data}});if(scope!==owner||state.user.id!==uploadUser)return;interviewUpload={owner,filename:file.name,resume:result.resume,text:result.source};careerInputs.interview={...careerInputs.interview,resumeId:''};activeInterview='';careerMessage='Resume uploaded. Check the extracted name, then click Start conversation.'});
 }catch(error){careerFailed=true;careerMessage=error.message;render()}
});

// Homepage sample toolbar; changes only the fictional preview, never saved resumes.
root.addEventListener('change',event=>{const panel=event.target.closest('#panel-resumes');if(!panel)return;const paper=panel.querySelector('.ref-paper');if(event.target.matches('[data-preview-font]'))paper.style.fontFamily=event.target.value;if(event.target.matches('[data-preview-spacing]'))paper.style.setProperty('--sample-line-height',event.target.value)});
root.addEventListener('click',event=>{const control=event.target.closest('[data-preview-size]');if(!control)return;const panel=control.closest('#panel-resumes'),paper=panel.querySelector('.ref-paper'),output=panel.querySelector('[data-preview-font-size]');const value=Math.max(10,Math.min(16,Number(output.value||output.textContent)+Number(control.dataset.previewSize)));output.value=String(value);output.textContent=String(value);paper.style.setProperty('--sample-font-size',value+'px')});
