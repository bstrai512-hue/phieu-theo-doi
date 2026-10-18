import { dayjs, parseDay } from './date';
import { sessionOf } from './daily-records';
type Patient={name:string;birth:string;gender:string;code:string;admission:string;department:string;room:string;bed:string;diagnosis:string;differential:string};
type Row={id?:string;time:string;progress:string;orders:string;session?:'morning'|'afternoon'};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const value=(s:string)=>s.trim()?escape(s):'................';
function dateLabel(s:string){const date=parseDay(s);return date.isValid()?date.format('DD/MM/YYYY'):s}
function wrapText(text:string,widthMm:number):string[]{
 const context=document.createElement('canvas').getContext('2d');
 if(!context)throw new Error('Không thể chuẩn bị bản in');
 context.font='16px "Times New Roman"';
 const limit=widthMm*96/25.4;
 const result:string[]=[];
 for(const paragraph of text.replace(/\r/g,'').split('\n')){
  if(!paragraph.trim()){result.push('');continue}
  let line='';
  for(const word of paragraph.trim().split(/\s+/)){
   const candidate=line?`${line} ${word}`:word;
   if(context.measureText(candidate).width<=limit){line=candidate;continue}
   if(line){result.push(line);line=''}
   for(const character of word){if(line&&context.measureText(line+character).width>limit){result.push(line);line=''}line+=character}
  }
  if(line)result.push(line);
 }
 return result;
}
export function printForm(basePatient:Patient,rows:Row[],patientsByDay:Record<string,Patient>={}){
 const groups=new Map<string,Row[]>();
 for(const row of rows){const day=row.time.slice(0,10);groups.set(day,[...(groups.get(day)||[]),row])}
 if(!groups.size)groups.set(rows[0]?.time.slice(0,10)||dayjs().format('YYYY-MM-DD'),[]);
 const pages:{day:string;entries:string;front:boolean;side:number}[]=[];
 for(const [day,items] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  type Line={progress:string;orders:string;label?:string};
  const linesFor=(session:'morning'|'afternoon'):Line[]=>{
   const selected=items.filter(row=>sessionOf({...row,id:row.id??''})===session);
   const progress=wrapText(selected.map(r=>r.progress.trim()).filter(Boolean).join('\n'),65);
   const orders=wrapText(selected.map(r=>r.orders.trim()).filter(Boolean).join('\n'),88);
   return Array.from({length:Math.max(1,progress.length,orders.length)},(_,i)=>({progress:progress[i]||'',orders:orders[i]||'',label:i===0?(session==='morning'?'Sáng':'Chiều'):undefined}));
  };
  const morning=linesFor('morning'),afternoon=linesFor('afternoon');
  const front=morning.slice(0,24);
  const continuation=morning.slice(24);
  if(continuation.length)continuation[0]={...continuation[0],label:'Sáng (tiếp)'};
  const back=[...continuation,...afternoon];
  const chunks:Line[][]=[front];
  for(let offset=0;offset<back.length;offset+=32)chunks.push(back.slice(offset,offset+32));
  // Each day starts on a new physical sheet when duplex printing all days.
  if(chunks.length%2)chunks.push([]);
  chunks.forEach((chunk,side)=>{
   const count=side===0?24:32;
   const entries=Array.from({length:count},(_,i)=>{const line=chunk[i];const time=i===0?escape(dateLabel(day)):'';return `<tr class="ruled"><td class="time">${time}</td><td class="content">${escape(line?.progress||'')||'&nbsp;'}</td><td class="content">${escape(line?.orders||'')||'&nbsp;'}</td></tr>`}).join('');
   pages.push({day,entries,front:side===0,side});
  });
 }
 return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>Phiếu theo dõi điều trị</title><style>
 @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#e8ece9;color:#000;font-family:"Times New Roman",serif;font-size:12pt}.paper{width:210mm;min-height:297mm;break-after:page;margin:16px auto;padding:10mm;background:white;box-shadow:0 2px 12px #0002}.heading{display:grid;grid-template-columns:34% 42% 24%;align-items:start;gap:0;margin-bottom:7mm;line-height:1.35}.hospital{font-size:10.5pt}.hospital strong{font-size:12pt}.title{text-align:center;padding-top:3mm}.title h1{font-size:16pt;margin:0 0 1mm;white-space:nowrap}.codes{font-size:10.5pt;padding-left:4mm}.meta-line{display:flex;align-items:baseline;gap:2mm;margin:2.5mm 0;line-height:1.45}.grow{flex:1;min-width:0}.fill{border-bottom:1px dotted #999;padding:0 1mm;overflow-wrap:anywhere}.sex{white-space:nowrap}.box{display:inline-block;border:1px solid #000;width:3.5mm;height:3.5mm;font-family:Arial,sans-serif;font-size:10pt;line-height:3mm;text-align:center;margin:0 1mm;vertical-align:middle}.table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:4mm;border:1px solid #444}.table th,.table td{border-right:1px solid #555;border-bottom:1px solid #999;padding:1.5mm 2mm;vertical-align:top}.table th{font-weight:bold;text-align:center;vertical-align:middle;height:13mm;font-size:13pt}.table th small{display:block;font-size:11pt;font-weight:normal}.time{text-align:center;font-size:10pt;line-height:1.3}.ruled .time{line-height:1.2}.time small{display:block;font-size:9pt}.sheet-label{width:210mm;margin:18px auto 0;font:13px Arial,sans-serif;color:#4b6353}.content{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.ruled{height:7.5mm;break-inside:avoid}.ruled td{height:7.5mm;padding:0 2mm;vertical-align:middle;line-height:7.5mm;white-space:nowrap}.paper:last-child{break-after:auto}.continuation{font-size:10pt;text-align:right;margin:0}.note{font-size:11pt;margin:2mm 0 0;line-height:1.4}.note strong{font-style:italic}thead{display:table-header-group}@media print{.sheet-label{display:none}body{background:white}.paper{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.table{border-color:#000}.table th,.table td{border-color:#555}}
 </style></head><body>${pages.map((page,index)=>{const patient=patientsByDay[page.day]??basePatient;return `<div class="sheet-label">${escape(dateLabel(page.day))} — ${page.side%2===0?'Mặt trước':'Mặt sau'}${page.side>1?' (tờ tiếp theo)':''}</div><article class="paper">${page.front?`<header class="heading"><div class="hospital">BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG<br/><strong>KHOA</strong> ${value(patient.department)}</div><div class="title"><h1>PHIẾU THEO DÕI ĐIỀU TRỊ</h1><div>Tờ số: ${index+1}</div></div><div class="codes">MS:36/BV-02<br/>Số vào viện: ${value(patient.admission)}<br/>Mã NB: ${value(patient.code)}</div></header>
 <div class="meta-line"><span>Họ và tên người bệnh:</span><span class="fill grow">${value(patient.name)}</span><span>Năm sinh:</span><span class="fill">${patient.birth?escape(patient.birth):'........'}</span><span class="sex">Nam<span class="box">${patient.gender==='Nam'?'×':''}</span> Nữ<span class="box">${patient.gender==='Nữ'?'×':''}</span>${patient.gender==='Khác'?' Khác':''}</span></div>
 <div class="meta-line"><span>Khoa:</span><span class="fill grow">${value(patient.department)}</span><span>Phòng:</span><span class="fill grow">${value(patient.room)}</span><span>Giường:</span><span class="fill grow">${value(patient.bed)}</span></div><div class="meta-line"><span>Chẩn đoán:</span><span class="fill grow">${value(patient.diagnosis)}</span></div><div class="meta-line"><span>Chẩn đoán phân biệt:</span><span class="fill grow">${value(patient.differential)}</span></div>
 `:''}<table class="table"><colgroup><col style="width:14%"/><col style="width:37%"/><col style="width:49%"/></colgroup><thead><tr><th>Ngày</th><th>Diễn biến bệnh<small>(Viết diễn biến theo cấu trúc như SOAP)</small></th><th>Chỉ định</th></tr></thead><tbody>${page.entries}</tbody></table><p class="note"><strong>Ghi chú:</strong> Bác sĩ ký ngay sau mỗi lần ghi chép trong phần “Diễn biến bệnh” hoặc “Chỉ định”.</p></article>`}).join('')}</body></html>`;
}
