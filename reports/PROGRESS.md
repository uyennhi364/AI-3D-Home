# TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)
## DỰ ÁN: AI FENG SHUI STUDIO
**Tệp trạng thái đồng bộ:** `reports/PROGRESS.md`  
**Cập nhật lần cuối:** 12/11/2026 16:25  

---

## 1. TRẠNG THÁI HIỆN TẠI (CURRENT STATUS)

- **Current Phase:** **P8.3 — REAL-WORLD VALIDATION & TARGETED REMEDIATION**
- **Trạng thái thẩm định QA:** ⚠️ **VERIFIED PARTIAL** (8/9 nhóm PASS, 1 nhóm NOT VERIFIED)
- **Trạng thái Phase P8.4:** 🔒 **LOCKED (Tiếp tục bị khóa — Chưa mở khóa)**
- **Baseline Architecture:** P0–P7.5 Frozen Architecture (Master Preset 89/51, Invariance PASS)
- **Production Readiness Version:** v1.0.0-p8.3

---

## 2. BẢNG THEO DÕI TIẾN ĐỘ CÁC GIAI ĐOẠN

| Phase | Tên giai đoạn | Trọng tâm kiểm thử | Trạng thái |
|:---:|---|---|:---:|
| **P0** | Characterization Baseline | Quái số, hướng đầu giường, OBB SAT, Master Preset $89/51$ | ✅ HOÀN THÀNH |
| **P1** | Spatial Coordinate & Orientation | Tọa độ 3D, chuẩn hóa góc quay la-tinh/Việt, OBB collision V2 | ✅ HOÀN THÀNH |
| **P2** | Room Layout & Sector Engine | Phân cung Bát Trạch 8 hướng, tâm phòng, ranh giới hình học | ✅ HOÀN THÀNH |
| **P3** | Furniture Feng Shui Rules | Bộ quy tắc Loan Đầu & Bát Trạch, khoảng cách công thái học | ✅ HOÀN THÀNH |
| **P4** | Personal & House/Room Assessment | Đánh giá gia chủ, phối hợp bản mệnh và hướng phòng | ✅ HOÀN THÀNH |
| **P5** | Unified Assessment Report | Báo cáo phong thủy chuẩn hóa, phân loại cát/hung | ✅ HOÀN THÀNH |
| **P6** | Environmental & Ergonomics | Tiêu chuẩn chiếu sáng, thông gió TCVN 4451:2012, công thái học | ✅ HOÀN THÀNH |
| **P7** | Unified Gemini Agent Execution | Agent hợp nhất điều khiển 3D an toàn, NLU, Proposal confirm gate | ✅ HOÀN THÀNH |
| **P7.5** | Hash, Concurrency & E2E Validation | Hashing Scene, Race condition lock, Playwright E2E 7 scenarios | ✅ HOÀN THÀNH |
| **Pilot-01** | Defect Remediation & Reconciliation | Sửa BUG-P1-01, BUG-P1-02, đạt điểm nghiệm thu Pilot 94.83/100 | ✅ HOÀN THÀNH |
| **P8.1** | Production & Architecture Audit | Kiểm toán 8 domain, lập hồ sơ 5 tài liệu, xác định 9 findings | ✅ HOÀN THÀNH |
| **P8.2** | Production Remediation & Hardening | Sửa Native ESM (`esbuild`), Rate limiting, Helmet CSP, 2MB limit, Three.js VRAM disposal, SessionStorage key | ✅ HOÀN THÀNH |
| **P8.3** | Real-world Validation & Acceptance | Kiểm chứng 9 nhóm chỉ tiêu: Real Feng Shui, NLU (30/30 PASS), Fallback, 7 User Journeys E2E | ⚠️ **VERIFIED PARTIAL** |

---

## 3. CHI TIẾT ĐỐI SOÁT 9 NHÓM CHỈ TIÊU P8.3

