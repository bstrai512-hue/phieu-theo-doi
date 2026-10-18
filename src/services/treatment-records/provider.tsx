import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { TreatmentServices } from './contracts';
import { createLocalTreatmentServices } from './local-storage';
import { createConvexTreatmentServices } from './convex';

const localServices = createLocalTreatmentServices(() => window.localStorage);
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const defaultServices = convex && convexUrl
  ? createConvexTreatmentServices(convex, () => 'shared', localServices)
  : localServices;
const ServicesContext = createContext<TreatmentServices>(defaultServices);

/** Provider selection belongs here; application callers only see TreatmentServices. */
export function TreatmentServicesProvider({ children, services = defaultServices }: {
  children: ReactNode;
  services?: TreatmentServices;
}) {
  const content = <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
  return convex ? <ConvexProvider client={convex}>{content}</ConvexProvider> : content;
}

export function useTreatmentServices() {
  return useContext(ServicesContext);
}
