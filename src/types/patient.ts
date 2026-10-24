export type Patient = {
  name: string;
  birth: string;
  gender: string;
  code: string;
  admission: string;
  department: string;
  room: string;
  bed: string;
  diagnosis: string;
  differential: string;
};

export type PatientReview = {
  base: Patient;
  byDay: Record<string, Patient>;
  resolved: boolean;
};
