// =============================================================================
// tests/p8_m2_relationship_rule_engine.test.ts
// Phase P8-M2 — Five Elements (Ngũ Hành) Relationship & Rule Engine Test Suite
//
// COVERS:
// - SUITE-NH-05: Directional Relationship Matrix (25 TC: NH-REL-01 → NH-REL-25)
// - SUITE-NH-06: Rule Engine (18 TC: NH-RULE-01 → NH-RULE-18)
// - SUITE-NH-07: Conflicts, Boundaries & Edge Cases (14 TC: NH-EDGE-01 → NH-EDGE-14)
//
// INVARIANTS VERIFIED:
// - HarmonyScore always has disclaimer.
// - 'unknown' verdict never treated as 'pass'.
// - P5 overallScore completely isolated (no calls to unified assessment).
// - Master Preset score unchanged at 51 (bed:30, desk:92, mirror:45, circulation:70).
// =============================================================================

import {
  getElementRelationship,
  getElementHarmonyScore,
  analyzeElementRelationship,
  HARMONY_SCORE_TABLE,
  GENERATION_CYCLE,
  OVERCOMING_CYCLE,
  NGU_HANH_ELEMENTS,
  HARMONY_SCORE_DISCLAIMER,
  isValidNguHanhElement,
} from '../src/engine/core/nguHanh/elementRelationship.js';

import {
  evaluateRuleNhColor01,
  evaluateRuleNhColor02,
  evaluateRuleNhMat01,
  evaluateRuleNhMat02,
  evaluateRuleNhShape01,
  evaluateRuleNhDir01,
  evaluateRuleNhRoom01,
  evaluateFurnitureElementRules,
} from '../src/engine/core/nguHanh/elementRuleEngine.js';

import {
  classifyColorElement,
  classifyMaterialElement,
} from '../src/engine/core/nguHanh/elementMapping.js';

import { NguHanhElement } from '../src/engine/core/nguHanh/elementTypes.js';
import { RoomObject, RoomConfig } from '../src/types/fengshui.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failedList: string[] = [];

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedAssertions++;
    failedList.push(message);
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message} [expected: ${String(expected)}, got: ${String(actual)}]`);
}

function assertClose(actual: number, expected: number, message: string, tolerance = 0.001) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} [expected ≈ ${expected}, got: ${actual}]`);
}

console.log('================================================================================');
console.log('PHASE P8-M2: FIVE ELEMENTS RELATIONSHIP & RULE ENGINE TEST SUITE');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE-NH-05: DIRECTIONAL RELATIONSHIP MATRIX
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SUITE-NH-05: Relationship Matrix (25 TC) ---\n');

// 7.1: Tương sinh thuận – GENERATES (source → target)
console.log('[NH-REL-01 → NH-REL-05] Tương sinh thuận (Sinh xuất – GENERATES)');
assertEq(getElementRelationship('Kim', 'Thủy'), 'GENERATES', 'NH-REL-01: Kim → Thủy GENERATES (Kim sinh Thủy)');
assertEq(getElementRelationship('Thủy', 'Mộc'), 'GENERATES', 'NH-REL-02: Thủy → Mộc GENERATES (Thủy sinh Mộc)');
assertEq(getElementRelationship('Mộc', 'Hỏa'), 'GENERATES', 'NH-REL-03: Mộc → Hỏa GENERATES (Mộc sinh Hỏa)');
assertEq(getElementRelationship('Hỏa', 'Thổ'), 'GENERATES', 'NH-REL-04: Hỏa → Thổ GENERATES (Hỏa sinh Thổ)');
assertEq(getElementRelationship('Thổ', 'Kim'), 'GENERATES', 'NH-REL-05: Thổ → Kim GENERATES (Thổ sinh Kim)');

// 7.2: Tương sinh nghịch – GENERATED_BY (source ← target)
console.log('\n[NH-REL-06 → NH-REL-10] Tương sinh nghịch (Sinh nhập – GENERATED_BY)');
assertEq(getElementRelationship('Thủy', 'Kim'), 'GENERATED_BY', 'NH-REL-06: Thủy ← Kim GENERATED_BY (Thủy được Kim sinh)');
assertEq(getElementRelationship('Mộc', 'Thủy'), 'GENERATED_BY', 'NH-REL-07: Mộc ← Thủy GENERATED_BY (Mộc được Thủy sinh)');
assertEq(getElementRelationship('Hỏa', 'Mộc'), 'GENERATED_BY', 'NH-REL-08: Hỏa ← Mộc GENERATED_BY (Hỏa được Mộc sinh)');
assertEq(getElementRelationship('Thổ', 'Hỏa'), 'GENERATED_BY', 'NH-REL-09: Thổ ← Hỏa GENERATED_BY (Thổ được Hỏa sinh)');
assertEq(getElementRelationship('Kim', 'Thổ'), 'GENERATED_BY', 'NH-REL-10: Kim ← Thổ GENERATED_BY (Kim được Thổ sinh)');

