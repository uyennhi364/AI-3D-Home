# P8 ARCHITECTURE SPECIFICATION V1.1 — NGŨ HÀNH MODULE
## AI Feng Shui Studio | Design Phase (AUTHORIZED FOR DESIGN ONLY)

**Phiên bản:** V1.1 (sau Design Review Remediation)  
**Trạng thái:** DESIGN PHASE AUTHORIZED | P8-M0 APPROVED FOR IMPLEMENTATION  
**Nền tảng:** v1.0.0-p7.5 (P0–P7.5 Frozen Architecture)  
**Ngày:** 12/11/2026  

---

## DESIGN REVIEW FINDINGS

| Finding | Trạng thái V1.1 |
|---|---|
| FR-01: ElementDataStatus không thống nhất (null thay cho enum) | ✅ ĐÃ XỬ LÝ — Enum `known / ambiguous / insufficient / unsupported` |
| FR-02: HarmonyScore không được ghi rõ là heuristic | ✅ ĐÃ XỬ LÝ — Phân biệt `ElementRelationType` và `HarmonyScore` |
| FR-03: Mapping thiếu trường `rationale`, `limitation`, `sourceId` | ✅ ĐÃ XỬ LÝ — Bảng mapping chi tiết đầy đủ 7 cột |
| FR-04: Direction chưa xử lý Center / Missing / Invalid | ✅ ĐÃ XỬ LÝ — Làm rõ northBearingDeg, Center, và trường hợp lỗi |
| FR-05: Source Registry thiếu chương/mục cụ thể | ✅ ĐÃ XỬ LÝ — Xem P8_RESEARCH_SOURCES.md V1.1 |
| FR-06: Rule specifications thiếu preconditions, edge cases | ✅ ĐÃ XỬ LÝ — 7 rule được đặc tả đầy đủ trong mục 6 |
| FR-07: Test Plan chưa cover 4 data statuses và unknown relation | ✅ ĐÃ XỬ LÝ — Xem P8_TEST_PLAN.md V1.1 |

**Decisions Accepted:** ADR-P8-01 đến ADR-P8-08 giữ nguyên.  
**Decisions Deferred:** Huyền Không Phi Tinh Ngũ Hành — đưa vào xem xét P9.  
**Open Risks:** Xem mục 8.  

---

## 1. KHẢO SÁT KIẾN TRÚC HIỆN TẠI

### 1.1. Sơ đồ phụ thuộc module

```
src/types/fengshui.ts   ← Khai báo kiểu trung tâm
        ↑
        |── src/engine/core/guaEngine.ts           [P4 FROZEN]
        |── src/engine/core/napAmEngine.ts          [P4 FROZEN]
        |── src/engine/core/batTrachEngine.ts       [P4 FROZEN]
        |── src/engine/core/personalAssessment.ts   [P4 FROZEN]
        |── src/engine/core/furnitureRuleEngine.ts  [P3 FROZEN]
        |── src/engine/core/environmentalEngine.ts  [P6 FROZEN]
        |── src/engine/core/sectorEngine.ts         [P2 FROZEN]
        |── src/engine/core/roomLayout.ts           [P2 FROZEN]
        |── src/engine/core/sourceRegistry.ts       [Additive only]
        |── src/engine/core/ruleTypes.ts            [Additive field only]
        |── src/engine/core/compass.ts              [P1 FROZEN — tái dụng]
        |── src/engine/core/unifiedAssessment.ts    [Additive integration point]
        └── src/engine/agent/ (toàn bộ)             [P7 FROZEN]

src/engine/core/nguHanh/   ← NEW BOUNDARY (P8, additive only)
        ├── elementTypes.ts
        ├── elementMapping.ts
        ├── elementRelationship.ts
        ├── elementRuleEngine.ts
        ├── elementAssessment.ts
        └── elementExplainer.ts
```

**Quy tắc phụ thuộc:**
- `nguHanh/*` **KHÔNG được import ngược** vào bất kỳ file P0–P7.5 Frozen nào.
- `unifiedAssessment.ts` gọi `elementAssessment.ts` theo chiều một chiều.
- Circular dependency là lỗi nghiêm trọng: phải kiểm tra tự động.

### 1.2. Module Frozen — Không được phép sửa đổi

| Module | Lý do | Phạm vi cho phép |
|---|---|---|
| `src/types/fengshui.ts` | P4 baseline | Thêm field `material?: string` vào `RoomObject` (additive) |
| `guaEngine.ts` | Thuật toán Quái Mệnh P4 | Import `GUA_V2_METADATA` (read-only) |
| `napAmEngine.ts` | Nạp Âm 60 Hoa Giáp | Import `HOA_GIAP_60_TABLE` (read-only) |
| `batTrachEngine.ts` | Bát Trạch 64 cung | Import `BatTrachGuaProfile` (read-only) |
| `furnitureRuleEngine.ts` | Rule IDs và verdict P3 | Không nhập |
| `personalAssessment.ts` | Đánh giá cá nhân P4 | Import output type (read-only) |
| `ruleTypes.ts` | Schema `RuleResult` | Thêm `RuleCategory: 'ngu_hanh'` (additive enum member) |
| `sourceRegistry.ts` | Nguồn tài liệu | Thêm mục mới (không xóa, không sửa mục cũ) |
| `compass.ts` | Hệ tọa độ hướng P1 | Import `CompassDirection`, `worldBearingOfAxis` (read-only) |
| `src/engine/agent/` | P7 Execution Gate | Không nhập |
| `server.ts` (proposal logic) | Confirm Gate P7 | Không nhập |

