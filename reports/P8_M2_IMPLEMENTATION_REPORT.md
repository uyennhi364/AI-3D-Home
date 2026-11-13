# BÁO CÁO NGHIỆM THU CHI TIẾT PHASE P8-M2
## FIVE ELEMENTS (NGŨ HÀNH) RELATIONSHIP & RULE ENGINE

**Dự án:** AI Feng Shui Studio  
**Phiên bản hệ thống:** v1.0.0-p8.2  
**Baseline:** v1.0.0-p7.5 + P8-M0 (Foundation & Registry) + P8-M1 (Mapping Engine)  
**Kiến trúc tham chiếu:** P8 Architecture Specification V1.1 & P8 Test Plan V1.1  
**Ngày lập báo cáo:** 13/11/2026  
**Trạng thái:** HOÀN TẤT TRIỂN KHAI & ĐÃ KIỂM ĐỊNH TOÀN DIỆN (CHỜ NGHIỆM THU CHÍNH THỨC)  

---

## 1. TỔNG QUAN PHẠM VI TRIỂN KHAI P8-M2

Milestone **P8-M2** được phân công triển khai 2 động cơ lõi của phân hệ Ngũ Hành:
1. **Relationship Engine (`src/engine/core/nguHanh/elementRelationship.ts`):** 
   - Động cơ xử lý quan hệ Ngũ Hành có hướng (directional relationships) giữa 5 hành (Kim, Mộc, Thủy, Hỏa, Thổ).
   - Tính toán chỉ số hòa hợp trực quan **Heuristic HarmonyScore (0.0 – 1.0)** phục vụ giao diện người dùng, tuyệt đối độc lập và không can thiệp vào `overallScore` P5.
2. **Rule Engine (`src/engine/core/nguHanh/elementRuleEngine.ts`):**
   - Triển khai đầy đủ **7 quy tắc Ngũ Hành cốt lõi** (`NH-COLOR-01`, `NH-COLOR-02`, `NH-MAT-01`, `NH-MAT-02`, `NH-SHAPE-01`, `NH-DIR-01`, `NH-ROOM-01`).
   - Cung cấp pipeline phân tích đa thuộc tính nội thất độc lập (`evaluateFurnitureElementRules`).
   - Tuân thủ 100% khế ước dữ liệu `RuleResult` chính quy từ `ruleTypes.ts`.

---

## 2. DANH SÁCH FILE ĐÃ TẠO MỚI VÀ CHỈNH SỬA

### A. Tệp Tin Tạo Mới
1. `src/engine/core/nguHanh/elementRelationship.ts`:
   - Hàm `getElementRelationship(source, target): ElementRelationType`
   - Hàm `getElementHarmonyScore(source, target): number`
   - Hàm `analyzeElementRelationship(source, target): ElementRelationResult`
   - Các hằng số: `GENERATION_CYCLE`, `OVERCOMING_CYCLE`, `HARMONY_SCORE_TABLE`, `RELATION_LABELS`, `HARMONY_SCORE_DISCLAIMER`.
2. `src/engine/core/nguHanh/elementRuleEngine.ts`:
   - 7 hàm đánh giá quy tắc: `evaluateRuleNhColor01`, `evaluateRuleNhColor02`, `evaluateRuleNhMat01`, `evaluateRuleNhMat02`, `evaluateRuleNhShape01`, `evaluateRuleNhDir01`, `evaluateRuleNhRoom01`.
   - Pipeline phân tích đa thuộc tính: `evaluateFurnitureElementRules`.
   - Interface mở rộng: `ElementRuleResult extends RuleResult`.
3. `tests/p8_m2_relationship_rule_engine.test.ts`:
   - Toàn bộ kịch bản kiểm thử tự động cho P8-M2 (57 Test Cases, 103 Assertions).
4. `reports/P8_M2_IMPLEMENTATION_REPORT.md`:
   - Báo cáo nghiệm thu chi tiết này.

*(Lưu ý: Các tệp trên đều được đồng bộ song song tại cả thư mục gốc và thư mục làm việc `AI-TTNTTKD-main/`).*

### B. Tệp Tin Chỉnh Sửa
1. `reports/PROGRESS.md`: Cập nhật tiến độ hoàn thành P8-M2 và ghi nhận trạng thái Stop Condition.
2. *Không sửa đổi bất kỳ tệp tin logic tính toán nào thuộc nền tảng P0–P7.5 Frozen Architecture.*

---

## 3. XÁC NHẬN TÍNH NHẤT QUÁN SOURCE / TARGET TRONG RELATIONSHIP VÀ RULE ENGINE

Để bảo đảm tính toán chính xác và nhất quán, ngữ nghĩa của `source` và `target` được định nghĩa thống nhất xuyên suốt hệ thống:

