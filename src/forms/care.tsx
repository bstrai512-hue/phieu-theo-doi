import { CareObservationFields } from "./care-observation-fields";
import { makeCareObservation } from "./care-defaults-model";
import type { CareDefaults } from "./care-defaults-model";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "../components/ui/button";
import { localTime } from "../services/treatment-records/model";
import type { Patient } from "../services/treatment-records/model";
import { careGroups } from "./model";
import type { CareData, CareDiagnosis } from "./model";
import { careValueIssue } from "./care-conventions";
import {
  CareAllergyControl,
  CareGoalControl,
  CareTextControl,
  CareValueControl,
} from "./care-form-controls";
import { useCareForm } from "./use-care-form";
import type { CareEditor } from "./use-care-form";
import { PrintPreview, RemoveEntry } from "./shared";
import { printCare } from "./print";

export function CareForm({
  data,
  onChange,
  patient,
  canPrint,
  defaults,
  defaultsError,
  reloadDefaults,
}: {
  data: CareData;
  onChange: Dispatch<SetStateAction<CareData>>;
  patient: Patient;
  canPrint: boolean;
  defaults: CareDefaults | null;
  defaultsError: string;
  reloadDefaults: () => void;
}) {
  const editor = useCareForm(data, onChange);
  const [selected, setSelected] = useState("");
  const selectedIndex = data.observations.findIndex(
    (observation) => observation.id === selected,
  );
  const activeIndex =
    selectedIndex < 0 ? data.observations.length - 1 : selectedIndex;
  const active = data.observations[activeIndex];
  const issues = data.observations.flatMap((observation, index) =>
    careGroups.flatMap((group) =>
      group.fields.flatMap(([key, label]) => {
        const issue = careValueIssue(key, observation.values[key] ?? "");
        return issue ? [`Mốc ${index + 1} - ${label}: ${issue}`] : [];
      }),
    ),
  );
  const addObservation = () => {
    if (!defaults) return;
    const observation = makeCareObservation(defaults, localTime());
    editor.change("observations", [
      ...editor.form.getValues("observations"),
      observation,
    ]);
    setSelected(observation.id);
  };
  return (
    <section aria-label="Phiếu theo dõi và chăm sóc">
      <div className="form-heading">
        <div>
          <h2>Theo dõi và chăm sóc</h2>
          <p>Ghi nhận theo mốc giờ, theo dõi mục tiêu và bàn giao.</p>
        </div>
        <PrintPreview
          title="Phiếu theo dõi và chăm sóc"
          canPrint={canPrint && issues.length === 0}
          render={() => printCare(patient, data)}
          hint="Mỗi tờ gồm tối đa 4 mốc theo dõi. Nội dung dài được ghi đầy đủ ở trang chi tiết theo số tham chiếu."
        />
      </div>
      {issues.length > 0 && (
        <div className="care-issues" role="status">
          <strong>Cần hoàn thiện trước khi in</strong>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p>Bản nháp vẫn được tự lưu.</p>
        </div>
      )}
      <div className="clinical-form allergy-fields">
        <CareAllergyControl editor={editor} />
        <CareTextControl
          editor={editor}
          name="allergy"
          label="Thông tin dị ứng"
          placeholder="Ghi rõ nếu có"
        />
      </div>
      {defaultsError && (
        <div className="care-issues" role="alert">
          {defaultsError}
          <Button variant="outline" size="sm" onClick={reloadDefaults}>
            Tải lại cấu hình
          </Button>
        </div>
      )}
      {!defaults && !defaultsError && (
        <p role="status" className="form-help">
          Đang tải giá trị mặc định…
        </p>
      )}
      <div className="care-layout">
        <div className="clinical-form">
          <div className="form-section-bar">
            <h3>Nhận định và can thiệp</h3>
            <Button onClick={addObservation} disabled={!defaults}>
              <Plus />
              Thêm mốc theo dõi
            </Button>
          </div>
          {!active ? (
            <div className="form-empty">
              <ClipboardList size={28} />
              <h3>Chưa có mốc theo dõi</h3>
              <p>Thêm mốc để nhập chỉ số, nhận định và can thiệp.</p>
            </div>
          ) : (
            <>
              <div className="care-time-tabs" aria-label="Các mốc theo dõi">
                {data.observations.map((observation, index) => (
                  <button
                    key={observation.id}
                    aria-pressed={observation.id === active.id}
                    onClick={() => setSelected(observation.id)}
                  >
                    {observation.time
                      ? observation.time.replace("T", " ")
                      : `Mốc ${index + 1}`}
                  </button>
                ))}
              </div>
              <div className="care-observation" key={active.id}>
                <div className="form-section-bar">
                  <CareTextControl
                    editor={editor}
                    name={`observations.${activeIndex}.time`}
                    label="Ngày và giờ theo dõi"
                    type="datetime-local"
                  />
                  <RemoveEntry
                    label="mốc theo dõi này"
                    onRemove={() =>
                      editor.change(
                        "observations",
                        editor.form
                          .getValues("observations")
                          .filter(
                            (observation) => observation.id !== active.id,
                          ),
                      )
                    }
                  />
                </div>
                <CareObservationFields
                  renderField={(key, label) => (
                    <CareValueControl
                      editor={editor}
                      index={activeIndex}
                      careKey={key}
                      label={label}
                    />
                  )}
                />
              </div>
            </>
          )}
        </div>
        <aside className="clinical-form care-goals">
          <div className="form-section-bar">
            <h3>Chẩn đoán điều dưỡng / mục tiêu</h3>
          </div>
          <p className="form-help">
            Đánh dấu mục tiêu đã hoàn thành. Nội dung này dùng chung cho các mốc
            theo dõi trong phiếu.
          </p>
          {data.diagnoses.map((diagnosis, index) => (
            <CareDiagnosisEditor
              key={diagnosis.id}
              editor={editor}
              index={index}
              diagnosis={diagnosis}
            />
          ))}
          <Button
            variant="outline"
            onClick={() =>
              editor.change("diagnoses", [
                ...editor.form.getValues("diagnoses"),
                { id: crypto.randomUUID(), text: "", goals: [] },
              ])
            }
          >
            <Plus />
            Thêm chẩn đoán
          </Button>
        </aside>
      </div>
    </section>
  );
}

