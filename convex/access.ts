import { ConvexError } from 'convex/values';
import type { QueryCtx } from './_generated/server';
import type { MutationCtx } from './_generated/server';

export const SHARED_WORKSPACE = 'shared';
export function sharedKey(key: string) { checkKey(key); return SHARED_WORKSPACE; }

export function checkKey(key: string) {
  if (key !== SHARED_WORKSPACE && !/^[a-f0-9]{64}$/.test(key)) throw new ConvexError('Workspace không hợp lệ');
}

export async function findWorkspace(ctx: QueryCtx, key: string) {
  return ctx.db.query('workspaces').withIndex('by_key', q => q.eq('key', sharedKey(key))).unique();
}

export async function requireWorkspace(ctx: QueryCtx, key: string) {
  if (!await findWorkspace(ctx, key)) throw new ConvexError('Không tìm thấy workspace');
}

export async function requireRecord(ctx: QueryCtx, workspaceKey: string, id: string) {
  workspaceKey = sharedKey(workspaceKey);
  await requireWorkspace(ctx, workspaceKey);
  const record = await ctx.db.query('treatmentRecords')
    .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', id)).unique();
  if (!record) throw new ConvexError('Không tìm thấy phiếu điều trị');
  return record;
}

export async function requireTemplate(ctx: QueryCtx, workspaceKey: string, id: string) {
  workspaceKey = sharedKey(workspaceKey);
  await requireWorkspace(ctx, workspaceKey);
  const template = await ctx.db.query('templates')
    .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', id)).unique();
  if (!template) throw new ConvexError('Không tìm thấy mẫu nội dung');
  return template;
}

export async function checkRevision(ctx: QueryCtx, key: string, expected?: number) {
  const workspace = await findWorkspace(ctx, key);
  if (!workspace) throw new ConvexError('Không tìm thấy dữ liệu chung');
  if (expected !== undefined && expected !== (workspace.revision ?? 0)) {
    throw new ConvexError('Dữ liệu đã thay đổi trên thiết bị khác. Bản nháp của bạn được giữ lại.');
  }
  return workspace;
}

export async function bumpRevision(ctx: MutationCtx, key: string) {
  const workspace = await checkRevision(ctx, key);
  const revision = (workspace.revision ?? 0) + 1;
  await ctx.db.patch(workspace._id, { revision });
  return revision;
}
