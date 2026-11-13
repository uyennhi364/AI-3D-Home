# P8.4 DESIGN SPECIFICATION — NGŨ HÀNH UI & VISUALIZATION INTEGRATION
## AI Feng Shui Studio | Phase P8.4

**Phiên bản:** 1.0  
**Ngày:** 13/11/2026  
**Tác giả:** AI Engineering Team  
**Trạng thái:** DESIGN COMPLETE — CHỜ PHÊ DUYỆT TRIỂN KHAI  
**Baseline:** v1.0.0-p7.5 + P8-M0 + P8-M1 + P8-M2 + P8-M3 (ALL ACCEPTED)

---

## 1. MỤC TIÊU P8.4

Tích hợp kết quả engine Ngũ Hành (P8-M0 → P8-M3) vào giao diện người dùng hiện tại theo nguyên tắc:

1. **UI chỉ hiển thị** — Không tính toán trong JSX. Mọi verdict đến từ deterministic engine.
2. **Additive only** — Không xóa hoặc sửa logic P0–P7.5.
3. **Không có overallHarmonyScore** — `harmonyLevel` text-only, không số.
4. **UNKNOWN ≠ PASS** — Luôn hiển thị rõ ràng và khác biệt.
5. **Heuristic disclaimer bắt buộc** — Mỗi rule có `certainty === 'heuristic'` phải có disclaimer chip.
6. **Verdict từ engine** — Gemini API không được phép override kết quả rule engine.

---

## 2. KIẾN TRÚC TỔNG QUAN

```
App.tsx
  ├── STATE: nguHanhAssessment: DetailedRoomElementAssessment | null
  ├── COMPUTE: evaluateRoomElementAssessment() → trong handleTriggerAiAnalysis
  ├── PASS TO: UnifiedAssessmentReportModal (tab ngu_hanh)
  ├── PASS TO: FengShuiAuditPanel (harmonyLevel badge)
  └── PASS TO: ObjectPropertiesPanel (per-object summary via selectedObject)
            ↑ computed on-demand: evaluateFurnitureAssessment()
```

### 2.1. Data Flow

```
INPUT:
  userProfile.element         → personalElement (NguHanhElement | null)
  roomConfig.wallColor        → NH-ROOM-01 wall analysis
  roomConfig.floorColor       → NH-ROOM-01 floor analysis
  roomConfig.northBearingDeg  → direction calibration
  objects[i].color            → color mapping per furniture
  objects[i].material         → material mapping per furniture
  objects[i].dimensions       → shape mapping per furniture

COMPUTATION (pure functions, no side effects):
  evaluateRoomElementAssessment(roomConfig, objects, personalElement, options)
    → DetailedRoomElementAssessment

  evaluateFurnitureAssessment(furniture, personalElement, options)
    → FurnitureAssessmentSummary    (computed on object select)

  explainRoomElementAssessment(assessment)
    → Record<string, NguHanhExplanation[]>  (formatted Vietnamese text)

OUTPUT TO UI:
  → UnifiedAssessmentReportModal: tab "Ngũ Hành" → <NguHanhAssessmentPanel>
  → FengShuiAuditPanel: harmonyLevel badge (text, không số)
  → ObjectPropertiesPanel: <NguHanhObjectCard> per selected object
```

---

## 3. COMPONENTS MỚI CẦN TẠO

### 3.1. `NguHanhVerdictBadge.tsx`

**Mục đích:** Reusable badge hiển thị verdict của một rule.

**Props:**
```typescript
interface NguHanhVerdictBadgeProps {
  verdict: 'pass' | 'warn' | 'fail' | 'unknown' | 'n/a';
  size?: 'sm' | 'md';
}
```

**Mapping hiển thị:**

