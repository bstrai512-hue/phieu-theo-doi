import type { CareKey } from "./model";

export type CareOption = { code: string; label: string };
type Choice = {
  kind: "choice";
  options: CareOption[];
  detail?: string;
  other?: string;
};
type Multiple = {
  kind: "multiple";
  prefix: string;
  options: CareOption[];
  actions?: string[];
};
export type CareFieldDefinition =
  | Choice
  | Multiple
  | { kind: "number"; decimal?: boolean; detail?: string }
  | { kind: "pressure" }
  | { kind: "text"; multiline?: boolean };
const options = (labels: string[]): CareOption[] =>
  labels.map((label, index) => ({ code: String(index + 1), label }));
const yesNo: Choice = {
  kind: "choice",
  options: [
    { code: "+", label: "Có" },
    { code: "-", label: "Không" },
  ],
};
export const careConventions: Record<CareKey, CareFieldDefinition> = {
  level: { kind: "choice", options: options(["Cấp 1", "Cấp 2", "Cấp 3"]) },
  pulse: { kind: "number" },
  temperature: { kind: "number", decimal: true },
  pressure: { kind: "pressure" },
  breathing: { kind: "number" },
  spo2: { kind: "number", decimal: true },
  news: { kind: "number" },
  awareness: { kind: "choice", options: options(["Tỉnh", "Lơ mơ", "Hôn mê"]) },
  skin: {
    kind: "choice",
    options: options(["Hồng", "Vàng", "Nhợt nhạt", "Tím tái", "Khác"]),
    other: "5",
  },
  edema: {
    kind: "choice",
    options: [
      { code: "-", label: "Không phù" },
      ...options([
        "Ấn lõm <2 mm",
        "Ấn lõm 2–4 mm",
        "Ấn lõm 4–6 mm",
        "Ấn lõm 6–8 mm",
      ]),
    ],
    detail: "Vị trí phù",
  },
  dyspnea: yesNo,
  oxygen: { ...yesNo, detail: "Thông tin thở oxy nếu có" },
  sputum: yesNo,
  chestPain: yesNo,
  urine: yesNo,
  stool: yesNo,
  digestionOther: { kind: "text", multiline: true },
  pulseQuality: {
    kind: "choice",
    options: options(["Đều, rõ", "Không đều", "Rời rạc", "Khó bắt"]),
  },
  tubeFeeding: yesNo,
  diet: {
    kind: "choice",
    options: options(["Nhịn", "Cơm", "Cháo", "Sữa", "Súp", "Khác"]),
    other: "6",
  },
  selfCare: yesNo,
  assistance: yesNo,
  mobility: {
    kind: "choice",
    options: options(["Tự vận động", "Hỗ trợ vận động"]),
  },
  rehabilitation: yesNo,
  wound: { ...yesNo, detail: "Vị trí vết thương / vết mổ" },
  woundState: {
    kind: "choice",
    options: [
      { code: "-", label: "Không có" },
      ...options(["Khô", "Sưng nề", "Đỏ", "Rỉ dịch", "Khác"]),
    ],
    other: "5",
  },
  pain: { kind: "number", detail: "Vị trí đau" },
  drainage: {
    kind: "choice",
    options: [
      { code: "-", label: "Không có" },
      ...options([
        "Dẫn lưu màng phổi",
        "Dẫn lưu bàng quang",
        "Dẫn lưu não thất",
        "Khác",
      ]),
    ],
    other: "4",
  },
  braden: { kind: "number" },
  morse: { kind: "number" },
  other: { kind: "text", multiline: true },
  medication: {
    kind: "multiple",
    prefix: "T",
    options: options([
      "Thực hiện y lệnh thuốc uống",
      "Thực hiện y lệnh thuốc tiêm",
      "Truyền dịch qua tĩnh mạch",
      "Truyền máu, chế phẩm máu",
      "Thực hiện y lệnh thuốc thoa ngoài da, niêm mạc",
      "Thực hiện y lệnh thuốc khí dung / xông",
    ]),
  },
  clinical: {
    kind: "multiple",
    prefix: "CLS",
    options: options(["Xét nghiệm", "Chẩn đoán hình ảnh", "Thăm dò chức năng"]),
  },
  nursing: {
    kind: "multiple",
    prefix: "CS",
    options: options([
      "Theo dõi dấu hiệu sinh tồn",
      "Thở oxy",
      "Vỗ rung, uống nước ấm",
      "Hỗ trợ ăn uống / chế độ ăn bệnh lý",
      "Hạn chế ánh sáng và tiếng ồn",
      "Hướng dẫn, hỗ trợ vệ sinh cá nhân",
      "Chườm nóng",
      "Chườm lạnh / lau mát",
      "Giải thích và trấn an",
      "Phòng ngừa loét",
      "Phòng ngừa ngã",
      "Hỗ trợ xoay trở, tập vận động",
      "Chăm sóc vết thương / loét",
      "Đặt / rút ống thông tiểu",
      "Đặt / rút sonde dạ dày",
      "Cắt chỉ",
      "Thay băng",
      "Hút đàm",
      "Chuẩn bị NB trước phẫu thuật, thủ thuật",
      "Chuyển khoa / chuyển viện / xuất viện",
    ]),
    actions: ["14", "15"],
  },
  education: {
    kind: "multiple",
    prefix: "TV",
    options: options([
      "Tư vấn, giải thích quy trình chăm sóc",
      "Giáo dục sức khỏe về bệnh, cách chăm sóc",
      "Hướng dẫn nội quy bệnh viện",
    ]),
  },
  interventionOther: { kind: "text", multiline: true },
  records: yesNo,
  images: yesNo,
  medications: yesNo,
  transport: yesNo,
  performedBy: { kind: "text" },
  receivedBy: { kind: "text" },
};