function CareDiagnosisEditor({
  editor,
  index,
  diagnosis,
}: {
  editor: CareEditor;
  index: number;
  diagnosis: CareDiagnosis;
}) {
  return (
    <fieldset className="care-diagnosis">
      <legend>Chẩn đoán {index + 1}</legend>
      <CareTextControl
        editor={editor}
        name={`diagnoses.${index}.text`}
        label="Nội dung chẩn đoán"
        multiline
      />
      {diagnosis.goals.map((goal, goalIndex) => (
        <div className="care-goal" key={goal.id}>
          <CareGoalControl
            editor={editor}
            diagnosisIndex={index}
            goalIndex={goalIndex}
          />
          <CareTextControl
            editor={editor}
            name={`diagnoses.${index}.goals.${goalIndex}.text`}
            label={`Mục tiêu ${goalIndex + 1} chẩn đoán ${index + 1}`}
            placeholder={`Mục tiêu ${goalIndex + 1}`}
          />
          <RemoveEntry
            label={`mục tiêu ${goalIndex + 1}`}
            onRemove={() =>
              editor.change(
                `diagnoses.${index}.goals`,
                editor.form
                  .getValues(`diagnoses.${index}.goals`)
                  .filter((item) => item.id !== goal.id),
              )
            }
          />
        </div>
      ))}
      <div className="form-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            editor.change(`diagnoses.${index}.goals`, [
              ...editor.form.getValues(`diagnoses.${index}.goals`),
              { id: crypto.randomUUID(), text: "", achieved: false },
            ])
          }
        >
          <Plus />
          Thêm mục tiêu
        </Button>
        <RemoveEntry
          label={`chẩn đoán ${index + 1}`}
          onRemove={() =>
            editor.change(
              "diagnoses",
              editor.form
                .getValues("diagnoses")
                .filter((item) => item.id !== diagnosis.id),
            )
          }
        />
      </div>
    </fieldset>
  );
}
