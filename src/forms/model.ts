import { ordersText, validOrders } from '../lib/treatment-orders';
import type { FormKind, TreatmentRow, InfusionRow, InfusionKey, CareKey, CareObservation, CareData, Forms } from '../types';

export const infusionFields = [
  ["date", "Ngày truyền", "date"],
  ["fluid", "Tên dịch truyền / hàm lượng", "text"],
  ["quantity", "Số lượng", "text"],
  ["batch", "Lô / số sản xuất", "text"],
  ["rate", "Tốc độ (giọt/phút)", "text"],
  ["start", "Bắt đầu", "datetime-local"],
  ["end", "Kết thúc", "datetime-local"],
  ["doctor", "Bác sĩ chỉ định", "text"],
  ["nurse", "Điều dưỡng thực hiện", "text"],
] as const satisfies readonly (readonly [InfusionKey, string, string])[];
export const careGroups = [
  { title: "Phân cấp chăm sóc", fields: [["level", "Phân cấp chăm sóc"]] },
  {
    title: "Chỉ số sinh tồn",
    fields: [
      ["pulse", "Mạch (lần/phút)"],
      ["temperature", "Nhiệt độ (°C)"],
      ["pressure", "Huyết áp (mmHg)"],
      ["breathing", "Nhịp thở (lần/phút)"],
      ["spo2", "SpO₂ (%)"],
      ["news", "Cảnh báo sớm (NEWS 2)"],
    ],
  },
  {
    title: "Toàn thân",
    fields: [
      ["awareness", "Tri giác"],
      ["skin", "Da, niêm mạc"],
      ["edema", "Phù / vị trí"],
    ],
  },
  {
    title: "Hô hấp",
    fields: [
      ["dyspnea", "Khó thở"],
      ["oxygen", "Thở oxy"],
      ["sputum", "Ho / đàm"],
    ],
  },
  {
    title: "Tuần hoàn",
    fields: [
      ["pulseQuality", "Tính chất mạch"],
      ["chestPain", "Đau ngực"],
    ],
  },
  {
    title: "Tiết niệu, tiêu hóa",
    fields: [
      ["urine", "Tiểu"],
      ["stool", "Trung / đại tiện"],
      ["digestionOther", "Khác"],
    ],
  },
  {
    title: "Dinh dưỡng",
    fields: [
      ["tubeFeeding", "Ăn qua sonde"],
      ["diet", "Chế độ ăn"],
    ],
  },
  {
    title: "Vệ sinh cá nhân",
    fields: [
      ["selfCare", "Tự thực hiện"],
      ["assistance", "Cần hỗ trợ"],
    ],
  },
  {
    title: "Vận động, PHCN",
    fields: [
      ["mobility", "Vận động"],
      ["rehabilitation", "Tập PHCN"],
    ],
  },
  {
    title: "Theo dõi khác",
    fields: [
      ["wound", "Vết thương / vết mổ"],
      ["woundState", "Tình trạng vết thương / VM"],
      ["pain", "Đau (VAS) / vị trí"],
      ["drainage", "Theo dõi dẫn lưu"],
      ["braden", "Nguy cơ loét (Braden)"],
      ["morse", "Nguy cơ ngã (Morse)"],
      ["other", "Khác"],
    ],
  },
  {
    title: "Can thiệp điều dưỡng",
    fields: [
      ["medication", "Thực hiện chỉ định thuốc (T)"],
      ["clinical", "Thực hiện chỉ định cận lâm sàng (CLS)"],
      ["nursing", "Chăm sóc điều dưỡng (CS)"],
      ["education", "Tư vấn, giáo dục sức khỏe (TV)"],
      ["interventionOther", "Khác"],
    ],
  },
  {
    title: "Bàn giao",
    fields: [
      ["records", "Hồ sơ bệnh án"],
      ["images", "CLS / phim"],
      ["medications", "Thuốc, dịch truyền"],
      ["transport", "Người bệnh / phương tiện vận chuyển"],
      ["performedBy", "Tên ĐD/NHS thực hiện / bàn giao"],
      ["receivedBy", "Tên ĐD/NHS tiếp nhận"],
    ],
  },
] as const satisfies readonly { readonly title: string; readonly fields: readonly (readonly [CareKey, string])[] }[];
export const formLabels: Record<FormKind, string> = {
  treatment: "Theo dõi điều trị",
  infusion: "Theo dõi truyền dịch",
  care: "Theo dõi và chăm sóc",
};
export const emptyCare = (): CareData => ({
  allergyStatus: "",
  allergy: "",
  observations: [],
  diagnoses: [],
});
export const makeInfusion = (date: string): InfusionRow => ({
  id: crypto.randomUUID(),
  date,
  fluid: "",
  quantity: "",
  batch: "",
  rate: "",
  start: "",
  end: "",
  doctor: "",
  nurse: "",
});
const obj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const unique = (
  items: {
    id: string;
  }[],
) => new Set(items.map((x) => x.id)).size === items.length;
export function validTreatmentRows(rows: unknown): rows is TreatmentRow[] {
  return (
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.every(
      (r) =>
        obj(r) &&
        ["id", "time", "progress"].every(
          (k) => typeof r[k] === "string",
        ) &&
        validOrders(r.orders) &&
        (r.session === undefined ||
          r.session === "morning" ||
          r.session === "afternoon"),
    ) &&
    unique(rows)
  );
}
export function validForms(forms: unknown): forms is Forms {
  if (
    !obj(forms) ||
    !obj(forms.treatment) ||
    !validTreatmentRows(forms.treatment.rows) ||
    !obj(forms.infusion) ||
    !Array.isArray(forms.infusion.rows) ||
    !obj(forms.care)
  )
    return false;
  const care = forms.care;
  const keys = new Set<string>(
    careGroups.flatMap((g) => g.fields.map((f) => f[0])),
  );
  return (
    forms.infusion.rows.every(
      (r) =>
        obj(r) &&
        typeof r.id === "string" &&
        infusionFields.every(([k]) => typeof r[k] === "string"),
    ) &&
    unique(forms.infusion.rows) &&
    ["", "unknown", "known"].includes(care.allergyStatus as string) &&
    typeof care.allergy === "string" &&
    Array.isArray(care.observations) &&
    care.observations.every(
      (o) =>
        obj(o) &&
        typeof o.id === "string" &&
        typeof o.time === "string" &&
        obj(o.values) &&
        Object.entries(o.values).every(
          ([k, v]) => keys.has(k) && typeof v === "string",
        ),
    ) &&
    unique(care.observations) &&
    Array.isArray(care.diagnoses) &&
    care.diagnoses.every(
      (d) =>
        obj(d) &&
        typeof d.id === "string" &&
        typeof d.text === "string" &&
        Array.isArray(d.goals) &&
        d.goals.every(
          (g) =>
            obj(g) &&
            typeof g.id === "string" &&
            typeof g.text === "string" &&
            typeof g.achieved === "boolean",
        ) &&
        unique(d.goals),
    ) &&
    unique(care.diagnoses)
  );
}
export function hasFormContent(forms: Forms): boolean {
  return (
    forms.treatment.rows.some((r) => r.progress.trim() || ordersText(r.orders).trim()) ||
    forms.infusion.rows.some((r) =>
      infusionFields.some(([k]) => k !== "date" && r[k].trim()),
    ) ||
    forms.care.allergyStatus !== "" ||
    !!forms.care.allergy.trim() ||
    forms.care.observations.length > 0 ||
    forms.care.diagnoses.length > 0
  );
}
