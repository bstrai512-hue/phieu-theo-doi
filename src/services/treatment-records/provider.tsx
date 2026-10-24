import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { TreatmentServices } from './contracts';
import { createLocalTreatmentServices } from './local-storage';
import { createConvexTreatmentServices } from './convex';
import { createLocalWorkspaces } from '../workspaces/local';
import { createConvexWorkspaces } from '../workspaces/convex';

const storage = () => window.localStorage;
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
export const workspaceStorage = convex ? 'cloud' : 'local';
export const workspaces = convex ? createConvexWorkspaces(convex) : createLocalWorkspaces(storage);
const ServicesContext = createContext<TreatmentServices | null>(null);

/** Each mounted provider owns one immutable department scope. */
export function TreatmentServicesProvider({ children, workspaceKey = 'shared', services }: {
  children: ReactNode;
  workspaceKey?: string;
  services?: TreatmentServices;
}) {
  const scopedServices = useMemo(() => {
    if (services) return services;
    const local = createLocalTreatmentServices(storage, workspaceKey);
    return convex ? createConvexTreatmentServices(convex, () => workspaceKey, local) : local;
  }, [workspaceKey, services]);
  const content = <ServicesContext.Provider value={scopedServices}>{children}</ServicesContext.Provider>;
  return convex ? <ConvexProvider client={convex}>{content}</ConvexProvider> : content;
}

export function useTreatmentServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('Chưa chọn Khoa.');
  return services;
}
