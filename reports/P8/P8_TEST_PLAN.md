# P8 TEST PLAN V1.1 — NGŨ HÀNH MODULE
## AI Feng Shui Studio | Kế Hoạch Kiểm Thử Toàn Diện & Bảo Vệ Kiến Trúc Đóng Băng

**Phiên bản:** V1.1 (sau Design Review Remediation)  
**Trạng thái:** TEST PLAN DESIGN | IMPLEMENTATION: LOCKED  
**Nền tảng:** v1.0.0-p7.5 Frozen Architecture (442 PASS, 46 RECORDED, 0 FAIL)  
**Ngày:** 12/11/2026  

---

## 1. NGUYÊN TẮC KIỂM THỬ BẤT BIẾN (NON-NEGOTIABLE PRINCIPLES)

1. **Zero Fake Pass & Zero Modification of Expected Results:** Không sửa expected values để biến FAIL thành PASS.
2. **P5 Score & Master Preset Invariance:** Tuyệt đối không thay đổi `overallScore` của P5 và Master Preset $89/51$. Mọi tính toán Ngũ Hành là additive, hoạt động độc lập ở kênh riêng biệt.
3. **Chuẩn hóa 4 Trạng thái Dữ liệu (4 Element Data Statuses):**
   - Mọi test case phải kiểm thử rõ ràng 1 trong 4 trạng thái: `'known'`, `'ambiguous'`, `'insufficient'`, hoặc `'unsupported'`.
   - Tuyệt đối không chấp nhận `null` thay thế cho enum `ElementDataStatus`.
4. **Phân biệt Bản chất Quan hệ & Harmony Score:**
   - Quan hệ có hướng (`SAME`, `GENERATES`, `GENERATED_BY`, `OVERCOMES`, `OVERCOME_BY`, `UNKNOWN`).
   - HarmonyScore là con số heuristic định lượng xấp xỉ; kiểm thử phải xác nhận có đính kèm `disclaimer`.
5. **No Circular Dependency:** Module `nguHanh/` không được nhập ngược vào bất kỳ module nào thuộc P0–P7.5.

---

## 2. TỔNG QUAN PHÂN BỔ TEST SUITES & TEST CASES

Để đáp ứng đầy đủ yêu cầu kiểm thử 4 trạng thái dữ liệu, xung đột thuộc tính đồ vật, và kiểm tra vòng tròn Ngũ Hành, tổng số test cases của Phase P8 được chuẩn hóa thành **132 Test Cases** (tăng 17 ca so với bản nháp V1.0 để bao quát toàn diện các góc cạnh mới).

| Suite ID | Tên bộ kiểm thử | Số TC | Loại kiểm thử | Milestone |
|---|---|:---:|---|---|
| **SUITE-NH-01** | Color Element Mapping (`NH-MAP-COLOR-*`) | 18 | Unit Test | P8-M1 |
| **SUITE-NH-02** | Material Element Mapping (`NH-MAP-MAT-*`) | 18 | Unit Test | P8-M1 |
| **SUITE-NH-03** | Shape Element Mapping (`NH-MAP-SHAPE-*`) | 10 | Unit Test | P8-M1 |
| **SUITE-NH-04** | Direction Element Mapping (`NH-MAP-DIR-*`) | 12 | Unit Test | P8-M1 |
| **SUITE-NH-05** | Directional Relationship Matrix (`NH-REL-*`) | 24 | Unit Test | P8-M2 |
| **SUITE-NH-06** | Five Elements Rule Engine (`NH-RULE-*`) | 18 | Unit Test | P8-M2 |
| **SUITE-NH-07** | Edge Cases, Conflict & Boundary Handling (`NH-EDGE-*`) | 14 | Unit Test | P8-M2 |
| **SUITE-NH-08** | Unified Assessment Integration (`NH-INT-*`) | 8 | Integration Test | P8-M3 |
| **SUITE-NH-09** | Architecture Integrity & Circular Dependency (`NH-ARCH-*`) | 4 | Static Architecture Test | P8-M0 |
| **SUITE-NH-10** | Frozen Baseline Regression (`NH-REG-*`) | 6 | Full Regression Suite | Checkpoint M0..M3 |
| **TỔNG CỘNG** | **10 Test Suites** | **132** | — | — |