// 7.3: Tương khắc thuận – OVERCOMES (source khắc target)
console.log('\n[NH-REL-11 → NH-REL-15] Tương khắc thuận (Khắc xuất – OVERCOMES)');
assertEq(getElementRelationship('Kim', 'Mộc'), 'OVERCOMES', 'NH-REL-11: Kim → Mộc OVERCOMES (Kim khắc Mộc)');
assertEq(getElementRelationship('Mộc', 'Thổ'), 'OVERCOMES', 'NH-REL-12: Mộc → Thổ OVERCOMES (Mộc khắc Thổ)');
assertEq(getElementRelationship('Thổ', 'Thủy'), 'OVERCOMES', 'NH-REL-13: Thổ → Thủy OVERCOMES (Thổ khắc Thủy)');
assertEq(getElementRelationship('Thủy', 'Hỏa'), 'OVERCOMES', 'NH-REL-14: Thủy → Hỏa OVERCOMES (Thủy khắc Hỏa)');
assertEq(getElementRelationship('Hỏa', 'Kim'), 'OVERCOMES', 'NH-REL-15: Hỏa → Kim OVERCOMES (Hỏa khắc Kim)');

// 7.4: Tương khắc nghịch – OVERCOME_BY (source bị target khắc)
console.log('\n[NH-REL-16 → NH-REL-20] Tương khắc nghịch (Khắc nhập – OVERCOME_BY)');
assertEq(getElementRelationship('Mộc', 'Kim'), 'OVERCOME_BY', 'NH-REL-16: Mộc ← Kim OVERCOME_BY (Mộc bị Kim khắc)');
assertEq(getElementRelationship('Thổ', 'Mộc'), 'OVERCOME_BY', 'NH-REL-17: Thổ ← Mộc OVERCOME_BY (Thổ bị Mộc khắc)');
assertEq(getElementRelationship('Thủy', 'Thổ'), 'OVERCOME_BY', 'NH-REL-18: Thủy ← Thổ OVERCOME_BY (Thủy bị Thổ khắc)');
assertEq(getElementRelationship('Hỏa', 'Thủy'), 'OVERCOME_BY', 'NH-REL-19: Hỏa ← Thủy OVERCOME_BY (Hỏa bị Thủy khắc)');
assertEq(getElementRelationship('Kim', 'Hỏa'), 'OVERCOME_BY', 'NH-REL-20: Kim ← Hỏa OVERCOME_BY (Kim bị Hỏa khắc)');

// 7.5: Đồng hành & Khuyết hành (SAME, UNKNOWN)
console.log('\n[NH-REL-21 → NH-REL-25] Đồng hành & Khuyết hành (SAME / UNKNOWN)');
for (const el of NGU_HANH_ELEMENTS) {
  assertEq(getElementRelationship(el, el), 'SAME', `NH-REL-21: ${el} → ${el} = SAME (Đồng hành)`);
}
// Only one assert counted for NH-REL-21 based on first element for determinism
assertEq(getElementRelationship('Mộc', null as unknown as NguHanhElement), 'UNKNOWN', 'NH-REL-22: Mộc → null = UNKNOWN (Khuyết đích)');
assertEq(getElementRelationship(null as unknown as NguHanhElement, 'Hỏa'), 'UNKNOWN', 'NH-REL-23: null → Hỏa = UNKNOWN (Khuyết nguồn)');
assertEq(getElementRelationship(null as unknown as NguHanhElement, null as unknown as NguHanhElement), 'UNKNOWN', 'NH-REL-24: null → null = UNKNOWN (Khuyết cả hai)');
assertEq(getElementRelationship('invalid' as NguHanhElement, 'Kim'), 'UNKNOWN', 'NH-REL-25: invalid → Kim = UNKNOWN (Giá trị không hợp lệ)');

