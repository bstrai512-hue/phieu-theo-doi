import { NumberedOptionsInput } from './numbered-options-input';
import { Field, FieldGroup } from './ui/field';
import { Alert, AlertDescription } from './ui/alert';
import { useEffect, useRef, useState } from 'react';
import type { WorkspaceSettings, WorkspaceSettingsSnapshot } from '../types/workspace';
import type { RegisterWorkspaceGuard } from './workspace-boundary';
import { workspaces } from '../services/treatment-records/provider';
import { checkedWorkspaceName, checkedWorkspaceSlug } from '../services/workspaces/model';
import type { Workspace } from '../types';
import { checkedWorkspaceSettings } from '../services/workspaces/settings';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function WorkspaceSettingsPage({ workspaceKey, name, slug, snapshot, onSaved, registerLeaveGuard, active, onRenamed }: {
  onRenamed: (workspace: Workspace) => void; workspaceKey: string; name: string; slug: string; snapshot: WorkspaceSettingsSnapshot;
  onSaved: (snapshot: WorkspaceSettingsSnapshot) => void; registerLeaveGuard: RegisterWorkspaceGuard; active: boolean;
}) {
  const [workspaceSlug, setWorkspaceSlug] = useState(slug);
  const [workspaceName, setWorkspaceName] = useState(name);
  const [department, setDepartment] = useState(snapshot.value.department);
  const [rooms, setRooms] = useState(snapshot.value.rooms.join('\n'));
  const [beds, setBeds] = useState(snapshot.value.beds.join('\n'));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const values = (): WorkspaceSettings => ({ department, rooms: rooms.split('\n').map(s => s.trim()).filter(Boolean), beds: beds.split('\n').map(s => s.trim()).filter(Boolean) });
  const settingsDirty = JSON.stringify(values()) !== JSON.stringify(snapshot.value);
  const dirty = workspaceName !== name || workspaceSlug !== slug || settingsDirty;
  function save(): Promise<boolean> {
    if (pending.current) return pending.current;
    if (!dirty) return Promise.resolve(true);
    setBusy(true); setError(''); setNotice('');
    pending.current = Promise.resolve().then(async () => {
      try {
        const clean = checkedWorkspaceSettings(values());
        if (workspaceSlug !== slug) checkedWorkspaceSlug(workspaceSlug);
        let updated = {key:workspaceKey,name,slug};
        if (workspaceName !== name) {
          const renamed = await workspaces.rename(workspaceKey, checkedWorkspaceName(workspaceName), name);
          updated = {...renamed,slug:renamed.slug??slug}; onRenamed(updated); setWorkspaceName(renamed.name);
        }
        if (workspaceSlug !== slug) {
          updated = { ...await workspaces.changeSlug(workspaceKey, workspaceSlug, slug), slug: workspaceSlug };
          setWorkspaceSlug(updated.slug);
        }
        if (updated.name !== name || updated.slug !== slug) onRenamed(updated);
        const next = await workspaces.saveSettings(workspaceKey, clean, snapshot.revision);
        onSaved(next); setDepartment(next.value.department); setRooms(next.value.rooms.join('\n')); setBeds(next.value.beds.join('\n'));
        setNotice('Đã lưu cấu hình Khoa.'); return true;
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được cấu hình. Hãy thử lại.'); return false; }
      finally { setBusy(false); pending.current = null; }
    });
    return pending.current;
  }
  useEffect(() => registerLeaveGuard(save));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function reload() {
    setBusy(true); setError('');
    try {
      const next = await workspaces.settings(workspaceKey);
      onSaved(next); setDepartment(next.value.department); setRooms(next.value.rooms.join('\n')); setBeds(next.value.beds.join('\n')); const item = (await workspaces.list()).find(item => item.key === workspaceKey); if (item) {onRenamed(item);setWorkspaceName(item.name);setWorkspaceSlug(item.slug??item.key)} setNotice('Đã tải lại cấu hình.');
    } catch { setError('Không tải được cấu hình. Hãy thử lại.'); } finally { setBusy(false); }
  }
  if (!active) return null;
  return <div className="main-shell no-print"><main className="workspace-settings">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6"><div><h1>Cấu hình Khoa</h1><p className="mt-2 text-sm text-muted-foreground">{name}</p></div><Button disabled={!dirty || busy} onClick={() => void save()}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</Button></header>
    {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}<Button variant="outline" onClick={() => void reload()} disabled={busy}>Tải lại cấu hình đã lưu</Button><p className="mt-2">Tải lại sẽ thay thế các thay đổi chưa lưu trên trang này.</p></AlertDescription></Alert>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy} className="settings-layout">
        <FieldGroup className="settings-fields">
          <section><h2>Tên Khoa</h2><p>Hiển thị trong danh sách chọn Khoa và menu. Đổi tên không thay đổi thông tin trên phiếu đã lưu.</p><Field className="field"><label htmlFor="settings-name">Tên hiển thị</label><Input id="settings-name" value={workspaceName} disabled={workspaceKey === 'shared'} maxLength={100} onChange={event => setWorkspaceName(event.target.value)}/></Field></section>
          <section><h2>Đường dẫn Khoa</h2><p>Slug dùng trong URL. Đổi tên Khoa không tự thay đổi đường dẫn này.</p><Field className="field"><label htmlFor="settings-slug">Slug</label><Input id="settings-slug" value={workspaceSlug} disabled={workspaceKey === 'shared'} maxLength={80} spellCheck={false} autoCapitalize="none" onChange={event => setWorkspaceSlug(event.target.value)}/><span>/khoa/{workspaceSlug}</span></Field></section>
          <section><h2>Thông tin mặc định</h2><p>Tự điền vào phiếu mới. Phiếu đã lưu giữ nguyên thông tin.</p><Field className="field"><label htmlFor="settings-department">Khoa trên phiếu</label><Input id="settings-department" value={department} maxLength={100} onChange={event => setDepartment(event.target.value)} placeholder="VD: Nội hô hấp"/></Field></section>
          <section><h2>Danh sách phòng</h2><p>Mỗi dòng là một phòng. Để trống để nhập phòng tự do.</p><Field className="field"><label htmlFor="settings-rooms">Các phòng của Khoa</label><NumberedOptionsInput id="settings-rooms" rows={6} value={rooms} onChange={setRooms} placeholder={'Phòng 101\nPhòng 102'}/></Field></section>
          <section><h2>Danh sách giường</h2><p>Mỗi dòng là một số hoặc tên giường. Để trống để nhập giường tự do.</p><Field className="field"><label htmlFor="settings-beds">Các giường của Khoa</label><NumberedOptionsInput id="settings-beds" rows={8} value={beds} onChange={setBeds} placeholder={'1\n2\nGiường cấp cứu'}/></Field></section>
        </FieldGroup>
        <aside className="settings-preview"><h2>Trên phiếu mới</h2><p>Kiểm tra các lựa chọn trước khi lưu.</p><Field className="field"><label htmlFor="settings-preview-department">Khoa</label><Input id="settings-preview-department" readOnly value={department} placeholder="Nhập khoa"/></Field>{(['rooms', 'beds'] as const).map(key => <Field className="field" key={key}><span>{key === 'rooms' ? 'Phòng' : 'Giường'}</span><select aria-label={`Xem trước ${key === 'rooms' ? 'phòng' : 'giường'}`}><option value="">{values()[key].length ? 'Chọn trong danh sách' : 'Nhập tự do'}</option>{values()[key].map((item, i) => <option key={i}>{item}</option>)}</select></Field>)}<p>Giá trị đã lưu trên phiếu vẫn được giữ khi danh sách thay đổi.</p></aside>
      </fieldset>
    </form>
  </main></div>;
}
