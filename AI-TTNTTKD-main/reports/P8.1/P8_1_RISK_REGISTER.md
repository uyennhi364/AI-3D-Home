# P8.1 — SỔ ĐĂNG KÝ RỦI RO KỸ THUẬT (RISK REGISTER)
## DỰ ÁN: AI FENG SHUI STUDIO (v1.0.0-p7.5)
**Ngày lập:** 12/11/2026  
**Đơn vị kiểm toán:** Senior Software Architect & Risk Auditor  
**Thang đo:** Ma trận Rủi ro 5×5 (Khả năng xảy ra × Mức độ tác động)  

---

## 1. MA TRẬN PHÂN LOẠI MỨC ĐỘ RỦI RO

| Mức độ Rủi ro | Định nghĩa vận hành | Số lượng phát hiện | Hướng xử lý |
|:---:|---|:---:|---|
| **CRITICAL** | Lỗi ngăn chặn hoàn toàn việc triển khai hoặc gây tê liệt hệ thống production ngay khi khởi động. | **1** | Bắt buộc xử lý trong P8.2 trước khi đóng gói Release Candidate. |
| **HIGH** | Lỗ hổng hoặc khiếm khuyết ảnh hưởng trực tiếp đến độ ổn định, chi phí vận hành hoặc an toàn hệ thống. | **3** | Bắt buộc xử lý trong P8.2. |
| **MEDIUM** | Rủi ro về giám sát, rò rỉ tài nguyên GPU hoặc chính sách bảo mật tiêu chuẩn. | **3** | Khuyến nghị xử lý trong P8.2 / hoàn thiện ở P8.3. |
| **LOW** | Vấn đề tối ưu hiệu năng bundle hoặc trải nghiệm tải trang. | **1** | Xử lý trong chu kỳ tối ưu hóa tiếp theo. |
| **INFO** | Ghi nhận cấu trúc kiến trúc và định hướng nâng cấp trong tương lai (P9). | **1** | Ghi nhận tài liệu, không chặn release. |
| **TỔNG CỘNG** | | **9** | |

---

## 2. DANH MỤC THẺ RỦI RO CHI TIẾT (RISK CARDS)

---

### RISK-DEP-01: Lỗi Khởi Động Production Server (`ERR_MODULE_NOT_FOUND`)
- **Mã định danh:** `RISK-DEP-01`
- **Mức độ rủi ro:** **CRITICAL** (Impact: 5, Likelihood: 5)
- **Hạng mục:** Triển khai & Cấu hình Production (P8.1.08)
- **Tệp liên quan:** `package.json` dòng 9, `server.ts` dòng 6–11.
- **Mô tả vấn đề:**
  Trong `package.json`, lệnh `npm start` được cấu hình là `"node server.ts"`. Trong môi trường Node.js chuẩn khi chạy ESM native, Node không tự giải quyết các import tương đối không có đuôi mở rộng (extensionless relative imports) như `import { generateOptimizedLayout } from './src/engine/layoutOptimizer'`.
- **Bằng chứng tái hiện:**
  Chạy lệnh `node server.ts` trực tiếp trên Node v24.14.0 dẫn đến crash ngay lập tức:
  ```
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/engine/layoutOptimizer' imported from .../server.ts
      at finalizeResolution (node:internal/modules/esm/resolve:275:11)
  ```
- **Ảnh hưởng:** 
  Container Docker hoặc dịch vụ Cloud Run / Kubernetes sẽ liên tục crash loop ngay khi khởi chạy lệnh `npm start` trên production.
- **Chiến lược giảm thiểu (Mitigation):**
  1. *Phương án A (Khuyến nghị):* Bổ sung build step cho server: sử dụng `esbuild` hoặc `tsc` biên dịch `server.ts` thành `dist/server.js` (gộp dependencies hoặc bảo đảm đường dẫn import chuẩn) và đổi script `start` thành `"node dist/server.js"`.
  2. *Phương án B:* Cập nhật script start thành `"tsx server.ts"` trong production container.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P0 - Khẩn cấp).

---

### RISK-SEC-01: Thiếu Rate Limiting & Rủi ro DoS / Cạn kiệt Quota Gemini
- **Mã định danh:** `RISK-SEC-01`
- **Mức độ rủi ro:** **HIGH** (Impact: 4, Likelihood: 4)
- **Hạng mục:** An toàn & Bảo mật (P8.1.06) / REST API (P8.1.02)
- **Tệp liên quan:** `server.ts` dòng 41, dòng 885, dòng 970.
- **Mô tả vấn đề:**
  Các API `/api/chat` và `/api/gemini/analyze` nhận payload tới 10MB mà không có bất kỳ cơ chế kiểm soát số lượng request trên mỗi IP (Rate Limiting).