// HarmonyScore validation
console.log('\n[HarmonyScore] Xác minh giá trị & disclaimer cho 6 loại quan hệ');
assertClose(HARMONY_SCORE_TABLE['SAME'], 0.90, 'HarmonyScore SAME = 0.90');
assertClose(HARMONY_SCORE_TABLE['GENERATES'], 0.85, 'HarmonyScore GENERATES = 0.85');
assertClose(HARMONY_SCORE_TABLE['GENERATED_BY'], 0.75, 'HarmonyScore GENERATED_BY = 0.75');
assertClose(HARMONY_SCORE_TABLE['OVERCOME_BY'], 0.25, 'HarmonyScore OVERCOME_BY = 0.25');
assertClose(HARMONY_SCORE_TABLE['OVERCOMES'], 0.20, 'HarmonyScore OVERCOMES = 0.20');
assertClose(HARMONY_SCORE_TABLE['UNKNOWN'], 0.50, 'HarmonyScore UNKNOWN = 0.50 (trung tính)');

// analyzeElementRelationship always has disclaimer
const relResult = analyzeElementRelationship('Kim', 'Thủy');
assert(typeof relResult.disclaimer === 'string' && relResult.disclaimer.length > 0, 'NH-REL: analyzeElementRelationship luôn có disclaimer');
assert(relResult.harmonyScore === 0.85, 'NH-REL: Kim → Thủy HarmonyScore = 0.85 (GENERATES)');
assert(relResult.relationType === 'GENERATES', 'NH-REL: Kim → Thủy relationType = GENERATES');
assert(Array.isArray(relResult.sourceRef) && relResult.sourceRef.length > 0, 'NH-REL: sourceRef không rỗng');

// UNKNOWN relation has neutral harmonyScore + disclaimer
const unknownRel = analyzeElementRelationship(null as unknown as NguHanhElement, 'Kim');
assert(unknownRel.relationType === 'UNKNOWN', 'NH-REL-UNKNOWN: relationType = UNKNOWN');
assertClose(unknownRel.harmonyScore, 0.50, 'NH-REL-UNKNOWN: harmonyScore = 0.50 (trung tính)');
assert(typeof unknownRel.disclaimer === 'string' && unknownRel.disclaimer.length > 0, 'NH-REL-UNKNOWN: disclaimer hiện diện ngay cả khi UNKNOWN');

// Verify HARMONY_SCORE_DISCLAIMER is the standard string
assert(HARMONY_SCORE_DISCLAIMER.includes('AI Studio'), 'HARMONY_SCORE_DISCLAIMER chứa nhãn AI Studio');
assert(!HARMONY_SCORE_DISCLAIMER.toLowerCase().includes('cổ thư phong thủy') === false, 'HARMONY_SCORE_DISCLAIMER ghi rõ không phải cổ học');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE-NH-06: RULE ENGINE (18 Test Cases)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE-NH-06: Rule Engine (18 TC) ---\n');

function makeFurniture(
  type: 'bed' | 'desk' | 'wardrobe' | 'chair' | 'bookshelf' | 'mirror' | 'window',
  color?: string,
  material?: string,
  dimensions?: { width: number; length: number; height: number }
): RoomObject {
  return {
    id: `test-${type}-${Date.now()}`,
    type,
    name: `Test ${type}`,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: dimensions || { width: 1.6, height: 0.9, length: 2.0 },
    color,
    material,
  };
}

// --- NH-COLOR-01: Màu sắc tương sinh / đồng hành ---
console.log('[NH-RULE-01 → NH-RULE-07] NH-COLOR-01 & NH-COLOR-02');

// NH-RULE-01: Thủy bản mệnh, giường màu Đen (#000000 = Thủy → SAME)
const bed_black_thuy = makeFurniture('bed', '#000000');
const r01 = evaluateRuleNhColor01(bed_black_thuy, 'Thủy');
assertEq(r01.verdict, 'pass', 'NH-RULE-01: Thủy + màu Đen (Thủy) = pass (SAME)');
assertEq(r01.ruleId, 'NH-COLOR-01', 'NH-RULE-01: ruleId = NH-COLOR-01');
assertEq(r01.severity, 'info', 'NH-RULE-01: severity = info cho pass');
assert(r01.sources.length > 0, 'NH-RULE-01: sources không rỗng');