| Nhóm Chỉ Tiêu P8.3 | Số lượng ca kiểm thử | Kết quả đạt được | Trạng thái |
|---|:---:|---|:---:|
| **1. Real-world Feng Shui Scenarios** | 20 kịch bản phòng | 20/20 PASS | ✅ **PASS** |
| **2. Vietnamese NLU Robustness** | 30 prompts | 30/30 PASS (0 PARTIAL, 0 FAIL) | ✅ **PASS** |
| **3. Personal Feng Shui** | 48 tests + 10 ca biên | 48/48 PASS | ✅ **PASS** |
| **4. Environmental Assessment** | 70 tests | 70/70 PASS | ✅ **PASS** |
| **5. Full Proposal Lifecycle** | 10 kịch bản + 19 tests | 10/10 PASS, 19/19 PASS | ✅ **PASS** |
| **6. Gemini Failure & Fallback** | 10 tests + E2E S7 | Chế độ Offline bảo vệ Scene 100% (PASS); Live API: Chưa có Live Key trong test | ⚠️ **PARTIAL** |
| **7. 6 Complete User Journeys** | 7 kịch bản E2E Playwright | 7/7 PASS (Chromium thật, 16/16 checks) | ✅ **PASS** |
| **8. Input Validation & Edge Constraints**| 39 tests | 39/39 PASS | ✅ **PASS** |
| **9. UX Validation & Rendering** | 16 E2E checks | 16/16 PASS (Độ trễ < 15ms) | ✅ **PASS** |

---

## 4. TÌNH HÌNH XỬ LÝ KHUYẾT TẬT TARGETED REMEDIATION

1. [x] **Khắc phục 8 ca PARTIAL trong `pilot_phase_b_nlu.ts` (NLU-01):**
   - Đã xử lý thành công `B-05`, `B-07`, `B-08`, `B-11`, `B-16`, `B-17`, `B-18`, `B-30`.
   - Kết quả: **30/30 PASS (100%)**. Scene 3D được bảo vệ tuyệt đối không ghi đè trực tiếp.
2. [x] **Xác thực Mạng Sống Gemini API (GEMINI-01):**
   - Không có API Key có quota thực trong môi trường sandbox tự động (`API_KEY_PRESENT: false`).
   - Ghi nhận trung thực: **NOT VERIFIED**. Không dùng Mock để giả mạo PASS.
   - Đã lập Runbook hướng dẫn kiểm chứng thủ công trong `reports/P8.3/P8_3_FALLBACK_VALIDATION_REPORT.md`.
3. [x] **Đối Soát Chênh Lệch Số Liệu Regression:**
   - Chuẩn hóa: **442 PASS / 46 RECORDED / 0 FAIL** cho 14 Regression Suites (`tests/run_all_tests.ts`).
   - Số liệu 448 PASS / 50 RECORDED trước đây xuất phát từ việc tính gộp 6 assertions Pilot độc lập và tính trùng 4 quan sát RECORDED.

---

## 5. HÀNH ĐỘNG TIẾP THEO (NEXT ACTION)

- **Không triển khai Phase P8.4.** Không triển khai Production.
- Phase P8.4 tiếp tục bị khóa (LOCKED) theo quy chuẩn an toàn cho đến khi có phê duyệt nghiệm thu Live API chính thức từ người dùng.

---

## 6. RÀNG BUỘC KIẾN TRÚC BẤT BIẾN (NON-NEGOTIABLE ARCHITECTURE)

1. Giữ nguyên 100% các công thức Bát Trạch Lữ Tài, Cung phi quái mệnh, Nạp Âm Lục Thập Hoa Giáp.
2. Giữ nguyên điểm số chuẩn Master Preset $89/51$.
3. Không tự ý sửa expected values để biến FAIL thành PASS.
4. Mọi đề xuất (Proposal) phải qua Confirm Gate trước khi tác động vào Scene 3D.
5. Không tự ý triển khai Production nếu chưa có phê duyệt chính thức.
