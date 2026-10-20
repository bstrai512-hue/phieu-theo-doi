import test from 'node:test';
import assert from 'node:assert/strict';
import { careGroups } from '../src/forms/model.ts';
import { defaults } from '../src/services/treatment-records/model.ts';
import { careConventions, selectedCareCodes, joinCareDetail, formatCareValue, careValueIssue } from '../src/forms/care-conventions.ts';
import { printCare } from '../src/forms/print.ts';

test('every care field has an explicit control definition and empty values never imply a clinical result',()=>{
  for(const group of careGroups)for(const [key] of group.fields){
    assert.ok(careConventions[key],key);
    assert.equal(formatCareValue(key,''),'');
    assert.equal(careValueIssue(key,''),null);
  }
  assert.equal(careConventions.awareness.kind,'choice');
  assert.equal(careConventions.temperature.kind,'number');
  assert.equal(careConventions.nursing.kind,'multiple');
  assert.deepEqual(defaults().forms.care.observations,[]);
});

test('coded values and optional locations print compactly without changing stored or legacy text',()=>{
  assert.equal(formatCareValue('awareness','1'),'1');
  assert.equal(formatCareValue('dyspnea','-'),'-');
  assert.equal(formatCareValue('edema',joinCareDetail('2','Chân trái')),'2 / Chân trái');
  assert.equal(formatCareValue('pain',joinCareDetail('0','')),'0');
  assert.equal(formatCareValue('awareness','Nội dung cũ'),'Nội dung cũ');
  assert.equal(formatCareValue('nursing','Giá trị cũ chưa chuẩn hóa'),'Giá trị cũ chưa chuẩn hóa');
});

test('multi-select interventions accept old prefixes and encode catheter actions without inferring one',()=>{
  assert.deepEqual(selectedCareCodes(careConventions.nursing,'CS.1, CS.2, CS.14(+)'),['1','2','14+']);
  assert.equal(formatCareValue('nursing','1, 2, 14+, 15-'),'1, 2, 14(+), 15(-)');
  assert.equal(selectedCareCodes(careConventions.medication,'99'),null);
  assert.equal(careValueIssue('nursing','14'),'Cần chọn thao tác đặt (+) hoặc rút (-)');
  assert.equal(careValueIssue('nursing','14+'),null);
  assert.equal(careValueIssue('skin','5'),'Cần ghi rõ thông tin khác');
  assert.equal(careValueIssue('skin','5 | Mô tả'),null);
  assert.equal(careValueIssue('pressure','120/'),'Cần nhập cả tâm thu và tâm trương');
  assert.equal(careValueIssue('pressure','120/80'),null);
});

test('print cells and the legend use the same convention definitions',()=>{
  const data=defaults();
  data.forms.care.observations=[{id:'obs',time:'2026-10-20T08:00',values:{awareness:'2',dyspnea:'-',medication:'1, 3',nursing:'1, 14+',skin:'5 | Thông tin <khác>'}}];
  const html=printCare(data.patient,data.forms.care);
  assert.ok(html.includes('<td>2</td>'));
  assert.ok(html.includes('<td>-</td>'));
  assert.ok(html.includes('<td>1, 3</td>'));
  assert.ok(html.includes('<td>1, 14(+)</td>'));
  assert.ok(html.includes('5 / Thông tin &lt;khác&gt;'));
  for(const option of careConventions.medication.options)assert.ok(html.includes(`T.${option.code}: ${option.label}`));
});
