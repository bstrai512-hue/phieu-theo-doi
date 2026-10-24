import type { Workspace } from '../../types';

export const SHARED_WORKSPACE: Workspace = { key: 'shared', name: 'Dữ liệu chung', slug: 'du-lieu-chung' };
export const workspaceName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
export const workspaceNameKey = (value: string) => workspaceName(value).toLowerCase();
export function checkedWorkspaceName(value: string) {
  const name = workspaceName(value);
  if (!name || name.length > 100) throw new Error('Tên Khoa cần từ 1 đến 100 ký tự.');
  return name;
}
export function newWorkspaceKey() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
}
export function workspaceLabel(key: string, name?: string) {
  return key === SHARED_WORKSPACE.key ? SHARED_WORKSPACE.name : name || `Khoa chưa đặt tên (${key.slice(0, 8)})`;
}

export function slugFromName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/g, '') || 'khoa';
}
export function checkedWorkspaceSlug(value: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80 || value === 'shared' || /^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Slug cần 1–80 ký tự: chữ thường không dấu, số và dấu gạch ngang.');
  }
  return value;
}
export function withWorkspaceSlugs(items: Workspace[]): Workspace[] {
  const used = new Set(items.flatMap(item => item.slug ? [item.slug] : []));
  return items.map(item => {
    if (item.slug) return item;
    const base = slugFromName(item.name);
    let slug = base, suffix = 1;
    while (used.has(slug) || slug === 'shared' || /^[a-f0-9]{64}$/.test(slug)) slug = `${base.slice(0, 70)}-${++suffix}`;
    used.add(slug);
    return { ...item, slug };
  });
}
export function resolveWorkspace(items: Workspace[], segment: string) {
  return items.find(item => item.key === segment) ?? items.find(item => item.slug === segment);
}
