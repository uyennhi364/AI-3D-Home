# CHÍNH SÁCH BẢO MẬT & KIỂM TOÁN AN TOÀN (SECURITY POLICY)
## AI FENG SHUI STUDIO

Tài liệu này xác lập chính sách bảo mật, các biện pháp kiểm soát kỹ thuật và quy trình xử lý lỗ hổng bảo mật cho hệ thống **AI Feng Shui Studio**.

---

## 1. QUẢN LÝ KHÓA BẢO MẬT (API KEY & SECRET PROTECTION)

- **Không Lưu Khóa Trong Mã Nguồn:** Tuyệt đối không hardcode API Key, mật khẩu, JWT secret trong repository, git history, test fixtures hoặc tài liệu.
- **Xử Lý API Key Phía Backend:** Khóa `GEMINI_API_KEY` được đọc từ biến môi trường của tiến trình Node.js trên máy chủ, không bao giờ được đóng gói vào client bundle (Vite build).
- **Client Header Cách Ly:** Trong chế độ người dùng tự cung cấp khóa qua UI, khóa chỉ được truyền qua header HTTP `x-gemini-api-key` hoặc request body tới máy chủ; máy chủ sử dụng khóa này tạm thời cho phiên gọi Gemini rồi giải phóng ngay, không lưu vào cơ sở dữ liệu.
- **Tự Động Che Dấu Log (Automatic Redaction):**
  - Mọi hàm ghi log (`logger.ts`, `server.ts`) tự động lọc và thay thế các trường nhạy cảm: `key`, `secret`, `token`, `auth`, `credential`, `password`, `x-gemini-api-key`.
  - Khóa dài được che định dạng: `AIza...1234 (REDACTED)`.
  - Khóa ngắn được che toàn phần: `***REDACTED***`.

---

## 2. CHÍNH SÁCH CORS & AN TOÀN TRUY CẬP (CORS POLICY)

- **Nguyên Tắc Fail-Closed Trong Production:**
  - Trong môi trường `NODE_ENV=production`, nếu biến môi trường `ALLOWED_ORIGINS` không được định nghĩa hoặc để trống, máy chủ **tự động từ chối mọi yêu cầu cross-origin** (whitelist rỗng).
  - Tuyệt đối không sử dụng `origin: true` (cho phép tất cả) làm phương án dự phòng.
- **Môi Trường Phát Triển (Development):**
  - Chỉ cho phép các origin cục bộ đáng tin cậy: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`, v.v.
- **Cho Phép Server-to-Server:** Các công cụ backend hoặc curl không mang header `Origin` được phép truy cập nội bộ.

---

## 3. AN TOÀN KHÔNG GIAN 3D & CHỐNG CAN THIỆP GIAO DỊCH (TRANSACTION SAFETY)

- **Proposal Confirm Gate (Bắt buộc 2-Turn):**
  - AI không có quyền tự ý sửa đổi mô hình 3D thực tế của người dùng trong một turn duy nhất.
  - Mọi thao tác thêm, bớt, di chuyển, xoay hoặc tối ưu phòng đều tạo một `SceneProposal` kèm bóng mờ (Ghost Preview).
  - Chỉ khi người dùng bấm nút [Xác nhận áp dụng], giao dịch mới được chuyển tới `/api/chat/confirm`.
- **Ràng Buộc Thời Gian (TTL):** Đề xuất tự động hết hạn sau 5 phút (`300,000ms`), ngăn chặn việc áp dụng các đề xuất cũ.
- **Kiểm Soát Toàn Vẹn Bố Cục (`sceneVersion` Hash Binding):**
  - Mỗi đề xuất gắn liền với chuỗi hash đại diện cho toàn bộ đối tượng và kích thước phòng tại thời điểm tạo.
  - Nếu người dùng di chuyển bất kỳ đồ vật nào trước khi confirm, proposal bị hủy ngay lập tức với mã `409 Conflict`.
- **Chống Can Thiệp Tham Số (`argsHash` Anti-Tampering):**
  - Tham số thực thi được hash SHA-256 / Murmur. Nếu client cố tình sửa đổi tham số khi confirm, hệ thống từ chối thực thi (`400 Bad Request`).
- **Khóa Tranh Chấp Đồng Thời (Atomic Concurrency Claim):**
  - Khi một worker bắt đầu thực thi proposal, trạng thái chuyển sang `claiming`. Bất kỳ yêu cầu đồng thời nào khác tới cùng một proposalId đều bị từ chối với mã `409 Conflict`.
- **Chống Tái Sử Dụng (Anti-Replay Protection):**
  - Ngay sau khi thực thi thành công, proposal được chuyển sang `executed` và xóa khỏi active store. Không thể confirm lần thứ hai.
- **Tự Động Rollback:**
  - Nếu quá trình thực thi vi phạm hậu điều kiện (va chạm OBB SAT, nằm ngoài phòng, chắn cửa), giao dịch lập tức được hoàn tác về trạng thái cũ an toàn.

---

## 4. AN TOÀN HẠ TẦNG CONTAINER (CONTAINER SECURITY)

- **Non-Root Execution:** Container chạy dưới quyền người dùng không đặc quyền `node` (`UID=1000`, `GID=1000`), không chạy dưới quyền `root`.
- **Cấm Leo Thang Đặc Quyền:** Cấu hình Docker Compose áp dụng `no-new-privileges: true`.
- **Cô Lập Bí Mật Khỏi Image:** Tệp `.dockerignore` loại trừ triệt để `.env`, `.env.*`, `.git`, `.github`, `reports`, `tests` để không bao giờ đóng gói bí mật vào Docker image.
- **Giới Hạn Tài Nguyên:** Giới hạn tối đa 512MB RAM và 2 CPU nhằm bảo vệ máy chủ khỏi nguy cơ cạn kiệt tài nguyên do tấn công từ chối dịch vụ.
- **Bảo Vệ DoS:** Giới hạn kích thước body JSON tối đa 2MB; rate limit 120 req/min/IP toàn cục và 30 req/min/IP cho kênh AI Chat.

---

## 5. BÁO CÁO LỖ HỔNG BẢO MẬT (VULNERABILITY REPORTING)

Nếu bạn phát hiện bất kỳ vấn đề bảo mật nào trong dự án, vui lòng không mở công khai issue trên GitHub. Hãy liên hệ trực tiếp với nhóm kỹ sư qua email: `security@fengshui-studio.internal` để được xử lý theo quy trình công bố có trách nhiệm (Responsible Disclosure).

