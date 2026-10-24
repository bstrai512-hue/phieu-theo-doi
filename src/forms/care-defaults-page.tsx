import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, ClipboardList, Check, Star } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { CareConventionControl } from "./care-form-controls";
import { CareObservationFields } from "./care-observation-fields";
import { careDefaultsEditorValues, careDefaultsIssues, cleanCareTemplateLibrary, emptyCareTemplateLibrary } from "./care-defaults-model";
import type { CareTemplateLibrary, CareDefaultsSnapshot } from "../types";
import { formValuesKey, patchFormValue } from "./form-values";
import { useSynchronizedForm } from "./use-synchronized-form";

const editorValues = (library: CareTemplateLibrary): CareTemplateLibrary => ({...library, templates:library.templates.map(t => ({...t, ...careDefaultsEditorValues(t)}))});

export function CareDefaultsPage({ active, snapshot, error, onReload, onSave, onBack, registerLeaveGuard }: {
  registerLeaveGuard?: (guard: () => Promise<boolean>) => () => void;
  active: boolean; snapshot: CareDefaultsSnapshot | null; error: string;
  onReload: () => void;
  onSave: (value: CareTemplateLibrary, revision: number) => Promise<CareDefaultsSnapshot>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(emptyCareTemplateLibrary);
  const [base, setBase] = useState<CareDefaultsSnapshot | null>(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const dirty = !!base && formValuesKey(cleanCareTemplateLibrary(draft)) !== formValuesKey(base.value);
  const conflict = !!base && !!snapshot && snapshot.revision !== base.revision && dirty;
  const editor = useSynchronizedForm(draft, (name, value) => {
    setDraft(current => patchFormValue(current, name, value));
    setMessage(""); setSaveError("");
  });
  useEffect(() => {
    if (!snapshot || snapshot.revision === base?.revision) return;
    if (!base || !dirty) { setBase(snapshot); setDraft(editorValues(snapshot.value)); }
  }, [snapshot, base, dirty]);
  const index = Math.max(0, draft.templates.findIndex(t => t.id === selected));
  const template = draft.templates[index];
  const issues = draft.templates.flatMap(t => [
    ...(!t.name.trim() ? ["Mẫu chưa có tên"] : []),
    ...careDefaultsIssues(t).map(issue => `${t.name || "Mẫu mới"}: ${issue}`),
  ]);
  function change(value: CareTemplateLibrary) {
    setDraft(value); setMessage(""); setSaveError("");
  }
  async function save() {
    if (!base || saving || conflict || issues.length) return false;
    setSaving(true); setMessage(""); setSaveError("");
    try {
      const next = await onSave(cleanCareTemplateLibrary(draft), base.revision);
      setBase(next); setDraft(editorValues(next.value)); setMessage("Đã lưu thư viện mẫu chăm sóc."); return true;
    } catch { setSaveError("Chưa lưu được thư viện. Bản đang sửa được giữ nguyên; hãy thử lại."); return false; }
    finally { setSaving(false); }
  }
  useEffect(() => registerLeaveGuard?.(async () => {
    if (saving) return false;
    if (!dirty) return true;
    return save();
  }));
  if (!active) return null;
  return <div className="main-shell care-defaults-page">
    <header className="topbar"><div className="breadcrumb">Thư viện <span>/</span><strong>Mẫu chăm sóc</strong></div>
      <span className="defaults-state">{saving ? "Đang lưu…" : dirty ? "Có thay đổi chưa lưu" : "Đã tải thư viện"}</span></header>
    <fieldset disabled={!base || saving} className="care-template-sidebar" aria-label="Chọn mẫu chăm sóc">
        <div className="form-section-bar"><div><h2>Danh sách mẫu <span className="care-template-total">{draft.templates.length}</span></h2><p className="care-template-help">Chọn một mẫu để xem và chỉnh sửa giá trị.</p></div><Button variant="outline" onClick={() => {
          const id = crypto.randomUUID();
          change({ ...draft, templates: [...draft.templates, {id, name:"Mẫu mới", ...careDefaultsEditorValues({values:{}})}] });
          setSelected(id);
        }}><Plus/>Thêm mẫu</Button></div>
        <div className="care-template-list" role="group" aria-label="Danh sách mẫu chăm sóc">
          {draft.templates.map(t => {
            const isSelected = t.id === template?.id;
            const isDefault = t.id === draft.defaultTemplateId;
            const filled = Object.values(t.values).filter(value => typeof value === "string" && value.trim()).length;
            return <button type="button" className="care-template-option" key={t.id} aria-pressed={isSelected} onClick={() => setSelected(t.id)}>
              <span className="care-template-icon" aria-hidden="true"><ClipboardList size={20}/></span>
              <span className="care-template-summary">
                <span className="care-template-title">{t.name.trim() || "Chưa đặt tên"}</span>
                <span className="care-template-detail">{filled ? `${filled} ô đã cấu hình` : "Chưa có giá trị điền sẵn"}</span>
                {isDefault && <span className="care-template-default"><Star size={12} aria-hidden="true"/>Mặc định</span>}
              </span>
              <span className="care-template-selection" aria-hidden="true">{isSelected && <Check size={15}/>}</span>
              {isSelected && <span className="care-template-editing">Đang sửa</span>}
            </button>;
          })}
        </div>
        </fieldset>
    <main>
      <div className="page-heading"><div>
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft/>Quay lại phiếu</Button>
        <h1>Mẫu chăm sóc</h1><p>Quản lý các bộ giá trị dùng để khởi tạo mốc theo dõi đầu tiên.</p>
      </div><Button disabled={!base || !dirty || saving || conflict || !!issues.length} onClick={() => void save()}><Save/>{saving ? "Đang lưu…" : "Lưu thư viện"}</Button></div>
      <div className="defaults-description"><strong>Mẫu dùng cho mốc đầu tiên</strong><p>Các mốc tiếp theo sao chép giá trị từ mốc cuối cùng. Sửa hoặc xóa mẫu không thay đổi các mốc đã ghi. Thông tin người bệnh, dị ứng và chẩn đoán/mục tiêu được nhập riêng.</p></div>
      {(error || saveError) && <div className="care-issues" role="alert">{saveError || error}<Button variant="outline" size="sm" onClick={onReload}>Tải lại thư viện</Button></div>}
      {message && <p role="status" className="defaults-success">{message}</p>}
      {conflict && <div className="care-issues" role="alert"><p>Thư viện đã thay đổi trên thiết bị khác. Bản đang sửa được giữ nguyên.</p><div className="form-actions">
        <Button variant="outline" onClick={() => { setBase(snapshot!); setDraft(editorValues(snapshot!.value)); setSaveError(""); }}>Dùng thư viện mới</Button>
        <Button variant="outline" onClick={() => { setBase(snapshot!); setSaveError(""); }}>Giữ bản đang sửa</Button>
      </div></div>}
      {!!issues.length && <div className="care-issues" role="status"><strong>Cần hoàn thiện trước khi lưu</strong><ul>{issues.map((issue,i) => <li key={i}>{issue}</li>)}</ul></div>}
      {!base && <p role="status">Đang tải thư viện…</p>}
      <fieldset disabled={!base || saving} className="defaults-fields clinical-form care-template-workspace">

        <div className="care-template-editor">
        {!template ? <p className="form-empty">Chưa có mẫu. Thêm mẫu để cấu hình giá trị điền sẵn.</p> : <>
          <div className="form-section-bar care-template-editor-heading">
            <label className="care-template-name">Tên mẫu<Input aria-label="Tên mẫu" value={template.name} onChange={event => editor.change(`templates.${index}.name`, event.target.value)}/></label>
            <div className="form-actions"><Button variant="outline" disabled={template.id === draft.defaultTemplateId} onClick={() => change({...draft, defaultTemplateId:template.id})}>{template.id === draft.defaultTemplateId ? "Mẫu mặc định" : "Đặt làm mặc định"}</Button>
              <Button variant="outline" onClick={() => {
                if (!window.confirm(`Xóa mẫu “${template.name}”? Các mốc đã ghi vẫn được giữ nguyên.`)) return;
                change({...draft, templates:draft.templates.filter(t => t.id !== template.id), defaultTemplateId:draft.defaultTemplateId === template.id ? null : draft.defaultTemplateId});
              }}><Trash2/>Xóa mẫu</Button></div>
          </div>
          <CareObservationFields renderField={(key,label) => <CareConventionControl key={`${template.id}:${key}`} control={editor.form.control} name={`templates.${index}.values.${key}`} careKey={key} label={label} onChange={value => editor.change(`templates.${index}.values.${key}`,value)}/>}/>
        </>}
        </div>
      </fieldset>
    </main>
  </div>;
}
