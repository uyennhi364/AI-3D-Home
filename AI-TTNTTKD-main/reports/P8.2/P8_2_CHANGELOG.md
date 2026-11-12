# NHẬT KÝ THAY ĐỔI MÃ NGUỒN (CODE CHANGELOG)
## PHASE P8.2: PRODUCTION REMEDIATION & HARDENING
**Dự án:** AI Feng Shui Studio  
**Phiên bản:** v1.0.0-p7.5 -> v1.0.0-p8.2  
**Thời gian:** 12/11/2026  

---

## 1. TỔNG HỢP DANH MỤC THAY ĐỔI (FILE DELTA SUMMARY)

| Tệp tin | Hành động | Phân loại | Mục đích |
|:---|:---:|:---:|:---|
| `package.json` | Chỉnh sửa | Config / Dependencies | Thêm script `build:server`, đổi `start` sang `dist/server.js`; thêm `helmet`, `cors`, `express-rate-limit` |
| `vite.config.ts` | Chỉnh sửa | Build Config | Cấu hình Rollup `manualChunks` phân tách `vendor-three` và `vendor-react` |
| `server.ts` | Chỉnh sửa | Backend / Security | Tích hợp Helmet CSP, CORS, Rate Limiters, JSON limit 2MB, Request ID, `/health`, Graceful Shutdown |
| `src/engine/threeResourceUtils.ts` | **Tạo mới** | Engine Utility | Module hóa hàm `deepDisposeObject` đệ quy giải phóng tài nguyên Three.js VRAM |
| `src/components/ThreeRoomCanvas.tsx` | Chỉnh sửa | Frontend 3D | Gọi `deepDisposeObject` khi xóa đồ vật, đổi ghost preview; bắt sự kiện `webglcontextlost` |
| `src/engine/geminiFengShuiAI.ts` | Chỉnh sửa | Client AI Service | Chuyển đổi lưu trữ `gemini_api_key` từ `localStorage` sang `sessionStorage` kèm auto-migration |
| `src/components/AIChatConsultant.tsx` | Chỉnh sửa | UI Component | Đọc/ghi `gemini_api_key` qua `sessionStorage`, xóa key khỏi `localStorage` |
| `tests/p8_2_production_readiness.test.ts` | **Tạo mới** | Test Suite | 22 bài kiểm thử bảo vệ cho Production Artifacts, Security Headers, Healthcheck, DoS, Rate Limiting, Three.js VRAM |
| `tests/run_all_tests.ts` | Chỉnh sửa | Test Runner | Đăng ký Suite 14 (`p8_2_production_readiness.test.ts`) vào quy trình chạy tổng hợp |

---

## 2. CHI TIẾT THAY ĐỔI THEO TỪNG TỆP TIN (DIFF BREAKDOWN)

### 2.1. `package.json`
- **Thay đổi dependencies:**
  - Bổ sung `"cors": "^2.8.6"`
  - Bổ sung `"express-rate-limit": "^8.7.4"`
  - Bổ sung `"helmet": "^8.3.0"`
  - Bổ sung devDependencies `"@types/cors": "^2.8.19"`
- **Thay đổi npm scripts:**
  ```json
  "scripts": {
    "dev": "tsx watch server.ts",
    "build:client": "vite build",
    "build:server": "esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/server.js",
    "build": "vite build && npm run build:server",
    "start": "node dist/server.js",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit",
    "test": "tsx tests/run_all_tests.ts"
  }
  ```

### 2.2. `vite.config.ts`
- **Bổ sung khối cấu hình build:**
  ```typescript
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'vendor-three';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-genai';
            }
            if (id.includes('lucide-react') || id.includes('motion')) {
              return 'vendor-ui';
            }
            return 'vendor-common';
          }
        },
      },
    },
  }
  ```

