import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTreatmentServices } from './provider';
import { createTreatmentWorkspace } from './workspace';

export function useTreatmentData() {
  const services = useTreatmentServices();
  const workspace = useMemo(() => createTreatmentWorkspace(services), [services]);
  const state = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot);
  useEffect(() => {
    workspace.start();
    return () => workspace.dispose();
  }, [workspace]);
  return {
    ...state, setData: workspace.setData, flush: workspace.flush,
    selectRecord: workspace.selectRecord, newDraft: workspace.newDraft, deleteRecord: workspace.deleteRecord, changeStatus: workspace.changeStatus, resolveConflict: workspace.resolveConflict,
  };
}