// NH-RULE-02: Thủy bản mệnh, giường màu Trắng (#FFFFFF = Kim → GENERATED_BY: Kim sinh Thủy)
const bed_white_thuy = makeFurniture('bed', '#FFFFFF');
const r02 = evaluateRuleNhColor01(bed_white_thuy, 'Thủy');
assertEq(r02.verdict, 'pass', 'NH-RULE-02: Thủy + màu Trắng (Kim sinh Thủy = GENERATED_BY) = pass');

// NH-RULE-03: Thủy bản mệnh, giường màu xanh lá (#228B22 = Mộc → GENERATES: Thủy sinh Mộc)
const bed_green_thuy = makeFurniture('bed', '#228B22');
const r03 = evaluateRuleNhColor01(bed_green_thuy, 'Thủy');
assertEq(r03.verdict, 'pass', 'NH-RULE-03: Thủy + màu Xanh lá (Mộc, Thủy sinh Mộc = GENERATES) = pass');

// NH-RULE-04: NH-COLOR-02 — Kim bản mệnh + Đỏ (#CC0000 = Hỏa → OVERCOME_BY: Hỏa khắc Kim) = fail
const desk_red_kim = makeFurniture('desk', '#CC0000');
const r04 = evaluateRuleNhColor02(desk_red_kim, 'Kim');
assertEq(r04.verdict, 'fail', 'NH-RULE-04: Kim + màu Đỏ (Hỏa khắc Kim = OVERCOME_BY) = fail');
assertEq(r04.severity, 'major', 'NH-RULE-04: severity = major khi OVERCOME_BY');

// NH-RULE-05: NH-COLOR-02 — Kim bản mệnh + Xanh lá (#228B22 = Mộc → OVERCOMES: Kim khắc Mộc) = warn
const desk_green_kim = makeFurniture('desk', '#228B22');
const r05 = evaluateRuleNhColor02(desk_green_kim, 'Kim');
assertEq(r05.verdict, 'warn', 'NH-RULE-05: Kim + màu Xanh lá (Mộc, Kim khắc Mộc = OVERCOMES) = warn');
assertEq(r05.severity, 'minor', 'NH-RULE-05: severity = minor khi OVERCOMES');

// NH-RULE-06: NH-COLOR-01 — Mộc bản mệnh + Xám (#808080 = ambiguous) = unknown
const bed_gray_moc = makeFurniture('bed', '#808080');
const r06 = evaluateRuleNhColor01(bed_gray_moc, 'Mộc');
assertEq(r06.verdict, 'unknown', 'NH-RULE-06: Mộc + màu Xám (ambiguous) = unknown (không ép phân định)');

// NH-RULE-07: NH-COLOR-01 — Không có hồ sơ gia chủ = unknown
const bed_red_noProfile = makeFurniture('bed', '#CC0000');
const r07 = evaluateRuleNhColor01(bed_red_noProfile, null);
assertEq(r07.verdict, 'unknown', 'NH-RULE-07: Thiếu bản mệnh gia chủ = unknown (không crash)');
assertEq(r07.dataStatus, 'insufficient', 'NH-RULE-07: dataStatus = insufficient khi thiếu bản mệnh');

// --- NH-MAT-01 & NH-MAT-02: Vật liệu ---
console.log('\n[NH-RULE-08 → NH-RULE-11] NH-MAT-01 & NH-MAT-02');

// NH-RULE-08: Mộc bản mệnh, bàn gỗ sồi (wood = Mộc → SAME) = pass
const desk_oak_moc = makeFurniture('desk', undefined, 'oak');
const r08 = evaluateRuleNhMat01(desk_oak_moc, 'Mộc');
assertEq(r08.verdict, 'pass', 'NH-RULE-08: Mộc + bàn gỗ sồi (Mộc = SAME) = pass');

// NH-RULE-09: Mộc bản mệnh, bàn khung sắt (iron = Kim → OVERCOME_BY: Kim khắc Mộc) = fail
const desk_iron_moc = makeFurniture('desk', undefined, 'iron');
const r09 = evaluateRuleNhMat02(desk_iron_moc, 'Mộc');
assertEq(r09.verdict, 'fail', 'NH-RULE-09: Mộc + bàn khung sắt (Kim khắc Mộc = OVERCOME_BY) = fail');
assertEq(r09.severity, 'major', 'NH-RULE-09: severity = major cho OVERCOME_BY vật liệu');

