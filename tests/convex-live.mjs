// Explicit opt-in live smoke test: pnpm test:convex (configured DEV deployment only).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { defaults } from '../src/services/treatment-records/model.ts';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).split(' #')[0].trim().replace(/^['"]|['"]$/g, '')];
  }));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith('dev:'), 'Live smoke test requires a configured dev deployment');
assert.ok(env.VITE_CONVEX_URL, 'VITE_CONVEX_URL is required');
const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
const workspaceKey = 'shared';
const second = new ConvexHttpClient(env.VITE_CONVEX_URL);
const fixtureId = `test-shared-${crypto.randomUUID()}`;
let created = false;
let templateId;
try {
  const data = defaults();
  data.patient.name = fixtureId;
  await client.mutation(api.records.create, { workspaceKey, record: { id: fixtureId, patient: data.patient, forms: data.forms } });
  created = true;
  assert.equal((await second.query(api.records.get, { workspaceKey: 'a'.repeat(64), id: fixtureId })).patient.name, fixtureId);
  const before = await second.query(api.workspaces.snapshot, { workspaceKey });
  await client.mutation(api.records.update, { workspaceKey, id: fixtureId, input: { patient: { ...data.patient, bed: 'TEST' } } });
  await assert.rejects(client.mutation(api.records.saveEditor, {
    workspaceKey, id: fixtureId, input: { patient: data.patient, forms: data.forms },
    templates: before.templates, expectedRevision: before.revision,
  }));
  assert.equal((await second.query(api.records.get, { workspaceKey, id: fixtureId })).patient.bed, 'TEST');
  // Upgrade data is protected from saves by a stale frontend that only knows rows.
  const latest = await second.query(api.workspaces.snapshot, { workspaceKey });
  await assert.rejects(client.mutation(api.records.saveEditor, {
    workspaceKey, id: fixtureId, input: { patient: data.patient, rows: data.forms.treatment.rows },
    templates: latest.templates, expectedRevision: latest.revision,
  }), /tải lại trang/);
  const { makeInfusion } = await import('../src/forms/model.ts');
  data.forms.infusion.rows = [{ ...makeInfusion('2026-10-20'), fluid: 'Dữ liệu thử' }];
  data.forms.care.observations = [{ id: 'obs', time: '2026-10-20T08:00', values: { pulse: '80' } }];
  await client.mutation(api.records.saveEditor, { workspaceKey, id: fixtureId,
    input: { patient: data.patient, forms: data.forms }, templates: latest.templates, expectedRevision: latest.revision });
  assert.deepEqual((await second.query(api.records.get, { workspaceKey, id: fixtureId })).forms, data.forms);
  const invalid = structuredClone(data.forms);
  invalid.care.observations[0].values.unsupported = 'Không hợp lệ';
  const revision = (await second.query(api.workspaces.snapshot, { workspaceKey })).revision;
  await assert.rejects(client.mutation(api.records.saveEditor, { workspaceKey, id: fixtureId,
    input: { patient: data.patient, forms: invalid }, templates: latest.templates, expectedRevision: revision }));
  assert.deepEqual((await second.query(api.records.get, { workspaceKey, id: fixtureId })).forms, data.forms);
  const template = await client.mutation(api.templates.create, {
    workspaceKey, template: { id: fixtureId, kind: 'orders', text: fixtureId, group: 'TEST' },
  });
  templateId = template.id;
  assert.ok((await second.query(api.workspaces.snapshot, { workspaceKey })).templates.some(item => item.id === templateId));
  console.log('PASS: two clients share all three forms; stale revisions, old frontends and invalid care data reject without loss');
} finally {
  if (templateId) await client.mutation(api.templates.remove, { workspaceKey, id: templateId });
  if (created) await client.mutation(api.records.remove, { workspaceKey, id: fixtureId });
  console.log('Cleaned up only this run’s synthetic fixtures.');
}
