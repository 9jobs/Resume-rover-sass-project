import fs from 'node:fs';
import path from 'node:path';

let fontStyle;
export function inlineResumePdfFonts(html) {
  if (!fontStyle) {
    const families = [['Arial','arimo'],['Times New Roman','tinos'],['Calibri','carlito']];
    fontStyle = '<style data-resume-export-fonts>' + families.flatMap(([name,family]) => [400,700].map(weight => {
      const file = path.join(process.cwd(),'node_modules','@fontsource',family,'files',`${family}-latin-${weight}-normal.woff`);
      return `@font-face{font-family:"${name}";font-style:normal;font-weight:${weight};src:url(data:font/woff;base64,${fs.readFileSync(file).toString('base64')}) format('woff');font-display:block}`;
    })).join('') + '</style>';
  }
  return html.includes('data-resume-export-fonts') ? html : html.replace('</head>',fontStyle+'</head>');
}
