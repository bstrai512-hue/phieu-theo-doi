import type { ConvexReactClient } from 'convex/react';
import { api } from '../../../convex/_generated/api.js';
import { recordInput } from './contracts';
import type { TreatmentServices } from './contracts';
import { validData, validTemplates } from './model';

type Client = Pick<ConvexReactClient, 'query' | 'mutation'>;

/** Convex types and function references stay inside this adapter. */
export function createConvexTreatmentServices(
  client: Client,
  getWorkspaceKey: () => string,
  local: TreatmentServices,
): TreatmentServices {
  let initialization: Promise<string> | undefined;

  async function initialize(): Promise<string> {
    const workspaceKey = getWorkspaceKey();
    if (await client.query(api.workspaces.exists, { workspaceKey })) return workspaceKey;
    const [summaries, templates] = await Promise.all([local.records.list(), local.templates.list()]);
    const records = await Promise.all(summaries.map(summary => local.records.get(summary.id)));
    await client.mutation(api.workspaces.initialize, { workspaceKey, records, templates });
    return workspaceKey;
  }

  function ready() {
    // Deduplicate StrictMode and concurrent reads; a failed initialization may be retried.
    initialization ??= initialize().catch(error => {
      initialization = undefined;
      throw error;
    });
    return initialization;
  }

  return {
    storage: 'cloud',
    records: {
      async list() { return client.query(api.records.list, { workspaceKey: await ready() }); },
      async get(id) { return client.query(api.records.get, { workspaceKey: await ready(), id }); },
      async create(input) {
        if (!validData({ version: 1, ...input, templates: [] })) throw new Error('Phiếu điều trị không hợp lệ');
        return client.mutation(api.records.create, {
          workspaceKey: await ready(), record: { id: crypto.randomUUID(), ...recordInput(input) },
        });
      },
      async update(id, input) {
        await client.mutation(api.records.update, { workspaceKey: await ready(), id, input });
      },
      async remove(id) { await client.mutation(api.records.remove, { workspaceKey: await ready(), id }); },
    },
    templates: {
      async list() { return client.query(api.templates.list, { workspaceKey: await ready() }); },
      async create(input) {
        const template = { ...input, id: input.id ?? crypto.randomUUID() };
        if (!validTemplates([template])) throw new Error('Nội dung mẫu không hợp lệ');
        return client.mutation(api.templates.create, { workspaceKey: await ready(), template });
      },
      async update(id, input) {
        const { kind, text, group } = input;
        await client.mutation(api.templates.update, { workspaceKey: await ready(), id, input: { kind, text, group } });
      },
      async remove(id) { await client.mutation(api.templates.remove, { workspaceKey: await ready(), id }); },
    },
    async saveEditorData(id, data) {
      if (!validData(data)) throw new Error('Dữ liệu phiếu không hợp lệ');
      await client.mutation(api.records.saveEditor, {
        workspaceKey: await ready(), id, input: recordInput(data), templates: data.templates,
      });
    },
  };
}