- **`source` (Chủ thể / Hệ quy chiếu gốc):** Luôn đại diện cho **Bản mệnh của gia chủ (`personalElement`)**.
- **`target` (Khách thể / Đối tượng được đánh giá):** Luôn đại diện cho **Hành của thuộc tính đồ vật hoặc không gian (`attributeElement`: màu sắc, vật liệu, hình dạng, phương vị)**.

### Chiều Quan Hệ & Ý Nghĩa Phong Thủy:
| Quan Hệ | Định Nghĩa Hướng | Chiều Khí Trường | Ý Nghĩa Thực Tế Đối Với Gia Chủ | Verdict Tương Ứng |
|---|---|---|---|:---:|
| **`SAME`** | `source === target` | Đồng hành | Cùng hành, tương hòa, củng cố bản khí ổn định. | `pass` (info) |
| **`GENERATED_BY`** | `target sinh source` | Sinh nhập | Đồ vật sinh dưỡng bản mệnh gia chủ, thu hút vượng khí. | `pass` (info) |
| **`GENERATES`** | `source sinh target` | Sinh xuất | Bản mệnh gia chủ sinh cho đồ vật, luân chuyển năng lượng thuận hòa. | `pass` (info) |
| **`OVERCOMES`** | `source khắc target` | Khắc xuất | Bản mệnh gia chủ khắc chế đồ vật, tiêu hao năng lượng áp chế. | `warn` (minor) |
| **`OVERCOME_BY`** | `target khắc source` | Khắc nhập | Đồ vật khắc chế trực tiếp bản mệnh gia chủ, gây áp lực xung hại. | `fail` (major) |
| **`UNKNOWN`** | Khuyết một hoặc cả hai | Chưa xác định | Thiếu dữ liệu đầu vào hoặc thuộc tính đa nghĩa. | `unknown` |

Toàn bộ 7 hàm đánh giá trong `elementRuleEngine.ts` đều gọi `getElementRelationship(personalElement, attributeElement)`, bảo đảm 100% tính nhất quán.

---

## 4. CHI TIẾT 7 QUY TẮC NGŨ HÀNH (7 CORE RULES)

### 4.1. `NH-COLOR-01`: Màu Sắc Nội Thất Hỗ Trợ / Đồng Hành Bản Mệnh
- **Mục tiêu:** Phát hiện và xác nhận các màu sắc tương sinh hoặc đồng hành với bản mệnh của gia chủ.
- **Đầu vào:** `furniture: RoomObject`, `personalElement: NguHanhElement | null`, `colorAnalysis?: ElementAnalysisResult`.
- **Logic đánh giá:**
  - Nếu `personalElement === null` $\to$ `verdict: 'unknown'`, `dataStatus: 'insufficient'`.
  - Nếu `colorAnalysis.dataStatus !== 'known'` $\to$ `verdict: 'unknown'` (giữ nguyên dataStatus `ambiguous`, `insufficient`, `unsupported`).
  - Khi đã xác định hành màu sắc:
    - `rel === 'SAME'`: Màu sắc đồng hành củng cố bản mệnh $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - `rel === 'GENERATED_BY'`: Màu sắc tương sinh nhập dưỡng bản mệnh $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - `rel === 'GENERATES'`: Màu sắc tương sinh xuất thuận chiều $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - `rel === 'OVERCOME_BY'` hoặc `'OVERCOMES'`: Không thuộc nhóm hỗ trợ $\to$ `verdict: 'warn'`, `severity: 'minor'` (nội dung xung khắc chuyển giao cho `NH-COLOR-02` kiểm soát chuyên biệt).
- **Độ tin cậy & Nguồn:** `certainty: 'applied'` (hoặc `'classical'`), Nguồn: `SRC-NGU-HANH-DAI-NGHIA`, `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI`.

### 4.2. `NH-COLOR-02`: Màu Sắc Nội Thất Tương Khắc Bản Mệnh
- **Mục tiêu:** Phát hiện sự xung khắc giữa màu sắc đồ vật và bản mệnh gia chủ, phân biệt rõ Khắc nhập và Khắc xuất.
- **Đầu vào:** `furniture: RoomObject`, `personalElement: NguHanhElement | null`.
- **Logic đánh giá:**
  - Nếu thiếu bản mệnh hoặc màu không `known` $\to$ `verdict: 'unknown'`.
  - Khi đã xác định hành màu sắc:
    - `rel === 'OVERCOME_BY'` (Khắc nhập): Màu sắc khắc bản mệnh (ví dụ: mệnh Kim dùng bàn màu Đỏ thuộc Hỏa) $\to$ `verdict: 'fail'`, `severity: 'major'`. Gợi ý hóa giải (`remedy`).
    - `rel === 'OVERCOMES'` (Khắc xuất): Bản mệnh khắc màu sắc (ví dụ: mệnh Kim dùng bàn màu Xanh lục thuộc Mộc) $\to$ `verdict: 'warn'`, `severity: 'minor'`.
    - `rel` thuộc `SAME`, `GENERATES`, `GENERATED_BY` $\to$ `verdict: 'pass'`, `severity: 'info'` (không phát hiện xung khắc theo tiêu chí của rule).
