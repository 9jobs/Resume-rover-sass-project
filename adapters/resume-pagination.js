import {jsPDF} from 'jspdf';
const ptPerMm=72/25.4;
const presets={
 spacious:{bodySize:11,nameSize:22,headingSize:11.5,lineHeight:1.25,marginMm:17,bulletGap:4,paragraphGap:6,sectionGap:11},
 default:{bodySize:11,nameSize:22,headingSize:11.5,lineHeight:1.2,marginMm:16,bulletGap:3,paragraphGap:5,sectionGap:9},
 compact:{bodySize:10.5,nameSize:21,headingSize:11,lineHeight:1.15,marginMm:14,bulletGap:2,paragraphGap:4,sectionGap:7},
 tighter:{bodySize:10,nameSize:20,headingSize:10.5,lineHeight:1.12,marginMm:12.7,bulletGap:1.5,paragraphGap:3,sectionGap:5}
};
function paginate(items,capacity){
 const pages=[[]];let used=0;
 for(let index=0;index<items.length;index++){
  const item=items[index],next=items[index+1],lineHeight=item.size*item.lineHeight;
  const reserve=['heading','entry-title'].includes(item.type)&&next?Math.min(next.height,next.size*next.lineHeight*2+next.gap):0;
  if(used+item.height+reserve>capacity&&pages.at(-1).length){pages.push([]);used=0}
  if(item.height>capacity&&['paragraph','bullet'].includes(item.type)){
   let offset=0;
   while(offset<item.lines.length){
    let room=Math.floor((capacity-used-item.gap)/lineHeight);
    if(room<1){pages.push([]);used=0;room=Math.floor((capacity-item.gap)/lineHeight)}
    const part=item.lines.slice(offset,offset+room),last=offset+part.length>=item.lines.length;
    const fragment={...item,text:part.join(' '),lines:part,continuation:offset>0,gap:last?item.gap:0,height:part.length*lineHeight+(last?item.gap:0)};
    pages.at(-1).push(fragment);used+=fragment.height;offset+=part.length;
    if(!last){pages.push([]);used=0}
   }
  }else{pages.at(-1).push(item);used+=item.height}
 }
 return pages;
}
function balanceTwo(pages,capacity){
 const all=pages.flat();let best=null;const total=all.reduce((n,b)=>n+b.height,0);let left=0;
 for(let i=1;i<all.length;i++){
  left+=all[i-1].height;const right=total-left,prev=all[i-1],next=all[i];
  if(left>capacity||right>capacity||['heading','entry-title'].includes(prev.type)||['name','contact'].includes(next.type))continue;
  if(!all.slice(0,i).some(b=>!['name','contact','heading'].includes(b.type))||!all.slice(i).some(b=>!['name','contact','heading'].includes(b.type)))continue;
  const cost=Math.abs(left-right)+(next.type==='heading'?0:38);
  if(!best||cost<best.cost)best={i,cost};
 }
 return best?[all.slice(0,best.i),all.slice(best.i)]:null;
}
export function fitResumePages(resume,base,font,cleanBullet){
 const target=Number(resume.documentSettings.resumeLength)===2?2:1;
 const requested=Object.hasOwn(presets,resume.documentSettings.typographyPreset)?resume.documentSettings.typographyPreset:'default';
 const levels=Object.keys(presets),candidates=levels.slice(levels.indexOf(requested));
 const doc=new jsPDF({unit:'pt',format:base.pageSize==='US Letter'?'letter':'a4'});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
 const source=base.pages.flat().filter(b=>b.type!=='spacer').map(b=>({...b,text:b.type==='bullet'?cleanBullet(b.text):b.text}));
 let chosen;
 for(const name of candidates){
  const cfg={...base.typography,...presets[name]},margin=cfg.marginMm*ptPerMm,usable=height-2*margin,capacity=usable-14;
  const blocks=source.filter((b,i)=>!(b.type==='entry-meta'&&source[i-1]?.metaLine===b.text)).map(original=>{
   const b={...original},bold=['name','heading','entry-title'].includes(b.type),size=b.type==='name'?cfg.nameSize:b.type==='heading'?cfg.headingSize:cfg.bodySize;
   doc.setFont(font==='Times New Roman'?'times':'helvetica',bold?'bold':'normal');doc.setFontSize(size);
   let label=b.type==='contact'&&b.parts?.length?b.parts.map(p=>p.label).join(' | '):b.type==='entry-title'?[b.text.split(' || ')[0],b.metaLine].filter(Boolean).join(' | '):b.text;
   let available=width-2*margin-(b.type==='bullet'?12:0)-(b.type==='contact'?(b.parts?.length||0)*(size+4):0);
   if(b.type==='entry-title'){const date=b.text.split(' || ')[1]||'';doc.setFontSize(9.5);available-=date?doc.getTextWidth(date)+12:0;doc.setFontSize(size)}
   b.lines=doc.splitTextToSize(label||'',Math.max(80,available));b.size=size;b.lineHeight=cfg.lineHeight;b.before=0;
   b.gap=b.type==='heading'?4:b.type==='name'?4:b.type==='bullet'?cfg.bulletGap:cfg.paragraphGap;
   b.height=Math.max(1,b.lines.length)*size*cfg.lineHeight+b.gap+(b.type==='heading'?3:0);return b;
  });
  blocks.forEach((b,i)=>{if(b.type==='heading'&&i){blocks[i-1].gap+=cfg.sectionGap;blocks[i-1].height+=cfg.sectionGap}});
  let pages=paginate(blocks,capacity);
  if(target===2&&pages.length<=2){const balanced=balanceTwo(pages,capacity);if(balanced)pages=balanced}
  const oversized=pages.some(p=>p.reduce((n,b)=>n+b.height,0)>capacity+.5);
  const exact=pages.length===target&&!oversized;
  chosen={pages,pageCount:pages.length,typography:cfg,usable,capacity,fit:exact,appliedPreset:name,targetPages:target,adjusted:name!==requested};
  if(exact)break;
 }
 if(target===1&&chosen.fit){const page=chosen.pages[0],natural=page.reduce((n,b)=>n+b.height,0)-(page.at(-1)?.gap||0);if(natural>chosen.usable*.45&&natural<chosen.usable*.93&&page.length>1){const extra=Math.min(14,(chosen.usable*.93-natural)/(page.length-1));page.slice(0,-1).forEach(b=>{b.gap+=extra;b.height+=extra})}}
 const reason=chosen.fit?'fit':chosen.pageCount<target?'insufficient-content':'overflow';
 const explanation=chosen.fit?'Exactly '+target+' page'+(target===1?'':'s')+' · '+chosen.typography.bodySize+' pt · '+chosen.appliedPreset+(chosen.adjusted?' (auto-fit)':''):reason==='insufficient-content'?'Not enough separate content for two meaningful pages. Add content or choose one page.':'Content needs '+chosen.pageCount+' pages at the readable minimum. Choose more space or shorten it; no content was removed.';
 return {...base,...chosen,template:'default',allowedPages:target,status:reason,explanation,utilization:chosen.pages.at(-1).reduce((n,b)=>n+b.height,0)/chosen.usable};
}
