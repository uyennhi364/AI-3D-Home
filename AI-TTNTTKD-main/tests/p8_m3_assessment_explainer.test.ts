// =============================================================================
// tests/p8_m3_assessment_explainer.test.ts
// Phase P8-M3 — Five Elements Assessment & Natural Language Explainer Test Suite
//
// TEST SUITE BREAKDOWN:
// 1. Per-Furniture Element Assessment & Profile Building
// 2. Multi-Attribute & Conflicting Attributes on Single Furniture
// 3. Whole-Room Five Elements Assessment (Deterministic Aggregation)
// 4. Missing, Ambiguous & Unsupported Data Handling (Never converts UNKNOWN to PASS)
// 5. Natural Language Explainer (All 9 Mandatory Components Verified)
// 6. Invariance & Architecture Boundary Checks (Master Preset 89/51, Zero Synthetic Score)
// =============================================================================

import {
  RoomObject,
  RoomConfig,
} from '../src/types/fengshui.js';
import {
  NguHanhElement,
  FurnitureElementProfile,
  ElementRoomAssessment,
} from '../src/engine/core/nguHanh/elementTypes.js';
import {
  buildFurnitureElementProfile,
  evaluateFurnitureAssessment,
  evaluateRoomElementAssessment,
  FurnitureAssessmentSummary,
  DetailedRoomElementAssessment,
} from '../src/engine/core/nguHanh/elementAssessment.js';
import {
  explainRuleResult,
  explainFurnitureProfile,
  explainFurnitureAssessment,
  explainRoomElementAssessment,
  StructuredElementExplanation,
  getRelationVietnameseLabel,
  humanizeObjectName,
} from '../src/engine/core/nguHanh/elementExplainer.js';
import {
  evaluateFurnitureElementRules,
  evaluateRuleNhRoom01,
  ElementRuleResult,
} from '../src/engine/core/nguHanh/elementRuleEngine.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';

let passedAssertions = 0;
let failedAssertions = 0;
let testCasesCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    console.error(`[FAIL] ${message}`);
  }
}

