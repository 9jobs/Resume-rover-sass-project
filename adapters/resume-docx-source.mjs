import {normalizeSourceListMarkers} from '../public/source-list-markers.js';
import mammoth from 'mammoth';
import {DOMParser} from '@xmldom/xmldom';

export function docxHtmlToSource(html){
 const failures=[];
 const doc=new DOMParser({errorHandler:{warning:()=>{},error:message=>failures.push(message),fatalError:message=>failures.push(message)}}).parseFromString('<resume-source>'+html.replace(/&nbsp;/g,'&#160;')+'</resume-source>','text/xml');
 if(failures.length)throw Object.assign(Error('Unable to preserve this Word document structure. Try the original PDF.'),{status:422});
 const lines=[],tag=node=>String(node.localName||node.nodeName||'').toLowerCase(),children=node=>Array.from({length:node.childNodes?.length||0},(_,i)=>node.childNodes.item(i));
 const inline=node=>node.nodeType===3?node.data:['ul','ol'].includes(tag(node))?'':tag(node)==='br'?' ':children(node).map(inline).join('');
 const clean=text=>text.replace(/\s+/g,' ').trim();
 function walk(node){
  const name=tag(node);
  if(name==='li'){const text=clean(inline(node));if(text)lines.push('- '+text);for(const child of children(node))if(['ul','ol'].includes(tag(child)))walk(child);return}
  if(/^(?:p|h[1-6])$/.test(name)){const text=clean(inline(node));if(text)lines.push(text);return}
  for(const child of children(node))walk(child);
 }
 walk(doc.documentElement);return lines.join('\n');
}

export async function importResumeWithSourceLists(workflow,input){
 // Existing import performs file-size/type/content validation first. Keep its
 // parser and business logic intact; feed it a list-preserving source extract.
 const validated=await workflow.importResume(input);
 if(/\.pdf$/i.test(input.file?.name||'')){const source=normalizeSourceListMarkers(validated.source);return source!==validated.source?workflow.importResume({rawText:source}):validated}
 if(!/\.docx$/i.test(input.file?.name||''))return validated;
 const html=await mammoth.convertToHtml({buffer:Buffer.from(input.file.data,'base64')}),rawText=docxHtmlToSource(html.value);
 if(!rawText.trim())return validated;
 return workflow.importResume({rawText});
}
