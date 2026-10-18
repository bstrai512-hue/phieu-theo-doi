# Bàn giao CareNote — Phiếu theo dõi điều trị

Cập nhật: 18/10/2026. Ngôn ngữ sản phẩm và trao đổi: tiếng Việt.

## Mục tiêu và phạm vi

Ứng dụng web thay việc viết tay phiếu theo dõi điều trị bằng chọn nội dung có sẵn, sửa trực tiếp, lưu mẫu và tái sử dụng qua ngày. Giữ luồng đơn giản, nhập ít thao tác. Mẫu giấy tham chiếu: Bệnh viện Đa khoa Bình Dương, PHIẾU THEO DÕI ĐIỀU TRỊ, MS:36/BV-02.

Đây là bản thử nghiệm phía trình duyệt. Chưa có máy chủ, cơ sở dữ liệu, tài khoản, phân quyền, đồng bộ nhiều máy, ký xác nhận hoặc tích hợp HIS. Dùng dữ liệu giả khi thử. Mẫu nội dung chỉ minh họa thao tác, không phải gợi ý điều trị.

## Mã nguồn và chạy ở máy khác

- Repository: https://github.com/bstrai512-hue/phieu-theo-doi.git
- Nhánh làm việc hiện tại: `main`.
- Thư mục trên máy ban đầu: `C:\Users\Thinkpad X1\Documents\codex\phieu-theo-doi`.
- React + TypeScript + Vite; Tailwind CSS 4; các thành phần shadcn/ui dựa trên Radix UI; cmdk; Lucide; Day.js; react-day-picker.
- Có `pnpm-lock.yaml`; dùng pnpm 10.30.3 để tái lập dependency.
- Máy ban đầu đã cài Node.js LTS 24.22.0 kèm npm/npx trong thư mục anh em `../tools/node-v24.22.0-win-x64`. Runtime này không nằm trong repository.

```sh
git clone https://github.com/bstrai512-hue/phieu-theo-doi.git
cd phieu-theo-doi
# Cài Node.js LTS và pnpm 10.30.3 nếu máy mới chưa có.
pnpm install --frozen-lockfile
pnpm dev
```

Trang chạy ở `http://127.0.0.1:5173/` nếu cổng còn trống. Có thể chỉ định cổng cố định bằng `pnpm dev -- --port 5173 --strictPort`.

```sh
pnpm build
pnpm preview
```

`build` chạy TypeScript rồi đóng gói Vite, đầu ra `dist/`. `start-web.cmd` là tiện ích Windows: ưu tiên runtime theo đường dẫn tương đối của máy ban đầu, sau đó dùng PATH; máy khác nên dùng các lệnh pnpm ở trên.

## Các yêu cầu đã chốt

### Nhập liệu và mẫu

- Thông tin người bệnh: họ tên, năm sinh, giới tính, mã NB, số vào viện, khoa, phòng, giường, chẩn đoán, chẩn đoán phân biệt.
- Giường chọn từ **1 đến 55**, không gõ tự do. Giá trị cũ ngoài danh sách được giữ để tránh mất dữ liệu.
- Ngày điều trị hiển thị bằng tab, chuyển nhanh bằng Calendar shadcn.
- Mỗi ngày có **Buổi sáng / Buổi chiều**, mỗi buổi có hai vùng văn bản: diễn biến và chỉ định. Không yêu cầu nhập giờ.
- Bấm “Chọn nội dung”, tìm bằng từ khóa, chọn nhiều cụm để ghép; sau đó sửa trực tiếp. Enter tạo dòng mới.
- Thư viện có thêm/sửa/xóa mẫu theo hai loại diễn biến và chỉ định; có thể lưu cả đoạn đang nhập làm mẫu.
- Tạo ngày mới sao chép **toàn bộ thông tin người bệnh và cả hai buổi** từ ngày đang xem. Các ngày độc lập; sửa ngày mới không đổi ngày cũ.
- Ngày đích không được trùng ngày đã có. Cho phép ngày trước ngày nguồn để tạo lại ngày đã xóa.
- Xóa ngày có hộp thoại xác nhận. Xóa ngày cuối cùng sẽ xóa diễn biến/chỉ định, giữ ngày trống, thông tin người bệnh và thư viện mẫu để nhập lại.
- Tạo phiếu mới xóa hồ sơ và các ngày hiện tại, giữ thư viện. Có xuất/nhập bản sao JSON và xác nhận trước khi thay thế dữ liệu.

