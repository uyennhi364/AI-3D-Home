# P8 RESEARCH SOURCES V1.1 — NGŨ HÀNH MODULE
## AI Feng Shui Studio | Danh Mục Nguồn Tài Liệu & Căn Cứ Học Thuật

**Phiên bản:** V1.1 (sau Design Review Remediation)  
**Trạng thái:** RESEARCH PHASE | DESIGN ONLY  
**Ngày cập nhật:** 12/11/2026  
**Nguyên tắc cốt lõi:** Tuyệt đối không trình bày quy ước hiện đại hay heuristic nội bộ dưới danh nghĩa nguyên lý cổ điển. Mọi quy tắc cổ điển phải có định danh văn bản, chương mục và giới hạn diễn giải minh bạch.

---

## 1. NGUYÊN TẮC PHÂN LOẠI NGUỒN & QUY TẮC BẢO VỆ TÍNH TRUNG THỰC

Hệ thống AI Feng Shui Studio áp dụng 3 phân tầng học thuật độc lập:

| Phân tầng | Mã định danh | Điều kiện công nhận | Hệ quả kiểm thử & hiển thị |
|---|---|---|---|
| **Cổ điển (Classical)** | `classical` | Có văn bản cổ thư cụ thể, tác giả/triều đại xác định, chương mục đối soát được | Không cần disclaimer; trích dẫn chính xác nguyên văn/khái niệm |
| **Ứng dụng hiện đại (Applied)** | `applied` | Có tài liệu kiến trúc/phong thủy hiện đại xuất bản, được cộng đồng thừa nhận rộng rãi nhưng không có trong văn bản cổ | Ghi rõ nguồn xuất bản hiện đại; phân biệt với cổ điển |
| **Heuristic nội bộ (Heuristic)** | `heuristic` | Do hệ thống tự quy ước (ví dụ: ngưỡng tỉ lệ hình học, trọng số HarmonyScore) | Bắt buộc đính kèm Disclaimer trong kết quả và giao diện người dùng |

> [!CAUTION]
> **ĐIỀU CẤM KỴ HỌC THUẬT (NON-NEGOTIABLE):**
> 1. Nghiêm cấm gán nhãn `classical` cho bất kỳ quy tắc nào nếu chưa có vị trí chương/mục cụ thể trong cổ thư.
> 2. Nghiêm cấm đồng nhất Ngũ Hành Quái Mệnh Bát Trạch với toàn bộ hệ thống Tứ Trụ/Bát Tự (không suy diễn Thân Vượng/Thân Nhược hay Dụng Thần trong module này).
> 3. Các thuộc tính không thể xác định hoặc có mâu thuẫn phải trả về `dataStatus: 'ambiguous'` hoặc `'insufficient'`, không được suy diễn chủ quan từ tên gọi của vật thể.

---

## 2. DANH MỤC NGUỒN CỔ ĐIỂN (CLASSICAL SOURCES)

### 2.1. SRC-NGU-HANH-DAI-NGHIA (Ngũ Hành Đại Nghĩa)

```typescript
{
  id: 'SRC-NGU-HANH-DAI-NGHIA',
  code: 'NHDN-CLASSIC',
  title: 'Ngũ Hành Đại Nghĩa (五行大義)',
  authorOrOrigin: 'Tiêu Cát (蕭吉) — Học giả thời Tùy',
  versionOrEdition: 'Khâm Định Tứ Khố Toàn Thư bản (Càn Long triều); Trung Hoa Thư Cục hiệu đính',
  chapterOrSection: [
    'Quyển 1: Luận Thể Tính (論體性) — Thể chất và bản chất 5 hành',
    'Quyển 2, Chương 3: Luận Tương Sinh (論相生) — Thứ tự và cơ chế sinh hóa',
    'Quyển 2, Chương 4: Luận Tương Khắc (論相克) — Thứ tự và cơ chế chế ước',
    'Quyển 3: Luận Phối Phương Vị (論配方位) — Phối thuộc 5 hành với phương hướng',
    'Quyển 4: Luận Phối Màu Sắc (論配色) — 5 màu chính: Thanh, Xích, Hoàng, Bạch, Hắc'
  ],
  category: 'classical_feng_shui',
  school: 'general',
  publicationEra: 'Tùy Khai Hoàng niên gian (khoảng 581–604 SCN)',
  supportedRules: ['NH-COLOR-01', 'NH-COLOR-02', 'NH-DIR-01', 'NH-REL-*'],
  supportedMappings: [
    'Màu sắc cơ bản: Xanh lục (Mộc), Đỏ (Hỏa), Vàng (Thổ), Trắng (Kim), Đen (Thủy)',
    'Phương vị cổ điển: Đông/Đông Nam (Mộc), Nam (Hỏa), Trung Tâm/Tây Nam/Đông Bắc (Thổ), Tây/Tây Bắc (Kim), Bắc (Thủy)',
    'Quan hệ: Kim sinh Thủy, Thủy sinh Mộc, Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim',
    'Quan hệ: Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim'
  ],
  interpretationLimitations: 'Ngũ Hành Đại Nghĩa mô tả thế giới quan triết học vạn vật, không trực tiếp quy định cụ thể kích thước nội thất căn hộ hay mã màu số học (Hex). Việc ánh xạ sang mã hex số hóa là lớp chuyển đổi ứng dụng hiện đại.',
  classification: 'classical',
  status: 'pending'
}
```