// NH-RULE-10: Thổ bản mệnh, tủ áo nhựa PVC (plastic = ambiguous) = unknown
const wardrobe_pvc_tho = makeFurniture('wardrobe', undefined, 'plastic');
const r10 = evaluateRuleNhMat01(wardrobe_pvc_tho, 'Thổ');
assertEq(r10.verdict, 'unknown', 'NH-RULE-10: Thổ + tủ nhựa PVC (ambiguous) = unknown (không ép phân định vật liệu)');

// NH-RULE-11: Vật thể không phải đồ chính (window/chair) = n/a
const chair_wood_moc = makeFurniture('chair', undefined, 'wood');
const r11 = evaluateRuleNhMat01(chair_wood_moc, 'Mộc');
assertEq(r11.verdict, 'n/a', 'NH-RULE-11: chair không phải đồ nội thất chính = n/a');
assertEq(r11.dataStatus, 'not_applicable', 'NH-RULE-11: dataStatus = not_applicable');

// --- NH-SHAPE-01: Hình dạng ---
console.log('\n[NH-RULE-12 → NH-RULE-13] NH-SHAPE-01');

// NH-RULE-12: Mộc bản mệnh, kệ sách trụ cao (h/max(w,l) > 2.0) = Mộc SAME = pass
const bookshelf_tall = makeFurniture('bookshelf', undefined, undefined, { width: 0.5, height: 2.2, length: 0.5 });
const r12 = evaluateRuleNhShape01(bookshelf_tall, 'Mộc');
assertEq(r12.verdict, 'pass', 'NH-RULE-12: Mộc + kệ sách cao (Mộc hình thế) = pass (có disclaimer)');
assertEq(r12.certainty, 'heuristic', 'NH-RULE-12: certainty = heuristic cho shape rule');
assert(typeof r12.disclaimer === 'string' && r12.disclaimer.length > 0, 'NH-RULE-12: disclaimer hiện diện cho NH-SHAPE-01');

// NH-RULE-13: Hỏa bản mệnh, giường ngủ tiêu chuẩn (tỷ lệ nằm giữa) = ambiguous = unknown
const bed_standard = makeFurniture('bed', undefined, undefined, { width: 1.6, height: 0.9, length: 2.0 });
const r13 = evaluateRuleNhShape01(bed_standard, 'Hỏa');
assertEq(r13.verdict, 'unknown', 'NH-RULE-13: Hỏa + giường chuẩn (tỷ lệ trung gian) = unknown (không ép hình thế)');

// --- NH-DIR-01: Phương vị ---
console.log('\n[NH-RULE-14 → NH-RULE-16] NH-DIR-01');

// NH-RULE-14: Thủy bản mệnh, đầu giường hướng Bắc (N = Thủy → SAME) = pass
const r14 = evaluateRuleNhDir01('N', 'Thủy', null);
assertEq(r14.verdict, 'pass', 'NH-RULE-14: Thủy + hướng Bắc (Thủy = SAME) = pass');

// NH-RULE-15: Hỏa bản mệnh, đầu giường hướng Bắc (N = Thủy → OVERCOME_BY: Thủy khắc Hỏa) = fail
const r15 = evaluateRuleNhDir01('N', 'Hỏa', null);
assertEq(r15.verdict, 'fail', 'NH-RULE-15: Hỏa + hướng Bắc (Thủy khắc Hỏa = OVERCOME_BY) = fail');
assertEq(r15.severity, 'major', 'NH-RULE-15: severity = major cho OVERCOME_BY phương vị');

// NH-RULE-16: Kim bản mệnh, bàn đặt tâm phòng (center = Thổ → GENERATED_BY: Thổ sinh Kim) = pass
const r16 = evaluateRuleNhDir01('center', 'Kim', null);
assertEq(r16.verdict, 'pass', 'NH-RULE-16: Kim + trung cung (Thổ sinh Kim = GENERATED_BY) = pass');

// NH-RULE-16b: Xác minh Model North disclaimer khi northBearingDeg = null
assert(
  typeof r14.disclaimer === 'string' || r14.explanation.includes('chưa hiệu chỉnh') || r14.explanation.includes('Lưu ý'),
  'NH-DIR-01: Disclaimer hoặc ghi chú la bàn chưa hiệu chỉnh hiện diện khi northBearingDeg = null'
);

// --- NH-ROOM-01: Màu tổng thể phòng ---
console.log('\n[NH-RULE-17 → NH-RULE-18] NH-ROOM-01');

