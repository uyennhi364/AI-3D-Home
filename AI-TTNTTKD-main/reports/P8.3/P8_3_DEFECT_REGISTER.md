# SỔ THEO DÕI VÀ XỬ LÝ KHUYẾT TẬT (DEFECT REGISTER)
## PHASE P8.3: REAL-WORLD VALIDATION & TARGETED REMEDIATION
**Dự án:** AI Feng Shui Studio  
**Phiên bản đối soát:** v1.0.0-p8.3  
**Cập nhật lần cuối:** 12/11/2026  
**Đơn vị thực hiện:** Independent QA Auditor & Architecture Review Board  

---

## 1. TỔNG QUAN TÌNH TRẠNG KHUYẾT TẬT (DEFECT SUMMARY)

Trong đợt thẩm định độc lập P8.3, 2 Finding chính đã được phân loại và theo dõi:

| Mã Finding | Phân loại | Mức độ nghiêm trọng | Trạng thái ban đầu | Trạng thái hiện tại | Biện pháp xử lý |
|:---:|---|:---:|:---:|:---:|---|
| **NLU-01** | Cấu trúc phản hồi NLU Offline Fallback | Medium | ⚠️ **PARTIAL** (8/30 ca) | ✅ **RESOLVED** (30/30 PASS) | Bổ sung cờ cấu trúc JSON (`clarificationDetected`, `requiresTargetClarification`, `possibleTargets`, `proposalDetected`, `awaitingConfirmation`) và mở rộng nhận diện lệnh mờ |
| **GEMINI-01** | Xác thực Mạng Sống Gemini Live API | High | ⚠️ **PARTIAL** | ❓ **NOT VERIFIED** | Môi trường test không có API Key / quota thật. Ghi nhận trung thực NOT VERIFIED; lập tài liệu hướng dẫn kiểm chứng Live thủ công |

---

## 2. CHI TIẾT TỪNG DEFECT VÀ QUÁ TRÌNH REMEDIATION

### DEFECT NLU-01: Offline Clarification & Proposal Structure
- **Vị trí phát hiện:** `tests/pilot_phase_b_nlu.ts`
- **Nguyên nhân gốc rễ:**
  1. `B-05` ("Tôi muốn chuyển giường sang trái 50cm."): Biểu thức chính quy ở `handleLocalAIChat` chỉ nhận `di chuyển` mà bỏ sót động từ đơn `chuyển`.
  2. `B-07` ("Đưa nó sang bên trái."): Động từ `đưa` và đại từ mơ hồ `nó` không được bắt vào nhánh yêu cầu làm rõ, bị rớt xuống generic chat mà không có cờ `requiresTargetClarification: true`.
  3. `B-08` ("Xóa cái đó đi."): Khi không xác định được đối tượng ngữ cảnh, hàm trả về chuỗi text nhưng thiếu cờ cấu trúc `requiresTargetClarification: true` và `clarificationDetected: true`.
  4. `B-11` ("Giữ nguyên giường, chỉ thay đổi vị trí bàn."): Bộ tách vế `keepMatch` tách cụm giữ nguyên nhưng `detectObjectTypeFromText` trả về type `table` trong khi đồ vật phòng mẫu là type `desk`, dẫn đến không tìm thấy target và thiếu cờ proposal.
  5. `B-16` ("Đặt giường ở góc tốt nhất cho tuổi Tý."): Lệnh đặt đồ vật theo phong thủy chưa được phân nhánh sang cấu trúc Proposal.
  6. `B-17` ("Xóa tất cả đồ nội thất trong phòng."): Lệnh xóa hàng loạt (mass deletion) chưa có nhánh đề xuất xác nhận trước khi xóa toàn bộ.
  7. `B-18` ("Tôi muốn đặt giường ở giữa phòng và cũng sát tường."): Ràng buộc hình học mâu thuẫn rơi vào chat chung, thiếu cờ làm rõ.
  8. `B-30` ("aaabbbccc 123 !@# không hiểu gì cả"): Chuỗi nhiễu/vô nghĩa (gibberish) không được phân loại sang nhánh yêu cầu làm rõ.

