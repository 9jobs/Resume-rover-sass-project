import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {inlineResumePdfFonts} from './resume-pdf-fonts.mjs';
const run=promisify(execFile);
let busy=false;
async function renderHostedPdf(html){
 let browser;
 try{
  const [{default:chromium},{launch}]=await Promise.all([import('@sparticuz/chromium'),import('puppeteer-core')]);
  browser=await launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',timeout:20000});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',request=>{
   void (request.url().startsWith('data:')?request.continue():request.abort()).catch(()=>{});
  });
  await page.setContent(html,{waitUntil:'load',timeout:15000});
  await page.evaluate(() => document.fonts.ready);
  return Buffer.from(await page.pdf({preferCSSPageSize:true,printBackground:true,timeout:15000}));
 }catch(error){
  console.error('HOSTED_PDF_RENDER',error.code||error.name);
  throw Object.assign(new Error('PDF rendering failed. Word and TXT downloads are still available.'),{status:503});
 }finally{
  if(browser)await browser.close().catch(()=>{});
 }
}
export async function renderLocalPdf(html){
 html=inlineResumePdfFonts(html);
 if(process.env.VERCEL==='1')return renderHostedPdf(html);
 if(busy)throw Object.assign(new Error('Another local PDF is rendering. Try again shortly.'),{status:409});
 const candidates=[process.env.LOCAL_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
 let browser;
 for(const candidate of candidates){try{await fs.access(candidate);browser=candidate;break}catch{}}
 if(!browser)throw Object.assign(new Error('Local Chrome or Edge is required for PDF download. Use the existing editor Print to PDF option.'),{status:503});
 busy=true;let folder;
 try{
  folder=await fs.mkdtemp(path.join(os.tmpdir(),'resume-workflow-pdf-'));
  const source=path.join(folder,'resume.html'),output=path.join(folder,'resume.pdf');
  await fs.writeFile(source,html);
  await run(browser,['--headless=new','--disable-gpu','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--host-resolver-rules=MAP * ~NOTFOUND','--user-data-dir='+path.join(folder,'browser'),'--no-pdf-header-footer','--print-to-pdf='+output,pathToFileURL(source).href],{windowsHide:true,timeout:25000,maxBuffer:1000000});
  const result=await fs.readFile(output);
  if(result.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid PDF');
  return result;
 }catch{throw Object.assign(new Error('Local PDF rendering failed. Your saved version is available for DOCX or TXT download.'),{status:503})}
 finally{busy=false;if(folder)await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{})}
}
