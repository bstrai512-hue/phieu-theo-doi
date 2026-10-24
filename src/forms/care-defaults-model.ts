import { careGroups } from "./model";
import type { CareKey, CareObservation, CareDefaults, CareTemplateLibrary } from '../types';
import {
  careConventions,
  careValueIssue,
  selectedCareCodes,
  splitCareDetail,
} from "./care-conventions";


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


export const emptyCareTemplateLibrary = (): CareTemplateLibrary => ({ templates: [], defaultTemplateId: null });

export function migrateCareTemplateLibrary(value: unknown): CareTemplateLibrary {
  if (validCareTemplateLibrary(value)) return structuredClone(value);
  if (!validCareDefaults(value)) throw new Error("Không đọc được thư viện mẫu chăm sóc");
  // A stable ID keeps migration deterministic across reads and devices.
  return { templates: [{ id: "legacy-default", name: "Mẫu mặc định hiện tại", ...cleanCareDefaults(value) }], defaultTemplateId: "legacy-default" };
}

export function validCareTemplateLibrary(value: unknown): value is CareTemplateLibrary {
  if (!value || typeof value !== "object") return false;
  const library = value as CareTemplateLibrary;
  return Array.isArray(library.templates)
    && library.templates.every(t => t && typeof t.id === "string" && !!t.id && typeof t.name === "string" && !!t.name.trim() && validCareDefaults(t))
    && new Set(library.templates.map(t => t.id)).size === library.templates.length
    && (library.defaultTemplateId === null || library.templates.some(t => t.id === library.defaultTemplateId));
}

export function cleanCareTemplateLibrary(value: CareTemplateLibrary): CareTemplateLibrary {
  return { defaultTemplateId: value.defaultTemplateId, templates: value.templates.map(t => ({ id: t.id, name: t.name.trim(), ...cleanCareDefaults(t) })) };
}

/** The last recorded observation wins over any template, including legacy values. */
export function nextCareObservation(previous: CareObservation[], library: CareTemplateLibrary, templateId: string | null, time: string): CareObservation {
  const source = previous.at(-1) ?? library.templates.find(t => t.id === templateId) ?? emptyCareDefaults();
  return makeCareObservation(source, time);
}
