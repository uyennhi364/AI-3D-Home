# BÁO CÁO ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG PRODUCTION (P9 PRODUCTION READINESS AUDIT)
## HỆ THỐNG AI FENG SHUI STUDIO

**Dự án:** AI Feng Shui Studio  
**Giai đoạn:** Phase P9 — Production Release Preparation  
**Tài liệu:** Production Readiness Audit & Risk Assessment  
**Thời điểm lập:** 13/11/2026  
**Phiên bản hệ thống:** v1.0.0-p8.4 (P0–P7.5 FROZEN, P8-M0–M3 & P8.4 ACCEPTED)  
**Tác giả:** AI DeepMind Engineering Team  
**Trạng thái tổng quan:** ⚠️ **CONDITIONALLY READY — CHƯA ĐỦ ĐIỀU KIỆN PRODUCTION DEPLOYMENT**  
*(Tồn tại 1 CRITICAL, 5 HIGH, 4 MEDIUM, 2 LOW cần khắc phục trước khi release)*

---

## 1. TỔNG QUAN KIẾN TRÚC HIỆN TẠI (SYSTEM ARCHITECTURE)

Hệ thống **AI Feng Shui Studio** là ứng dụng Web Full-Stack kết hợp 3D không gian, AI Gemini Agent và Engine thuật toán Phong Thủy truyền thống kết hợp Ngũ Hành phương vị.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (BROWSER)                                  |
|  +---------------------+  +----------------------+  +--------------------------+  |
|  |   ThreeRoomCanvas   |  |     AIChatConsultant |  | UnifiedAssessmentModal   |  |
|  | (Three.js WebGL R3F)|  | (Chat UI + SessionKey|  | + NguHanhAssessmentPanel |  |
|  +----------+----------+  +----------+-----------+  +------------+-------------+  |
|             |                        |                           |                |
|             v                        v                           v                |
|  +---------------------+  +----------------------+  +--------------------------+  |
|  | Scene / Object State|  | Transaction History  |  | Layout Storage           |  |
|  | (React State / RAM) |  | (20-Step Undo/Redo)  |  | (localStorage: layouts)  |  |
|  +----------+----------+  +----------+-----------+  +--------------------------+  |
+-------------|------------------------|--------------------------------------------+
              |                        | REST API (fetch)
              +------------------------+ (x-gemini-api-key, /api/chat, /api/execute-action)
                                       |
+--------------------------------------v--------------------------------------------+
|                                NODE.JS SERVER                                     |
|  +-----------------------------------------------------------------------------+  |
|  | Middlewares: Helmet (CSP), CORS, Express Rate Limit (30/120/60 rpm), JSON   |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  |                     SERVER-SIDE INTENT & PROPOSAL GUARD                     |  |
|  | - intentGuard.ts (6 Execution Modes: THEORY, PROPOSE, CONFIRM, DIRECT,...)  |  |
|  | - serverGuard.ts (pendingConfirmations Map, 5-min TTL, Hash Collision Check)|  |
|  | - Proposal Confirm Gate (Strict 2-Turn Lifecycle, no auto-apply)           |  |
|  +------------------+----------------------------------+-----------------------+  |
|                     |                                  |                          |
|                     v (Online API Key)                 v (No Key / Offline)       |
|  +-------------------------------------+    +----------------------------------+  |
|  |       GEMINI 2.5 FLASH CALL         |    |     OFFLINE LOCAL FALLBACK       |  |
|  |  aiClient.models.generateContent    |    |  handleLocalAIChat (Rule-based   |  |
|  |  (System Prompt + 6 Function Tools) |    |  deterministic NLP response)     |  |
|  +-------------------------------------+    +----------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
+----------------------------------------v------------------------------------------+
|                          DETERMINISTIC CORE ENGINES                                |
|  - P0-P2: Bát Trạch Lữ Tài, Cung phi quái mệnh, 8 hướng Cát/Hung, 24 Sơn hướng    |
|  - P3-P6: Quy tắc nội thất, thước Lỗ Ban, công thái học, ánh sáng, thông gió      |
|  - P8: Ngũ Hành Mapping, Quan hệ Tương sinh/khắc, Rule Engine, Explainer, UI      |
|  - Invariant: Master Preset 89/51 chuẩn mực bất biến                              |
+-----------------------------------------------------------------------------------+
```

### Điểm mạnh kiến trúc:
1. **Decoupled Architecture:** Tách biệt triệt để giữa AI suy luận (Gemini) và Engine quyết định (Deterministic Rule Engine). Gemini không thể tự ý thay đổi điểm số hay phán quyết phong thủy.
2. **Two-Turn Proposal Gate:** Mọi hành vi sửa đổi Scene 3D đều phải qua Turn 1 (Đề xuất) -> User bấm Xác nhận -> Turn 2 (Thực thi). Không có lỗ hổng ghi đè trực tiếp ngoài ý muốn.
3. **Resilience Fallback:** Khi mất mạng hoặc không có API key, hệ thống tự động rơi về `handleLocalAIChat` với 100% deterministic rules, không crash server.
4. **VRAM Memory Safety:** ThreeRoomCanvas đã cài đặt `deepDisposeObject` và `webglcontextlost` handler, ngăn chặn rò rỉ bộ nhớ đồ họa WebGL trên trình duyệt.

---

## 2. NHỮNG PHẦN ĐÃ ĐỦ ĐIỀU KIỆN PRODUCTION (PRODUCTION READY)

| Nhóm chức năng | Trạng thái | Bằng chứng kiểm thử & Code |
|---|:---:|---|
| **Build & Compilation** | ✅ PASS | `npm run lint` (0 error), `npm run build` thành công trong 477ms (Client) + 20ms (Server ESM bundle `dist/server.js`). |
| **Http Security Headers** | ✅ PASS | `server.ts:40-62`: Helmet CSP cấu hình đầy đủ `scriptSrc`, `connectSrc`, `imgSrc`, `frameAncestors: ['none']`. |
| **Rate Limiting** | ✅ PASS | `server.ts:79-114`: 3 limiters riêng biệt (Chat: 30 rpm, Execute: 120 rpm, General: 60 rpm) với IPv6 normalization (`req.ip.replace(/^.*:/, '')`). |
| **Transaction Safety Gate** | ✅ PASS | `serverGuard.ts` & `server.ts:980-1620`: Strict Proposal ID, Hash validation, TTL 5 phút, scene version matching. |
| **Frontend Memory Safety** | ✅ PASS | `ThreeRoomCanvas.tsx:165-220`: `deepDisposeObject` đệ quy giải phóng Geometries, Materials, Textures; xử lý sự kiện `webglcontextlost`. |
| **Session Security (API Key)** | ✅ PASS | `AIChatConsultant.tsx:48-62`: Lưu API key trong `sessionStorage` (tự hủy khi đóng tab), không ghi cố định vào `localStorage`. |
| **Offline Local Fallback** | ✅ PASS | `server.ts:480-870`: `handleLocalAIChat` xử lý 30/30 kịch bản NLU (100% PASS trong `pilot_phase_b_nlu.ts`), bảo vệ Scene 3D. |
| **Phong Thủy & Ngũ Hành Engine** | ✅ PASS | 425/425 Unit & Integration tests PASS (P0–P8.4). Master Preset giữ vững $89/51$. Không có syntheticScore. |
| **E2E Browser Workflow** | ✅ PASS | Playwright test 16/16 steps PASS (P8.3): load room, add furniture, chat, propose, confirm, undo/redo, export. |

---

## 3. NHỮNG PHẦN CHƯA ĐỦ ĐIỀU KIỆN PRODUCTION (DEFICIENCIES)

1. **Gemini Network Call thiếu AbortController & Timeout (CRITICAL):**
   - Trong `server.ts` dòng 1246, `await aiClient.models.generateContent({...})` không cấu hình `signal` hoặc timeout wrapper.
   - Nếu upstream Google Gemini API gặp sự cố treo mạng, connection của Express client sẽ bị giữ mở vô thời hạn, gây cạn kiệt socket pool / memory leak trên Node.js.
2. **Xác thực Mạng Sống Gemini API chưa hoàn thành (HIGH - GEMINI-01):**
   - Từ Phase P8.3 đến nay, việc gọi trực tiếp đến upstream Gemini endpoint qua mạng thật (`https://generativelanguage.googleapis.com`) chưa được verify với Live API Key có quota hợp lệ trong CI/Test tự động (ghi nhận `NOT VERIFIED`).
3. **CORS Fallback cho phép Mọi Nguồn khi thiếu Env Var (HIGH):**
   - Trong `server.ts` dòng 68–71: Nếu `ALLOWED_ORIGINS` không được định nghĩa, `allowedOrigins` nhận giá trị `true` (cho phép phản hồi CORS cho bất kỳ origin nào gửi lên). Đây là lỗ hổng CSRF/CORS rủi ro cao trên Production.
4. **Trùng lặp AI Pipeline / Code Debt (HIGH):**
   - `src/engine/agent/unifiedAgent.ts` (Phase P7 hoàn chỉnh với 100/100 tests) không được `server.ts` import hay tái sử dụng. Thay vào đó, `server.ts` viết lại 650 dòng code inline (`server.ts:970-1624`), tạo ra phân mảnh logic (dual-maintenance hazard).
5. **In-Memory Proposal Store không hỗ trợ Horizontal Scaling (MEDIUM):**
   - `serverGuard.ts` dòng 195: `pendingConfirmations` được lưu trong một `Map<string, PendingConfirmation>` trên RAM đơn tiến trình. Nếu deploy dạng cluster, multi-instance container (K8s/ECS) hoặc server restart, toàn bộ proposal đang chờ sẽ mất, dẫn đến lỗi 400 Bad Request cho người dùng.
6. **Lưu trữ Layout thiếu Quản lý Dung lượng & Migration (MEDIUM):**
   - `src/engine/layoutStorage.ts` dòng 18, 45, 51: Dùng `localStorage` vĩnh viễn không giới hạn hạn mức, không có cơ chế version migration hay quota limit check (`QuotaExceededError`).
7. **Thiếu Structured Logging & Observability (MEDIUM):**
   - Toàn bộ backend chỉ sử dụng `console.log`, `console.warn`, `console.error` thô, thiếu structured JSON logging (Winston/Pino) kèm metadata chuẩn (`trace_id`, `latency_ms`, `http_status`, `error_stack`).
8. **Thiếu Dockerfile & CI/CD Pipeline (HIGH):**
   - Repository chưa có `Dockerfile`, `.dockerignore`, `docker-compose.yml` hay GitHub Actions workflow để tự động hóa lint, build, test và packaging chuẩn production container.
9. **Version String trong Health Endpoint bị lỗi thời (LOW):**
   - `server.ts` dòng 124 trả về `version: 'v1.0.0-p7.5'`, trong khi dự án đã hoàn thành P8.4.
10. **Tên Package trong package.json chưa chuẩn hóa (LOW):**
    - `package.json` dòng 2: `"name": "react-example"` và `"version": "0.0.0"`.

---

## 4. MA TRẬN RỦI RO CHI TIẾT (RISK MATRIX)

| Mã Rủi Ro | Phân Loại | Mức Độ | File & Dòng Code | Mô Tả & Ảnh Hưởng | Hướng Khắc Phục |
|---|---|:---:|---|---|---|
| **RISK-P9-01** | Gemini AI / Stability | **CRITICAL** | `server.ts:1246` | `generateContent` không có timeout/AbortSignal. Nếu Gemini API chậm hoặc ngắt kết nối dở dang, worker thread bị block, gây DoS server khi tải cao. | Bọc call trong `Promise.race` với timeout 25s hoặc sử dụng `AbortController`. Fallback về `handleLocalAIChat` khi timeout. |
| **RISK-P9-02** | Security / CORS | **HIGH** | `server.ts:68-71` | `ALLOWED_ORIGINS` nếu không set sẽ fallback thành `origin: true` (wildcard reflection), cho phép bất kỳ website độc hại nào gửi cross-origin request. | Fallback về origin tĩnh an toàn (e.g., `localhost:3000`, `APP_URL`) hoặc chặn request nếu không cấu hình. |
| **RISK-P9-03** | Testing / AI | **HIGH** | `PROGRESS.md: GEMINI-01` | Live Gemini Call chưa được kiểm chứng thực tế với Google endpoint do thiếu Live Key trong sandbox. Nguy cơ payload schema không tương thích ngầm với API v1beta. | Cung cấp live test script có gắn timeout, chạy 1 lượt kiểm thử với real key và ghi nhận log response thật. |
| **RISK-P9-04** | Architecture / Tech Debt | **HIGH** | `server.ts:970-1624` vs `unifiedAgent.ts` | Trùng lặp logic pipeline AI. Cùng một cơ chế phân tích intent và sinh proposal nhưng viết ở 2 nơi riêng biệt. | Refactor `server.ts` để ủy quyền phần phân tích nội dung cho module `unifiedAgent.ts` hoặc đồng bộ hóa tuyệt đối. |
| **RISK-P9-05** | DevOps / Deployment | **HIGH** | *Thiếu file cấu hình* | Không có `Dockerfile`, `.dockerignore`, `docker-compose.yml`. Môi trường triển khai không đồng nhất giữa dev và prod. | Tạo Dockerfile multi-stage build (Node 22-Alpine), tối ưu kích thước image (<150MB), non-root user. |
| **RISK-P9-06** | DevOps / CI-CD | **HIGH** | *Thiếu file cấu hình* | Không có GitHub Actions / CI pipeline tự động chạy `lint`, `typecheck`, `test`, `build` khi merge code. | Tạo workflow `.github/workflows/ci.yml` bảo vệ nhánh main. |
| **RISK-P9-07** | State / Scalability | **MEDIUM** | `serverGuard.ts:195` | `pendingConfirmations` là in-memory `Map`. Không scale ngang được ra nhiều replicas container; server restart làm mất active proposals. | Thiết kế adapter abstraction: MemoryStore cho dev/single node, RedisStore (hoặc TTL DB) cho cluster prod. |
| **RISK-P9-08** | Monitoring / Logging | **MEDIUM** | `server.ts` (toàn bộ) | Console logs rời rạc, không cấu trúc JSON, không gắn trace correlation ID cho AI latency, khó debug production. | Tích hợp logger chuẩn (Pino/Winston) gắn `requestId`, đo lường thời gian xử lý AI và error stacks. |
| **RISK-P9-09** | Data / Storage | **MEDIUM** | `layoutStorage.ts:18,45,51` | `localStorage` lưu layout không giới hạn kích thước, không try/catch `QuotaExceededError`, không có export/import backup file. | Bổ sung try-catch bắt lỗi quota, thêm tính năng download/upload file `.fengshui.json` dự phòng. |
| **RISK-P9-10** | Security / Secret | **MEDIUM** | `server.ts:1210-1220` | Client gửi Gemini API key qua HTTP header `x-gemini-api-key` hoặc request body. Nếu server log header sẽ lộ credential. | Cài đặt sanitize middleware che mờ (mask `sk-...****`) toàn bộ header/body chứa API key trước khi log. |
| **RISK-P9-11** | Configuration | **LOW** | `server.ts:127` | Endpoint `/health` trả về `version: 'v1.0.0-p7.5'`. Gây hiểu nhầm phiên bản khi monitoring check. | Cập nhật version động đọc từ `package.json` hoặc set chuẩn `'v1.0.0-p8.4'`. |
| **RISK-P9-12** | Package Metadata | **LOW** | `package.json:2-3` | Tên package là `"react-example"`, phiên bản `"0.0.0"`. | Đổi tên thành `"ai-feng-shui-studio"`, version `"1.0.0"`. |

---

## 5. BẰNG CHỨNG CỤ THỂ CHO TỪNG PHÁT HIỆN

### 5.1. Bằng chứng RISK-P9-01: Thiếu Timeout tại Gemini Call
Tại `server.ts` dòng 1240–1255:
```typescript
const response = await aiClient.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: geminiContents,
  config: {
    systemInstruction: FENG_SHUI_SYSTEM_PROMPT,
    tools: !isGeneralChat ? (GEMINI_TOOLS as any) : undefined,
    temperature: 0.7,
  },
}); // KHÔNG CÓ timeout, KHÔNG CÓ abortSignal
```
*Hậu quả:* Khi upstream Google API bị nghẽn (p99 latency tăng cao hoặc socket hang), request Express này không bao giờ terminate cho đến khi client tự timeout sau 2 phút, chiếm dụng connection slot.

### 5.2. Bằng chứng RISK-P9-02: CORS Fallback lỏng lẻo
Tại `server.ts` dòng 68–71:
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true; // NGUY HIỂM: origin: true sẽ reflect mọi Origin từ request header!
app.use(cors({ origin: allowedOrigins, credentials: true }));
```

### 5.3. Bằng chứng RISK-P9-07: In-Memory Pending Confirmations
Tại `src/services/serverGuard.ts` dòng 195:
```typescript
/** In-memory store. For production: use Redis or DB with TTL. */
export const pendingConfirmations = new Map<string, PendingConfirmation>();
```
*Hậu quả:* Khi chạy với `pm2 cluster` hoặc Kubernetes 2 replicas trở lên, request Confirm (Turn 2) có thể rơi vào instance khác với Turn 1, dẫn đến lỗi `"Proposal không tồn tại hoặc đã hết hạn"`.

### 5.4. Bằng chứng RISK-P9-11: Outdated Version String trong Health Check
Tại `server.ts` dòng 124–128:
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    version: 'v1.0.0-p7.5', // LỖI THỜI: Thực tế hệ thống đã đạt p8.4
```

---

## 6. ĐỀ XUẤT THỨ TỰ XỬ LÝ (ACTION PLAN THEO MILESTONES)

Để đưa hệ thống đạt chứng chỉ **PRODUCTION READY**, khuyến nghị triển khai Phase P9 theo 4 Milestones tuần tự:

### 🎯 Milestone P9-M1: Hardening & Core Stability (Bắt buộc — Xử lý CRITICAL & HIGH)
1. **Gemini Timeout & Circuit Breaker (RISK-P9-01):**
   - Thêm wrapper timeout 25s cho mọi lệnh gọi `generateContent`.
   - Bắt timeout exception -> Tự động chuyển hướng sang `handleLocalAIChat` với cảnh báo minh bạch cho người dùng.
2. **CORS Safe Default (RISK-P9-02):**
   - Thay đổi fallback của `allowedOrigins`: nếu không có env, chỉ chấp nhận cùng host hoặc origins trong whitelist mặc định (`localhost:3000`, `localhost:5173`).
3. **Health Check & Metadata Sync (RISK-P9-11, RISK-P9-12):**
   - Đọc version động từ `package.json`, nâng cấp thành `1.0.0-prod`. Cập nhật `/health` endpoint.
4. **Live API Key Verification Runbook (RISK-P9-03):**
   - Tạo test script độc lập kiểm chứng end-to-end với Google Gemini API thật khi có key.

### 🎯 Milestone P9-M2: Containerization & CI/CD Pipeline (Xử lý DevOps)
1. **Docker Multi-Stage Build (RISK-P9-05):**
   - Tạo `Dockerfile` chuẩn (Node 22 Alpine, build frontend Vite -> bundle server.js -> run non-root).
   - Tạo `.dockerignore` loại bỏ `node_modules`, `tests`, `reports`.
   - Tạo `docker-compose.yml` hỗ trợ chạy local production container test.
2. **Automated CI Workflow (RISK-P9-06):**
   - Tạo `.github/workflows/production-gate.yml` gồm các bước: Lint -> Typecheck -> 14 Regression Suites -> Build.

### 🎯 Milestone P9-M3: Observability & Resilience (Xử lý MEDIUM)
1. **Structured JSON Logging & Redaction (RISK-P9-08, RISK-P9-10):**
   - Cài đặt logging format chuẩn có `reqId`, `timestamp`, `level`, `durationMs`.
   - Che mờ API keys và thông tin nhạy cảm trong headers/body.
2. **Layout Storage Quota Protection (RISK-P9-09):**
   - Bổ sung kiểm tra hạn mức `localStorage`, cảnh báo khi vượt 4MB, hỗ trợ Export JSON file.
3. **State Store Abstraction Interface (RISK-P9-07):**
   - Chuẩn bị interface `IProposalStore` để sẵn sàng chuyển từ in-memory `Map` sang Redis khi hệ thống scale lớn.

### 🎯 Milestone P9-M4: Documentation & Final Release Acceptance
1. **Tài liệu Vận hành & Cấu hình:**
   - Hoàn thiện `docs/PRODUCTION_RUNBOOK.md`: Cấu hình Environment Variables, hướng dẫn deploy Docker, monitoring health check, xử lý sự cố.
2. **Nghiệm thu Tổng kết:**
   - Chạy toàn bộ 14 Regression Suites (442+ PASS).
   - Kiểm tra E2E Playwright trên Production container.
   - Xuất bản báo cáo `reports/P9_FINAL_ACCEPTANCE.md`.

---

## 7. TIÊU CHÍ HOÀN THÀNH PHASE P9 (PRODUCTION READINESS GATE)

Hệ thống chỉ được phép chuyển sang trạng thái **PRODUCTION READY (APPROVED)** khi thỏa mãn đầy đủ 8 tiêu chí sau:

- [ ] **GATE-01:** `RISK-P9-01` đã được khắc phục — Gemini API call có timeout 25s và fallback an toàn 100%.
- [ ] **GATE-02:** `RISK-P9-02` đã được khắc phục — CORS chặn triệt để mọi origin lạ khi chạy môi trường production.
- [ ] **GATE-03:** Docker image build thành công, chạy container độc lập không lỗi, dung lượng < 200MB.
- [ ] **GATE-04:** GitHub Actions CI workflow thiết lập và chạy pass 100% các bước kiểm tra.
- [ ] **GATE-05:** Toàn bộ 14 Regression Suites (442 PASS / 46 RECORDED / 0 FAIL) tiếp tục bảo toàn 100%.
- [ ] **GATE-06:** Master Preset $89/51$ và các quy tắc Bát Trạch, Ngũ Hành không bị suy suyển (Frozen Invariant).
- [ ] **GATE-07:** Health endpoint `/health` trả về đúng phiên bản v1.0.0 và trạng thái tài nguyên hệ thống.
- [ ] **GATE-08:** Có đầy đủ hướng dẫn vận hành, xử lý sự cố và biến môi trường trong Production Runbook.

---

## 8. KẾT LUẬN & KHUYẾN NGHỊ

Hệ thống **AI Feng Shui Studio** hiện tại đã đạt chất lượng rất cao về mặt thuật toán nghiệp vụ, độ an toàn giao dịch (Proposal/Confirm Gate), bộ nhớ 3D (Three.js WebGL disposal) và khả năng fallback ngoại tuyến.

Tuy nhiên, để đảm bảo an toàn tuyệt đối khi triển khai ra môi trường công cộng với người dùng thật, **cần thực hiện đợt nâng cấp P9-M1 (Hardening & Stability) trước tiên**, trọng tâm là bổ sung cơ chế timeout cho AI call và bảo mật CORS.

**Trạng thái hiện tại:** Dừng chờ phê duyệt kế hoạch triển khai Phase P9 từ Ban Điều Hành.

