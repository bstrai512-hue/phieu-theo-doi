import { recordInput } from './contracts';
import type { TreatmentServices } from './contracts';
import type { Data } from './model';

/** Reconcile the editor's JSON backup shape through the two CRUD interfaces. */
export async function persistEditorData(services: TreatmentServices, id: string, data: Data) {
  await services.records.update(id, recordInput(data));
  const current = await services.templates.list();
  for (const template of current) {
    if (!data.templates.some(item => item.id === template.id)) await services.templates.remove(template.id);
  }
  for (const template of data.templates) {
    const existing = current.find(item => item.id === template.id);
    if (!existing) await services.templates.create(template);
    else if (existing.kind !== template.kind || existing.text !== template.text || existing.group !== template.group) {
      await services.templates.update(template.id, template);
    }
  }
}
