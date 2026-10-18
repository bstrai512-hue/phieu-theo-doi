import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { recordFields, templateFields } from './validators';

export default defineSchema({
  workspaces: defineTable({ key: v.string() }).index('by_key', ['key']),
  treatmentRecords: defineTable({ workspaceKey: v.string(), id: v.string(), ...recordFields })
    .index('by_workspace', ['workspaceKey'])
    .index('by_workspace_id', ['workspaceKey', 'id']),
  templates: defineTable({ workspaceKey: v.string(), id: v.string(), ...templateFields })
    .index('by_workspace', ['workspaceKey'])
    .index('by_workspace_id', ['workspaceKey', 'id']),
});
