import {recoverImportedSkills,guidedBulletChoices,reviseGuidedBullet,mergeConciseEdits,RESUME_DESIGNS} from './resume-workflow.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const clone=x=>structuredClone(x);
const actualFont=resume=>resume?.documentSettings?.fontFamily||RESUME_DESIGNS.find(d=>d.id===resume?.documentSettings?.designId)?.font||'Arial';

export function remainingScoreReasons(analysis){

 const reasons=(analysis?.breakdown||[]).filter(c=>c.points<c.max).flatMap(c=>(c.issues||[]).map(i=>typeof i==='string'?i:i.message||i.title||'').filter(Boolean).map(message=>c.label+': '+message));

 if(analysis?.keywordCoverage!==null&&analysis?.keywordCoverage!==undefined&&analysis.keywordCoverage<100){const missing=(analysis.keywords||[]).filter(k=>k.status==='missing').map(k=>k.term);if(missing.length)reasons.push('Job requirements without evidence: '+missing.join(', '))}

 return [...new Set(reasons)];

}

function comparisonTokens(text){return [...String(text).matchAll(/[\p{L}\p{N}][\p{L}\p{N}%+.#/×-]*/gu)].map(m=>{const value=m[0].replace(/[-./]+$/,'');return {text:value,key:value.toLowerCase(),start:m.index,end:m.index+value.length}})}

export function addedWordRanges(before,after){

 const tokens=comparisonTokens;

 const a=tokens(before),b=tokens(after);if(a.length>500||b.length>500){const counts=new Map();a.forEach(t=>counts.set(t.key,(counts.get(t.key)||0)+1));return b.filter(t=>{const n=counts.get(t.key)||0;if(n){counts.set(t.key,n-1);return false}return true})}

 const rows=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)rows[i][j]=a[i].key===b[j].key?rows[i+1][j+1]+1:Math.max(rows[i+1][j],rows[i][j+1]);

 const unchanged=new Set();let i=0,j=0;while(i<a.length&&j<b.length){if(a[i].key===b[j].key){unchanged.add(j);i++;j++}else if(rows[i+1][j]>=rows[i][j+1])i++;else j++}return b.filter((_,index)=>!unchanged.has(index));

}

export function addedSectionWordRanges(before,after){

 const words=comparisonTokens;

 const section=b=>String(b.section||'').toLowerCase().replace(/\s+/g,' ').trim(),counts=new Map();
 const content=b=>['paragraph','bullet'].includes(b.type)||(b.type==='entry-title'&&/\bskills\b/i.test(b.section||'')&&b.text.includes(':'));

 // Compare content within its section, so an imported audit copy or an existing

 // keyword in Experience cannot hide a new addition to Skills. Word counts

 // also survive page breaks, reordered paragraphs and template changes.

 for(const b of before){if(!content(b))continue;const key=section(b);if(!counts.has(key))counts.set(key,new Map());const values=counts.get(key);for(const w of words(b.text))values.set(w.key,(values.get(w.key)||0)+1)}

 return after.map(b=>{if(!content(b))return [];const values=counts.get(section(b))||new Map();return words(b.text).filter(w=>{const n=values.get(w.key)||0;if(n){values.set(w.key,n-1);return false}return true})});

}

export async function runTruthfulImprovements(initial,request,onStep=()=>{}){

 let result=initial;const seen=new Set(),changes=[];

 for(let i=0;i<12;i++){if(seen.has(result.hash))break;seen.add(result.hash);const suggestion=result.suggestions.find(s=>s.delta>0||(s.delta===0&&/^(?:skill:|bullet:|dedupe|summary$)/.test(s.id||'')&&s.beforeText!==s.afterText));if(!suggestion)break;const next=await request(result,suggestion);if(next.analysis.score<result.analysis.score)throw Error('A proposed change reduced the estimate. Review it manually.');changes.push({label:suggestion.label,before:result.analysis.score,after:next.analysis.score});result=next;onStep(changes.length)}

 return {result,changes};

}

export function verifiedMetricEdit(resume,index,text,confirmed){

 if(confirmed!==true)throw Error('Confirm that the result and numbers are accurate.');

 if(!/\d+(?:[.,]\d+)?\s*(?:%|[x×]|hours?\b|days?\b|customers?\b|patients?\b|students?\b|tickets?\b|people\b|sales\b|employees?\b)/i.test(text))throw Error('Enter your real measured result, such as a verified percentage, multiplier or count with its unit.');

 const choice=guidedBulletChoices(resume)[Number(index)];if(!choice)throw Error('Choose an existing experience or project bullet.');return reviseGuidedBullet(resume,choice,text);

}

// Preview state belongs to the uploaded file, independently of score revisions.
export async function prepareOriginalPreview(source,{fetchPreview,createPdfUrl,createBlobUrl,isCurrent}){
 if(source.previewPending)return source.previewPending;
 const work=async()=>{
  source.previewError='';
  try{
   if(!isCurrent())return;
   if(/\.pdf$/i.test(source.original.name)&&!source.beforeUrl){source.beforeUrl=createPdfUrl(source.original.data);if(source.current.data===source.original.data)source.afterUrl=source.beforeUrl}
   if(!source.originalPages){const before=await fetchPreview(source.original);if(!isCurrent())return;if(!source.beforeUrl)source.beforeUrl=createBlobUrl(before.blob);source.originalHash=before.hash;source.originalPages=before.pages}
   if(!isCurrent())return;
   if(source.current.data===source.original.data){source.afterUrl=source.beforeUrl;source.hash=source.originalHash;source.pages=source.originalPages}
   else if(!source.afterUrl||!source.pages){const current=source.current;const after=await fetchPreview(current);if(!isCurrent()||source.current!==current)return;source.afterUrl=createBlobUrl(after.blob);source.hash=after.hash;source.pages=after.pages}
  }catch(error){if(isCurrent())source.previewError=error.message||'Preview could not be loaded.'}
 };
 const pending=work();source.previewPending=pending;
 try{await pending}finally{if(source.previewPending===pending)delete source.previewPending}
}

export function atsReviewChecks(analysis){
 const checks=(analysis?.breakdown||[]).filter(c=>c.points<c.max).flatMap(c=>(c.issues||[]).map(i=>({category:c.label,message:typeof i==='string'?i:i.message||i.title||''}))).filter(c=>c.message);
 const seen=new Set();return checks.filter(c=>{const key=c.category+':'+c.message;if(seen.has(key))return false;seen.add(key);return true}).map(c=>({...c,advice:/location/i.test(c.message)?'Check the contact line in your original resume and include your actual city and country if missing.':/too short/i.test(c.message)?'Check whether this is a heading, institution name or work bullet. Expand it only if it describes work you actually did.':/action verb/i.test(c.message)?'Start relevant work bullets with the action you performed; retain the original task, tools and result.':/long|concise|shorter/i.test(c.message)?'Split dense work descriptions into separate bullets without removing facts, skills or qualifications.':'Review this check in the original document. Change only verified information.'}));
}

export async function applyNextAtsIncrease(current,applySuggestion,{originalWord=false}={}){
 const suggestion=(current?.suggestions||[]).find(item=>Number(item.delta)>0&&/^(?:bullet:|structure-bullets:|two-pages$|skill:|summary$|dedupe(?::|-))/.test(item.id||'')&&(!originalWord||item.id.startsWith('bullet:')));
 if(!suggestion)return null;
 const response=await applySuggestion(suggestion),next=response.result||response;
 if(!next.analysis||next.analysis.score<=current.analysis.score||next.hash===current.hash)throw Error('No verified score improvement was produced. The current resume is unchanged.');
 return {response,result:next,suggestion,before:current.analysis.score,after:next.analysis.score};
}

export function createAtsWorkbench({api,getState,getOwner,onSaved,onEdit}){

 let analysisTimer=null,analysisRevision=0;

 let originalResume=null,beforeResult=null,appliedChanges=[],sourceName='',afterFullSource=null,afterConciseApplied=null,explicitPageTarget=null;
 let uploadedSource=null,sourceLayout=null,reviewing=false,taskGeneration=0;

 let host=null,owner='',user='',resume=null,selected=null,title='',jd='',result=null,history=[],busy=false,message='',stale=false,observer=null,previousBlocks=null,targetJobId='',targetCompany='',skipped=new Set();

 const docs=()=>getState().documents.filter(d=>d.owner===getOwner());

 const jobs=()=>getState().jobs.filter(j=>j.owner===getOwner());
 function clearSource(){if(uploadedSource){for(const url of new Set([uploadedSource.beforeUrl,uploadedSource.afterUrl]))if(url)URL.revokeObjectURL(url)}uploadedSource=null;sourceLayout=null;reviewing=false}
 function pdfBlob(data){return new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:'application/pdf'})}
 async function fetchSourcePreview(file){const response=await fetch('/api/ats-source/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file,owner}),signal:AbortSignal.timeout(90000)});if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw Error(error||'Preview service could not load this file. Please retry.')}const blob=await response.blob();if(!blob.type.includes('application/pdf'))throw Error('Preview service returned an invalid response. Please retry.');return {blob,pages:Number(response.headers.get('X-Source-Pages'))||null,hash:response.headers.get('X-Source-Hash')}}
 async function loadSourcePreview(){const source=uploadedSource;if(!source)return;await prepareOriginalPreview(source,{fetchPreview:fetchSourcePreview,createPdfUrl:data=>URL.createObjectURL(pdfBlob(data)),createBlobUrl:blob=>URL.createObjectURL(blob),isCurrent:()=>active()&&uploadedSource===source})}
 const sourcePages=pages=>pages?pages+' page(s)':'page count unavailable';
 function sourceComparison(){const source=uploadedSource;if(!source||!result||!beforeResult)return '';const frame=(url,title)=>url?'<iframe data-source-pdf title="'+title+'" src="'+esc(url)+'#toolbar=0&navpanes=0&view=FitH"></iframe>':'<p>'+(source.previewError?'The original-format preview could not be loaded. Use Retry preview above.':'Preparing the original-format preview…')+'</p>';return (source.previewError?'<section class="card ats-preview-error" role="alert"><p>'+esc(source.beforeUrl?'Original PDF is displayed. Page information could not be loaded: ':'Original preview could not be loaded: ')+esc(source.previewError)+'</p>'+button('source-retry','Retry preview')+'</section>':'')+'<section class="ats-comparison ats-original-comparison" aria-label="Original-format resume comparison"><article><header><div><h2>Before</h2><p>Original uploaded file · '+sourcePages(source.originalPages)+'</p></div><strong data-before-score>'+beforeResult.analysis.score+'<small>/100</small></strong></header><div class="ats-before-shell">'+frame(source.beforeUrl,'Before · exact original upload')+'</div></article><article><header><div><h2>After</h2><p>'+(sourceLayout?'Page-fit copy · '+sourcePages(result.pages):(source.edits.length?'Only your accepted wording edits':'Original preserved · no text changes applied')+' · '+sourcePages(source.pages))+'</p></div><strong data-after-score>'+result.analysis.score+'<small>/100</small></strong></header><div class="ats-added-legend"><p>'+(sourceLayout?'Selected page layout applies to this copy and its downloads. Text is retained; spacing and layout may differ from the original.':source.edits.length?'Accepted wording is listed below. Original fonts, styles and bullet structure are preserved.':'No template, section, bullet or wording change has been applied.')+'</p></div><div class="ats-preview-shell">'+(sourceLayout?'<iframe sandbox="allow-same-origin" title="After · selected page layout" srcdoc="'+esc(result.html)+'"></iframe>':frame(source.afterUrl,'After · original format preserved'))+'</div></article></section>'}
 function reviewPanel(){if(!reviewing||!result)return '';const suggestions=result.suggestions||[];return '<section class="card ats-source-review"><h2>Review ATS improvements</h2><p>Nothing changes until you accept an edit. Numbers, employers, dates and original formatting stay intact.</p>'+(uploadedSource&&!sourceLayout&&!/\.docx$/i.test(uploadedSource.current.name)?'<p>PDF layout is preserved. To apply wording edits in the same format, use the original editable Word file; this PDF remains unchanged.</p>':'')+(suggestions.length?suggestions.map((suggestion,index)=>'<article class="ats-source-proposal"><h3>'+esc(suggestion.label)+'</h3><p>Calculated local impact: '+suggestion.beforeScore+' → '+suggestion.afterScore+'</p><div class="ats-source-diff"><div><strong>Current wording</strong><pre>'+esc(suggestion.beforeText)+'</pre></div><div><strong>Suggested wording</strong><pre>'+esc(suggestion.afterText)+'</pre></div></div>'+(!uploadedSource||sourceLayout?button('apply','Apply reviewed change','data-index="'+index+'"'):suggestion.id.startsWith('bullet:')&&/\.docx$/i.test(uploadedSource.current.name)?button('source-apply','Apply this wording in original format','data-index="'+index+'"'):'<small>This change needs a manual edit in the source document; it will not be applied automatically.</small>')+'</article>').join(''):'<p>No safe automatic wording replacement was found. Review the specific checks below; no unsupported wording has been added.</p>')+(atsReviewChecks(result.analysis).length?'<div data-ats-review-checks><h3>Checks to review in your original resume</h3>'+atsReviewChecks(result.analysis).map(check=>'<article class="ats-source-proposal"><h4>'+esc(check.category)+'</h4><p>'+esc(check.message)+'</p><p>'+esc(check.advice)+'</p></article>').join('')+'</div>':'<p>All configured structure and wording checks pass. A job-specific keyword assessment needs the target job description.</p>')+(uploadedSource?.edits.length?'<h3>Accepted changes</h3>'+uploadedSource.edits.map(edit=>'<p><del>'+esc(edit.before)+'</del><br><mark>'+esc(edit.after)+'</mark></p>').join('')+button('source-restore','Restore original upload'):'')+'</section>'}
 async function downloadSource(format){const source=uploadedSource;let blob;if(format==='pdf'){if(!source.afterUrl)throw Error('Wait for the original preview.');blob=await(await fetch(source.afterUrl)).blob()}else{if(!/\.docx$/i.test(source.current.name))throw Error('Use the original Word document for an editable download that preserves its formatting.');blob=new Blob([Uint8Array.from(atob(source.current.data),c=>c.charCodeAt(0))],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=(title||'resume').replace(/[^a-z0-9-]/gi,'_')+'.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}


 function reset(){taskGeneration++;clearSource();clearTimeout(analysisTimer);analysisRevision++;observer?.disconnect();host=null;owner='';user='';resume=null;selected=null;result=null;history=[];jd='';title='';busy=false;stale=false;previousBlocks=null;targetJobId='';targetCompany='';skipped.clear();originalResume=null;beforeResult=null;appliedChanges=[];sourceName='';afterFullSource=null;afterConciseApplied=null;explicitPageTarget=null}

 function open(doc,options={}){taskGeneration++;busy=false;clearSource();clearTimeout(analysisTimer);analysisRevision++;owner=getOwner();user=getState().user.id;selected=doc?.id?clone(doc):null;resume=doc?.data.canonical?recoverImportedSkills(doc.data.canonical):null;title=doc?.data.title||'Optimised resume';jd=options.jd??doc?.data.workflow?.jd??'';targetJobId=options.jobId??doc?.data.workflow?.jobId??'';targetCompany=options.company??doc?.data.workflow?.company??'';result=null;history=[];skipped.clear();stale=false;originalResume=null;beforeResult=null;appliedChanges=[];afterFullSource=null;afterConciseApplied=null;explicitPageTarget=null;sourceName=doc?.data.title||'';message=doc&&!resume?'Import this older text resume through the guided builder first.':'Upload your resume, then click Improve ATS.';if(doc?.data.originalSource){const source=doc.data.originalSource;uploadedSource={original:clone(source.original),current:clone(source.current||source.original),edits:clone(source.edits||[])};originalResume=clone(source.baseline||resume);if(source.layout)sourceLayout=clone(source.layout)}}

 function active(){return owner===getOwner()&&user===getState()?.user?.id}

 async function mount(container){host=container;if(!active())open(docs()[0]||null);render();if(uploadedSource&&!uploadedSource.beforeUrl)await task(async()=>{const version=analysisRevision;await loadSourcePreview();if(version===analysisRevision)await analyse(false)});else if(resume&&!result)await analyse()}

 function button(action,label,extra=''){return '<button type="button" data-opt="'+action+'" '+extra+(busy?' disabled':'')+'>'+label+'</button>'}

 function comparison(){
  if(uploadedSource)return sourceComparison();

  if(!result||!beforeResult)return '<div class="empty ats-upload-empty">Upload your resume to see the original and improved versions here.</div>';

  const baseline=beforeResult.analysis.score,after=result.analysis.score;

  return '<section class="ats-comparison" aria-label="Before and after resume comparison"><article><header><div><h2>Before</h2><p>Original imported content · '+beforeResult.pages+' page(s)</p></div><strong data-before-score>'+baseline+'<small>/100</small></strong></header><div class="ats-before-shell"><iframe sandbox="allow-same-origin" title="Before resume · original content" srcdoc="'+esc(beforeResult.html)+'"></iframe></div></article><article><header><div><h2>After</h2><p>'+result.pages+' page(s) · Added words and verified figures are highlighted green</p></div><strong data-after-score>'+after+'<small>/100</small></strong></header><div class="ats-added-legend"><p data-ats-highlight-status role="status">Checking added words…</p><div data-ats-added-terms></div></div><div class="ats-preview-shell"><iframe sandbox="allow-same-origin" title="After resume · improvements highlighted" srcdoc="'+esc(result.html)+'"></iframe></div></article></section>';

 }

 function metricPanel(){const choices=resume?guidedBulletChoices(resume):[];return !choices.length?'':'<details class="ats-verified-metrics card"><summary>Add a genuine result or metric</summary><p>Add 2x, 10% or a count only when you can verify it. Nothing is guessed or added automatically.</p><label>Existing experience or project bullet<select data-opt-metric-choice>'+choices.map((c,i)=>'<option value="'+i+'">'+esc(c.label+' · '+c.text.slice(0,100))+'</option>').join('')+'</select></label><label>Complete revised bullet with your real result<textarea data-opt-metric-text maxlength="1500" rows="3">'+esc(choices[0].text)+'</textarea></label><label class="ats-confirm-metric"><input type="checkbox" data-opt-metric-confirm> I confirm the work and every number are accurate.</label>'+button('metric','Add verified result & re-score')+'</details>'}

 function markComparison(){

  if((uploadedSource&&!sourceLayout)||!beforeResult)return;if(sourceLayout&&['profile','sections','targetRole'].every(key=>JSON.stringify(resume[key])===JSON.stringify(sourceLayout.baseResume[key])))return;const frame=host.querySelector('.ats-preview-shell iframe'),doc=frame?.contentDocument;if(!doc?.querySelector('.block'))return;

  doc.querySelectorAll('mark[data-ats-added]').forEach(mark=>mark.replaceWith(...mark.childNodes));doc.body.normalize();

  const extract=page=>{let section='';return [...page.querySelectorAll('.block')].map(element=>{const type=[...element.classList].find(c=>!['block','continued'].includes(c))||'';if(type==='heading')section=element.textContent;return {section,type,text:element.textContent,element}})};

  const before=new DOMParser().parseFromString(beforeResult.html,'text/html'),blocks=extract(doc),diff=addedSectionWordRanges(extract(before),blocks),terms=[];

  blocks.forEach(({element:block},index)=>{const ranges=diff[index];if(!ranges.length)return;terms.push(...ranges.map(r=>r.text));const walker=doc.createTreeWalker(block,4),nodes=[];let offset=0;while(walker.nextNode()){const node=walker.currentNode;nodes.push({node,start:offset,end:offset+node.textContent.length});offset+=node.textContent.length}

   for(const {node,start,end} of nodes.reverse())for(const range of [...ranges].reverse()){const left=Math.max(range.start,start)-start,right=Math.min(range.end,end)-start;if(right<=left)continue;node.splitText(right);const added=node.splitText(left),mark=doc.createElement('mark');mark.dataset.atsAdded=range.text;mark.style.cssText='background-color:#86efac!important;color:#052e16!important;-webkit-text-fill-color:#052e16!important;padding:0;border-radius:2px;box-shadow:0 1px 0 #16a34a';added.replaceWith(mark);mark.append(added)}

  });

  const status=host.querySelector('[data-ats-highlight-status]'),chips=host.querySelector('[data-ats-added-terms]'),unique=[...new Map(terms.map(t=>[t.toLowerCase(),t])).values()];

  if(status)status.textContent=terms.length?terms.length+' added words/figures highlighted in green below.':'No new words or figures were added. Layout/page-fit changes do not create keyword highlights.';

  if(chips)chips.innerHTML=unique.filter(t=>t.length>2||/\d/.test(t)).slice(0,24).map(t=>'<span>'+esc(t)+'</span>').join('');

 }

 function render(){

  if(!host?.isConnected||!active())return;

  const remaining=remainingScoreReasons(result?.analysis),scoreExplanation=result&&beforeResult&&result.analysis.score===beforeResult.analysis.score?'Score unchanged: '+(appliedChanges.some(c=>c.label.startsWith('Surface '))?'a keyword already evidenced in your resume does not earn extra points when copied into Skills. ':'no scored check changed. ')+(remaining.length?'Remaining checks: '+remaining.join(' '):'All configured local checks currently pass.') : remaining.length?'Remaining checks: '+remaining.join(' '):'';

  const compactSize=result&&resume.documentSettings.fullContentFit?new DOMParser().parseFromString(result.html,'text/html').querySelector('.paragraph,.bullet')?.style.fontSize||'':'';
  const appearance=result?'<label>Font<select data-opt-font>'+((uploadedSource&&!sourceLayout)?'<option value="" selected>Original font</option>':'')+['Calibri','Arial','Times New Roman'].map(font=>'<option value="'+font+'" '+((!uploadedSource||sourceLayout)&&actualFont(resume)===font?'selected':'')+'>'+font+'</option>').join('')+'</select></label><label>Template<select data-opt-design>'+ (uploadedSource?'<option value="original" '+(!sourceLayout?'selected':'')+'>Original layout</option>':'<option value="default" '+(!resume.documentSettings.designId?'selected':'')+'>Standard</option>')+RESUME_DESIGNS.map(design=>'<option value="'+design.id+'" '+((!uploadedSource||sourceLayout)&&resume.documentSettings.designId===design.id?'selected':'')+'>'+esc(design.name)+'</option>').join('')+'</select></label>':'';
  const actions=(result?'<section class="card ats-toolbar ats-after-actions"><label>Resume name<input data-opt-title maxlength="200" value="'+esc(title)+'"></label>'+appearance+(uploadedSource?'<label>After page length<select data-opt-pages><option value="original" '+(!sourceLayout?'selected':'')+'>Original layout · '+sourcePages(uploadedSource.pages)+'</option><option value="1" '+(sourceLayout?.pages===1?'selected':'')+'>1 page · fitted copy</option><option value="2" '+(sourceLayout?.pages===2?'selected':'')+'>2 pages · fitted copy</option></select></label><p class="ats-source-preserved">'+(sourceLayout?'Page-fit copy · '+sourcePages(result.pages):'Original formatting preserved · '+sourcePages(uploadedSource.pages))+'</p>':'<label>After page length<select data-opt-pages><option value="1" '+(Number(resume.documentSettings.resumeLength)===1?'selected':'')+'>1 page - full content</option><option value="2" '+(Number(resume.documentSettings.resumeLength)===2?'selected':'')+'>2 pages - full content</option></select></label>')+button('increase-ats','Increase ATS',resume?'':'disabled ')+button('save','Save as new version')+(selected&&!uploadedSource?button('update','Update this resume'):'')+button('pdf','Download PDF')+button('docx','Download Word',uploadedSource&&!sourceLayout&&!/\.docx$/i.test(uploadedSource.current.name)?'disabled ':'')+'<small>Original layout preserves your upload. Selecting 1 or 2 pages creates a fitted copy; spacing and layout may change, with all parsed content retained.</small>'+(compactSize?'<small data-ats-compact-fit>Full-content fit: '+esc(actualFont(resume))+' · '+esc(compactSize)+'. All source content retained; choose 2 pages for larger text.</small>':'')+'</section>':'');

  host.innerHTML='<div class="ats-workbench ats-simple"><section class="card ats-upload-start"><div><h2>Upload your resume. Improve your ATS readiness.</h2><p>Compare the original with the improved resume. Only supported facts and confirmed results are used.</p></div><div class="ats-upload-actions"><label>Upload resume · PDF / DOCX / TXT, up to 1 MB<input type="file" data-opt-file accept=".pdf,.docx,.txt" '+(busy?'disabled':'')+'></label>'+button('improve-all',busy?'Working…':'Improve ATS',resume?'':'disabled ')+'</div><p class="ats-source-name">'+esc(sourceName||'No resume uploaded.')+'</p><p class="ats-status" role="status">'+esc(message)+'</p></section>'+actions+(result&&beforeResult?'<section class="ats-comparison-summary"><strong>'+beforeResult.analysis.score+' → '+result.analysis.score+' /100</strong><span>Calculated local estimate · '+(result.analysis.score-beforeResult.analysis.score>0?'+':'')+(result.analysis.score-beforeResult.analysis.score)+' points</span><p>'+esc(result.analysis.formula)+' Scores from Claude, ChatGPT, Gemini and external checkers may differ. No external checker result is claimed.</p><p data-ats-score-reasons>'+esc(scoreExplanation)+'</p></section>':'')+comparison()+reviewPanel()+'</div>';

  observer?.disconnect();observer=new ResizeObserver(entries=>entries.forEach(({target})=>fitFrame(target)));

  function fitFrame(shell){const frame=shell.querySelector('iframe');if(!frame)return;if(frame.hasAttribute('data-source-pdf')){shell.style.height='950px';frame.style.cssText='width:100%;height:100%;transform:none;border:0';return;}const scale=Math.min(1,shell.clientWidth/850),pages=shell.classList.contains('ats-before-shell')?beforeResult?.pages:result?.pages,height=Math.max((pages||1)*1150,frame.contentDocument?.documentElement?.scrollHeight||0);shell.style.height=height*scale+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')'}

  for(const shell of host.querySelectorAll('.ats-before-shell,.ats-preview-shell')){const frame=shell.querySelector('iframe');frame.onload=()=>{if(shell.classList.contains('ats-preview-shell'))markComparison();fitFrame(shell)};observer.observe(shell);fitFrame(shell)}

  queueMicrotask(()=>{if(active()&&host?.isConnected)markComparison()});

  if(busy)host.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);

  if(!host.dataset.atsBound){host.dataset.atsBound='true';host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change)}

 }

 function markStale(){analysisRevision++;stale=true;beforeResult=null;skipped.clear();host.querySelectorAll('[data-opt="apply"],[data-opt="confirm"]').forEach(b=>b.disabled=true);const status=host.querySelector('.ats-status');if(status)status.textContent='Draft or JD changed. Analyse again before applying suggestions.'}

 function input(e){if(e.target.matches('[data-opt-jd]')){jd=e.target.value;markStale();const rev=analysisRevision;clearTimeout(analysisTimer);analysisTimer=setTimeout(async()=>{if(rev!==analysisRevision||!active()||!resume)return;try{await analyse(false);if(rev===analysisRevision){const focused=host.querySelector('[data-opt-jd]')===document.activeElement,selection=host.querySelector('[data-opt-jd]')?.selectionStart;render();if(focused){const input=host.querySelector('[data-opt-jd]');input.focus();input.setSelectionRange(selection,selection)}}}catch(error){if(active())message=error.message}},450)}if(e.target.matches('[data-opt-title]'))title=e.target.value}

 async function setOutputAppearance({font,designId}){
  if(font&&!['Calibri','Arial','Times New Roman'].includes(font))return;
  const design=designId&&RESUME_DESIGNS.find(item=>item.id===designId);if(designId&&designId!=='default'&&!design)return;
  clearTimeout(analysisTimer);const version=++analysisRevision,baseResume=clone(sourceLayout?.baseResume||resume);
  await task(async()=>{
   const next=clone(resume),pages=sourceLayout?.pages||(uploadedSource?uploadedSource.pages===2?2:1:Number(next.documentSettings.resumeLength)===2?2:1);
   next.documentSettings={...next.documentSettings,resumeLength:pages,fullContentFit:pages===1};
   if(designId==='default')delete next.documentSettings.designId;
   else next.documentSettings.designId=designId||next.documentSettings.designId||'classic-ruled';
   next.documentSettings.fontFamily=font||design?.font||actualFont(next);
   let checked=await api('/api/ats-optimizer/analyse','POST',{resume:next,jd,owner});if(!active()||version!==analysisRevision)return;
   let twoPages=false;if(!checked.fit&&pages===1){next.documentSettings.resumeLength=2;next.documentSettings.fullContentFit=false;checked=await api('/api/ats-optimizer/analyse','POST',{resume:next,jd,owner});twoPages=true}
   if(!active()||version!==analysisRevision)return;if(!checked.fit||!checked.integrity.complete)throw Error('This font and template need more space for the full content. Your current layout is unchanged.');
   if(uploadedSource)sourceLayout={baseResume,pages:Number(checked.resume.documentSettings.resumeLength)};
   resume=checked.resume;result=checked;stale=false;afterFullSource=null;afterConciseApplied=null;explicitPageTarget=Number(resume.documentSettings.resumeLength);
   message=(font?'Font updated to '+font+'.':'Template updated to '+(design?.name||'Standard')+'.')+(twoPages?' Full content uses 2 pages with your selected font.':' Preview and downloads use your selection.');
  });
 }

 async function change(e){

  if(e.target.matches('[data-opt-metric-choice]')){const choice=guidedBulletChoices(resume)[Number(e.target.value)];host.querySelector('[data-opt-metric-text]').value=choice?.text||'';host.querySelector('[data-opt-metric-confirm]').checked=false;return}

  if(e.target.matches('[data-opt-job]')){const job=jobs().find(j=>j.id===e.target.value);targetJobId=job?.id||'';targetCompany=job?.data.company||'';if(job)jd=job.data.jd||'';markStale();render();return}

  if(e.target.matches('[data-opt-pages]')&&resume){

   if(uploadedSource&&e.target.value==='original'){clearTimeout(analysisTimer);analysisRevision++;await task(async()=>{if(sourceLayout)resume=clone(sourceLayout.baseResume);sourceLayout=null;explicitPageTarget=null;afterFullSource=null;afterConciseApplied=null;await loadSourcePreview();await analyse(false);message='Original uploaded layout restored. Downloads use your original-format file.'});return}
   const pages=Number(e.target.value);if(![1,2].includes(pages))return;clearTimeout(analysisTimer);const version=++analysisRevision;

   await task(async()=>{

    const current=()=>active()&&version===analysisRevision,full=afterFullSource?mergeConciseEdits(afterFullSource,afterConciseApplied,resume):clone(resume),baseResume=clone(sourceLayout?.baseResume||resume);

    full.documentSettings={...resume.documentSettings,resumeLength:pages,fullContentFit:pages===1};if(!full.documentSettings.designId)full.documentSettings.designId='classic-ruled';if(!full.documentSettings.fontFamily)full.documentSettings.fontFamily=actualFont(full);

    let checked=await api('/api/ats-optimizer/analyse','POST',{resume:full,jd,owner}),requiredTwo=false;

    if(!current())return;

    if(pages===1&&!checked.fit&&full.documentSettings.fontFamily!=='Times New Roman'){const narrow=clone(full);narrow.documentSettings.fontFamily='Times New Roman';const fitted=await api('/api/ats-optimizer/analyse','POST',{resume:narrow,jd,owner});if(!current())return;if(fitted.fit&&fitted.integrity.complete){full.documentSettings.fontFamily='Times New Roman';checked=fitted}}
    if(pages===1&&!checked.fit){full.documentSettings.resumeLength=2;full.documentSettings.fullContentFit=false;checked=await api('/api/ats-optimizer/analyse','POST',{resume:full,jd,owner});requiredTwo=true}

    if(!current())return;if(!checked.fit||!checked.integrity.complete)throw Error('Content exceeds the selected page length. Keep the full source and select a larger layout.');

    explicitPageTarget=Number(checked.resume.documentSettings.resumeLength);if(explicitPageTarget===1){afterFullSource=clone(full);afterConciseApplied=clone(checked.resume)}else{afterFullSource=null;afterConciseApplied=null;explicitPageTarget=null}

    if(uploadedSource)sourceLayout={baseResume,pages:Number(checked.resume.documentSettings.resumeLength)};resume=checked.resume;result=checked;stale=false;message=requiredTwo?'Your full content needs 2 pages at the readable minimum. Nothing was removed or cropped.':'After preview set to '+resume.documentSettings.resumeLength+' page(s). All content preserved; nothing was shortened.';

   });return;

  }

  if(e.target.matches('[data-opt-font]')&&resume){if(e.target.value)await setOutputAppearance({font:e.target.value});return}
  if(e.target.matches('[data-opt-design]')&&resume){if(uploadedSource&&e.target.value==='original'){const pages=host.querySelector('[data-opt-pages]');pages.value='original';await change({target:pages});return}await setOutputAppearance({designId:e.target.value});return}

  if(e.target.matches('[data-opt-source]')){const doc=docs().find(d=>d.id===e.target.value);open(doc||null,{jd,jobId:targetJobId,company:targetCompany});render();if(resume)await analyse()}

  if(e.target.matches('[data-opt-file]')){const file=e.target.files[0];if(!file)return;clearTimeout(analysisTimer);const uploadRevision=++analysisRevision;clearSource();resume=null;result=null;originalResume=null;beforeResult=null;appliedChanges=[];afterFullSource=null;afterConciseApplied=null;explicitPageTarget=null;history=[];skipped.clear();selected=null;jd='';targetJobId='';targetCompany='';sourceName=file.name;stale=false;message='Reading the new resume. Previous scores have been cleared.';await task(async()=>{

   if(file.size>1000000||!/\.(pdf|docx|txt)$/i.test(file.name))throw Error('Choose PDF, DOCX or TXT up to 1 MB.');

   const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Unable to read file'));r.readAsDataURL(file)});

   const r=await api('/api/resume-workflow/import','POST',{file:{name:file.name,data}});if(!active()||uploadRevision!==analysisRevision)return;resume=recoverImportedSkills(r.resume,{restoreSource:true});selected=null;title=file.name.replace(/\.(pdf|docx|txt)$/i,'');sourceName=file.name;originalResume=null;beforeResult=null;appliedChanges=[];skipped.clear();history=[];if(/\.(pdf|docx)$/i.test(file.name)){uploadedSource={original:{name:file.name,data},current:{name:file.name,data},edits:[]};message='Preparing the original file preview without changing its formatting.';const status=host?.querySelector('.ats-status');if(status)status.textContent=message;await loadSourcePreview()}await analyse(false);

  })}

 }

 async function task(fn){if(busy)return;const generation=taskGeneration;busy=true;render();try{await fn()}catch(e){if(generation===taskGeneration&&active())message=e.message}finally{if(generation===taskGeneration){busy=false;if(active())render()}}}

 async function analyse(wrap=true){const work=async()=>{if(!resume)throw Error('Select or upload a resume first.');message='Checking structure, wording, existing facts and tracked job keywords…';const status=host?.querySelector('.ats-status');if(status)status.textContent=message;const requestedRevision=analysisRevision,requestedJD=jd;let r=await api('/api/ats-optimizer/analyse','POST',{resume:clone(resume),jd:requestedJD,owner});if(!active()||requestedRevision!==analysisRevision)return;if(!uploadedSource&&!r.fit&&explicitPageTarget===1){const full=clone(resume);full.documentSettings.resumeLength=2;full.documentSettings.fullContentFit=false;r=await api('/api/ats-optimizer/analyse','POST',{resume:full,jd:requestedJD,owner});if(!active()||requestedRevision!==analysisRevision)return;explicitPageTarget=2;}if(!uploadedSource&&!r.fit&&explicitPageTarget!==1&&r.pages===2&&Number(resume.documentSettings.resumeLength)===1){const full=clone(resume);full.documentSettings.resumeLength=2;r=await api('/api/ats-optimizer/analyse','POST',{resume:full,jd:requestedJD,owner});if(!active()||requestedRevision!==analysisRevision)return;}if(!originalResume)originalResume=clone(r.resume);if(!beforeResult){const baseline=JSON.stringify(originalResume)===JSON.stringify(r.resume)?r:await api('/api/ats-optimizer/analyse','POST',{resume:clone(originalResume),jd:requestedJD,owner});if(!active()||requestedRevision!==analysisRevision)return;beforeResult=clone(baseline)}result=r;resume=r.resume;stale=false;message='Resume checked. Click Improve ATS to review supported improvements. Missing qualifications are never invented.'};if(wrap)return task(work);return work()}

 async function click(e){const el=e.target.closest('[data-opt]');if(!el||busy)return;e.preventDefault();const action=el.dataset.opt;if(action==='analyse'){clearTimeout(analysisTimer);return analyse()}if(action==='skip'){const q=result?.questions[Number(el.dataset.index)];if(q)skipped.add(q.term);message='Keyword skipped. The calculated score is unchanged.';render();return}if(action==='show-skipped'){skipped.clear();render();return}

  if(action==='edit'){if(!resume)return;await onEdit({id:selected?.id||'',updated:selected?.updated,data:{...(selected?.data||{}),title,canonical:resume,workflow:{...(selected?.data.workflow||{}),jd,jobId:targetJobId,company:targetCompany}}});return}

  if(['apply','confirm','undo','improve-all','increase-ats','metric','source-apply','source-restore'].includes(action)){clearTimeout(analysisTimer);analysisRevision++}

  const confirmation=action==='confirm'?{confirmed:host.querySelector('[data-confirm="'+Number(el.dataset.index)+'"]').checked,details:host.querySelector('[data-evidence="'+Number(el.dataset.index)+'"]').value}:null;

  const metricDraft=action==='metric'?{index:host.querySelector('[data-opt-metric-choice]').value,text:host.querySelector('[data-opt-metric-text]').value,confirmed:host.querySelector('[data-opt-metric-confirm]').checked}:null;

  const oldBlocks=[...host.querySelectorAll('.ats-preview-shell iframe')].flatMap(f=>[...(f.contentDocument?.querySelectorAll('.block')||[])].map(b=>b.textContent));

  await task(async()=>{

   if(!resume)throw Error('Choose or upload a resume first.');

   if(action==='improve-all'||action==='increase-ats'){
    if(action==='improve-all')await loadSourcePreview();
    await analyse(false);if(!active())return;reviewing=true;
    const old=clone(resume),version=analysisRevision,source=uploadedSource,native=!!uploadedSource&&!sourceLayout&&/\.docx$/i.test(uploadedSource.current.name);
    const improvement=await applyNextAtsIncrease(result,suggestion=>api(native?'/api/ats-source/apply':'/api/ats-optimizer/apply','POST',{resume,jd,owner,expectedHash:result.hash,suggestionId:suggestion.id,...(native?{file:source.current,expectedFileHash:source.hash,expectedPages:source.pages}:{})}),{originalWord:native});
    if(!active()||version!==analysisRevision||uploadedSource!==source)return;
    if(!improvement){message='No further source-supported automatic score increase is available. Review the remaining checks below; add only genuine work details. Repeated clicks do not add artificial points.';return}
    if(!native&&!improvement.result.fit&&improvement.result.pages===2&&Number(improvement.result.resume.documentSettings.resumeLength)===1){
     const full=clone(improvement.result.resume);full.documentSettings.resumeLength=2;
     const checked=await api('/api/ats-optimizer/analyse','POST',{resume:full,jd,owner});if(!active()||version!==analysisRevision||uploadedSource!==source)return;
     if(checked.analysis.score>improvement.before){improvement.result=checked;improvement.after=checked.analysis.score}
    }
    if(!native&&(!improvement.result.fit||!improvement.result.integrity.complete)){message='This improvement needs more page space. Choose a fitted page layout before applying; your current resume is unchanged.';return}
    const {response}=improvement;
    if(native){if(source.afterUrl&&source.afterUrl!==source.beforeUrl)URL.revokeObjectURL(source.afterUrl);source.current=response.file;source.afterUrl=URL.createObjectURL(pdfBlob(response.preview.data));source.pages=response.preview.pages;source.hash=response.hash;source.edits.push(response.appliedText)}else{history.push(old);history=history.slice(-10);previousBlocks=oldBlocks;if(source&&!sourceLayout)sourceLayout={baseResume:clone(old),pages:Number(improvement.result.resume.documentSettings.resumeLength)}}
    result=improvement.result;resume=result.resume;stale=false;appliedChanges.push({label:improvement.suggestion.label,before:improvement.before,after:improvement.after});message='Applied '+improvement.suggestion.label+'. Recalculated local score: '+improvement.before+' → '+improvement.after+'. Click Increase ATS again to check the next supported improvement.';
   }
   if(action==='source-retry'){await loadSourcePreview();if(!result)await analyse(false);message=uploadedSource?.previewError?'Preview could not be fully loaded. See the error and retry option below.':'Original preview is ready.';return}
   if(action==='source-apply'){
    if(!uploadedSource||!result||stale)throw Error('Review the current uploaded Word resume first.');const suggestion=result.suggestions[Number(el.dataset.index)];if(!suggestion)throw Error('Suggestion no longer applies.');const source=uploadedSource,version=analysisRevision;const response=await api('/api/ats-source/apply','POST',{resume,jd,owner,expectedHash:result.hash,suggestionId:suggestion.id,file:uploadedSource.current,expectedFileHash:uploadedSource.hash,expectedPages:uploadedSource.pages});if(!active()||version!==analysisRevision||uploadedSource!==source)return;
    if(uploadedSource.afterUrl&&uploadedSource.afterUrl!==uploadedSource.beforeUrl)URL.revokeObjectURL(uploadedSource.afterUrl);uploadedSource.current=response.file;uploadedSource.afterUrl=URL.createObjectURL(pdfBlob(response.preview.data));uploadedSource.pages=response.preview.pages;uploadedSource.hash=response.hash;uploadedSource.edits.push(response.appliedText);result=response.result;resume=result.resume;reviewing=true;message='Applied only the wording you reviewed. Original styles, numbering and other paragraphs are preserved.';
   }
   if(action==='source-restore'){if(!uploadedSource)return;sourceLayout=null;explicitPageTarget=null;afterFullSource=null;afterConciseApplied=null;uploadedSource.current=clone(uploadedSource.original);if(uploadedSource.afterUrl!==uploadedSource.beforeUrl)URL.revokeObjectURL(uploadedSource.afterUrl);uploadedSource.afterUrl=uploadedSource.beforeUrl;uploadedSource.hash=uploadedSource.originalHash;uploadedSource.pages=uploadedSource.originalPages;uploadedSource.edits=[];resume=clone(originalResume);await analyse(false);message='Exact original upload restored.';}
   if(uploadedSource&&!sourceLayout&&(action==='pdf'||action==='docx')){await downloadSource(action);message='Download ready in original formatting.';return}
   if(uploadedSource&&(action==='save'||action==='update')){const source={original:uploadedSource.original,baseline:originalResume,edits:uploadedSource.edits};if(sourceLayout)source.layout=clone(sourceLayout);if(uploadedSource.current.data!==uploadedSource.original.data)source.current=uploadedSource.current;const saved=await api('/api/ats-source/save','POST',{resume,title,jd,owner,parentId:selected?.id||undefined,originalSource:source});if(!active())return;selected=clone(saved);await onSaved();message=sourceLayout?'Saved the selected page-fit copy with its original source retained.':'Saved a separate version with the original file and formatting preserved.';return}
   if(action==='metric'){

    const old=clone(resume),candidate=verifiedMetricEdit(resume,metricDraft.index,metricDraft.text,metricDraft.confirmed),checked=await api('/api/ats-optimizer/analyse','POST',{resume:candidate,jd,owner});if(!active())return;history.push(old);history=history.slice(-10);resume=checked.resume;result=checked;stale=false;message='Your confirmed result was added and the score recalculated. No numbers were invented.';

   }

   if(action==='apply'||action==='confirm'){

    if(!result||stale)throw Error('Analyse the current draft first.');const old=clone(resume),index=Number(el.dataset.index);previousBlocks=oldBlocks;

    let body={resume,jd,owner,expectedHash:result.hash};

    if(action==='apply'){const suggestion=result.suggestions[index];if(!suggestion)throw Error('Suggestion no longer exists');body.suggestionId=suggestion.id}

    else{const q=result.questions[index];body={...body,term:q.term,...confirmation}}

    const next=await api('/api/ats-optimizer/'+action,'POST',body);if(!active())return;history.push(old);history=history.slice(-10);result=next;resume=next.resume;stale=false;message=next.applied?'Applied and re-scored: '+next.applied.before+' → '+next.applied.after:next.confirmed.message;

   }

   if(action==='undo'){if(!history.length)return;resume=history.pop();previousBlocks=null;await analyse(false);message='Previous draft restored and re-scored.'}

   if(action==='save'||action==='update'){if(!title.trim())throw Error('Name your resume first.');const body={resume,title,jd,jobId:targetJobId,company:targetCompany,owner,parentId:selected?.id||undefined,expectedUpdated:selected?.updated};const doc=await api('/api/ats-optimizer/save','POST',{...body,updateId:action==='update'?selected.id:undefined});if(!active())return;selected=clone(doc);resume=clone(doc.data.canonical);await onSaved();await analyse(false);message=action==='update'?'Saved changes to this resume.':'Saved a separate resume version.'}

   if(action==='pdf'||action==='docx'){if(!result||stale)await analyse(false);if(!result.fit||!result.integrity.complete)throw Error('Review page fit/source coverage in the editor before export.');const r=await fetch('/api/resume-workflow/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resume,format:action,owner,parentId:selected?.id||undefined})});if(!r.ok)throw Error((await r.json()).error);const link=document.createElement('a'),url=URL.createObjectURL(await r.blob());link.href=url;link.download=(title||'resume').replace(/[^a-z0-9-]/gi,'_')+'.'+action;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message='Download ready.'}

  });
  if((action==='improve-all'||action==='increase-ats')&&reviewing)host?.querySelector('.ats-source-review')?.scrollIntoView({block:'start'});

 }

 return {open,mount,reset};

}

