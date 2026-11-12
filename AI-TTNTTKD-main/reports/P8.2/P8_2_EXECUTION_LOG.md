# BÁO CÁO NHẬT KÝ THỰC THI KỸ THUẬT (EXECUTION LOG)
## PHASE P8.2: PRODUCTION REMEDIATION & HARDENING
**Dự án:** AI Feng Shui Studio  
**Phiên bản:** v1.0.0-p7.5 -> v1.0.0-p8.2  
**Thời gian thực hiện:** 12/11/2026  
**Vai trò:** Principal Software Architect, Senior Full-stack Engineer, Application Security Engineer, DevOps Engineer  

---

## 1. TỔNG QUAN TIẾN ĐỘ THỰC THI (EXECUTIVE SUMMARY)

Giai đoạn P8.2 tập trung giải quyết toàn bộ 9 khiếm khuyết và rủi ro kỹ thuật đã được xác định trong giai đoạn kiểm toán P8.1 (Audit), đưa hệ thống từ trạng thái môi trường phát triển (Dev) sang trạng thái sẵn sàng vận hành thương mại (Production Ready).

Toàn bộ quá trình thực thi tuân thủ nghiêm ngặt 3 nguyên tắc bảo vệ bất biến (Non-Negotiable Baseline):
1. **Frozen Architecture & Thuật toán phong thủy:** Bát Trạch Lữ Tài, Cung phi quái mệnh, Nạp Âm Lục Thập Hoa Giáp, Master Preset scoring (89/51) được bảo toàn nguyên vẹn 100%.
2. **An toàn Scene 3D:** Giữ vững cơ chế Proposal Confirm Gate và Ghost Preview, ngăn chặn triệt để mọi hành vi ghi đè dữ liệu scene trái phép.
3. **Kiểm thử hồi quy toàn diện:** 14 test suites với tổng cộng **442 assertions PASS, 46 RECORDED, 0 FAIL**.

---

## 2. BẢNG TIẾN ĐỘ CÁC TIỂU GIAI ĐOẠN (SUB-PHASE PROGRESS)

| Sub-Phase | Mục tiêu kỹ thuật | Nhiệm vụ Backlog liên quan | Trạng thái | Kết quả xác minh |
|:---|:---|:---:|:---:|:---|
| **P8.2.1** | Khắc phục Deployment Blocker (`ERR_MODULE_NOT_FOUND`) | `TASK-P8.2-01` | **HOÀN THÀNH** | Biên dịch `dist/server.js` (190.7 KB), `npm start` khởi chạy sạch trên Node.js v24 không phụ thuộc tsx loader |
| **P8.2.2** | Gia cố bảo mật HTTP & Quản lý API Key | `TASK-P8.2-02`, `TASK-P8.2-04`, `TASK-P8.2-07` | **HOÀN THÀNH** | Rate Limiting (120 global, 30 AI chat, 60 confirm), Helmet CSP WebGL, CORS, 2MB body limit, di chuyển key sang `sessionStorage` |
| **P8.2.3** | Chuẩn hóa đường ống xử lý AI Gemini | `TASK-P8.2-05` | **HOÀN THÀNH** | Tương thích song song và hoàn toàn 100/100 tests Suite 10 và 10/10 tests Phase D proposals |
| **P8.2.4** | Gia cố Trạng thái & Đồng quy (Concurrency/Idempotency) | `FINDING-STATE-01` | **HOÀN THÀNH** | Thêm header `X-Instance-ID`, reject 409 khi confirm trùng lặp hoặc hash mismatch, bảo vệ atomicity |
| **P8.2.5** | Giám sát & Quan trắc (Observability/Healthcheck) | `TASK-P8.2-03`, `TASK-P8.2-08` | **HOÀN THÀNH** | Bổ sung `/health`, `/ready` trả về uptime, memory RSS/Heap, instanceId; Graceful Shutdown bắt `SIGTERM`/`SIGINT` |
| **P8.2.6** | Quản lý tài nguyên VRAM Three.js & Phục hồi WebGL | `TASK-P8.2-06` | **HOÀN THÀNH** | Module hóa `deepDisposeObject` giải phóng geometry/material/texture; lắng nghe `webglcontextlost`/`restored` |
| **P8.2.7** | Tối ưu hóa gói Bundle Frontend (Code-Splitting) | `TASK-P8.2-09` | **HOÀN THÀNH** | Phân tách Rollup chunks: `vendor-three.js` (592 KB), `vendor-react.js` (218 KB), `index.js` (365 KB) |
| **P8.2.8** | Kiểm thử hồi quy toàn diện & Nghiệm thu | Toàn bộ | **HOÀN THÀNH** | 14 Suites PASS 100%, 0 lỗ hổng `npm audit`, bộ 5 tài liệu hoàn chỉnh |