| verdict   | Label          | CSS class / màu          |
|-----------|---------------|--------------------------|
| `pass`    | ✅ HỢP CÁCH   | green (bg-green-100 text-green-800) |
| `warn`    | ⚠️ CẢNH BÁO  | amber (bg-amber-100 text-amber-800) |
| `fail`    | ❌ XUNG KHẮC  | red (bg-red-100 text-red-800)       |
| `unknown` | ❓ CHƯA XÁC ĐỊNH | gray (bg-gray-100 text-gray-600) |
| `n/a`     | — N/A          | light gray (bg-gray-50 text-gray-400) |

> [!IMPORTANT]
> `unknown` PHẢI khác biệt rõ ràng với `pass`. Không dùng màu xanh cho `unknown`.

---

### 3.2. `NguHanhElementBadge.tsx`

**Mục đích:** Reusable chip hiển thị một hành Ngũ Hành.

**Props:**
```typescript
interface NguHanhElementBadgeProps {
  element: NguHanhElement | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}
```

**Mapping màu:**

| element | Ký hiệu | Màu chip |
|---------|---------|----------|
| `Kim`   | ⚪ Kim  | silver/white — `bg-gray-100 text-gray-700` |
| `Mộc`   | 🟢 Mộc | green — `bg-green-100 text-green-800` |
| `Thủy`  | 🔵 Thủy | blue — `bg-blue-100 text-blue-800` |
| `Hỏa`   | 🔴 Hỏa | red — `bg-red-100 text-red-800` |
| `Thổ`   | 🟡 Thổ | yellow/amber — `bg-yellow-100 text-yellow-800` |
| `null`  | ❓ Chưa xác định | `bg-gray-50 text-gray-400` |

---

### 3.3. `NguHanhObjectCard.tsx`

**Mục đích:** Card per-object hiển thị kết quả Ngũ Hành cho một đồ nội thất.

**Props:**
```typescript
interface NguHanhObjectCardProps {
  summary: FurnitureAssessmentSummary;
  personalElement: NguHanhElement | null;
  expanded?: boolean;
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Tên đồ vật]              [HÀNH CHỦ ĐẠO] │
│ ─────────────────────────────────────── │
│ Màu sắc:    [#RRGGBB] → [Hành]  [status] │
│ Chất liệu:  [wood]    → [Hành]  [status] │
│ Hình dạng:  [tỉ lệ]   → [Hành]  [status] │
│ Hướng:      [Đông]    → [Hành]  [status] │
│ ─────────────────────────────────────── │
│ KẾT QUẢ RULES:                          │
│  NH-COLOR-01  [VERDICT] Mô tả ngắn...   │
│  NH-COLOR-02  [VERDICT] Mô tả ngắn...   │
│  NH-MAT-01    [VERDICT] ...             │
│  ...                                    │
│ ─────────────────────────────────────── │
│ PASS: X | WARN: Y | FAIL: Z | ?: W      │
│ [Xem chi tiết ▼]                        │
└──────────────────────────────────────────┘
```

**Expandable section (khi click "Xem chi tiết"):**
Mỗi rule card hiển thị đầy đủ 9 trường từ `NguHanhExplanation`:
1. `subject` — Đối tượng được đánh giá
2. `attribute` — Thuộc tính được đánh giá
3. `personalElement` — Bản mệnh người dùng
4. `attributeElement` — Hành của thuộc tính
5. `relationship` — Quan hệ Ngũ Hành
6. `verdict` — Kết quả rule
7. `rationale` — Lý do / bằng chứng
8. `sourceRefs` — Nguồn tham chiếu (chips)
9. `certainty` — Mức độ chắc chắn + disclaimer nếu heuristic

> [!WARNING]
> Rule có `certainty === 'heuristic'` phải hiển thị ⚠️ heuristic disclaimer chip ngay trong card — không được ẩn.

---

### 3.4. `NguHanhAssessmentPanel.tsx`

**Mục đích:** Nội dung đầy đủ của tab "Ngũ Hành" trong `UnifiedAssessmentReportModal`.

**Props:**
```typescript
interface NguHanhAssessmentPanelProps {
  assessment: DetailedRoomElementAssessment | null;
  personalElement: NguHanhElement | null;
}
```

