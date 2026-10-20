import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { careDefaultsIssues, validCareDefaults, makeCareObservation } from '../src/forms/care-defaults-model.ts';
import { defaults } from '../src/services/treatment-records/model.ts';
import { recordInput } from '../src/services/treatment-records/contracts.ts';
function setup(){
 const entries=new Map();let fail=false;
 const storage=()=>({getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('QuotaExceeded');entries.set(key,value)}});
 return {entries,services:createLocalTreatmentServices(storage),reopen:()=>createLocalTreatmentServices(storage),fail:()=>{fail=true}};
}
test('missing default configuration stays empty and saving it never changes treatment records or templates',async()=>{
 const {services,reopen}=setup();
 const beforeRecord=await services.records.get('current');const beforeTemplates=await services.templates.list();
 assert.deepEqual(await services.careDefaults.get(),{revision:0,value:{values:{}}});
 const saved=await services.careDefaults.update({values:{awareness:'1',skin:'1',dyspnea:'-',medication:'1, 3',other:''}},0);
 assert.deepEqual(await reopen().careDefaults.get(),{revision:1,value:{values:{awareness:'1',skin:'1',dyspnea:'-',medication:'1, 3'}}});
 assert.deepEqual(await services.records.get('current'),beforeRecord);assert.deepEqual(await services.templates.list(),beforeTemplates);
 saved.value.values.awareness='3';assert.equal((await services.careDefaults.get()).value.values.awareness,'1');
});
test('default changes affect only future observations and never share mutable references',async()=>{
 const {services}=setup();const id=(await services.records.list())[0].id;
 const firstDefaults=await services.careDefaults.update({values:{awareness:'1',pulse:'80'}},0);
 const first=makeCareObservation(firstDefaults.value,'2026-10-20T08:00');
 const data=defaults();data.forms.care.observations=[first];await services.records.update(id,recordInput(data));
 const nextDefaults=await services.careDefaults.update({values:{awareness:'2'}},firstDefaults.revision);
 const second=makeCareObservation(nextDefaults.value,'2026-10-20T16:00');
 assert.notEqual(first.id,second.id);assert.equal(second.values.awareness,'2');assert.equal(second.values.pulse,undefined);
 assert.equal((await services.records.get(id)).forms.care.observations[0].values.awareness,'1');
 second.values.awareness='3';assert.equal(nextDefaults.value.values.awareness,'2');
});
test('stale saves and invalid conventions reject without overwriting saved defaults',async()=>{
 const {services}=setup();const before=await services.careDefaults.update({values:{skin:'1'}},0);
 await assert.rejects(services.careDefaults.update({values:{skin:'2'}},0),/thay đổi/);
 for(const value of [{values:{skin:'99'}},{values:{nursing:'14'}},{values:{skin:'5'}},{values:{pressure:'120/'}},{values:{unknown:'1'}},{values:{pulse:'abc'}}]){
  assert.equal(validCareDefaults(value),false);await assert.rejects(services.careDefaults.update(value,1),/hợp lệ/);
 }
 assert.deepEqual(await services.careDefaults.get(),before);
 assert.deepEqual(careDefaultsIssues({values:{skin:'5 | Mô tả',nursing:'14+',pressure:'120/80'}}),[]);
});
test('failed writes and corrupt local configuration preserve stored data',async()=>{
 const {services,entries,fail}=setup();const original=await services.careDefaults.update({values:{awareness:'1'}},0);
 fail();await assert.rejects(services.careDefaults.update({values:{awareness:'2'}},1),/Quota/);assert.deepEqual(await services.careDefaults.get(),original);
 entries.set('care-defaults-v1','broken');await assert.rejects(services.careDefaults.get());assert.equal(entries.get('care-defaults-v1'),'broken');
});
