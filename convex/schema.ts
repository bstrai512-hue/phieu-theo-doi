import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { recordFields, templateFields } from "./validators"

export default defineSchema({
  careDefaults: defineTable({ workspaceKey: v.string(), revision: v.number(), values: v.optional(v.record(v.string(), v.string())), templates: v.optional(v.array(v.object({id:v.string(),name:v.string(),values:v.record(v.string(),v.string())}))), defaultTemplateId: v.optional(v.union(v.string(),v.null())) }).index(
    "by_workspace",
    ["workspaceKey"],
  ),
  workspaces: defineTable({ key: v.string(), name: v.optional(v.string()), slug: v.optional(v.string()), settings: v.optional(v.object({ department: v.string(), rooms: v.array(v.string()), beds: v.array(v.string()) })), settingsRevision: v.optional(v.number()), revision: v.optional(v.number()) }).index("by_key", ["key"]),
  treatmentRecords: defineTable({ workspaceKey: v.string(), id: v.string(), ...recordFields })
    .index("by_workspace", ["workspaceKey"])
    .index("by_workspace_id", ["workspaceKey", "id"]),
  templates: defineTable({ workspaceKey: v.string(), id: v.string(), ...templateFields })
    .index("by_workspace", ["workspaceKey"])
    .index("by_workspace_id", ["workspaceKey", "id"]),
})
