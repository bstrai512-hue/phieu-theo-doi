import { useController } from "react-hook-form";
import { useSynchronizedForm } from "./use-synchronized-form";
import { patchFormValue } from "./form-values";
import type { Dispatch, SetStateAction } from "react";
import { Plus, Droplets } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { Patient } from "../services/treatment-records/model";
import { localTime } from "../services/treatment-records/model";
import { infusionFields, makeInfusion } from "./model";
import type { Forms, InfusionKey } from "./model";
import { PrintPreview, RemoveEntry } from "./shared";
import { printInfusion } from "./print";
export function InfusionForm({
  data,
  onChange,
  patient,
  canPrint,
}: {
  data: Forms["infusion"];
  onChange: Dispatch<SetStateAction<Forms["infusion"]>>;
  patient: Patient;
  canPrint: boolean;
}) {
  const editor = useSynchronizedForm(data, (name, value) =>
    onChange((current) => patchFormValue(current, name, value)),
  );
  return (
    <section aria-label="Phiếu theo dõi truyền dịch">
      <div className="form-heading">
        <div>
          <h2>Theo dõi truyền dịch</h2>
          <p>Mỗi dòng ghi nhận một lần truyền dịch trong đợt.</p>
        </div>
        <PrintPreview
          title="Phiếu theo dõi truyền dịch"
          canPrint={canPrint}
          render={() => printInfusion(patient, data)}
        />
      </div>
      <div className="clinical-form">
        <div className="form-section-bar">
          <span>{data.rows.length} lần truyền</span>
          <Button
            onClick={() =>
              editor.change("rows", [
                ...editor.form.getValues("rows"),
                makeInfusion(localTime().slice(0, 10)),
              ])
            }
          >
            <Plus />
            Thêm lần truyền
          </Button>
        </div>
        {!data.rows.length ? (
          <div className="form-empty">
            <Droplets size={28} />
            <h3>Chưa có lần truyền dịch</h3>
            <p>Chọn “Thêm lần truyền” để bắt đầu ghi nhận.</p>
          </div>
        ) : (
          <div className="form-table-scroll">
            <table className="infusion-table">
              <thead>
                <tr>
                  {infusionFields.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={row.id}>
                    {infusionFields.map(([key, label, type]) => (
                      <td key={key}>
                        <InfusionInput
                          editor={editor}
                          index={index}
                          name={key}
                          label={`${label} lần truyền ${index + 1}`}
                          type={type}
                        />
                      </td>
                    ))}
                    <td>
                      <RemoveEntry
                        label={`lần truyền ${index + 1}`}
                        onRemove={() =>
                          editor.change(
                            "rows",
                            editor.form
                              .getValues("rows")
                              .filter((item) => item.id !== row.id),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

type InfusionEditor = ReturnType<typeof useSynchronizedForm<Forms["infusion"]>>;
function InfusionInput({
  editor,
  index,
  name,
  label,
  type,
}: {
  editor: InfusionEditor;
  index: number;
  name: InfusionKey;
  label: string;
  type: string;
}) {
  const path = `rows.${index}.${name}` as const;
  const { field } = useController({ control: editor.form.control, name: path });
  return (
    <Input
      {...field}
      aria-label={label}
      type={type}
      value={field.value ?? ""}
      onChange={(event) => editor.change(path, event.target.value)}
    />
  );
}
