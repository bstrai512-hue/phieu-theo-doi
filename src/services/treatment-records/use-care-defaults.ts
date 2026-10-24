import { useCallback, useEffect, useRef, useState } from "react";
import { useTreatmentServices } from "./provider";
import type { CareTemplateLibrary, CareDefaultsSnapshot } from '../../types';

export function useCareDefaults() {
  const { careDefaults: store } = useTreatmentServices();
  const [snapshot, setSnapshot] = useState<CareDefaultsSnapshot | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const accept = useCallback((next: CareDefaultsSnapshot) => {
    if (!mounted.current) return;
    setSnapshot((current) =>
      !current || next.revision >= current.revision ? next : current,
    );
    setError("");
  }, []);
  const reload = useCallback(async () => {
    try {
      accept(await store.get());
    } catch {
      if (mounted.current)
        setError("Không tải được cấu hình mặc định. Hãy thử lại.");
    }
  }, [store, accept]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    const stop = store.watch?.(accept, () => {
      if (mounted.current)
        setError("Chưa nhận được cập nhật cấu hình. Hãy thử tải lại.");
    });
    return () => {
      mounted.current = false;
      stop?.();
    };
  }, [store, reload, accept]);
  const update = useCallback(
    async (value: CareTemplateLibrary, revision: number) => {
      try {
        const next = await store.update(value, revision);
        accept(next);
        return next;
      } catch (error) {
        await reload();
        throw error;
      }
    },
    [store, accept, reload],
  );
  return { snapshot, error, reload, update };
}