**Sections layout:**

```
┌────────────────────────────────────────────────────────┐
│ TỔNG QUAN NGŨ HÀNH PHÒNG                              │
│ Bản mệnh: [Kim] ← <NguHanhElementBadge>               │
│ Mức hài hòa: [Hài hòa] ← text, KHÔNG số               │
│ PASS: X | WARN: Y | FAIL: Z | ?: W | N/A: V            │
├────────────────────────────────────────────────────────┤
│ VẤN ĐỀ TRỌNG YẾU (keyIssues)                          │
│ • [Mô tả vấn đề 1]                                     │
│ • [Mô tả vấn đề 2]                                     │
├────────────────────────────────────────────────────────┤
│ GỢI Ý KHẮC PHỤ (cures / remedies)                     │
│ • [Gợi ý 1]                                            │
│ • [Gợi ý 2]                                            │
├────────────────────────────────────────────────────────┤
│ CHI TIẾT TỪNG ĐỒ NỘI THẤT                             │
│ <NguHanhObjectCard> per furnitureSummaries[i]          │
├────────────────────────────────────────────────────────┤
│ KẾT QUẢ PHÒNG (NH-ROOM-01)                            │
│ Màu tường: [wallColor] → [Hành] [VERDICT]              │
│ Màu sàn:   [floorColor] → [Hành] [VERDICT]            │
├────────────────────────────────────────────────────────┤
│ NGUỒN THAM CHIẾU                                       │
│ [SRC-NGU-HANH-DAI-NGHIA] [SRC-BAT-TRACH-MINH-KINH]... │
├────────────────────────────────────────────────────────┤
│ ⚠️ DISCLAIMER TOÀN CỤC                                 │
│ "Phân tích Ngũ Hành mang tính tham khảo. AI Feng Shui │
│  Studio không thay thế tư vấn phong thủy chuyên nghiệp.│
│  Các quy tắc heuristic được đánh dấu riêng."           │
└────────────────────────────────────────────────────────┘
```

**UX States:**

| State | Trigger | Hiển thị |
|-------|---------|----------|
| `no_profile` | `personalElement === null` | Banner: "Vui lòng cung cấp thông tin bản mệnh để xem phân tích Ngũ Hành" + nút mở Profile modal |
| `no_assessment` | `assessment === null` | Banner: "Chưa chạy phân tích. Nhấn 'Phân tích AI' để bắt đầu." |
| `empty_room` | `furnitureSummaries.length === 0` | "Phòng chưa có đồ nội thất." |
| `all_unknown` | `unknownCount === totalEvaluated` | "Thiếu dữ liệu thuộc tính. Vui lòng bổ sung màu sắc, chất liệu cho đồ nội thất." |
| `normal` | Có assessment đủ dữ liệu | Full panel |

---

## 4. COMPONENTS CẦN SỬA (ADDITIVE ONLY)

### 4.1. `UnifiedAssessmentReportModal.tsx`

**Thay đổi:**

1. Mở rộng union type `activeTab`:
   ```typescript
   // Before:
   'all' | 'geometric' | 'traditional' | 'personal' | 'environmental' | 'ergonomic' | 'data_quality' | 'sources'
   // After (thêm 'ngu_hanh'):
   'all' | 'geometric' | 'traditional' | 'personal' | 'environmental' | 'ergonomic' | 'data_quality' | 'sources' | 'ngu_hanh'
   ```

2. Thêm prop mới (optional — backward compatible):
   ```typescript
   nguHanhAssessment?: DetailedRoomElementAssessment | null;
   personalElement?: NguHanhElement | null;
   ```

3. Thêm tab button "Ngũ Hành 🌿" trong tab bar (sau tab `sources`).

4. Thêm render block:
   ```tsx
   {activeTab === 'ngu_hanh' && (
     <NguHanhAssessmentPanel
       assessment={nguHanhAssessment ?? null}
       personalElement={personalElement ?? null}
     />
   )}
   ```

