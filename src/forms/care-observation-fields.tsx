import type { ReactNode } from "react";
import { careGroups } from "./model";
import type { CareKey } from '../types';

/** Shared grouping and field order for patient entries and default configuration. */
export function CareObservationFields({
  renderField,
}: {
  renderField: (key: CareKey, label: string) => ReactNode;
}) {
  return (
    <>
      {careGroups.map((group) => (
        <fieldset key={group.title} className="care-group">
          <legend>{group.title}</legend>
          <div className="care-field-grid">
            {group.fields.map(([key, label]) => (
              <div
                key={key}
                className={
                  ["medication", "clinical", "nursing", "education"].includes(
                    key,
                  )
                    ? "care-multiple"
                    : undefined
                }
              >
                {renderField(key, label)}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
