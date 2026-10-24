import { parseData } from './model';
import type { CareTemplateLibrary, CareDefaultsSnapshot, Data, Template, TemplateInput, TreatmentRecord, TreatmentRecordInput, TreatmentRecordSummary, TreatmentSnapshot } from '../../types';

/** IDs are opaque. Missing IDs and invalid input reject with Error. */
export interface TreatmentRecords {
  list(): Promise<TreatmentRecordSummary[]>;
  get(id: string): Promise<TreatmentRecord>;
  create(input: TreatmentRecordInput, expectedRevision?: number): Promise<TreatmentRecord>;
  update(id: string, input: Partial<TreatmentRecordInput>): Promise<void>;
  remove(id: string): Promise<number | void>;
}

export interface Templates {
  list(): Promise<Template[]>;
  create(input: TemplateInput): Promise<Template>;
  update(id: string, input: Partial<TemplateInput>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface CareDefaultsStore {
  get(): Promise<CareDefaultsSnapshot>;
  update(value: CareTemplateLibrary, expectedRevision: number): Promise<CareDefaultsSnapshot>;
  watch?(onChange:(value:CareDefaultsSnapshot)=>void,onError:()=>void):()=>void;
}

export interface TreatmentServices {
  careDefaults: CareDefaultsStore;
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
    patient: data.patient, forms: data.forms,
    ...(data.patientReview ? { patientReview: data.patientReview } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.startedOn !== undefined ? { startedOn: data.startedOn } : {}),
    ...(data.endedOn !== undefined ? { endedOn: data.endedOn } : {}),
  };
}

/** Accept old storage records at the adapter seam; callers always receive v2. */
export function readRecord(value: unknown): TreatmentRecord {
  const raw = value as Record<string, unknown>;
  if (!raw || typeof raw.id !== 'string') throw new Error('Mã đợt không hợp lệ');
  const data = parseData({ ...raw, version: raw.forms ? 2 : 1, templates: [] });
  return { id: raw.id, ...recordInput(data), ...(typeof raw.workspaceRevision === 'number' ? { workspaceRevision: raw.workspaceRevision } : {}) };
}
