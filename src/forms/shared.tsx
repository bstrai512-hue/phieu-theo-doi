import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Activity,
  Droplets,
  ClipboardList,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { formLabels } from "./model";
import type { FormKind } from "./model";
import type { Data, Patient } from "../services/treatment-records/model";
const kinds: FormKind[] = ["treatment", "infusion", "care"];
const icons = { treatment: Activity, infusion: Droplets, care: ClipboardList };
export function FormTabs({
  value,
  onChange,
}: {
  value: FormKind;
  onChange: (kind: FormKind) => void;
}) {
  return (
    <nav className="form-tabs" role="tablist" aria-label="Loại phiếu theo dõi">
      {kinds.map((kind, index) => {
        const Icon = icons[kind];
        return (
          <button
            key={kind}
            id={`form-tab-${kind}`}
            type="button"
            role="tab"
            aria-selected={kind === value}
            aria-controls="active-form"
            tabIndex={kind === value ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(e) => {
              let target: FormKind | undefined;
              if (e.key === "ArrowRight")
                target = kinds[(index + 1) % kinds.length];
              if (e.key === "ArrowLeft")
                target = kinds[(index + kinds.length - 1) % kinds.length];
              if (e.key === "Home") target = kinds[0];
              if (e.key === "End") target = kinds.at(-1);
              if (target) {
                e.preventDefault();
                onChange(target);
                document.getElementById(`form-tab-${target}`)?.focus();
              }
            }}
          >
            <Icon size={19} />
            <span>{formLabels[kind]}</span>
          </button>
        );
      })}
    </nav>
  );
}
const patientFields: [keyof Patient, string][] = [
  ["name", "Họ tên"],
  ["birth", "Năm sinh"],
  ["gender", "Giới tính"],
  ["code", "Mã người bệnh"],
  ["admission", "Số vào viện"],
  ["department", "Khoa"],
  ["room", "Phòng"],
  ["bed", "Giường"],
  ["diagnosis", "Chẩn đoán"],
  ["differential", "Chẩn đoán phân biệt"],
];
export function PatientReview({
  data,
  onChange,
}: {
  data: Data;
  onChange: Dispatch<SetStateAction<Data>>;
}) {
  const review = data.patientReview;
  if (!review || review.resolved) return null;
  const candidates = [
    ["Thông tin gốc", review.base],
    ...Object.entries(review.byDay).sort(([a], [b]) => a.localeCompare(b)),
  ] as [string, Patient][];
  const different = patientFields.filter(
    ([key]) => new Set(candidates.map(([, p]) => p[key])).size > 1,
  );
  return (
    <section
      className="patient-review"
      aria-label="Chọn thông tin người bệnh dùng chung"
    >
      <h2>Cần chọn thông tin chung cho đợt này</h2>
      <p>
        Dữ liệu cũ có thông tin khác nhau theo ngày. Chọn một bộ bên dưới để
        dùng cho cả ba loại phiếu. Các bản cũ vẫn được giữ trong bản sao dữ
        liệu.
      </p>
      <div className="form-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Thông tin khác nhau</th>
              {candidates.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {different.map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                {candidates.map(([name, p]) => (
                  <td key={name}>{p[key] || "Chưa nhập"}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th>Thông tin dùng chung</th>
              {candidates.map(([label, p]) => (
                <td key={label}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        patient: { ...p },
                        patientReview: { ...review, resolved: true },
                      }))
                    }
                  >
                    Dùng {label.toLocaleLowerCase("vi")}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function PrintPreview({
  title,
  canPrint,
  render,
  hint = "Bản in A4. Kiểm tra nội dung trước khi in.",
}: {
  title: string;
  canPrint: boolean;
  render: () => string;
  hint?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <>
      <Button
        disabled={!canPrint}
        onClick={() => {
          setReady(false);
          setHtml(render());
        }}
      >
        <Printer />
        Xem trước / In phiếu
      </Button>
      <Dialog
        open={html !== null}
        onOpenChange={(open) => {
          if (!open) setHtml(null);
        }}
      >
        <DialogContent
          className="print-preview-dialog"
          title={title}
          description={hint}
        >
          <div className="preview-toolbar">
            <span>
              Chọn A4, tỷ lệ 100%, tắt đầu và chân trang của trình duyệt.
            </span>
            <Button
              disabled={!ready}
              onClick={() => {
                frame.current?.contentWindow?.focus();
                frame.current?.contentWindow?.print();
              }}
            >
              <Printer />
              In phiếu / Lưu PDF
            </Button>
          </div>
          {html !== null && (
            <iframe
              ref={frame}
              title={title}
              className="print-preview-frame"
              srcDoc={html}
              onLoad={() => setReady(true)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function RemoveEntry({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Xóa ${label}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={16} />
        Xóa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Xóa ${label}?`}
          description="Chỉ xóa mục này. Các nội dung khác trong đợt được giữ nguyên."
        >
          <div className="form-actions">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Giữ lại
            </Button>
            <Button
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
            >
              Xóa mục này
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