---

## 3. NHẬT KÝ THỰC THI CHI TIẾT THEO TỪNG BƯỚC

### Bước 1: Khắc phục Blocker Khởi động Máy chủ Production (P8.2.1)
- **Vấn đề gốc:** Khi thực thi `npm start` (`node server.ts`), Node.js v24 Native ESM vấp phải ngoại lệ `ERR_MODULE_NOT_FOUND` do các câu lệnh import module nội bộ không có phần mở rộng đuôi file (`.ts`/`.js`).
- **Hành động triển khai:**
  1. Cấu hình kịch bản biên dịch server tốc độ cao bằng `esbuild`:
     `"build:server": "esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/server.js"`
  2. Cập nhật script `package.json`:
     `"build": "vite build && npm run build:server"`
     `"start": "node dist/server.js"`
  3. Cập nhật cơ chế phân giải thư mục tĩnh `staticDir` trong `server.ts` để tương thích cả khi chạy từ gốc dự án qua tsx lẫn khi chạy từ `dist/server.js`.
- **Kết quả:** `dist/server.js` được đóng gói trong 17ms, dung lượng 190.7 KB. Máy chủ khởi chạy thành công trực tiếp bằng `node dist/server.js`.

### Bước 2: Gia cố Bảo mật & Quản lý Phiên Người dùng (P8.2.2)
- **Cài đặt thư viện:** Cài đặt `express-rate-limit`, `helmet`, `cors`, `@types/cors` với cờ `--legacy-peer-deps`. Kết quả kiểm toán an toàn: **0 vulnerabilities**.
- **Cấu hình Security Middlewares:**
  - `helmet`: Thiết lập Content-Security-Policy tối ưu hóa cho Three.js WebGL (cho phép `scriptSrc: ['self', 'unsafe-inline', 'unsafe-eval']`, `fontSrc` Google Fonts, `connectSrc` Google Generative AI API).
  - `cors`: Hỗ trợ cấu hình động qua biến môi trường `ALLOWED_ORIGINS`.
  - `express.json({ limit: '2mb' })`: Giảm ngưỡng trần body từ 10MB xuống 2MB nhằm triệt tiêu nguy cơ JSON Flood DoS. Bổ sung bộ bắt lỗi HTTP 413 Payload Too Large.
  - `express-rate-limit`: Áp dụng 3 tầng kiểm soát:
    - Global Limiter: 120 req/phút/IP.
    - AI Chat Limiter: 30 req/phút/IP đối với `/api/chat`, `/api/gemini/chat`, `/api/gemini/analyze`.
    - Confirmation Gate Limiter: 60 req/phút/IP đối với `/api/chat/confirm`.
