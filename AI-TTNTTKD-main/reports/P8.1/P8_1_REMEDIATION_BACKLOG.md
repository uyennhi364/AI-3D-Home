# P8.1 — KẾ HOẠCH KHẮC PHỤC KỸ THUẬT (REMEDIATION BACKLOG)
## DỰ ÁN: AI FENG SHUI STUDIO (v1.0.0-p7.5)
**Ngày lập:** 12/11/2026  
**Đơn vị lập:** Senior Software Architect & Lead Backend Engineer  
**Mục tiêu:** Định hình chính xác các hạng mục công việc cần xử lý trong Phase P8.2 (Remediation) để đạt tiêu chuẩn Production Ready.  
**Nguyên tắc:** Giữ nguyên vẹn các công thức phong thủy và kiến trúc bảo vệ scene 3D; mọi thay đổi đều phải có bài test hồi quy bảo vệ.  

---

## 1. BẢNG TỔNG HỢP BACKLOG THEO THỨ TỰ ƯU TIÊN

| Task ID | Tiêu đề Hạng mục Khắc phục | Mức ưu tiên | Tệp liên quan | Trạng thái |
|:---:|---|:---:|---|:---:|
| **TASK-P8.2-01** | Sửa lỗi khởi động Production Server (`ERR_MODULE_NOT_FOUND`) | **P0 (Khẩn cấp)** | `package.json`, `esbuild.config.js` | Sẵn sàng triển khai |
| **TASK-P8.2-02** | Bổ sung Rate Limiting & Giảm Payload JSON DoS Limit | **P1 (Cao)** | `server.ts`, `package.json` | Sẵn sàng triển khai |
| **TASK-P8.2-03** | Thêm Endpoint Liveness/Readiness Healthcheck (`/health`) | **P1 (Cao)** | `server.ts` | Sẵn sàng triển khai |
| **TASK-P8.2-04** | Bổ sung Security Headers (Helmet) & Cấu hình CORS | **P1 (Cao)** | `server.ts`, `package.json` | Sẵn sàng triển khai |
| **TASK-P8.2-05** | Hợp nhất đường ống xử lý AI sang `UnifiedGeminiAgent` P7 | **P1 (Cao)** | `server.ts`, `src/engine/agent/unifiedAgent.ts` | Sẵn sàng triển khai |
| **TASK-P8.2-06** | Giải phóng tài nguyên Three.js VRAM & Bắt sự kiện WebGL Context Loss | **P2 (Trung bình)** | `src/components/ThreeRoomCanvas.tsx` | Sẵn sàng triển khai |
| **TASK-P8.2-07** | Chuyển đổi lưu trữ khóa API người dùng sang `sessionStorage` | **P2 (Trung bình)** | `src/engine/geminiFengShuiAI.ts`, `src/components/AIChatConsultant.tsx` | Sẵn sàng triển khai |
| **TASK-P8.2-08** | Cấu hình Graceful Shutdown (`SIGTERM`/`SIGINT`) cho Express | **P2 (Trung bình)** | `server.ts` | Sẵn sàng triển khai |
| **TASK-P8.2-09** | Phân tách gói tải (Code-Splitting) cho Three.js & Vendor Chunks | **P3 (Thấp)** | `vite.config.ts` | Sẵn sàng triển khai |

---

## 2. KẾ HOẠCH THỰC THI CHI TIẾT TỪNG HẠNG MỤC (TASK SPECIFICATIONS)

---

### TASK-P8.2-01: Sửa Lỗi Khởi Động Production Server (`ERR_MODULE_NOT_FOUND`)
- **Mức ưu tiên:** **P0 — BẮT BUỘC TRƯỚC TIÊN**
- **Tệp liên quan:** `package.json`, `server.ts`
- **Mô tả vấn đề:** 
  Lệnh `npm start` chạy `node server.ts` gặp lỗi `ERR_MODULE_NOT_FOUND` do Node.js native ESM không tự giải quyết đường dẫn import không có đuôi `.js` hay `.ts`.
- **Phương án giải quyết:**
  1. Thêm script build server trong `package.json`:
     `"build:server": "esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/server.js"`
  2. Cập nhật script `build`: `"build": "vite build && npm run build:server"`
  3. Cập nhật script `start`: `"start": "node dist/server.js"`
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Chạy `npm run build` tạo ra cả `dist/index.html` và `dist/server.js`.
  - [ ] Chạy `npm start` khởi động thành công máy chủ trên Node.js mà không cần loader hay `tsx`.
  - [ ] Thử gọi API `/api/gemini/status` trên máy chủ đã biên dịch phản hồi HTTP 200.
- **Bài test kiểm chứng:** Viết script kiểm thử smoke test `tests/production_startup.test.ts`.

---