### In — những chi tiết cần giữ nguyên

1. Bấm In mở **dialog xem trước**, rồi mới bấm In / Lưu PDF. Có thể chọn ngày đang xem hoặc tất cả ngày.
2. Thường **một ngày gồm hai mặt A4**. Mặt trước có đầu phiếu, thông tin người bệnh, rồi bảng cho nội dung sáng. Mặt sau chỉ có bảng và ghi chú, theo mẫu mặt sau người dùng cung cấp.
3. Sáng tràn mặt trước phải nối ở đầu mặt sau, sau đó mới tới chiều. Nếu quá hai mặt, tiếp tục tờ kế tiếp, không cắt mất nội dung.
4. **Mỗi hàng bảng là một dòng văn bản**, không phải một lần nhập hoặc một bản ghi. Đoạn dài được đo và xuống dòng. Hai cột có độ dài độc lập; bên ít chữ hơn để trống.
5. Bản in **chỉ ghi ngày, không ghi giờ và không ghi Sáng/Chiều/Sáng (tiếp)**. Tab buổi chỉ dùng trên giao diện nhập.
6. Mỗi ngày có số mặt chẵn để khi in tất cả, ngày kế tiếp bắt đầu đúng mặt trước của tờ mới. Có thể có mặt bảng trống để ghép cặp.
7. In thực tế: A4 dọc, 100%, tắt đầu/chân trang trình duyệt; chọn in hai mặt và lật cạnh dài trong hộp thoại máy in. Web không tự bật chế độ duplex của máy in.

## Cấu trúc cần đọc trước khi sửa

| File | Vai trò |
| --- | --- |
| `src/App.tsx` | State hồ sơ, chọn ngày/buổi, thư viện mẫu, tạo/xóa ngày, sao lưu, dialog in |
| `src/lib/daily-records.ts` | Gom nội dung theo ngày/buổi, sao chép ngày, cập nhật buổi, ngày kế tiếp |
| `src/lib/date.ts` | Day.js, locale vi, customParseFormat, parse nghiêm ngặt YYYY-MM-DD |
| `src/lib/print-form.ts` | HTML in độc lập trong iframe, đo dòng bằng canvas, chia mặt, mẫu trước/sau |
| `src/components/date-picker.tsx` | Calendar trong Radix Popover; khóa ngày đã có hoặc giới hạn các ngày được chuyển đến |
| `src/components/ui/calendar.tsx` | Calendar lấy từ registry chính thức shadcn new-york-v4, đã sửa import cho dự án |
| `src/components/ui/` | Button, Input, Dialog và Calendar |
| `src/index.css` | Giao diện nền và CSS in cũ; luồng in chính hiện dùng iframe |
| `src/daily.css` | Giao diện theo ngày/buổi |
| `src/print-preview.css` | Dialog và iframe xem trước |
| `src/components/date-picker.css` | Kiểu lịch |
| `DESIGN.md` | Ghi chú thiết kế ban đầu; ưu tiên yêu cầu cập nhật trong handoff này nếu có khác biệt |

## Dữ liệu và tương thích ngược

Khóa localStorage: `treatment-quick-entry-v1`. JSON gồm:

```ts
type Data = {
  version: 1;
  patient: Patient; // thông tin gốc, fallback cho hồ sơ cũ
  rows: {
    id: string;
    time: string; // YYYY-MM-DDTHH:mm; giữ để tương thích, UI/in không dùng giờ
    progress: string;
    orders: string;
    session?: 'morning' | 'afternoon';
  }[];
  templates: { id: string; kind: 'progress' | 'orders'; text: string; group: string }[];
  dayPatients?: Record<string, Patient>; // snapshot theo khóa YYYY-MM-DD
};
```

- `Patient` có các trường string: name, birth, gender, code, admission, department, room, bed, diagnosis, differential.
- Dữ liệu cũ không có session được coi là **morning**. Không tự đoán buổi từ giờ cũ.
- Nhiều bản ghi cũ cùng ngày/buổi được ghép đủ nội dung; sửa lần đầu sẽ gom lại bản ghi tương ứng, giữ buổi còn lại.
- Thông tin hiển thị/in: `dayPatients[day] ?? patient`. Ngày mới có snapshot riêng.
- Tự lưu debounce 450ms. Dữ liệu chỉ nằm trong trình duyệt, phụ thuộc origin (gồm cả cổng). Clone/push mã nguồn **không chuyển localStorage**.
- Để chuyển dữ liệu sang nơi khác: Xuất bản sao trên máy cũ, rồi Nhập bản sao ở máy mới. Không commit bản sao chứa dữ liệu người bệnh.