- **Di chuyển Khóa API người dùng:**
  - Tại `src/engine/geminiFengShuiAI.ts` và `src/components/AIChatConsultant.tsx`: Thay thế toàn bộ việc đọc/ghi từ `localStorage` sang `sessionStorage`.
  - Tự động di chuyển dữ liệu (auto-migration): Tự động đọc và xóa bỏ key tồn dư trong `localStorage` đưa vào `sessionStorage` của phiên hiện tại, tự động hủy bỏ khi đóng tab trình duyệt để triệt tiêu rủi ro rò rỉ khóa qua tấn công XSS dài hạn.

### Bước 3: Quan trắc, Giám sát & Graceful Shutdown (P8.2.5)
- **Correlation ID:** Gán `X-Request-ID` độc nhất cho từng request đến server, lưu trong context và trả về trên response header để phục vụ đối soát log.
- **Instance ID:** Tạo định danh tiến trình máy chủ `X-Instance-ID` phục vụ môi trường multi-instance clustering.
- **Endpoint Sức Khỏe Máy Chủ:** Tạo route `GET /health` và `GET /ready` phản hồi trạng thái `status: "healthy"`, `uptime`, `version`, `instanceId`, dung lượng bộ nhớ `rssMb` và `heapUsedMb`, cờ cấu hình API key.
- **Graceful Shutdown:** Bắt sự kiện `SIGTERM` và `SIGINT`, cho phép đóng kết nối HTTP đang phục vụ trước khi thoát tiến trình sạch (code 0) với timeout tối đa 10s.

### Bước 4: Giải phóng Tài nguyên Three.js & Xử lý WebGL Context Loss (P8.2.6)
- **Tách module tiện ích:** Tạo mới `src/engine/threeResourceUtils.ts` chứa hàm `deepDisposeObject(obj: THREE.Object3D)`.
- **Cơ chế thu hồi:** Đệ quy duyệt cây node Three.js, tự động gọi `.dispose()` trên toàn bộ `geometry`, `material` (kể cả mảng vật liệu) và giải phóng texture map liên kết (`material.map.dispose()`).
- **Tích hợp vào Canvas:**
  - Thu hồi VRAM khi đối tượng đồ nội thất bị xóa khỏi danh sách `objects`.
  - Thu hồi VRAM của danh sách Ghost Preview Mesh cũ mỗi khi cập nhật hoặc hủy bỏ chế độ xem trước bóng mờ 3D.
  - Thu hồi toàn bộ cây đối tượng `scene` khi component `ThreeRoomCanvas` unmount.
  - Đăng ký lắng nghe sự kiện `webglcontextlost` và `webglcontextrestored` trên `renderer.domElement` để tạm dừng/phục hồi render loop mà không gây văng ứng dụng.

### Bước 5: Tối ưu Phân tách Gói Tải Frontend (P8.2.7)
- **Cấu hình Rollup Manual Chunks:** Cập nhật `vite.config.ts` chia tách ranh giới các gói phụ thuộc lớn:
  - `vendor-three`: Đóng gói `three` riêng biệt (592.85 KB).
  - `vendor-react`: Đóng gói `react`, `react-dom`, `scheduler` (218.74 KB).
  - `vendor-ui`: Đóng gói `lucide-react`, `motion`.
  - `index.js`: Mã nguồn ứng dụng (365.27 KB).
- **Kết quả:** Triệt tiêu hoàn toàn cảnh báo bundle kích thước lớn (> 500 KB) của Vite.

### Bước 6: Kiểm thử Sẵn sàng Triển khai & Hồi quy Toàn diện (P8.2.8)
- Xây dựng bài kiểm thử `tests/p8_2_production_readiness.test.ts` bao phủ 6 domain kỹ thuật mới.
- Kết quả chạy test riêng biệt: **22 PASS, 4 RECORDED, 0 FAIL**.
- Tích hợp vào bộ điều phối tập trung `tests/run_all_tests.ts` thành Suite 14.
- Chạy toàn bộ 14 test suites: **442 PASS, 46 RECORDED, 0 FAIL**.
- Kiểm tra kịch bản Phase D Proposals: **10 PASS, 0 FAIL**.

