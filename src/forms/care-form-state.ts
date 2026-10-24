import { formValuesKey, patchFormValue } from "./form-values";
import type { FieldPath, FieldPathValue } from "react-hook-form";
import { careGroups } from "./model";
import type { CareData } from '../types';

/** All RHF controls start with defined values, including fields on hidden time points. */
export function careEditorValues(data: CareData): CareData {
  return {
    ...structuredClone(data),
    observations: data.observations.map((observation) => ({
      ...observation,
      values: {
        ...observation.values,
        ...Object.fromEntries(
          careGroups.flatMap((group) =>
            group.fields.map(([key]) => [key, observation.values[key] ?? ""]),
          ),
        ),
      },
    })),
  };
}

/** Patch just the edited path; other forms and concurrently updated care fields stay intact. */
export function updateCareField<Name extends FieldPath<CareData>>(
  data: CareData,
  name: Name,
  value: FieldPathValue<CareData, Name>,
): CareData {
  const next = patchFormValue(data, name, value);
  if (next === data) return data;
  // Untouched controls in appended/shifted arrays may be undefined inside RHF.
  // Storage represents those fields by absence, never a non-string value.
  next.observations = next.observations.map((observation) => ({
    ...observation,
    values: Object.fromEntries(
      Object.entries(observation.values).filter(
        ([, item]) => item !== undefined,
      ),
    ),
  }));
  return next;
}

/** Object key order can differ between a local draft and a Convex acknowledgement. */
export function careEditorKey(data: CareData): string {
  return formValuesKey(careEditorValues(data));
}