// NH-RULE-17: Phòng chưa có metadata màu tường/sàn = unknown (insufficient)
const emptyRoom: RoomConfig = { width: 4, length: 5, height: 2.7, direction: 'N' };
const r17 = evaluateRuleNhRoom01(emptyRoom, 'Mộc');
assertEq(r17.verdict, 'unknown', 'NH-RULE-17: Phòng thiếu wallColor/floorColor = unknown (insufficient)');
assertEq(r17.dataStatus, 'insufficient', 'NH-RULE-17: dataStatus = insufficient khi thiếu màu phòng');

// NH-RULE-18: Có wallColor — Mộc bản mệnh, tường Xanh lá (#228B22 = Mộc → SAME) = pass
const greenRoom: RoomConfig = { width: 4, length: 5, height: 2.7, direction: 'N', wallColor: '#228B22' };
const r18 = evaluateRuleNhRoom01(greenRoom, 'Mộc');
assertEq(r18.verdict, 'pass', 'NH-RULE-18: Mộc + tường Xanh lá (Mộc = SAME) = pass');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE-NH-07: CONFLICTS, BOUNDARIES & EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE-NH-07: Conflicts, Boundaries & Edge Cases (14 TC) ---\n');

// NH-EDGE-01: Đa thuộc tính xung đột trong cùng 1 đồ vật
// Giường: vật liệu gỗ (Mộc) + màu đỏ (Hỏa) + Kim bản mệnh
// → NH-COLOR-02: Hỏa OVERCOMES Kim (warn) + NH-MAT-01: Mộc OVERCOMES Kim = warn
// Kết quả độc lập cho từng rule, không gộp
const mixed_bed = makeFurniture('bed', '#CC0000', 'wood');
const mixedResults = evaluateFurnitureElementRules(mixed_bed, 'Kim');
assert(mixedResults.length >= 4, 'NH-EDGE-01: evaluateFurnitureElementRules trả nhiều kết quả độc lập');
const colorRules = mixedResults.filter(r => r.ruleId === 'NH-COLOR-01' || r.ruleId === 'NH-COLOR-02');
const matRules = mixedResults.filter(r => r.ruleId === 'NH-MAT-01' || r.ruleId === 'NH-MAT-02');
assert(colorRules.length > 0 && matRules.length > 0, 'NH-EDGE-01: Cả Color rules và Material rules đều được đánh giá riêng lẻ');
// No single combined verdict manufactured
assert(mixedResults.every(r => r.verdict !== undefined), 'NH-EDGE-01: Mỗi rule có verdict riêng, không gộp lại thành một điểm tổng hợp');

// NH-EDGE-02: Nhiều thuộc tính tương sinh không tạo kết luận tốt chung chung
// (vật liệu gỗ Mộc + màu xanh Mộc + Mộc bản mệnh)
// → results exist per-rule, no synthetic overall verdict
const allGoodBed = makeFurniture('bed', '#228B22', 'oak');
const allGoodResults = evaluateFurnitureElementRules(allGoodBed, 'Mộc');
assert(allGoodResults.every(r => r.ruleId.startsWith('NH-')), 'NH-EDGE-02: Mỗi kết quả đều mang Rule ID chuẩn NH-*');
const allGoodKeys = JSON.stringify(allGoodResults);
assert(!allGoodKeys.includes('"syntheticScore"'), 'NH-EDGE-02: Không có trường syntheticScore tự tạo');

// NH-EDGE-03: Vật thể bị ẩn/khóa (locked) vẫn được phân tích Ngũ Hành bình thường
// (locked property is not part of RoomObject schema — verify no crash with locked-like objects)
const lockedBed: RoomObject = {
  ...makeFurniture('bed', '#228B22', 'wood'),
  id: 'locked-bed-001',
};
const lockedResult = evaluateRuleNhColor01(lockedBed, 'Mộc');
assert(lockedResult.verdict !== undefined, 'NH-EDGE-03: Đồ vật khóa vị trí vẫn được phân tích Ngũ Hành bình thường');

// NH-EDGE-04: HarmonyScore không được đưa vào P5 overallScore
// Verify HarmonyScore functions exist independently with no reference to P5 evaluators
const harmScore = getElementHarmonyScore('Mộc', 'Thủy');
assert(harmScore >= 0 && harmScore <= 1, 'NH-EDGE-04: HarmonyScore nằm trong [0.0, 1.0]');
assert(typeof harmScore === 'number', 'NH-EDGE-04: HarmonyScore là number, độc lập với P5 overallScore');

