import { careConventions, formatCareValue } from "./care-conventions";
import type { Patient } from "../services/treatment-records/model";
import { careGroups } from "./model";
import type { CareData, Forms } from "./model";
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const value = (text: string) =>
  text.trim() ? escapeHtml(text).replace(/\n/g, "<br/>") : "…………";
const date = (text: string) => {
  const [day, time] = text.split("T");
  const parts = day.split("-");
  return `${parts.length === 3 ? escapeHtml(parts.reverse().join("/")) : escapeHtml(day)}${time ? " " + escapeHtml(time) : ""}`;
};
function header(patient: Patient, title: string, code: string, page = 1) {
  return `<header><div><strong>BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG</strong><br/>Khoa: ${value(patient.department)}</div><div class="title"><h1>${title}</h1>Tờ số: ${page}</div><div>MS: ${code}<br/>Số vào viện: ${value(patient.admission)}<br/>Mã người bệnh: ${value(patient.code)}</div></header><p>Họ và tên người bệnh: <strong>${value(patient.name)}</strong>　 Năm sinh: ${value(patient.birth)}　 Nam ${patient.gender === "Nam" ? "☒" : "☐"}　Nữ ${patient.gender === "Nữ" ? "☒" : "☐"}${patient.gender === "Khác" ? "　Khác" : ""}</p><p>Phòng: ${value(patient.room)}　 Giường: ${value(patient.bed)}　 Chẩn đoán: ${value(patient.diagnosis)}</p>`;
}
function documentHtml(title: string, body: string) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>${title}</title><style>
  @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font:11pt 'Times New Roman',serif;color:#000;margin:0;background:#e9eeeb}.paper{width:190mm;min-height:277mm;padding:0;margin:8mm auto;background:#fff;break-after:page}.paper:last-child{break-after:auto}header{display:flex;justify-content:space-between;gap:4mm;font-size:9pt;padding-top:3mm}header>div{flex:1}.title{text-align:center}h1{font-size:14pt;margin:0 0 2mm}p{margin:2mm 0;font-size:11pt;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #000;padding:2mm 1mm;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}.infusion{font-size:9pt;margin-top:4mm}.infusion td{height:9mm}.care-grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1.25fr);gap:0;margin-top:3mm;align-items:start}.care-table{font-size:8pt;line-height:1.1}.care-table td,.care-table th{padding:.35mm .8mm;min-height:4mm}.care-table .group{width:15%}.care-table .label{width:27%;text-align:left;font-weight:normal}.care-side{border:1px solid #000;border-left:0;padding:1.5mm;font-size:8.5pt}.care-side p{font-size:8.5pt;margin:1mm 0}.care-side h2{font-size:9pt;margin:0 0 2mm}.legend{font-size:8pt;line-height:1.25;margin-top:3mm}.legend p{font-size:8pt}.goal{margin-bottom:1.5mm}.group-row th{background:#eee;text-align:left}.continuation{font-size:9pt;padding-top:2mm}@media print{body{background:white}.paper{width:auto;min-height:0;margin:0;padding:0}header{padding-top:0}button{display:none}}
  </style></head><body>${body}</body></html>`;
}
export function printInfusion(patient: Patient, data: Forms["infusion"]) {
  const rows = [...data.rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  );
  const cells = (r: (typeof rows)[number]) =>
    `<tr><td>${date(r.date)}</td><td>${value(r.fluid)}</td><td>${value(r.quantity)}</td><td>${value(r.batch)}</td><td>${value(r.rate)}</td><td>${date(r.start)}</td><td>${date(r.end)}</td><td>${value(r.doctor)}</td><td>${value(r.nurse)}</td></tr>`;
  return documentHtml(
    "Phiếu theo dõi truyền dịch",
    `<article class="paper">${header(patient, "PHIẾU THEO DÕI<br/>TRUYỀN DỊCH", "07/BV-02")}<table class="infusion"><colgroup><col style="width:11%"/><col style="width:21%"/><col style="width:7%"/><col style="width:10%"/><col style="width:8%"/><col style="width:10%"/><col style="width:10%"/><col style="width:12%"/><col style="width:11%"/></colgroup><thead><tr><th rowspan="2">Ngày tháng</th><th rowspan="2">Tên dịch truyền / Hàm lượng</th><th rowspan="2">Số lượng</th><th rowspan="2">Lô / Số sản xuất</th><th rowspan="2">Tốc độ giọt/phút</th><th colspan="2">Thời gian</th><th rowspan="2">BS chỉ định</th><th rowspan="2">Điều dưỡng thực hiện</th></tr><tr><th>Bắt đầu</th><th>Kết thúc</th></tr></thead><tbody>${rows.map(cells).join("")}${Array.from({ length: Math.max(0, 22 - rows.length) }, () => "<tr>" + Array.from({ length: 9 }, () => "<td> </td>").join("") + "</tr>").join("")}</tbody></table></article>`,
  );
}
const conventionLabels = [
  ["skin", "Da, niêm"],
  ["awareness", "Tri giác"],
  ["edema", "Phù"],
  ["pulseQuality", "Tính chất mạch"],
  ["diet", "Chế độ ăn"],
  ["mobility", "Vận động"],
  ["woundState", "Tình trạng vết thương"],
  ["drainage", "Theo dõi dẫn lưu"],
] as const;
const legend = `<div class="legend"><strong>VI. Quy ước ký hiệu</strong><p>(+): Có　(-): Không<br/>Khác: Ghi cụ thể</p><p>${conventionLabels
  .map(([key, label]) => {
    const def = careConventions[key];
    return def.kind === "choice"
      ? `<b>${label}:</b> ${def.options
          .filter((o) => o.code !== "-")
          .map((o) => `${o.code}. ${escapeHtml(o.label)}`)
          .join(", ")}`
      : "";
  })
  .join("<br/>")}</p><b>Can thiệp điều dưỡng</b><p>${(
  ["medication", "clinical", "nursing", "education"] as const
)
  .map((key) => {
    const def = careConventions[key];
    return def.kind === "multiple"
      ? def.options
          .map(
            (o) =>
              `${def.prefix}.${o.code}: ${escapeHtml(o.label)}${def.actions?.includes(o.code) ? " (đặt + / rút -)" : ""}`,
          )
          .join("<br/>")
      : "";
  })
  .join("<br/>")}</p></div>`;
export function printCare(patient: Patient, data: CareData) {
  const observations = [...data.observations].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const batches = Array.from(
    { length: Math.max(1, Math.ceil(observations.length / 4)) },
    (_, i) => observations.slice(i * 4, i * 4 + 4),
  );
  const notes: {
    label: string;
    text: string;
  }[] = [];
  const cell = (text: string, label: string, limit = 32) => {
    if (text.length <= limit) return value(text);
    notes.push({ label, text });
    return `Chi tiết [${notes.length}]`;
  };
  const goals =
    data.diagnoses
      .map(
        (d, i) =>
          `<div class="goal"><b>Chẩn đoán ${i + 1}:</b> ${cell(d.text, `Chẩn đoán điều dưỡng ${i + 1}`, 100)}${d.goals.map((g) => `<p>${g.achieved ? "☒" : "☐"} ${cell(g.text, `Mục tiêu của chẩn đoán ${i + 1}`, 100)}</p>`).join("")}</div>`,
      )
      .join("") || "<p>Chẩn đoán: ………………</p><p>☐ Mục tiêu: ………………</p>";
  const body = batches
    .map((batch, index) => {
      const columns = Array.from({ length: 4 }, (_, i) => batch[i]);
      const tableRows = careGroups
        .map(
          (group) =>
            `${group.title === "Can thiệp điều dưỡng" ? '<tr class="group-row"><th colspan="6">III. Can thiệp điều dưỡng</th></tr>' : ""}${group.fields.map(([key, label], i) => `<tr>${i === 0 ? `<th class="group" rowspan="${group.fields.length}">${escapeHtml(group.title)}</th>` : ""}<th class="label">${escapeHtml(label)}</th>${columns.map((o) => `<td>${o?.values[key] ? cell(formatCareValue(key, o.values[key]!), `${date(o.time)} - ${label}`) : " "}</td>`).join("")}</tr>`).join("")}`,
        )
        .join("");
      return `<article class="paper">${index % 2 === 0 ? header(patient, "PHIẾU THEO DÕI VÀ CHĂM SÓC<br/>(Cấp 2 – 3)", "38/BV2", Math.floor(index / 2) + 1) + `<p>Tiền sử dị ứng: ${data.allergyStatus === "unknown" ? "☒" : "☐"} Chưa ghi nhận　${data.allergyStatus === "known" ? "☒" : "☐"} Có, ghi rõ: ${value(data.allergy)}</p>` : `<p class="continuation">${value(patient.name)} — ${value(patient.admission)} — Mặt tiếp theo</p>`}<div class="care-grid"><table class="care-table"><colgroup><col style="width:15%"/><col style="width:27%"/>${columns.map(() => '<col style="width:14.5%"/>').join("")}</colgroup><thead><tr><th colspan="2">Ngày / tháng / năm</th>${columns.map((o) => `<th>${o ? date(o.time.slice(0, 10)) : " "}</th>`).join("")}</tr><tr><th colspan="2">Giờ</th>${columns.map((o) => `<th>${o ? escapeHtml(o.time.slice(11)) : " "}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table><aside class="care-side"><h2>IV. Chẩn đoán ĐD / Đánh giá mục tiêu</h2><p>☒ Mục tiêu đã hoàn thành<br/>☐ Mục tiêu chưa hoàn thành</p>${goals}${legend}</aside></div></article>`;
    })
    .join("");
  const appendix = notes.length
    ? `<article class="paper">${header(patient, "CHI TIẾT PHIẾU THEO DÕI<br/>VÀ CHĂM SÓC", "38/BV2")}<h2>Nội dung ghi nhận chi tiết</h2>${notes.map((note, index) => `<p><b>[${index + 1}] ${escapeHtml(note.label)}</b><br/>${value(note.text)}</p>`).join("")}</article>`
    : "";
  return documentHtml("Phiếu theo dõi và chăm sóc", body + appendix);
}
