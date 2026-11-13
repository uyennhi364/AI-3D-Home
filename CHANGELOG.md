# Lịch Sử Thay Đổi (Changelog) — AI Feng Shui Studio

Tất cả các thay đổi đáng chú ý của dự án **AI Feng Shui Studio** sẽ được ghi chép tại đây theo định dạng [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0-p9.1] — 2026-11-13 (Production Release Candidate)

### Đã Thêm (Added)
- **P9-M3 Structured JSON Logging (`src/services/logger.ts`):** Chuẩn hóa output JSON dòng đơn kèm `timestamp`, `level` (INFO, WARN, ERROR, DEBUG), `requestId` tương quan, `module`, `event` và che dấu tự động các khóa nhạy cảm.
- **P9-M3 Storage Resilience & Quota Guard (`src/services/storageResilience.ts`):** Cơ chế bắt lỗi `QuotaExceededError` an toàn không làm crash scene 3D; đóng gói versioned envelope v1 và migrator registry tự động.
- **P9-M3 Proposal Store Abstraction (`src/engine/agent/proposalStore.ts`):** Tách biệt interface `IProposalStore` và adapter `InMemoryProposalStore` mặc định, sẵn sàng mở rộng Redis trong tương lai.
- **P9-M2 Docker Containerization:** `Dockerfile` Multi-Stage (Node 22 Alpine, non-root user `node`, healthcheck wget), `docker-compose.yml`, `.dockerignore` cô lập secret.
- **P9-M2 CI/CD Pipelines (`.github/workflows/`):** Workflow tự động `production-gate.yml` (Lint, Test 14 suites, Build, Docker container test) và manual workflow `live-gemini-test.yml`.
- **P9-M1 Core Hardening:** Timeout 25 giây cho mọi cuộc gọi Google Gemini qua real `AbortSignal`; cơ chế phân loại lỗi 5 nhóm (timeout, quota, network, upstream, unknown); CORS fail-closed trong môi trường production khi thiếu `ALLOWED_ORIGINS`.
- **P8.4 Ngũ Hành UI & Visualization:** 4 UI components mới (`NguHanhVerdictBadge`, `NguHanhElementBadge`, `NguHanhObjectCard`, `NguHanhAssessmentPanel`) tích hợp additive vào modal báo cáo, properties panel và audit panel.
- **P8-M0 → P8-M3 Ngũ Hành Rule Engine:** Ánh xạ 4 nhóm thuộc tính (Màu sắc, Vật liệu, Hình khối, Phương vị), 7 quy tắc quan hệ sinh khắc và bộ máy diễn giải ngôn ngữ tự nhiên 9 trường thông tin.

### Đã Bảo Toàn (Preserved Invariants)
- **Master Preset:** Mặc định $51/100$, sau tối ưu $89/100$, điểm giường $30/100$, bàn $92/100$, lưu thông $70/100$ bất biến.
- **P5 `overallScore`:** Bảo toàn cách tính điểm phong thủy chuẩn hóa, không phụ thuộc AI.
- **`overallHarmonyScore`:** Tuyệt đối giữ `null` / `undefined`, không ép điểm số giả.
- **Proposal Confirm Gate:** Bắt buộc 2-turn confirmation trước khi ghi vào Scene 3D.
- **Thuật toán Cổ thư:** Bát Trạch Lữ Tài, 60 Hoa Giáp, Nạp Âm giữ nguyên 100%.
- **Zero Reverse Imports:** Cách ly sạch sẽ module `nguHanh/` khỏi các module P0–P7.5.

---

## [v0.8.4] — 2026-11-13 (Phase P8.4 Ngũ Hành UI Integration)
- Tích hợp 4 UI components hiển thị phân tích Ngũ Hành.
- Hoàn thành 25 test cases UI integration (48 assertions PASS).
- Thêm cảnh báo Heuristic Disclaimer cho các luật tương tác màu sắc/vật liệu.

## [v0.8.3] — 2026-11-13 (Phase P8-M3 Assessment & Explainer Engine)
- Bộ máy đánh giá tổng hợp phòng và đồ vật theo Ngũ Hành.
- Trình tạo giải trình tự nhiên 9 thành phần bắt buộc.
- 182 assertions PASS.

## [v0.8.2] — 2026-11-12 (Phase P8-M2 Relationship Rule Engine)
- Triển khai 7 quy tắc phong thủy Ngũ Hành cổ truyền (Sinh, Khắc, Tỷ Hòa, Tiết Khí).
- 103 assertions PASS.

## [v0.8.1] — 2026-11-12 (Phase P8-M1 Element Mapping Engine)
- Ánh xạ Màu sắc (RGB Hex chuẩn), Vật liệu, Hình khối, Phương vị.
- Chuẩn hóa 4 trạng thái dữ liệu `ElementDataStatus`: `known`, `ambiguous`, `insufficient`, `unsupported`.

## [v0.8.0] — 2026-11-12 (Phase P8-M0 Architecture Foundation)
- Thiết lập thư mục `src/engine/core/nguHanh/` và `elementTypes.ts`.
- Đăng ký 6 thư mục nguồn cổ thư và tiêu chuẩn mới trong Source Registry.
- 27 assertions Architecture Guard PASS.

## [v0.7.5] — 2026-11-12 (Phase P7.5 Hash, Concurrency & E2E)
- Hash Scene 3D chống xung đột phiên làm việc và chống áp dụng đề xuất cũ.
- Concurrency Lock ngăn chặn tranh chấp thực thi đồng thời proposal.
- Kiểm thử E2E Playwright trên 7 kịch bản người dùng thật.

## [v0.7.0] — 2026-11-11 (Phase P7 Unified Gemini Agent Execution)
- Tích hợp Agent Google Gemini điều khiển mô hình 3D.
- Cơ chế Ghost Preview và Proposal Confirm Gate 2-turn.
- Transaction Manager với khả năng Undo/Redo và Rollback tự động khi vi phạm an toàn.

## [v0.6.0] — 2026-11-11 (Phase P6 Environmental & Ergonomics)
- Đánh giá thông gió tự nhiên, chiếu sáng tự nhiên và hành lang lưu thông theo TCVN 4451:2012.

## [v0.5.0] — 2026-11-11 (Phase P5 Unified Assessment Report)
- Báo cáo đánh giá phong thủy tổng hợp, phân loại cát/hung, tính điểm `overallScore`.

## [v0.4.0] — 2026-11-10 (Phase P4 Personal Assessment & Bát Trạch)
- Bản mệnh gia chủ, Cung phi quái mệnh, phân chia Đông Tứ Mệnh / Tây Tứ Mệnh, 60 Can Chi Nạp Âm.

## [v0.3.0] — 2026-11-10 (Phase P3 Furniture Feng Shui Rules)
- Quy tắc bố trí đồ vật nội thất (Loan Đầu hình thế, xung sát, tựa tường, tránh cửa).

## [v0.2.0] — 2026-11-10 (Phase P2 Room Layout & Sector Engine)
- Mô hình không gian phòng đa giác, phân chia 8 cung Bát Trạch và Trung Cung.

## [v0.1.0] — 2026-11-10 (Phase P1 Spatial Coordinate & Orientation)
- Hệ tọa độ 3D, chuẩn hóa góc quay la bàn số, va chạm OBB SAT V2.

## [v0.0.1] — 2026-11-09 (Phase P0 Characterization Baseline)
- Nghiệm thu hiện trạng, Master Preset 89/51, xác lập baseline bất biến.
