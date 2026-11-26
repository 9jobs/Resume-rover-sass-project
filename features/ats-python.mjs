import {spawn} from 'node:child_process';
import path from 'node:path';
export function analyseUniversal(body){
 const root=process.cwd(),python=path.join(root,'backend','.venv','Scripts','python.exe');
 if(typeof body.jd!=='string'||body.jd.length<10||body.jd.length>20000)throw Object.assign(new Error('Paste a job description of 10–20,000 characters.'),{status:400});
 return new Promise((resolve,reject)=>{
  const child=spawn(python,['-m','backend.cli'],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';
  const timeout=setTimeout(()=>{child.kill();reject(Object.assign(new Error('ATS analysis timed out. Please retry.'),{status:504}))},20000);
  child.stdout.on('data',b=>{output+=b;if(output.length>2000000)child.kill()});
  child.stderr.resume();
  child.on('error',()=>{clearTimeout(timeout);reject(Object.assign(new Error('Local Python ATS backend is not configured.'),{status:503}))});
  child.on('close',()=>{clearTimeout(timeout);try{const result=JSON.parse(output);if(!result.ok)reject(Object.assign(new Error(result.error),{status:422}));else resolve(result.result)}catch{reject(Object.assign(new Error('Local ATS analysis failed.'),{status:503}))}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(body));
 });
}
