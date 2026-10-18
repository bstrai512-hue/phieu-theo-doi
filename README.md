# CareNote — Phiếu theo dõi điều trị

React + TypeScript + Vite, Tailwind CSS 4; các thành phần shadcn/ui dựa trên Radix UI và cmdk.

## Chạy

Đã cài Node.js LTS 24.22.0 cùng npm/npx trong `../tools/node-v24.22.0-win-x64` và thêm vào PATH người dùng. Mở terminal mới để nhận PATH. Có thể nhấp đúp `start-web.cmd` để chạy ứng dụng tại http://127.0.0.1:5173/. Nếu cổng đã được dùng, hãy sử dụng cửa sổ web đang chạy.

```sh
pnpm install
pnpm dev
```

## Kiểm tra và đóng gói

```sh
pnpm build
pnpm test
pnpm preview
```

## Thiết lập Convex

1. Cài dependencies bằng phiên bản pnpm khai báo trong `package.json`:

   ```sh
   pnpm install
   ```

2. Khởi tạo backend ở terminal thứ nhất:

   ```sh
   pnpm dev:backend
   ```

   Làm theo hướng dẫn đăng nhập và chọn hoặc tạo project `phieu-theo-doi`.
   Convex tạo `.env.local` chứa `CONVEX_DEPLOYMENT` và `VITE_CONVEX_URL`,
   đồng thời sinh mã trong `convex/_generated/`. Giữ terminal này chạy để đồng bộ backend.
   Không commit `.env.local`.

3. Chạy giao diện ở terminal thứ hai:

   ```sh
   pnpm dev
   ```

   Khởi động lại Vite nếu vừa thay đổi `.env.local`. Khi có `VITE_CONVEX_URL`,
   module `src/services/treatment-records` khởi tạo `ConvexProvider` nội bộ.
   Giao diện chỉ dùng `TreatmentServicesProvider` và không import Convex trực tiếp.
   Adapter dữ liệu hiện tại vẫn là localStorage, kể cả khi đã cấu hình Convex.

4. Viết schema và các hàm backend trong `convex/`. Schema hiện để trống;
   phiếu và mẫu vẫn lưu ở localStorage, chưa đồng bộ lên Convex.
   Hướng dẫn tích hợp: [Convex React Quickstart](https://docs.convex.dev/quickstart/react).

5. Khi cần triển khai production, chạy `pnpm convex:deploy`, rồi đặt
   `VITE_CONVEX_URL` của production deployment trên dịch vụ host frontend trước khi build.

## Module dữ liệu

1. Kiểu dữ liệu nghiệp vụ và định dạng bản sao JSON nằm trong
   `src/services/treatment-records/model.ts`, độc lập với kiểu dữ liệu Convex.
2. `contracts.ts` định nghĩa CRUD riêng cho `records` (`list/get/create/update/remove`)
   và `templates` (`list/create/update/remove`). `update` nhận các trường cần thay đổi;
   ID không tồn tại, dữ liệu sai hoặc lỗi storage làm Promise reject với `Error`.
   `templates.create` nhận ID tùy chọn để giữ ID từ bản sao JSON.
3. `local-storage.ts` triển khai interface. Dữ liệu cũ ở khóa
   `treatment-quick-entry-v1` được đọc khi chưa có khóa mới `treatment-services-v1`.
   Lần ghi thành công đầu tiên lưu sang khóa mới và giữ nguyên khóa cũ.
   Bản sao JSON xuất/nhập vẫn giữ `version: 1`. Dữ liệu lưu hỏng được báo lỗi, không tự ghi đè.
4. `useTreatmentData` đọc phiếu đầu tiên và thư viện, tự lưu sau 450 ms, tuần tự hóa
   các lần ghi qua CRUD và cung cấp trạng thái lưu cho giao diện. Giao diện vẫn chỉnh
   một phiếu như trước; chưa thêm màn hình quản lý nhiều phiếu.
   Các thao tác CRUD độc lập, việc ghi phiếu và nhiều mẫu chưa phải một transaction.
5. Khi thêm adapter Convex, triển khai `TreatmentServices`, rồi thay adapter mặc định
   trong `provider.tsx`. Truy vấn, mutation và chuyển đổi kiểu dữ liệu Convex nằm trong
   module; bên gọi giữ nguyên interface. Provider cũng nhận `services` để truyền adapter
   vào khi kiểm thử. Chưa triển khai adapter CRUD Convex hoặc đồng bộ realtime.

Chạy `pnpm test` bằng Node 22.15+ để kiểm tra CRUD, chuyển dữ liệu cũ, bản sao JSON,
lỗi ghi và dữ liệu hỏng qua interface của module.

## Tính năng

- Mỗi ngày gồm hai buổi sáng và chiều, nội dung được lưu riêng. Dữ liệu cũ chưa có buổi được giữ ở buổi sáng.
- Tạo ngày mới sao chép cả hai buổi. In hai mặt: mặt trước có thông tin người bệnh và buổi sáng; mặt sau chỉ có bảng như mẫu giấy, nối phần sáng tràn rồi đến chiều.
- Mỗi ngày luôn có ít nhất hai mặt. Khi vượt hai mặt, tiếp tục trên tờ mới và bổ sung mặt trống để ngày kế tiếp bắt đầu đúng mặt trước khi in hai mặt. Chọn in hai mặt, lật cạnh dài trong hộp thoại máy in.

- Chọn ngày điều trị bằng tab; mỗi ngày có hai vùng nhập diễn biến và chỉ định.
- Tạo ngày mới lấy lại toàn bộ thông tin người bệnh, giường, chẩn đoán, diễn biến và chỉ định từ ngày đang chọn. Sửa ngày mới không đổi ngày cũ; ngày đã tồn tại không bị ghi đè.
- Dữ liệu cũ nhiều lần nhập trong một ngày được ghép đầy đủ khi mở ngày đó.
- In riêng ngày đang chọn hoặc tất cả các ngày; mỗi dòng chữ nằm trên một hàng kẻ.

- Nhập thông tin người bệnh, nhiều lần theo dõi.
- Danh sách mẫu có tìm kiếm và chọn bằng bàn phím, ghép nhiều cụm và sửa tự do.
- Thêm, sửa, xóa mẫu, lưu cả đoạn làm mẫu, sao chép dòng.
- Tự lưu localStorage, xuất/nhập bản sao JSON có xác nhận thay thế.
- In/PDF qua trình duyệt; giao diện thích ứng máy tính và điện thoại.

Bản thử nghiệm chỉ lưu trên trình duyệt hiện tại, chưa có máy chủ, phân quyền, đồng bộ hoặc chữ ký xác nhận. Dùng dữ liệu giả để thử. Xóa dữ liệu trình duyệt sẽ mất phiếu nếu chưa xuất bản sao. Nội dung mẫu dùng để minh họa thao tác, người dùng cần xác nhận mọi nội dung theo thực tế.
