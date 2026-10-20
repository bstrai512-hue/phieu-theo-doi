import { useEffect, useState } from "react";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { CareConventionControl } from "./care-form-controls";
import { CareObservationFields } from "./care-observation-fields";
import {
  careDefaultsEditorValues,
  careDefaultsIssues,
  cleanCareDefaults,
  emptyCareDefaults,
} from "./care-defaults-model";
import type { CareDefaults, CareDefaultsSnapshot } from "./care-defaults-model";
import { formValuesKey, patchFormValue } from "./form-values";
import { useSynchronizedForm } from "./use-synchronized-form";

export function CareDefaultsPage({
  active,
  snapshot,
  error,
  onReload,
  onSave,
  onBack,
}: {
  active: boolean;
  snapshot: CareDefaultsSnapshot | null;
  error: string;
  onReload: () => void;
  onSave: (
    value: CareDefaults,
    revision: number,
  ) => Promise<CareDefaultsSnapshot>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    careDefaultsEditorValues(emptyCareDefaults()),
  );
  const [base, setBase] = useState<CareDefaultsSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const dirty =
    !!base &&
    formValuesKey(cleanCareDefaults(draft)) !==
      formValuesKey(cleanCareDefaults(base.value));
  const conflict =
    !!base && !!snapshot && snapshot.revision !== base.revision && dirty;
  const editor = useSynchronizedForm(draft, (name, value) => {
    setDraft((current) => patchFormValue(current, name, value));
    setMessage("");
    setSaveError("");
  });
  useEffect(() => {
    if (!snapshot || snapshot.revision === base?.revision) return;
    if (!base || !dirty) {
      setBase(snapshot);
      setDraft(careDefaultsEditorValues(snapshot.value));
    }
  }, [snapshot, base, dirty]);
  const issues = careDefaultsIssues(draft);
  const save = async () => {
    if (!base || saving || conflict || issues.length) return;
    setSaving(true);
    setSaveError("");
    setMessage("");
    try {
      const next = await onSave(cleanCareDefaults(draft), base.revision);
      setBase(next);
      setDraft(careDefaultsEditorValues(next.value));
      setMessage("Đã lưu cấu hình. Mốc theo dõi mới sẽ dùng các giá trị này.");
    } catch {
      setSaveError(
        "Chưa lưu được cấu hình. Nội dung đang sửa được giữ nguyên; hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (!active) return null;
  return (
    <div className="main-shell care-defaults-page">
      <header className="topbar">
        <div className="breadcrumb">
          Cấu hình <span>/</span>
          <strong>Phiếu chăm sóc</strong>
        </div>
        <span className="defaults-state">
          {saving
            ? "Đang lưu…"
            : dirty
              ? "Có thay đổi chưa lưu"
              : "Cấu hình đã lưu"}
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft />
              Quay lại phiếu
            </Button>
            <h1>Mặc định phiếu chăm sóc</h1>
            <p>
              Cấu hình bộ giá trị người bình thường dùng khi thêm mốc theo dõi.
            </p>
          </div>
          <Button
            disabled={
              !base || !dirty || saving || conflict || issues.length > 0
            }
            onClick={() => void save()}
          >
            <Save />
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </div>
        <div className="defaults-description">
          <strong>Áp dụng cho mốc mới</strong>
          <p>
            Các mốc đã ghi giữ nguyên dữ liệu. Thông tin người bệnh, dị ứng và
            chẩn đoán/mục tiêu được nhập riêng trên phiếu. Ô chưa cấu hình sẽ để
            trống khi tạo.
          </p>
        </div>
        {(error || saveError) && (
          <div className="care-issues" role="alert">
            {saveError || error}
            <Button size="sm" variant="outline" onClick={onReload}>
              Tải lại cấu hình
            </Button>
          </div>
        )}
        {message && (
          <p className="defaults-success" role="status">
            {message}
          </p>
        )}
        {conflict && (
          <div className="care-issues" role="alert">
            <p>
              Cấu hình đã thay đổi trên thiết bị khác. Bản đang sửa của bạn được
              giữ nguyên.
            </p>
            <div className="form-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setBase(snapshot!);
                  setDraft(careDefaultsEditorValues(snapshot!.value));
                  setSaveError("");
                }}
              >
                Dùng cấu hình mới
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBase(snapshot!);
                  setSaveError("");
                }}
              >
                Giữ bản đang sửa
              </Button>
            </div>
          </div>
        )}
        {issues.length > 0 && (
          <div className="care-issues" role="status">
            <strong>Cần hoàn thiện trước khi lưu</strong>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {!base && (
          <p role="status">
            {error ? "Chưa tải được cấu hình." : "Đang tải cấu hình…"}
          </p>
        )}
        <fieldset
          disabled={saving || !base}
          className="defaults-fields clinical-form"
        >
          <CareObservationFields
            renderField={(key, label) => (
              <CareConventionControl
                control={editor.form.control}
                name={`values.${key}`}
                careKey={key}
                label={label}
                onChange={(value) => editor.change(`values.${key}`, value)}
              />
            )}
          />
        </fieldset>
        <div className="defaults-footer">
          <span>
            {Object.keys(cleanCareDefaults(draft).values).length} ô đã cấu hình
          </span>
          <Button
            variant="outline"
            disabled={saving || !base}
            onClick={() => {
              setDraft(careDefaultsEditorValues(emptyCareDefaults()));
              setMessage("");
              setSaveError("");
            }}
          >
            <RotateCcw />
            Đặt tất cả về chưa ghi nhận
          </Button>
        </div>
      </main>
    </div>
  );
}
