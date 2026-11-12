# BÁO CÁO KIỂM TOÁN MỨC ĐỘ SẴN SÀNG TRIỂN KHAI PRODUCTION
## PHASE P8.1: PRODUCTION READINESS & ARCHITECTURE AUDIT
**Dự án:** AI Feng Shui Studio  
**Phiên bản hiện tại:** v1.0.0-p7.5 (P0–P7.5 Frozen Architecture)  
**Ngày thực hiện kiểm toán:** 12/11/2026  
**Đơn vị thực hiện:** Senior Software Architect, Principal Backend Engineer & Application Security Auditor  
**Nguyên tắc cốt lõi:** **AUDIT ONLY — KHÔNG SỬA CODE, KHÔNG SỬA TEST, KHÔNG THAY ĐỔI CẤU HÌNH**  

---

## 1. MỤC TIÊU & TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Thực hiện kiểm toán kỹ thuật toàn diện, khách quan và độc lập đối với toàn bộ kho mã nguồn của dự án **AI Feng Shui Studio** sau khi đã vượt qua giai đoạn PILOT-01 (với điểm số đối soát minh bạch **94.83 / 100**).

Mục tiêu cốt lõi của giai đoạn P8.1 là **đánh giá khoảng cách thực tế giữa một sản phẩm hoàn thành Pilot và một hệ thống sẵn sàng vận hành ổn định trên môi trường Production (Production Ready)**. Kiểm toán bao quát 8 phương diện từ kiến trúc module, REST API, lưu trữ trạng thái, an toàn Three.js, bảo mật, khả năng giám sát cho đến quy trình đóng gói triển khai.

### Tóm tắt Phát hiện Trọng yếu:
1. **Thuật toán cốt lõi & An toàn Không gian 3D (Rất tốt):** 
   - 100% các công thức Bát Trạch Lữ Tài, Quái mệnh, Nạp Âm và quy chuẩn kiến trúc TCVN 4451:2012 hoạt động bất biến, không bị ảnh hưởng.
   - Cơ chế bảo vệ Scene 3D (Ghost Preview, Proposal Card, Confirm Gate, IntentGuard) ngăn chặn triệt để mọi hành vi tự ý ghi đè không gian khi chưa có sự xác nhận của người dùng.
   - Toàn bộ **13 Suites kiểm thử (420 Assertions PASS, 42 RECORDED, 0 FAIL)** đều vượt qua thành công.
2. **Khiếm khuyết Nghiêm trọng về Triển khai Production (Blocker - CRITICAL):**
   - Lệnh khởi động production `npm start` (`node server.ts`) bị lỗi `ERR_MODULE_NOT_FOUND` ngay lập tức trên Node.js native ESM do các đường dẫn import tương đối thiếu đuôi mở rộng. Dự án cần bổ sung bước build server (`dist/server.js`) trước khi container có thể khởi chạy.
3. **Khiếm khuyết Vận hành & Bảo mật Cần Khắc phục (HIGH):**
   - Thiếu Rate Limiting trên các endpoint gọi AI, nguy cơ bị cạn kiệt Quota hoặc DoS.
   - Tồn tại hai đường ống xử lý AI song song (duplicate pipeline) giữa `server.ts` và `UnifiedGeminiAgent` (P7).
   - Trạng thái khóa giao dịch và proposal được lưu trên RAM đơn lẻ của 1 tiến trình Node.js, chưa hỗ trợ scaling đa container.

---

## 2. KẾT QUẢ KIỂM TOÁN CHI TIẾT THEO 8 LĨNH VỰC (P8.1.01 – P8.1.08)

---

### P8.1.01 — Kiểm toán Kho Lưu trữ & Kiến trúc Hệ thống (Repository & Architecture Audit)
- **Cấu trúc thư mục:** Được phân chia khoa học thành `src/components`, `src/engine/core`, `src/engine/agent`, `src/services`, `src/types`, `tests`.
- **Ranh giới module (Module Boundaries):**
  - Tầng tính toán hình học và phong thủy (`src/engine/core/`) là các pure functions độc lập, tách biệt hoàn toàn khỏi Three.js và Express.
  - Phụ thuộc một chiều: `UI -> Services -> Engine Core`. Không có phụ thuộc vòng (Circular Dependencies).