function mockRoomObj(obj: any): RoomObject {
  return {
    name: obj.name || `Object ${obj.id}`,
    position: { x: obj.x ?? 0, y: 0, z: obj.y ?? 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: obj.dimensions || {
      width: obj.width ?? 1.5,
      length: obj.length ?? 2.0,
      height: obj.height ?? 0.8,
    },
    ...obj,
  };
}

function startCase(name: string): void {
  testCasesCount++;
  // console.log(`[TC #${testCasesCount}] ${name}`);
}

console.log('=============================================================================');
console.log('RUNNING PHASE P8-M3 TEST SUITE: ASSESSMENT & EXPLAINER');
console.log('=============================================================================\n');

// =============================================================================
// TEST SUITE 1: Per-Furniture Element Assessment & Profile Building
// =============================================================================
console.log('--- SUITE 1: Per-Furniture Profile Building & Dominant Element ---');

startCase('TC 1.1: Profile with harmonious material and color (Mộc + Mộc)');
{
  const woodenGreenBed: RoomObject = mockRoomObj({
    id: 'bed-1',
    type: 'bed',
    x: 2,
    y: 2,
    width: 1.8,
    length: 2.0,
    height: 0.9,
    material: 'oak',
    color: '#008000', // Xanh lục (Mộc)
  });

  const profile = buildFurnitureElementProfile(woodenGreenBed, 'Mộc', { direction: 'E' });
  assert(profile.objectId === 'bed-1', 'Profile objectId matches');
  assert(profile.objectType === 'bed', 'Profile objectType matches');
  assert(profile.materialAnalysis.element === 'Mộc', 'Material is Mộc');
  assert(profile.colorAnalysis.element === 'Mộc', 'Color is Mộc');
  assert(profile.dominantElement === 'Mộc', 'Dominant element is Mộc');
  assert(profile.overallDataStatus === 'known', 'Overall data status is known');
  assert(profile.dominantElementBasis.includes('đồng nhất'), 'Basis notes harmonious material and color');
}

startCase('TC 1.2: Profile with clashing material & color (Gỗ Mộc + Màu Đỏ Hỏa)');
{
  const woodRedDesk: RoomObject = mockRoomObj({
    id: 'desk-1',
    type: 'desk',
    x: 4,
    y: 2,
    width: 1.4,
    length: 0.7,
    height: 0.75,
    material: 'walnut', // Mộc
    color: '#ff0000',   // Hỏa
  });

  const profile = buildFurnitureElementProfile(woodRedDesk, 'Hỏa');
  assert(profile.materialAnalysis.element === 'Mộc', 'Material is Mộc');
  assert(profile.colorAnalysis.element === 'Hỏa', 'Color is Hỏa');
  assert(profile.dominantElement === 'Mộc', 'Physical core material takes precedence for dominant element');
  assert(profile.dominantElementBasis.includes('cốt lõi'), 'Basis explains core material vs surface color');
}

startCase('TC 1.3: Profile with known color but missing material');
{
  const colorOnlyItem: RoomObject = mockRoomObj({
    id: 'wardrobe-1',
    type: 'wardrobe',
    x: 1,
    y: 1,
    width: 1.6,
    length: 0.6,
    height: 2.0,
    color: '#ffffff', // Kim
  });

  const profile = buildFurnitureElementProfile(colorOnlyItem, 'Thủy');
  assert(profile.materialAnalysis.dataStatus === 'insufficient', 'Material dataStatus is insufficient');
  assert(profile.colorAnalysis.element === 'Kim', 'Color is Kim');
  assert(profile.dominantElement === 'Kim', 'Dominant element falls back to surface color');
  assert(profile.dominantElementBasis.includes('sắc màu bề mặt'), 'Basis records color-based determination');
}

startCase('TC 1.4: Profile with known material but missing color');
{
  const matOnlyItem: RoomObject = mockRoomObj({
    id: 'bed-2',
    type: 'bed',
    x: 2,
    y: 2,
    width: 1.8,
    length: 2.0,
    height: 0.9,
    material: 'metal', // Kim
  });

  const profile = buildFurnitureElementProfile(matOnlyItem, 'Thủy');
  assert(profile.colorAnalysis.dataStatus === 'insufficient', 'Color dataStatus is insufficient');
  assert(profile.materialAnalysis.element === 'Kim', 'Material is Kim');
  assert(profile.dominantElement === 'Kim', 'Dominant element is Kim from material');
  assert(profile.dominantElementBasis.includes('vật liệu cấu tạo'), 'Basis records material determination');
}

startCase('TC 1.5: Profile with unclassifiable / missing attributes');
{
  const emptyItem: RoomObject = mockRoomObj({
    id: 'unknown-obj',
    type: 'chair',
    x: 0,
    y: 0,
    width: 0.5,
    length: 0.5,
  });

  const profile = buildFurnitureElementProfile(emptyItem, 'Kim');
  assert(profile.dominantElement === null, 'Dominant element is null when data is missing');
  assert(profile.overallDataStatus === 'insufficient', 'Overall data status is insufficient');
}

// =============================================================================
// TEST SUITE 2: Multi-Attribute & Conflicting Attributes on Single Furniture
// =============================================================================
console.log('--- SUITE 2: Multi-Attribute & Conflicting Attributes on Single Furniture ---');

startCase('TC 2.1: Single furniture with mixed attributes evaluated independently');
{
  // Gia chủ: Kim
  // Giường:
  // - Màu trắng (#ffffff) -> Kim (SAME -> pass)
  // - Vật liệu gỗ tự nhiên -> Mộc (OVERCOMES -> warn)
  // - Kích thước: 1.8 x 2.0 x 0.9 -> shape Mộc/Thổ -> evaluated independently
  // - Hướng đặt: W (Kim) -> SAME -> pass
  const complexBed: RoomObject = mockRoomObj({
    id: 'bed-complex',
    type: 'bed',
    x: 2,
    y: 2,
    width: 1.8,
    length: 2.0,
    height: 0.9,
    material: 'wood',
    color: '#ffffff',
  });

  const summary = evaluateFurnitureAssessment(complexBed, 'Kim', { direction: 'W' });
  assert(summary.rules.length >= 6, 'Evaluated all 6 applicable furniture rules');
  assert(summary.passCount >= 2, 'Has at least 2 PASS rules (Color NH-COLOR-01, Direction NH-DIR-01)');
  assert(summary.warnCount >= 1, 'Has at least 1 WARN rule (Material Mộc khắc xuất)');
  assert(summary.failCount === 0, 'Zero FAIL rules');
  assert(summary.keyIssues.length >= 1, 'Key issues list captures the material conflict');
}

startCase('TC 2.2: Furniture with severe clashing color (Khắc nhập -> FAIL)');
{
  // Gia chủ: Kim
  // Bàn: Màu đỏ (#ff0000) -> Hỏa khắc Kim (OVERCOME_BY -> FAIL trên NH-COLOR-02)
  const redDesk: RoomObject = mockRoomObj({
    id: 'desk-red',
    type: 'desk',
    x: 3,
    y: 3,
    width: 1.2,
    length: 0.6,
    height: 0.75,
    color: '#ff0000',
    material: 'metal',
  });

  const summary = evaluateFurnitureAssessment(redDesk, 'Kim', { direction: 'N' });
  assert(summary.failCount >= 1, 'Correctly flags FAIL on clashing color (NH-COLOR-02)');
  assert(summary.passCount >= 1, 'Correctly flags PASS on metal material (NH-MAT-01)');
  assert(summary.keyIssues.some(i => i.includes('xung khắc')), 'Key issues notes clashing color');
  assert(summary.remedies.length > 0, 'Provides remedy for clashing color');
}

startCase('TC 2.3: Non-major furniture exempt from material rules');
{
  // Ghế không phải major furniture (bed, desk, wardrobe) -> NH-MAT-01/02 return n/a
  const chair: RoomObject = mockRoomObj({
    id: 'chair-1',
    type: 'chair',
    x: 3,
    y: 2,
    width: 0.5,
    length: 0.5,
    height: 0.8,
    material: 'wood',
    color: '#008000',
  });

  const summary = evaluateFurnitureAssessment(chair, 'Kim');
  assert(summary.naCount >= 2, 'Chair has at least 2 N/A rules for material constraints');
}

// =============================================================================
// TEST SUITE 3: Whole-Room Five Elements Assessment
// =============================================================================
console.log('--- SUITE 3: Whole-Room Assessment (Deterministic Aggregation) ---');

startCase('TC 3.1: Complete room assessment aggregation');
{
  const roomConfig: RoomConfig = {
    width: 5,
    length: 6,
    height: 2.8,
    direction: 'W',
    wallColor: '#ffffff', // Kim
    floorColor: '#e0c8a0', // Vàng nhạt Thổ
  };

  const objects: RoomObject[] = [
    mockRoomObj({
      id: 'bed-1',
      type: 'bed',
      x: 1.5,
      y: 2,
      width: 1.8,
      length: 2.0,
      height: 0.9,
      color: '#ffffff',
      material: 'kim loại',
    }),
    mockRoomObj({
      id: 'desk-1',
      type: 'desk',
      x: 3.5,
      y: 2,
      width: 1.4,
      length: 0.7,
      height: 0.75,
      color: '#ffffff',
      material: 'kim loại',
    }),
  ];

  const assessment = evaluateRoomElementAssessment(roomConfig, objects, 'Kim');
  assert(assessment.personalElement === 'Kim', 'Personal element is Kim');
  assert(assessment.overallHarmonyScore === null, 'overallHarmonyScore is strictly NULL (Anti-Synthetic Invariant)');
  assert(assessment.passCount > 0, 'Has passCount > 0');
  assert(assessment.failCount === 0, 'Zero failures in all-supporting setup');
  assert(assessment.harmonyLevel === 'excellent' || assessment.harmonyLevel === 'good', 'Harmony level is favorable');
  assert(assessment.furnitureRelations.length === 2, 'Two furniture relation items captured');
  assert(assessment.allRules.length > 0, 'Captured all evaluated rules in audit trail');
}

startCase('TC 3.2: Clashing room elements reflect in harmonyLevel without synthetic score');
{
  const roomConfig: RoomConfig = {
    width: 5,
    length: 6,
    height: 2.8,
    direction: 'S',
    wallColor: '#ff0000', // Đỏ Hỏa (khắc Kim)
  };

  const objects: RoomObject[] = [
    mockRoomObj({
      id: 'bed-clash',
      type: 'bed',
      x: 1.5,
      y: 2,
      width: 1.8,
      length: 2.0,
      color: '#ff0000', // Đỏ Hỏa (khắc Kim)
      material: 'wood',
    }),
  ];

  const assessment = evaluateRoomElementAssessment(roomConfig, objects, 'Kim');
  assert(assessment.failCount > 0, 'At least 1 fail recorded for Fire vs Metal clash');
  assert(assessment.harmonyLevel === 'poor', 'Harmony level reflects poor status due to failCount > 0');
  assert(assessment.overallHarmonyScore === null, 'Still strictly null overallHarmonyScore');
}

// =============================================================================
// TEST SUITE 4: Missing, Ambiguous & Unsupported Data Handling
// =============================================================================
console.log('--- SUITE 4: Missing, Ambiguous & Unsupported Data Handling ---');

startCase('TC 4.1: Missing personalElement (null)');
{
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'S' };
  const objects: RoomObject[] = [
    mockRoomObj({ id: 'bed-1', type: 'bed', x: 1, y: 1, width: 1.8, length: 2.0, color: '#ffffff' }),
  ];

  const assessment = evaluateRoomElementAssessment(roomConfig, objects, null);
  assert(assessment.personalElement === null, 'Personal element is null');
  assert(assessment.dataStatus === 'insufficient', 'Room dataStatus is insufficient');
  assert(assessment.harmonyLevel === 'unknown', 'Harmony level is unknown');
  assert(assessment.unknownCount > 0, 'Unknown count recorded');
  assert(assessment.failCount === 0, 'Does not fabricate failures when data is missing');
}

