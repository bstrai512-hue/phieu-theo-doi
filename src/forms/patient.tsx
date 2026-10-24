import type { WorkspaceSettings } from '../types/workspace';
import type { Dispatch, SetStateAction } from "react";
import { useController } from "react-hook-form";
import { FolderHeart } from "lucide-react";
import { Input } from "../components/ui/input";
import type { Patient } from '../types';
import { useSynchronizedForm } from "./use-synchronized-form";

export function PatientForm({
  settings,
  data,
  onChange,
  disabled,
}: {
  settings: WorkspaceSettings;
  data: Patient;
  onChange: Dispatch<SetStateAction<Patient>>;
  disabled: boolean;
}) {
  const editor = useSynchronizedForm(data, (name, value) =>
    onChange((current) => ({ ...current, [name]: value })),
  );
  return (
    <section className="card patient-card">
      <div className="section-header">
        <div className="flex items-center gap-2.5">
          <span className="section-icon">
            <FolderHeart size={18} />
          </span>
          <h2>Thông tin người bệnh</h2>
        </div>
        <span className="subtle-badge no-print">Dùng chung cho cả đợt</span>
      </div>
      <div className="patient-grid">
        <PatientInput
          editor={editor}
          name="name"
          label="Họ và tên người bệnh"
          placeholder="Nhập họ và tên"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="birth"
          label="Năm sinh"
          placeholder="VD: 1980"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="gender"
          label="Giới tính"
          disabled={disabled}
          options={[
            ["", "Chọn giới tính"],
            ["Nam", "Nam"],
            ["Nữ", "Nữ"],
            ["Khác", "Khác"],
          ]}
        />
        <PatientInput
          editor={editor}
          name="code"
          label="Mã người bệnh"
          placeholder="Nhập mã người bệnh"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="admission"
          label="Số vào viện"
          placeholder="Nhập số vào viện"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="department"
          label="Khoa"
          placeholder="Nhập khoa"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="room"
          label="Phòng"
          options={settings.rooms.length ? [["", "Chọn phòng"], ...(data.room && !settings.rooms.includes(data.room) ? [[data.room, `${data.room} (đã lưu)`] as [string,string]] : []), ...settings.rooms.map(value => [value,value] as [string,string])] : undefined}
          placeholder="Nhập phòng"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="bed"
          label="Giường"
          disabled={disabled}
          placeholder="Nhập giường"
          options={settings.beds.length ? [["", "Chọn giường"], ...(data.bed && !settings.beds.includes(data.bed) ? [[data.bed, `${data.bed} (đã lưu)`] as [string,string]] : []), ...settings.beds.map(value => [value,value] as [string,string])] : undefined}
        />
      </div>
      <div className="diagnosis-grid">
        <PatientInput
          editor={editor}
          name="diagnosis"
          label="Chẩn đoán"
          placeholder="Nhập chẩn đoán"
          disabled={disabled}
        />
        <PatientInput
          editor={editor}
          name="differential"
          label="Chẩn đoán phân biệt"
          placeholder="Nhập nếu có"
          disabled={disabled}
        />
      </div>
    </section>
  );
}
type PatientEditor = ReturnType<typeof useSynchronizedForm<Patient>>;
function PatientInput({
  editor,
  name,
  label,
  placeholder,
  disabled,
  options,
}: {
  editor: PatientEditor;
  name: keyof Patient;
  label: string;
  placeholder?: string;
  disabled: boolean;
  options?: [string, string][];
}) {
  const { field } = useController({ control: editor.form.control, name });
  const props = {
    ...field,
    "aria-label": label,
    disabled,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => editor.change(name, event.target.value),
  };
  return (
    <label className="field">
      <span>{label}</span>
      {options ? (
        <select {...props}>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      ) : (
        <Input {...props} placeholder={placeholder} />
      )}
    </label>
  );
}