---

## 3. SUITE-NH-01: COLOR ELEMENT MAPPING (`NH-MAP-COLOR-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_color_mapping.test.ts`

| Test Case ID | Giá trị đầu vào (`color`) | Expected Element | Expected DataStatus | Expected Certainty | Mục tiêu kiểm thử |
|---|---|---|---|---|---|
| `NH-MAP-COLOR-01` | `"#228B22"` (Xanh lá cây chuẩn) | `'Mộc'` | `'known'` | `'classical'` | Màu Mộc cổ điển |
| `NH-MAP-COLOR-02` | `"#00FF00"` (Xanh lục tươi) | `'Mộc'` | `'known'` | `'classical'` | Phổ màu Mộc |
| `NH-MAP-COLOR-03` | `"#FF0000"` (Đỏ cờ) | `'Hỏa'` | `'known'` | `'classical'` | Màu Hỏa cổ điển |
| `NH-MAP-COLOR-04` | `"#B22222"` (Đỏ thẫm / gạch) | `'Hỏa'` | `'known'` | `'classical'` | Phổ màu Hỏa |
| `NH-MAP-COLOR-05` | `"#FFD700"` (Vàng hoàng kim) | `'Thổ'` | `'known'` | `'classical'` | Màu Thổ cổ điển |
| `NH-MAP-COLOR-06` | `"#FFFFFF"` (Trắng tinh) | `'Kim'` | `'known'` | `'classical'` | Màu Kim cổ điển |
| `NH-MAP-COLOR-07` | `"#C0C0C0"` (Bạc sáng) | `'Kim'` | `'known'` | `'classical'` | Kim loại sáng |
| `NH-MAP-COLOR-08` | `"#000000"` (Đen tuyền) | `'Thủy'` | `'known'` | `'classical'` | Màu Thủy cổ điển |
| `NH-MAP-COLOR-09` | `"#00008B"` (Xanh navy đậm) | `'Thủy'` | `'known'` | `'applied'` | Phổ Thủy mở rộng |
| `NH-MAP-COLOR-10` | `"#1E90FF"` (Xanh lam nhạt) | `'Thủy'` | `'known'` | `'applied'` | Phổ Thủy ứng dụng |
| `NH-MAP-COLOR-11` | `"#FFA500"` (Cam sáng) | `'Hỏa'` | `'known'` | `'applied'` | Phổ Hỏa ứng dụng |
| `NH-MAP-COLOR-12` | `"#FFB6C1"` (Hồng pastel) | `'Hỏa'` | `'known'` | `'applied'` | Phổ Hỏa mở rộng |
| `NH-MAP-COLOR-13` | `"#FAEBD7"` (Trắng sữa / kem) | `'Kim'` | `'known'` | `'applied'` | Kim mở rộng |
| `NH-MAP-COLOR-14` | `"#808080"` (Xám trung tính) | `null` | `'ambiguous'` | `null` | Ranh giới Kim / Thổ, không ép |
| `NH-MAP-COLOR-15` | `"#8B4513"` (Nâu gỗ truyền thống) | `null` | `'ambiguous'` | `null` | Tranh chấp Thổ / Mộc, không ép |
| `NH-MAP-COLOR-16` | `"#9ACD32"` (Vàng chanh ngả lục) | `null` | `'ambiguous'` | `null` | Tranh chấp Mộc / Thổ, không ép |
| `NH-MAP-COLOR-17` | `null` / `undefined` / `""` | `null` | `'insufficient'` | `null` | Dữ liệu đầu vào rỗng |
| `NH-MAP-COLOR-18` | `"not-a-valid-hex-color"` | `null` | `'unsupported'` | `null` | Chuỗi định dạng sai chuẩn |

---

## 4. SUITE-NH-02: MATERIAL ELEMENT MAPPING (`NH-MAP-MAT-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_material_mapping.test.ts`