- **Điểm bất cập phát hiện:**
  - *Duplicate AI Pipeline (RISK-ARCH-01 - HIGH):* `src/engine/agent/unifiedAgent.ts` (đã được nghiệm thu trong P7 với 100/100 PASS) chưa được `server.ts` sử dụng. Thay vào đó, `server.ts` sử dụng một implementation riêng viết inline từ dòng 970 đến 1624.
  - *File tham chiếu chưa đồng bộ:* `AI_UPGRADE_NOTES.md` và `DESIGN.md` chưa được cập nhật các thay đổi của P7 và P7.5.

---

### P8.1.02 — Kiểm toán Backend & REST API (Backend & REST API Audit)
- **Framework & Middlewares:** Express 4.21.2 chạy trên Node.js v24.14.0.
  - Middleware thứ tự: `express.json({ limit: '10mb' })` $\to$ các route API $\to$ Vite middleware (dev) / Express static (prod).
- **Các API Endpoints hiện có:**
  1. `POST /api/chat/confirm`: Xác nhận và tiêu thụ Proposal với kiểm tra `proposalId` và `sceneVersion`.
  2. `GET /api/gemini/status`: Kiểm tra trạng thái kết nối Gemini.
  3. `POST /api/gemini/analyze`: Yêu cầu báo cáo phân tích chuyên sâu.
  4. `POST /api/chat` (alias `/api/gemini/chat`): Hội thoại và điều khiển không gian 3D.
- **Điểm bất cập phát hiện:**
  - *Thiếu Timeout cho Gemini Call:* Khi gọi `@google/genai` trong `server.ts`, không có timeout controller bọc ngoài. Nếu mạng Google bị treo, request Express sẽ treo theo.
  - *Thiếu Centralized Error Handler Middleware:* Không có `app.use((err, req, res, next) => ...)` ở cuối chuỗi Express để đón các lỗi ngoài try/catch.
  - *Giới hạn Payload Quá Lớn:* Giới hạn `10mb` cho các tin nhắn chat là quá mức cần thiết, mở rộng bề mặt tấn công cạn kiệt bộ nhớ.

---

### P8.1.03 — Kiểm toán Cơ sở Dữ liệu & Lưu trữ Dữ liệu (Database & State Integrity)
- **Hiện trạng Cơ sở Dữ liệu:**
  - Hệ thống **KHÔNG CÓ cơ sở dữ liệu phía máy chủ** (No SQL / No NoSQL Database).
  - Bố cục phòng lưu trữ hoàn toàn tại client thông qua `localStorage` (`ai_feng_shui_saved_layouts`).
  - Giao dịch và Proposal được lưu trữ trong bộ nhớ tạm (In-Memory `Map`) trên máy chủ qua `pendingConfirmations`.
- **Đánh giá Rủi ro (RISK-STATE-01 - HIGH):**
  - Không thể chạy mô hình cân bằng tải đa phiên bản (Multi-pod / Horizontal Pod Autoscaling) vì Proposal tạo ở Pod 1 không thể xác nhận ở Pod 2 nếu không có Redis hoặc sticky sessions.
  - Khi máy chủ khởi động lại (restart), toàn bộ các đề xuất đang chờ xác nhận sẽ bị mất.

---

### P8.1.04 — Kiểm toán Gemini AI & Bộ máy Dự phòng Ngoại tuyến (Gemini & Fallback Audit)
- **Khởi tạo & Quản lý Khóa:**
  - Hỗ trợ cả biến môi trường máy chủ (`GEMINI_API_KEY`) lẫn khóa người dùng truyền qua header `x-gemini-api-key`.
- **Bộ máy Dự phòng Ngoại tuyến (Offline Fallback Engine):**
  - Khi không có khóa API hoặc cuộc gọi Gemini bị lỗi mạng/hết quota, hệ thống tự động rơi về `handleLocalAIChat`.
  - Bộ máy cục bộ kích hoạt `generateOptimizedLayout`, phát sinh Thẻ Đề xuất (Proposal Card) an toàn.
  - **Tính trung thực dữ liệu (Non-fabrication):** Được chứng minh qua Suite 9 và Phase C — hệ thống không bao giờ tự bịa đặt chỉ số cường độ sáng lux hay lưu lượng gió khi thiếu dữ liệu thực nghiệm.

---

### P8.1.05 — Kiểm toán Three.js & Toàn vẹn Không gian 3D (Three.js & Scene Integrity)
- **Cơ chế Bảo vệ Scene (Zero Unauthorized Write):**
  - Đề xuất bố trí được trực quan hóa qua Ghost Preview (mesh bán trong suốt opacity 0.45). Tọa độ của các vật thể thực tế trong scene **hoàn toàn bất biến ($100\%$ unmutated)** cho đến khi người dùng bấm nút "Áp dụng".
  - Hoạt động Undo/Redo khôi phục trạng thái chính xác.
