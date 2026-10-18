type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;

/** A private 256-bit capability, scoped to this browser and Convex deployment. */
export function workspaceKey(storage: StorageAccess, deploymentUrl: string): string {
  const key = `treatment-convex-workspace-v1:${new URL(deploymentUrl).origin}`;
  const existing = storage().getItem(key);
  if (existing !== null) {
    if (!/^[a-f0-9]{64}$/.test(existing)) throw new Error('Mã workspace đã lưu không hợp lệ');
    return existing;
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  storage().setItem(key, value);
  return value;
}
