import type { ConvexReactClient } from 'convex/react';
import { api } from '../../../convex/_generated/api.js';
import type { Workspaces } from './contracts';
import { checkedWorkspaceName, newWorkspaceKey } from './model';

export function createConvexWorkspaces(client: Pick<ConvexReactClient, 'query' | 'mutation'>): Workspaces {
  return {
    settings: workspaceKey => client.query(api.workspaces.settings, { workspaceKey }),
    saveSettings: (workspaceKey, value, revision) => client.mutation(api.workspaces.saveSettings, { workspaceKey, value, revision }),
    rename: (workspaceKey, name, expectedName) => client.mutation(api.workspaces.rename, { workspaceKey, name: checkedWorkspaceName(name), expectedName }),
    changeSlug: (workspaceKey, slug, expectedSlug) => client.mutation(api.workspaces.changeSlug, { workspaceKey, slug, expectedSlug }),
    list: () => client.query(api.workspaces.list, {}),
    create: name => client.mutation(api.workspaces.create, { workspaceKey: newWorkspaceKey(), name: checkedWorkspaceName(name) }),
  };
}
