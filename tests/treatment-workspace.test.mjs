import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { createTreatmentWorkspace } from '../src/services/treatment-records/workspace.ts';
import { recordInput } from '../src/services/treatment-records/contracts.ts';
import { defaults } from '../src/services/treatment-records/model.ts';
import { searchEpisodes, summarizeRecord } from '../src/services/treatment-records/episodes.ts';

function setup() {
  const store = new Map();
  const services = createLocalTreatmentServices(() => ({
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  }));
  return { services, workspace: createTreatmentWorkspace(services) };
}
function named(name) {
  const data = defaults();
  data.patient.name = name;
  return { ...recordInput(data), status: 'active', startedOn: '2026-10-19' };
}

test('creating an episode flushes the current draft, retains old episodes and shares templates', async () => {
  const { services, workspace } = setup();
  try {
    await workspace.load();
    const original = workspace.getSnapshot().recordId;
    workspace.setData(data => ({ ...data, patient: { ...data.patient, name: 'Đợt A' },
      templates: [...data.templates, { id: 'shared', kind: 'orders', text: 'Mẫu chung', group: 'Mẫu của tôi' }] }));
    assert.equal(await workspace.newDraft(), true);
    workspace.setData(data=>({...data,...named('Đợt B')}));
    await workspace.flush();
    const second = workspace.getSnapshot().recordId;
    assert.notEqual(second, original);
    assert.equal((await services.records.get(original)).patient.name, 'Đợt A');
    assert.equal(workspace.getSnapshot().data.patient.name, 'Đợt B');
    assert.equal(workspace.getSnapshot().data.templates.length, 12);
    assert.equal(workspace.getSnapshot().records.length, 2);
    assert.equal(await workspace.selectRecord(original), true);
    assert.equal(workspace.getSnapshot().data.patient.name, 'Đợt A');
    assert.equal(workspace.getSnapshot().data.templates.length, 12);
  } finally { workspace.dispose(); }
});

test('a failed flush blocks selection and creation, keeps the draft and allows retry', async () => {
  const { services } = setup();
  const other = await services.records.create(named('Đợt B'));
  const update = services.records.update;
  let fail = true;
  services.records.update = async (...args) => { if (fail) throw new Error('Storage unavailable'); return update(...args); };
  const workspace = createTreatmentWorkspace(services);
  try {
    await workspace.load();
    const original = workspace.getSnapshot().recordId;
    workspace.setData(data => ({ ...data, patient: { ...data.patient, name: 'Bản nháp phải giữ' } }));
    assert.equal(await workspace.selectRecord(other.id), false);
    assert.equal(workspace.getSnapshot().recordId, original);
    assert.equal(workspace.getSnapshot().data.patient.name, 'Bản nháp phải giữ');
    assert.equal(workspace.getSnapshot().storageError, true);
    assert.equal(await workspace.newDraft(), false);
    assert.equal((await services.records.list()).length, 2);
    fail = false;
    assert.equal(await workspace.selectRecord(other.id), true);
    assert.equal((await services.records.get(original)).patient.name, 'Bản nháp phải giữ');
  } finally { workspace.dispose(); }
});

test('switching waits for the latest revision, even with an earlier save in flight', async () => {
  const { services } = setup();
  const other = await services.records.create(named('Đợt B'));
  const update = services.records.update;
  let release;
  let started;
  const gate = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  const writes = [];
  services.records.update = async (id, input) => {
    writes.push(input.patient.name);
    if (writes.length === 1) { started(); await gate; }
    return update(id, input);
  };
  const workspace = createTreatmentWorkspace(services);
  try {
    await workspace.load();
    const original = workspace.getSnapshot().recordId;
    workspace.setData(data => ({ ...data, patient: { ...data.patient, name: 'Lần một' } }));
    const firstSave = workspace.flush();
    await entered;
    workspace.setData(data => ({ ...data, patient: { ...data.patient, name: 'Lần hai' } }));
    const switching = workspace.selectRecord(other.id);
    assert.equal(workspace.getSnapshot().recordId, original);
    assert.equal(workspace.getSnapshot().busy, true);
    release();
    await firstSave;
    assert.equal(await switching, true);
    assert.deepEqual(writes, ['Lần một', 'Lần hai']);
    assert.equal((await services.records.get(original)).patient.name, 'Lần hai');
    assert.equal(workspace.getSnapshot().data.patient.name, 'Đợt B');
  } finally { release(); workspace.dispose(); }
});

