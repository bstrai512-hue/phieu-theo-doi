import type { SetStateAction } from 'react';
import type { TreatmentRecord, TreatmentRecordInput, TreatmentRecordSummary, TreatmentServices, TreatmentSnapshot } from './contracts';
import { recordInput } from './contracts';
import { defaults, localTime } from './model';
import type { Data } from './model';
import { persistEditorData, persistTemplates } from './editor-data';
import { summarizeRecord } from './episodes';

export type WorkspaceState = {
  data: Data | null; records: TreatmentRecordSummary[]; recordId: string | null; viewKey: string;
  saved: boolean; storageError: boolean; loadError: string; actionError: string; busy: boolean; conflict: boolean;
  storage: 'local' | 'cloud';
};
const stableJson = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const recordJson = (data: TreatmentRecordInput) => stableJson(recordInput(data));
const libraryJson = (templates: Data['templates']) => stableJson([...templates].sort((a,b) => a.id.localeCompare(b.id)));

/** Draft creation, ordered writes and realtime updates share the same save seam. */
export function createTreatmentWorkspace(services: TreatmentServices) {
  let state: WorkspaceState = {
    data: null, records: [], recordId: null, viewKey: 'loading', saved: true, storageError: false,
    loadError: '', actionError: '', busy: false, conflict: false, storage: services.storage ?? 'local',
  };
  const listeners = new Set<() => void>();
  const draftIds = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let loading: Promise<void> | undefined;
  let queue = Promise.resolve();
  let revision = 0;
  let enqueuedRevision = -1;
  let cloudRevision: number | undefined;
  let baselineRecord = '';
  let baselineLibrary = '';
  let saving = false;
  let pending: TreatmentSnapshot | undefined;
  let unsubscribe: (() => void) | undefined;
  let generation = 0;

  function publish(patch: Partial<WorkspaceState>) {
    state = { ...state, ...patch }; listeners.forEach(listener => listener());
  }
  function baseline(data: Data) { baselineRecord = recordJson(data); baselineLibrary = libraryJson(data.templates); }
  function open(record: TreatmentRecord, templates: Data['templates'], records = state.records) {
    revision++;
    const data: Data = { version: 1, ...recordInput(record), templates };
    baseline(data);
    publish({ recordId: record.id, viewKey: record.id, data, records, saved: true, storageError: false, actionError: '', conflict: false });
  }
  function blank(templates: Data['templates']) {
    revision++;
    const data: Data = { ...defaults(), templates, status: 'active', startedOn: localTime().slice(0, 10) };
    baseline(data);
    publish({ recordId: null, viewKey: `draft-${crypto.randomUUID()}`, data, saved: true, storageError: false, actionError: '', conflict: false });
  }
  function applySnapshot(snapshot: TreatmentSnapshot) {
    if (snapshot.revision <= (cloudRevision ?? -1)) return;
    if (state.busy || saving || !state.data) {
      if (!pending || snapshot.revision > pending.revision) pending = snapshot;
      return;
    }
    const record = snapshot.records.find(item => item.id === state.recordId);
    let records = snapshot.records.map(summarizeRecord);
    if (!state.saved) {
      if (state.recordId) {
        const local = summarizeRecord({ id: state.recordId, ...recordInput(state.data) });
        records = records.map(item => item.id === local.id ? local : item);
      }
      const changed = (state.recordId !== null && (!record || recordJson(record) !== baselineRecord))
        || libraryJson(snapshot.templates) !== baselineLibrary;
      if (changed) {
        clearTimeout(timer); pending = snapshot;
        publish({ records, conflict: true, actionError: 'Có thay đổi từ thiết bị khác. Bản nháp của bạn vẫn được giữ; chọn bản muốn tiếp tục.' });
        return;
      }
      cloudRevision = snapshot.revision;
      publish({ records });
      return;
    }
    cloudRevision = snapshot.revision;
    if (state.recordId && record) {
      const data: Data = { version: 1, ...recordInput(record), templates: snapshot.templates };
      baseline(data); publish({ data, records, conflict: false });
    } else if (state.recordId) {
      publish({ records }); blank(snapshot.templates);
    } else {
      const data = { ...state.data, templates: snapshot.templates };
      baseline(data); publish({ data, records });
    }
  }
  function drain() { const next = pending; pending = undefined; if (next) applySnapshot(next); }
  function load() {
    loading ??= (async () => {
      try {
        if (services.snapshot) {
          const snapshot = await services.snapshot(); cloudRevision = snapshot.revision;
          const first = snapshot.records.find(record => record.status !== 'completed') ?? snapshot.records[0];
          const records = snapshot.records.map(summarizeRecord);
          if (first) open(first, snapshot.templates, records);
          else { publish({ records }); blank(snapshot.templates); }
        } else {
          const [records, templates] = await Promise.all([services.records.list(), services.templates.list()]);
          const first = records.find(record => record.status === 'active') ?? records[0];
          if (first) open(await services.records.get(first.id), templates, records);
          else { publish({ records }); blank(templates); }
        }
      } catch (error) { publish({ loadError: error instanceof Error ? error.message : 'Không thể đọc danh sách đợt điều trị' }); }
    })();
    return loading;
  }
  function start() {
    const current = ++generation;
    void load().then(() => {
      if (current !== generation || state.loadError) return;
      unsubscribe?.();
      unsubscribe = services.watch?.(applySnapshot, () => publish({ actionError: 'Chưa nhận được cập nhật trực tiếp. Kiểm tra kết nối mạng hoặc tải lại trang.' }));
    });
  }
  function setData(action: SetStateAction<Data>) {
    if (!state.data || state.busy) return;
    const data = typeof action === 'function' ? action(state.data) : action;
    revision++;
    const summary = state.recordId ? summarizeRecord({ id: state.recordId, ...recordInput(data) }) : null;
    publish({ data, saved: false, records: state.records.map(item => summary && item.id === summary.id ? summary : item) });
    clearTimeout(timer);
    if (!state.conflict) timer = setTimeout(() => { void flush().catch(() => {}); }, 450);
  }
  function flush(): Promise<void> {
    clearTimeout(timer);
    if (state.conflict) return Promise.reject(new Error('Có thay đổi từ thiết bị khác'));
    if (!state.data || state.saved) return Promise.resolve();
    if (enqueuedRevision === revision) return queue;
    const data = state.data, id = state.recordId, viewKey = state.viewKey, version = revision;
    enqueuedRevision = version;
    queue = queue.catch(() => {}).then(async () => {
      saving = true;
      try {
        let targetId = id ?? draftIds.get(viewKey);
        if (!targetId && hasEpisodeContent(data)) {
          const record = await services.records.create(recordInput(data), cloudRevision);
          targetId = record.id; draftIds.set(viewKey, targetId);
          if (record.workspaceRevision !== undefined) cloudRevision = record.workspaceRevision;
          baselineRecord = recordJson(record);
          if (state.viewKey === viewKey) {
            const summary = summarizeRecord({ id: targetId, ...recordInput(state.data ?? data) });
            publish({ recordId: targetId, records: [...state.records.filter(item => item.id !== targetId), summary] });
          }
        }
        if (targetId) {
          const next = await persistEditorData(services, targetId, data, cloudRevision);
          if (typeof next === 'number') cloudRevision = next;
        } else if (libraryJson(data.templates) !== baselineLibrary) {
          if (services.saveTemplates) cloudRevision = await services.saveTemplates(data.templates, cloudRevision);
          else await persistTemplates(services, data.templates);
        }
        baseline(data);
        if (revision === version && state.viewKey === viewKey) publish({ saved: true, storageError: false, actionError: '' });
      } catch (error) {
        if (enqueuedRevision === version) enqueuedRevision = -1;
        if (state.viewKey === viewKey) publish({ saved: false, storageError: true });
        throw error;
      } finally { saving = false; drain(); }
    });
    return queue;
  }
  async function perform(action: () => Promise<void>): Promise<boolean> {
    if (state.busy) return false;
    publish({ busy: true, actionError: '' });
    try { await flush(); await action(); return true; }
    catch {
      if (!state.conflict) publish({ actionError: state.storageError
        ? 'Chưa lưu được đợt đang mở. Hãy thử lưu lại trước khi chuyển hoặc mở mẫu trống.'
        : 'Không thể mở hoặc cập nhật đợt điều trị. Nội dung đang nhập được giữ nguyên; hãy thử lại.' });
      return false;
    } finally { publish({ busy: false }); drain(); }
  }
  function selectRecord(id: string) {
    if (id === state.recordId) return Promise.resolve(true);
    return perform(async () => {
      if (services.snapshot) {
        const snapshot = await services.snapshot();
        const record = snapshot.records.find(item => item.id === id);
        if (!record) throw new Error('Đợt không còn tồn tại');
        cloudRevision = snapshot.revision; open(record, snapshot.templates, snapshot.records.map(summarizeRecord));
      } else {
        const [record, templates] = await Promise.all([services.records.get(id), services.templates.list()]); open(record, templates);
      }
    });
  }
  function newDraft() { return perform(async () => { blank(state.data?.templates ?? []); }); }
  function changeStatus(status: 'active' | 'completed') {
    if (state.busy || !state.recordId) return Promise.resolve(false);
    setData(data => ({ ...data, status, endedOn: status === 'completed' ? localTime().slice(0, 10) : null }));
    return perform(async () => {});
  }
  async function resolveConflict(keepDraft: boolean) {
    const snapshot = pending;
    if (!snapshot) return;
    pending = undefined; cloudRevision = snapshot.revision;
    if (keepDraft) {
      const remote = snapshot.records.find(item => item.id === state.recordId);
      baselineRecord = remote ? recordJson(remote) : '';
      baselineLibrary = libraryJson(snapshot.templates);
      publish({ conflict: false, actionError: '' });
      await flush().catch(() => {});
    } else {
      const record = snapshot.records.find(item => item.id === state.recordId);
      publish({ records: snapshot.records.map(summarizeRecord) });
      if (record) open(record, snapshot.templates); else blank(snapshot.templates);
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load, start, setData, flush, selectRecord, newDraft, changeStatus, resolveConflict,
    dispose() { generation++; clearTimeout(timer); unsubscribe?.(); unsubscribe = undefined; },
  };
}
function hasEpisodeContent(data: Data): boolean {
  const patientHasContent = (patient: Data['patient']) => Object.values(patient).some(value => value.trim());
  return patientHasContent(data.patient) || Object.values(data.dayPatients ?? {}).some(patientHasContent)
    || data.rows.some(row => row.progress.trim() || row.orders.trim());
}
