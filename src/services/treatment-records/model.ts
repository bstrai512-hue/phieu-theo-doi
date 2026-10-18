import { dayjs } from '../../lib/date';

export type Kind = 'progress' | 'orders';
export type Template = { id: string; kind: Kind; text: string; group: string };
export type Row = {
  id: string;
  time: string;
  progress: string;
  orders: string;
  session?: 'morning' | 'afternoon';
};
export type Patient = {
  name: string; birth: string; gender: string; code: string; admission: string;
  department: string; room: string; bed: string; diagnosis: string; differential: string;
};
/** JSON backup format remains version 1, independently of the storage adapter. */
export type Data = {
  version: 1;
  patient: Patient;
  rows: Row[];
  templates: Template[];
  dayPatients?: Record<string, Patient>;
  status?: 'active' | 'completed';
  startedOn?: string;
  endedOn?: string | null;
};

export const localTime = () => dayjs().format('YYYY-MM-DDTHH:mm');
export const makeRow = (): Row => ({ id: crypto.randomUUID(), time: localTime(), progress: '', orders: '' });
export const blankPatient: Patient = {
  name: '', birth: '', gender: '', code: '', admission: '', department: '', room: '', bed: '', diagnosis: '', differential: '',
};
const initialTemplates: Template[] = [
  ['progress', 'Tỉnh, tiếp xúc tốt.', 'Toàn trạng'], ['progress', 'Không sốt.', 'Toàn trạng'],
  ['progress', 'Ăn uống được.', 'Toàn trạng'], ['progress', 'Ngủ được.', 'Toàn trạng'],
  ['progress', 'Da, niêm mạc hồng.', 'Thăm khám'], ['progress', 'Tim đều.', 'Thăm khám'],
  ['progress', 'Phổi thông khí đều hai bên.', 'Thăm khám'], ['progress', 'Bụng mềm, không chướng.', 'Thăm khám'],
  ['orders', 'Theo dõi dấu hiệu sinh tồn.', 'Theo dõi'], ['orders', 'Theo dõi tình trạng ăn uống.', 'Theo dõi'],
  ['orders', 'Theo dõi lượng nước tiểu.', 'Theo dõi'],
].map(([kind, text, group], index) => ({ id: `seed-${index}`, kind: kind as Kind, text, group }));

export const defaults = (): Data => ({
  version: 1, patient: { ...blankPatient }, rows: [makeRow()], templates: structuredClone(initialTemplates),
});

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validPatient(value: unknown): value is Patient {
  return object(value) && Object.keys(blankPatient).every(key => typeof value[key] === 'string');
}
export function validTemplates(value: unknown): value is Template[] {
  return Array.isArray(value) && value.every(item => object(item)
    && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.group === 'string'
    && (item.kind === 'progress' || item.kind === 'orders'))
    && new Set(value.map(item => item.id)).size === value.length;
}
export function validData(value: unknown): value is Data {
  return object(value) && value.version === 1 && validPatient(value.patient)
    && (value.status === undefined || value.status === 'active' || value.status === 'completed')
    && (value.startedOn === undefined || typeof value.startedOn === 'string')
    && (value.endedOn === undefined || value.endedOn === null || typeof value.endedOn === 'string')
    && (value.dayPatients === undefined || (object(value.dayPatients) && Object.values(value.dayPatients).every(validPatient)))
    && Array.isArray(value.rows) && value.rows.length > 0
    && value.rows.every(row => object(row)
      && ['id', 'time', 'progress', 'orders'].every(key => typeof row[key] === 'string')
      && (row.session === undefined || row.session === 'morning' || row.session === 'afternoon'))
    && validTemplates(value.templates);
}
