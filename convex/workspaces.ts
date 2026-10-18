import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { findWorkspace } from './access';
import { record, template } from './validators';

export const exists = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => !!await findWorkspace(ctx, workspaceKey),
});

/** Atomic, idempotent migration. Never overwrites a workspace already on Convex. */
export const initialize = mutation({
  args: { workspaceKey: v.string(), records: v.array(record), templates: v.array(template) },
  handler: async (ctx, { workspaceKey, records, templates }) => {
    if (await findWorkspace(ctx, workspaceKey)) return null;
    if (records.some(item => !item.rows.length)
      || new Set(records.map(item => item.id)).size !== records.length
      || new Set(templates.map(item => item.id)).size !== templates.length) {
      throw new ConvexError('Dữ liệu chuyển lên không hợp lệ');
    }
    await ctx.db.insert('workspaces', { key: workspaceKey });
    for (const item of records) await ctx.db.insert('treatmentRecords', { workspaceKey, ...item });
    for (const item of templates) await ctx.db.insert('templates', { workspaceKey, ...item });
    return null;
  },
});