- **Giải pháp khắc phục:**
  - Cập nhật `handleLocalAIChat` trong `server.ts`:
    - Thêm kiểm tra ràng buộc mâu thuẫn hình học với cờ `requiresTargetClarification: true`, `clarificationDetected: true`, `proposalDetected: false`.
    - Thêm kiểm tra chuỗi vô nghĩa/nhiễu (gibberish/confusion) trả về thông báo yêu cầu gia chủ mô tả cụ thể.
    - Mở rộng regex di chuyển/sắp xếp: `/(?:di\s*)?chuyển|kê|dời|dịch|điều\s*chỉnh|đưa|đặt|thay\s*đổi\s*vị\s*trí|đổi\s*vị\s*trí/i`.
    - Bổ sung cấu trúc làm rõ mục tiêu khi `!targetObj`: trả về `requiresTargetClarification: true`, `clarificationDetected: true`, `possibleTargets: objects.map(o => o.name)`.
    - Hỗ trợ bắt "bàn" linh hoạt map với cả `desk` và `table`.
    - Hỗ trợ đề xuất đặt đồ theo cát vị phong thủy (`isFengShuiPlacement`) và ràng buộc giữ nguyên (`isConstraintMove`).
    - Hỗ trợ đề xuất xóa toàn bộ đồ nội thất với cổng xác nhận an toàn (`isDeleteAll`, `awaitingConfirmation: true`).

- **Bằng chứng kiểm chứng sau sửa:**
  - `tests/pilot_phase_b_nlu.ts`: **30 PASS | 0 PARTIAL | 0 FAIL | 0 BLOCKED**.
  - Không có bất kỳ vi phạm nào về việc đột biến Scene 3D không qua xác nhận.

---

### DEFECT GEMINI-01: Live Network Validation
- **Phân loại:** Integration / Live Service Verification.
- **Hiện trạng:**
  - Môi trường kiểm thử chạy không có `GEMINI_API_KEY` hợp lệ (biến môi trường rỗng hoặc mặc định).
  - Hệ thống tự động chuyển sang chế độ Offline Fallback an toàn (100% Scene Immutability verified).
- **Quy tắc đạo đức kiểm thử (AGENTS.md & QA Guidelines):**
  - **TUYỆT ĐỐI KHÔNG SỬ DỤNG MOCK ĐỂ TUYÊN BỐ LIVE PASS.**
  - Không giả lập kết quả cuộc gọi mạng sống khi không có kết nối thật.
- **Kết luận:** **NOT VERIFIED**.
- **Hướng dẫn kiểm chứng thủ công:** Được nêu chi tiết tại `reports/P8.3/P8_3_FALLBACK_VALIDATION_REPORT.md`.

---

## 3. BẢO TOÀN KIẾN TRÚC VÀ KHÔNG GÂY REGRESSION

Mọi sửa đổi trong quá trình xử lý khuyết tật đều được kiểm soát nghiêm ngặt theo các nguyên tắc bất biến:
1. **Thuật toán Phong Thủy Bát Trạch, Cung phi quái mệnh, Nạp Âm:** Không thay đổi (invariance test PASS).
2. **Master Preset Benchmark:** $89/51$ điểm chuẩn bảo toàn 100%.
3. **Regression Test Suites:** 14/14 suites PASS (441-442 PASS, 46 RECORDED, 0 FAIL).
4. **TypeScript Safety:** `npx tsc --noEmit` đạt 0 lỗi biên dịch.

---

## 4. ĐỐI SOÁT VÀ GIẢI TRÌNH CHÊNH LỆCH SỐ LIỆU REGRESSION (REGRESSION RECONCILIATION)

Trong các tài liệu đối soát kiểm toán có sự xuất hiện của các con số:
- **Baseline P8.2:** 442 PASS / 46 RECORDED
- **Báo cáo nghiệm thu trước:** 448 PASS / 50 RECORDED
- **Báo cáo hiện tại (Thực tế thực thi):** 441 (442) PASS / 46 RECORDED

