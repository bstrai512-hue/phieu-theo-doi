import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { nextCareObservation, validCareTemplateLibrary } from '../src/forms/care-defaults-model.ts';
function setup(){
 const entries=new Map();let fail=false;
 const storage=()=>({getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('QuotaExceeded');entries.set(key,value)}});
 return {entries,services:createLocalTreatmentServices(storage),reopen:()=>createLocalTreatmentServices(storage),fail:()=>{fail=true}};
}
const library=()=>({templates:[{id:'normal',name:'Thông thường',values:{awareness:'1',pulse:'80'}},{id:'resp',name:'Hô hấp',values:{awareness:'2',dyspnea:'+'}}],defaultTemplateId:'normal'});
test('template library CRUD preserves episodes, independent revisions and immutable snapshots',async()=>{
 const {services,reopen}=setup();
 const beforeRecord=await services.records.get('current');const beforeTemplates=await services.templates.list();
 assert.deepEqual(await services.careDefaults.get(),{revision:0,value:{templates:[],defaultTemplateId:null}});
 const saved=await services.careDefaults.update(library(),0);
 saved.value.templates[0].values.awareness='3';
 const next=await reopen().careDefaults.get();
 assert.equal(next.value.templates[0].values.awareness,'1');
 next.value.templates[1].name='Hô hấp sửa';next.value.defaultTemplateId='resp';
 await services.careDefaults.update(next.value,1);
 next.value.templates=next.value.templates.filter(t=>t.id!=='normal');
 const final=await services.careDefaults.update(next.value,2);
 assert.equal(final.value.templates.length,1);assert.equal(final.value.defaultTemplateId,'resp');
 assert.deepEqual(await services.records.get('current'),beforeRecord);assert.deepEqual(await services.templates.list(),beforeTemplates);
});
test('legacy defaults migrate deterministically on read without modifying stored bytes',async()=>{
 const {services,entries}=setup();
 const raw=JSON.stringify({revision:7,value:{values:{awareness:'1',pulse:'80'}}});
 entries.set('care-defaults-v1',raw);
 const first=await services.careDefaults.get();const second=await services.careDefaults.get();
 assert.deepEqual(first,second);assert.equal(first.revision,7);
 assert.equal(first.value.defaultTemplateId,first.value.templates[0].id);
 assert.deepEqual(first.value.templates[0].values,{awareness:'1',pulse:'80'});
 assert.equal(entries.get('care-defaults-v1'),raw);
 await services.careDefaults.update(first.value,7);
 assert.equal((await services.careDefaults.get()).revision,8);
});
test('only the first observation uses a chosen template; subsequent observations copy the last edited values',()=>{
 const templates=library();
 const first=nextCareObservation([],templates,'resp','2026-10-22T08:00');
 assert.deepEqual(first.values,templates.templates[1].values);
 first.values.pulse='95';first.values.other='Ghi nhận riêng';first.values.skin='legacy free text';
 templates.templates[1].values.awareness='3';
 const second=nextCareObservation([first],templates,'normal','2026-10-22T09:00');
 assert.deepEqual(second.values,first.values);assert.notEqual(second.id,first.id);assert.equal(second.time,'2026-10-22T09:00');
 second.values.pulse='90';assert.equal(first.values.pulse,'95');
 const third=nextCareObservation([first,second],{templates:[],defaultTemplateId:null},null,'2026-10-22T10:00');
 assert.equal(third.values.pulse,'90');
 assert.deepEqual(nextCareObservation([],templates,null,'').values,{});
 assert.deepEqual(nextCareObservation([],templates,'deleted','').values,{});
});
test('invalid libraries and stale saves reject without changing the stored library',async()=>{
 const {services}=setup();const saved=await services.careDefaults.update(library(),0);
 await assert.rejects(services.careDefaults.update(library(),0),/thay đổi/);
 for(const invalid of [
  {...library(),defaultTemplateId:'missing'},
  {...library(),templates:[library().templates[0],library().templates[0]]},
  {...library(),templates:[{id:'normal',name:' ',values:{}}]},
  ...[{skin:'99'},{nursing:'14'},{skin:'5'},{pressure:'120/'},{unknown:'1'},{pulse:'abc'}].map(values=>({templates:[{id:'normal',name:'Mẫu',values}],defaultTemplateId:'normal'})),
 ]){
  assert.equal(validCareTemplateLibrary(invalid),false);
  await assert.rejects(services.careDefaults.update(invalid,1),/hợp lệ/);
 }
 assert.deepEqual(await services.careDefaults.get(),saved);
});
test('failed writes and corrupt data preserve the previous stored content',async()=>{
 const {services,entries,fail}=setup();const saved=await services.careDefaults.update(library(),0);
 fail();await assert.rejects(services.careDefaults.update({templates:[],defaultTemplateId:null},1),/Quota/);
 assert.deepEqual(await services.careDefaults.get(),saved);
 entries.set('care-defaults-v1','broken');await assert.rejects(services.careDefaults.get());
 assert.equal(entries.get('care-defaults-v1'),'broken');
});
