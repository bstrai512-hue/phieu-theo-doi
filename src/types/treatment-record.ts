import type { Forms } from './forms';
import type { Patient, PatientReview } from './patient';
import type { Template } from './template';

export type TreatmentStatus = 'active' | 'completed';

export type TreatmentRecordInput = {
  patient: Patient;
  forms: Forms;
  patientReview?: PatientReview;
  status?: TreatmentStatus;
  startedOn?: string;
  endedOn?: string | null;
};

export type TreatmentRecord = TreatmentRecordInput & {
  id: string;
  workspaceRevision?: number;
};

export type TreatmentSnapshot = {
  revision: number;
  records: TreatmentRecord[];
  templates: Template[];
};

export type TreatmentRecordSummary = {
  id: string;
  patientName: string;
  patientCode: string;
  admission: string;
  startedOn: string;
  status: TreatmentStatus;
};

/** Editor and JSON backup payload; templates are stored separately by adapters. */
export type Data = TreatmentRecordInput & {
  version: 2;
  templates: Template[];
};