- **Độ tin cậy & Nguồn:** `certainty: 'classical'`, Nguồn: `SRC-NGU-HANH-DAI-NGHIA`.

### 4.3. `NH-MAT-01`: Vật Liệu Nội Thất Chính Hỗ Trợ Bản Mệnh
- **Mục tiêu:** Đánh giá tính tương sinh/đồng hành của vật liệu cấu tạo nên các món đồ nội thất thiết yếu.
- **Phạm vi áp dụng:** Bắt buộc áp dụng cho đồ vật chính: `['bed', 'desk', 'wardrobe']`. Các vật thể khác (`window`, `door`, `chair`, `mirror`) trả về `verdict: 'n/a'`, `dataStatus: 'not_applicable'`.
- **Logic đánh giá:**
  - `personalElement === null` $\to$ `verdict: 'unknown'`, `dataStatus: 'insufficient'`.
  - Vật liệu tổng hợp đa nghĩa (`plastic`, `pvc`, `glass`, `leather`) $\to$ `dataStatus: 'ambiguous'`, `verdict: 'unknown'` (tuyệt đối không ép buộc phân loại).
  - Khi vật liệu `known`:
    - `rel` thuộc `SAME`, `GENERATED_BY`, `GENERATES` $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - `rel` thuộc `OVERCOME_BY`, `OVERCOMES` $\to$ `verdict: 'warn'`, `severity: 'minor'`.
- **Độ tin cậy & Nguồn:** `certainty: 'applied'` hoặc `'classical'`, Nguồn: `SRC-NGU-HANH-DAI-NGHIA`, `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI`.

### 4.4. `NH-MAT-02`: Vật Liệu Nội Thất Chính Xung Khắc Bản Mệnh
- **Mục tiêu:** Phát hiện vật liệu của các đồ vật chính xung khắc trực tiếp với bản mệnh gia chủ.
- **Phạm vi áp dụng:** `['bed', 'desk', 'wardrobe']`. Vật thể khác $\to$ `verdict: 'n/a'`.
- **Logic đánh giá:**
  - Vật liệu `ambiguous` hoặc `insufficient` $\to$ `verdict: 'unknown'`.
  - Khi vật liệu `known`:
    - `rel === 'OVERCOME_BY'` (ví dụ: mệnh Mộc dùng bàn khung sắt Kim) $\to$ `verdict: 'fail'`, `severity: 'major'`.
    - `rel === 'OVERCOMES'` $\to$ `verdict: 'warn'`, `severity: 'minor'`.
    - `rel` thuộc `SAME`, `GENERATES`, `GENERATED_BY` $\to$ `verdict: 'pass'`, `severity: 'info'`.
- **Độ tin cậy & Nguồn:** `certainty: 'classical'`, Nguồn: `SRC-NGU-HANH-DAI-NGHIA`.

### 4.5. `NH-SHAPE-01`: Hình Dạng Đồ Vật Theo Tỷ Lệ Hình Học 3D
- **Mục tiêu:** Phân loại và đánh giá tương tác hình thế hình học (từ kích thước bao OBB 3D) với bản mệnh.
- **Tái sử dụng:** Tái sử dụng kết quả `classifyShapeElement` từ Milestone P8-M1.
- **Ràng buộc bất biến:**
  - Bắt buộc `certainty: 'heuristic'`.
  - Bắt buộc đính kèm disclaimer: *"Phân loại hình dạng Ngũ Hành dựa trên tỷ lệ chiều kích là quy ước ứng dụng hiện đại, không phải nguyên lý cổ thư có ngưỡng định lượng."*
  - Không tự gán mapping hình dạng mới trong Rule Engine.
- **Logic đánh giá:**
  - Kích thước đồ vật thông dụng có tỷ lệ trung gian (như giường ngủ tiêu chuẩn $1.6 \times 0.9 \times 2.0\text{ m}$) $\to$ `shapeAnalysis.dataStatus: 'ambiguous'` $\to$ `verdict: 'unknown'` (không ép phán quyết).
  - Khi hình thế xác định (`known`): Trụ cao $\to$ Mộc; Dát mỏng/thấp $\to$ Thổ; Vuông cân $\to$ Kim.
    - `rel` thuộc `SAME`, `GENERATED_BY`, `GENERATES` $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - `rel === 'OVERCOME_BY'` $\to$ `verdict: 'fail'`, `severity: 'major'`.
    - `rel === 'OVERCOMES'` $\to$ `verdict: 'warn'`, `severity: 'minor'`.
