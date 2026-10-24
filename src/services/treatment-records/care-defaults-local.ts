import {
  cleanCareTemplateLibrary,
  migrateCareTemplateLibrary,
  emptyCareTemplateLibrary,
  validCareTemplateLibrary,
} from "../../forms/care-defaults-model";
import type { CareDefaultsSnapshot } from '../../types';
import type { CareDefaultsStore } from "./contracts";
const KEY = "care-defaults-v1";
export function createLocalCareDefaults(
  storage: () => Pick<Storage, "getItem" | "setItem">,
  workspaceKey = 'shared',
): CareDefaultsStore {
  const key = workspaceKey === 'shared' ? KEY : `${KEY}:${workspaceKey}`;
  function read(): CareDefaultsSnapshot {
    const raw = storage().getItem(key);
    if (raw === null) return { revision: 0, value: emptyCareTemplateLibrary() };
    const parsed = JSON.parse(raw) as CareDefaultsSnapshot;
    if (
      !parsed ||
      !Number.isInteger(parsed.revision) ||
      parsed.revision < 0 ||
      !parsed.value
    )
      throw new Error("Không đọc được cấu hình mặc định đã lưu");
    return { ...parsed, value: migrateCareTemplateLibrary(parsed.value) };
  }
  return {
    async get() {
      return structuredClone(read());
    },
    async update(value, expectedRevision) {
      if (!validCareTemplateLibrary(value))
        throw new Error("Giá trị mặc định chưa hợp lệ");
      const previous = read();
      if (previous.revision !== expectedRevision)
        throw new Error(
          "Cấu hình đã thay đổi trên thiết bị khác. Bản đang sửa được giữ nguyên.",
        );
      const next = {
        revision: previous.revision + 1,
        value: cleanCareTemplateLibrary(value),
      };
      storage().setItem(key, JSON.stringify(next));
      return structuredClone(next);
    },
    watch(onChange, onError) {
      if (typeof window === "undefined") return () => {};
      const listener = (event: StorageEvent) => {
        if (event.key !== key && event.key !== null) return;
        try {
          onChange(read());
        } catch {
          onError();
        }
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}