---

## 2. CHUẨN HÓA ELEMENT DATA STATUS

### 2.1. Enum `ElementDataStatus`

```typescript
// Design spec — file: src/engine/core/nguHanh/elementTypes.ts
export type ElementDataStatus =
  | 'known'          // Đủ dữ liệu, phân loại thành công với certainty xác định
  | 'ambiguous'      // Có dữ liệu nhưng không thể phân loại dứt khoát (ví dụ: vật liệu hỗn hợp, màu trung tính)
  | 'insufficient'   // Không có dữ liệu đầu vào (null, chuỗi rỗng, field thiếu)
  | 'unsupported';   // Có dữ liệu nhưng kiểu dữ liệu nằm ngoài phạm vi mapping (ví dụ: vật liệu chưa có trong catalog)
```

### 2.2. Điều kiện sử dụng từng trạng thái

| Trạng thái | Điều kiện | Ví dụ | Verdict cho phép |
|---|---|---|---|
| `known` | Đầu vào hợp lệ, có ánh xạ xác định | màu `#FF0000` → Hỏa | `pass` / `warn` / `fail` |
| `ambiguous` | Đầu vào hợp lệ nhưng thuộc nhiều hành hoặc ranh giới không rõ | màu `#808080` (xám) → Kim hoặc Thổ | `unknown` (không được ép) |
| `insufficient` | Không có đầu vào (null, undefined, chuỗi rỗng) | `color: null` | `unknown` |
| `unsupported` | Có đầu vào nhưng không có rule/catalog | `material: "aerogel"` | `unknown` / `n/a` |

> [!CAUTION]
> **NGHIÊM CẤM** dùng `null` thay cho các enum trên. Mọi function trả về `ElementAnalysisResult` phải luôn có `dataStatus` cụ thể.

### 2.3. Phân biệt `element: null` và `dataStatus`

- `element: null` **chỉ được phép** khi `dataStatus` là `'ambiguous'`, `'insufficient'`, hoặc `'unsupported'`.
- `element: NguHanhElement` **chỉ được phép** khi `dataStatus === 'known'`.
- Cặp `element: null, dataStatus: 'known'` là **lỗi logic**.

---

## 3. TYPE DEFINITIONS — `elementTypes.ts`

