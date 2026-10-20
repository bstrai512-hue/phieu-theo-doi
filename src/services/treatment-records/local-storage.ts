import { createLocalCareDefaults } from './care-defaults-local';
import type { TreatmentRecord, TreatmentRecordInput, TreatmentServices } from './contracts';
import { defaults, parseData, validData, validTemplates } from './model';
import type { Template } from './model';
import { recordInput, readRecord } from './contracts';
import { summarizeRecord } from './episodes';

const KEY = 'treatment-services-v1';
const LEGACY_KEY = 'treatment-quick-entry-v1';
type Store = { version: 1 | 2; records: TreatmentRecord[]; templates: Template[] };
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;

function validRecord(value: TreatmentRecordInput): boolean {
  return validData({ version: 2, ...value, templates: [] });
}

/** Reads legacy data without deleting it. A failed write never changes stored data. */
export function createLocalTreatmentServices(storage: StorageAccess): TreatmentServices {
  let initial: Store | undefined;

  function read(): Store {
    const raw = storage().getItem(KEY);
    if (raw !== null) {
      const value = JSON.parse(raw) as Store;
      if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.records)
        || !validTemplates(value.templates) || new Set(value.templates.map(t => t.id)).size !== value.templates.length) throw new Error('Dữ liệu lưu trên thiết bị không hợp lệ');
      const records = value.records.map(readRecord);
      if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Mã đợt bị trùng');
      return { version: 2, records, templates: value.templates };
    }
    if (!initial) {
      const legacy = storage().getItem(LEGACY_KEY);
      const data = legacy === null ? defaults() : parseData(JSON.parse(legacy));
      initial = {
        version: 2,
        records: [{ id: 'current', ...recordInput(data) }],
        templates: data.templates,
      };
    }
    return structuredClone(initial);
  }

  function write(value: Store) {
    const previous = storage().getItem(KEY);
    if (previous && !storage().getItem('treatment-services-before-v2')) storage().setItem('treatment-services-before-v2', previous);
    storage().setItem(KEY, JSON.stringify({ ...value, version: 2 }));
  }

  function recordIndex(store: Store, id: string) {
    const index = store.records.findIndex(record => record.id === id);
    if (index < 0) throw new Error('Không tìm thấy phiếu điều trị');
    return index;
  }

  function templateIndex(store: Store, id: string) {
    const index = store.templates.findIndex(template => template.id === id);
    if (index < 0) throw new Error('Không tìm thấy mẫu nội dung');
    return index;
  }

  function checkedTemplate(value: Template): Template {
    if (!validTemplates([value])) throw new Error('Nội dung mẫu không hợp lệ');
    return value;
  }

  return {
    storage: 'local',
    careDefaults: createLocalCareDefaults(storage),
    records: {
      async list() {
        return read().records.map(summarizeRecord);
      },
      async get(id) {
        const store = read();
        return { id, ...recordInput(store.records[recordIndex(store, id)]) };
      },
      async create(input) {
        if (!validRecord(input)) throw new Error('Phiếu điều trị không hợp lệ');
        const store = read();
        const record: TreatmentRecord = { ...input, id: crypto.randomUUID() };
        store.records.push(record);
        write(store);
        return structuredClone(record);
      },
      async update(id, input) {
        const store = read();
        const index = recordIndex(store, id);
        const record = { ...store.records[index], ...input, id };
        if (!validRecord(record)) throw new Error('Phiếu điều trị không hợp lệ');
        store.records[index] = record;
        write(store);
      },
      async remove(id) {
        const store = read();
        store.records.splice(recordIndex(store, id), 1);
        write(store);
      },
    },
    templates: {
      async list() { return read().templates; },
      async create(input) {
        const store = read();
        const id = input.id ?? crypto.randomUUID();
        if (store.templates.some(template => template.id === id)) throw new Error('Mã mẫu đã tồn tại');
        const template = checkedTemplate({ ...input, id });
        store.templates.push(template);
        write(store);
        return structuredClone(template);
      },
      async update(id, input) {
        const store = read();
        const index = templateIndex(store, id);
        store.templates[index] = checkedTemplate({ ...store.templates[index], ...input, id });
        write(store);
      },
      async remove(id) {
        const store = read();
        store.templates.splice(templateIndex(store, id), 1);
        write(store);
      },
    },
  };
}
