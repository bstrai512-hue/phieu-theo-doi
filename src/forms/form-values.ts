import type { FieldPath, FieldPathValue, FieldValues } from "react-hook-form";

/** Compare content rather than the ordering of keys returned by a storage adapter. */
export function formValuesKey(data: unknown): string {
  return JSON.stringify(data, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
}

export function patchFormValue<
  Data extends FieldValues,
  Name extends FieldPath<Data>,
>(data: Data, name: Name, value: FieldPathValue<Data, Name>): Data {
  const next = structuredClone(data);
  const path = name.split(".");
  let target: Record<string, unknown> = next;
  for (const part of path.slice(0, -1)) {
    const child = target[part];
    if (!child || typeof child !== "object") return data;
    target = child as Record<string, unknown>;
  }
  target[path.at(-1)!] = structuredClone(value);
  return next;
}