| Test Case ID | Giá trị đầu vào (`material`) | Expected Element | Expected DataStatus | Expected Certainty | Mục tiêu kiểm thử |
|---|---|---|---|---|---|
| `NH-MAP-MAT-01` | `"wood"`, `"natural_wood"` | `'Mộc'` | `'known'` | `'classical'` | Gỗ tự nhiên cổ điển |
| `NH-MAP-MAT-02` | `"oak"`, `"walnut"`, `"pine"` | `'Mộc'` | `'known'` | `'classical'` | Các danh mộc cụ thể |
| `NH-MAP-MAT-03` | `"bamboo"`, `"rattan"`, `"cork"` | `'Mộc'` | `'known'` | `'applied'` | Tre nứa cói tự nhiên |
| `NH-MAP-MAT-04` | `"cotton"`, `"linen"`, `"fabric"` | `'Mộc'` | `'known'` | `'applied'` | Vải sợi thực vật |
| `NH-MAP-MAT-05` | `"mdf"`, `"plywood"`, `"chipboard"`| `'Mộc'` | `'known'` | `'applied'` | Gỗ ép công nghiệp |
| `NH-MAP-MAT-06` | `"metal"`, `"iron"`, `"steel"` | `'Kim'` | `'known'` | `'classical'` | Kim loại thô cổ điển |
| `NH-MAP-MAT-07` | `"aluminum"`, `"stainless_steel"` | `'Kim'` | `'known'` | `'applied'` | Hợp kim nhôm, inox |
| `NH-MAP-MAT-08` | `"gold"`, `"silver"` | `'Kim'` | `'known'` | `'classical'` | Kim loại quý cổ điển |
| `NH-MAP-MAT-09` | `"ceramic"`, `"porcelain"`, `"clay"`| `'Thổ'` | `'known'` | `'classical'` | Gốm sứ đất nung |
| `NH-MAP-MAT-10` | `"marble"`, `"granite"`, `"stone"` | `'Thổ'` | `'known'` | `'applied'` | Đá tự nhiên ốp lát |
| `NH-MAP-MAT-11` | `"concrete"`, `"cement"` | `'Thổ'` | `'known'` | `'applied'` | Bê tông xi măng |
| `NH-MAP-MAT-12` | `"plastic"`, `"acrylic"`, `"pvc"` | `null` | `'ambiguous'` | `null` | Nhựa tổng hợp, không ép |
| `NH-MAP-MAT-13` | `"glass"`, `"mirror_glass"` | `null` | `'ambiguous'` | `null` | Thủy tinh / gương, không ép |
| `NH-MAP-MAT-14` | `"leather"`, `"faux_leather"` | `null` | `'ambiguous'` | `null` | Da thuộc động vật / PU |
| `NH-MAP-MAT-15` | `"wood_and_metal_alloy"` | `null` | `'ambiguous'` | `null` | Vật liệu hỗn hợp phức hợp |
| `NH-MAP-MAT-16` | `null` / `undefined` / `""` | `null` | `'insufficient'` | `null` | Thiếu vật liệu |
| `NH-MAP-MAT-17` | `"graphene_aerogel"` | `null` | `'unsupported'` | `null` | Vật liệu ngoài danh mục |
| `NH-MAP-MAT-18` | `12345` (kiểu dữ liệu phi chuỗi) | `null` | `'unsupported'` | `null` | Sai type đầu vào |

---

## 5. SUITE-NH-03: SHAPE ELEMENT MAPPING (`NH-MAP-SHAPE-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_shape_mapping.test.ts`