test('completed episodes remain editable and can resume without losing content', async () => {
  const { services, workspace } = setup();
  try {
    await workspace.load();
    const id = workspace.getSnapshot().recordId;
    const row = workspace.getSnapshot().data.forms.treatment.rows[0];
    assert.equal(await workspace.changeStatus('completed'), true);
    assert.equal((await services.records.get(id)).status, 'completed');
    assert.match((await services.records.get(id)).endedOn, /^\d{4}-\d{2}-\d{2}$/);
    workspace.setData(data => ({ ...data, forms: { ...data.forms, treatment: { rows: [{ ...row, progress: 'Chỉnh sửa sau kết thúc' }] } } }));
    await workspace.flush();
    assert.equal((await services.records.get(id)).forms.treatment.rows[0].progress, 'Chỉnh sửa sau kết thúc');
    assert.equal(await workspace.changeStatus('active'), true);
    assert.equal((await services.records.get(id)).endedOn, null);
    assert.equal((await services.records.get(id)).forms.treatment.rows[0].progress, 'Chỉnh sửa sau kết thúc');
  } finally { workspace.dispose(); }
});

test('initial loads and opening blank drafts never create empty records', async () => {
  const { services } = setup();
  await services.records.remove('current');
  const workspace = createTreatmentWorkspace(services);
  try {
    await Promise.all([workspace.load(), workspace.load()]);
    assert.equal((await services.records.list()).length, 0);
    await workspace.newDraft();
    assert.equal((await services.records.list()).length, 0);
    workspace.setData(data=>({...data,patient:{...data.patient,name:'Nhập trực tiếp'}}));
    await workspace.flush();
    assert.equal((await services.records.list()).length, 1);
  } finally { workspace.dispose(); }
});

test('summaries use shared patient information and infer active status and start date', () => {
  const data = defaults();
  data.forms.treatment.rows[0].time = '2026-10-19T08:00';
  data.patient = { ...data.patient, name: 'Đặng Thị An', code: 'BN001', admission: 'VV002' };
  const summary = summarizeRecord({ id: 'legacy', ...recordInput(data) });
  assert.equal(summary.patientName, 'Đặng Thị An');
  assert.equal(summary.status, 'active');
  assert.equal(summary.startedOn, '2026-10-19');
  assert.equal(searchEpisodes([summary], 'dang thi', 'active').length, 1);
  assert.equal(searchEpisodes([summary], 'bn001', 'all').length, 1);
  assert.equal(searchEpisodes([summary], 'vv002', 'all').length, 1);
  assert.equal(searchEpisodes([summary], '', 'completed').length, 0);
});

test('typing while the first draft save is in flight creates exactly one episode and keeps the latest input', async () => {
  const { services } = setup();
  await services.records.remove('current');
  const create = services.records.create;
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let creates = 0;
  services.records.create = async (...args) => { creates++; entered(); await gate; return create(...args); };
  const workspace = createTreatmentWorkspace(services);
  try {
    await workspace.load();
    const key = workspace.getSnapshot().viewKey;
    workspace.setData(data=>({...data,patient:{...data.patient,name:'Nội dung đầu'}}));
    const first = workspace.flush(); await started;
    workspace.setData(data=>({...data,patient:{...data.patient,name:'Nội dung mới nhất'}}));
    const second = workspace.flush(); release(); await Promise.all([first,second]);
    assert.equal(creates,1);
    assert.equal(workspace.getSnapshot().viewKey,key, 'saving must not remount the active form');
    const records = await services.records.list();
    assert.equal(records.length,1);
    assert.equal((await services.records.get(records[0].id)).patient.name,'Nội dung mới nhất');
  } finally { release(); workspace.dispose(); }
});

async function realtimeSetup() {
  const { services: local } = setup();
  let version = 0;
  const listeners = new Set();
  const snapshot = async () => ({revision:version,records:await Promise.all((await local.records.list()).map(item=>local.records.get(item.id))),templates:await local.templates.list()});
  const {persistEditorData} = await import('../src/services/treatment-records/editor-data.ts');
  const services = {...local, records: {...local.records, async remove(id) {
    await local.records.remove(id); version++;
    const next = await snapshot(); listeners.forEach(listener=>listener(next)); return version;
  }}, snapshot, watch(listener) { listeners.add(listener); return ()=>listeners.delete(listener); },
    async saveEditorData(id,data,expected) {
      if(expected!==version)throw new Error('Conflict');
      await persistEditorData(local,id,data); version++;
      const next=await snapshot(); listeners.forEach(listener=>listener(next)); return version;
    }};
  const first=createTreatmentWorkspace(services), second=createTreatmentWorkspace(services);
  await Promise.all([first.load(),second.load()]); first.start(); second.start(); await Promise.resolve();
  return {first,second,local};
}

test('two connected editors receive saved changes immediately without reloading',async()=>{
  const {first,second}=await realtimeSetup();
  try {
    first.setData(data=>({...data,patient:{...data.patient,name:'Đồng bộ trực tiếp'}})); await first.flush();
    assert.equal(second.getSnapshot().data.patient.name,'Đồng bộ trực tiếp');
    assert.equal(second.getSnapshot().records[0].patientName,'Đồng bộ trực tiếp');
  } finally {first.dispose();second.dispose();}
});

