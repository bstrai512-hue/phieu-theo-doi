// Explicit opt-in live smoke test: pnpm test:convex (configured DEV deployment only).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { createConvexTreatmentServices } from '../src/services/treatment-records/convex.ts';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { persistEditorData } from '../src/services/treatment-records/editor-data.ts';
import { defaults } from '../src/services/treatment-records/model.ts';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).split(' #')[0].trim().replace(/^['"]|['"]$/g, '')];
  }));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith('dev:'), 'Live smoke test requires a configured dev deployment');
assert.ok(env.VITE_CONVEX_URL, 'VITE_CONVEX_URL is required');
const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
const secondKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
const localStore = new Map();
const local = createLocalTreatmentServices(() => ({
  getItem: name => localStore.get(name) ?? null,
  setItem: (name, value) => localStore.set(name, value),
}));
const services = createConvexTreatmentServices(client, () => key, local);
let initialized = false;
try {
  const summaries = await services.records.list();
  initialized = true;
  assert.equal(summaries.length, 1);
  assert.equal((await services.templates.list()).length, 11);
  const original = await services.records.get(summaries[0].id);
  const data = defaults();
  data.patient.name = 'TEST đồng bộ Convex - dữ liệu giả';
  const created = await services.records.create({ patient: data.patient, rows: data.rows });
  await services.records.update(created.id, { patient: { ...created.patient, bed: '55' } });
  assert.equal((await services.records.get(created.id)).patient.bed, '55');
  const template = await services.templates.create({ kind: 'orders', text: 'TEST chỉ định giả', group: 'TEST' });
  await services.templates.update(template.id, { text: 'TEST đã sửa' });
  assert.equal((await services.templates.list()).find(item => item.id === template.id).text, 'TEST đã sửa');
  await services.templates.remove(template.id);
  data.templates = [{ id: 'test-imported', kind: 'progress', text: 'TEST nhập bản sao', group: 'TEST' }];
  await persistEditorData(services, original.id, data);
  const reloaded = createConvexTreatmentServices(new ConvexHttpClient(env.VITE_CONVEX_URL), () => key, local);
  assert.equal((await reloaded.records.get(original.id)).patient.name, data.patient.name);
  assert.deepEqual(await reloaded.templates.list(), data.templates);
  await client.mutation(api.workspaces.initialize, { workspaceKey: secondKey, records: [], templates: [] });
  await assert.rejects(client.query(api.records.get, { workspaceKey: secondKey, id: original.id }));
  await assert.rejects(client.mutation(api.records.update, { workspaceKey: secondKey, id: original.id, input: { rows: [] } }));
  await assert.rejects(client.mutation(api.templates.update, { workspaceKey: secondKey, id: 'test-imported', input: { text: 'Không được sửa' } }));
  await assert.rejects(client.mutation(api.records.saveEditor, {
    workspaceKey: key, id: original.id, input: { patient: original.patient, rows: [] }, templates: [],
  }));
  assert.equal((await reloaded.records.get(original.id)).patient.name, data.patient.name);
  assert.deepEqual(await reloaded.templates.list(), data.templates);
  await client.mutation(api.workspaces.initialize, { workspaceKey: key, records: [original], templates: [] });
  assert.equal((await reloaded.records.get(original.id)).patient.name, data.patient.name);
  await services.records.remove(created.id);
  await assert.rejects(services.records.get(created.id));
  console.log('PASS: live migration, record/template CRUD, reload, workspace isolation, atomic rollback, idempotent migration');
} finally {
  if (initialized) {
    for (const item of await services.records.list()) await services.records.remove(item.id);
    for (const item of await services.templates.list()) await services.templates.remove(item.id);
    console.log('Cleaned up all synthetic records and templates (empty workspace marker retained).');
  }
}
