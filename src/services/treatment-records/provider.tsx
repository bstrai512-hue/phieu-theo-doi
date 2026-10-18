import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { TreatmentServices } from './contracts';
import { createLocalTreatmentServices } from './local-storage';

const localServices = createLocalTreatmentServices(() => window.localStorage);
const ServicesContext = createContext<TreatmentServices>(localServices);
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Provider selection belongs here; application callers only see TreatmentServices. */
export function TreatmentServicesProvider({ children, services = localServices }: {
  children: ReactNode;
  services?: TreatmentServices;
}) {
  const content = <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
  return convex ? <ConvexProvider client={convex}>{content}</ConvexProvider> : content;
}

export function useTreatmentServices() {
  return useContext(ServicesContext);
}