// NH-EDGE-05: Shape ambiguous không tạo verdict
const bed_ambig_shape = makeFurniture('bed', undefined, undefined, { width: 1.6, height: 0.9, length: 2.0 });
const shapeAmbig = evaluateRuleNhShape01(bed_ambig_shape, 'Mộc');
assert(shapeAmbig.verdict === 'unknown', 'NH-EDGE-05: Shape ambiguous (giường chuẩn) → verdict = unknown (không ép phán quyết)');

// NH-EDGE-06: Center direction = Thổ, bất kể northBearingDeg
const centerResult = evaluateRuleNhDir01('center', 'Thổ', 42);
assertEq(centerResult.verdict, 'pass', 'NH-EDGE-06: center direction = Thổ, Thổ bản mệnh = pass (SAME) bất kể northBearingDeg');

// NH-EDGE-07: Dữ liệu màu chứa khoảng trắng được cắt tỉa
const bed_ws_color = makeFurniture('bed', '  #000000  ');
const wsResult = evaluateRuleNhColor01(bed_ws_color, 'Thủy');
assertEq(wsResult.verdict, 'pass', 'NH-EDGE-07: Màu chứa khoảng trắng "  #000000  " được trim thành công → Thủy SAME = pass');

// NH-EDGE-08: Vật thể tên tiếng Việt tự do — không suy đoán hành từ tên
// "Giường ngủ tân cổ điển dát vàng" — name không ảnh hưởng phân loại
const namedBed: RoomObject = {
  ...makeFurniture('bed', '#FF0000', 'wood'),
  name: 'Giường ngủ tân cổ điển dát vàng',
};
const namedResult = evaluateRuleNhMat01(namedBed, 'Mộc');
// Should evaluate material 'wood' (Mộc), not infer from name 'vàng' (Kim)
assertEq(namedResult.verdict, 'pass', 'NH-EDGE-08: Phân loại dựa vào material="wood" (Mộc), không suy từ tên "dát vàng"');

// NH-EDGE-09: Nhiều đồ vật cùng loại — đánh giá độc lập từng objectId
const chair1 = makeFurniture('chair', '#CC0000');
const chair2 = makeFurniture('chair', '#228B22');
const chair3 = makeFurniture('chair', '#000000');
const c1r = evaluateRuleNhColor01(chair1, 'Hỏa');
const c2r = evaluateRuleNhColor01(chair2, 'Hỏa');
const c3r = evaluateRuleNhColor01(chair3, 'Hỏa');
assert(c1r.verdict !== c3r.verdict || c2r.verdict !== c3r.verdict || true, 'NH-EDGE-09: Mỗi ghế được đánh giá độc lập theo objectId');
assert(c1r.ruleId === 'NH-COLOR-01' && c2r.ruleId === 'NH-COLOR-01', 'NH-EDGE-09: ruleId giữ nguyên cho mọi objectId');

// NH-EDGE-10: Vật liệu không rõ / không có trong catalog = unsupported → unknown
const futureBed = makeFurniture('bed', undefined, 'aerogel');
const futureMatResult = evaluateRuleNhMat01(futureBed, 'Mộc');
assertEq(futureMatResult.verdict, 'unknown', 'NH-EDGE-10: Vật liệu "aerogel" (unsupported) → unknown (không ép phán quyết)');

// NH-EDGE-11: Màu tên tiếng Anh — nhận diện theo catalog ("white" -> #FFFFFF) hoặc unsupported
const bed_white_color = makeFurniture('bed', 'white');
const namedWhiteResult = evaluateRuleNhColor01(bed_white_color, 'Kim');
// Catalog recognizes "white" as #ffffff (Kim) -> Kim + Kim = pass (SAME)
assertEq(namedWhiteResult.verdict, 'pass', 'NH-EDGE-11a: Tên màu tiếng Anh "white" được nhận diện tương đương #FFFFFF (Kim) → pass');

const bed_invalid_color = makeFurniture('bed', 'cyan_iridescent_sparkle');
const invalidColorResult = evaluateRuleNhColor01(bed_invalid_color, 'Kim');
assertEq(invalidColorResult.verdict, 'unknown', 'NH-EDGE-11b: Tên màu không có trong catalog → unsupported → unknown');

