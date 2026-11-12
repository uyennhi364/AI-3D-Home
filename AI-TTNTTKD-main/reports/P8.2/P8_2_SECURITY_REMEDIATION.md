# BÁO CÁO KHẮC PHỤC AN NINH HỆ THỐNG (SECURITY REMEDIATION)
## PHASE P8.2: PRODUCTION REMEDIATION & HARDENING
**Dự án:** AI Feng Shui Studio  
**Phiên bản:** v1.0.0-p8.2  
**Thời gian:** 12/11/2026  
**Vai trò:** Application Security Engineer & DevOps Engineer  

---

## 1. TỔNG QUAN TRẠNG THÁI AN NINH (SECURITY POSTURE OVERVIEW)

Dựa trên kết quả kiểm toán an ninh tại giai đoạn P8.1 (`reports/P8.1/P8_1_SECURITY_AUDIT.md`), toàn bộ các phát hiện về lỗ hổng bảo mật từ mức Trung bình (Medium) đến Cao (High) đã được khắc phục triệt để trong giai đoạn P8.2.

### Bảng Đối Soát Khắc Phục Lỗ Hổng:

| Mã phát hiện | Rủi ro phát hiện ban đầu | Mức độ | Biện pháp khắc phục trong P8.2 | Trạng thái sau P8.2 |
|:---:|---|:---:|---|:---:|
| **FINDING-SEC-01** | Thiếu Rate Limiting trên API Gemini Chat và Phân tích | **HIGH** | Tích hợp `express-rate-limit` (30 req/phút/IP trên route AI; 120 global; 60 confirm) | **ĐÃ GIẢI QUYẾT** |
| **FINDING-SEC-02** | Giới hạn Payload JSON quá cao (10MB), nguy cơ DoS | **HIGH** | Thu hẹp `express.json({ limit: '2mb' })`, trả về HTTP 413 chuẩn | **ĐÃ GIẢI QUYẾT** |
| **FINDING-SEC-03** | Thiếu HTTP Security Headers (X-Frame-Options, CSP) | **MEDIUM** | Tích hợp `helmet` với CSP chuẩn hóa tương thích WebGL Canvas và Google Fonts | **ĐÃ GIẢI QUYẾT** |
| **FINDING-SEC-04** | Lưu trữ khóa API người dùng trong `localStorage` | **MEDIUM** | Di chuyển hoàn toàn sang `sessionStorage`, xóa key cũ và tự hủy khi đóng tab | **ĐÃ GIẢI QUYẾT** |
| **FINDING-STATE-01** | Thiếu định danh tiến trình máy chủ trong môi trường cụm | **MEDIUM** | Bổ sung `X-Instance-ID` và `X-Request-ID` cho toàn bộ HTTP traffic | **ĐÃ GIẢI QUYẾT** |

---

## 2. CHI TIẾT CÁC BIỆN PHÁP GIA CỐ BẢO MẬT

### 2.1. Kiểm soát Tần suất Truy cập (Rate Limiting Architecture)
Nhằm bảo vệ hạn ngạch (quota) API Gemini và ngăn chặn hành vi brute-force hoặc DoS máy chủ, hệ thống triển khai chính sách phân tầng:
- **Global Rate Limiter:** Tối đa 120 requests / 1 phút / IP đối với toàn bộ traffic thông thường.
- **AI Chat & Analysis Limiter:** Tối đa 30 requests / 1 phút / IP đối với các endpoint gọi AI chuyên sâu:
  - `POST /api/chat`
  - `POST /api/gemini/chat`
  - `POST /api/gemini/analyze`
  Khi vượt ngưỡng, máy chủ trả về mã HTTP 429 kèm thông báo: *"Bạn đã đạt giới hạn 30 câu hỏi AI trong 1 phút. Vui lòng chờ giây lát."*
- **Proposal Confirmation Limiter:** Tối đa 60 requests / 1 phút / IP đối với `POST /api/chat/confirm`, hạn chế các cuộc tấn công tái xác nhận liên tục.
- **Tiêu chuẩn Headers:** Kích hoạt `standardHeaders: true` trả về các header `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` tuân thủ dự thảo RFC IETF.

