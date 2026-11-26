import {buildDocxFromCanonical as originalDocx,buildResumeHtmlDocument as originalHtml,RESUME_FONT_STACK} from '../engine/lib/ai-resume.js';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';

export const ROVER_FONTS=['Arial','Calibri','Times New Roman'];
export const roverFontStack=resume=>ROVER_FONTS.includes(resume?.documentSettings?.fontFamily)?`"${resume.documentSettings.fontFamily}", ${resume.documentSettings.fontFamily==='Times New Roman'?'serif':'sans-serif'}`:RESUME_FONT_STACK;
export function buildResumeHtmlDocument(resume){
 const html=originalHtml(resume);
 if(!ROVER_FONTS.includes(resume?.documentSettings?.fontFamily))return html;
 return html.replace('</head>',`<style>.resume-page,.resume-page *{font-family:${roverFontStack(resume)}!important}</style></head>`);
}
export async function buildDocxFromCanonical(resume){
 const original=originalDocx(resume);
 if(!ROVER_FONTS.includes(resume?.documentSettings?.fontFamily))return original;
 const files=unzipSync(new Uint8Array(await original.arrayBuffer()));
 for(const name of Object.keys(files))if(name.startsWith('word/')&&name.endsWith('.xml')){
  const xml=strFromU8(files[name]).replace(/<w:rFonts\b[^>]*\/?\s*>/g,tag=>tag.replace(/\bw:(ascii|hAnsi|cs|eastAsia)="[^"]*"/g,(_,attr)=>`w:${attr}="${resume.documentSettings.fontFamily}"`));
  files[name]=strToU8(xml);
 }
 return new Blob([zipSync(files)],{type:original.type});
}
