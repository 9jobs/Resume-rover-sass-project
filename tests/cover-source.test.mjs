import test from 'node:test';import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';import {createCareerFeatures} from '../features/career.mjs';import {createGemini} from '../features/gemini.mjs';import {fictionalResume} from '../deep-verification/fixtures.mjs';
test('cover uploads work at the document limit without changing plan or overwriting resumes',async()=>{
 const store=createStore(':memory:'),career=createCareerFeatures(store,createGemini({key:'',model:'test'}));
 const a=store.signup({name:'Cover Test',email:'cover@allowance.test',password:'FictionalCover!2026'}),b=store.signup({name:'Other Test',email:'other@allowance.test',password:'FictionalCover!2026'});
 let blocked=false;for(let i=0;i<50;i++){try{store.write(a,'document',{title:'Existing '+i,content:'Existing resume facts'})}catch(error){assert.match(error.message,/allowance/);blocked=true;break}}assert(blocked);
 const before=JSON.stringify(store.list(a,'document')),plan=store.state(a).organisation.plan;
 const source=career.uploadResume(a,{resume:fictionalResume(),title:'Uploaded source'});
 assert.equal(source.kind,'cover-resume');assert.equal(career.source(a,{resumeId:source.id}).signature.name,'Avery Fictional');
 assert.equal(JSON.stringify(store.list(a,'document')),before);assert.equal(store.state(a).organisation.plan,plan);
 assert.equal(career.uploadResume(a,{resume:fictionalResume(),title:'Repeated upload'}).id,source.id);
 assert.throws(()=>career.source(b,{resumeId:source.id}));assert.throws(()=>career.uploadResume(b,{owner:a.id,resume:fictionalResume()}));
 await assert.rejects(career.generateLetter(a,{resumeId:source.id}),error=>error.code==='GEMINI_NOT_CONFIGURED');
});