startCase('TC 4.2: Missing room wall and floor colors');
{
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'S' };
  const objects: RoomObject[] = [];

  const assessment = evaluateRoomElementAssessment(roomConfig, objects, 'Kim');
  const roomRule = assessment.allRules.find(r => r.ruleId === 'NH-ROOM-01');
  assert(roomRule !== undefined, 'NH-ROOM-01 was evaluated');
  assert(roomRule?.verdict === 'unknown', 'NH-ROOM-01 returns unknown for missing wall & floor colors');
  assert(Boolean(roomRule?.missingInputs?.includes('wallColor')), 'Identifies missing wallColor');
  assert(Boolean(roomRule?.missingInputs?.includes('floorColor')), 'Identifies missing floorColor');
}

startCase('TC 4.3: Ambiguous and unsupported attributes');
{
  const weirdObject: RoomObject = mockRoomObj({
    id: 'plastic-gray-desk',
    type: 'desk',
    x: 2,
    y: 2,
    width: 1.2,
    length: 0.6,
    height: 0.75,
    material: 'plastic', // Ambiguous per catalog
    color: '#808080',    // Gray -> Ambiguous
  });

  const summary = evaluateFurnitureAssessment(weirdObject, 'Thổ');
  assert(summary.profile.materialAnalysis.dataStatus === 'ambiguous', 'Plastic material is ambiguous');
  assert(summary.profile.colorAnalysis.dataStatus === 'ambiguous', 'Gray color is ambiguous');
  // Rules evaluating ambiguous / unsupported should return unknown or info, never pass or fail without basis
  const colorRule = summary.rules.find(r => r.ruleId === 'NH-COLOR-01');
  assert(colorRule?.verdict === 'unknown', 'Color rule with ambiguous color yields unknown');
}

