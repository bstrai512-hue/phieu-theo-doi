import type { TreatmentRecord, TreatmentRecordSummary } from '../../types';

/** Old records have no metadata; retain their snapshots and infer the display values. */
export function summarizeRecord(record: TreatmentRecord): TreatmentRecordSummary {
  const days = record.forms.treatment.rows.map(row => row.time.slice(0, 10)).sort();
  const patient = record.patient;
  return {
    id: record.id, patientName: patient.name, patientCode: patient.code, admission: patient.admission,
    startedOn: record.startedOn ?? days[0] ?? '', status: record.status ?? 'active',
  };
}

export function searchEpisodes(records: TreatmentRecordSummary[], query: string, status: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi');
  const needle = normalize(query.trim());
  return records.filter(record => (status === 'all' || record.status === status)
    && normalize(`${record.patientName} ${record.patientCode} ${record.admission}`).includes(needle))
    .sort((a, b) => b.startedOn.localeCompare(a.startedOn) || a.id.localeCompare(b.id));
}
