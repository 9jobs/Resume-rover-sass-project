import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createResumeCrud} from '../features/resume-crud.mjs';
import {createResumeWorkflow} from '../features/resume-workflow.mjs';
import {createCareerFeatures} from '../features/career.mjs';
import {createGemini} from '../features/gemini.mjs';
import {fictionalResume} from '../deep-verification/fixtures.mjs';
const setup=()=>{const store=createStore(':memory:'),crud=createResumeCrud(store),workflow=createResumeWorkflow(store);const user=store.signup({name:'CRUD Test',email:'crud@fictional.test',password:'FictionalCRUD!2026'}),other=store.signup({name:'Other Test',email:'other@fictional.test',password:'FictionalCRUD!2026'});const doc=workflow.save(user,{title:'First resume',resume:fictionalResume()});return {store,crud,workflow,user,other,doc}};
test('rename and update retain metadata and revisions and reject stale writes',()=>{
 const {store,crud,user,doc}=setup(),original=JSON.stringify(doc.data.canonical);
 const renamed=crud.rename(user,doc.id,{title:'Renamed',expectedUpdated:doc.updated});
 assert.equal(renamed.id,doc.id);assert.equal(renamed.data.title,'Renamed');assert.equal(JSON.stringify(renamed.data.canonical),original);
 assert.deepEqual(renamed.data.workflow,doc.data.workflow);
 assert.throws(()=>crud.rename(user,doc.id,{title:'Stale',expectedUpdated:doc.updated}),e=>e.status===409);
 const resume=structuredClone(doc.data.canonical);resume.sections.find(s=>s.type==='summary').content.text='Updated confirmed professional summary.';
 const updated=crud.update(user,doc.id,{resume,title:'Updated title',expectedUpdated:renamed.updated});
 assert.equal(updated.id,doc.id);assert(updated.data.content.includes('Updated confirmed'));
 assert.equal(store.list(user,'document').length,1);assert.equal(store.list(user,'resume-revision').length,2);
 assert.equal(JSON.stringify(store.list(user,'resume-revision').find(r=>r.data.title==='First resume').data.canonical),original);
});
test('duplicate is independent, respects allowance, and does not alter original',()=>{
 const {store,crud,user,doc}=setup();const copy=crud.duplicate(user,doc.id);
 assert.notEqual(copy.id,doc.id);assert.deepEqual(copy.data.canonical,doc.data.canonical);
 assert.equal(copy.data.workflow.parentId,doc.id);assert.equal(store.record(user,doc.id).data.title,'First resume');
 crud.duplicate(user,doc.id);assert.throws(()=>crud.duplicate(user,doc.id),e=>e.status===403);
 assert.equal(store.list(user,'document').length,3);
});
test('delete removes active record and frees allowance; undo restores exact content',()=>{
 const {store,crud,user,doc}=setup();const before=store.state(user).allowance.documents;
 crud.remove(user,doc.id,{expectedUpdated:doc.updated});assert.throws(()=>store.record(user,doc.id,'document'),e=>e.status===404);
 assert.equal(store.list(user,'document').length,0);assert.equal(store.state(user).allowance.documents,before+1);
 const restored=crud.restore(user,doc.id);assert.equal(restored.id,doc.id);assert.deepEqual(restored.data,doc.data);
 assert.throws(()=>crud.restore(user,doc.id),e=>e.status===404);
});
test('other accounts cannot rename update duplicate delete or restore',()=>{
 const {crud,user,other,doc}=setup();
 for(const call of [()=>crud.rename(other,doc.id,{title:'x',expectedUpdated:doc.updated}),()=>crud.update(other,doc.id,{expectedUpdated:doc.updated}),()=>crud.duplicate(other,doc.id),()=>crud.remove(other,doc.id,{expectedUpdated:doc.updated})])assert.throws(call,e=>e.status===404);
 crud.remove(user,doc.id,{expectedUpdated:doc.updated});assert.throws(()=>crud.restore(other,doc.id),e=>e.status===404);
});
test('updates work at full allowance; restore cannot exceed allowance',()=>{
 const {store,crud,user,doc}=setup();crud.duplicate(user,doc.id);crud.duplicate(user,doc.id);
 assert(crud.rename(user,doc.id,{title:'Allowed update',expectedUpdated:doc.updated}));
 const current=store.record(user,doc.id,'document');crud.remove(user,doc.id,{expectedUpdated:current.updated});
 const another=store.list(user,'document')[0];crud.duplicate(user,another.id);
 assert.throws(()=>crud.restore(user,doc.id),e=>e.status===403);
 store.plan(user,{plan:'Pro'});
 assert.equal(crud.restore(user,doc.id).id,doc.id);
});
test('linked cover-letter source survives deletion of the active resume',()=>{
 const {store,crud,user,doc}=setup();const career=createCareerFeatures(store,createGemini({key:'',model:'test'}));
 const letter=career.generateLocalLetter(user,{resumeId:doc.id});
 crud.remove(user,doc.id,{expectedUpdated:doc.updated});
 assert.equal(store.record(user,letter.id,'cover-letter').data.signature.name,doc.data.canonical.profile.fullName);
 assert.equal(career.source(user,{resumeId:doc.id}).signature.name,doc.data.canonical.profile.fullName);
});