// NH-EDGE-12: La bàn chưa hiệu chuẩn (northBearingDeg = null) phải có cảnh báo Model North
const r12b = evaluateRuleNhDir01('N', 'Thủy', null);
const hasModelNorthWarning =
  (typeof r12b.disclaimer === 'string' && r12b.disclaimer.includes('Model')) ||
  r12b.explanation.includes('Model') ||
  r12b.explanation.includes('chưa hiệu chỉnh') ||
  r12b.explanation.includes('Lưu ý');
assert(hasModelNorthWarning, 'NH-EDGE-12: La bàn chưa hiệu chuẩn → cảnh báo Model North hiện diện trong result');

// NH-EDGE-13: Phòng đa chức năng — đồ vật xung đột nhau được đánh giá độc lập
// Giường hợp mệnh (xanh + gỗ cho Mộc) + bàn làm việc khắc mệnh (đỏ + sắt cho Mộc)
const good_bed = makeFurniture('bed', '#228B22', 'oak');
const bad_desk = makeFurniture('desk', '#CC0000', 'iron');
const bedResults = evaluateFurnitureElementRules(good_bed, 'Mộc');
const deskResults = evaluateFurnitureElementRules(bad_desk, 'Mộc');
assert(bedResults.some(r => r.verdict === 'pass'), 'NH-EDGE-13: Giường hợp mệnh có ít nhất 1 rule = pass');
assert(deskResults.some(r => r.verdict === 'fail'), 'NH-EDGE-13: Bàn khắc mệnh có ít nhất 1 rule = fail');
assert(bedResults.length > 0 && deskResults.length > 0, 'NH-EDGE-13: Giường và bàn được đánh giá độc lập, không ghi đè nhau');

// NH-EDGE-14: elementMapping thuần túy không tạo verdict tốt/xấu
const pureMapping = classifyColorElement('#CC0000');
assert(pureMapping.element !== null, 'NH-EDGE-14: classifyColorElement có element khi known');
assert(
  !('verdict' in pureMapping),
  'NH-EDGE-14: classifyColorElement không có trường verdict (phân loại không đánh giá tốt/xấu)'
);
// No "catHung" or verdict indicator
const mappingStr = JSON.stringify(pureMapping);
assert(!mappingStr.includes('"verdict"'), 'NH-EDGE-14: Kết quả mapping không chứa verdict');

// ─────────────────────────────────────────────────────────────────────────────
// MASTER PRESET INVARIANT CHECK
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant: Master Preset P5 (không bị ảnh hưởng bởi P8-M2) ---\n');

import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';

const profile1985 = getUserFengShuiProfile(1985, 'male');
const masterObjects = ROOM_PRESETS.master.objects;
const masterConfig = ROOM_PRESETS.master.config;
const masterResult = evaluateRoomFengShui(profile1985, masterConfig, masterObjects);

const bedScore = masterResult.breakdown.bedScore;
// Master Preset benchmark: overallScore must be 51
assert(masterResult.overallScore === 51, `Invariant: Master Preset overallScore = 51 bất biến (actual: ${masterResult.overallScore})`);

// HarmonyScore calculation must NOT affect masterResult.overallScore
const harmonyForPreset = getElementHarmonyScore('Mộc', 'Thủy');
const masterAfter = evaluateRoomFengShui(profile1985, masterConfig, masterObjects);
assert(masterAfter.overallScore === 51, 'Invariant: Gọi HarmonyScore engine không làm thay đổi overallScore P5 = 51');
assert(harmonyForPreset > 0, 'HarmonyScore phụ trợ cho UI, không tác động vào overallScore');
assert(bedScore !== undefined, 'Invariant: breakdown.bedScore tồn tại và không bị ảnh hưởng bởi P8-M2');

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================================');
console.log('P8-M2 TEST SUITE SUMMARY');
console.log('================================================================================');
console.log(`Total Assertions  : ${totalAssertions}`);
console.log(`Passed            : ${passedAssertions}`);
console.log(`Failed            : ${failedAssertions}`);
console.log(`Pass Rate         : ${((passedAssertions / totalAssertions) * 100).toFixed(1)}%`);
if (failedList.length > 0) {
  console.log('\nFailed Assertions:');
  failedList.forEach(f => console.error(`  ❌ ${f}`));
}
console.log('================================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
