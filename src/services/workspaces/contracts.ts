import type { WorkspaceSettings, WorkspaceSettingsSnapshot } from '../../types/workspace';
import type { Workspace } from '../../types';

export interface Workspaces {
  settings(key: string): Promise<WorkspaceSettingsSnapshot>;
  saveSettings(key: string, value: WorkspaceSettings, revision: number): Promise<WorkspaceSettingsSnapshot>;
  rename(key: string, name: string, expectedName: string): Promise<Workspace>;
  changeSlug(key: string, slug: string, expectedSlug: string): Promise<Workspace>;
  list(): Promise<Workspace[]>;
  create(name: string): Promise<Workspace>;
}
