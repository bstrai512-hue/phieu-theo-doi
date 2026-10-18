# CareNote — Phiếu theo dõi điều trị

React + TypeScript + Vite, Tailwind CSS 4; các thành phần shadcn/ui dựa trên Radix UI và cmdk.

## Chạy

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

- Nhập thông tin người bệnh, nhiều lần theo dõi.
- Danh sách mẫu có tìm kiếm và chọn bằng bàn phím, ghép nhiều cụm và sửa tự do.
- Thêm, sửa, xóa mẫu, lưu cả đoạn làm mẫu, sao chép dòng.
- Tự lưu localStorage, xuất/nhập bản sao JSON có xác nhận thay thế.
- In/PDF qua trình duyệt; giao diện thích ứng máy tính và điện thoại.

Bản thử nghiệm chỉ lưu trên trình duyệt hiện tại, chưa có máy chủ, phân quyền, đồng bộ hoặc chữ ký xác nhận. Dùng dữ liệu giả để thử. Xóa dữ liệu trình duyệt sẽ mất phiếu nếu chưa xuất bản sao. Nội dung mẫu dùng để minh họa thao tác, người dùng cần xác nhận mọi nội dung theo thực tế.