### TASK-P8.2-02: Bổ Sung Rate Limiting & Giảm Giới Hạn Payload JSON
- **Mức ưu tiên:** **P1**
- **Tệp liên quan:** `server.ts`, `package.json`
- **Mô tả vấn đề:** 
  Máy chủ nhận body 10MB và không giới hạn số lượng request, dễ bị tấn công cạn kiệt tài nguyên hoặc quota Gemini.
- **Phương án giải quyết:**
  1. Thêm gói `express-rate-limit` vào `dependencies`.
  2. Cấu hình middleware `rateLimit`:
     - Global limiter: 120 requests / 1 phút / IP.
     - AI Chat limiter (`/api/chat`, `/api/gemini/analyze`): 30 requests / 1 phút / IP.
     - Confirm limiter (`/api/chat/confirm`): 60 requests / 1 phút / IP.
  3. Điều chỉnh `express.json({ limit: '2mb' })`.
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Gửi vượt quá 30 requests trong 1 phút đến `/api/chat` nhận về mã lỗi HTTP 429 Too Many Requests kèm thông báo rõ ràng.
  - [ ] Gửi payload > 2MB nhận về HTTP 413 Payload Too Large.
  - [ ] Người dùng bình thường không bị ảnh hưởng.
- **Bài test kiểm chứng:** `tests/rate_limit.test.ts`.

---

### TASK-P8.2-03: Thêm Endpoint Liveness/Readiness Healthcheck (`/health`)
- **Mức ưu tiên:** **P1**
- **Tệp liên quan:** `server.ts`
- **Mô tả vấn đề:** 
  Thiếu endpoint kiểm tra trạng thái tiến trình phục vụ Kubernetes / Cloud Run / Load Balancer.
- **Phương án giải quyết:**
  Thêm endpoint `GET /health` trả về JSON:
  ```json
  {
    "status": "healthy",
    "uptime": 124.5,
    "timestamp": "2026-11-12T08:00:00.000Z",
    "version": "v1.0.0-p7.5",
    "gemini": { "isConfigured": true }
  }
  ```
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] `GET /health` phản hồi mã HTTP 200 trong vòng < 10ms.
  - [ ] Không yêu cầu authentication hay payload đầu vào.
- **Bài test kiểm chứng:** Tích hợp trong `integration_server_pipeline.test.ts`.

---

### TASK-P8.2-04: Bổ Sung Security Headers (Helmet) & Cấu hình CORS
- **Mức ưu tiên:** **P1**
- **Tệp liên quan:** `server.ts`, `package.json`
- **Mô tả vấn đề:** 
  Thiếu các header an toàn chống Clickjacking, MIME-sniffing, XSS và thiếu cấu hình CORS chuẩn.
- **Phương án giải quyết:**
  1. Thêm gói `helmet` và `cors` vào `dependencies`.
  2. Kích hoạt `helmet` với CSP cho phép Three.js WebGL canvas và Google fonts.
  3. Cấu hình `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || true })`.
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Response headers trả về có `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`.
  - [ ] Giao diện Three.js và ảnh render 3D vẫn hiển thị bình thường, không bị CSP chặn.
- **Bài test kiểm chứng:** Kiểm tra HTTP headers trong browser E2E test.

---

### TASK-P8.2-05: Hợp Nhất Đường Ống Xử Lý AI Sang `UnifiedGeminiAgent` (P7)
- **Mức ưu tiên:** **P1**
- **Tệp liên quan:** `server.ts`, `src/engine/agent/unifiedAgent.ts`
- **Mô tả vấn đề:** 
  Tồn tại 2 pipeline xử lý AI song song giữa `server.ts` và `unifiedAgent.ts`.
- **Phương án giải quyết:**
  Ủy quyền việc xử lý request AI trong route `/api/chat` của `server.ts` cho `UnifiedGeminiAgent.processMessage()` từ module `src/engine/agent/unifiedAgent.ts` đã nghiệm thu trong P7.
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Toàn bộ 100 tests của Suite 10 (`p7_agent_execution.test.ts`) tiếp tục PASS 100%.
  - [ ] Cả 10 kịch bản của Phase D (`pilot_phase_d_proposals.ts`) tiếp tục PASS 100%.
  - [ ] Loại bỏ mã lặp trong `server.ts`.
- **Bài test kiểm chứng:** Chạy toàn bộ 13 Suites sau khi hợp nhất.

---

### TASK-P8.2-06: Giải Phóng Tài Nguyên Three.js VRAM & Bắt Sự Kiện WebGL Context Loss
- **Mức ưu tiên:** **P2**
- **Tệp liên quan:** `src/components/ThreeRoomCanvas.tsx`
- **Mô tả vấn đề:** 
  Khi đổi phòng hoặc xóa đồ vật, các geometry và material không được giải phóng bộ nhớ GPU (VRAM); chưa bắt sự kiện `webglcontextlost`.
