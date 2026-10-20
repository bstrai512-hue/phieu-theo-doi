import { careGroups } from "./model";
import type { CareKey, CareObservation } from "./model";
import {
  careConventions,
  careValueIssue,
  selectedCareCodes,
  splitCareDetail,
} from "./care-conventions";

export type CareDefaults = { values: Partial<Record<CareKey, string>> };
export type CareDefaultsSnapshot = { revision: number; value: CareDefaults };
export const emptyCareDefaults = (): CareDefaults => ({ values: {} });
const keys = new Set<string>(
  careGroups.flatMap((group) => group.fields.map(([key]) => key)),
);
export function careDefaultsIssues(input: CareDefaults): string[] {
  return careGroups.flatMap((group) =>
    group.fields.flatMap(([key, label]) => {
      const raw = input.values[key] ?? "";
      if (!raw) return [];
      const definition = careConventions[key];
      const { code } = splitCareDetail(raw);
      let issue = careValueIssue(key, raw);
      if (
        definition.kind === "choice" &&
        !definition.options.some((option) => option.code === code)
      )
        issue = "Chọn mã theo quy ước";
      if (
        definition.kind === "multiple" &&
        selectedCareCodes(definition, raw) === null
      )
        issue = "Chọn mã can thiệp theo quy ước";
      if (
        definition.kind === "number" &&
        !(definition.decimal ? /^-?\d+(?:\.\d+)?$/ : /^-?\d+$/).test(code)
      )
        issue = "Nhập giá trị số hợp lệ";
      if (definition.kind === "pressure" && !/^\d+\s*\/\s*\d+$/.test(raw))
        issue = "Nhập đầy đủ tâm thu và tâm trương";
      return issue ? [`${label}: ${issue}`] : [];
    }),
  );
}
export function validCareDefaults(value: unknown): value is CareDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const values = (value as CareDefaults).values;
  return (
    !!values &&
    typeof values === "object" &&
    !Array.isArray(values) &&
    Object.entries(values).every(
      ([key, item]) => keys.has(key) && typeof item === "string",
    ) &&
    careDefaultsIssues(value as CareDefaults).length === 0
  );
}
export function cleanCareDefaults(value: CareDefaults): CareDefaults {
  return {
    values: Object.fromEntries(
      Object.entries(value.values).filter(
        ([, item]) => typeof item === "string" && item !== "",
      ),
    ),
  };
}
export function careDefaultsEditorValues(value: CareDefaults): CareDefaults {
  return {
    values: Object.fromEntries(
      careGroups.flatMap((group) =>
        group.fields.map(([key]) => [key, value.values[key] ?? ""]),
      ),
    ),
  };
}
export function makeCareObservation(
  defaults: CareDefaults,
  time: string,
): CareObservation {
  return {
    id: crypto.randomUUID(),
    time,
    values: structuredClone(cleanCareDefaults(defaults).values),
  };
}
