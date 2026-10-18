import type { Data, Patient, Row, Template } from './model';

export type TreatmentRecordInput = {
  patient: Patient;
  rows: Row[];
  dayPatients?: Record<string, Patient>;
};
export type TreatmentRecord = TreatmentRecordInput & { id: string };
export type TreatmentRecordSummary = { id: string; patientName: string };
// An optional caller ID preserves IDs when importing an existing JSON backup.
export type TemplateInput = Omit<Template, 'id'> & { id?: string };

/** IDs are opaque. Missing IDs and invalid input reject with Error. */
export interface TreatmentRecords {
  list(): Promise<TreatmentRecordSummary[]>;
  get(id: string): Promise<TreatmentRecord>;
  create(input: TreatmentRecordInput): Promise<TreatmentRecord>;
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
  saveEditorData?(id: string, data: Data): Promise<void>;
}

export function recordInput(data: TreatmentRecordInput): TreatmentRecordInput {
  return { patient: data.patient, rows: data.rows, dayPatients: data.dayPatients };
}