### 2.2. Chống Tấn công Từ chối Dịch vụ qua Payload (JSON Flood DoS Mitigation)
- Giới hạn body parser được hạ từ mức 10MB xuống **2MB**, hoàn toàn đủ cho cấu hình phòng 3D phức tạp (thường chỉ 15–50 KB) nhưng ngăn chặn triệt để nguy cơ kẻ tấn công gửi chuỗi JSON rác khổng lồ để làm tràn bộ nhớ V8 Heap.
- Bổ sung bộ lọc lỗi tập trung trong Express:
  ```typescript
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload quá lớn. Giới hạn tối đa là 2MB.',
      requestId: reqId,
    });
  }
  ```
- Đã kiểm chứng qua bài test tự động: Gửi payload 2.2MB nhận về chính xác **HTTP 413 Payload Too Large**.

### 2.3. Cấu hình HTTP Security Headers (Helmet CSP)
Kích hoạt `helmet` với Content-Security-Policy (CSP) được may đo chuẩn xác cho ứng dụng đồ họa 3D Three.js:
- `defaultSrc: ["'self'"]`
- `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`: Cho phép chạy script ứng dụng và các trình biên dịch shader WebGL / Vite dev mode.
- `styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']`: Cho phép Tailwind CSS và Google Fonts.
- `fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:']`: Cho phép tải phông chữ tiếng Việt từ Google Fonts.
- `imgSrc: ["'self'", 'data:', 'blob:']`: Cho phép xuất ảnh phối cảnh 3D PNG qua DataURL (`toDataURL`).
- `connectSrc: ["'self'", 'https://generativelanguage.googleapis.com']`: Cho phép kết nối SDK trực tiếp đến Google GenAI API.
- Các header tiêu chuẩn tự động kích hoạt:
  - `X-Frame-Options: SAMEORIGIN` (chống Clickjacking)
  - `X-Content-Type-Options: nosniff` (chống MIME-sniffing)
  - `Strict-Transport-Security` (HSTS trên môi trường HTTPS)

### 2.4. Di chuyển Khóa API Khách hàng sang `sessionStorage`
- **Nguy cơ trước đây:** Lưu API key cá nhân của người dùng trong `localStorage` khiến key tồn tại vĩnh viễn trên ổ cứng máy khách, dễ bị khai thác nếu trang web bị tiêm mã XSS hoặc thiết bị công cộng.
- **Khắc phục trong P8.2:**
  - Chuyển toàn bộ thao tác sang `sessionStorage.getItem('gemini_api_key')` và `sessionStorage.setItem('gemini_api_key', ...)`.
  - Khóa API chỉ tồn tại trong bộ nhớ RAM của tab trình duyệt hiện tại và tự động biến mất khi đóng tab.
  - Tích hợp lớp chuyển tiếp dữ liệu tự động (migration layer): nếu phát hiện khóa cũ còn sót trong `localStorage`, ứng dụng tự động chuyển vào `sessionStorage` và xóa vĩnh viễn khỏi `localStorage`.

### 2.5. Bảo vệ Idempotency & Chống Tấn công Replay trên Đề xuất 3D
- Khi người dùng gửi lệnh xác nhận đề xuất qua `POST /api/chat/confirm`:
  1. Kiểm tra sự tồn tại của `proposalId` trong Map bộ nhớ.
  2. Kiểm tra thời hạn hiệu lực (TTL 5 phút).
  3. Kiểm tra tính toàn vẹn `sceneVersion` (nếu scene đã bị thay đổi bởi thao tác khác, từ chối ngay với mã **HTTP 409 Conflict**).
  4. Sau khi xác nhận thành công, proposal bị đánh dấu `isConfirmed = true` và bị xóa ngay khỏi hàng đợi để loại bỏ hoàn toàn nguy cơ thực thi lặp lại (double-apply).

---

## 3. KẾT QUẢ KIỂM TOÁN PHỤ THUỘC (NPM AUDIT REPORT)

Chạy lệnh kiểm toán bảo mật toàn bộ cây phụ thuộc:
```bash
npm audit
```
**Kết quả:**
```
found 0 vulnerabilities
```
- Tổng số dependencies quét: 201 packages.
- Lỗ hổng Critical: **0**
- Lỗ hổng High: **0**
- Lỗ hổng Moderate: **0**
- Lỗ hổng Low: **0**
- Toàn bộ các gói phụ thuộc mới cài đặt (`express-rate-limit`, `helmet`, `cors`) đều là phiên bản an toàn mới nhất.

