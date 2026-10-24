import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Check, Plus, RefreshCw } from 'lucide-react';
import type { Workspace } from '../types';
import type { Workspaces } from '../services/workspaces/contracts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';

export function WorkspacePicker({ directory, items, current, loading, error, onReload, onSelect, onCreated }: {
  directory: Workspaces;
  items: Workspace[];
  current: Workspace | null;
  loading: boolean;
  error: string;
  onReload: () => Promise<void>;
  onSelect: (item: Workspace) => Promise<void>;
  onCreated: (item: Workspace) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  async function choose(item: Workspace) {
    setBusy(true); setActionError('');
    try { await onSelect(item); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể chọn Khoa. Hãy thử lại.'); }
    finally { setBusy(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setActionError('');
    try {
      const item = await directory.create(name);
      onCreated(item); setName('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không thể thêm Khoa. Hãy thử lại.');
    } finally { setBusy(false); }
  }
  return <div className="flex flex-col gap-5">
    {(error || actionError) && <Alert variant="destructive"><AlertDescription>{actionError || error}</AlertDescription></Alert>}
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Phiếu và thư viện mẫu được lưu riêng theo Khoa.</p>
      <Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => void onReload()}><RefreshCw data-icon="inline-start"/>Tải lại</Button>
    </div>
    {loading && <p role="status">Đang tải danh sách Khoa…</p>}
    <fieldset disabled={busy || loading} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" aria-label="Danh sách Khoa">
      {items.map(item => <Button key={item.key} variant="outline" className="h-auto min-h-14 justify-start whitespace-normal py-3 text-left" onClick={() => void choose(item)} aria-label={`Chọn ${item.name}`}>
        <Building2 data-icon="inline-start"/>
        <span className="min-w-0 flex-1 break-words">{item.name}</span>
        {item.key === current?.key && <Check data-icon="inline-end" aria-label="Khoa hiện tại"/>}
      </Button>)}
    </fieldset>
    <form onSubmit={event => void create(event)}>
      <fieldset disabled={busy || loading} className="m-0 flex min-w-0 flex-col gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Thêm Khoa</legend>
        <label htmlFor="workspace-name" className="text-sm">Tên Khoa</label>
        <Input id="workspace-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder="Ví dụ: Khoa Nội Hô Hấp" required/>
        <Button type="submit" disabled={!name.trim()}><Plus data-icon="inline-start"/>{busy ? 'Đang xử lý…' : 'Thêm Khoa'}</Button>
      </fieldset>
    </form>
  </div>;
}