## Phân trang hiện tại và giới hạn

- A4, lề 10mm, Times New Roman 12pt; cột 14% / 37% / 49%; dòng cao 7.5mm.
- Mặt đầu 24 dòng, mặt tiếp theo 32 dòng. `wrapText()` dùng canvas đo theo font 16px, độ rộng hữu dụng 65mm và 88mm.
- Phần sáng và chiều được căn bắt đầu theo khối buổi: toàn bộ sáng chuyển tiếp xong mới bắt đầu chiều trên cả hai cột.
- `sheet-label` “Mặt trước/Mặt sau” chỉ có trong xem trước, ẩn khi in. Các nhãn buổi nội bộ trong bộ chia dòng không được xuất vào ô bảng.
- Header thông tin rất dài có thể ảnh hưởng chiều cao thực tế. Cần kiểm tra trên trình duyệt và máy in thật; phân trang hiện là số dòng cố định, chưa đo tổng chiều cao DOM.
- Mẫu bệnh viện đang ghi cố định trong `print-form.ts`; chưa có màn hình cấu hình cơ sở.

## Kiểm tra đã làm và còn thiếu

Đã chạy lại thành công TypeScript và Vite build khi đóng gói bàn giao, bao gồm thay đổi cuối cùng bỏ nhãn buổi khỏi ô ngày.

Đã chạy kiểm tra logic tạm thời: sao chép/độc lập ngày và buổi; ghép dữ liệu cũ; giữ khoảng trắng khi nhập; ngày không hợp lệ/trùng; giao năm/năm nhuận; snapshot người bệnh khi in; sáng tràn trước chiều; số mặt chẵn và ngày trống hai mặt. Các kiểm tra này chưa được lưu thành test suite trong repo.

Chưa hoàn thành kiểm tra trực quan tự động: công cụ trình duyệt trong phiên trước từ chối truy cập URL cục bộ. Không suy diễn build thành công là đã kiểm tra giao diện/in thực tế.

Checklist tiếp tục:

- Chạy trang và kiểm tra chọn mẫu, lưu mẫu, lịch tiếng Việt trong dialog, tab ngày và buổi trên desktop/mobile.
- Thử hồ sơ cũ không session, chuyển sáng/chiều rồi sửa để bảo đảm không mất nội dung.
- Thử tạo ngày có đủ hai buổi, thay giường/chẩn đoán; quay lại ngày nguồn để đối chiếu.
- Thử xóa ngày giữa, xóa ngày cuối và tạo lại ngày đã xóa.
- Xem trước/in PDF: sáng ngắn, sáng >24 dòng, nhiều hơn hai mặt, nhiều ngày, chiều trống, cả ngày trống; kiểm tra ngày bắt đầu ở trang lẻ và không có nhãn buổi.
- Đối chiếu lại mặt trước/mặt sau giấy thực tế, đặc biệt độ cao header, đường kẻ, lề và xuống dòng.
- Các ảnh tham chiếu ban đầu nằm trong thư mục Temp của phiên cũ, không được đóng gói trong repo; cần xin lại nếu người tiếp nhận cần đối chiếu ảnh.

## Triển khai và ghi chú bàn giao

Ứng dụng có thể phục vụ tĩnh từ `dist/`. Hiện chưa xác nhận có deployment công khai/riêng tư hoạt động. `.openai/hosting.json` còn ID Sites đã tạo (`appgprj_6ad4bc225ca8819187759ba3e3d39efb`); lần triển khai trước vướng helper đóng gói cần Bash trên Windows. Đây không phải yêu cầu để chạy bằng Vite; đừng tái sử dụng ID đó cho một Sites mới không liên quan.

Git origin hiện là GitHub ở trên. Không force-push, không đổi remote nếu không có yêu cầu. `node_modules`, `dist`, `.sites-runtime`, output kiểm tra và tsbuildinfo đã được ignore.

Gợi ý lời nhắn mở phiên mới: “Đọc handoff.md trước. Tiếp tục dự án hiện có, giữ luồng ngày/sáng/chiều và bản in hai mặt đã chốt. Chạy ứng dụng, kiểm tra giao diện và bản in thực tế trước khi thay đổi thêm.”