- **Ảnh hưởng:**
  - Kẻ xấu có thể gửi hàng nghìn request liên tục làm nghẽn CPU Node.js hoặc tiêu hao toàn bộ hạn mức Gemini API trong thời gian ngắn, gây gián đoạn dịch vụ cho người dùng thật và phát sinh chi phí lớn.
- **Chiến lược giảm thiểu (Mitigation):**
  1. Giảm giới hạn `express.json` xuống `1mb` hoặc `2mb`.
  2. Tích hợp middleware `express-rate-limit` với giới hạn 30 requests/phút cho các route gọi AI.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P1).

---

### RISK-STATE-01: Lưu trữ Trạng thái Xác nhận & Khóa Giao dịch trong Bộ nhớ RAM Đơn lẻ
- **Mã định danh:** `RISK-STATE-01`
- **Mức độ rủi ro:** **HIGH** (Impact: 4, Likelihood: 3)
- **Hạng mục:** Cơ sở Dữ liệu & Tính Toàn Vẹn Trạng Thái (P8.1.03)
- **Tệp liên quan:** `src/services/serverGuard.ts` dòng 17, `src/engine/agent/proposalManager.ts`.
- **Mô tả vấn đề:**
  Toàn bộ `pendingConfirmations` và khóa chống xung đột đồng thời (Concurrency Lock) được lưu trong một `Map` trên bộ nhớ RAM của một tiến trình Node.js duy nhất.
- **Ảnh hưởng:**
  - Khi triển khai ứng dụng trên cụm nhiều container (Horizontal Pod Autoscaling / Multi-instance), request của người dùng khi gửi Proposal có thể vào Instance A, nhưng request Confirm lại vào Instance B. Instance B không có thông tin Proposal trong RAM và sẽ trả về lỗi 409/404.
  - Khi tiến trình máy chủ restart, toàn bộ các proposal đang chờ xác nhận bị mất trắng.
- **Chiến lược giảm thiểu (Mitigation):**
  1. Đối với Single-instance production (Cloud Run 1 instance hoặc VM): Duy trì in-memory nhưng cấu hình sticky sessions.
  2. Đối với Multi-instance production: Sử dụng Redis hoặc shared key-value store cho state proposal và concurrency locks.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P1).

---

### RISK-ARCH-01: Tồn tại Hai Đường Ống Xử Lý AI Song Song (Duplicate AI Pipeline)
- **Mã định danh:** `RISK-ARCH-01`
- **Mức độ rủi ro:** **HIGH** (Impact: 3, Likelihood: 4)
- **Hạng mục:** Kiến trúc & Ranh giới Module (P8.1.01)
- **Tệp liên quan:** `server.ts` dòng 970–1624 so với `src/engine/agent/unifiedAgent.ts`.
- **Mô tả vấn đề:**
  Trong Phase P7, nhóm phát triển đã thiết kế `UnifiedGeminiAgent` trong `unifiedAgent.ts` rất hoàn chỉnh và kiểm thử đạt 100/100 PASS ở Suite 10. Tuy nhiên, `server.ts` hiện tại vẫn sử dụng một đường ống riêng được code inline bên trong file `server.ts`.
- **Ảnh hưởng:**
  - Vi phạm nguyên tắc "Single Source of Truth". Bất kỳ thay đổi nào trong prompt, công cụ hoặc chính sách an toàn đều phải cập nhật ở cả 2 nơi.
  - Gây nhầm lẫn trong quá trình bảo trì và mở rộng hệ thống lên Phase P8.
- **Chiến lược giảm thiểu (Mitigation):**
  Hợp nhất luồng xử lý AI của `server.ts` để ủy quyền hoàn toàn cho `UnifiedGeminiAgent` đã được nghiệm thu trong P7.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P1).

---

### RISK-OBS-01: Thiếu Endpoint Kiểm Tra Sức Khỏe Chuẩn & Thiếu Structured Logging
- **Mã định danh:** `RISK-OBS-01`
- **Mức độ rủi ro:** **MEDIUM** (Impact: 3, Likelihood: 4)
- **Hạng mục:** Khả năng Giám sát & Ghi log (P8.1.07)
- **Tệp liên quan:** `server.ts`.
- **Mô tả vấn đề:**
  - Không có endpoint `/health` hoặc `/live` để các bộ cân bằng tải (Load Balancer, Kubernetes Kubelet, Cloud Run) kiểm tra trạng thái tiến trình máy chủ.
  - Sử dụng `console.log` và `console.error` dạng văn bản thô, không có cấu trúc JSON, không có Correlation ID (`reqId`), gây khó khăn cho việc truy vết lỗi trên Datadog/CloudWatch/Grafana Loki.