// =============================================================================
// TEST SUITE 5: Natural Language Explainer (All 9 Mandatory Components)
// =============================================================================
console.log('--- SUITE 5: Natural Language Explainer (9 Mandatory Components) ---');

startCase('TC 5.1: Structured explanation contains all 9 required components');
{
  const furniture: RoomObject = mockRoomObj({
    id: 'bed-wood',
    type: 'bed',
    x: 2,
    y: 2,
    width: 1.8,
    length: 2.0,
    height: 0.9,
    material: 'oak',
    color: '#008000',
  });

  const summary = evaluateFurnitureAssessment(furniture, 'Hỏa');
  const passRule = summary.rules.find(r => r.ruleId === 'NH-MAT-01')!;
  assert(passRule !== undefined, 'Found NH-MAT-01 result');

  const explanation = explainRuleResult(passRule, 'Giường ngủ chính');

  // Verify all 9 specification components
  assert(explanation.targetObject === 'Giường ngủ chính', '1. targetObject is present and accurate');
  assert(explanation.attribute.length > 0, '2. attribute is present');
  assert(explanation.personalElement === 'Hỏa', '3a. personalElement is Hỏa');
  assert(explanation.attributeElement === 'Mộc', '3b. attributeElement is Mộc');
  assert(explanation.relationship.includes('Sinh nhập') || explanation.relationship.includes('Mộc sinh Hỏa'), '4. relationship details directional sinh nhập');
  assert(explanation.verdict === 'pass', '5a. verdict is pass');
  assert(explanation.verdictLabel.includes('PASS'), '5b. verdictLabel is localized');
  assert(explanation.rationale.length > 0, '6. rationale is detailed');
  assert(explanation.sources.length > 0, '7. sources is non-empty list');
  assert(explanation.certainty === 'classical', '8. certainty is classical');
  assert(explanation.certaintyLabel.includes('Classical'), 'certaintyLabel is localized');
  assert(explanation.formattedText.length > 0, 'formattedText is populated');
}

