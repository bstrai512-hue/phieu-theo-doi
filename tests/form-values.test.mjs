import test from 'node:test';
import assert from 'node:assert/strict';
import { formValuesKey, patchFormValue } from '../src/forms/form-values.ts';
import { defaults } from '../src/services/treatment-records/model.ts';
import { makeInfusion } from '../src/forms/model.ts';

test('generic RHF sync ignores object ordering but notices actual edits and row order',()=>{
 assert.equal(formValuesKey({name:'A',birth:'1999'}),formValuesKey({birth:'1999',name:'A'}));
 assert.notEqual(formValuesKey({progress:'A',orders:'B'}),formValuesKey({progress:'B',orders:'B'}));
 assert.notEqual(formValuesKey({rows:[{id:'a'},{id:'b'}]}),formValuesKey({rows:[{id:'b'},{id:'a'}]}));
});

test('patient and infusion edits preserve unrelated values without sharing mutable RHF objects',()=>{
 const patient=defaults().patient;
 const updated=patchFormValue({...patient,bed:'7'},'name','Người bệnh');
 assert.equal(updated.bed,'7');assert.equal(patient.name,'');
 const infusion={rows:[{...makeInfusion('2026-10-20'),fluid:'First'}, {...makeInfusion('2026-10-21'),fluid:'Second',nurse:'Nurse'}]};
 const changed=patchFormValue(infusion,'rows.1.fluid','Edited');
 assert.equal(changed.rows[0].fluid,'First');assert.equal(changed.rows[1].nurse,'Nurse');assert.equal(infusion.rows[1].fluid,'Second');
 const fromRHF=[changed.rows[1]];
 const removed=patchFormValue(infusion,'rows',fromRHF);
 fromRHF[0].fluid='Not persisted';
 assert.equal(removed.rows[0].fluid,'Edited');
 assert.equal(patchFormValue({rows:[]},'rows.0.fluid','Stale').rows.length,0);
});
