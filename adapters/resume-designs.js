import {contactHtml,contactCss,contactDetails,wordContactRenderer} from './resume-contact.mjs';
import {jsPDF} from 'jspdf';
import {zipSync,strToU8} from 'fflate';
export const RESUME_DESIGNS=[
 {id:'navy-right',name:'Navy Sidebar',family:'sidebar',side:'right',color:'0B2B49',accent:'0B2B49',font:'Calibri'},
 {id:'charcoal-left',name:'Charcoal Profile',family:'sidebar',side:'left',color:'34383D',accent:'34383D',font:'Arial'},
 {id:'editorial-blue',name:'Editorial Blue',family:'editorial',side:'left',color:'F1F5F9',accent:'174EA6',font:'Arial',summarySide:true},
 {id:'teal-left',name:'Teal Portfolio',family:'sidebar',side:'left',color:'115E59',accent:'115E59',font:'Calibri'},
 {id:'violet-right',name:'Violet Studio',family:'sidebar',side:'right',color:'4C1D95',accent:'6D28D9',font:'Arial'},
 {id:'sand-right',name:'Warm Editorial',family:'editorial',side:'right',color:'F4EDE3',accent:'7C4A2D',font:'Times New Roman',summarySide:true},
 {id:'slate-left',name:'Slate Professional',family:'sidebar',side:'left',color:'1E3A5F',accent:'1E3A5F',font:'Calibri'},
 {id:'sage-left',name:'Sage Minimal',family:'editorial',side:'left',color:'E8F0EA',accent:'35624A',font:'Arial'},
 {id:'executive-serif',name:'Executive Serif',family:'single',accent:'26344A',font:'Times New Roman',rule:true},
 {id:'modern-blue',name:'Modern Blue',family:'single',accent:'2563EB',font:'Calibri',topbar:true},
 {id:'classic-ruled',name:'Classic Ruled',family:'single',accent:'111827',font:'Times New Roman',rule:true,center:true},
 {id:'minimal-teal',name:'Minimal Teal',family:'single',accent:'0F766E',font:'Arial',topbar:true}
];
export const resumeDesign=value=>RESUME_DESIGNS.find(d=>d.id===value?.documentSettings?.designId)||null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const href=x=>/^(?:https?:|mailto:|tel:)/i.test(x||'')?x:'';
function splitSource(resume,base,design){
 const all=base.pages.flat().filter(b=>b.type!=='spacer'),header=[],main=[],side=[];let destination=main,sectionType='',educationMeta='';
 for(const original of all){const b={...original};
  if(b.type==='name'){header.push(b);continue}
  if(b.type==='contact'){
   const parts=b.parts||[{label:b.text}];if(design.family==='single'){header.push({...b,text:parts.map(p=>p.url&&/^https?:/i.test(p.url)?p.url:p.label).join(' | '),parts:parts.map(p=>({...p,label:p.url&&/^https?:/i.test(p.url)?p.url:p.label}))})}
   else{side.push({type:'heading',text:'CONTACT'});for(const p of parts){const part={...p,label:p.url&&/^https?:/i.test(p.url)?p.url:p.label};side.push({type:'paragraph',text:part.label,url:part.url,contactPart:part})}}continue;
  }
  if(b.type==='heading'){
   const section=resume.sections.find(s=>s.title?.toUpperCase()===b.text.toUpperCase()),type=section?.type||'';
   sectionType=type;educationMeta='';
   const inSide=design.family!=='single'&&(['skills'].includes(type)||/languages/i.test(b.text)||(design.family==='sidebar'&&['education','certifications'].includes(type))||(design.family==='sidebar'&&/certif|licen[cs]/i.test(b.text))||(design.summarySide&&type==='summary')||(design.family==='editorial'&&/interests|achievements/i.test(b.text)));
   destination=inSide?side:main;
  }
  if((sectionType==='education'||(sectionType==='experience'&&design.family==='single'))&&b.type==='entry-title'){
   const [degree,...dates]=b.text.split(' || ');educationMeta=sectionType==='education'||(b.metaLine||'').length<=95?b.metaLine||'':'';
   b.text=[degree,educationMeta].filter(Boolean).join(' | ');b.educationRow=sectionType==='education';b.entryRow=sectionType==='experience';b.dateText=dates.join(' || ');
  }else if(['education','experience'].includes(sectionType)&&b.type==='entry-meta'&&educationMeta&&b.text===educationMeta){educationMeta='';continue}
  if(sectionType==='skills'&&b.type==='entry-title'){const colon=b.text.indexOf(':');b.type='paragraph';if(colon>0){b.skillLabel=b.text.slice(0,colon+1);b.skillValue=b.text.slice(colon+1).trim()}}
  if(sectionType==='projects'&&b.type==='entry-meta'){const match=b.text.match(/^((?:technologies|technology|tech\s*stack|tools(?:\s*(?:and|&)\s*technologies)?)\s*:)(.*)$/i);if(match){b.skillLabel=match[1];b.skillValue=match[2].trim()}}
  destination.push(b);
 }
 if(resume.targetRole?.trim())header.push({type:'headline',text:'Target role: '+resume.targetRole.trim()});
 return {main:[...header,...main],side};
}
const isFlowText=block=>['paragraph','bullet','entry-meta'].includes(block.type)&&!block.contactPart;
const flowingText=block=>isFlowText(block)?String(block.text||'').replace(/\s*\r?\n\s*/g,' '):block.text;
function measure(source,width,cfg,font){
 const doc=new jsPDF({unit:'pt'});let beforeHeading=false;
 return source.map(b=>{
  const size=b.type==='name'?(cfg.nameSize||24):b.type==='heading'?(cfg.headingSize||Math.max(11,cfg.body)):b.type==='headline'?(cfg.headlineSize||10.5):cfg.body,bold=['name','heading','entry-title'].includes(b.type);
  doc.setFont(font==='Times New Roman'?'times':'helvetica',bold?'bold':'normal');doc.setFontSize(size);
  let text=flowingText(b);if(b.type==='entry-title'&&!(b.educationRow||b.entryRow))text=b.text.replace(' || ','\n');
  const dateSize=9.5,dateWidth=(b.educationRow||b.entryRow)&&b.dateText?doc.getTextWidth(b.dateText)*dateSize/size+10:0,inlineDate=!!dateWidth&&width-dateWidth>=170;
  const lines=doc.splitTextToSize(text||'',width-(b.type==='bullet'?10:0)-(b.contactPart?cfg.body+4:0)-(b.type==='contact'?(b.parts?.length||0)*(cfg.body+4):0)-(inlineDate?dateWidth:0)),before=b.type==='heading'?(cfg.headingGap||10):0,gap=b.type==='headline'?12:cfg.structured&&b.type==='entry-title'?2:cfg.structured&&b.type==='entry-meta'?4:b.type==='bullet'?(cfg.bulletGap||3):(cfg.gap||5),lineHeight=cfg.lineHeight||1.18;
  return {...b,text,lines,size,before,gap,lineHeight,inlineDate,dateSize,dateWidth,availableWidth:width,height:Math.max(1,lines.length)*size*lineHeight+(dateWidth&&!inlineDate?dateSize*lineHeight:0)+before+gap+(b.type==='heading'?3:0)};
 });
}
function paginate(blocks,capacity){
 const pages=[[]];let used=0;
 for(let i=0;i<blocks.length;i++){
  const b=blocks[i],next=blocks[i+1],keep=['heading','entry-title'].includes(b.type)&&next?Math.min(next.height,next.size*2*1.18+next.gap):0;
  if(used+b.height+keep>capacity&&pages.at(-1).length){pages.push([]);used=0}
  if(b.height>capacity){let offset=0;while(offset<b.lines.length){let room=Math.floor((capacity-used-b.before-b.gap)/(b.size*1.18));if(room<1){pages.push([]);used=0;room=Math.floor((capacity-b.before-b.gap)/(b.size*1.18))}const lines=b.lines.slice(offset,offset+room),part={...b,text:lines.join(' '),lines,continuation:offset>0,height:lines.length*b.size*1.18+b.before+b.gap};pages.at(-1).push(part);used+=part.height;offset+=lines.length;if(offset<b.lines.length){pages.push([]);used=0}}}
  else{pages.at(-1).push(b);used+=b.height}
 }
 return pages;
}
function balance(pages,capacity){if(pages.length!==1||pages[0].length<4)return pages;const blocks=pages[0],total=blocks.reduce((n,b)=>n+b.height,0);let used=0,best=null;for(let i=1;i<blocks.length;i++){used+=blocks[i-1].height;if(['heading','entry-title','name'].includes(blocks[i-1].type)||['headline','contact'].includes(blocks[i].type))continue;const cost=Math.abs(used-(total-used));if(used<=capacity&&total-used<=capacity&&(!best||cost<best.cost))best={i,cost}}return best?[blocks.slice(0,best.i),blocks.slice(best.i)]:pages}
function balanceSparseMain(blocks,width,capacity,font){
 const height=list=>list.reduce((sum,b)=>sum+b.height,0);
 if(height(blocks)>=capacity*.82)return blocks;
 let best=blocks;
 // Grow only the underfilled main column. Keep the dense sidebar, facts and
 // page count unchanged; cap fonts and gaps to avoid oversized filler spacing.
 for(let level=1;level<=8;level++){
  const candidate=measure(blocks,width,{body:Math.min(11.5,10.5+level*.25),lineHeight:Math.min(1.26,1.18+level*.01),gap:Math.min(6,5+level*.25),bulletGap:Math.min(4.5,3+level*.25),headingGap:Math.min(14,10+level*.5),structured:true},font);
  if(height(candidate)>capacity*.96)break;
  best=candidate;
 }
 return best;
}
function balanceSparseSidebar(blocks,width,capacity,font){
 const height=list=>list.reduce((sum,b)=>sum+b.height,0);
 if(blocks.length<5||height(blocks)>=capacity*.9)return blocks;
 const body=blocks.find(b=>b.type!=='heading')?.size||10.5;let best=blocks;
 for(let level=1;level<=8;level++){
  const candidate=measure(blocks,width,{body:Math.min(12,body+level*.2),headingSize:Math.min(12.5,11+level*.2),lineHeight:Math.min(1.3,1.18+level*.015),gap:Math.min(7,5+level*.25),bulletGap:Math.min(5,3+level*.25),headingGap:Math.min(15,10+level*.6)},font);
  if(height(candidate)>capacity*.95)break;best=candidate;
 }
 best=best.map(block=>({...block}));let spare=Math.max(0,capacity*.95-height(best));
 const slots=best.slice(0,-1).map(block=>({block,room:block.type==='heading'?3:block.contactPart?7:14}));
 while(spare>.1){const available=slots.filter(slot=>slot.room>.1);if(!available.length)break;const share=spare/available.length;let added=0;for(const slot of available){const extra=Math.min(share,slot.room);slot.block.gap+=extra;slot.block.height+=extra;slot.room-=extra;added+=extra}spare-=added;if(added<.1)break}
 return best.map(block=>({...block,sidebarBalanced:true}));
}
export function buildDesignedModel(resume,base,design){
 const fullFit=resume.documentSettings.fullContentFit===true&&Number(resume.documentSettings.resumeLength)===1,letter=base.pageSize==='US Letter',pageWidth=letter?612:595.28,pageHeight=letter?792:841.89,margin=fullFit?18:30,gap=fullFit?14:18,pad=fullFit?4:14,inner=pageWidth-margin*2;
 const target=Number(resume.documentSettings.resumeLength)===2?2:1,font=['Arial','Calibri','Times New Roman'].includes(resume.documentSettings.fontFamily)?resume.documentSettings.fontFamily:design.font,sideWidth=design.family==='single'?0:inner*.31,mainWidth=design.family==='single'?inner:inner-sideWidth-gap;
 const source=splitSource(resume,base,design),capacity=pageHeight-margin*2-(fullFit?8:36);
 let selected;
 const configurations=fullFit?[{body:10.5},{body:10},{body:10,lineHeight:1.12,gap:2,bulletGap:1.4,headingGap:6},{body:9.5,lineHeight:1.1,gap:1.5,bulletGap:1,headingGap:5},{body:9.5,lineHeight:1.05,gap:.7,bulletGap:.4,headingGap:3,reflow:true},{body:9,lineHeight:1.08,gap:.6,bulletGap:.3,headingGap:2.5,headingSize:10,nameSize:20,headlineSize:9,reflow:true},{body:8.5,lineHeight:1.08,gap:.5,bulletGap:.3,headingGap:2,headingSize:10,nameSize:20,headlineSize:8.5,reflow:true},{body:8.5,lineHeight:1,gap:.3,bulletGap:.15,headingGap:1.5,headingSize:9.5,nameSize:18,headlineSize:8.5,reflow:true}]:[{body:10.5},{body:10},...(target===2?[{body:10,lineHeight:1.12,gap:3,bulletGap:2,headingGap:6},{body:9.5,lineHeight:1.12,gap:2,bulletGap:1.4,headingGap:5}]:[])];
 for(const cfg of configurations){const {body}=cfg;
  const main=measure(source.main,mainWidth-pad*2,cfg,font),side=measure(source.side,sideWidth-pad*2,cfg,font);let mains=paginate(main,capacity-pad*2),sides=side.length?paginate(side,capacity-pad*2):[[]];
  if(target===2&&mains.length===1&&sides.length<=2)mains=balance(mains,capacity-pad*2);
  const count=Math.max(mains.length,sides.length),pages=Array.from({length:count},(_,i)=>[...(mains[i]||[]),...(sides[i]||[])]);
  selected={mainPages:mains,sidePages:sides,pages,pageCount:count,fit:count===target,body};if(selected.fit)break;
 }
 if(selected.fit&&target===1&&design.family!=='single'){
  selected.mainPages=selected.mainPages.map(blocks=>balanceSparseMain(blocks,mainWidth-pad*2,capacity-pad*2,font));
  selected.sidePages=selected.sidePages.map(blocks=>balanceSparseSidebar(blocks,sideWidth-pad*2,capacity-pad*2,font));
  selected.pages=selected.pages.map((_,i)=>[...(selected.mainPages[i]||[]),...(selected.sidePages[i]||[])]);
 }
 return {...base,...selected,design,template:design.id,pageWidth,pageHeight,margin,gap,pad,mainWidth,sideWidth,font,allowedPages:target,targetPages:target,status:selected.fit?'fit':'overflow',typography:{...base.typography,bodySize:selected.body,lineHeight:1.18,marginMm:margin*25.4/72},explanation:selected.fit?'Exactly '+target+' page'+(target===1?'':'s')+' · '+design.name+' · '+selected.body+' pt':design.name+' needs '+selected.pageCount+' pages. Choose two pages or shorten the draft; no content was removed.'};
}
function blockHtml(b){const text=b.type==='entry-title'?esc(b.text).replace(/\n/g,'<br>'):esc(flowingText(b)),value=b.contactPart?contactHtml(b.contactPart):b.type==='contact'&&b.parts?.length?b.parts.map(contactHtml).join(' | '):(b.educationRow||b.entryRow)?'<span style="min-width:0;flex:1">'+text+'</span>'+(b.dateText?'<span class="education-date" style="font-size:'+b.dateSize+'pt;font-weight:normal;white-space:nowrap">'+esc(b.dateText)+'</span>':''):b.skillLabel?'<strong>'+esc(b.skillLabel)+'</strong> '+esc(String(b.skillValue||'').replace(/\s*\r?\n\s*/g,' ')):b.url&&href(b.url)?'<a href="'+esc(href(b.url))+'">'+text+'</a>':text;return '<div class="block '+b.type+(b.contactPart?' contact-row':'')+(b.educationRow?' education-row':b.entryRow?' entry-row':b.skillLabel?' skill-group':'')+(b.continuation?' continued':'')+'" style="'+((b.educationRow||b.entryRow)?'display:flex;gap:10pt;'+(!b.inlineDate?'flex-direction:column;gap:0;':''):'')+'font-size:'+b.size+'pt;line-height:'+b.lineHeight+';margin-top:'+b.before+'pt;margin-bottom:'+b.gap+'pt">'+value+'</div>'}
export function buildDesignedHtml(model){
 const d=model.design,dark=d.family==='sidebar',sideText=dark?'FFFFFF':'1F2937',sideHeading=dark?'FFFFFF':d.accent,letter=model.pageSize==='US Letter';
 const css='@page{size:'+(letter?'letter':'A4')+';margin:0}*{box-sizing:border-box}body{margin:0;background:#eef1f5;font-family:"'+model.font+'",'+(model.font==='Times New Roman'?'serif':'sans-serif')+';color:#111827}.resume-page{width:'+model.pageWidth+'pt;min-height:'+model.pageHeight+'pt;padding:'+model.margin+'pt;margin:12px auto;background:white;break-after:page}.resume-page:last-child{break-after:auto}.design-columns{display:grid;grid-template-columns:'+(d.family==='single'?'1fr':d.side==='left'?model.sideWidth+'pt '+model.mainWidth+'pt':model.mainWidth+'pt '+model.sideWidth+'pt')+';gap:'+model.gap+'pt;min-height:'+(model.pageHeight-model.margin*2-20)+'pt}.design-main,.design-side{padding:'+model.pad+'pt;min-width:0}.design-main{'+(d.family==='single'&&d.topbar?'border-top:7pt solid #'+d.accent+';':'')+'}.design-side.sidebar-balanced{display:flex;flex-direction:column;justify-content:space-between}.design-side.sidebar-balanced>.block{flex-shrink:0}.design-side{background:#'+d.color+';color:#'+sideText+'}.block{line-height:1.18;white-space:pre-line;overflow-wrap:anywhere}.name{font-weight:bold;color:#'+d.accent+';'+(d.center?'text-align:center;':'')+'}.headline{color:#'+d.accent+';margin-bottom:12pt!important}.contact{'+(d.center?'text-align:center;':'')+'}.heading{font-weight:bold;text-transform:uppercase;letter-spacing:.4pt;color:#'+d.accent+';border-bottom:1pt solid #'+(d.rule?d.accent:'CBD5E1')+';padding-bottom:3pt}.entry-title{font-weight:bold}.entry-meta{color:#475569}.paragraph,.bullet,.entry-meta{white-space:normal;text-align:justify;text-align-last:left;text-justify:inter-word;hyphens:none}.skill-group{text-align:justify;text-align-last:left}.entry-meta.skill-group{color:inherit}.bullet{padding-left:10pt;position:relative}.bullet:before{content:"•";position:absolute;left:0}.bullet.continued:before{content:""}a{color:inherit;text-decoration:none}.design-side .heading{color:#'+sideHeading+';border-color:#'+(dark?'CBD5E1':d.accent)+'}.design-side .entry-meta{color:inherit}.design-side .block{color:inherit;word-spacing:normal;letter-spacing:normal}.design-side .paragraph:not(.contact-row),.design-side .bullet{text-align:justify;text-align-last:left;text-justify:inter-word;hyphens:auto;overflow-wrap:break-word}@media print{body{background:white}.resume-page{margin:0}}';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Resume</title><style>'+css+contactCss+'</style></head><body>'+model.pages.map((_,i)=>{const main='<main class="design-main">'+(model.mainPages[i]||[]).map(blockHtml).join('')+'</main>',side=d.family==='single'?'':'<aside class="design-side'+((model.sidePages[i]||[]).some(block=>block.sidebarBalanced)?' sidebar-balanced':'')+'">'+(model.sidePages[i]||[]).map(blockHtml).join('')+'</aside>';return '<article class="resume-page" data-design="'+d.id+'"><div class="design-columns">'+(d.side==='left'?side+main:main+side)+'</div></article>'}).join('')+'</body></html>';
}
export function buildDesignedDocx(model){
 const d=model.design,files={},relationships=[];let rid=0;
 const run=(text,size,bold,color)=>'<w:r><w:rPr><w:rFonts w:ascii="'+model.font+'" w:hAnsi="'+model.font+'"/><w:sz w:val="'+Math.round(size*2)+'"/><w:color w:val="'+color+'"/>'+(bold?'<w:b/>':'')+'</w:rPr>'+String(text).split('\n').map((t,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(t)+'</w:t>').join('')+'</w:r>';
 const renderContact=wordContactRenderer({files,relationships,run:(text,size,color)=>run(text,size,false,color)});
 const blocks=(list,side)=>list.map(b=>{const dark=side&&d.family==='sidebar',color=dark?'FFFFFF':['name','heading','headline'].includes(b.type)?d.accent:'111827',bold=['name','heading','entry-title'].includes(b.type);let inline=run((b.type==='bullet'&&!b.continuation?'• ':'')+flowingText(b),b.size,bold,color);if(b.url&&href(b.url)&&!b.contactPart&&b.type!=='contact'){const id='rId'+(++rid);relationships.push('<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="'+esc(href(b.url))+'" TargetMode="External"/>');inline='<w:hyperlink r:id="'+id+'">'+inline+'</w:hyperlink>'}
  if(b.contactPart)inline=renderContact(b.contactPart,b.size,color);else if(b.type==='contact'&&b.parts?.length)inline=b.parts.map((part,i)=>(i?run(' | ',b.size,false,color):'')+renderContact(part,b.size,color)).join('');
  if(b.skillLabel)inline=run(b.skillLabel+' ',b.size,true,color)+run(String(b.skillValue||'').replace(/\s*\r?\n\s*/g,' '),b.size,false,color);
  if((b.educationRow||b.entryRow)&&b.dateText)inline+=b.inlineDate?'<w:r><w:tab/></w:r>'+run(b.dateText,b.dateSize,false,color):run('\n'+b.dateText,b.dateSize,false,color);
  const prop=((b.educationRow||b.entryRow)&&b.inlineDate?'<w:tabs><w:tab w:val="right" w:pos="'+Math.round(b.availableWidth*20)+'"/></w:tabs>':'')+'<w:spacing w:before="'+Math.round(b.before*20)+'" w:after="'+Math.round(b.gap*20)+'" w:line="'+Math.round(b.size*b.lineHeight*20)+'" w:lineRule="exact"/>'+(['heading','entry-title'].includes(b.type)?'<w:keepNext/>':'')+(['paragraph','bullet','entry-meta'].includes(b.type)?'<w:jc w:val="'+(b.contactPart?'left':'both')+'"/>':'')+(b.type==='name'&&d.center?'<w:jc w:val="center"/>':'')+(b.type==='heading'?'<w:pBdr><w:bottom w:val="single" w:sz="6" w:color="'+(dark?'CBD5E1':d.accent)+'"/></w:pBdr>':'');return '<w:p><w:pPr>'+prop+'</w:pPr>'+inline+'</w:p>'}).join('');
 const cell=(list,side,width)=>'<w:tc><w:tcPr><w:tcW w:w="'+Math.round(width*20)+'" w:type="dxa"/><w:shd w:fill="'+(side?d.color:'FFFFFF')+'"/><w:tcMar><w:top w:w="'+model.pad*20+'" w:type="dxa"/><w:left w:w="'+model.pad*20+'" w:type="dxa"/><w:bottom w:w="'+model.pad*20+'" w:type="dxa"/><w:right w:w="'+model.pad*20+'" w:type="dxa"/></w:tcMar></w:tcPr>'+blocks(list,side)+(list.length?'':'<w:p/>')+'</w:tc>';
 const body=model.pages.map((_,i)=>{
  const br=i?'<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>':'';
  if(d.family==='single')return br+(d.topbar?'<w:p><w:pPr><w:spacing w:before="0" w:after="50"/><w:pBdr><w:top w:val="single" w:sz="36" w:color="'+d.accent+'"/></w:pBdr></w:pPr></w:p>':'')+blocks(model.mainPages[i]||[],false);
  const main=cell(model.mainPages[i]||[],false,model.mainWidth),side=cell(model.sidePages[i]||[],true,model.sideWidth),gap='<w:tc><w:tcPr><w:tcW w:w="'+model.gap*20+'" w:type="dxa"/></w:tcPr><w:p/></w:tc>',width=model.pageWidth-model.margin*2;
  return br+'<w:tbl><w:tblPr><w:tblW w:w="'+Math.round(width*20)+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid>'+[d.side==='left'?model.sideWidth:model.mainWidth,model.gap,d.side==='left'?model.mainWidth:model.sideWidth].map(w=>'<w:gridCol w:w="'+Math.round(w*20)+'"/>').join('')+'</w:tblGrid><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="'+Math.round((model.pageHeight-model.margin*2-20-model.pad*2)*20)+'" w:hRule="atLeast"/></w:trPr>'+(d.side==='left'?side+gap+main:main+gap+side)+'</w:tr></w:tbl><w:p><w:pPr><w:spacing w:after="0" w:before="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
 }).join('');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main',rels='http://schemas.openxmlformats.org/package/2006/relationships';files['word/styles.xml']='<w:styles xmlns:w="'+ns+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+model.font+'" w:hAnsi="'+model.font+'"/><w:sz w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>';
 files['[Content_Types].xml']='<Types xmlns="http://schemas.openxmlformats-package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="svg" ContentType="image/svg+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'.replace('openxmlformats-package','openxmlformats.org/package');
 files['_rels/.rels']='<Relationships xmlns="'+rels+'"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 files['word/document.xml']='<w:document xmlns:w="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'<w:sectPr><w:pgSz w:w="'+Math.round(model.pageWidth*20)+'" w:h="'+Math.round(model.pageHeight*20)+'"/><w:pgMar w:top="'+model.margin*20+'" w:bottom="'+model.margin*20+'" w:left="'+model.margin*20+'" w:right="'+model.margin*20+'"/></w:sectPr></w:body></w:document>';
 files['word/_rels/document.xml.rels']='<Relationships xmlns="'+rels+'"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+relationships.join('')+'</Relationships>';
 return new Blob([zipSync(Object.fromEntries(Object.entries(files).map(([name,text])=>[name,typeof text==='string'?strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text):text])))],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