startCase('TC 5.2: Heuristic rule includes mandatory disclaimer');
{
  const furniture: RoomObject = mockRoomObj({
    id: 'desk-shape',
    type: 'desk',
    x: 2,
    y: 2,
    width: 2.4, // Aspect ratio > 2.0 -> Mộc
    length: 0.8,
    height: 0.75,
  });

  const summary = evaluateFurnitureAssessment(furniture, 'Kim');
  const shapeRule = summary.rules.find(r => r.ruleId === 'NH-SHAPE-01')!;
  assert(shapeRule !== undefined, 'Found NH-SHAPE-01 result');

  const explanation = explainRuleResult(shapeRule, 'Bàn làm việc');
  assert(explanation.certainty === 'heuristic', 'Shape certainty is heuristic');
  assert(explanation.disclaimer !== undefined && explanation.disclaimer.length > 0, '9. Mandatory disclaimer is present');
  assert(explanation.sources.includes('SRC-HEURISTIC-SHAPE-DIMENSIONS'), 'Cites internal heuristic shape source, NOT classical text');
  assert(explanation.formattedText.includes('Lưu ý / Miễn trừ'), 'Formatted text contains disclaimer line');
}

startCase('TC 5.3: Profile and Assessment explainers output coherent Vietnamese');
{
  const furniture: RoomObject = mockRoomObj({
    id: 'wardrobe-master',
    type: 'wardrobe',
    x: 1,
    y: 1,
    width: 1.8,
    length: 0.6,
    height: 2.2,
    material: 'walnut',
    color: '#8b5a2b',
  });

  const summary = evaluateFurnitureAssessment(furniture, 'Mộc');
  const profileText = explainFurnitureProfile(summary.profile);
  assert(profileText.includes('HỒ SƠ NGŨ HÀNH'), 'Profile text has header');
  assert(profileText.includes('Hành chủ đạo: Hành Mộc'), 'Identifies dominant element in profile');

  const summaryText = explainFurnitureAssessment(summary);
  assert(summaryText.includes('KẾT QUẢ QUY TẮC NGŨ HÀNH'), 'Summary text contains rule section');
  assert(summaryText.includes('PASS'), 'Summary text mentions rule counts');
}

