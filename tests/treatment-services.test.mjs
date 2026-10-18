import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { defaults, validData } from '../src/services/treatment-records/model.ts';
import { recordInput } from '../src/services/treatment-records/contracts.ts';
import { persistEditorData } from '../src/services/treatment-records/editor-data.ts';

function setup(legacy) {
  const entries = new Map();
  if (legacy) entries.set('treatment-quick-entry-v1', JSON.stringify(legacy));
  let failWrite = false;
  const storage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrite) throw new Error('QuotaExceededError');
      entries.set(key, value);
    },
  };
  return {
    services: createLocalTreatmentServices(() => storage),
    reopen: () => createLocalTreatmentServices(() => storage),
    entries,
    failWrites: value => { failWrite = value; },
  };
}

test('legacy data retains patient snapshots, session-less rows, template IDs and backup format', async () => {
  const legacy = defaults();
  legacy.patient.name = 'Người bệnh thử';
  legacy.dayPatients = { '2026-10-18': { ...legacy.patient, bed: '12' } };
  legacy.rows[0].time = '2026-10-18T08:00';
  const { services, entries, reopen } = setup(legacy);
  const summaries = await services.records.list();
  const record = await services.records.get(summaries[0].id);
  const templates = await services.templates.list();
  assert.deepEqual({ version: 1, ...recordInput(record), templates }, legacy);
  await services.records.update(record.id, { patient: { ...record.patient, room: 'A' } });
  assert.equal((await reopen().records.get(record.id)).patient.room, 'A');
  assert.equal(entries.get('treatment-quick-entry-v1'), JSON.stringify(legacy));
  assert.deepEqual(await reopen().templates.list(), templates);
});

test('record CRUD persists partial updates without modifying other records or templates', async () => {
  const { services, reopen } = setup();
  const templates = await services.templates.list();
  const original = (await services.records.list())[0];
  const created = await services.records.create(recordInput(defaults()));
  const snapshot = { ...created.patient, bed: '55' };
  await services.records.update(created.id, { dayPatients: { '2026-10-18': snapshot } });
  const updated = await reopen().records.get(created.id);
  assert.deepEqual(updated.patient, created.patient);
  assert.equal(updated.dayPatients['2026-10-18'].bed, '55');
  assert.deepEqual(await services.templates.list(), templates);
  assert.equal((await services.records.list()).length, 2);
  await services.records.remove(created.id);
  await assert.rejects(services.records.get(created.id), /Không tìm thấy/);
  assert.equal((await services.records.get(original.id)).id, original.id);
  await assert.rejects(services.records.update(original.id, { rows: [] }), /không hợp lệ/);
  assert.ok((await services.records.get(original.id)).rows.length);
});

test('template CRUD preserves imported IDs and does not modify the treatment record', async () => {
  const { services, reopen } = setup();
  const summary = (await services.records.list())[0];
  const record = await services.records.get(summary.id);
  const template = await services.templates.create({ id: 'backup-id', kind: 'orders', text: 'Mẫu thử', group: 'Mẫu của tôi' });
  assert.equal(template.id, 'backup-id');
  await services.templates.update(template.id, { text: 'Đã sửa' });
  assert.equal((await reopen().templates.list()).find(item => item.id === template.id).text, 'Đã sửa');
  await assert.rejects(services.templates.create(template), /đã tồn tại/);
  await services.templates.remove(template.id);
  await assert.rejects(services.templates.update(template.id, { text: 'Không có' }), /Không tìm thấy/);
  assert.deepEqual(await services.records.get(record.id), record);
});

test('a failed write leaves prior data intact and permits retry', async () => {
  const { services, failWrites } = setup();
  const summary = (await services.records.list())[0];
  const before = await services.records.get(summary.id);
  failWrites(true);
  await assert.rejects(services.records.update(before.id, { patient: { ...before.patient, name: 'Thay đổi' } }), /Quota/);
  assert.deepEqual(await services.records.get(before.id), before);
  failWrites(false);
  await services.records.update(before.id, { patient: { ...before.patient, name: 'Thay đổi' } });
  assert.equal((await services.records.get(before.id)).patient.name, 'Thay đổi');
});

test('corrupt persisted data is reported without overwriting or falling back to stale legacy data', async () => {
  const { services, entries } = setup(defaults());
  entries.set('treatment-services-v1', '{broken');
  await assert.rejects(services.records.list());
  assert.equal(entries.get('treatment-services-v1'), '{broken');
});

test('returned data cannot mutate subsequent reads', async () => {
  const { services } = setup();
  const summary = (await services.records.list())[0];
  const record = await services.records.get(summary.id);
  record.patient.name = 'Unsaved';
  assert.equal((await services.records.get(summary.id)).patient.name, '');
  const templates = await services.templates.list();
  templates.length = 0;
  assert.ok((await services.templates.list()).length);
  assert.equal(validData({ version: 1, ...recordInput(record), templates }), true);
});

test('editor persistence applies template create/update/delete and restores a version 1 backup', async () => {
  const legacy = defaults();
  const { services, reopen } = setup(legacy);
  const summary = (await services.records.list())[0];
  const next = structuredClone(legacy);
  next.patient.name = 'Phiếu đã nhập';
  next.templates = [
    { ...next.templates[0], text: 'Nội dung đã sửa' },
    { id: 'imported-template', kind: 'orders', text: 'Chỉ định mới', group: 'Mẫu nhập' },
  ];
  await persistEditorData(services, summary.id, next);
  const reopened = reopen();
  const record = await reopened.records.get(summary.id);
  assert.deepEqual({ version: 1, ...recordInput(record), templates: await reopened.templates.list() },
    { ...next, dayPatients: undefined });
  await persistEditorData(reopened, summary.id, next);
  assert.equal((await reopened.templates.list()).length, 2);
});
