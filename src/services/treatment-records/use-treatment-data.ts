import { useRef } from 'react';
import type { WorkspaceSettings } from '../../types/workspace';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTreatmentServices } from './provider';
import { createTreatmentWorkspace } from './workspace';

export function useTreatmentData(settings?: WorkspaceSettings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const services = useTreatmentServices();
  const workspace = useMemo(() => createTreatmentWorkspace(services, () => settingsRef.current?.department ?? ''), [services]);
  const state = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot);
  useEffect(() => {
    workspace.start();
    return () => workspace.dispose();
  }, [workspace]);
  return {
    ...state, prepareToLeave: workspace.prepareToLeave, setData: workspace.setData, flush: workspace.flush,
    selectRecord: workspace.selectRecord, newDraft: workspace.newDraft, deleteRecord: workspace.deleteRecord, changeStatus: workspace.changeStatus, resolveConflict: workspace.resolveConflict,
  };
}