```typescript
// ============================================================
// DESIGN SPEC — src/engine/core/nguHanh/elementTypes.ts
// ============================================================

import { GuaElement, CompassDirection } from '../../../types/fengshui.js';

// Tái xuất alias — không tạo type mới, dùng GuaElement làm nền
export type NguHanhElement = GuaElement;

export type ElementDataStatus =
  | 'known'
  | 'ambiguous'
  | 'insufficient'
  | 'unsupported';

export type ElementCertainty =
  | 'classical'    // Truy nguyên trực tiếp đến cổ thư phong thủy
  | 'applied'      // Quy ước ứng dụng hiện đại, có nguồn thứ cấp
  | 'heuristic';   // Heuristic do hệ thống thiết kế — PHẢI hiển thị disclaimer

export interface ElementAnalysisResult {
  element: NguHanhElement | null;    // null khi dataStatus ≠ 'known'
  dataStatus: ElementDataStatus;
  certainty: ElementCertainty | null; // null khi dataStatus ≠ 'known'
  sourceRef: string[];               // ID trong SOURCE_REGISTRY (rỗng khi heuristic nội bộ)
  explanation: string;
  disclaimer?: string;               // Bắt buộc khi certainty === 'heuristic'
  rawInput?: unknown;
}

// ============================================================
// ELEMENT RELATIONSHIP
// ============================================================

/** Bản chất quan hệ Ngũ Hành — không phụ thuộc vào chiều đánh giá */
export type ElementRelationType =
  | 'SAME'          // Đồng hành (cùng Ngũ Hành)
  | 'GENERATES'     // Tương sinh: source sinh ra target
  | 'GENERATED_BY'  // Tương sinh: source được target sinh ra
  | 'OVERCOMES'     // Tương khắc: source khắc target
  | 'OVERCOME_BY'   // Tương khắc: source bị target khắc
  | 'UNKNOWN';      // Một hoặc cả hai hành chưa xác định

/**
 * HarmonyScore — Điểm heuristic quy ước của hệ thống.
 *
 * QUAN TRỌNG: Đây là con số HEURISTIC do đội thiết kế quy ước,
 * không có căn cứ định lượng trong cổ thư phong thủy.
 * Phạm vi áp dụng: Chỉ dùng để xếp hạng tương đối, không phản
 * ánh tuyệt đối "mức độ" tương sinh/khắc theo cổ học.
 * Giới hạn: Không dùng để tính toán overallScore P5.
 *
 * Cơ sở lựa chọn giá trị:
 * - SAME (0.90): Đồng hành — ổn định, không xung đột.
 * - GENERATES (0.85): Tương sinh thuận — tích cực.
 * - GENERATED_BY (0.75): Tương sinh nghịch — cũng tích cực nhưng mang tính "tiêu hao" nguồn.
 * - OVERCOME_BY (0.25): Bị khắc — xung đột mạnh hơn khi mệnh người bị vật khắc.
 * - OVERCOMES (0.20): Khắc đối tượng — kém thuận lợi từ góc nhìn nội thất hoà hợp.
 * - UNKNOWN (0.50): Trung tính mặc định — không đủ dữ liệu để đánh giá.
 */
export interface ElementRelationResult {
  relationType: ElementRelationType;
  harmonyScore: number;              // 0.0–1.0, HEURISTIC
  harmonyLabel: string;              // Nhãn hiển thị
  explanation: string;               // Giải thích ngôn ngữ tự nhiên
  disclaimer: string;                // Luôn ghi rõ harmonyScore là heuristic
  sourceRef: string[];
}

// ============================================================
// FURNITURE ELEMENT PROFILE
// ============================================================

export interface FurnitureElementProfile {
  objectId: string;
  objectType: string;
  colorAnalysis: ElementAnalysisResult;
  materialAnalysis: ElementAnalysisResult;
  shapeAnalysis: ElementAnalysisResult;
  locationDirectionAnalysis: ElementAnalysisResult;   // Phương vị vị trí đặt vật
  dominantElement: NguHanhElement | null;
  dominantElementBasis: string;      // Giải thích cách chọn hành chủ đạo
  overallDataStatus: ElementDataStatus;
}

// ============================================================
// ASSESSMENT INPUT / OUTPUT
// ============================================================

export interface ElementAssessmentInput {
  personalElement: NguHanhElement | null;    // Từ GuaElement (không từ Nạp Âm)
  napAmElement: NguHanhElement | null;       // Thông tin tham khảo phụ — không dùng thay personalElement
  furnitureProfiles: FurnitureElementProfile[];
  roomDirectionAnalysis: ElementAnalysisResult;    // Hướng phòng → hành
  northBearingDeg: number | null;    // null = chưa hiệu chỉnh la bàn thực
}

export interface ElementRoomAssessment {
  personalElement: NguHanhElement | null;
  overallHarmonyScore: number | null;         // null khi personalElement không xác định
  harmonyLevel: 'excellent' | 'good' | 'neutral' | 'poor' | 'unknown';
  furnitureRelations: Array<{
    objectId: string;
    objectType: string;
    dominantElement: NguHanhElement | null;
    relation: ElementRelationResult;
    recommendations: string[];
  }>;
  keyIssues: string[];
  cures: string[];
  dataStatus: ElementDataStatus;
  disclaimers: string[];                      // Tất cả disclaimer heuristic
  engineVersion: string;
}
```

---

## 4. CHUẨN HÓA DIRECTION

### 4.1. Tái dụng CompassDirection từ P1

Module Ngũ Hành **không tạo coordinate system mới**. Tái dụng hoàn toàn từ `src/engine/core/compass.ts` (P1):

```typescript
// Các symbol được import từ P1 (read-only)
import { CompassDirection } from '../../../types/fengshui.js';
// CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

import { directionFromBearing, worldBearingOfAxis, toTrueBearing } from '../compass.js';
```

### 4.2. Quy ước North Reference

| Thuật ngữ | Định nghĩa trong hệ thống |
|---|---|
| **Model North** | Trục `−Z` trong Three.js scene (Z− = Bắc theo quy ước model) |
| **True North** | La bàn thực tế, tính từ `northBearingDeg` đã được người dùng hiệu chỉnh |
| **northBearingDeg** | Góc lệch giữa Model North và True North. `null` = chưa hiệu chỉnh; sử dụng Model North làm mặc định |
| **Bearing** | Góc tính từ True North theo chiều kim đồng hồ (0° = Bắc, 90° = Đông) |

```
northBearingDeg = null  →  đánh giá trong hệ tọa độ model, ghi rõ "chưa hiệu chỉnh la bàn"
northBearingDeg = 0     →  Model North trùng True North
northBearingDeg = 30    →  True North lệch 30° so với Model North
```

### 4.3. Xử lý Center và các trường hợp đặc biệt

| Trường hợp | Xử lý | DataStatus |
|---|---|---|
| Hướng hợp lệ (N/NE/E/SE/S/SW/W/NW) | Ánh xạ bình thường | `known` |
| **Trung tâm phòng** | Hành Thổ theo Ngũ Hành Đại Nghĩa. Cần có `'center'` riêng trong mapping, **không được ép vào một trong 8 hướng** | `known` với certainty `classical` |
| `northBearingDeg = null` | Dùng Model North, ghi rõ disclaimer "Chưa hiệu chỉnh la bàn thực" | `known` (với disclaimer) |
| Hướng null / undefined | Không thể phân loại | `insufficient` |
| Giá trị không hợp lệ (ví dụ: `"northeast"` viết thường chưa chuẩn hóa) | Thử normalize, nếu thất bại → `unsupported` | `unsupported` |