> [!NOTE]
> Không xóa các tab hiện có. `ngu_hanh` tab hoàn toàn additive. Nếu `nguHanhAssessment` không được pass (old call sites), tab Ngũ Hành hiển thị empty state.

---

### 4.2. `ObjectPropertiesPanel.tsx`

**Thay đổi:**

1. Thêm props optional:
   ```typescript
   nguHanhSummary?: FurnitureAssessmentSummary | null;
   personalElement?: NguHanhElement | null;
   ```

2. Render `<NguHanhObjectCard>` ngay dưới section "PHONG THỦY ĐỒ VẬT" (không xóa section cũ):
   ```tsx
   {nguHanhSummary && personalElement && (
     <div className="mt-4">
       <h4>Ngũ Hành Đồ Vật</h4>
       <NguHanhObjectCard
         summary={nguHanhSummary}
         personalElement={personalElement}
       />
     </div>
   )}
   ```

---

### 4.3. `FengShuiAuditPanel.tsx`

**Thay đổi:**

1. Thêm prop optional:
   ```typescript
   nguHanhLevel?: ElementRoomAssessment['harmonyLevel'];
   ```

2. Thêm harmonyLevel badge nhỏ trong overview area, bên cạnh `overallScore`:

**Mapping `harmonyLevel` → Label tiếng Việt:**

| harmonyLevel | Label          |
|-------------|---------------|
| `excellent`  | 🌟 Rất hài hòa |
| `good`       | ✅ Hài hòa     |
| `neutral`    | 🔵 Trung bình  |
| `poor`       | ⚠️ Chưa hài hòa |
| `unknown`    | ❓ Chưa xác định |

> [!WARNING]
> KHÔNG hiển thị `overallHarmonyScore` (luôn là `null`). Chỉ hiển thị `harmonyLevel` text label.

---

### 4.4. `App.tsx`

**Thay đổi:**

1. Thêm state:
   ```typescript
   const [nguHanhAssessment, setNguHanhAssessment] =
     useState<DetailedRoomElementAssessment | null>(null);
   ```

2. Trong `handleTriggerAiAnalysis` (sau khi unified assessment chạy xong):
   ```typescript
   import { evaluateRoomElementAssessment } from './engine/core/nguHanh/elementAssessment.js';
   
   const personalElement = userProfile?.element ?? null;
   const nhAssessment = evaluateRoomElementAssessment(
     roomConfig,
     objects,
     personalElement,
     { northBearingDeg: roomConfig.northBearingDeg ?? null }
   );
   setNguHanhAssessment(nhAssessment);
   ```

3. Pass `nguHanhAssessment` và `personalElement` vào `UnifiedAssessmentReportModal`:
   ```tsx
   <UnifiedAssessmentReportModal
     ...existingProps
     nguHanhAssessment={nguHanhAssessment}
     personalElement={userProfile?.element ?? null}
   />
   ```

4. Pass `nguHanhLevel` vào `FengShuiAuditPanel`:
   ```tsx
   <FengShuiAuditPanel
     ...existingProps
     nguHanhLevel={nguHanhAssessment?.harmonyLevel}
   />
   ```

5. Per-object NH summary trong `ObjectPropertiesPanel` — tính `useMemo` khi `selectedObject` thay đổi:
   ```typescript
   import { evaluateFurnitureAssessment } from './engine/core/nguHanh/elementAssessment.js';
   
   const selectedObjectNguHanh = useMemo(() => {
     if (!selectedObject || !userProfile?.element) return null;
     return evaluateFurnitureAssessment(
       selectedObject,
       userProfile.element,
       { northBearingDeg: roomConfig.northBearingDeg ?? null }
     );
   }, [selectedObject, userProfile?.element, roomConfig.northBearingDeg]);
   ```

---

## 5. SOURCE & DISCLAIMER PRESENTATION

### 5.1. Source ID Chips