---

### 2.2. SRC-HOANG-DE-NOI-KINH (Hoàng Đế Nội Kinh — Tố Vấn)

```typescript
{
  id: 'SRC-HOANG-DE-NOI-KINH',
  code: 'HDNK-SO-VAN',
  title: 'Hoàng Đế Nội Kinh — Tố Vấn (黃帝內經·素問)',
  authorOrOrigin: 'Y gia cổ đại Trung Hoa tổng hợp',
  versionOrEdition: 'Nhân Dân Vệ Sinh Xuất Bản Xã (hiệu khảo)',
  chapterOrSection: [
    'Thiên 5: Âm Dương Ứng Tượng Đại Luận (陰陽應象大論)',
    'Thiên 67: Ngũ Vận Hưng Suy Đại Luận (五運行大論)'
  ],
  category: 'classical_feng_shui',
  school: 'general',
  publicationEra: 'Tiền Hán — Hậu Hán (thế kỷ II TCN – thế kỷ II SCN)',
  supportedRules: ['NH-COLOR-01', 'NH-COLOR-02'],
  supportedMappings: [
    'Ngũ Sắc phối Ngũ Hành: Thanh (Mộc), Xích (Hỏa), Hoàng (Thổ), Bạch (Kim), Hắc (Thủy)',
    'Cơ chế sinh khắc tương tác khí trường cơ thể và môi trường cư trú'
  ],
  interpretationLimitations: 'Nghiêng về y lý và dưỡng sinh khí trường, hỗ trợ bổ trợ lý thuyết cho tương tác màu sắc đối với tinh thần gia chủ.',
  classification: 'classical',
  status: 'pending'
}
```

---

### 2.3. SRC-BAT-TRACH-MINH-KINH-NGUHANH (Bát Trạch Minh Kính — Phần Ngũ Hành Khí Cục)

```typescript
{
  id: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
  code: 'BTMK-NGUHANH',
  title: 'Bát Trạch Minh Kính (八宅明鏡) — Ngũ Hành Bát Quái Khí Cục',
  authorOrOrigin: 'Dương Quân Tùng (truyền bản), Nhược Quán Đạo Nhân (biên tập đời Thanh)',
  versionOrEdition: 'Khắc bản đời Càn Long; bản dịch và chú giải Viện Nghiên cứu Cổ thư',
  chapterOrSection: [
    'Quyển Thượng: Bát Quái Cung Vị Ngũ Hành sở thuộc (八卦宮位五行所屬)',
    'Quyển Hạ: Phối Mệnh Biện Hướng Định Khí Cục (配命辨向定氣局)'
  ],
  category: 'classical_feng_shui',
  school: 'bat_trach',
  publicationEra: 'Thanh triều',
  supportedRules: ['NH-DIR-01', 'PERS-BED-01', 'PERS-DESK-01'],
  supportedMappings: [
    'Quái Mệnh ngũ hành: Khảm (Thủy), Khôn (Thổ), Chấn (Mộc), Tốn (Mộc), Càn (Kim), Đoài (Kim), Cấn (Thổ), Ly (Hỏa)',
    'Phương vị bát quái ứng hành: Khảm Bắc (Thủy), Ly Nam (Hỏa), Chấn Đông (Mộc), Tốn Đông Nam (Mộc), Đoài Tây (Kim), Càn Tây Bắc (Kim), Cấn Đông Bắc (Thổ), Khôn Tây Nam (Thổ)'
  ],
  interpretationLimitations: 'Chỉ định vị tính chất ngũ hành của Cung và Mệnh; không quy định chi tiết đồ vật nội thất cụ thể trong không gian hiện đại.',
  classification: 'classical',
  status: 'pending'
}
```

---

## 3. DANH MỤC NGUỒN ỨNG DỤNG HIỆN ĐẠI (APPLIED SOURCES)

### 3.1. SRC-PHONG-THUY-NOI-THAT-HIEN-DAI

