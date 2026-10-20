import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import type {
  DefaultValues,
  FieldPath,
  FieldPathValue,
  FieldValues,
} from "react-hook-form";
import { formValuesKey } from "./form-values";

/** Workspace owns persistence/conflicts. RHF owns the controls, and edits publish immediately. */
export function useSynchronizedForm<Data extends FieldValues>(
  data: Data,
  onEdit: <Name extends FieldPath<Data>>(
    name: Name,
    value: FieldPathValue<Data, Name>,
  ) => void,
) {
  const form = useForm<Data>({
    defaultValues: data as DefaultValues<Data>,
    mode: "onChange",
    shouldUnregister: false,
  });
  const { getValues, reset, setValue } = form;
  useEffect(() => {
    if (formValuesKey(getValues()) !== formValuesKey(data))
      reset(structuredClone(data));
  }, [data, getValues, reset]);
  const change = useCallback(
    <Name extends FieldPath<Data>>(
      name: Name,
      value: FieldPathValue<Data, Name>,
    ) => {
      const snapshot = structuredClone(value);
      setValue(name, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      onEdit(name, snapshot);
    },
    [onEdit, setValue],
  );
  return { form, change };
}
