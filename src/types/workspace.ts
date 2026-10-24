/** A department owns its records and template libraries. */
export type Workspace = { key: string; name: string; slug?: string };

export type WorkspaceSettings = { department: string; rooms: string[]; beds: string[] };
export type WorkspaceSettingsSnapshot = { revision: number; value: WorkspaceSettings };
