import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireRecord, requireWorkspace } from './access';
import { record, recordFields, recordPatch, template } from './validators';

const args = { workspaceKey: v.string(), id: v.string() };

export const list = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    await requireWorkspace(ctx, workspaceKey);
    const records = await ctx.db.query('treatmentRecords')
      .withIndex('by_workspace', q => q.eq('workspaceKey', workspaceKey)).collect();
    return records.map(item => ({ id: item.id, patientName: item.patient.name }));
  },
});
export const get = query({
  args,
  handler: async (ctx, { workspaceKey, id }) => {
    const item = await requireRecord(ctx, workspaceKey, id);
    return { id: item.id, patient: item.patient, rows: item.rows, dayPatients: item.dayPatients };
  },
});
export const create = mutation({
  args: { workspaceKey: v.string(), record },
  handler: async (ctx, { workspaceKey, record: item }) => {
    await requireWorkspace(ctx, workspaceKey);
    if (!item.rows.length) throw new ConvexError('Phiếu phải có ít nhất một dòng');
    const existing = await ctx.db.query('treatmentRecords')
      .withIndex('by_workspace_id', q => q.eq('workspaceKey', workspaceKey).eq('id', item.id)).unique();
    if (existing) throw new ConvexError('Mã phiếu đã tồn tại');
    await ctx.db.insert('treatmentRecords', { workspaceKey, ...item });
    return item;
  },
});
export const update = mutation({
  args: { ...args, input: recordPatch },
  handler: async (ctx, { workspaceKey, id, input }) => {
    const item = await requireRecord(ctx, workspaceKey, id);
    if (input.rows && !input.rows.length) throw new ConvexError('Phiếu phải có ít nhất một dòng');
    await ctx.db.patch(item._id, input);
    return null;
  },
});
export const remove = mutation({
  args,
  handler: async (ctx, { workspaceKey, id }) => {
    const item = await requireRecord(ctx, workspaceKey, id);
    await ctx.db.delete(item._id);
    return null;
  },
});

/** A treatment sheet and its imported template library must commit together. */
export const saveEditor = mutation({
  args: { ...args, input: v.object(recordFields), templates: v.array(template) },
  handler: async (ctx, { workspaceKey, id, input, templates }) => {
    const item = await requireRecord(ctx, workspaceKey, id);
    if (!input.rows.length || new Set(templates.map(value => value.id)).size !== templates.length) {
      throw new ConvexError('Phiếu hoặc thư viện mẫu không hợp lệ');
    }
    await ctx.db.replace(item._id, { workspaceKey, id, ...input });
    const current = await ctx.db.query('templates')
      .withIndex('by_workspace', q => q.eq('workspaceKey', workspaceKey)).collect();
    const target = new Map(templates.map(value => [value.id, value]));
    for (const previous of current) {
      const next = target.get(previous.id);
      if (!next) await ctx.db.delete(previous._id);
      else {
        if (next.kind !== previous.kind || next.text !== previous.text || next.group !== previous.group) {
          await ctx.db.patch(previous._id, next);
        }
        target.delete(previous.id);
      }
    }
    for (const next of target.values()) await ctx.db.insert('templates', { workspaceKey, ...next });
    return null;
  },
});
