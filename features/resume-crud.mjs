import {randomUUID} from 'node:crypto';
import {prepareWorkflowResume} from './resume-workflow.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const titleOf=value=>{if(typeof value!=='string'||!value.trim()||value.length>200)fail('Enter a resume name of 1–200 characters.');return value.trim()};
export function createResumeCrud(store){
 const transaction=fn=>{store.db.exec('BEGIN IMMEDIATE');try{const result=fn();store.db.exec('COMMIT');return result}catch(error){store.db.exec('ROLLBACK');throw error}};
 const check=(doc,body)=>{if(typeof body?.expectedUpdated!=='string'||body.expectedUpdated!==doc.updated)fail('This resume changed in another window. Reload it before making changes.',409)};
 function update(u,id,body){
  return transaction(()=>{
   const old=store.record(u,id,'document');check(old,body);
   if(body.owner&&body.owner!==old.owner)fail('A resume cannot be moved to another candidate.',403);
   const title=titleOf(body.title??old.data.title);
   const prepared=body.resume?prepareWorkflowResume(body.resume):{resume:old.data.canonical,text:old.data.content};
   if(body.resume&&!prepared.resume.profile.fullName)fail('Add the candidate full name.');
   const workflow={...(old.data.workflow||{})};
   for(const field of ['jd','company','jobId','experienceLevel'])if(body[field]!==undefined){if(typeof body[field]!=='string'||body[field].length>(field==='jd'?15000:field==='company'?200:100))fail('Invalid resume details.');workflow[field]=body[field]}
   if(workflow.jobId){const job=store.record(u,workflow.jobId,'job');if(job.owner!==old.owner)fail('The job must belong to the same candidate.',403)}
   store.db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)').run(randomUUID(),u.org,old.owner,'resume-revision',JSON.stringify({...old.data,revisionOf:old.id,sourceUpdated:old.updated}),new Date().toISOString());
   const saved=store.write(u,'document',{owner:old.owner,title,canonical:prepared.resume,content:prepared.text},id);
   store.db.prepare('UPDATE records SET data=?,updated=? WHERE id=?').run(JSON.stringify({...old.data,...saved.data,workflow,optimizer:JSON.stringify(saved.data.canonical)===JSON.stringify(old.data.canonical)&&workflow.jd===(old.data.workflow?.jd)?old.data.optimizer:null,version:randomUUID()}),new Date(Math.max(Date.now(),Date.parse(old.updated)+1)).toISOString(),id);
   return store.record(u,id,'document');
  });
 }
 function duplicate(u,id,body={}){body=body||{};
  return transaction(()=>{const old=store.record(u,id,'document');const copy=store.write(u,'document',{owner:old.owner,title:titleOf(body.title||((old.data.title.slice(0,190))+' (copy)')),content:old.data.content,canonical:old.data.canonical});
   store.db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify({...copy.data,workflow:{...(old.data.workflow||{}),parentId:old.id}}),copy.id);
   return store.record(u,copy.id,'document')});
 }
 function remove(u,id,body){
  return transaction(()=>{const old=store.record(u,id,'document');check(old,body);
   store.db.prepare("UPDATE records SET kind='archived-resume',data=?,updated=? WHERE id=? AND org=?").run(JSON.stringify({...old.data,deletedAt:new Date().toISOString()}),new Date(Math.max(Date.now(),Date.parse(old.updated)+1)).toISOString(),id,u.org);
   return {ok:true,id,undoAvailable:true};
  });
 }
 function restore(u,id){
  return transaction(()=>{const old=store.record(u,id,'archived-resume');
   const {documents} = store.state(u).allowance;
   if(documents !== null && documents < 1)fail('Your saved-resume allowance is full. Remove another resume before restoring.',403);
   const data={...old.data};delete data.deletedAt;
   store.db.prepare("UPDATE records SET kind='document',data=?,updated=? WHERE id=? AND org=?").run(JSON.stringify(data),new Date().toISOString(),id,u.org);
   return store.record(u,id,'document');
  });
 }
 return {update,rename:(u,id,body)=>update(u,id,{title:body.title,expectedUpdated:body.expectedUpdated}),duplicate,remove,restore};
}
