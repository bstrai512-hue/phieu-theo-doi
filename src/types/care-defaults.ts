import type { CareKey } from './forms';

export type CareDefaults = { values: Partial<Record<CareKey, string>> };
export type CareTemplate = CareDefaults & { id: string; name: string };
export type CareTemplateLibrary = { templates: CareTemplate[]; defaultTemplateId: string | null };
export type CareDefaultsSnapshot = { revision: number; value: CareTemplateLibrary };