startCase('TC 5.4: Whole-room explainer explicitly notes NULL overallHarmonyScore');
{
  const roomConfig: RoomConfig = { width: 5, length: 5, height: 2.8, direction: 'S', wallColor: '#ffffff' };
  const objects: RoomObject[] = [];
  const assessment = evaluateRoomElementAssessment(roomConfig, objects, 'Kim');
  const roomText = explainRoomElementAssessment(assessment);

  assert(roomText.includes('overallHarmonyScore'), 'Explainer explicitly mentions overallHarmonyScore');
  assert(roomText.includes('[NULL]'), 'Explainer displays [NULL] score');
  assert(roomText.includes('tuyệt đối KHÔNG tự tạo điểm số tổng hợp giả lập'), 'Explainer states anti-synthetic score policy');
}

startCase('TC 5.5: Every single one of 7 core rules produces all 9 required fields in explainRuleResult');
{
  const sampleBed: RoomObject = mockRoomObj({
    id: 'sample-bed',
    type: 'bed',
    x: 2,
    y: 2,
    width: 1.8,
    length: 2.0,
    height: 0.9,
    material: 'oak',
    color: '#ffffff',
  });
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'S', wallColor: '#ffffff', floorColor: '#e0c8a0' };

  const allRules: ElementRuleResult[] = [
    ...evaluateFurnitureElementRules(sampleBed, 'Kim', { direction: 'W' }),
    evaluateRuleNhRoom01(roomConfig, 'Kim'),
  ];

  assert(allRules.length === 7, `Evaluated all 7 core rules (actual: ${allRules.length})`);

  for (const rule of allRules) {
    const exp = explainRuleResult(rule, 'Đồ thử nghiệm');
    assert(exp.targetObject.length > 0, `Rule ${rule.ruleId}: targetObject is non-empty`);
    assert(exp.attribute.length > 0, `Rule ${rule.ruleId}: attribute is non-empty`);
    assert(exp.personalElement.length > 0, `Rule ${rule.ruleId}: personalElement is non-empty`);
    assert(exp.attributeElement.length > 0, `Rule ${rule.ruleId}: attributeElement is non-empty`);
    assert(exp.relationship.length > 0, `Rule ${rule.ruleId}: relationship is non-empty`);
    assert(['pass', 'warn', 'fail', 'unknown', 'n/a'].includes(exp.verdict), `Rule ${rule.ruleId}: valid verdict`);
    assert(exp.verdictLabel.length > 0, `Rule ${rule.ruleId}: verdictLabel is localized`);
    assert(exp.rationale.length > 0, `Rule ${rule.ruleId}: rationale is non-empty`);
    assert(exp.sources.length > 0, `Rule ${rule.ruleId}: sources list is non-empty`);
    assert(['classical', 'applied', 'heuristic'].includes(exp.certainty), `Rule ${rule.ruleId}: valid certainty`);
    assert(exp.certaintyLabel.length > 0, `Rule ${rule.ruleId}: certaintyLabel is localized`);
    assert(exp.formattedText.length > 0, `Rule ${rule.ruleId}: formattedText is non-empty`);
  }
}

startCase('TC 5.6: Directional relation labels explain Sinh nhập / Sinh xuất / Khắc nhập / Khắc xuất clearly');
{
  assert(getRelationVietnameseLabel('SAME', 'Kim', 'Kim').includes('Tương hòa'), 'SAME label accurate');
  assert(getRelationVietnameseLabel('GENERATED_BY', 'Kim', 'Thổ').includes('Sinh nhập'), 'GENERATED_BY label has Sinh nhập');
  assert(getRelationVietnameseLabel('GENERATES', 'Kim', 'Thủy').includes('Sinh xuất'), 'GENERATES label has Sinh xuất');
  assert(getRelationVietnameseLabel('OVERCOMES', 'Kim', 'Mộc').includes('Khắc xuất'), 'OVERCOMES label has Khắc xuất');
  assert(getRelationVietnameseLabel('OVERCOME_BY', 'Kim', 'Hỏa').includes('Khắc nhập'), 'OVERCOME_BY label has Khắc nhập');
  assert(getRelationVietnameseLabel('UNKNOWN').includes('Chưa xác định'), 'UNKNOWN label handled');
}

