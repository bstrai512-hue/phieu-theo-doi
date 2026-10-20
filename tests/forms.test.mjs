import assert from 'node:assert/strict';
import test from 'node:test';
import { defaults, parseData, validData } from '../src/services/treatment-records/model.ts';
import { printInfusion, printCare } from '../src/forms/print.ts';
import { makeInfusion } from '../src/forms/model.ts';

test('migration requires a choice for differing snapshots and never changes its input', () => {
  const current = defaults();
  current.patient.name = 'Người bệnh';
  const legacy = { version: 1, patient: current.patient, rows: current.forms.treatment.rows, templates: current.templates,
    dayPatients: { '2026-10-19': { ...current.patient, bed: '4' }, '2026-10-20': { ...current.patient, bed: '6' } } };
  const before = structuredClone(legacy);
  const result = parseData(legacy);
  assert.equal(result.patientReview.resolved, false);
  assert.deepEqual(result.patientReview.byDay, legacy.dayPatients);
  assert.deepEqual(legacy, before);
  assert.deepEqual(parseData(result), result);
  assert.equal(validData(result), true);
});

test('identical snapshots need no choice; malformed backups never silently lose forms', () => {
  const current = defaults();
  const legacy = { version: 1, patient: current.patient, rows: current.forms.treatment.rows, templates: current.templates,
    dayPatients: { '2026-10-20': { ...current.patient } } };
  assert.equal(parseData(legacy).patientReview.resolved, true);
  assert.throws(() => parseData({ ...current, forms: { ...current.forms, care: {} } }), /không hợp lệ/);
  assert.throws(() => parseData({ ...legacy, version: 5 }), /không hợp lệ/);
});

test('new print templates escape user text, retain all infusion rows and care observations', () => {
  const data = defaults();
  data.patient.name = '<script>alert(1)</script>';
  data.forms.infusion.rows = Array.from({ length: 55 }, (_,i) => ({ ...makeInfusion('2026-10-20'), fluid: `Dịch thử ${i}` }));
  data.forms.infusion.rows[0].date = '2026-<img src=x>-20';
  const infusion = printInfusion(data.patient, data.forms.infusion);
  assert.ok(infusion.includes('&lt;script&gt;'));
  assert.ok(!infusion.includes('<script>'));
  assert.ok(!infusion.includes('<img src=x>'));
  for(let i=0;i<55;i++)assert.ok(infusion.includes(`Dịch thử ${i}`));
  data.forms.care.observations = Array.from({ length: 9 }, (_,i) => ({ id: String(i), time: '2026-10-20T08:00', values: { pulse: `Mốc thử ${i}` } }));
  data.forms.care.diagnoses = [{ id: 'd', text: '<img src=x>', goals: [{ id: 'g', text: 'Mục tiêu thử', achieved: true }] }];
  const care = printCare(data.patient,data.forms.care);
  assert.equal((care.match(/<article/g)||[]).length,3);
  for(let i=0;i<9;i++)assert.ok(care.includes(`Mốc thử ${i}`));
  assert.ok(care.includes('&lt;img src=x&gt;'));
  assert.ok(care.includes('☒ Mục tiêu thử'));
});


test('long care notes have a visible reference and remain complete in the appendix', () => {
  const data = defaults();
  const note = 'Nội dung chăm sóc dài '.repeat(50);
  data.forms.care.observations = [{ id: 'obs', time: '2026-10-20T08:00', values: { nursing: note } }];
  const html = printCare(data.patient,data.forms.care);
  assert.ok(html.includes('Chi tiết [1]'));
  assert.ok(html.includes(note));
  assert.ok(html.includes('[1] 20/10/2026 08:00 - Chăm sóc điều dưỡng (CS)'));
});