- **Nguồn:** `SRC-HEURISTIC-SHAPE-DIMENSIONS`, `SRC-NGU-HANH-DAI-NGHIA`.

### 4.6. `NH-DIR-01`: Phương Vị Đặt Đồ Vật Theo Ngũ Hành
- **Mục tiêu:** Đánh giá phương vị đặt đồ vật (8 hướng la bàn và Trung cung) tương quan với bản mệnh.
- **Đặc điểm & Xử lý hướng:**
  - Hướng la bàn chuẩn hóa: $N \to$ Thủy; $E, SE \to$ Mộc; $S \to$ Hỏa; $SW, NE \to$ Thổ; $W, NW \to$ Kim.
  - Trung cung (`'center'`): Được xác định là hành Thổ độc lập theo cổ điển, không ép vào 8 hướng la bàn.
  - Trường hợp la bàn chưa hiệu chuẩn (`northBearingDeg === null`): Sử dụng Model North làm trục tham chiếu và **bắt buộc hiển thị cảnh báo/disclaimer**: *"La bàn chưa được hiệu chuẩn thực tế, phương vị dựa trên Model North."*
- **Logic đánh giá:**
  - `rel` thuộc `SAME`, `GENERATED_BY`, `GENERATES` $\to$ `verdict: 'pass'`, `severity: 'info'`.
  - `rel === 'OVERCOME_BY'` $\to$ `verdict: 'fail'`, `severity: 'major'`.
  - `rel === 'OVERCOMES'` $\to$ `verdict: 'warn'`, `severity: 'minor'`.
- **Độ tin cậy & Nguồn:** `certainty: 'classical'`, Nguồn: `SRC-NGU-HANH-DAI-NGHIA`.

### 4.7. `NH-ROOM-01`: Màu Sắc Tổng Thể Không Gian Phòng
- **Mục tiêu:** Đánh giá bề mặt màu sắc chủ đạo của phòng ngủ (`wallColor`, `floorColor`) đối với bản mệnh.
- **Xử lý thiếu dữ liệu:**
  - Khi cả `wallColor` và `floorColor` đều thiếu $\to$ `verdict: 'unknown'`, `dataStatus: 'insufficient'`, `missingInputs: ['wallColor', 'floorColor']`. Hệ thống giải trình rõ: *"Phòng chưa có dữ liệu màu tường hoặc màu sàn, không đủ cơ sở đánh giá Ngũ Hành tổng thể không gian."* (Tuyệt đối không tự suy đoán màu phòng).
- **Logic đánh giá khi có dữ liệu:**
  - Phân loại màu sắc bề mặt chủ đạo qua `classifyColorElement`.
  - So khớp hành bề mặt chủ đạo với `personalElement`:
    - Tương sinh hoặc đồng hành $\to$ `verdict: 'pass'`, `severity: 'info'`.
    - Khắc nhập (`OVERCOME_BY`) $\to$ `verdict: 'fail'`, `severity: 'major'`.
    - Khắc xuất (`OVERCOMES`) $\to$ `verdict: 'warn'`, `severity: 'minor'`.
- **Độ tin cậy & Nguồn:** `certainty: 'applied'` / `'classical'`, Nguồn: `SRC-NGU-HANH-DAI-NGHIA`, `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI`.

---

## 5. MA TRẬN ĐIỀU KIỆN PHÁN QUYẾT TỪNG RULE (VERDICT MATRIX)

Bảng ma trận chuẩn hóa điều kiện kích hoạt các trạng thái kết quả của toàn bộ 7 quy tắc:

| Rule ID | Điều kiện ra `PASS` | Điều kiện ra `WARN` | Điều kiện ra `FAIL` | Điều kiện ra `UNKNOWN` | Điều kiện ra `N/A` |
|---|---|---|---|---|---|
| **`NH-COLOR-01`** | Bản mệnh & Màu `known` AND `rel` $\in$ {`SAME`, `GENERATED_BY`, `GENERATES`} | Bản mệnh & Màu `known` AND `rel` $\in$ {`OVERCOMES`, `OVERCOME_BY`} (không sinh) | *(Không phán fail, nhường cho NH-COLOR-02)* | Thiếu bản mệnh HOẶC Màu $\in$ {`ambiguous`, `insufficient`, `unsupported`} | *(Không áp dụng)* |
| **`NH-COLOR-02`** | Bản mệnh & Màu `known` AND `rel` $\in$ {`SAME`, `GENERATED_BY`, `GENERATES`} (không khắc) | Bản mệnh & Màu `known` AND `rel === 'OVERCOMES'` (Khắc xuất) | Bản mệnh & Màu `known` AND `rel === 'OVERCOME_BY'` (Khắc nhập) | Thiếu bản mệnh HOẶC Màu $\in$ {`ambiguous`, `insufficient`, `unsupported`} | *(Không áp dụng)* |
| **`NH-MAT-01`** | Đồ vật chính AND Bản mệnh & Vật liệu `known` AND `rel` sinh/đồng hành | Đồ vật chính AND Bản mệnh & Vật liệu `known` AND `rel` không sinh | *(Không phán fail, nhường cho NH-MAT-02)* | Thiếu bản mệnh HOẶC Vật liệu $\in$ {`ambiguous`, `insufficient`, `unsupported`} | Đồ vật KHÔNG thuộc `['bed', 'desk', 'wardrobe']` |
| **`NH-MAT-02`** | Đồ vật chính AND Bản mệnh & Vật liệu `known` AND `rel` không khắc | Đồ vật chính AND Bản mệnh & Vật liệu `known` AND `rel === 'OVERCOMES'` | Đồ vật chính AND Bản mệnh & Vật liệu `known` AND `rel === 'OVERCOME_BY'` | Thiếu bản mệnh HOẶC Vật liệu $\in$ {`ambiguous`, `insufficient`, `unsupported`} | Đồ vật KHÔNG thuộc `['bed', 'desk', 'wardrobe']` |
| **`NH-SHAPE-01`** | Bản mệnh & Kích thước `known` AND `rel` sinh/đồng hành | Bản mệnh & Kích thước `known` AND `rel === 'OVERCOMES'` | Bản mệnh & Kích thước `known` AND `rel === 'OVERCOME_BY'` | Thiếu bản mệnh HOẶC Tỷ lệ OBB $\in$ {`ambiguous`, `insufficient`, `unsupported`} | *(Không áp dụng)* |
| **`NH-DIR-01`** | Bản mệnh & Hướng `known` AND `rel` sinh/đồng hành | Bản mệnh & Hướng `known` AND `rel === 'OVERCOMES'` | Bản mệnh & Hướng `known` AND `rel === 'OVERCOME_BY'` | Thiếu bản mệnh HOẶC Hướng $\in$ {`insufficient`, `unsupported`} | *(Không áp dụng)* |
| **`NH-ROOM-01`** | Bản mệnh & Màu phòng `known` AND `rel` sinh/đồng hành | Bản mệnh & Màu phòng `known` AND `rel === 'OVERCOMES'` | Bản mệnh & Màu phòng `known` AND `rel === 'OVERCOME_BY'` | Thiếu bản mệnh HOẶC Thiếu cả `wallColor` và `floorColor` | *(Không áp dụng)* |

---

## 6. KẾT QUẢ KIỂM THỬ: 57 TEST CASES & 103 ASSERTIONS

Bộ kiểm thử được phân bổ vào tệp `tests/p8_m2_relationship_rule_engine.test.ts` gồm 3 suite chính:

### 6.1. SUITE-NH-05: Relationship Matrix (25 Test Cases)
- `NH-REL-01` $\to$ `NH-REL-05`: Tương sinh thuận có hướng (`Kim sinh Thủy`, `Thủy sinh Mộc`, `Mộc sinh Hỏa`, `Hỏa sinh Thổ`, `Thổ sinh Kim`) $\to$ **5/5 PASS** (`GENERATES`, Score: 0.85).
- `NH-REL-06` $\to$ `NH-REL-10`: Tương sinh nghịch có hướng (`Thủy được Kim sinh`, `Mộc được Thủy sinh`, `Hỏa được Mộc sinh`, `Thổ được Hỏa sinh`, `Kim được Thổ sinh`) $\to$ **5/5 PASS** (`GENERATED_BY`, Score: 0.75).
- `NH-REL-11` $\to$ `NH-REL-15`: Tương khắc thuận có hướng (`Kim khắc Mộc`, `Mộc khắc Thổ`, `Thổ khắc Thủy`, `Thủy khắc Hỏa`, `Hỏa khắc Kim`) $\to$ **5/5 PASS** (`OVERCOMES`, Score: 0.20).
- `NH-REL-16` $\to$ `NH-REL-20`: Tương khắc nghịch có hướng (`Mộc bị Kim khắc`, `Thổ bị Mộc khắc`, `Thủy bị Thổ khắc`, `Hỏa bị Thủy khắc`, `Kim bị Hỏa khắc`) $\to$ **5/5 PASS** (`OVERCOME_BY`, Score: 0.25).
- `NH-REL-21` $\to$ `NH-REL-25`: Quan hệ đồng hành (`SAME`, Score: 0.90) và các trường hợp khuyết hành (`Mộc → null`, `null → Hỏa`, `null → null`, `'invalid' → Kim`) $\to$ **5/5 PASS** (`UNKNOWN`, Score: 0.50).
- **Kiểm tra HarmonyScore:** Xác minh đầy đủ 6 mức điểm heuristic và sự hiện diện của disclaimer bắt buộc $\to$ **PASS**.