```typescript
{
  id: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
  code: 'PTNT-APPLIED-2018',
  title: 'Ứng Dụng Ngũ Hành Trong Thiết Kế Nội Thất Hiện Đại',
  authorOrOrigin: 'Tổng hợp tài liệu chuyên ngành Kiến trúc & Phong thủy ứng dụng (ĐH Kiến Trúc / NXB Xây Dựng)',
  versionOrEdition: 'Tài liệu tham khảo xuất bản 2018–2022',
  chapterOrSection: [
    'Chương 3: Phân loại màu sắc vật liệu công nghiệp theo hệ Ngũ Hành',
    'Chương 4: Quy ước vật liệu nhân tạo (Gỗ công nghiệp MDF, đá nhân tạo, kính, hợp kim nhôm)'
  ],
  category: 'classical_feng_shui',
  school: 'general',
  publicationEra: 'Hiện đại (thế kỷ XXI)',
  supportedRules: ['NH-COLOR-01', 'NH-COLOR-02', 'NH-MAT-01', 'NH-MAT-02'],
  supportedMappings: [
    'Màu sắc mở rộng: Xanh navy/lam (Thủy), Cam/Hồng (Hỏa), Vàng kim/Kem/Trắng sữa (Kim), Nâu vàng (Thổ)',
    'Vật liệu công nghiệp: Gỗ MDF/ván ép (Mộc), Đá hoa cương/marble/granite (Thổ), Hợp kim nhôm/thép không gỉ (Kim), Vải cotton/linen tự nhiên (Mộc)'
  ],
  interpretationLimitations: 'Là quy ước của giới kiến trúc sư và chuyên gia phong thủy đương đại nhằm thích ứng với vật liệu xây dựng mới; không có căn cứ từ cổ thư thời phong kiến. Mức độ đồng thuận cao nhưng vẫn tồn tại tranh luận ở các nhóm vật liệu phức hợp.',
  classification: 'applied',
  status: 'unverified'
}
```

---

## 4. QUY ƯỚC HEURISTIC NỘI BỘ (INTERNAL HEURISTIC SPECIFICATIONS)

Các quy tắc sau đây là **Heuristic do chính AI Feng Shui Studio xây dựng**, hoàn toàn không có trong tài liệu bên ngoài. Mọi kết quả sinh ra bắt buộc phải mang cờ `certainty: 'heuristic'` và trả về `disclaimer` rõ ràng.

### 4.1. SRC-HEURISTIC-HARMONY-SCORE (Thang Điểm Hoà Hợp Quy Ước)

```typescript
{
  id: 'SRC-HEURISTIC-HARMONY-SCORE',
  code: 'HEURISTIC-SCORE-V1',
  title: 'Quy ước Thang điểm Hoà Hợp Ngũ Hành Nội Bộ (AI Feng Shui Studio Harmony Score)',
  authorOrOrigin: 'AI Feng Shui Studio Engineering Team',
  versionOrEdition: 'Spec V1.1 (2026)',
  chapterOrSection: ['P8_ARCHITECTURE_SPEC.md — Mục 6.2'],
  category: 'heuristic_experimental',
  school: 'general',
  publicationEra: '2026',
  supportedRules: ['Tất cả các tính toán HarmonyScore trong module nguHanh/'],
  supportedMappings: [
    'SAME = 0.90 (Đồng hành củng cố)',
    'GENERATES = 0.85 (Sinh xuất thuận lợi)',
    'GENERATED_BY = 0.75 (Sinh nhập được trợ dưỡng)',
    'OVERCOME_BY = 0.25 (Khắc nhập — bất lợi)',
    'OVERCOMES = 0.20 (Khắc xuất — tiêu hao)',
    'UNKNOWN = 0.50 (Trung tính khi thiếu dữ liệu)'
  ],
  interpretationLimitations: 'Điểm số 0.0–1.0 hoàn toàn là trọng số heuristic phục vụ việc sắp xếp độ ưu tiên khuyến nghị trong giao diện người dùng. TUYỆT ĐỐI KHÔNG ĐƯỢC TÍNH VÀO overallScore CỦA P5. Không đại diện cho công thức cổ thư.',
  classification: 'heuristic',
  status: 'verified'
}
```

---

### 4.2. SRC-HEURISTIC-SHAPE-DIMENSIONS (Quy Ước Hình Dạng Theo Kích Thước OBB)

