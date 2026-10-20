import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { recordFields, templateFields } from './validators';

export default defineSchema({
  careDefaults: defineTable({workspaceKey:v.string(),revision:v.number(),values:v.record(v.string(),v.string())}).index('by_workspace',['workspaceKey']),
  workspaces: defineTable({ key: v.string(), revision: v.optional(v.number()) }).index('by_key', ['key']),
  treatmentRecords: defineTable({ workspaceKey: v.string(), id: v.string(), ...recordFields })
    .index('by_workspace', ['workspaceKey'])
    .index('by_workspace_id', ['workspaceKey', 'id']),
  templates: defineTable({ workspaceKey: v.string(), id: v.string(), ...templateFields })
    .index('by_workspace', ['workspaceKey'])
    .index('by_workspace_id', ['workspaceKey', 'id']),
});
