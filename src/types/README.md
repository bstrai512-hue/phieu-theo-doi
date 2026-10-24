# Shared domain types

Types nghiệp vụ dùng chung cho UI, services và các adapter lưu trữ.
Module này chỉ chứa `type` và `interface`; không phụ thuộc React, Convex,
localStorage hay module runtime trong ứng dụng.

- `patient.ts`: thông tin bệnh nhân và dữ liệu đối chiếu từ bản cũ.
- `forms.ts`: ba loại phiếu, dòng dữ liệu và các khóa chăm sóc.
- `treatment-record.ts`: đợt điều trị, input, summary, snapshot và payload editor/backup v2.
- `template.ts`: mẫu nội dung và input tạo mẫu.
- `care-defaults.ts`: cấu hình mặc định chăm sóc.
- `index.ts`: public exports, dùng qua `import type`.

Interface thao tác (`TreatmentServices`, `TreatmentRecords`, `Templates`,
`CareDefaultsStore`) nằm ở `services/treatment-records/contracts.ts`.
Factories và validation nằm ở các module model tương ứng.
Types đặc thù DB, local store và payload legacy nằm ở adapter/module chuyển đổi.
Khi thêm adapter DB mới, ánh xạ dữ liệu lưu trữ về các types nghiệp vụ này.

Khi thêm trường chăm sóc hoặc truyền dịch, cập nhật union key trong `forms.ts`
và metadata trong `forms/model.ts`; metadata được kiểm tra key bằng `satisfies`.

- `treatment-orders.ts`: chỉ định điều trị với union `TreatmentOrders = string | TreatmentOrdersV1`.
  Chuỗi cũ là nội dung nguyên văn; document mới có `version: 1` và danh sách
  `TreatmentOrder` (thuốc hoặc văn bản). `MedicationOrder` có liều, số lần,
  lịch dùng, tốc độ và quan hệ pha/ghi chú một cấp. Các số lâm sàng giữ dạng
  chuỗi để hỗ trợ phân số, nội dung chưa hoàn tất và ký hiệu từ phiếu.
  `DrugName` chỉ là gợi ý tên, không xác định sản phẩm/hàm lượng hay liều.