```typescript
{
  id: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
  code: 'HEURISTIC-SHAPE-V1',
  title: 'Quy tắc Heuristic Phân Loại Hình Dạng Ngũ Hành từ Kích Thước 3D (Bounding Box Dimensions)',
  authorOrOrigin: 'AI Feng Shui Studio Engineering Team',
  versionOrEdition: 'Spec V1.1 (2026)',
  chapterOrSection: ['P8_ARCHITECTURE_SPEC.md — Mục 5.3'],
  category: 'heuristic_experimental',
  school: 'general',
  publicationEra: '2026',
  supportedRules: ['NH-SHAPE-01'],
  supportedMappings: [
    'Chiều cao vượt trội (height / max(w, l) > 2.0) → Mộc (hình trụ vươn cao)',
    'Bề mặt dẹt rộng (height / max(w, l) < 0.3) → Thổ (hình vuông/dẹt bằng phẳng)',
    'Tỉ lệ vuông cân (abs(w - l) / max(w, l) < 0.1 và chiều cao trung bình) → Kim (vuông/tròn quy ước)'
  ],
  interpretationLimitations: 'Cổ thư Loan Đầu chỉ phân biệt Ngũ Hành Sơn Hình (hình thái núi non thực tế). Việc áp dụng tỉ lệ số học cứng (2.0; 0.3; 0.1) vào kích thước hộp 3D nội thất là mô hình xấp xỉ hình học heuristic của hệ thống.',
  classification: 'heuristic',
  status: 'verified'
}
```

---

## 5. MA TRẬN ĐỐI SOÁT QUY TẮC & NGUỒN CĂN CỨ

| Rule ID | Tên quy tắc | Nguồn căn cứ chính | Phân loại | Giới hạn bắt buộc |
|---|---|---|---|---|
| `NH-COLOR-01` | Màu sắc tương sinh / đồng hành | `SRC-NGU-HANH-DAI-NGHIA`, `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI` | `classical` (màu chính) / `applied` (màu phụ) | Màu ambiguous phải trả về `dataStatus: 'ambiguous'` |
| `NH-COLOR-02` | Màu sắc tương khắc | `SRC-NGU-HANH-DAI-NGHIA`, `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI` | `classical` (màu chính) / `applied` (màu phụ) | Chỉ cảnh báo khi colorAnalysis `known` |
| `NH-MAT-01` | Vật liệu hỗ trợ bản mệnh | `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI`, `SRC-NGU-HANH-DAI-NGHIA` | `classical` (gỗ/kim loại/gốm) / `applied` (đá/mdf) | Không ép phân loại vật liệu tổng hợp (plastic/kính) |
| `NH-MAT-02` | Vật liệu xung khắc bản mệnh | `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI` | `applied` | Vật liệu hỗn hợp trả về `ambiguous` |
| `NH-SHAPE-01` | Hình dạng đồ vật hỗ trợ | `SRC-HEURISTIC-SHAPE-DIMENSIONS` | `heuristic` | BẮT BUỘC có disclaimer heuristic trong explanation |
| `NH-DIR-01` | Phương vị đặt đồ vật hợp hành | `SRC-BAT-TRACH-MINH-KINH-NGUHANH`, `SRC-NGU-HANH-DAI-NGHIA` | `classical` | Phương vị trung tâm (`center`) là Thổ; không ép vào 8 hướng |
| `NH-ROOM-01` | Màu sắc tổng thể phòng | `SRC-PHONG-THUY-NOI-THAT-HIEN-DAI` | `applied` | Trả về `insufficient` khi chưa có metadata màu phòng |

---

## 6. KẾ HOẠCH THẨM ĐỊNH NGUỒN TRƯỚC KHI IMPLEMENTATION

| Mã kiểm định | Mục tiêu thẩm định | Tiêu chí nghiệm thu | Người chịu trách nhiệm |
|---|---|---|---|
| **V-01** | Đối chiếu nguyên văn Ngũ Hành Đại Nghĩa quyển 2 & 4 | Khớp 100% 5 cặp Tương sinh và 5 cặp Tương khắc | Lead Architect / Feng Shui Specialist |
| **V-02** | Rà soát danh mục 15 màu sắc đối chiếu với bảng mã Hex | Không có sự nhập nhằng giữa các phổ màu ranh giới (xám, nâu gỗ) | UI/UX & Color Engine Engineer |
| **V-03** | Xác thực danh mục vật liệu công nghiệp hiện đại | Phân loại rõ ràng vật liệu tự nhiên vs hỗn hợp nhân tạo | QA Engineer |
| **V-04** | Đăng ký chính thức 5 Source IDs vào `sourceRegistry.ts` tại P8-M0 | Toàn bộ 14 Suites kiểm thử hồi quy tiếp tục 442 PASS | System Engineer |

---

*Tài liệu P8_RESEARCH_SOURCES.md V1.1 — DESIGN ONLY. Căn cứ học thuật đã được chuẩn hóa phục vụ Milestone P8-M0.*
