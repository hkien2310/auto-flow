# Autoflow v5 - Chrome Extension for Google Labs Flow

## Giới thiệu
**Autoflow v5** là một Chrome Extension mạnh mẽ được thiết kế để tự động hóa quy trình làm việc trên [Google Labs Flow](https://labs.google/fx/tools/flow/). Công cụ này giúp người dùng tạo hàng loạt (batch) hình ảnh và video từ danh sách prompt và ảnh đầu vào một cách nhanh chóng theo cơ chế "Fire & Forget" (Gửi và Tiếp tục).

## Tính năng chính (Cập nhật v5.1)
- **Tự động hóa toàn diện:** Tự động thực hiện các bước: Tải ảnh lên -> Chọn ảnh từ Gallery -> Điền Prompt -> Nhấn nút Create.
- **Trusted Click (Debugger API):** Sử dụng công nghệ cao cấp nhất để vượt qua cơ chế bảo mật của Google, đảm bảo lệnh click luôn được chấp nhận (`isTrusted: true`).
- **Đa chế độ Prompt:** Hỗ trợ TXT Order, Global Prompt và Random Prompt.
- **Cơ chế Fire & Forget:** Không cần đợi quá trình tạo hoàn tất, extension sẽ gửi yêu cầu và chuyển ngay sang tác vụ tiếp theo để tối ưu thời gian.
- **Quản lý Hàng chờ (Queue):** Hiển thị trực quan trạng thái của từng tác vụ trong hàng chờ.
- **Khoảng nghỉ ngẫu nhiên (Random Delay):** Giả lập hành vi người dùng bằng cách nghỉ một khoảng thời gian ngẫu nhiên giữa các tác vụ để tránh bị phát hiện hoặc giới hạn.
- **Theo dõi API (Fetch Hook):** Tích hợp bộ lọc để bắt các tín hiệu API từ Google Labs.

## Hướng dẫn Cài đặt & Lưu ý Quan trọng
1. Tải toàn bộ mã nguồn về máy tính.
2. Mở trình duyệt Chrome và truy cập `chrome://extensions/`.
3. Bật **Developer mode** và nhấn **Load unpacked** chọn thư mục này.
4. **Lưu ý về Debugger:** Khi chạy, trình duyệt Chrome sẽ hiển thị thanh thông báo: *"Autoflow v5 started debugging this browser"*. **BẠN KHÔNG ĐƯỢC TẮT THANH NÀY** khi extension đang làm việc.
5. **Tab Active:** Extension sẽ tự động kích hoạt tab Google Labs khi submit để đảm bảo lệnh click chính xác.

## Hướng dẫn Sử dụng
1. Truy cập [Google Labs Flow](https://labs.google/fx/tools/flow/).
2. Nhấn vào biểu tượng extension để mở **Side Panel**.
3. Nhấn **Detect Flow Tab** để kết nối.
4. **Nhập dữ liệu:** Chọn ảnh và nhập prompt.
5. Nhấn **Start Queue** để bắt đầu quy trình tự động.

## Lưu ý
- Extension hoạt động tốt nhất khi tab Google Labs Flow đang được mở và hiển thị.
- Đảm bảo tên file ảnh không quá phức tạp để extension có thể tìm kiếm chính xác trong Gallery.

---
*Phát triển bởi [Art Antigravity](https://youtube.com/@art-antigravity)*
