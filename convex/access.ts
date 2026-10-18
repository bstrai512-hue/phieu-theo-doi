import { ConvexError } from 'convex/values';
import type { QueryCtx } from './_generated/server';

export function checkKey(key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new ConvexError('Mã workspace không hợp lệ');
}

export async function findWorkspace(ctx: QueryCtx, key: string) {
  checkKey(key);
  return ctx.db.query('workspaces').withIndex('by_key', q => q.eq('key', key)).unique();
}

export async function requireWorkspace(ctx: QueryCtx, key: string) {
  if (!await findWorkspace(ctx, key)) throw new ConvexError('Không tìm thấy workspace');
}

export async function requireRecord(ctx: QueryCtx, workspaceKey: string, id: string) {
  await requireWorkspace(ctx, workspaceKey);
  const record = await ctx.db.query('treatmentRecords')
    .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', id)).unique();
  if (!record) throw new ConvexError('Không tìm thấy phiếu điều trị');
  return record;
}

export async function requireTemplate(ctx: QueryCtx, workspaceKey: string, id: string) {
  await requireWorkspace(ctx, workspaceKey);
  const template = await ctx.db.query('templates')
    .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', id)).unique();
  if (!template) throw new ConvexError('Không tìm thấy mẫu nội dung');
  return template;
}
