import type { Workspace } from '../../types';

const key = (storage: 'local' | 'cloud') => `selected-workspace-v1:${storage}`;
export function rememberedWorkspace(storage: Pick<Storage, 'getItem'>, mode: 'local' | 'cloud', items: Workspace[]) {
  const selected = storage.getItem(key(mode));
  return items.find(item => item.key === selected) ?? null;
}
export function rememberWorkspace(storage: Pick<Storage, 'setItem'>, mode: 'local' | 'cloud', workspace: Workspace) {
  storage.setItem(key(mode), workspace.key);
}

/** Never leave a mounted editor until all of its save guards succeed. */
export async function selectWorkspace(
  next: Workspace,
  beforeLeave: () => Promise<boolean>,
  remember: (workspace: Workspace) => void,
  activate: (workspace: Workspace) => void,
) {
  if (!await beforeLeave()) return false;
  remember(next);
  activate(next);
  return true;
}
