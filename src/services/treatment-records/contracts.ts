import type { Data, Patient, Row, Template } from './model';

export type TreatmentRecordInput = {
  patient: Patient;
  rows: Row[];
  dayPatients?: Record<string, Patient>;
  status?: 'active' | 'completed';
  startedOn?: string;
  endedOn?: string | null;
};
export type TreatmentRecord = TreatmentRecordInput & { id: string; workspaceRevision?: number };
export type TreatmentSnapshot = { revision: number; records: TreatmentRecord[]; templates: Template[] };
export type TreatmentRecordSummary = {
  id: string; patientName: string; patientCode: string; admission: string;
  startedOn: string; status: 'active' | 'completed';
};
// An optional caller ID preserves IDs when importing an existing JSON backup.
export type TemplateInput = Omit<Template, 'id'> & { id?: string };

/** IDs are opaque. Missing IDs and invalid input reject with Error. */
export interface TreatmentRecords {
  list(): Promise<TreatmentRecordSummary[]>;
  get(id: string): Promise<TreatmentRecord>;
  create(input: TreatmentRecordInput, expectedRevision?: number): Promise<TreatmentRecord>;
  update(id: string, input: Partial<TreatmentRecordInput>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface Templates {
  list(): Promise<Template[]>;
  create(input: TemplateInput): Promise<Template>;
  update(id: string, input: Partial<TemplateInput>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface TreatmentServices {
  storage?: 'local' | 'cloud';
  records: TreatmentRecords;
  templates: Templates;
  /** Optional atomic operation for adapters that support transactions. */
  saveEditorData?(id: string, data: Data, expectedRevision?: number): Promise<number | void>;
  snapshot?(): Promise<TreatmentSnapshot>;
  watch?(onChange: (snapshot: TreatmentSnapshot) => void, onError: () => void): () => void;
  saveTemplates?(templates: Template[], expectedRevision?: number): Promise<number>;
}

export function recordInput(data: TreatmentRecordInput): TreatmentRecordInput {
  return {
    patient: data.patient, rows: data.rows, dayPatients: data.dayPatients,
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.startedOn !== undefined ? { startedOn: data.startedOn } : {}),
    ...(data.endedOn !== undefined ? { endedOn: data.endedOn } : {}),
  };
}
