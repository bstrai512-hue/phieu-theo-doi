import { useRef } from 'react';

/** One option per logical line; numbering stays outside the stored value. */
export function NumberedOptionsInput({ id, rows, value, onChange, placeholder }: {
  id: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lineCount = value.split('\n').length;
  return <div className="numbered-options">
    <div ref={gutter} className="numbered-options-gutter" aria-hidden="true">
      <div>{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
    </div>
    <textarea id={id} className="settings-options" rows={rows} value={value} wrap="off"
      onChange={event => onChange(event.target.value)} placeholder={placeholder}
      onScroll={event => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }}/>
  </div>;
}
