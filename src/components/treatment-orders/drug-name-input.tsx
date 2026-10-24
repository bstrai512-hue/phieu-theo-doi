import type { DrugName } from '@/types';
import {
  Combobox, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup,
  ComboboxInput, ComboboxItem, ComboboxList,
} from '@/components/ui/combobox';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Free typing is authoritative; selection fills the name only. */
export function DrugNameInput({ id, value, names, onChange }: {
  id: string; value: string; names: readonly DrugName[]; onChange: (name: string) => void;
}) {
  const choices = [...new Set(names.map(item => item.name.trim()).filter(Boolean))];
  return <Combobox items={choices} inputValue={value} value={choices.includes(value) ? value : null}
    filter={(item: string, query: string) => normalize(item).includes(normalize(query))}
    onInputValueChange={(name, details) => {
      if (['input-change', 'input-clear', 'clear-press'].includes(details.reason)) onChange(name);
    }}
    onValueChange={name => { if (typeof name === 'string') onChange(name); }}>
    <ComboboxInput density="compact" id={id} autoComplete="off" placeholder="Tìm hoặc nhập tên thuốc" />
    <ComboboxContent>
      <ComboboxEmpty>Chưa có tên phù hợp. Có thể giữ tên tự nhập.</ComboboxEmpty>
      <ComboboxList><ComboboxGroup><ComboboxCollection>
        {(name: string) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
      </ComboboxCollection></ComboboxGroup></ComboboxList>
    </ComboboxContent>
  </Combobox>;
}