### 6.2. SUITE-NH-06: Rule Engine (18 Test Cases)
- `NH-RULE-01` $\to$ `NH-RULE-03`: `NH-COLOR-01` với các quan hệ `SAME`, `GENERATED_BY`, `GENERATES` $\to$ **3/3 PASS** (`verdict: 'pass'`, `severity: 'info'`).
- `NH-RULE-04`: `NH-COLOR-02` phát hiện màu Đỏ khắc nhập mệnh Kim $\to$ **PASS** (`verdict: 'fail'`, `severity: 'major'`).
- `NH-RULE-05`: `NH-COLOR-02` phát hiện màu Xanh lục khắc xuất mệnh Kim $\to$ **PASS** (`verdict: 'warn'`, `severity: 'minor'`).
- `NH-RULE-06`: `NH-COLOR-01` với màu Xám (`ambiguous`) không ép phán quyết $\to$ **PASS** (`verdict: 'unknown'`).
- `NH-RULE-07`: `NH-COLOR-01` thiếu hồ sơ gia chủ $\to$ **PASS** (`verdict: 'unknown'`, `dataStatus: 'insufficient'`).
- `NH-RULE-08`: `NH-MAT-01` với bàn gỗ sồi (Mộc) hỗ trợ mệnh Mộc $\to$ **PASS** (`verdict: 'pass'`).
- `NH-RULE-09`: `NH-MAT-02` với bàn khung sắt (Kim) khắc nhập mệnh Mộc $\to$ **PASS** (`verdict: 'fail'`, `severity: 'major'`).
- `NH-RULE-10`: `NH-MAT-01` với tủ nhựa PVC (`ambiguous`) $\to$ **PASS** (`verdict: 'unknown'`).
- `NH-RULE-11`: `NH-MAT-01` với vật thể ghế (`chair`) ngoài danh mục bắt buộc $\to$ **PASS** (`verdict: 'n/a'`, `dataStatus: 'not_applicable'`).
- `NH-RULE-12`: `NH-SHAPE-01` với kệ sách trụ cao (hành Mộc) hỗ trợ mệnh Mộc $\to$ **PASS** (`verdict: 'pass'`, `certainty: 'heuristic'`).
- `NH-RULE-13`: `NH-SHAPE-01` với giường ngủ kích thước tiêu chuẩn (`ambiguous`) $\to$ **PASS** (`verdict: 'unknown'`).
- `NH-RULE-14`: `NH-DIR-01` hướng Bắc (Thủy) hỗ trợ mệnh Thủy $\to$ **PASS** (`verdict: 'pass'`).
- `NH-RULE-15`: `NH-DIR-01` hướng Bắc (Thủy) khắc nhập mệnh Hỏa $\to$ **PASS** (`verdict: 'fail'`, `severity: 'major'`).
- `NH-RULE-16` & `NH-RULE-16b`: `NH-DIR-01` đặt tại Trung cung (`'center'` – Thổ) sinh Kim (`pass`) kèm cảnh báo Model North khi uncalibrated $\to$ **PASS**.
- `NH-RULE-17`: `NH-ROOM-01` phòng thiếu `wallColor`/`floorColor` $\to$ **PASS** (`verdict: 'unknown'`, `dataStatus: 'insufficient'`).
- `NH-RULE-18`: `NH-ROOM-01` phòng có tường Xanh lá (Mộc) hỗ trợ mệnh Mộc $\to$ **PASS** (`verdict: 'pass'`).

### 6.3. SUITE-NH-07: Conflicts, Boundaries & Edge Cases (14 Test Cases)
- `NH-EDGE-01`: Đa thuộc tính xung đột (giường gỗ Mộc + màu đỏ Hỏa + mệnh Kim) $\to$ **PASS** (trả về các rule độc lập, không gộp điểm).
- `NH-EDGE-02`: Đồ vật nhiều thuộc tính tốt $\to$ **PASS** (không tự tạo trường điểm tổng hợp `syntheticScore`).
- `NH-EDGE-03`: Đồ vật bị ghim/khóa vị trí (`locked`) $\to$ **PASS** (đánh giá Ngũ Hành bình thường).
- `NH-EDGE-04`: HarmonyScore nằm trong khoảng $[0.0, 1.0]$, độc lập với P5 $\to$ **PASS**.
- `NH-EDGE-05`: Kích thước đồ vật trung gian $\to$ **PASS** (`unknown`, không ép phán quyết).
- `NH-EDGE-06`: Trung cung (`'center'`) luôn thuộc Thổ bất kể `northBearingDeg` $\to$ **PASS**.
- `NH-EDGE-07`: Dữ liệu màu có khoảng trắng (`"  #000000  "`) $\to$ **PASS** (trim và nhận diện thành công).
- `NH-EDGE-08`: Tên đồ vật chứa từ nhạy cảm (`"Giường ngủ tân cổ điển dát vàng"`) $\to$ **PASS** (đánh giá theo vật liệu thực tế `wood`, không suy đoán theo chữ "vàng").
- `NH-EDGE-09`: Nhiều đồ vật cùng loại trong phòng $\to$ **PASS** (đánh giá độc lập theo từng `objectId`).
- `NH-EDGE-10`: Vật liệu ngoài danh mục (`"aerogel"`) $\to$ **PASS** (`unsupported` $\to$ `unknown`).
- `NH-EDGE-11`: Xử lý tên màu tiếng Anh $\to$ **PASS**:
  - `NH-EDGE-11a`: Tên màu `"white"` được catalog nhận diện tương đương `#FFFFFF` (Kim) $\to$ `pass`.
  - `NH-EDGE-11b`: Chuỗi màu tiếng Anh ngoài catalog (`"cyan_iridescent_sparkle"`) $\to$ `unsupported` $\to$ `unknown`.
