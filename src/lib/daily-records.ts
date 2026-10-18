import { parseDay } from './date';
export type Session='morning'|'afternoon';
export type DailyRow={id:string;time:string;progress:string;orders:string;session?:Session};
export const sessionOf=(row:DailyRow):Session=>row.session??'morning';
export function dayRows(rows:DailyRow[],day:string){return rows.filter(r=>r.time.slice(0,10)===day)}
export function dayContent(rows:DailyRow[],day:string,session?:Session){const items=dayRows(rows,day).filter(r=>!session||sessionOf(r)===session);return {progress:items.map(r=>r.progress).filter(s=>s.trim()).join('\n'),orders:items.map(r=>r.orders).filter(s=>s.trim()).join('\n')}}
export function nextDay(day:string){return parseDay(day).add(1,'day').format('YYYY-MM-DD')}
export function copyDay(rows:DailyRow[],source:string,target:string,id:string):DailyRow[]{
 if(!parseDay(target).isValid())throw new Error('Ngày không hợp lệ');
 if(target===source)throw new Error('Chọn ngày khác ngày nguồn');
 if(dayRows(rows,target).length)throw new Error('Ngày này đã có nội dung');
 if(!dayRows(rows,source).length)throw new Error('Không tìm thấy ngày nguồn');
 return [...rows,...(['morning','afternoon'] as Session[]).map((session,index)=>({id:index?`${id}-afternoon`:id,time:`${target}T00:00`,session,...dayContent(rows,source,session)}))];
}
export function updateDay(rows:DailyRow[],day:string,kind:'progress'|'orders',text:string,session:Session='morning'):DailyRow[]{
 const items=dayRows(rows,day).filter(r=>sessionOf(r)===session);
 if(!items.length)return [...rows,{id:crypto.randomUUID(),time:`${day}T00:00`,session,progress:'',orders:'',[kind]:text}];
 const first=items[0];const merged={...first,...dayContent(rows,day,session),session,[kind]:text};
 return rows.flatMap(r=>r.time.slice(0,10)!==day||sessionOf(r)!==session?[r]:r.id===first.id?[merged]:[]);
}
export function formatDay(day:string){return parseDay(day).format('DD/MM/YYYY')}