- **Điểm bất cập phát hiện (RISK-THREE-01 - MEDIUM):**
  - *Rò rỉ bộ nhớ VRAM:* Trong `ThreeRoomCanvas.tsx`, khi chuyển đổi preset hoặc xóa đồ vật, hàm `scene.remove(child)` được gọi nhưng không đệ quy gọi `geometry.dispose()` và `material.dispose()`.
  - *Chưa bắt sự kiện `webglcontextlost`:* Nếu GPU bị reset hoặc thiết bị di động chuyển ứng dụng ngầm, canvas có thể bị đen và không tự phục hồi.

---

### P8.1.06 — Kiểm toán An toàn & Bảo mật Ứng dụng (Security Audit)
- **Quét lỗ hổng phụ thuộc (`npm audit`):** **0 lỗ hổng** trên toàn bộ 307 dependencies.
- **Bảo mật Biến môi trường:** `.env` và `.env.local` được đưa vào `.gitignore` chuẩn xác.
- **Các điểm bất cập bảo mật (Xem chi tiết tại `P8_1_SECURITY_AUDIT.md`):**
  - *Thiếu Xác thực API (FINDING-SEC-01 - HIGH):* Mọi route Express đều công khai.
  - *Thiếu Rate Limiting (FINDING-SEC-02 - HIGH):* Nguy cơ cạn kiệt Quota API Gemini.
  - *Lưu Khóa API trần tại LocalStorage (FINDING-SEC-03 - MEDIUM):* Tăng rủi ro khi bị XSS.
  - *Thiếu Security Headers & CORS (FINDING-SEC-04 - MEDIUM):* Thiếu `helmet` và cấu hình CORS tường minh.

---

### P8.1.07 — Kiểm toán Khả năng Ghi log & Giám sát (Logging & Observability Audit)
- **Hiện trạng:**
  - Sử dụng `console.log`, `console.warn`, `console.error` dạng text không có định dạng cấu trúc.
  - Không có Request Correlation ID (`x-request-id`) để liên kết một chuỗi thao tác từ Client $\to$ Server $\to$ AI.
  - **Thiếu endpoint kiểm tra sức khỏe chuẩn:** Không có `/health`, `/healthz`, `/live` hay `/ready` cho các hệ thống giám sát container (Kubernetes, AWS ECS, Google Cloud Run).

---

### P8.1.08 — Kiểm toán Đóng gói Triển khai & Cấu hình Production (Deployment Audit)
- **Bản build Frontend (`vite build`):**
  - Thực thi thành công tạo thư mục `dist/` (HTML: 1.94 kB, CSS: 74.46 kB, JS: 1,176.21 kB).
  - Cảnh báo chunk size > 500 kB (cần tối ưu code-splitting cho Three.js trong P8.3).
- **LỖI NGHIÊM TRỌNG (CRITICAL BLOCKER):**
  - Lệnh `npm start` (`node server.ts`) bị lỗi `ERR_MODULE_NOT_FOUND` ngay khi khởi động vì Node.js native ESM không giải quyết extensionless imports. Bắt buộc phải có build step cho server trước khi triển khai production.

---

## 3. KẾT QUẢ KIỂM TRA TĨNH & HỒI QUY TOÀN DIỆN

1. **TypeScript Type Check (`npx tsc --noEmit`):**  
   `Exit Code: 0` — **0 lỗi biên dịch** trên toàn bộ repository.
2. **NPM Security Audit (`npm audit --json`):**  
   `Vulnerabilities: 0` (0 Critical, 0 High, 0 Moderate, 0 Low).
3. **Frontend Production Build (`npm run build`):**  
   `Exit Code: 0` — Thành công tạo bản đóng gói trong `dist/`.