| Test Case ID | Dimensions (w × h × l) | Tỉ lệ tính toán | Expected Element | Expected DataStatus | Expected Certainty |
|---|---|---|---|---|---|
| `NH-MAP-SHAPE-01` | `{0.5, 2.2, 0.5}` | `h / max(w,l) = 4.4 > 2.0` | `'Mộc'` | `'known'` | `'heuristic'` (Trụ cao) |
| `NH-MAP-SHAPE-02` | `{0.4, 1.8, 0.6}` | `h / max(w,l) = 3.0 > 2.0` | `'Mộc'` | `'known'` | `'heuristic'` (Tủ đứng) |
| `NH-MAP-SHAPE-03` | `{1.8, 0.4, 2.0}` | `h / max(w,l) = 0.2 < 0.3` | `'Thổ'` | `'known'` | `'heuristic'` (Dát phẳng) |
| `NH-MAP-SHAPE-04` | `{1.2, 0.25, 0.8}` | `h / max(w,l) = 0.2 < 0.3` | `'Thổ'` | `'known'` | `'heuristic'` (Thảm/bàn trà thấp)|
| `NH-MAP-SHAPE-05` | `{1.0, 0.95, 1.0}` | `diff(w,l) = 0, h vừa` | `'Kim'` | `'known'` | `'heuristic'` (Hộp vuông cân)|
| `NH-MAP-SHAPE-06` | `{0.8, 0.8, 0.8}` | `diff(w,l) = 0, h vừa` | `'Kim'` | `'known'` | `'heuristic'` (Khối lập phương)|
| `NH-MAP-SHAPE-07` | `{1.6, 0.9, 2.0}` (Giường ngủ chuẩn) | Tỉ lệ nằm giữa các ngưỡng | `null` | `'ambiguous'` | `null` (Không ép hình) |
| `NH-MAP-SHAPE-08` | `{1.2, 0.75, 0.7}` (Bàn làm việc chuẩn)| Tỉ lệ nằm giữa các ngưỡng | `null` | `'ambiguous'` | `null` (Không ép hình) |
| `NH-MAP-SHAPE-09` | `null` / `undefined` | Không có dữ liệu | `null` | `'insufficient'` | `null` |
| `NH-MAP-SHAPE-10` | `{w: -1, h: 2, l: 0}` | Giá trị âm / rỗng | `null` | `'unsupported'` | `null` |

---

## 6. SUITE-NH-04: DIRECTION ELEMENT MAPPING (`NH-MAP-DIR-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_direction_mapping.test.ts`

| Test Case ID | Input Direction | Expected Element | Expected DataStatus | Certainty | Mục tiêu kiểm thử |
|---|---|---|---|---|---|
| `NH-MAP-DIR-01` | `'E'` (Đông) | `'Mộc'` | `'known'` | `'classical'` | Đông thuộc Chấn Mộc |
| `NH-MAP-DIR-02` | `'SE'` (Đông Nam) | `'Mộc'` | `'known'` | `'classical'` | Đông Nam thuộc Tốn Mộc |
| `NH-MAP-DIR-03` | `'S'` (Nam) | `'Hỏa'` | `'known'` | `'classical'` | Nam thuộc Ly Hỏa |
| `NH-MAP-DIR-04` | `'SW'` (Tây Nam) | `'Thổ'` | `'known'` | `'classical'` | Tây Nam thuộc Khôn Thổ |
| `NH-MAP-DIR-05` | `'NE'` (Đông Bắc) | `'Thổ'` | `'known'` | `'classical'` | Đông Bắc thuộc Cấn Thổ |
| `NH-MAP-DIR-06` | `'W'` (Tây) | `'Kim'` | `'known'` | `'classical'` | Tây thuộc Đoài Kim |
| `NH-MAP-DIR-07` | `'NW'` (Tây Bắc) | `'Kim'` | `'known'` | `'classical'` | Tây Bắc thuộc Càn Kim |
| `NH-MAP-DIR-08` | `'N'` (Bắc) | `'Thủy'` | `'known'` | `'classical'` | Bắc thuộc Khảm Thủy |
| `NH-MAP-DIR-09` | `'center'` (Trung cung) | `'Thổ'` | `'known'` | `'classical'` | **Trung cung thuộc Thổ, không ép vào 8 hướng** |
| `NH-MAP-DIR-10` | `null` / `undefined` | `null` | `'insufficient'` | `null` | Thiếu hướng phòng |
| `NH-MAP-DIR-11` | `"invalid_bearing_text"`| `null` | `'unsupported'` | `null` | Chuỗi hướng vô nghĩa |
| `NH-MAP-DIR-12` | Uncalibrated `northBearingDeg = null` | Trả về hướng Model | `'known'` | `'applied'` | Kèm disclaimer la bàn chưa hiệu chuẩn |

---

## 7. SUITE-NH-05: DIRECTIONAL RELATIONSHIP MATRIX (`NH-REL-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_relationship_matrix.test.ts`