- **Phương án giải quyết:**
  1. Xây dựng hàm đệ quy:
     ```typescript
     function deepDisposeObject(obj: THREE.Object3D) {
       obj.traverse((child) => {
         if ((child as any).isMesh) {
           const mesh = child as THREE.Mesh;
           mesh.geometry?.dispose();
           if (Array.isArray(mesh.material)) {
             mesh.material.forEach((m) => m.dispose());
           } else {
             mesh.material?.dispose();
           }
         }
       });
     }
     ```
  2. Gọi `deepDisposeObject` khi gỡ bỏ đồ vật khỏi `scene`.
  3. Lắng nghe sự kiện `renderer.domElement.addEventListener('webglcontextlost', handleContextLost)`.
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Chuyển đổi qua lại giữa 10 presets phòng ngủ không làm tăng lượng bộ nhớ heap của Three.js theo thời gian.
  - [ ] Mô phỏng `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` không làm ứng dụng bị văng lỗi unhandled.
- **Bài test kiểm chứng:** Thử nghiệm stress-test chuyển đổi preset 50 lần liên tục.

---

### TASK-P8.2-07: Chuyển Đổi Lưu Trữ Khóa API Người Dùng Sang `sessionStorage`
- **Mức ưu tiên:** **P2**
- **Tệp liên quan:** `src/engine/geminiFengShuiAI.ts`, `src/components/AIChatConsultant.tsx`
- **Mô tả vấn đề:** 
  Lưu khóa API người dùng trong `localStorage` trần làm tăng nguy cơ bị đánh cắp khi bị XSS.
- **Phương án giải quyết:**
  Đổi từ `localStorage.getItem('gemini_api_key')` sang `sessionStorage.getItem('gemini_api_key')`. Thêm cảnh báo khuyến nghị người dùng dùng khóa API máy chủ.
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Khóa API tự hủy khi đóng tab trình duyệt.
  - [ ] Không có khóa nào lưu trữ vĩnh viễn trong `localStorage`.
- **Bài test kiểm chứng:** Kiểm tra browser storage trong Playwright test.

---

### TASK-P8.2-08: Cấu Hình Graceful Shutdown Cho Express Server
- **Mức ưu tiên:** **P2**
- **Tệp liên quan:** `server.ts`
- **Mô tả vấn đề:** 
  Khi container nhận tín hiệu `SIGTERM` (trong quá trình redeploy hoặc scaling), tiến trình bị ngắt đột ngột, làm gián đoạn các request đang xử lý.
- **Phương án giải quyết:**
  Đăng ký xử lý tín hiệu `SIGTERM` và `SIGINT`:
  ```typescript
  const server = app.listen(port, ...);
  function handleGracefulShutdown(signal: string) {
    console.log(`Received ${signal}, closing HTTP server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000); // 10s force exit timeout
  }
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  ```
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Gửi tín hiệu `SIGTERM` tới máy chủ đóng các kết nối HTTP đang hoạt động trước khi thoát với code 0.
- **Bài test kiểm chứng:** Node process signal test.

---

### TASK-P8.2-09: Phân Tách Gói Tải (Code-Splitting) Cho Three.js & Vendor Chunks
- **Mức ưu tiên:** **P3**
- **Tệp liên quan:** `vite.config.ts`
- **Mô tả vấn đề:** 
  File bundle JS chính có kích thước 1,176 kB, vượt ngưỡng khuyến cáo 500 kB của Vite.
- **Phương án giải quyết:**
  Cấu hình `manualChunks` trong `vite.config.ts`:
  ```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-genai': ['@google/genai'],
        },
      },
    },
  }
  ```
- **Tiêu chuẩn nghiệm thu (Acceptance Criteria):**
  - [ ] Chạy `npm run build` không còn cảnh báo chunk size > 500 kB.
  - [ ] Các tệp chunk được phân chia rõ ràng: `vendor-three.js`, `vendor-react.js`, `index.js`.
- **Bài test kiểm chứng:** Kiểm tra kích thước file trong thư mục `dist/assets/`.

---

## 3. NGUYÊN TẮC BẢO VỆ TOÀN VẸN (NON-REGRESSION CHECKLIST)

Khi thực thi bất kỳ task nào trong danh mục Backlog trên, kỹ sư phụ trách BẮT BUỘC phải tuân thủ nghiêm ngặt checklist sau:

1. [ ] **Không thay đổi công thức Bát Trạch Lữ Tài:** Không chạm vào các file toán học `guaEngine.ts`, `batTrachEngine.ts`, `napAmEngine.ts`.
2. [ ] **Điểm số Master Preset bất biến:** Sau khi sửa, chạy Suite 1 và Suite 4 phải bảo đảm điểm số Master Preset giữ nguyên giá trị chuẩn $89/51$.
3. [ ] **Không được tự động ghi vào Scene:** Mọi đề xuất (Proposal) bắt buộc phải qua bước Confirm trước khi biến đổi Scene.
4. [ ] **Chạy lại toàn bộ 13 Suites:** Lệnh `npm test` (`npx tsx tests/run_all_tests.ts`) phải kết thúc với **420 PASS, 0 FAIL**.

