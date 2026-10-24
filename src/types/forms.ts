import type { TreatmentOrders } from './treatment-orders';
export type FormKind = "treatment" | "infusion" | "care";
export type Session = "morning" | "afternoon";
export type TreatmentRow = {
  id: string;
  time: string;
  progress: string;
  orders: TreatmentOrders;
  session?: Session;
};
export type InfusionKey = "date" | "fluid" | "quantity" | "batch" | "rate" | "start" | "end" | "doctor" | "nurse";
export type InfusionRow = { id: string } & Record<InfusionKey, string>;
export type CareKey =
  | "level"
  | "pulse"
  | "temperature"
  | "pressure"
  | "breathing"
  | "spo2"
  | "news"
  | "awareness"
  | "skin"
  | "edema"
  | "dyspnea"
  | "oxygen"
  | "sputum"
  | "pulseQuality"
  | "chestPain"
  | "urine"
  | "stool"
  | "digestionOther"
  | "tubeFeeding"
  | "diet"
  | "selfCare"
  | "assistance"
  | "mobility"
  | "rehabilitation"
  | "wound"
  | "woundState"
  | "pain"
  | "drainage"
  | "braden"
  | "morse"
  | "other"
  | "medication"
  | "clinical"
  | "nursing"
  | "education"
  | "interventionOther"
  | "records"
  | "images"
  | "medications"
  | "transport"
  | "performedBy"
  | "receivedBy";
export type CareObservation = {
  id: string;
  time: string;
  values: Partial<Record<CareKey, string>>;
};
export type CareGoal = {
  id: string;
  text: string;
  achieved: boolean;
};
export type CareDiagnosis = {
  id: string;
  text: string;
  goals: CareGoal[];
};
export type CareData = {
  allergyStatus: "" | "unknown" | "known";
  allergy: string;
  observations: CareObservation[];
  diagnoses: CareDiagnosis[];
};
export type Forms = {
  treatment: {
    rows: TreatmentRow[];
  };
  infusion: {
    rows: InfusionRow[];
  };
  care: CareData;
};