### 7.1. Tương sinh có hướng (10 test cases)

| Test Case ID | Source | Target | Expected RelationType | Expected HarmonyScore | Expected Direction Label |
|---|---|---|---|---|---|
| `NH-REL-01` | Kim | Thủy | `'GENERATES'` | `0.85` | Kim sinh Thủy (Sinh xuất) |
| `NH-REL-02` | Thủy | Mộc | `'GENERATES'` | `0.85` | Thủy sinh Mộc (Sinh xuất) |
| `NH-REL-03` | Mộc | Hỏa | `'GENERATES'` | `0.85` | Mộc sinh Hỏa (Sinh xuất) |
| `NH-REL-04` | Hỏa | Thổ | `'GENERATES'` | `0.85` | Hỏa sinh Thổ (Sinh xuất) |
| `NH-REL-05` | Thổ | Kim | `'GENERATES'` | `0.85` | Thổ sinh Kim (Sinh xuất) |
| `NH-REL-06` | Thủy | Kim | `'GENERATED_BY'` | `0.75` | Thủy được Kim sinh (Sinh nhập)|
| `NH-REL-07` | Mộc | Thủy | `'GENERATED_BY'` | `0.75` | Mộc được Thủy sinh (Sinh nhập)|
| `NH-REL-08` | Hỏa | Mộc | `'GENERATED_BY'` | `0.75` | Hỏa được Mộc sinh (Sinh nhập)|
| `NH-REL-09` | Thổ | Hỏa | `'GENERATED_BY'` | `0.75` | Thổ được Hỏa sinh (Sinh nhập)|
| `NH-REL-10` | Kim | Thổ | `'GENERATED_BY'` | `0.75` | Kim được Thổ sinh (Sinh nhập)|

### 7.2. Tương khắc có hướng (10 test cases)

| Test Case ID | Source | Target | Expected RelationType | Expected HarmonyScore | Expected Direction Label |
|---|---|---|---|---|---|
| `NH-REL-11` | Kim | Mộc | `'OVERCOMES'` | `0.20` | Kim khắc Mộc (Khắc xuất) |
| `NH-REL-12` | Mộc | Thổ | `'OVERCOMES'` | `0.20` | Mộc khắc Thổ (Khắc xuất) |
| `NH-REL-13` | Thổ | Thủy | `'OVERCOMES'` | `0.20` | Thổ khắc Thủy (Khắc xuất) |
| `NH-REL-14` | Thủy | Hỏa | `'OVERCOMES'` | `0.20` | Thủy khắc Hỏa (Khắc xuất) |
| `NH-REL-15` | Hỏa | Kim | `'OVERCOMES'` | `0.20` | Hỏa khắc Kim (Khắc xuất) |
| `NH-REL-16` | Mộc | Kim | `'OVERCOME_BY'` | `0.25` | Mộc bị Kim khắc (Khắc nhập) |
| `NH-REL-17` | Thổ | Mộc | `'OVERCOME_BY'` | `0.25` | Thổ bị Mộc khắc (Khắc nhập) |
| `NH-REL-18` | Thủy | Thổ | `'OVERCOME_BY'` | `0.25` | Thủy bị Thổ khắc (Khắc nhập) |
| `NH-REL-19` | Hỏa | Thủy | `'OVERCOME_BY'` | `0.25` | Hỏa bị Thủy khắc (Khắc nhập) |
| `NH-REL-20` | Kim | Hỏa | `'OVERCOME_BY'` | `0.25` | Kim bị Hỏa khắc (Khắc nhập) |

### 7.3. Đồng hành & Khuyết hành (4 test cases)

| Test Case ID | Source | Target | Expected RelationType | Expected HarmonyScore |
|---|---|---|---|---|
| `NH-REL-21` | Kim / Mộc / Thủy / Hỏa / Thổ | Cùng hành tương ứng | `'SAME'` | `0.90` (Đồng hành củng cố) |
| `NH-REL-22` | Mộc | `null` | `'UNKNOWN'` | `0.50` (Mặc định trung tính) |
| `NH-REL-23` | `null` | Hỏa | `'UNKNOWN'` | `0.50` (Mặc định trung tính) |
| `NH-REL-24` | `null` | `null` | `'UNKNOWN'` | `0.50` (Mặc định trung tính) |