### 2.3. `server.ts`
- **Bổ sung imports an ninh:** `helmet`, `cors`, `rateLimit`.
- **Cấu hình Security & DoS Protection:**
  - `app.use(helmet({ contentSecurityPolicy: { ... }, crossOriginEmbedderPolicy: false }))`
  - `app.use(cors({ origin: allowedOrigins, credentials: true }))`
  - `app.use(express.json({ limit: '2mb' }))` (giảm từ 10MB xuống 2MB)
  - Correlation ID: Middleware tạo và gán `X-Request-ID`, `X-Instance-ID`.
- **Rate Limiters:**
  - `globalLimiter`: 120 req/min
  - `aiChatLimiter`: 30 req/min (áp dụng cho `/api/chat`, `/api/gemini/chat`, `/api/gemini/analyze`)
  - `confirmLimiter`: 60 req/min (áp dụng cho `/api/chat/confirm`)
- **Healthcheck Endpoint:**
  - `GET /health` và `GET /ready` phản hồi trạng thái sức khỏe, uptime, instanceId, bộ nhớ, cấu hình AI.
- **Error Handling & Graceful Shutdown:**
  - Centralized error handler bắt lỗi quá tải payload (413) và lỗi server (500).
  - `setupGracefulShutdown(server)` bắt `SIGTERM` và `SIGINT`.
  - Phân giải đường dẫn tĩnh thông minh: `fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : path.join(__dirname, 'dist')`.

### 2.4. `src/engine/threeResourceUtils.ts` (Mới)
- Cung cấp hàm thuần túy `deepDisposeObject(obj: THREE.Object3D)`:
  ```typescript
  export function deepDisposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if ((m as any)?.map) (m as any).map.dispose();
              m.dispose();
            });
          } else {
            if ((mesh.material as any)?.map) (mesh.material as any).map.dispose();
            mesh.material.dispose();
          }
        }
      }
    });
  }
  ```

### 2.5. `src/components/ThreeRoomCanvas.tsx`
- Tích hợp `deepDisposeObject` giải phóng bộ nhớ GPU khi đồ vật bị xóa khỏi danh sách `objects`.
- Giải phóng toàn bộ Ghost Preview Mesh khi tắt hoặc đổi đề xuất bố trí.
- Giải phóng đệ quy toàn bộ `scene` khi component unmount.
- Đăng ký sự kiện `webglcontextlost` (tạm dừng loop) và `webglcontextrestored` (khôi phục loop).

### 2.6. `src/engine/geminiFengShuiAI.ts` & `src/components/AIChatConsultant.tsx`
- Đổi từ `localStorage.getItem('gemini_api_key')` sang `sessionStorage.getItem('gemini_api_key')`.
- Bổ sung cơ chế auto-migration: tự động di chuyển key cũ tồn đọng từ `localStorage` sang `sessionStorage` và xóa ngay khỏi `localStorage`.

---

## 3. DANH SÁCH CÁC TỆP TIN BẤT BIẾN (INVARIANT BASELINE VERIFICATION)

Tuyệt đối không có bất kỳ thay đổi nào tác động đến các module toán học và thuật toán cốt lõi sau:
- `src/engine/core/guaEngine.ts` (100% UNCHANGED)
- `src/engine/core/batTrachEngine.ts` (100% UNCHANGED)
- `src/engine/core/napAmEngine.ts` (100% UNCHANGED)
- `src/engine/core/lapXuanCalendar.ts` (100% UNCHANGED)
- `src/engine/core/personalProfile.ts` (100% UNCHANGED)
- `src/engine/core/roomLayout.ts` (100% UNCHANGED)
- `src/engine/core/sourceRegistry.ts` (100% UNCHANGED)
- `src/engine/core/environmentalConfig.ts` (100% UNCHANGED)
- `src/engine/core/environmentalEngine.ts` (100% UNCHANGED)
- `src/engine/core/unifiedAssessment.ts` (100% UNCHANGED)
- Điểm chuẩn Master Preset ($89/51$) được bảo toàn 100% qua Suite 1 và Suite 4.

