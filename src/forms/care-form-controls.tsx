import type { ChangeEvent } from "react";
import { useController } from "react-hook-form";
import type {
  Control,
  FieldValues,
  FieldPath,
  FieldPathByValue,
} from "react-hook-form";
import { Input } from "../components/ui/input";
import { CareField } from "./care-field";
import { careValueIssue } from "./care-conventions";
import type { CareData, CareKey } from '../types';
import type { CareEditor } from "./use-care-form";

export function CareValueControl({
  editor,
  index,
  careKey,
  label,
}: {
  editor: CareEditor;
  index: number;
  careKey: CareKey;
  label: string;
}) {
  const name = `observations.${index}.values.${careKey}` as const;
  return (
    <CareConventionControl
      control={editor.form.control}
      name={name}
      careKey={careKey}
      label={label}
      onChange={(value) => editor.change(name, value)}
    />
  );
}

/** RHF adapter shared by care entries and the default-values editor. */
export function CareConventionControl<Values extends FieldValues>({
  control,
  name,
  careKey,
  label,
  onChange,
}: {
  control: Control<Values>;
  name: FieldPath<Values>;
  careKey: CareKey;
  label: string;
  onChange: (value: string) => void;
}) {
  const { field } = useController({
    control,
    name,
    rules: {
      validate: (value) =>
        careValueIssue(careKey, typeof value === "string" ? value : "") ?? true,
    },
  });
  return (
    <div onBlur={field.onBlur}>
      <CareField
        field={careKey}
        label={label}
        value={typeof field.value === "string" ? field.value : ""}
        onChange={onChange}
      />
    </div>
  );
}

export function CareTextControl({
  editor,
  name,
  label,
  type = "text",
  multiline = false,
  placeholder,
}: {
  editor: CareEditor;
  name: FieldPathByValue<CareData, string>;
  label: string;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const { field } = useController({ control: editor.form.control, name });
  const props = {
    ...field,
    "aria-label": label,
    value: field.value ?? "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      editor.change(name, event.target.value),
    placeholder,
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea {...props} rows={3} />
      ) : (
        <Input {...props} type={type} />
      )}
    </label>
  );
}

export function CareGoalControl({
  editor,
  diagnosisIndex,
  goalIndex,
}: {
  editor: CareEditor;
  diagnosisIndex: number;
  goalIndex: number;
}) {
  const name =
    `diagnoses.${diagnosisIndex}.goals.${goalIndex}.achieved` as const;
  const { field } = useController({ control: editor.form.control, name });
  return (
    <label>
      <input
        ref={field.ref}
        name={field.name}
        onBlur={field.onBlur}
        type="checkbox"
        checked={field.value ?? false}
        aria-label={`Mục tiêu ${goalIndex + 1} chẩn đoán ${diagnosisIndex + 1} đã hoàn thành`}
        onChange={(event) => editor.change(name, event.target.checked)}
      />
      <span>Hoàn thành</span>
    </label>
  );
}

export function CareAllergyControl({ editor }: { editor: CareEditor }) {
  const { field } = useController({
    control: editor.form.control,
    name: "allergyStatus",
  });
  return (
    <label className="field">
      <span>Tiền sử dị ứng</span>
      <select
        {...field}
        aria-label="Tiền sử dị ứng"
        onChange={(event) =>
          editor.change(
            "allergyStatus",
            event.target.value as CareData["allergyStatus"],
          )
        }
      >
        <option value="">Chưa nhập</option>
        <option value="unknown">Chưa ghi nhận</option>
        <option value="known">Có, ghi rõ</option>
      </select>
    </label>
  );
}
