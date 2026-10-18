import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { recordInput } from './contracts';
import { defaults } from './model';
import type { Data } from './model';
import { useTreatmentServices } from './provider';
import { persistEditorData } from './editor-data';

/** Keeps editing immediate, debounces persistence, and serializes async CRUD writes. */
export function useTreatmentData() {
  const services = useTreatmentServices();
  const [data, updateData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const recordId = useRef<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    async function read() {
      try {
        const records = await services.records.list();
        if (cancelled) return;
        const record = records.length
          ? await services.records.get(records[0].id)
          : await services.records.create(recordInput(defaults()));
        const templates = await services.templates.list();
        if (cancelled) return;
        recordId.current = record.id;
        updateData({ version: 1, ...recordInput(record), templates });
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Không thể đọc dữ liệu');
      }
    }
    void read();
    return () => { cancelled = true; };
  }, [services]);

  useEffect(() => {
    if (!data || !recordId.current) return;
    let cancelled = false;
    const id = recordId.current;
    setSaved(false);
    const timer = setTimeout(() => {
      queue.current = queue.current.catch(() => {}).then(() => persistEditorData(services, id, data));
      void queue.current.then(() => {
        if (!cancelled) { setSaved(true); setStorageError(false); }
      }, () => {
        if (!cancelled) { setSaved(false); setStorageError(true); }
      });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [data, services]);

  const setData = useCallback((action: SetStateAction<Data>) => {
    updateData(previous => previous === null ? null : typeof action === 'function' ? action(previous) : action);
  }, []);

  return { data, setData, saved, storageError, loadError, storage: services.storage ?? 'local' };
}