Mỗi rule card hiển thị source IDs dưới dạng chips nhỏ:

```
Sources: [SRC-NGU-HANH-DAI-NGHIA] [SRC-BAT-TRACH-MINH-KINH]
```

Clicking chip → tooltip hoặc popover hiển thị:
- Source title
- Source status (classical / applied / heuristic)
- Mô tả ngắn

### 5.2. Heuristic Disclaimer

Các rule có `certainty === 'heuristic'` (hiện tại: **NH-SHAPE-01**) phải hiển thị:

```
⚠️ Quy tắc heuristic — Dựa trên quy ước nội bộ AI Studio,
   chưa có nguồn cổ điển trực tiếp. Mang tính tham khảo.
```

Disclaimer này phải xuất hiện:
- Trực tiếp trong rule card (không ẩn sau expander)
- Trong tooltip của verdict badge
- Trong section Disclaimer toàn cục của panel

### 5.3. Ambiguous Disclaimer

Màu sắc hoặc chất liệu có `dataStatus === 'ambiguous'`:

```
🔶 Không đủ cơ sở phân loại dứt khoát — thuộc tính này
   có thể thuộc nhiều hành. Verdict: UNKNOWN.
```

### 5.4. Global Disclaimer

Luôn hiển thị ở cuối `NguHanhAssessmentPanel`:

> Phân tích Ngũ Hành do AI Feng Shui Studio thực hiện mang tính tham khảo học thuật. Kết quả không thay thế tư vấn từ chuyên gia phong thủy có chuyên môn. Các quy tắc được đánh dấu ⚠️ Heuristic là quy ước nội bộ, chưa được xác nhận bởi văn bản cổ điển.

---

## 6. DANH SÁCH FILE

### 6.1. File Mới Cần Tạo

```
src/components/NguHanhVerdictBadge.tsx      ← Reusable verdict badge
src/components/NguHanhElementBadge.tsx      ← Reusable element chip
src/components/NguHanhObjectCard.tsx        ← Per-object NH card
src/components/NguHanhAssessmentPanel.tsx   ← Full tab panel
tests/p8_4_ui_integration.test.ts           ← Unit tests P8.4
reports/P8_4_DESIGN_SPEC.md                 ← This document (ROOT)
AI-TTNTTKD-main/reports/P8_4_DESIGN_SPEC.md← Mirror
```

### 6.2. File Cần Sửa (Additive Only)

```
src/components/UnifiedAssessmentReportModal.tsx  ← Add ngu_hanh tab
src/components/ObjectPropertiesPanel.tsx          ← Add NH mini-card
src/components/FengShuiAuditPanel.tsx             ← Add harmonyLevel badge
src/App.tsx                                       ← Compute & pass NH state
reports/PROGRESS.md                               ← Update status
AI-TTNTTKD-main/reports/PROGRESS.md              ← Mirror
```

### 6.3. File KHÔNG được chạm vào

```
src/engine/**                           ← Frozen after P8-M3
src/engine/core/nguHanh/**              ← Frozen after P8-M3
tests/p8_m*_*.test.ts                   ← All P8 engine tests frozen
src/engine/unifiedAssessment.ts         ← P5 pipeline frozen
Any test expected values                ← NEVER modify to force PASS
```

---

## 7. TEST PLAN P8.4

### 7.1. Unit Tests — `tests/p8_4_ui_integration.test.ts`

**Target: 40+ assertions**