- `NH-EDGE-12`: La bàn chưa hiệu chuẩn $\to$ **PASS** (luôn xuất hiện cảnh báo Model North).
- `NH-EDGE-13`: Phòng đa chức năng (giường hợp mệnh, bàn khắc mệnh) $\to$ **PASS** (kết quả độc lập, không triệt tiêu).
- `NH-EDGE-14`: `classifyColorElement` thuần túy $\to$ **PASS** (không sinh trường `verdict` đánh giá tốt/xấu).

### 6.4. Báo Cáo Xử Lý Thất Bại (Defect Resolution trong Quá Trình Viết Test)
- **Sự cố phát hiện:** Tại ca kiểm thử `NH-EDGE-11`, bài test ban đầu giả định chuỗi `"white"` là format hex không hợp lệ và mong đợi kết quả `unknown`. Tuy nhiên, động cơ `elementMapping.ts` từ P8-M1 đã có bảng catalog bí danh `COLOR_NAME_ALIASES` quy định `"white" -> #ffffff` (hành Kim, theo tùy chọn cho phép tại `P8_TEST_PLAN.md`: *"Nhận diện tương đương #FFFFFF hoặc báo unsupported"*).
- **Biện pháp xử lý chuẩn hóa:** Bài test được cập nhật phân nhánh đầy đủ: kiểm tra `"white"` nhận diện đúng `#FFFFFF` (hành Kim $\to$ `pass` cho gia chủ Kim) và kiểm tra chuỗi màu ngoài danh mục `"cyan_iridescent_sparkle"` trả về `unsupported` $\to$ `unknown`.
- **Kết quả nghiệm thu cuối cùng:** **103 / 103 ASSERTIONS PASS (100%) | 0 FAIL**.

---

## 7. BẰNG CHỨNG HỒI QUY (REGRESSION), TYPECHECK & PRODUCTION BUILD

| Hạng Mục Kiểm Tra | Lệnh Thực Hiện | Kết Quả Thực Tế | Trạng Thái Nghiệm Thu |
|---|---|---|:---:|
| **Targeted Unit Suite P8-M2** | `npx tsx tests/p8_m2_relationship_rule_engine.test.ts` | **103 / 103 PASS** (100%) | ✅ **PASS** |
| **Mapping Suite P8-M1** | `npx tsx tests/p8_m1_element_mapping.test.ts` | **65 / 65 PASS** (100%) | ✅ **PASS** |
| **Architecture Guard P8-M0** | `npx tsx tests/p8_m0_architecture_guard.test.ts` | **27 / 27 PASS** (100%) | ✅ **PASS** |
| **TypeScript Static Check** | `npm run lint` (`tsc --noEmit`) | **0 Errors** (Compilation clean) | ✅ **PASS** |
| **Production Build** | `npm run build` (`vite build && build:server`) | Client chunks tối ưu; server bundle `dist/server.js` (197 KB) | ✅ **PASS** |
| **Full 14 Suites Regression** | `npx tsx tests/run_all_tests.ts` | **442 PASS \| 46 RECORDED \| 0 FAIL** | ✅ **PASS (100%)** |

---

## 8. XÁC NHẬN BẢO VỆ CÁC RÀNG BUỘC KIẾN TRÚC BẤT BIẾN

Hệ sinh thái P8-M2 được kiểm tra toàn diện nhằm xác nhận các nguyên tắc bất biến:
1. **Kiến trúc P0–P7.5 đóng băng:**
   - Hoàn toàn không sửa đổi mã nguồn các engine P0–P7.5.
   - Kiểm tra AST xác nhận: **0 Reverse Imports** từ `src/engine/core/nguHanh/` vào bất kỳ module nào thuộc P0–P7.5.
2. **Điểm số P5 `overallScore` độc lập tuyệt đối:**
   - Thuật toán tính điểm của P5 không bị biến đổi. Điểm số đánh giá tổng thể giữ nguyên công thức chuẩn hóa ban đầu.
