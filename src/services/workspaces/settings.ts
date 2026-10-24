import type { WorkspaceSettings } from '../../types/workspace';

export const defaultWorkspaceSettings = (): WorkspaceSettings => ({ department: '', rooms: [], beds: Array.from({ length: 55 }, (_, i) => String(i + 1)) });
export function checkedWorkspaceSettings(value: WorkspaceSettings): WorkspaceSettings {
  if (!value || typeof value.department !== 'string' || value.department.length > 100) throw new Error('Tên Khoa mặc định tối đa 100 ký tự.');
  const options = (items: string[]) => {
    if (!Array.isArray(items) || items.length > 300 || items.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 100)) throw new Error('Danh sách tối đa 300 mục, mỗi mục từ 1 đến 100 ký tự.');
    const clean = items.map(item => item.trim());
    if (new Set(clean.map(item => item.toLocaleLowerCase('vi'))).size !== clean.length) throw new Error('Danh sách có mục trùng nhau. Hãy kiểm tra lại.');
    return clean;
  };
  return { department: value.department.trim(), rooms: options(value.rooms), beds: options(value.beds) };
}
