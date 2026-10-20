import { useId } from "react";
import { Input } from "../components/ui/input";
import {
  careConventions,
  careValueIssue,
  joinCareDetail,
  selectedCareCodes,
  splitCareDetail,
} from "./care-conventions";
import type { CareKey } from "./model";

/** Each control owns conversion to stored code strings; empty always means unrecorded. */
export function CareField({
  field,
  label,
  value,
  onChange,
}: {
  field: CareKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const definition = careConventions[field];
  const hintId = `${id}-hint`;
  const { code, detail } = splitCareDetail(value);
  const issue = careValueIssue(field, value);
  if (definition.kind === "text")
    return (
      <label className="field care-control">
        <span>{label}</span>
        {definition.multiline ? (
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </label>
    );
  if (definition.kind === "multiple") {
    const selected = selectedCareCodes(definition, value);
    const update = (codes: string[]) =>
      onChange(
        codes
          .sort(
            (a, b) =>
              Number(a.replace(/[+-]$/, "")) - Number(b.replace(/[+-]$/, "")),
          )
          .join(", "),
      );
    return (
      <fieldset className="care-control care-multiple">
        <legend>{label}</legend>
        {selected === null && (
          <p className="care-legacy" role="status">
            Đã lưu: {value}. Chọn mã bên dưới để thay thế; chưa chọn thì giữ
            nguyên.
          </p>
        )}
        <details>
          <summary>
            {selected?.length
              ? `Đã chọn: ${selected.map((c) => `${definition.prefix}.${c}`).join(", ")}`
              : "Chọn mã can thiệp"}
          </summary>
          <div className="care-code-options">
            {definition.options.map((option) => {
              const existing = selected?.find(
                (c) => c.replace(/[+-]$/, "") === option.code,
              );
              return (
                <div className="care-code-option" key={option.code}>
                  <label>
                    <input
                      type="checkbox"
                      checked={existing !== undefined}
                      onChange={(e) =>
                        update(
                          e.target.checked
                            ? [...(selected ?? []), option.code]
                            : (selected ?? []).filter(
                                (c) => c.replace(/[+-]$/, "") !== option.code,
                              ),
                        )
                      }
                    />
                    <span>
                      <b>
                        {definition.prefix}.{option.code}
                      </b>{" "}
                      {option.label}
                    </span>
                  </label>
                  {existing !== undefined &&
                    definition.actions?.includes(option.code) && (
                      <label className="care-action-choice">
                        <span>
                          Thao tác {definition.prefix}.{option.code}
                        </span>
                        <select
                          aria-label={`Thao tác ${definition.prefix}.${option.code}`}
                          value={existing.slice(option.code.length)}
                          onChange={(e) =>
                            update(
                              (selected ?? []).map((c) =>
                                c.replace(/[+-]$/, "") === option.code
                                  ? option.code + e.target.value
                                  : c,
                              ),
                            )
                          }
                        >
                          <option value="">Chưa chọn thao tác</option>
                          <option value="+">Đặt (+)</option>
                          <option value="-">Rút (-)</option>
                        </select>
                      </label>
                    )}
                </div>
              );
            })}
          </div>
        </details>
        {issue && (
          <p className="care-field-issue" role="status">
            {issue}
          </p>
        )}
        {selected && selected.length > 0 && (
          <p id={hintId} className="care-code-hint">
            Khi in:{" "}
            {selected.map((c) => c.replace(/([+-])$/, "($1)")).join(", ")}
          </p>
        )}
      </fieldset>
    );
  }
  if (definition.kind === "pressure") {
    const match = value.match(/^(\d*)\s*\/\s*(\d*)$/);
    const legacy = !!value && !match;
    const systolic = match?.[1] ?? "";
    const diastolic = match?.[2] ?? "";
    return (
      <fieldset className="care-control">
        <legend>{label}</legend>
        {legacy && (
          <p className="care-legacy">
            Đã lưu: {value}. Nhập số bên dưới để thay thế.
          </p>
        )}
        <div className="care-pressure">
          <label className="field">
            <span>Tâm thu</span>
            <Input
              aria-label={`${label} tâm thu`}
              type="number"
              step="1"
              value={systolic}
              onChange={(e) =>
                onChange(
                  e.target.value || diastolic
                    ? `${e.target.value}/${diastolic}`
                    : "",
                )
              }
            />
          </label>
          <span>/</span>
          <label className="field">
            <span>Tâm trương</span>
            <Input
              aria-label={`${label} tâm trương`}
              type="number"
              step="1"
              value={diastolic}
              onChange={(e) =>
                onChange(
                  systolic || e.target.value
                    ? `${systolic}/${e.target.value}`
                    : "",
                )
              }
            />
          </label>
        </div>
        {issue && (
          <p className="care-field-issue" role="status">
            {issue}
          </p>
        )}
      </fieldset>
    );
  }
  if (definition.kind === "choice") {
    const known = definition.options.some((o) => o.code === code);
    const showDetail =
      known &&
      code !== "-" &&
      (!!definition.detail || definition.other === code);
    return (
      <div className="care-control">
        <label className="field">
          <span>{label}</span>
          <select
            aria-label={label}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby={hintId}
          >
            <option value="">Chưa ghi nhận</option>
            {code && !known && <option value={code}>Đã lưu: {value}</option>}
            {definition.options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} — {option.label}
              </option>
            ))}
          </select>
        </label>
        {issue && (
          <p className="care-field-issue" role="status">
            {issue}
          </p>
        )}
        {showDetail && (
          <label className="field care-detail">
            <span>{definition.detail ?? "Ghi rõ thông tin khác"}</span>
            <Input
              value={detail}
              onChange={(e) => onChange(joinCareDetail(code, e.target.value))}
            />
          </label>
        )}
        <p className="care-code-hint" id={hintId}>
          {known
            ? `Khi in: ${code}${detail ? " / " + detail : ""}`
            : code
              ? "Giá trị cũ được giữ nguyên cho đến khi bạn chọn mã mới."
              : "Chọn theo quy ước ký hiệu trên phiếu."}
        </p>
      </div>
    );
  }
  const numeric = code === "" || /^-?\d+(?:\.\d+)?$/.test(code);
  return (
    <div className="care-control">
      <label className="field">
        <span>{label}</span>
        {!numeric && (
          <span className="care-legacy">
            Đã lưu: {value}. Nhập số để thay thế.
          </span>
        )}
        <Input
          aria-label={label}
          type="number"
          step={definition.decimal ? "any" : "1"}
          value={numeric ? code : ""}
          onChange={(e) => onChange(joinCareDetail(e.target.value, detail))}
        />
      </label>
      {definition.detail && code && numeric && (
        <label className="field care-detail">
          <span>{definition.detail}</span>
          <Input
            value={detail}
            onChange={(e) => onChange(joinCareDetail(code, e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