test('realtime changes preserve dirty drafts and require an explicit conflict decision',async()=>{
  const {first,second,local}=await realtimeSetup();
  try {
    second.setData(data=>({...data,patient:{...data.patient,name:'Bản nháp máy hai'}}));
    first.setData(data=>({...data,patient:{...data.patient,name:'Đã lưu máy một'}}));await first.flush();
    assert.equal(second.getSnapshot().conflict,true);
    assert.equal(second.getSnapshot().data.patient.name,'Bản nháp máy hai');
    await assert.rejects(second.flush());
    await second.resolveConflict(true);
    assert.equal((await local.records.get('current')).patient.name,'Bản nháp máy hai');
    assert.equal(first.getSnapshot().data.patient.name,'Bản nháp máy hai');
  } finally {first.dispose();second.dispose();}
});


test('deleting the open episode retains other episodes and templates and opens an unsaved blank', async () => {
  const {services, workspace} = setup();
  const other = await services.records.create(named('Giữ lại'));
  try {
    await workspace.load();
    const deleted = workspace.getSnapshot().recordId;
    workspace.setData(data=>({...data,templates:[...data.templates,{id:'keep',kind:'orders',text:'Giữ mẫu',group:'Mẫu của tôi'}]}));
    assert.equal(await workspace.deleteRecord(),true);
    assert.equal(workspace.getSnapshot().recordId,null);
    assert.equal(workspace.getSnapshot().data.patient.name,'');
    assert.equal(workspace.getSnapshot().data.templates.at(-1).id,'keep');
    assert.deepEqual((await services.records.list()).map(item=>item.id),[other.id]);
    await workspace.flush();
    await assert.rejects(services.records.get(deleted));
    assert.equal((await services.templates.list()).at(-1).id,'keep');
  } finally {workspace.dispose();}
});

test('a failed deletion keeps the current episode and can be retried',async()=>{
  const {services,workspace}=setup();
  const remove=services.records.remove;
  try {
    await workspace.load();
    const before=workspace.getSnapshot();
    services.records.remove=async()=>{throw new Error('Offline');};
    assert.equal(await workspace.deleteRecord(),false);
    assert.equal(workspace.getSnapshot().recordId,before.recordId);
    assert.deepEqual(workspace.getSnapshot().data,before.data);
    assert.match(workspace.getSnapshot().actionError,/Không thể xóa/);
    services.records.remove=remove;
    assert.equal(await workspace.deleteRecord(),true);
    assert.equal((await services.records.list()).length,0);
  } finally {workspace.dispose();}
});

test('remote deletion opens a blank in a clean editor and never recreates the episode',async()=>{
  const {first,second,local}=await realtimeSetup();
  try {
    assert.equal(await first.deleteRecord(),true);
    assert.equal(second.getSnapshot().recordId,null);
    await second.flush();
    assert.equal((await local.records.list()).length,0);
  } finally {first.dispose();second.dispose();}
});

test('remote deletion preserves a dirty draft as a conflict without recreating deleted data',async()=>{
  const {first,second,local}=await realtimeSetup();
  try {
    second.setData(data=>({...data,patient:{...data.patient,name:'Bản nháp máy hai'}}));
    assert.equal(await first.deleteRecord(),true);
    assert.equal(second.getSnapshot().conflict,true);
    assert.equal(second.getSnapshot().data.patient.name,'Bản nháp máy hai');
    await assert.rejects(second.flush());
    await second.resolveConflict(false);
    assert.equal(second.getSnapshot().recordId,null);
    assert.equal((await local.records.list()).length,0);
  } finally {first.dispose();second.dispose();}
});

test('entering only infusion or care data creates an episode and retains all forms after switching', async () => {
  const { makeInfusion } = await import('../src/forms/model.ts');
  for (const kind of ['infusion', 'care']) {
    const { services, workspace } = setup();
    try {
      await workspace.load();
      await workspace.newDraft();
      workspace.setData(data => ({ ...data, forms: { ...data.forms, [kind]: kind === 'infusion'
        ? { rows: [{ ...makeInfusion('2026-10-20'), fluid: 'Dịch thử' }] }
        : { ...data.forms.care, observations: [{ id: 'obs', time: '2026-10-20T08:00', values: { pulse: '80' } }] } } }));
      await workspace.flush();
      const id = workspace.getSnapshot().recordId;
      assert.ok(id);
      const before = (await services.records.get(id)).forms;
      await workspace.newDraft();
      assert.equal(await workspace.selectRecord(id), true);
      assert.deepEqual(workspace.getSnapshot().data.forms, before);
    } finally { workspace.dispose(); }
  }
});
