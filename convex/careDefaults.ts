import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireWorkspace, checkedWorkspaceKey } from "./access";
import {
  validCareTemplateLibrary,
  migrateCareTemplateLibrary,
  emptyCareTemplateLibrary,
  cleanCareTemplateLibrary,
} from "../src/forms/care-defaults-model";
export const get = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    workspaceKey = checkedWorkspaceKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    const current = await ctx.db
      .query("careDefaults")
      .withIndex("by_workspace", (q) => q.eq("workspaceKey", workspaceKey))
      .unique();
    return {
      revision: current?.revision ?? 0,
      value: current ? migrateCareTemplateLibrary(current.templates ? {templates:current.templates, defaultTemplateId:current.defaultTemplateId ?? null} : {values:current.values ?? {}}) : emptyCareTemplateLibrary(),
    };
  },
});
export const update = mutation({
  args: {
    workspaceKey: v.string(),
    expectedRevision: v.number(),
    value: v.object({ templates: v.array(v.object({id:v.string(), name:v.string(), values:v.record(v.string(),v.string())})), defaultTemplateId:v.union(v.string(),v.null()) }),
  },
  handler: async (ctx, { workspaceKey, expectedRevision, value }) => {
    workspaceKey = checkedWorkspaceKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    if (!validCareTemplateLibrary(value))
      throw new ConvexError("Giá trị mặc định chưa hợp lệ");
    const current = await ctx.db
      .query("careDefaults")
      .withIndex("by_workspace", (q) => q.eq("workspaceKey", workspaceKey))
      .unique();
    if ((current?.revision ?? 0) !== expectedRevision)
      throw new ConvexError(
        "Cấu hình đã thay đổi trên thiết bị khác. Bản đang sửa được giữ nguyên.",
      );
    const next = {
      workspaceKey,
      revision: (current?.revision ?? 0) + 1,
      ...cleanCareTemplateLibrary(value),
    };
    if (current) await ctx.db.replace(current._id, next);
    else await ctx.db.insert("careDefaults", next);
    return { revision: next.revision, value: cleanCareTemplateLibrary(value) };
  },
});
