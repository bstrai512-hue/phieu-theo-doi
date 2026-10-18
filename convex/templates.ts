import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireTemplate, requireWorkspace } from './access';
import { template, templatePatch } from './validators';

export const list = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    await requireWorkspace(ctx, workspaceKey);
    const items = await ctx.db.query('templates')
      .withIndex('by_workspace', q => q.eq('workspaceKey', workspaceKey)).collect();
    return items.map(({ id, kind, text, group }) => ({ id, kind, text, group }));
  },
});
export const create = mutation({
  args: { workspaceKey: v.string(), template },
  handler: async (ctx, { workspaceKey, template: item }) => {
    await requireWorkspace(ctx, workspaceKey);
    const existing = await ctx.db.query('templates')
      .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', item.id)).unique();
    if (existing) throw new ConvexError('Mã mẫu đã tồn tại');
    await ctx.db.insert('templates', { workspaceKey, ...item });
    return item;
  },
});
export const update = mutation({
  args: { workspaceKey: v.string(), id: v.string(), input: templatePatch },
  handler: async (ctx, { workspaceKey, id, input }) => {
    const item = await requireTemplate(ctx, workspaceKey, id);
    await ctx.db.patch(item._id, input);
    return null;
  },
});
export const remove = mutation({
  args: { workspaceKey: v.string(), id: v.string() },
  handler: async (ctx, { workspaceKey, id }) => {
    const item = await requireTemplate(ctx, workspaceKey, id);
    await ctx.db.delete(item._id);
    return null;
  },
});