3. **Điểm chuẩn Master Preset bất biến:**
   - Master Preset phòng ngủ mặc định được đo đạc trước và sau khi kích hoạt P8-M2: **Điểm tổng thể luôn bằng $51$ điểm**.
   - Chi tiết: Giường $30$, Bàn $92$, Gương $45$, Lưu thông $70$.
4. **Execution Safety & Transaction Gate:**
   - IntentGuard hoạt động chuẩn xác: câu hỏi lý thuyết không sinh hành động 3D; đề xuất sửa đổi luôn phải thông qua Proposal Card và chờ người dùng bấm "Áp dụng" (Confirm Gate) trước khi tác động vào Scene 3D.
   - Thử nghiệm Playwright E2E 7 kịch bản chạy trên trình duyệt thực tế đạt **16/16 checks PASS**.

---

## 9. ĐỐI SOÁT THƯ MỤC NGUỒN & HỆ THỐNG DISCLAIMER

| Mã Nguồn (Source ID) | Tên Tài Liệu & Căn Cứ Thư Mục | Thể Loại Nguồn | Trạng Thái Xác Minh | Mức Độ Tin Cậy (Certainty) |
|---|---|---|:---:|:---:|
| `SRC-NGU-HANH-DAI-NGHIA` | Ngũ Hành Đại Nghĩa (Tiêu Cát, thời Tùy). Quyển 2 thiên 4, 6, 10; Quyển 3 thiên 14. | `classical_feng_shui` | `pending` | `classical` |
| `SRC-HOANG-DE-NOI-KINH` | Hoàng Đế Nội Kinh — Tố Vấn. Thiên 5 & Thiên 67. | `classical_feng_shui` | `pending` | `classical` |
| `SRC-BAT-TRACH-MINH-KINH-NGUHANH` | Bát Trạch Minh Kính (Bản khắc Thanh triều, thác danh Dương Quân Tùng). | `classical_feng_shui` | `pending` (thác danh) | `classical` |
| `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI` | Quy ước Ngũ Hành Nội Thất Hiện Đại (`INTERNAL/APPLIED PROVISIONAL`). | `heuristic_experimental`| `unverified` | `applied` |
| `SRC-HEURISTIC-HARMONY-SCORE` | Thang điểm Hoà Hợp Ngũ Hành Nội Bộ (AI Studio Heuristic Metric). | `heuristic_experimental`| `pending` | `heuristic` |
| `SRC-HEURISTIC-SHAPE-DIMENSIONS`| Quy tắc Heuristic Hình Dạng Ngũ Hành từ Kích Thước 3D (OBB). | `heuristic_experimental`| `pending` | `heuristic` |

### Kiểm Tra Disclaimer Bắt Buộc:
- **HarmonyScore Disclaimer:** Bắt buộc xuất hiện trong mọi output chứa `harmonyScore`:  
  *`"HarmonyScore (0.0-1.0) là thang điểm quy ước nội bộ của AI Studio nhằm hỗ trợ xếp hạng trực quan, không phải là hệ số định lượng trong cổ thư phong thủy và không thay thế đánh giá tổng thể."`*
- **Shape Rule Disclaimer:** Bắt buộc xuất hiện trong quy tắc `NH-SHAPE-01`:  
  *`"Phân loại hình dạng Ngũ Hành dựa trên tỷ lệ chiều kích là quy ước ứng dụng hiện đại, không phải nguyên lý cổ thư có ngưỡng định lượng."`*
- **Model North Warning:** Bắt buộc xuất hiện trong `NH-DIR-01` khi la bàn chưa hiệu chuẩn (`northBearingDeg = null`):  
  *`"La bàn chưa được hiệu chuẩn thực tế, phương vị dựa trên Model North."`*

---

## 10. KẾT LUẬN & DỪNG THEO QUY TRÌNH (STOP CONDITION)

Milestone **P8-M2 (Five Elements Relationship & Rule Engine)** đã hoàn thành xuất sắc 100% mục tiêu kỹ thuật, đảm bảo toàn vẹn cấu trúc mã nguồn, tính chính xác toán học, tính trung thực thư mục và vượt qua toàn bộ 14 Suites kiểm thử hệ thống.

**Tuân thủ quy trình kiểm soát:**
- **DỪNG TOÀN BỘ TRIỂN KHAI.**
- **KHÔNG** tự ý triển khai Milestone P8-M3 (`elementAssessment.ts`, `elementExplainer.ts`).
- **KHÔNG** sửa đổi mã nguồn P0–P7.5 hay `unifiedAssessment.ts`.
- **KHÔNG** mở khóa Phase P8.4 và Phase P9.
- Báo cáo này được đệ trình để người dùng chính thức nghiệm thu Milestone P8-M2 trước khi cấp lệnh cho giai đoạn kế tiếp.
