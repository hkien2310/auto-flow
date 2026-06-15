# Tài liệu Kỹ thuật Chi tiết - Autoflow v5

Tài liệu này tập trung vào giải thích logic cốt lõi và kiến trúc hệ thống để hỗ trợ việc bảo trì và nâng cấp trong tương lai.

## 1. Kiến trúc Tổng thể (Architecture)
Extension tuân thủ Manifest V3, chia làm 3 tầng thực thi riêng biệt:
- **Tầng Giao diện (Side Panel):** Chạy trong ngữ cảnh extension. Giữ trạng thái (state), quản lý hàng chờ (queue) và điều phối các bước.
- **Tầng Trung gian (Background Service Worker):** Đóng vai trò cầu nối. Thực hiện các hành động đòi hỏi quyền cao như `chrome.scripting.executeScript` vào thế giới `MAIN` của trang web.
- **Tầng Thực thi (Content Script / Injected Script):**
    - `fetch-hook.js`: Chạy trong thế giới `MAIN` ngay khi trang web tải (`document_start`) để ghi đè `window.fetch`.
    - Các hàm `execInFlowTab`: Được inject động để thao tác với Slate Editor hoặc các phần tử DOM của Google Labs.

## 2. Luồng Logic Chính (Core Workflows)

### A. Quy trình Thực thi một Task (`runOneJob`)
1. **Khởi tạo:** Lấy prompt, lưu trạng thái ảnh cũ.
2. **Bước 0-3 (Upload & Pick):** Thao tác DOM để tải và chọn ảnh từ Gallery.
3. **Bước 4 (Prompting):** Inject script vào thế giới `MAIN` để thao tác với Slate Editor qua `document.execCommand`. Click sâu vào các thẻ con của Slate (`data-slate-string`) để kích hoạt focus.
4. **Bước 5 (Submit via Debugger):** Đây là điểm mấu chốt của phiên bản v5.1.
    - Side Panel gửi tin nhắn `AF_DOM_CLICK_CREATE` tới Background.
    - Background thực hiện `chrome.scripting.executeScript` để lấy toạ độ (x, y) chính xác của nút Create.
    - Background sử dụng `chrome.debugger.attach` để kết nối với tab.
    - Gửi lệnh `Input.dispatchMouseEvent` với `type: mousePressed` và `mouseReleased`.
    - Phương pháp này tạo ra sự kiện có thuộc tính `isTrusted: true`, vượt qua mọi lớp bảo mật chặn bot của Google Labs.

## 3. Các "Hack" Kỹ thuật Quan trọng

### Vượt rào cản `isTrusted`
Google Labs kiểm tra thuộc tính `isTrusted` của sự kiện click. Nếu dùng JavaScript `.click()` hoặc `dispatchEvent`, giá trị này sẽ là `false` và bị React App bỏ qua. Giải pháp là sử dụng **Chrome Debugger API** để gửi lệnh từ mức trình duyệt, mô phỏng hành động click vật lý của người dùng.

### Hệ thống Logging 3 Tầng
Để hỗ trợ gỡ lỗi nhanh, extension tích hợp log tại:
- **Side Panel Console:** Theo dõi tiến độ task và lỗi logic.
- **Background Service Worker Console:** Theo dõi quá trình kết nối Debugger và toạ độ click.
- **Page Console (F12):** Theo dõi quá trình quét DOM và tìm kiếm nút Create thực tế.

## 4. Hướng Phát triển Tương lai (Roadmap)
- **Retry Logic:** Tự động thử lại khi Debugger bị ngắt kết nối đột ngột.
- **Status Sync:** Hiển thị phần trăm render video thực tế từ API.
- **Smart Delay:** Tự động điều chỉnh khoảng nghỉ dựa trên tải trọng của hệ thống.

## 5. Lưu ý về Bảo mật & Hiệu năng
- Tránh ghi log dữ liệu nhạy cảm từ API.
- `randomDelay` nên được giữ ở mức tối thiểu 5-10s để đảm bảo an toàn cho tài khoản người dùng.
