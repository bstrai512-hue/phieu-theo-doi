import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { bumpRevision, findWorkspace, sharedKey, SHARED_WORKSPACE } from './access';
import { record, template } from './validators';

export const exists = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => !!await findWorkspace(ctx, workspaceKey),
});

/** Atomic, idempotent migration. Never overwrites a workspace already on Convex. */
export const initialize = mutation({
  args: { workspaceKey: v.string(), records: v.array(record), templates: v.array(template) },
  handler: async (ctx, { workspaceKey, records, templates }) => {
    workspaceKey = sharedKey(workspaceKey);
    if (await findWorkspace(ctx, workspaceKey)) return null;
    if (records.some(item => !(item.forms?.treatment.rows ?? item.rows)?.length)
      || new Set(records.map(item => item.id)).size !== records.length
      || new Set(templates.map(item => item.id)).size !== templates.length) {
      throw new ConvexError('Dữ liệu chuyển lên không hợp lệ');
    }
    await ctx.db.insert('workspaces', { key: workspaceKey, revision: 0 });
    for (const item of records) await ctx.db.insert('treatmentRecords', { workspaceKey, ...item });
    for (const item of templates) await ctx.db.insert('templates', { workspaceKey, ...item });
    return null;
  },
});

/** All devices intentionally read the same data. This project has no sign-in gate. */
export const snapshot = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    const workspace = await findWorkspace(ctx, workspaceKey);
    if (!workspace) throw new ConvexError('Chưa khởi tạo dữ liệu chung');
    const records = await ctx.db.query('treatmentRecords').withIndex('by_workspace', q => q.eq('workspaceKey', SHARED_WORKSPACE)).collect();
    const templates = await ctx.db.query('templates').withIndex('by_workspace', q => q.eq('workspaceKey', SHARED_WORKSPACE)).collect();
    return {
      revision: workspace.revision ?? 0,
      records: records.map(({ _id, _creationTime, workspaceKey, ...data }) => data),
      templates: templates.map(({ id, kind, text, group }) => ({ id, kind, text, group })),
    };
  },
});

/** Admin-only, idempotent consolidation. No records or templates are deleted. */
export const shareExisting = internalMutation({
  args: {},
  handler: async ctx => {
    if (!await findWorkspace(ctx, SHARED_WORKSPACE)) await ctx.db.insert('workspaces', { key: SHARED_WORKSPACE, revision: 0 });
    const records = await ctx.db.query('treatmentRecords').collect();
    const ids = new Set(records.filter(item => item.workspaceKey === SHARED_WORKSPACE).map(item => item.id));
    let movedRecords = 0;
    for (const item of records) {
      if (item.workspaceKey === SHARED_WORKSPACE) continue;
      const id = ids.has(item.id) ? `${item.id}-${item._id}` : item.id;
      ids.add(id);
      await ctx.db.patch(item._id, { workspaceKey: SHARED_WORKSPACE, id });
      movedRecords++;
    }
    const templates = await ctx.db.query('templates').collect();
    const shared = templates.filter(item => item.workspaceKey === SHARED_WORKSPACE);
    const templateIds = new Set(shared.map(item => item.id));
    const contents = new Set(shared.map(item => JSON.stringify([item.kind, item.text, item.group])));
    let movedTemplates = 0;
    for (const item of templates) {
      const signature = JSON.stringify([item.kind, item.text, item.group]);
      if (item.workspaceKey === SHARED_WORKSPACE || contents.has(signature)) continue;
      const id = templateIds.has(item.id) ? `${item.id}-${item._id}` : item.id;
      await ctx.db.patch(item._id, { workspaceKey: SHARED_WORKSPACE, id });
      templateIds.add(id); contents.add(signature); movedTemplates++;
    }
    await bumpRevision(ctx, SHARED_WORKSPACE);
    return { movedRecords, movedTemplates };
  },
});