4. **Hồi quy Toàn bộ 13 Suites Kiểm thử (`tests/run_all_tests.ts`):**  
   `Exit Code: 0` — **420 PASS | 42 RECORDED | 0 FAIL**.
   - Suite 1 (P0 Characterization Baseline): 4 PASS, 12 RECORDED
   - Suite 2 (Phase H Intent Guard & Safety): 17 PASS
   - Suite 3 (Express Server Pipeline Integration): 10 PASS
   - Suite 4 (Phase P1 Spatial Coordinate & Orientation): 13 PASS
   - Suite 5 (Phase P2 Room Layout & Sector Engine): 53 PASS
   - Suite 6 (Phase P3 Furniture Feng Shui Rules): 26 PASS
   - Suite 7 (Phase P4 Personal & House/Room Assessment): 38 PASS
   - Suite 8 (Phase P5 Unified Assessment Report): 19 PASS
   - Suite 9 (Phase P6 Environmental & Ergonomics): 70 PASS, 15 RECORDED
   - Suite 10 (Phase P7 Unified Gemini Agent Execution): 100 PASS, 11 RECORDED
   - Suite 11 (Phase P7.5 Targeted Verification - Hash & Concurrency): 19 PASS, 2 RECORDED
   - Suite 12 (Phase P7.5 Playwright E2E Browser Validation): 16 PASS, 2 RECORDED
   - Suite 13 (PILOT-01.1 Defect Remediation Regression Tests): 34 PASS

---

## 4. MA TRẬN TỔNG HỢP PHÁT HIỆN KIỂM TOÁN (FINDINGS MATRIX)

| Finding ID | Hạng mục | Mức độ | Mô tả ngắn | File liên quan |
|---|---|:---:|---|---|
| **FINDING-DEP-01** | Deployment | **CRITICAL** | `npm start` văng lỗi `ERR_MODULE_NOT_FOUND` trên Node ESM. | `package.json`, `server.ts` |
| **FINDING-SEC-01** | Security | **HIGH** | Thiếu xác thực trên các REST endpoints công khai. | `server.ts` |
| **FINDING-SEC-02** | Security | **HIGH** | Thiếu Rate Limiting, nguy cơ cạn kiệt Gemini Quota / DoS. | `server.ts` |
| **FINDING-ARCH-01**| Architecture | **HIGH** | Tồn tại 2 đường ống AI song song (`server.ts` vs `unifiedAgent.ts`). | `server.ts`, `unifiedAgent.ts` |
| **FINDING-STATE-01**| Architecture | **HIGH** | State proposal lưu trên RAM đơn lẻ, cản trở scaling container. | `serverGuard.ts` |
| **FINDING-OBS-01** | Observability| **MEDIUM** | Thiếu endpoint `/health` và structured logging với Correlation ID. | `server.ts` |
| **FINDING-THREE-01**| Three.js | **MEDIUM** | Rò rỉ GPU VRAM do chưa dispose Mesh geometry/material. | `ThreeRoomCanvas.tsx` |
| **FINDING-SEC-03** | Security | **MEDIUM** | Lưu khóa API người dùng trong `localStorage` trần. | `geminiFengShuiAI.ts` |
| **FINDING-SEC-04** | Security | **MEDIUM** | Thiếu HTTP Security Headers (Helmet) và cấu hình CORS. | `server.ts` |
| **FINDING-UX-01**  | Frontend | **LOW** | File JS bundle lớn (1.17 MB) cần code-splitting. | `vite.config.ts` |
| **FINDING-ARCH-02**| Architecture | **INFO** | Lưu bố cục phòng tại client `localStorage` (định hướng P9). | `layoutStorage.ts` |

---

## 5. KẾT LUẬN & KHUYẾN NGHỊ NGHIỆM THU P8.1

### Đánh giá Mức độ Sẵn sàng:
- **Pilot Acceptance:** ĐẠT CHUẨN XUẤT SẮC (**94.83 / 100**, 420/420 Assertions PASS).
- **Production Readiness:** **CHƯA ĐỦ ĐIỀU KIỆN DEPLOY NGAY (NOT YET PRODUCTION READY)** do lỗi khởi động `npm start` (FINDING-DEP-01) và thiếu các chốt chặn bảo vệ vận hành (Rate Limiting, Healthcheck).

### Trạng thái Kết luận của Giai đoạn P8.1:
> **READY FOR REMEDIATION**  
> Quá trình kiểm toán kỹ thuật P8.1 đã hoàn thành toàn diện, khách quan với đầy đủ bằng chứng thực nghiệm, lập bản đồ kiến trúc và phân loại rủi ro. Hệ thống đã đủ điều kiện để chuyển sang **Phase P8.2 (Remediation)** nhằm xử lý dứt điểm các phát hiện theo lộ trình đã được vạch sẵn trong `P8_1_REMEDIATION_BACKLOG.md`.

