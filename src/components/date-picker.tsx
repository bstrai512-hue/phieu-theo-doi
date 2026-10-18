import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { vi } from 'react-day-picker/locale';
import { Calendar } from './ui/calendar';
import { Button } from './ui/button';
import { dayjs, parseDay } from '../lib/date';
import './date-picker.css';
export function DatePicker({value,onChange,disabledDates=[],availableDates,label='Chọn ngày'}:{value:string;onChange:(day:string)=>void;disabledDates?:string[];availableDates?:string[];label?:string}){
 const [open,setOpen]=useState(false);
 const selected=parseDay(value);
 return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button variant="outline" className="calendar-trigger" aria-label={`${label}: ${selected.isValid()?selected.format('DD/MM/YYYY'):'chưa chọn'}`}><CalendarDays/>{selected.isValid()?selected.format('DD/MM/YYYY'):label}<ChevronDown className="ml-auto"/></Button></Popover.Trigger><Popover.Portal><Popover.Content align="start" sideOffset={8} className="calendar-popover"><Calendar mode="single" locale={vi} weekStartsOn={1} captionLayout="dropdown" defaultMonth={selected.isValid()?selected.toDate():dayjs().toDate()} startMonth={dayjs().subtract(30,'year').startOf('year').toDate()} endMonth={dayjs().add(10,'year').endOf('year').toDate()} selected={selected.isValid()?selected.toDate():undefined} onSelect={date=>{if(date){onChange(dayjs(date).format('YYYY-MM-DD'));setOpen(false)}}} disabled={date=>{const key=dayjs(date).format('YYYY-MM-DD');return disabledDates.includes(key)||(availableDates!==undefined&&!availableDates.includes(key))}} formatters={{formatCaption:date=>dayjs(date).format('MMMM YYYY'),formatMonthDropdown:date=>dayjs(date).format('MMMM')}} autoFocus/><div className="calendar-hint">{availableDates?'Chọn một ngày đã có phiếu.':'Ngày đã có phiếu được làm mờ để tránh trùng.'}</div></Popover.Content></Popover.Portal></Popover.Root>
}
