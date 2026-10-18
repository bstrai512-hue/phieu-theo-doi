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
pnpm preview
```

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