---

## 8. SUITE-NH-06: FIVE ELEMENTS RULE ENGINE (`NH-RULE-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_rule_engine.test.ts`

| Test Case ID | Rule ID | Ngữ cảnh kiểm thử | Expected Verdict | Expected Severity |
|---|---|---|---|---|
| `NH-RULE-01` | `NH-COLOR-01` | Gia chủ Thủy, giường màu Đen (`SAME`) | `'pass'` | `'info'` |
| `NH-RULE-02` | `NH-COLOR-01` | Gia chủ Thủy, giường màu Trắng (`GENERATED_BY`) | `'pass'` | `'info'` |
| `NH-RULE-03` | `NH-COLOR-01` | Gia chủ Thủy, giường màu Xanh lục (`GENERATES`) | `'pass'` | `'info'` |
| `NH-RULE-04` | `NH-COLOR-02` | Gia chủ Kim, bàn làm việc màu Đỏ (`OVERCOME_BY`) | `'fail'` | `'major'` |
| `NH-RULE-05` | `NH-COLOR-02` | Gia chủ Kim, bàn làm việc màu Xanh lục (`OVERCOMES`)| `'warn'` | `'minor'` |
| `NH-RULE-06` | `NH-COLOR-01` | Gia chủ Mộc, giường màu Xám (`ambiguous`) | `'unknown'` | — (Không phán quyết) |
| `NH-RULE-07` | `NH-COLOR-01` | Không có hồ sơ gia chủ (`insufficient`) | `'unknown'` | — (Không crash) |
| `NH-RULE-08` | `NH-MAT-01` | Gia chủ Mộc, bàn làm việc gỗ sồi tự nhiên | `'pass'` | `'info'` |
| `NH-RULE-09` | `NH-MAT-02` | Gia chủ Mộc, bàn làm việc khung sắt (`OVERCOME_BY`)| `'fail'` | `'major'` |
| `NH-RULE-10` | `NH-MAT-01` | Gia chủ Thổ, tủ áo nhựa PVC (`ambiguous`) | `'unknown'` | — (Không phán quyết) |
| `NH-RULE-11` | `NH-MAT-01` | Đồ vật cửa sổ (`window`) không áp dụng quy tắc vật liệu| `'n/a'` | — |
| `NH-RULE-12` | `NH-SHAPE-01` | Gia chủ Mộc, kệ sách trụ cao (`height > 2m`) | `'pass'` | `'info'` (có disclaimer) |
| `NH-RULE-13` | `NH-SHAPE-01` | Gia chủ Hỏa, giường ngủ chuẩn (tỉ lệ nằm giữa)| `'unknown'` | — (Không ép hình) |
| `NH-RULE-14` | `NH-DIR-01` | Gia chủ Thủy, đầu giường quay về hướng Bắc (`SAME`)| `'pass'` | `'info'` |
| `NH-RULE-15` | `NH-DIR-01` | Gia chủ Hỏa, đầu giường quay về hướng Bắc (`OVERCOME_BY`)| `'fail'` | `'major'` |
| `NH-RULE-16` | `NH-DIR-01` | Bàn làm việc đặt tại tâm phòng (`center` - Thổ) hợp gia chủ Kim | `'pass'` | `'info'` |
| `NH-RULE-17` | `NH-ROOM-01` | Bố trí phòng ngủ chưa có metadata màu tường | `'unknown'` | — (`insufficient`) |
| `NH-RULE-18` | `NH-ROOM-01` | Placeholder test khi metadata màu tường được cung cấp | `'pass'`/`'fail'`| — |

---

## 9. SUITE-NH-07: CONFLICTS, BOUNDARIES & EDGE CASES (`NH-EDGE-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_edge_conflicts.test.ts`

