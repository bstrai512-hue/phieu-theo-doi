import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireTemplate, requireWorkspace, sharedKey, bumpRevision, checkRevision } from './access';
import { template, templatePatch } from './validators';

export const list = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    workspaceKey = sharedKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    const items = await ctx.db.query('templates')
      .withIndex('by_workspace', q => q.eq('workspaceKey', workspaceKey)).collect();
    return items.map(({ id, kind, text, group }) => ({ id, kind, text, group }));
  },
});
export const create = mutation({
  args: { workspaceKey: v.string(), template },
  handler: async (ctx, { workspaceKey, template: item }) => {
    workspaceKey = sharedKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    const existing = await ctx.db.query('templates')
      .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', item.id)).unique();
    if (existing) throw new ConvexError('Mã mẫu đã tồn tại');
    await ctx.db.insert('templates', { workspaceKey, ...item });
    await bumpRevision(ctx, workspaceKey);
    return item;
  },
});
export const update = mutation({
  args: { workspaceKey: v.string(), id: v.string(), input: templatePatch },
  handler: async (ctx, { workspaceKey, id, input }) => {
    workspaceKey = sharedKey(workspaceKey);
    const item = await requireTemplate(ctx, workspaceKey, id);
    await ctx.db.patch(item._id, input);
    return await bumpRevision(ctx, workspaceKey);
  },
});
export const remove = mutation({
  args: { workspaceKey: v.string(), id: v.string() },
  handler: async (ctx, { workspaceKey, id }) => {
    workspaceKey = sharedKey(workspaceKey);
    const item = await requireTemplate(ctx, workspaceKey, id);
    await ctx.db.delete(item._id);
    return await bumpRevision(ctx, workspaceKey);
  },
});

export const replaceAll = mutation({
  args: { workspaceKey: v.string(), templates: v.array(template), expectedRevision: v.optional(v.number()) },
  handler: async (ctx, { workspaceKey, templates, expectedRevision }) => {
    workspaceKey = sharedKey(workspaceKey);
    await checkRevision(ctx, workspaceKey, expectedRevision);
    if (new Set(templates.map(item => item.id)).size !== templates.length) throw new ConvexError('Mã mẫu bị trùng');
    const current = await ctx.db.query('templates').withIndex('by_workspace', q => q.eq('workspaceKey', workspaceKey)).collect();
    const target = new Map(templates.map(item => [item.id, item]));
    for (const previous of current) {
      const next = target.get(previous.id);
      if (!next) await ctx.db.delete(previous._id);
      else { await ctx.db.patch(previous._id, next); target.delete(previous.id); }
    }
    for (const next of target.values()) await ctx.db.insert('templates', { workspaceKey, ...next });
    return await bumpRevision(ctx, workspaceKey);
  },
});
