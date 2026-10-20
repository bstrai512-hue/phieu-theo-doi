import test from 'node:test';
import assert from 'node:assert/strict';
import { careEditorValues, careEditorKey, updateCareField } from '../src/forms/care-form-state.ts';
import { emptyCare } from '../src/forms/model.ts';

const fixture=()=>({...emptyCare(),observations:[{id:'first',time:'2026-10-20T08:00',values:{pulse:'80',awareness:'1'}},{id:'second',time:'2026-10-20T16:00',values:{pulse:'90'}}],diagnoses:[{id:'d',text:'Chẩn đoán',goals:[{id:'g',text:'Mục tiêu',achieved:false}]}]});

test('registering hidden fields supplies empty strings without mutating or filling clinical defaults',()=>{
 const data=fixture();const before=structuredClone(data);const editor=careEditorValues(data);
 assert.equal(editor.observations[0].values.skin,'');
 assert.equal(editor.observations[1].values.pulse,'90');
 editor.diagnoses[0].text='Unsaved';editor.observations[0].values.pulse='70';
 assert.deepEqual(data,before);
});

test('save acknowledgements with sparse values or different object key order do not reset RHF',()=>{
 const data=fixture();const expanded=careEditorValues(data);
 const reordered={diagnoses:expanded.diagnoses,observations:expanded.observations.map(o=>({...o,values:Object.fromEntries(Object.entries(o.values).reverse())})),allergy:expanded.allergy,allergyStatus:expanded.allergyStatus};
 assert.equal(careEditorKey(data),careEditorKey(reordered));
 assert.notEqual(careEditorKey(data),careEditorKey(updateCareField(data,'observations.1.values.pulse','95')));
});

test('a field edit patches only its path and retains the newest data in other fields and time points',()=>{
 const current=fixture();current.allergy='Mới nhận';current.observations[1].values.skin='2';
 const next=updateCareField(current,'observations.0.values.pulse','85');
 assert.equal(next.observations[0].values.pulse,'85');assert.equal(current.observations[0].values.pulse,'80');
 assert.equal(next.allergy,'Mới nhận');assert.equal(next.observations[1].values.skin,'2');
 assert.deepEqual(next.diagnoses,current.diagnoses);
 assert.equal(updateCareField(next,'diagnoses.0.goals.0.achieved',true).diagnoses[0].goals[0].achieved,true);
});

test('stale input events cannot resurrect a removed time point or diagnosis',()=>{
 const current=fixture();current.observations=[];current.diagnoses=[];
 assert.equal(updateCareField(current,'observations.0.values.pulse','85'),current);
 assert.equal(updateCareField(current,'diagnoses.0.text','stale'),current);
});

test('RHF field-array placeholders never enter the persisted care draft after removing a time point',()=>{
 const data=fixture();
 // RHF can return undefined for mounted, untouched controls in an appended time point.
 const remaining={id:'second',time:'2026-10-20T16:00',values:{pulse:'90',skin:undefined,awareness:undefined}};
 const next=updateCareField(data,'observations',[remaining]);
 assert.deepEqual(next.observations[0].values,{pulse:'90'});
 assert.equal(Object.hasOwn(remaining.values,'skin'),true,'do not mutate RHF internals');
});
