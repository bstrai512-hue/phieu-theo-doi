import type { Dispatch, SetStateAction } from "react";
import type { CareData } from '../types';
import { careEditorValues, updateCareField } from "./care-form-state";
import { useSynchronizedForm } from "./use-synchronized-form";

export function useCareForm(
  data: CareData,
  onChange: Dispatch<SetStateAction<CareData>>,
) {
  return useSynchronizedForm(careEditorValues(data), (name, value) => {
    onChange((current) => updateCareField(current, name, value));
  });
}
export type CareEditor = ReturnType<typeof useCareForm>;
