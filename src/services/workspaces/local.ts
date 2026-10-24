import { checkedWorkspaceSettings, defaultWorkspaceSettings } from './settings';
import type { Workspace } from '../../types';
import type { Workspaces } from './contracts';
import { checkedWorkspaceSlug, withWorkspaceSlugs, checkedWorkspaceName, newWorkspaceKey, SHARED_WORKSPACE, workspaceNameKey } from './model';

const KEY = 'department-workspaces-v1';
export function createLocalWorkspaces(storage: () => Pick<Storage, 'getItem' | 'setItem'>): Workspaces {
  function read(): Workspace[] {
    const raw = storage().getItem(KEY);
    const items = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(items) || items.some(item => !item || typeof item.key !== 'string'
      || !/^[a-f0-9]{64}$/.test(item.key) || typeof item.name !== 'string' || !item.name.trim())
      || new Set(items.map(item => item.key)).size !== items.length) throw new Error('Không đọc được danh sách Khoa.');
    const migrated = withWorkspaceSlugs([SHARED_WORKSPACE, ...items]).slice(1);
    if (JSON.stringify(migrated) !== JSON.stringify(items)) storage().setItem(KEY, JSON.stringify(migrated));
    return migrated;
  }
  return {
    async settings(key) {
      if (key !== 'shared' && !read().some(item => item.key === key)) throw new Error('Không tìm thấy Khoa.');
      const raw = storage().getItem(`workspace-settings-v1:${key}`);
      return raw ? JSON.parse(raw) : { revision: 0, value: defaultWorkspaceSettings() };
    },
    async saveSettings(key, value, revision) {
      const current = await this.settings(key);
      if (current.revision !== revision) throw new Error('Cấu hình đã thay đổi. Tải lại trước khi lưu.');
      const next = { revision: revision + 1, value: checkedWorkspaceSettings(value) };
      storage().setItem(`workspace-settings-v1:${key}`, JSON.stringify(next));
      return next;
    },
    async rename(key, value, expectedName) {
      if (key === 'shared') throw new Error('Không thể đổi tên Dữ liệu chung.');
      const name = checkedWorkspaceName(value);
      const items = read(); const item = items.find(item => item.key === key);
      if (!item) throw new Error('Không tìm thấy Khoa.');
      if (item.name !== expectedName) throw new Error('Tên Khoa đã thay đổi. Hãy tải lại trang.');
      if ([SHARED_WORKSPACE, ...items].some(item => item.key !== key && workspaceNameKey(item.name) === workspaceNameKey(name))) throw new Error('Tên Khoa đã tồn tại.');
      const next = { ...item, name };
      storage().setItem(KEY, JSON.stringify(items.map(item => item.key === key ? next : item)));
      return next;
    },
    async changeSlug(key, value, expectedSlug) {
      if (key === 'shared') throw new Error('Slug Dữ liệu chung được giữ cố định.');
      const slug = checkedWorkspaceSlug(value), items = read();
      const item = items.find(item => item.key === key);
      if (!item) throw new Error('Không tìm thấy Khoa.');
      if (item.slug !== expectedSlug) throw new Error('Slug đã thay đổi. Hãy tải lại cấu hình.');
      if ([SHARED_WORKSPACE, ...items].some(other => other.key !== key && other.slug === slug)) throw new Error('Slug đã được Khoa khác sử dụng.');
      const next = { ...item, slug };
      storage().setItem(KEY, JSON.stringify(items.map(item => item.key === key ? next : item)));
      return next;
    },
    async list() { return [SHARED_WORKSPACE, ...read()]; },
    async create(value) {
      const name = checkedWorkspaceName(value);
      const items = read();
      if ([SHARED_WORKSPACE, ...items].some(item => workspaceNameKey(item.name) === workspaceNameKey(name))) {
        throw new Error('Tên Khoa đã tồn tại. Hãy chọn Khoa trong danh sách.');
      }
      const item = withWorkspaceSlugs([SHARED_WORKSPACE, ...items, { key: newWorkspaceKey(), name }]).at(-1)!;
      storage().setItem(KEY, JSON.stringify([...items, item]));
      return item;
    },
  };
}
