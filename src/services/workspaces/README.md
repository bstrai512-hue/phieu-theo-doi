# Workspace theo Khoa

- `Workspace` là type nghiệp vụ trong `src/types/workspace.ts`.
- `Workspaces.list/create` có adapter Convex và localStorage riêng.
- Danh sách trên Convex dùng chung cho các thiết bị. Chế độ local chỉ lưu trên trình duyệt đó.
- Tên Khoa được chuẩn hóa khoảng trắng, kiểm tra trùng không phân biệt hoa thường.
- Khoa mới bắt đầu với danh sách phiếu và hai thư viện mẫu trống.
- `shared` luôn hiển thị là **Dữ liệu chung**, giữ nguyên dữ liệu và storage key cũ.
- Chỉ `shared` được dùng luồng nhập dữ liệu local cũ khi khởi tạo Convex lần đầu.

`WorkspaceBoundary` yêu cầu chọn Khoa khi chưa có lựa chọn hợp lệ và ghi nhớ theo
chế độ local/cloud. Mỗi lần chuyển sẽ lưu thư viện chăm sóc đang sửa và đợt điều trị
trước, sau đó tạo lại provider/editor với scope cố định. Lỗi lưu hoặc xung đột giữ
nguyên Khoa và bản nháp; người dùng đóng hộp thoại để xử lý rồi chọn lại.
Các tab đang mở giữ Khoa của chính mình, không tự đổi khi tab khác chọn Khoa.

Local records dùng `treatment-services-v1:<workspaceKey>`; thư viện chăm sóc dùng
`care-defaults-v1:<workspaceKey>`. Riêng `shared` giữ các key không có hậu tố.

## Triển khai

1. Deploy schema và functions Convex trước: `workspaces.list/create` và toàn bộ
   record/template/care queries, mutations phải dùng scope được yêu cầu.
2. Deploy frontend sau. Frontend mới cần các functions trên; backend cũ ép mọi
   key về `shared` không tương thích với tính năng phân chia Khoa.
3. Kiểm tra hai Khoa trên deployment thật và hai thiết bị: danh sách Khoa dùng
   chung, nhưng phiếu/thư viện tách biệt và dữ liệu cũ vẫn ở **Dữ liệu chung**.

Không cần di chuyển dữ liệu cũ để bắt đầu dùng Khoa mới. Việc thêm/chọn Khoa hiện
không yêu cầu tài khoản; đây là phân chia dữ liệu, chưa phải phân quyền truy cập.

## Cấu hình và đường dẫn theo Khoa

- `/khoa/$workspaceKey`: phiếu của Khoa; `/care-defaults` bên dưới Khoa: thư viện chăm sóc; `/cau-hinh`: cấu hình Khoa. Đường dẫn cũ `/` và `/care-defaults` chuyển tới Khoa đã nhớ. URL chỉ rõ Khoa được ưu tiên hơn lựa chọn cũ trong trình duyệt; mã không tồn tại hiển thị màn hình chọn lại.
- `WorkspaceSettings` là kiểu thuần trong `src/types/workspace.ts`: `department`, `rooms`, `beds`. Hai danh sách độc lập; chưa có quan hệ phòng–giường.
- Local lưu `workspace-settings-v1:<key>`; Convex lưu cấu hình trên document workspace, dùng `settingsRevision` độc lập revision phiếu. Lưu với revision cũ bị từ chối; trang giữ bản nháp và cho tải lại bản đã lưu.
- Mặc định giữ hành vi cũ: Khoa trống, phòng nhập tự do, giường 1–55. Danh sách rỗng cho nhập tự do. Tên Khoa mặc định chỉ áp dụng vào draft mới qua factory; không sửa bệnh nhân đã lưu. Giá trị phòng/giường cũ được giữ trong lựa chọn dù bị bỏ khỏi cấu hình.
- Điều hướng trong ứng dụng lưu cấu hình và bản nháp trước khi rời trang; lỗi lưu chặn điều hướng. Cần đồng bộ backend development trước khi dùng frontend mới.

## Slug

Mỗi Khoa có `slug` duy nhất, tối đa 80 ký tự ASCII thường/số/gạch ngang. Tự sinh từ tên khi tạo; đổi tên không đổi slug. Local nâng cấp metadata khi đọc; Convex chạy internal `workspaces:backfillSlugs` để bổ sung slug một lần cho Khoa cũ. Xung đột khi tự sinh thêm hậu tố `-2`, `-3`; slug nhập tay trùng bị từ chối. `shared` và chuỗi mã 64 hex không được dùng làm slug; Dữ liệu chung có slug cố định `du-lieu-chung`.

Router nhận slug hoặc mã cũ, dùng key để tạo service và ghi nhớ lựa chọn, tự chuyển mã sang slug bằng replace (giữ trang con). Sửa slug cập nhật URL mà không remount workspace hay mất draft. Đường dẫn slug cũ sau khi người dùng tự sửa slug không phải alias lâu dài; link dùng mã luôn hoạt động.