### 4.4. Direction-to-Element Mapping (chuẩn hóa)

| Input (CompassDirection \| 'center') | Element | Certainty | Source |
|---|---|---|---|
| `E` | Mộc | `classical` | SRC-NGU-HANH-CLASSIC |
| `SE` | Mộc | `classical` | SRC-NGU-HANH-CLASSIC |
| `S` | Hỏa | `classical` | SRC-NGU-HANH-CLASSIC |
| `SW` | Thổ | `classical` | SRC-NGU-HANH-CLASSIC |
| `NE` | Thổ | `classical` | SRC-NGU-HANH-CLASSIC |
| `W` | Kim | `classical` | SRC-NGU-HANH-CLASSIC |
| `NW` | Kim | `classical` | SRC-NGU-HANH-CLASSIC |
| `N` | Thủy | `classical` | SRC-NGU-HANH-CLASSIC |
| `center` | Thổ | `classical` | SRC-NGU-HANH-CLASSIC |

---

## 5. ELEMENT MAPPING — Bảng chi tiết

### 5.1. Color Mapping

Mỗi dòng có đủ: `input`, `element`, `dataStatus`, `certainty`, `sourceId`, `rationale`, `limitation`.

| Input (Color range/name) | Element | DataStatus | Certainty | SourceId | Rationale | Limitation |
|---|---|---|---|---|---|---|
| Xanh lục, lá cây (#00C000 vùng) | Mộc | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Màu Mộc (青 qīng) trong Ngũ Hành Đại Nghĩa | Xanh lam thuần không thuộc nhóm này |
| Đỏ thuần, hồng đậm (#CC0000 vùng) | Hỏa | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Màu Hỏa (赤 chì) | Hồng nhạt là `applied`, không phải `classical` |
| Vàng thuần, vàng đất (#FFD700 vùng) | Thổ | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Màu Thổ (黃 huáng) | Vàng nhạt gần trắng → Kim |
| Trắng thuần (#FFFFFF vùng) | Kim | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Màu Kim (白 bái) | Trắng sữa là `applied` |
| Đen thuần (#000000 vùng) | Thủy | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Màu Thủy (黑 hēi) | |
| Xanh navy, xanh đậm (#00008B vùng) | Thủy | `known` | `applied` | SRC-NGU-HANH-APPLIED | Phổ màu gần Đen, thuộc Thủy theo thực hành hiện đại | Không có trong cổ thư trực tiếp |
| Xanh lam nhạt (#87CEEB vùng) | Thủy | `known` | `applied` | SRC-NGU-HANH-APPLIED | Màu nước, liên kết Thủy | Có thể nhầm với Mộc nếu ngả xanh lá |
| Cam, da cam (#FFA500 vùng) | Hỏa | `known` | `applied` | SRC-NGU-HANH-APPLIED | Phổ Đỏ-Vàng, trội về Hỏa trong thực hành | Không phân biệt rõ với Thổ trong cổ thư |
| Hồng nhạt (#FFB6C1 vùng) | Hỏa | `known` | `applied` | SRC-NGU-HANH-APPLIED | Mở rộng từ phổ Đỏ | Hồng nhạt gần trắng có thể tranh luận là Kim |
| Trắng sữa, kem (#FAEBD7 vùng) | Kim | `known` | `applied` | SRC-NGU-HANH-APPLIED | Mở rộng từ Trắng thuần | |
| Vàng kim ánh (#FFD700 kim ánh) | Kim | `known` | `applied` | SRC-NGU-HANH-APPLIED | Kim loại quý, ánh sáng | Trùng vùng với Thổ-vàng; phân loại theo độ sáng và sắc độ |
| Bạc, xám sáng (#C0C0C0) | Kim | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Kim loại, thuộc Kim | |
| Tím (#800080) | Hỏa | `known` | `applied` | SRC-NGU-HANH-APPLIED | Đỏ trội trong hỗn hợp Đỏ+Xanh | Tím xanh lạnh có thể tranh luận; giữ `applied` |
| **Xám trung bình (#808080)** | null | **`ambiguous`** | — | — | Nằm giữa Kim (trắng) và Thổ (vàng-nâu), không phân loại dứt khoát | Không được ép chọn |
| **Nâu gỗ (#8B4513)** | null | **`ambiguous`** | — | — | Nâu gần Thổ (màu) nhưng vật liệu gỗ là Mộc; hai chiều mâu thuẫn | Giải thích rõ mâu thuẫn cho người dùng |
| **Xanh lục ngả vàng (#9ACD32)** | null | **`ambiguous`** | — | — | Ranh giới Mộc-Thổ không rõ ràng | |
| `null`, `""`, `undefined` | null | **`insufficient`** | — | — | Không có dữ liệu | |
| Màu mã hex không hợp lệ | null | **`unsupported`** | — | — | Format không hợp lệ | |

### 5.2. Material Mapping

| Input (material key) | Element | DataStatus | Certainty | SourceId | Rationale | Limitation |
|---|---|---|---|---|---|---|
| `wood`, `oak`, `pine`, `walnut`, `teak` | Mộc | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Gỗ tự nhiên = Mộc | |
| `mdf`, `plywood`, `particleboard` | Mộc | `known` | `applied` | SRC-NGU-HANH-APPLIED | Gốc gỗ, dù qua chế biến | Tính "thuần" thấp hơn gỗ tự nhiên |
| `bamboo`, `rattan`, `cork` | Mộc | `known` | `applied` | SRC-NGU-HANH-APPLIED | Vật liệu thực vật | |
| `cotton`, `linen`, `wool` | Mộc | `known` | `applied` | SRC-NGU-HANH-APPLIED | Sợi thực vật/động vật | Len (wool) tranh luận được; giữ `applied` |
| `iron`, `steel`, `aluminum`, `copper`, `brass` | Kim | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Kim loại = Kim | |
| `gold`, `silver` (trang trí) | Kim | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Kim loại quý | |
| `ceramic`, `porcelain`, `terracotta` | Thổ | `known` | `classical` | SRC-NGU-HANH-CLASSIC | Đất nung = Thổ | |
| `marble`, `granite`, `limestone`, `sandstone` | Thổ | `known` | `applied` | SRC-NGU-HANH-APPLIED | Khoáng sản từ lòng đất | |
| `concrete`, `cement` | Thổ | `known` | `applied` | SRC-NGU-HANH-APPLIED | Hỗn hợp xi măng + khoáng | |
| **`plastic`, `acrylic`, `pvc`** | null | **`ambiguous`** | — | — | Sản phẩm hóa học không có trong cổ thư; không thể phân loại dứt khoát | Không được ép chọn |
| **`glass`, `tempered_glass`** | null | **`ambiguous`** | — | — | Trong suốt → Thủy? Cứng và sáng → Kim? Không nhất quán | |
| **`leather`, `faux_leather`** | null | **`ambiguous`** | — | — | Da thuộc → Thổ? Hữu cơ → Mộc? | |
| `null`, `undefined`, `""` | null | **`insufficient`** | — | — | Không có dữ liệu | |
| Vật liệu không có trong catalog | null | **`unsupported`** | — | — | Ngoài phạm vi mapping | |

### 5.3. Shape Mapping (từ `RoomObject.dimensions`)

**Phương pháp phân loại:** Tính tỉ lệ từ `dimensions: { width, height, length }`.

> [!IMPORTANT]
> Tất cả shape mapping đều là **heuristic** (không có ngưỡng số cụ thể trong cổ thư). Phải hiển thị disclaimer.

| Điều kiện (từ dimensions) | Element | DataStatus | Certainty | Rationale | Limitation |
|---|---|---|---|---|---|
| `height / max(width, length) > 2.0` | Mộc | `known` | `heuristic` | Trụ cao = hình thế Mộc "vươn lên" | Ngưỡng 2.0 là quy ước thiết kế |
| `height / max(width, length) < 0.3` | Thổ | `known` | `heuristic` | Dẹt rộng = hình thế Thổ "bằng phẳng" | Ngưỡng 0.3 là quy ước thiết kế |
| `abs(width - length) / max(width,length) < 0.1` AND tỉ lệ cao vừa (0.3–2.0) | Kim | `known` | `heuristic` | Vuông cân đối = hình thế Kim "tròn/đều" | Heuristic yếu, không phân biệt rõ |
| Hình có nhọn / phần phụ nhô ra (future subType field) | Hỏa | `known` | `heuristic` | Nhọn = hình thế Hỏa | Cần `subType` metadata, chưa triển khai |
| Không phân loại được theo tỉ lệ | null | `ambiguous` | — | — | |
| `dimensions = null` hoặc thiếu | null | `insufficient` | — | — | |

**SourceId cho tất cả shape mapping:** SRC-NGU-HANH-CLASSIC (nguyên lý hình dạng) + disclaimer heuristic cho ngưỡng số.

### 5.4. Direction Mapping

Xem mục 4.4 ở trên — đã có đầy đủ.

---

## 6. ELEMENT RELATIONSHIP ENGINE

### 6.1. Vòng Tương sinh / Tương khắc

```
Tương sinh:  Kim → Thủy → Mộc → Hỏa → Thổ → Kim
Tương khắc:  Kim → Mộc → Thổ → Thủy → Hỏa → Kim
```

### 6.2. HarmonyScore — Heuristic Parameters

> [!NOTE]
> Các giá trị sau là **heuristic quy ước của hệ thống**. Không có căn cứ định lượng trong cổ thư phong thủy.
> Phạm vi áp dụng: Chỉ dùng để xếp hạng tương đối ưu tiên tư vấn — không tính vào `overallScore` P5.
> Giới hạn: Không phản ánh "độ mạnh" tương sinh/khắc; không có nghiên cứu khoa học xác nhận.
> Kiểm thử: 100% unit test NH-REL-* phải pass với giá trị chính xác (không được fuzzy match).

| ElementRelationType | harmonyScore | harmonyLabel | Giải thích chiều đánh giá |
|---|---|---|---|
| `SAME` | 0.90 | "Điều hòa vững chắc" | Đồng hành — ổn định, củng cố lẫn nhau |
| `GENERATES` | 0.85 | "Hỗ trợ tích cực" | Mệnh người sinh ra hành đồ vật — tốt cho người dùng |
| `GENERATED_BY` | 0.75 | "Được hỗ trợ" | Hành đồ vật sinh ra mệnh người — tích cực nhưng "tiêu hao" |
| `OVERCOME_BY` | 0.25 | "Bị xung khắc" | Mệnh người bị đồ vật khắc — bất lợi hơn |
| `OVERCOMES` | 0.20 | "Xung khắc đối tượng" | Mệnh người khắc đồ vật — kém thuận lợi từ góc nhìn hoà hợp |
| `UNKNOWN` | 0.50 | "Chưa xác định" | Trung tính mặc định khi thiếu dữ liệu |

---

## 7. ĐẶC TẢ 7 QUY TẮC NH

### NH-COLOR-01 — Màu sắc nội thất tương sinh / đồng hành bản mệnh

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-COLOR-01` |
| **Mục tiêu** | Phát hiện khi màu sắc chủ đạo đồ vật tương sinh hoặc đồng hành với bản mệnh gia chủ |
| **Input** | `personalElement: NguHanhElement`, `furniture.colorAnalysis: ElementAnalysisResult` |
| **Preconditions** | `personalElement ≠ null` AND `colorAnalysis.dataStatus === 'known'` |
| **Evaluation logic** | (1) Lấy `colorElement` từ `colorAnalysis.element`. (2) Gọi `getElementRelation(personalElement, colorElement)`. (3) Nếu `relationType === 'SAME' \| 'GENERATES' \| 'GENERATED_BY'` → `verdict: 'pass'`. |
| **Expected output** | `verdict: 'pass'`, `severity: 'info'`, explanation trích dẫn hành |
| **Certainty** | `applied` (mapping màu có thể là `applied` hoặc `classical`) |
| **DataStatus output** | `sufficient` |
| **Source** | SRC-NGU-HANH-CLASSIC + source của color mapping tương ứng |
| **Explanation template** | `"Màu [màu] ([hành]) tương [sinh/đồng hành] với bản mệnh [tên hành] của gia chủ, hỗ trợ cân bằng Ngũ Hành trong không gian."` |
| **Edge cases** | (1) `colorAnalysis.dataStatus === 'ambiguous'` → `verdict: 'unknown'`, không verdict pass. (2) `personalElement === null` → `dataStatus: 'insufficient'`, `verdict: 'unknown'`. |
| **Test IDs** | NH-RULE-01, NH-RULE-02, NH-RULE-05, NH-RULE-11 |
| **Mapping** | Chỉ áp dụng khi relation là sinh/đồng hành; nếu không, không tạo kết luận (rule NH-COLOR-02 xử lý phần còn lại) |

---

### NH-COLOR-02 — Màu sắc nội thất tương khắc bản mệnh

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-COLOR-02` |
| **Mục tiêu** | Phát hiện khi màu sắc chủ đạo đồ vật tương khắc với bản mệnh |
| **Input** | `personalElement`, `furniture.colorAnalysis` |
| **Preconditions** | `personalElement ≠ null` AND `colorAnalysis.dataStatus === 'known'` |
| **Evaluation logic** | (1) Lấy `colorElement`. (2) Nếu `relationType === 'OVERCOME_BY'` → `verdict: 'fail'`, `severity: 'major'`. Nếu `relationType === 'OVERCOMES'` → `verdict: 'warn'`, `severity: 'minor'`. |
| **Expected output** | `verdict: 'fail'` hoặc `'warn'` |
| **Source** | SRC-NGU-HANH-CLASSIC |
| **Explanation template** | `"Màu [màu] ([hành]) tương khắc với bản mệnh [tên hành]. [Giải thích quan hệ khắc]. Cân nhắc thay bằng màu [gợi ý màu tương sinh]."` |
| **Edge cases** | Nếu `relationType === 'UNKNOWN'` hoặc `dataStatus ≠ 'known'` → không áp dụng rule, trả `verdict: 'unknown'`. |
| **Test IDs** | NH-RULE-03, NH-RULE-04 |

---

### NH-MAT-01 — Vật liệu hỗ trợ bản mệnh

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-MAT-01` |
| **Mục tiêu** | Phát hiện khi vật liệu chính tương sinh hoặc đồng hành với bản mệnh |
| **Input** | `personalElement`, `furniture.materialAnalysis` |
| **Preconditions** | `personalElement ≠ null` AND `materialAnalysis.dataStatus === 'known'` AND `objectType` thuộc `['bed', 'desk', 'wardrobe']` |
| **Evaluation logic** | Tương tự NH-COLOR-01 nhưng dùng `materialAnalysis.element` |
| **Applicability** | `'optional'` — chỉ áp dụng khi có dữ liệu `material` |
| **Edge cases** | `material: 'plastic'` → `dataStatus: 'ambiguous'` → `verdict: 'unknown'`. Vật liệu hỗn hợp cũng → `ambiguous`. |
| **Test IDs** | NH-RULE-06, NH-RULE-13 |

---

### NH-MAT-02 — Vật liệu xung khắc bản mệnh

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-MAT-02` |
| **Mục tiêu** | Phát hiện khi vật liệu chính tương khắc với bản mệnh |
| **Input** | `personalElement`, `furniture.materialAnalysis` |
| **Preconditions** | `personalElement ≠ null` AND `materialAnalysis.dataStatus === 'known'` AND `objectType` thuộc `['bed', 'desk', 'wardrobe']` |
| **Evaluation logic** | Tương tự NH-COLOR-02 nhưng dùng `materialAnalysis.element` |
| **Certainty** | `applied` hoặc `classical` phụ thuộc vào vật liệu cụ thể |
| **Edge cases** | `material: 'glass'` → `ambiguous` → không áp dụng rule |
| **Test IDs** | NH-RULE-07 |

---

### NH-SHAPE-01 — Hình dạng đồ vật tương sinh bản mệnh

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-SHAPE-01` |
| **Mục tiêu** | Phát hiện khi hình dạng đồ vật (từ dimensions) tương sinh hoặc đồng hành |
| **Input** | `personalElement`, `furniture.shapeAnalysis` |
| **Preconditions** | `personalElement ≠ null` AND `shapeAnalysis.dataStatus === 'known'` |
| **Evaluation logic** | Tương tự NH-COLOR-01 nhưng dùng `shapeAnalysis.element` |
| **Certainty** | `heuristic` — phải kèm disclaimer |
| **Disclaimer bắt buộc** | `"Phân loại hình dạng Ngũ Hành dựa trên tỉ lệ chiều kích là quy ước ứng dụng hiện đại, không phải nguyên lý cổ thư có ngưỡng định lượng."` |
| **Applicability** | `'optional'` |
| **Edge cases** | Không có shape analysis → `insufficient`. Tỉ lệ nằm giữa các ngưỡng → `ambiguous`. |
| **Test IDs** | NH-RULE-08 |

---

### NH-DIR-01 — Phương vị đặt đồ vật phù hợp Ngũ Hành

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-DIR-01` |
| **Mục tiêu** | Phát hiện khi phương vị đặt đồ vật (tính theo vị trí trong phòng) tương sinh/khắc bản mệnh |
| **Input** | `personalElement`, `furniture.locationDirectionAnalysis`, `northBearingDeg` |
| **Preconditions** | `personalElement ≠ null` AND `locationDirectionAnalysis.dataStatus === 'known'` |
| **Evaluation logic** | (1) Tính sector từ vị trí đồ vật trong phòng (dùng `sectorEngine` hiện có). (2) Map sector → CompassDirection. (3) Map direction → element. (4) Tính relation. |
| **northBearingDeg = null** | Dùng Model North, kèm disclaimer "Chưa hiệu chỉnh la bàn thực, kết quả có thể lệch" |
| **Certainty** | `classical` cho mapping direction, nhưng `applied` cho bước tính sector từ 3D position |
| **Áp dụng cho** | `['bed', 'desk']` ưu tiên; các vật khác `'optional'` |
| **Edge cases** | Vật ở trung tâm → `center` → Thổ. Vật ở biên không xác định sector → `insufficient`. |
| **Test IDs** | NH-RULE-09, NH-RULE-10 |

---

### NH-ROOM-01 — Màu sắc tổng thể phòng

| Trường | Nội dung |
|---|---|
| **Rule ID** | `NH-ROOM-01` |
| **Mục tiêu** | Đánh giá màu chủ đạo toàn phòng (tường, sàn, trần) phù hợp bản mệnh không |
| **Input** | `personalElement`, `roomColorElement: ElementAnalysisResult` (từ metadata phòng, chưa có trong hệ thống hiện tại) |
| **Preconditions** | `personalElement ≠ null` AND room color metadata tồn tại trong scene |
| **Trạng thái hiện tại** | **NOT IMPLEMENTABLE YET** — `RoomConfig` hiện tại không có field màu sắc phòng. Cần thêm `wallColor?: string` và `floorColor?: string` vào `RoomConfig` (additive) ở P8-M0. |
| **Verdict hiện tại** | `verdict: 'unknown'`, `dataStatus: 'insufficient'` cho đến khi metadata phòng có |
| **Test IDs** | NH-RULE-R01 (placeholder test) |

---

## 8. DANH SÁCH RỦI RO & OPEN RISKS

| Risk ID | Mô tả | Mức độ | Biện pháp |
|---|---|---|---|
| R-01 | `RoomObject.color` chưa có convention format (hex/name/rgb) | CAO | Quy ước bắt buộc: lowercase hex 7 ký tự (`#rrggbb`) trong P8-M0 |
| R-02 | `RoomObject.material` chưa tồn tại | CAO | Thêm `material?: string` additive trong P8-M0 |
| R-03 | `RoomConfig` không có màu phòng | TRUNG | NH-ROOM-01 trả `insufficient` đến khi có; thêm `wallColor?`, `floorColor?` |
| R-04 | HarmonyScore được nhầm là chỉ số phong thủy cổ điển | CAO | Disclaimer bắt buộc trong mọi output có HarmonyScore |
| R-05 | Circular dependency giữa `nguHanh/` và core modules | CAO | Kiểm tra tự động bằng `madge` hoặc tương đương |
| R-06 | Nạp Âm bị dùng thay Quái Mệnh | TRUNG | Explanation engine luôn ghi rõ nguồn gốc element |
| R-07 | NH-ROOM-01 không triển khai được trong P8-M1 | TRUNG | Placeholder test, triển khai khi `RoomConfig` cập nhật |
| R-08 | Shape mapping ngưỡng số chưa được xác nhận | TRUNG | Gắn `certainty: 'heuristic'`, cho phép tùy chỉnh ngưỡng trong config |

---

## 9. ARCHITECTURAL DECISION RECORDS (ADRs)

| ADR-ID | Quyết định | Trạng thái V1.1 |
|---|---|---|
| ADR-P8-01 | `NguHanhElement = GuaElement` — không tạo type thừa | ✅ Giữ nguyên |
| ADR-P8-02 | Không triển khai Tương thừa/Tương vũ | ✅ Giữ nguyên |
| ADR-P8-03 | HarmonyScore độc lập với `overallScore` P5 | ✅ Làm rõ thêm |
| ADR-P8-04 | Module trong `src/engine/core/nguHanh/` | ✅ Giữ nguyên |
| ADR-P8-05 | `heuristic` phải khai báo trong `certainty` + `disclaimer` | ✅ Mở rộng — thêm `disclaimer?: string` bắt buộc |
| ADR-P8-06 | `RoomObject.material` thêm là optional | ✅ Giữ nguyên |
| ADR-P8-07 | Nạp Âm chỉ là thông tin tham khảo phụ | ✅ Giữ nguyên |
| ADR-P8-08 | Màu `ambiguous` không được ép phân loại | ✅ Làm rõ trong cả 4 DataStatus |
| **ADR-P8-09** | `ElementDataStatus` là enum 4 giá trị, không dùng `null` thay thế | ✅ Mới trong V1.1 |
| **ADR-P8-10** | `ElementRelationType` và `HarmonyScore` là hai khái niệm riêng biệt | ✅ Mới trong V1.1 |
| **ADR-P8-11** | Tái dụng `CompassDirection` từ P1, không tạo coordinate system mới | ✅ Mới trong V1.1 |
| **ADR-P8-12** | `'center'` là giá trị hợp lệ cho Direction mapping, không ép vào 8 hướng | ✅ Mới trong V1.1 |

---

## 10. MILESTONES & GATES

| Milestone | Phạm vi | TC | Gate kiểm định |
|---|---|---|---|
| **P8-M0** (APPROVED) | Additive types, source registry entries, `RoomObject.material`, `RuleCategory: 'ngu_hanh'` | NH-REG-01 | Full 14 Suites PASS + người dùng confirm |
| **P8-M1** (LOCKED) | `elementMapping.ts` — 4 bảng mapping | NH-MAP-* (60 TC) | NH-MAP pass ≥ 90%, regression PASS |
| **P8-M2** (LOCKED) | `elementRelationship.ts`, `elementRuleEngine.ts` — 7 rules | NH-REL-*, NH-RULE-* (55 TC) | Vòng Ngũ Hành 100%, regression PASS |
| **P8-M3** (LOCKED) | `elementAssessment.ts`, `elementExplainer.ts` | NH-INT-*, NH-REG-* | P5 invariant, full regression, người dùng confirm |

---

## 11. TIÊU CHÍ NGHIỆM THU THIẾT KẾ V1.1

| # | Tiêu chí | Phương pháp |
|---|---|---|
| DA-01 | Mọi rule NH-* có `sourceRef` trong `SOURCE_REGISTRY` | Review P8_RESEARCH_SOURCES.md V1.1 |
| DA-02 | Phân biệt rõ `classical`, `applied`, `heuristic` trong mọi mapping | Review bảng mapping mục 5 |
| DA-03 | Điểm P5 `overallScore` không thay đổi | Architecture + test NH-INT-03, NH-INT-04 |
| DA-04 | `RoomObject` chỉ thêm field optional | Additive diff review |
| DA-05 | Test Plan cover 4 DataStatus + 6 RelationType | Review P8_TEST_PLAN.md V1.1 |
| DA-06 | Không có circular dependency với P0–P7.5 | Dependency graph tự động |
| DA-07 | Thiếu dữ liệu → `dataStatus: 'insufficient'`, không verdict | NH-EDGE-* test coverage |
| DA-08 | Màu ambiguous → không ép phân loại | NH-MAP-COLOR-13,14,15 |
| **DA-09** | HarmonyScore được ghi rõ là heuristic trong mọi output | Code review + test NH-INT-07 |
| **DA-10** | `center` direction được xử lý riêng, không ép vào 8 hướng | NH-MAP-DIR-10 test |
| **DA-11** | 7 rule specs có đầy đủ preconditions, edge cases, test IDs | Review mục 7 |
| **DA-12** | NH-ROOM-01 trả `insufficient` khi chưa có room color metadata | NH-RULE-R01 |

---

*Tài liệu P8_ARCHITECTURE_SPEC.md V1.1 — DESIGN ONLY. Không có source code nào được tạo hoặc sửa đổi.*