| Test Case ID | Mục tiêu kịch bản kiểm thử | Input kịch bản | Expected Result |
|---|---|---|---|
| `NH-EDGE-01` | **Xung đột đa thuộc tính trong cùng 1 đồ vật** | Giường có vật liệu gỗ (Mộc), màu đỏ (Hỏa), tỉ lệ trụ đứng (Mộc) | Bóc tách từng thuộc tính riêng biệt; chọn `dominantElement` minh bạch kèm giải trình cơ sở |
| `NH-EDGE-02` | **Gia chủ có Quái Mệnh khác Nạp Âm** | Nam 1990 (Quái Khảm Thủy, Nạp Âm Lộ Bàng Thổ) | Rule lấy Mệnh Quái Thủy làm cơ sở chính, ghi chú Nạp Âm Thổ chỉ là yếu tố tham khảo phụ |
| `NH-EDGE-03` | **Xung đột thuộc tính đối kháng hoàn toàn** | Đồ vật khung sắt (Kim) bọc vải nỉ xanh lá (Mộc) | Báo cáo xung đột nội tại đồ vật, không ép gộp một hành duy nhất |
| `NH-EDGE-04` | **Phòng không có đồ vật nội thất** | `objects = []` | Output rỗng an toàn, `overallHarmonyScore = null`, không văng ngoại lệ |
| `NH-EDGE-05` | **Tọa độ vật thể nằm ngoài biên phòng** | Vật thể có tọa độ âm hoặc ngoài tường | Vẫn phân tích màu sắc/vật liệu bình thường; vị trí hướng báo `unsupported` |
| `NH-EDGE-06` | **Màu sắc hex viết hoa/thường lẫn lộn** | `"#FfA500"`, `"#ffffff"` | Chuẩn hóa tự động thành chữ thường trước khi so khớp |
| `NH-EDGE-07` | **Dữ liệu màu chứa khoảng trắng** | `"  #000000  "` | Cắt tỉa (trim) chuỗi thành công trước khi ánh xạ |
| `NH-EDGE-08` | **Vật thể có tên tiếng Việt tự do** | `name: "Giường ngủ tân cổ điển dát vàng"` | Không tự suy đoán hành từ tên chữ, chỉ đọc thuộc tính `material`/`color` |
| `NH-EDGE-09` | **Trùng lặp nhiều đồ vật cùng loại** | 3 chiếc ghế ăn có màu khác nhau | Đánh giá độc lập từng `objectId`, không ghi đè kết quả |
| `NH-EDGE-10` | **Đồ vật bị ẩn / khóa (`locked = true`)** | Tủ quần áo bị pin vị trí | Phân tích ngũ hành bình thường (khóa vị trí không cấm đổi màu) |
| `NH-EDGE-11` | **Màu sắc là tên màu tiếng Anh** | `color: "white"` | Nhận diện tương đương `#FFFFFF` hoặc báo `unsupported` theo quy định catalog |
| `NH-EDGE-12` | **Hồ sơ gia chủ có ngày sinh sát tiết khí Lập Xuân**| Ngày sinh 04/02 có cờ `uncertain` | Kế thừa trạng thái `insufficient` từ P4 guaEngine |
| `NH-EDGE-13` | **Phòng đa chức năng (vừa ngủ vừa làm việc)** | Giường hợp mệnh nhưng bàn làm việc khắc mệnh | Tổng hợp điểm hài hòa đa mục tiêu với giải trình chi tiết từng phân vùng |
| `NH-EDGE-14` | **Bảo đảm không có kết luận tốt/xấu tự động từ mapping đơn lẻ** | Chỉ chạy `elementMapping` mà không qua `elementRuleEngine` | Mapping chỉ trả về tên hành và trạng thái, không gán nhãn cát/hung |

---

## 10. SUITE-NH-08: UNIFIED ASSESSMENT INTEGRATION (`NH-INT-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_unified_integration.test.ts`

