import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireWorkspace, sharedKey } from "./access";
import {
  validCareDefaults,
  cleanCareDefaults,
} from "../src/forms/care-defaults-model";
export const get = query({
  args: { workspaceKey: v.string() },
  handler: async (ctx, { workspaceKey }) => {
    workspaceKey = sharedKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    const current = await ctx.db
      .query("careDefaults")
      .withIndex("by_workspace", (q) => q.eq("workspaceKey", workspaceKey))
      .unique();
    return {
      revision: current?.revision ?? 0,
      value: { values: current?.values ?? {} },
    };
  },
});
export const update = mutation({
  args: {
    workspaceKey: v.string(),
    expectedRevision: v.number(),
    value: v.object({ values: v.record(v.string(), v.string()) }),
  },
  handler: async (ctx, { workspaceKey, expectedRevision, value }) => {
    workspaceKey = sharedKey(workspaceKey);
    await requireWorkspace(ctx, workspaceKey);
    if (!validCareDefaults(value))
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
      values: cleanCareDefaults(value).values,
    };
    if (current) await ctx.db.replace(current._id, next);
    else await ctx.db.insert("careDefaults", next);
    return { revision: next.revision, value: { values: next.values } };
  },
});
