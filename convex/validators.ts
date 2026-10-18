import { v } from 'convex/values';

export const patient = v.object({
  name: v.string(), birth: v.string(), gender: v.string(), code: v.string(), admission: v.string(),
  department: v.string(), room: v.string(), bed: v.string(), diagnosis: v.string(), differential: v.string(),
});
export const row = v.object({
  id: v.string(), time: v.string(), progress: v.string(), orders: v.string(),
  session: v.optional(v.union(v.literal('morning'), v.literal('afternoon'))),
});
export const recordFields = {
  patient, rows: v.array(row), dayPatients: v.optional(v.record(v.string(), patient)),
};
export const record = v.object({ id: v.string(), ...recordFields });
export const recordPatch = v.object({
  patient: v.optional(patient), rows: v.optional(v.array(row)), dayPatients: recordFields.dayPatients,
});
export const templateFields = {
  kind: v.union(v.literal('progress'), v.literal('orders')), text: v.string(), group: v.string(),
};
export const template = v.object({ id: v.string(), ...templateFields });
export const templatePatch = v.object({
  kind: v.optional(templateFields.kind), text: v.optional(v.string()), group: v.optional(v.string()),
});