- **Chiến lược giảm thiểu (Mitigation):**
  1. Bổ sung `GET /health` trả về HTTP 200 `{ status: "ok", uptime, timestamp }`.
  2. Gắn middleware gán `req.id` cho mỗi request và ghi log có cấu trúc.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P2).

---

### RISK-THREE-01: Rò rỉ Tài nguyên VRAM do Chưa Giải Phóng Mesh/Geometry Trong Three.js
- **Mã định danh:** `RISK-THREE-01`
- **Mức độ rủi ro:** **MEDIUM** (Impact: 3, Likelihood: 3)
- **Hạng mục:** Three.js & Toàn Vẹn Không Gian 3D (P8.1.05)
- **Tệp liên quan:** `src/components/ThreeRoomCanvas.tsx` dòng 515–522.
- **Mô tả vấn đề:**
  Khi người dùng thay đổi đồ vật, xóa đồ vật hoặc chuyển đổi nhiều preset liên tục, hàm `scene.remove(child)` được gọi nhưng không thực hiện đệ quy `child.geometry.dispose()` và `child.material.dispose()`. Ngoài ra, chưa lắng nghe sự kiện `webglcontextlost`.
- **Ảnh hưởng:**
  Người dùng thao tác lâu trên các thiết bị có bộ nhớ đồ họa hạn chế (laptop mỏng nhẹ, điện thoại di động) có thể gặp hiện tượng tụt FPS (Frame Drop), lag hoặc sập tab trình duyệt (WebGL Context Lost).
- **Chiến lược giảm thiểu (Mitigation):**
  1. Xây dựng hàm tiện ích `disposeNode(node: THREE.Object3D)` để giải phóng toàn bộ buffer geometry và material khi gỡ mesh.
  2. Đăng ký sự kiện `webglcontextlost` trên canvas để ngăn crash và tái tạo renderer khi `webglcontextrestored`.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P2).

---

### RISK-SEC-02: Khóa API Người Dùng Lưu Trữ Plaintext trong LocalStorage & Thiếu Security Headers
- **Mã định danh:** `RISK-SEC-02`
- **Mức độ rủi ro:** **MEDIUM** (Impact: 3, Likelihood: 3)
- **Hạng mục:** An toàn & Bảo mật (P8.1.06)
- **Tệp liên quan:** `src/engine/geminiFengShuiAI.ts` dòng 110, `server.ts` dòng 38–42.
- **Mô tả vấn đề:**
  Khóa API cá nhân của người dùng được lưu trong `localStorage` trần; máy chủ thiếu các HTTP security headers chuẩn (Helmet, CSP, X-Frame-Options).
- **Chiến lược giảm thiểu (Mitigation):**
  1. Chuyển lưu trữ khóa API sang `sessionStorage` (tự hủy khi đóng phiên trình duyệt).
  2. Bổ sung `helmet` middleware trên Express.
- **Phân công xử lý:** P8.2 Remediation (Ưu tiên P2).

---

### RISK-UX-01: Kích Thước Bundle Client Lớn (1.17 MB) Chưa Phân Tách Code-Splitting
- **Mã định danh:** `RISK-UX-01`
- **Mức độ rủi ro:** **LOW** (Impact: 2, Likelihood: 3)
- **Hạng mục:** Triển khai & Tối ưu Client (P8.1.08)
- **Tệp liên quan:** `dist/assets/index-lzsfViGH.js`, `vite.config.ts`.
- **Mô tả vấn đề:**
  Bản build production gộp toàn bộ Three.js, React, Google GenAI SDK và Lucide icons vào một file JS duy nhất có dung lượng 1,176 kB (vượt ngưỡng cảnh báo 500 kB của Vite).
- **Chiến lược giảm thiểu (Mitigation):**
  Cấu hình `build.rollupOptions.output.manualChunks` trong `vite.config.ts` để tách riêng `vendor-three` và `vendor-react`.
- **Phân công xử lý:** P8.3 Release Polish.

---

### RISK-ARCH-02: Lưu Trữ Bố Cục Phòng Hoàn Toàn Tại LocalStorage Trình Duyệt
- **Mã định danh:** `RISK-ARCH-02`
- **Mức độ rủi ro:** **INFO** (Impact: 1, Likelihood: 2)
- **Hạng mục:** Kiến trúc Dữ liệu & Lưu trữ (P8.1.03)
- **Tệp liên quan:** `src/engine/layoutStorage.ts`.
- **Mô tả vấn đề:**
  Hiện tại hệ thống hoạt động theo mô hình Client-Local Storage. Người dùng đổi trình duyệt hoặc xóa cache sẽ mất danh sách bố cục đã lưu.
- **Chiến lược định hướng:**
  Ghi nhận cho kiến trúc Phase P9 (triển khai Backend User Database, Cloud Sync và Authentication).
- **Phân công xử lý:** Chuyển giao sang lộ trình Phase P9.

