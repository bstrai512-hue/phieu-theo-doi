import assert from 'node:assert/strict';
import test from 'node:test';
import { getFunctionName } from 'convex/server';
import { createConvexTreatmentServices } from '../src/services/treatment-records/convex.ts';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { persistEditorData } from '../src/services/treatment-records/editor-data.ts';
import { defaults } from '../src/services/treatment-records/model.ts';

function setup({ exists = false, initializeFails = false } = {}) {
  const calls = [];
  let initialized = exists;
  let fail = initializeFails;
  const client = {
    async query(reference, args) {
      const name = getFunctionName(reference);
      calls.push({ name, args });
      if (name === 'workspaces:exists') return initialized;
      if (name === 'records:list') return [{ id: 'current', patientName: 'Đã lưu' }];
      if (name === 'records:get') return { id: args.id, ...defaults() };
      if (name === 'templates:list') return [];
      throw new Error(`Unexpected query ${name}`);
    },
    async mutation(reference, args) {
      const name = getFunctionName(reference);
      calls.push({ name, args });
      if (name === 'workspaces:initialize') {
        if (fail) { fail = false; throw new Error('Network unavailable'); }
        initialized = true;
      }
      if (name === 'records:create') return args.record;
      if (name === 'templates:create') return args.template;
      return null;
    },
  };
  const storage = new Map();
  const local = createLocalTreatmentServices(() => ({
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }));
  return {
    calls, local,
    services: createConvexTreatmentServices(client, () => 'a'.repeat(64), local),
  };
}

test('Convex adapter migrates local data exactly once across concurrent callers', async () => {
  const { services, calls, local } = setup();
  const before = await local.records.get('current');
  await Promise.all([services.records.list(), services.templates.list()]);
  const initialization = calls.filter(call => call.name === 'workspaces:initialize');
  assert.equal(initialization.length, 1);
  assert.equal(initialization[0].args.records[0].id, 'current');
  assert.deepEqual(initialization[0].args.records[0].patient, before.patient);
  assert.equal(initialization[0].args.templates.length, 11);
  assert.equal(services.storage, 'cloud');
});

test('existing cloud workspace wins over stale local records and is never imported again', async () => {
  const { services, calls } = setup({ exists: true });
  assert.equal((await services.records.list())[0].patientName, 'Đã lưu');
  assert.equal(calls.some(call => call.name === 'workspaces:initialize'), false);
});

test('failed migration rejects rather than silently saving locally, then can retry', async () => {
  const { services, calls } = setup({ initializeFails: true });
  await assert.rejects(services.records.list(), /Network unavailable/);
  await services.records.list();
  assert.equal(calls.filter(call => call.name === 'workspaces:initialize').length, 2);
});

test('CRUD routes through Convex with a shared workspace scope and immutable IDs', async () => {
  const { services, calls } = setup({ exists: true });
  const { patient, forms } = defaults();
  const record = await services.records.create({ patient, forms });
  await services.records.get(record.id);
  await services.records.update(record.id, { patient: { ...patient, name: 'Mới' } });
  await services.records.remove(record.id);
  const template = await services.templates.create({ id: 'backup-id', kind: 'orders', text: 'Thử', group: 'Thử' });
  await services.templates.update(template.id, { id: 'cannot-change', text: 'Đã sửa' });
  await services.templates.remove(template.id);
  for (const call of calls) assert.equal(call.args.workspaceKey, 'a'.repeat(64));
  const update = calls.find(call => call.name === 'templates:update');
  assert.equal(update.args.id, 'backup-id');
  assert.equal('id' in update.args.input, false);
  for (const name of ['records:create', 'records:get', 'records:update', 'records:remove',
    'templates:create', 'templates:update', 'templates:remove']) {
    assert.ok(calls.some(call => call.name === name), name);
  }
});

test('editor save uses one atomic Convex mutation rather than separate record/template writes', async () => {
  const { services, calls } = setup({ exists: true });
  const data = defaults();
  await persistEditorData(services, 'current', data);
  assert.deepEqual(calls.map(call => call.name), ['workspaces:exists', 'records:saveEditor']);
  assert.deepEqual(calls[1].args.templates, data.templates);
});