startCase('TC 5.7: Furniture name humanizer handles standard types and fallback');
{
  assert(humanizeObjectName('bed') === 'Giường ngủ', 'bed -> Giường ngủ');
  assert(humanizeObjectName('desk') === 'Bàn làm việc', 'desk -> Bàn làm việc');
  assert(humanizeObjectName('wardrobe') === 'Tủ quần áo', 'wardrobe -> Tủ quần áo');
  assert(humanizeObjectName('custom_shelf') === 'custom_shelf', 'fallback preserves custom name');
  assert(humanizeObjectName(null) === 'Đồ nội thất', 'null -> fallback Đồ nội thất');
}

// =============================================================================
// TEST SUITE 6: Invariance & Architecture Boundary Checks
// =============================================================================
console.log('--- SUITE 6: Invariance & Architecture Boundary Checks ---');

startCase('TC 6.1: Master Preset benchmark strictly unchanged (Bed: 30, Desk: 92, Mirror: 45, Overall: 51)');
{
  const profile1985 = getUserFengShuiProfile(1985, 'male');
  const masterObjects = ROOM_PRESETS.master.objects;
  const masterConfig = ROOM_PRESETS.master.config;
  const masterResult = evaluateRoomFengShui(profile1985, masterConfig, masterObjects);

  assert(masterResult.overallScore === 51, `Master Preset overallScore must be strictly 51 (actual: ${masterResult.overallScore})`);
  assert(masterResult.breakdown.bedScore === 30, `Bed score must be strictly 30 (actual: ${masterResult.breakdown.bedScore})`);
  assert(masterResult.breakdown.deskScore === 92, `Desk score must be strictly 92 (actual: ${masterResult.breakdown.deskScore})`);
  assert(masterResult.breakdown.circulationScore === 70, `Circulation score must be strictly 70 (actual: ${masterResult.breakdown.circulationScore})`);
}

startCase('TC 6.2: Zero synthetic score injection');
{
  const roomConfig: RoomConfig = { width: 5, length: 5, height: 2.8, direction: 'S', wallColor: '#ffffff' };
  const objects: RoomObject[] = [
    mockRoomObj({ id: 'bed-1', type: 'bed', x: 2, y: 2, width: 1.8, length: 2.0, color: '#ffffff', material: 'metal' }),
  ];

  const assessment = evaluateRoomElementAssessment(roomConfig, objects, 'Kim');
  const serialized = JSON.stringify(assessment);
  assert(!serialized.includes('"syntheticScore"'), 'Output must not contain syntheticScore');
  assert(assessment.overallHarmonyScore === null, 'overallHarmonyScore must be null');
}

startCase('TC 6.3: Architecture Guard — Zero reverse imports from nguHanh into P0-P7.5 modules');
{
  const fs = await import('node:fs');
  const path = await import('node:path');

  const engineDir = path.resolve('src/engine');
  const engineFiles = fs.readdirSync(engineDir).filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

  let reverseImportFound = false;
  for (const file of engineFiles) {
    const fullPath = path.join(engineDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.includes('/nguHanh/') || content.includes("from './core/nguHanh")) {
      reverseImportFound = true;
      console.error(`Reverse import detected in ${file}`);
    }
  }

  assert(!reverseImportFound, 'Zero reverse imports from nguHanh into frozen P0-P7.5 engines');

  // Specific check on unifiedAssessment.ts
  const unifiedContent = fs.readFileSync(path.join(engineDir, 'core', 'unifiedAssessment.ts'), 'utf-8');
  assert(!unifiedContent.includes('nguHanh'), 'unifiedAssessment.ts does not reference or import nguHanh');
}

console.log('\n=============================================================================');
console.log(`P8-M3 TEST RESULTS:`);
console.log(`• Test Cases: ${testCasesCount} executed`);
console.log(`• Assertions: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
console.log('=============================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
