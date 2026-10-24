import { parseDay } from './date';
import { mergeOrders } from './treatment-orders';
import type { Session, TreatmentRow as DailyRow } from '../types';
export const sessionOf = (row: DailyRow): Session => row.session ?? 'morning';
export function dayRows(rows: DailyRow[], day: string) { return rows.filter(row => row.time.slice(0, 10) === day); }
export function dayContent(rows: DailyRow[], day: string, session?: Session) {
  const items = dayRows(rows, day).filter(row => !session || sessionOf(row) === session);
  return {
    progress: items.map(row => row.progress).filter(text => text.trim()).join('\n'),
    orders: mergeOrders(items.map(row => row.orders)),
  };
}
export function nextDay(day: string) { return parseDay(day).add(1, 'day').format('YYYY-MM-DD'); }
export function copyDay(rows: DailyRow[], source: string, target: string, id: string): DailyRow[] {
  if (!parseDay(target).isValid()) throw new Error('Ngày không hợp lệ');
  if (target === source) throw new Error('Chọn ngày khác ngày nguồn');
  if (dayRows(rows, target).length) throw new Error('Ngày này đã có nội dung');
  if (!dayRows(rows, source).length) throw new Error('Không tìm thấy ngày nguồn');
  return [...rows, ...(['morning', 'afternoon'] as Session[]).map((session, index) => ({
    id: index ? `${id}-afternoon` : id, time: `${target}T00:00`, session,
    ...structuredClone(dayContent(rows, source, session)),
  }))];
}
type Content = ReturnType<typeof dayContent>;
export function updateDay<K extends keyof Content>(rows: DailyRow[], day: string, kind: K, value: Content[K], session: Session = 'morning'): DailyRow[] {
  const items = dayRows(rows, day).filter(row => sessionOf(row) === session);
  if (!items.length) return [...rows, { id: crypto.randomUUID(), time: `${day}T00:00`, session, progress: '', orders: '', [kind]: value }];
  const first = items[0];
  const merged = { ...first, ...dayContent(rows, day, session), session, [kind]: value };
  return rows.flatMap(row => row.time.slice(0, 10) !== day || sessionOf(row) !== session ? [row] : row.id === first.id ? [merged] : []);
}
export function formatDay(day: string) { return parseDay(day).format('DD/MM/YYYY'); }
