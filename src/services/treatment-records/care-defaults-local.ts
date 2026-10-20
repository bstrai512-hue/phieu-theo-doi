import {
  cleanCareDefaults,
  emptyCareDefaults,
  validCareDefaults,
} from "../../forms/care-defaults-model";
import type { CareDefaultsSnapshot } from "../../forms/care-defaults-model";
import type { CareDefaultsStore } from "./contracts";
const KEY = "care-defaults-v1";
export function createLocalCareDefaults(
  storage: () => Pick<Storage, "getItem" | "setItem">,
): CareDefaultsStore {
  function read(): CareDefaultsSnapshot {
    const raw = storage().getItem(KEY);
    if (raw === null) return { revision: 0, value: emptyCareDefaults() };
    const parsed = JSON.parse(raw) as CareDefaultsSnapshot;
    if (
      !parsed ||
      !Number.isInteger(parsed.revision) ||
      parsed.revision < 0 ||
      !validCareDefaults(parsed.value)
    )
      throw new Error("Không đọc được cấu hình mặc định đã lưu");
    return parsed;
  }
  return {
    async get() {
      return structuredClone(read());
    },
    async update(value, expectedRevision) {
      if (!validCareDefaults(value))
        throw new Error("Giá trị mặc định chưa hợp lệ");
      const previous = read();
      if (previous.revision !== expectedRevision)
        throw new Error(
          "Cấu hình đã thay đổi trên thiết bị khác. Bản đang sửa được giữ nguyên.",
        );
      const next = {
        revision: previous.revision + 1,
        value: cleanCareDefaults(value),
      };
      storage().setItem(KEY, JSON.stringify(next));
      return structuredClone(next);
    },
    watch(onChange, onError) {
      if (typeof window === "undefined") return () => {};
      const listener = (event: StorageEvent) => {
        if (event.key !== KEY && event.key !== null) return;
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