### 4.1. Bảng Chi Tiết Kết Quả Thực Tế 14 Suites (`tests/run_all_tests.ts`)
| STT | Tên Suite Kiểm Thử | Tệp thực thi | PASS | RECORDED | Ghi chú |
|:---:|---|---|:---:|:---:|---|
| 1 | P0 Characterization Baseline | `tests/p0_characterization_baseline.ts` | 4 | 12 | Baseline Quái số, OBB, Master Preset |
| 2 | Phase H Intent Guard | `tests/phase_h_intent_guard.test.ts` | 17 | 0 | Chặn đột biến 3D với câu hỏi lý thuyết |
| 3 | Express Server Integration | `tests/integration_server_pipeline.test.ts` | 10 | 0 | Pipeline HTTP /api/chat (INT-01..10) |
| 4 | P1 Spatial Coordinate | `tests/p1_spatial_orientation.test.ts` | 13 | 0 | Chuẩn hóa góc quay, tọa độ 3D |
| 5 | P2 Room Layout & Sector | `tests/p2_room_layout_sector.test.ts` | 53 | 0 | 8 hướng Bát Trạch, tâm phòng |
| 6 | P3 Furniture Feng Shui Rules | `tests/p3_furniture_rules.test.ts` | 26 | 0 | Loan Đầu & Bát Trạch |
| 7 | P4 Personal Assessment | `tests/p4_personal_house_room.test.ts` | 38 | 0 | Quái mệnh gia chủ, Nạp Âm Can Chi |
| 8 | P5 Unified Report | `tests/p5_assessment_report.test.ts` | 19 | 0 | Báo cáo phong thủy hợp nhất |
| 9 | P6 Environmental Engine | `tests/p6_environmental_ergonomics.test.ts` | 70 | 15 | Chiếu sáng, thông gió TCVN 4451 |
| 10 | P7 Agent Safe Execution | `tests/p7_agent_execution.test.ts` | 100 | 11 | Điều khiển 3D an toàn, Proposal Gate |
| 11 | P7.5 Targeted Verification | `tests/p7_5_targeted_verification.test.ts` | 19 | 2 | Scene Hash V2 & Concurrency Lock |
| 12 | P7.5 Playwright Browser E2E | `tests/p7_5_e2e_scenarios.test.ts` | 16 | 2 | 7 kịch bản E2E trên Chromium thật |
| 13 | Pilot-01 Defect Remediation | `tests/p1_defect_remediation.test.ts` | 34 | 0 | Sửa lỗi BUG-P1-01, BUG-P1-02 |
| 14 | P8.2 Production Readiness | `tests/p8_2_production_readiness.test.ts` | 22 | 4 | ESM, Helmet, 2MB limit, Three.js disposal |
| **Tổng** | **14 Regression Suites** | **`tests/run_all_tests.ts`** | **441 (442\*)** | **46** | **0 FAIL (100% PASS)** |

*\*Ghi chú:* Khi tính thêm assertion kiểm tra vòng đời server test cục bộ trong Suite 3, tổng PASS là 442.

### 4.2. Giải Trình Nguồn Gốc Chênh Lệch
1. **Nguồn gốc số liệu 448 PASS / 50 RECORDED:**
   - Trong báo cáo nghiệm thu trước, người lập báo cáo đã gộp nhầm 6 ca kiểm thử bổ sung vào tổng số của Regression Suite:
     $$442\ \text{PASS} + 6\ \text{assertions} = 448\ \text{PASS}$$
   - Đồng thời, 4 quan sát dạng RECORDED từ `p8_2_production_readiness` bị cộng dồn hai lần vào nhóm quan sát:
     $$46\ \text{RECORDED} + 4 = 50\ \text{RECORDED}$$
2. **Nguồn gốc số liệu 448 PASS / 46 RECORDED:**
   - Báo cáo cập nhật sau đó đã sửa lại số RECORDED về đúng giá trị thực 46, nhưng vẫn giữ nguyên con số 448 do chưa tách bạch giữa các bộ kiểm thử độc lập (Pilot Phase B, C, D) và bộ Regression 14 Suites.
3. **Kết luận chuẩn hóa số liệu:**
   - **Bộ Regression 14 Suites (`run_all_tests.ts`):** Chuẩn xác tuyệt đối là **442 PASS, 46 RECORDED, 0 FAIL** (trong đó 441 test cases chính thức + 1 server lifecycle assertion).
   - **Các bộ kiểm thử Pilot độc lập (không tính trùng vào Regression):**
     - `pilot_phase_b_nlu.ts`: 30 PASS | 0 PARTIAL | 0 FAIL
     - `pilot_phase_c_assessment.ts`: 20 PASS | 0 FAIL
     - `pilot_phase_d_proposals.ts`: 10 PASS | 0 FAIL


