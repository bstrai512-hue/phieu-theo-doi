import { recordInput } from './contracts';
import type { TreatmentRecord, TreatmentRecordInput, TreatmentServices } from './contracts';
import { defaults, validData, validTemplates } from './model';
import type { Template } from './model';

const KEY = 'treatment-services-v1';
const LEGACY_KEY = 'treatment-quick-entry-v1';
type Store = { version: 1; records: TreatmentRecord[]; templates: Template[] };
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;

function validRecord(value: TreatmentRecordInput): boolean {
  return validData({ version: 1, ...value, templates: [] });
}

/** Reads legacy data without deleting it. A failed write never changes stored data. */
export function createLocalTreatmentServices(storage: StorageAccess): TreatmentServices {
  let initial: Store | undefined;

  function read(): Store {
    const raw = storage().getItem(KEY);
    if (raw !== null) {
      const value = JSON.parse(raw) as Store;
      if (!value || value.version !== 1 || !Array.isArray(value.records)
        || !value.records.every(record => record && typeof record.id === 'string' && validRecord(record))
        || !validTemplates(value.templates)
        || new Set(value.records.map(record => record.id)).size !== value.records.length
        || new Set(value.templates.map(template => template.id)).size !== value.templates.length) {
        throw new Error('Dữ liệu lưu trên thiết bị không hợp lệ');
      }
      return value;
    }
    if (!initial) {
      const legacy = storage().getItem(LEGACY_KEY);
      const data: unknown = legacy === null ? defaults() : JSON.parse(legacy);
      if (!validData(data)) throw new Error('Dữ liệu cũ không hợp lệ; chưa thay đổi dữ liệu đã lưu');
      initial = {
        version: 1,
        records: [{ id: 'current', patient: data.patient, rows: data.rows, dayPatients: data.dayPatients }],
        templates: data.templates,
      };
    }
    return structuredClone(initial);
  }

  function write(value: Store) {
    storage().setItem(KEY, JSON.stringify(value));
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
    records: {
      async list() {
        return read().records.map(record => ({ id: record.id, patientName: record.patient.name }));
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