| Test ID | Nội dung | Expected |
|---------|---------|----------|
| UI-01 | `NguHanhVerdictBadge` render `pass` | class chứa 'green', label 'HỢP CÁCH' |
| UI-02 | `NguHanhVerdictBadge` render `warn` | class chứa 'amber', label 'CẢNH BÁO' |
| UI-03 | `NguHanhVerdictBadge` render `fail` | class chứa 'red', label 'XUNG KHẮC' |
| UI-04 | `NguHanhVerdictBadge` render `unknown` | class chứa 'gray', KHÔNG 'green' |
| UI-05 | `NguHanhVerdictBadge` render `n/a` | label 'N/A', text muted |
| UI-06 | `NguHanhElementBadge` Kim | class chứa 'gray' |
| UI-07 | `NguHanhElementBadge` Mộc | class chứa 'green' |
| UI-08 | `NguHanhElementBadge` Thủy | class chứa 'blue' |
| UI-09 | `NguHanhElementBadge` Hỏa | class chứa 'red' |
| UI-10 | `NguHanhElementBadge` Thổ | class chứa 'yellow' |
| UI-11 | `NguHanhElementBadge` null | label chứa 'Chưa xác định' |
| UI-12 | `NguHanhObjectCard` hiển thị 4 attribute rows | màu, chất liệu, hình dạng, hướng |
| UI-13 | `NguHanhObjectCard` summary PASS/WARN/FAIL/? counts đúng | counts khớp rules |
| UI-14 | `NguHanhObjectCard` rule `NH-SHAPE-01` hiện disclaimer | disclaimer text visible |
| UI-15 | `NguHanhObjectCard` unknown verdict KHÔNG hiện màu green | assert no green class |
| UI-16 | `NguHanhAssessmentPanel` null assessment → empty state | 'Chưa chạy phân tích' |
| UI-17 | `NguHanhAssessmentPanel` null personalElement → no_profile state | 'Vui lòng cung cấp' |
| UI-18 | `NguHanhAssessmentPanel` KHÔNG hiển thị số cho harmonyScore | không có text dạng '0.X' |
| UI-19 | `NguHanhAssessmentPanel` hiển thị harmonyLevel text | 'Hài hòa' / 'Chưa xác định'... |
| UI-20 | `NguHanhAssessmentPanel` global disclaimer hiện | disclaimer text visible |
| UI-21 | `NguHanhAssessmentPanel` source IDs hiện dưới dạng chips | 'SRC-' prefix visible |
| UI-22 | harmonyLevel 'excellent' → label 'Rất hài hòa' | text match |
| UI-23 | harmonyLevel 'unknown' → label 'Chưa xác định', màu gray | gray, không green/red |
| UI-24 | evaluateFurnitureAssessment với furniture không có material | passCount + unknownCount = totalRules |
| UI-25 | evaluateRoomElementAssessment với personalElement null | harmonyLevel === 'unknown' |

### 7.2. Regression Tests

Sau khi triển khai P8.4, chạy đầy đủ:

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm run lint` | 0 errors |
| 2 | `npx tsx tests/p8_m0_architecture_guard.test.ts` | 27/27 PASS |
| 3 | `npx tsx tests/p8_m1_element_mapping.test.ts` | 65/65 PASS |
| 4 | `npx tsx tests/p8_m2_*.test.ts` | 103/103 PASS |
| 5 | `npx tsx tests/p8_m3_assessment_explainer.test.ts` | 182/182 PASS |
| 6 | `npx tsx tests/p8_4_ui_integration.test.ts` | 25+ PASS / 0 FAIL |
| 7 | `npm run build` | SUCCESS |
| 8 | `npx tsx tests/run_all_tests.ts` | ≥ 467 PASS / 0 FAIL |

> [!CAUTION]
> Nếu bất kỳ bước nào trong steps 2–5 fail sau khi sửa UI, dừng ngay và rollback. Các engine P8-M0–M3 là frozen.

---

## 8. ANTI-PATTERNS — TUYỆT ĐỐI KHÔNG LÀM

```typescript
// ❌ KHÔNG tính verdict trong JSX
const isPass = furniture.color === 'red' ? 'fail' : 'pass'; // WRONG

// ✅ ĐÚNG — gọi engine function
const summary = evaluateFurnitureAssessment(furniture, personalElement);
const verdict = summary.rules[0].verdict;
```

```typescript
// ❌ KHÔNG hiển thị overallHarmonyScore
<span>{assessment.overallHarmonyScore}</span>  // WRONG (always null)