| Test Case ID | Kịch bản kiểm thử | Kỳ vọng bắt buộc |
|---|---|---|
| `NH-INT-01` | Chạy `evaluateUnifiedRoom` khi có đủ dữ liệu Ngũ Hành | Báo cáo trả về có field `nguHanhAssessment` với dữ liệu hợp lệ |
| `NH-INT-02` | Chạy `evaluateUnifiedRoom` khi KHÔNG có dữ liệu cá nhân | `nguHanhAssessment` được gán an toàn hoặc vắng mặt; các phân hệ khác hoạt động bình thường |
| `NH-INT-03` | **BẢO TỒN ĐIỂM SỐ P5 (INVARIANCE GATE)** | **`overallScore` của P5 TRÙNG KHỚP 100% trước và sau khi thêm field Ngũ Hành** |
| `NH-INT-04` | **BẢO TỒN MASTER PRESET BENCHMARK** | **Master Preset giữ nguyên 89 (chuẩn cát) và 51 (chuẩn hung)** |
| `NH-INT-05` | Tính độc lập của các quy tắc P3, P4, P6 | `BED-DOOR-01`, `PERS-BED-01`, `ERG-CIRC-01` không thay đổi verdict |
| `NH-INT-06` | Trích dẫn nguồn trong Explanation | Lời giải thích Ngũ Hành dẫn chứng đúng ID đăng ký trong `SOURCE_REGISTRY` |
| `NH-INT-07` | Disclaimer bắt buộc cho Heuristic | Mọi kết quả có HarmonyScore hoặc Shape đều xuất hiện disclaimer |
| `NH-INT-08` | Tuân thủ Schema `RuleResult` chính quy | Các rule `NH-*` tạo ra object khớp 100% định dạng `RuleResult` trong `ruleTypes.ts` |

---

## 11. SUITE-NH-09: ARCHITECTURE & CIRCULAR DEPENDENCY (`NH-ARCH-*`)
*File kiểm thử dự kiến:* `tests/p8/p8_architecture_guard.test.ts`

| Test Case ID | Mục tiêu kiểm thử tĩnh (Static Verification) | Tiêu chí nghiệm thu |
|---|---|---|
| `NH-ARCH-01` | **No Reverse Imports:** Không có import từ `src/engine/core/nguHanh/` vào P0–P7.5 | Scan AST/grep xác nhận 0 reverse imports |
| `NH-ARCH-02` | **Zero Circular Dependencies:** Kiểm tra chu trình phụ thuộc | Công cụ phân tích đồ thị xác nhận chu trình = 0 |
| `NH-ARCH-03` | **Strict Additive Changes:** Các file P0–P7.5 không bị xóa bỏ hoặc đổi tên field | `git diff` chỉ hiển thị field mới dạng optional (`?`) |
| `NH-ARCH-04` | **Frozen Algorithm Integrity:** Không có bất kỳ dòng code thuật toán P0–P7.5 nào bị sửa đổi | Hash checksum hoặc diff xác nhận toàn vẹn |

---

## 12. SUITE-NH-10: BASELINE REGRESSION (NH-REG-*)
*Thực thi thông qua:* `tests/run_all_tests.ts`

Toàn bộ 14 Suites kiểm thử của hệ thống bắt buộc phải duy trì trạng thái xanh 100% tại mọi trạm kiểm soát (Checkpoint):

| Test Case ID | Bộ kiểm thử hồi quy được bảo vệ | Kỳ vọng bắt buộc |
|---|---|---|
| `NH-REG-01` | Suite 1: P0 Characterization Baseline | 4 PASS, 12 RECORDED, 0 FAIL |
| `NH-REG-02` | Suite 2: Phase H Intent Guard & Execution Safety | 17 PASS, 0 FAIL |
| `NH-REG-03` | Suite 3: Express Server Pipeline Integration | 10 PASS, 0 FAIL |
| `NH-REG-04` | Suite 4 đến Suite 8: P1, P2, P3, P4, P5 Spatial & Rules | 149 PASS, 0 FAIL |
| `NH-REG-05` | Suite 9 đến Suite 14: P6, P7, P7.5, Pilot-01, P8.2 | 262 PASS, 34 RECORDED, 0 FAIL |
| `NH-REG-06` | **TOÀN BỘ 14 SUITES TỔNG HỢP** | **442 PASS \| 46 RECORDED \| 0 FAIL** |

---

*Tài liệu P8_TEST_PLAN.md V1.1 — DESIGN ONLY. Cấu trúc 132 Test Cases được phê duyệt phục vụ triển khai kiểm thử khi Milestone P8-M1/M2/M3 được mở khóa.*