/** Strings remain compatible with existing backups. No value is inferred on read. */
export function splitCareDetail(raw: string): { code: string; detail: string } {
  const index = raw.indexOf(" | ");
  return index < 0
    ? { code: raw, detail: "" }
    : { code: raw.slice(0, index), detail: raw.slice(index + 3) };
}
export const joinCareDetail = (code: string, detail: string) =>
  code ? (detail ? `${code} | ${detail}` : code) : "";
export function selectedCareCodes(
  definition: Multiple,
  raw: string,
): string[] | null {
  if (!raw) return [];
  const codes = raw.split(",").map((token) =>
    token
      .trim()
      .replace(new RegExp(`^${definition.prefix}\\.?\\s*`), "")
      .replace(/\(([+-])\)$/, "$1"),
  );
  return codes.every((code) => {
    const base = code.replace(/[+-]$/, "");
    return (
      definition.options.some((o) => o.code === base) &&
      (code === base || definition.actions?.includes(base))
    );
  })
    ? [...new Set(codes)]
    : null;
}
export function formatCareValue(key: CareKey, raw: string): string {
  const definition = careConventions[key];
  if (definition.kind === "multiple") {
    const selected = selectedCareCodes(definition, raw);
    return selected === null
      ? raw
      : selected.map((code) => code.replace(/([+-])$/, "($1)")).join(", ");
  }
  if (definition.kind === "choice" || definition.kind === "number") {
    const { code, detail } = splitCareDetail(raw);
    return detail ? `${code} / ${detail}` : raw;
  }
  return raw;
}

/** Partial drafts may be saved; an explicitly selected incomplete code cannot be printed. */
export function careValueIssue(key: CareKey, raw: string): string | null {
  if (!raw) return null;
  const definition = careConventions[key];
  const { code, detail } = splitCareDetail(raw);
  if (
    definition.kind === "choice" &&
    definition.other === code &&
    !detail.trim()
  )
    return "Cần ghi rõ thông tin khác";
  if (
    definition.kind === "pressure" &&
    /^\d*\/\d*$/.test(raw) &&
    (!raw.split("/")[0] || !raw.split("/")[1])
  )
    return "Cần nhập cả tâm thu và tâm trương";
  if (definition.kind === "multiple") {
    const selected = selectedCareCodes(definition, raw);
    if (selected?.some((c) => definition.actions?.includes(c)))
      return "Cần chọn thao tác đặt (+) hoặc rút (-)";
  }
  return null;
}