// ✅ ĐÚNG — chỉ dùng harmonyLevel
<span>{harmonyLevelLabel[assessment.harmonyLevel]}</span>
```

```typescript
// ❌ KHÔNG treat UNKNOWN như PASS trong display
const displayClass = verdict === 'unknown' ? 'text-green-600' : ...  // WRONG

// ✅ ĐÚNG
const displayClass = verdict === 'unknown' ? 'text-gray-500' : ...
```

```typescript
// ❌ KHÔNG để Gemini tự thêm verdict
prompt: "Đánh giá Ngũ Hành và cho biết PASS hay FAIL"  // WRONG

// ✅ ĐÚNG — Gemini chỉ nhận kết quả từ engine để diễn giải
const result = evaluateRoomElementAssessment(...);
// Gemini chỉ dùng result đã có để viết lời giải thích
```

---

## 9. RISK REGISTER

| ID | Rủi ro | Khả năng | Tác động | Mitigation |
|----|--------|---------|---------|------------|
| R1 | `RoomConfig.wallColor`/`floorColor` chưa được bind trong `ThreeRoomCanvas` | Cao | Trung bình | NH-ROOM-01 evaluate undefined → `insufficient` → hiển thị empty state. Document gap. |
| R2 | Legacy `RoomObject` không có `material` field | Cao | Thấp | Engine trả `insufficient` → UI hiện UNKNOWN gracefully |
| R3 | Performance: evaluate NH cho tất cả objects mỗi render | Trung bình | Thấp | Dùng `useMemo`, compute only when `objects`/`personalElement` change |
| R4 | TypeScript type mismatch giữa engine exports và UI props | Thấp | Cao | Import trực tiếp từ `elementAssessment.ts`, không tự định nghĩa lại types |
| R5 | Tab "Ngũ Hành" làm chậm modal render khi có nhiều furniture | Thấp | Thấp | Render tab content lazily (only when activeTab === 'ngu_hanh') |

---

## 10. CONSTRAINTS BẤT BIẾN (KHÔNG ĐỔI)

- ✅ P0–P7.5: **FROZEN** — Không sửa bất kỳ engine nào
- ✅ P5 `overallScore`: **KHÔNG THAY ĐỔI** — Ngũ Hành không ảnh hưởng unified score
- ✅ `overallHarmonyScore`: **LUÔN NULL** — UI không hiển thị số
- ✅ Master Preset `89/51`: **KHÔNG THAY ĐỔI**
- ✅ Proposal Confirm Gate: **BẮT BUỘC** — Không auto-apply bất kỳ thứ gì
- ✅ Scene 3D: **KHÔNG TỰ ĐỘNG THAY ĐỔI** — Ngũ Hành chỉ hiển thị, không suggest scene changes tự động
- ✅ Verdict nguồn: **CHỈ TỪ DETERMINISTIC ENGINE** — Gemini không override
- ✅ Heuristic disclaimer: **BẮT BUỘC** cho NH-SHAPE-01 và bất kỳ rule `certainty === 'heuristic'`

---

## 11. TRẠNG THÁI NGHIỆM THU

| Hạng mục | Tiêu chí nghiệm thu | Trạng thái |
|---------|---------------------|----------|
| Design Spec | Đầy đủ 10 sections, anti-patterns, risk register | ✅ DESIGN COMPLETE |
| Code Implementation | 4 component mới + 4 file sửa | ⏳ CHỜ PHÊ DUYỆT |
| Unit Tests | 25+ assertions PASS | ⏳ CHỜ TRIỂN KHAI |
| Regression | 14 suites không giảm PASS count | ⏳ CHỜ TRIỂN KHAI |
| Build | `npm run build` SUCCESS | ⏳ CHỜ TRIỂN KHAI |

---

*Tài liệu này là thiết kế chính thức P8.4. Không có code nào được viết trong bước này. Chờ phê duyệt rõ ràng từ người dùng trước khi triển khai.*

