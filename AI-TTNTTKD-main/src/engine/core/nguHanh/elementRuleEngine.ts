// =============================================================================
// src/engine/core/nguHanh/elementRuleEngine.ts
// Phase P8-M2 — Five Elements (Ngũ Hành) Rule Engine (7 Core Rules)
//
// DESIGN PRINCIPLES:
// - Deterministic, fully explainable Five Elements evaluation.
// - Zero AI hallucination, 100% compliant with standard RuleResult contract.
// - Accurately differentiates 4 verdicts: 'pass' | 'warn' | 'fail' | 'unknown' | 'n/a'.
// - Never treats 'unknown' as 'pass'.
// - Implements all 7 core rules from P8 Architecture Specification V1.1:
//   1. NH-COLOR-01: Supporting / matching furniture color
//   2. NH-COLOR-02: Clashing furniture color
//   3. NH-MAT-01: Supporting major furniture material (bed, desk, wardrobe)
//   4. NH-MAT-02: Clashing major furniture material (bed, desk, wardrobe)
//   5. NH-SHAPE-01: 3D geometric shape ratio with mandatory heuristic disclaimer
//   6. NH-DIR-01: Placement direction & sector (including 'center' as Thổ)
//   7. NH-ROOM-01: Whole-room color (wallColor & floorColor)
// - Attributes of an object are analyzed independently; never aggregated into a fake unified score.
// - Fully decoupled from P5 overallScore and Master Preset benchmark (89/51).
// =============================================================================

import {
  RuleResult,
  RuleVerdict,
  RuleSeverity,
  RuleDataStatus,
} from '../ruleTypes.js';
import {
  RoomObject,
  RoomConfig,
  CompassDirection,
} from '../../../types/fengshui.js';
import {
  NguHanhElement,
  ElementDataStatus,
  ElementCertainty,
  ElementAnalysisResult,
  ElementRelationType,
} from './elementTypes.js';
import {
  classifyColorElement,
  classifyMaterialElement,
  classifyShapeElement,
  classifyDirectionElement,
} from './elementMapping.js';
import {
  getElementRelationship,
  RELATION_LABELS,
  HARMONY_SCORE_DISCLAIMER,
} from './elementRelationship.js';

export const ENGINE_VERSION = '1.0.0-p8.2';

/**
 * Extended RuleResult containing Five Elements metadata.
 * 100% compatible with existing RuleResult interface from ruleTypes.ts.
 */
export interface ElementRuleResult extends RuleResult {
  ruleName: string;                  // Direct alias for name
  elementDataStatus: ElementDataStatus;
  certainty: ElementCertainty;
  sourceId: string;
  disclaimer?: string;
  evidence?: Record<string, unknown>;
  relationType?: ElementRelationType;
}

const APPLICABLE_MATERIAL_TYPES: readonly string[] = ['bed', 'desk', 'wardrobe'] as const;

// =============================================================================
// RULE 1: NH-COLOR-01 — Màu sắc nội thất tương sinh hoặc đồng hành bản mệnh
// =============================================================================

export function evaluateRuleNhColor01(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  precomputedColor?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-COLOR-01';
  const ruleName = 'Màu sắc nội thất hỗ trợ hoặc đồng hành bản mệnh';
  const colorAnalysis = precomputedColor || classifyColorElement(furniture.color);

  // Missing personal element profile
  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở để đánh giá màu sắc tương sinh.',
      inputs: { color: furniture.color, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  // Non-known color data status (ambiguous, insufficient, unsupported)
  if (colorAnalysis.dataStatus !== 'known' || !colorAnalysis.element) {
    const isAmbiguous = colorAnalysis.dataStatus === 'ambiguous';
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: isAmbiguous ? 'sufficient' : 'insufficient',
      elementDataStatus: colorAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: colorAnalysis.certainty || 'applied',
      sourceId: colorAnalysis.sourceId || 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: colorAnalysis.sourceRef.length ? colorAnalysis.sourceRef : ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: isAmbiguous
        ? `Màu sắc của ${furniture.name || furniture.type} mang tính trung tính/đa nghĩa (${colorAnalysis.explanation}), không thể phân định tương sinh.`
        : `Dữ liệu màu sắc của ${furniture.name || furniture.type} không hợp lệ hoặc bị thiếu (${colorAnalysis.dataStatus}).`,
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // Known color and known personal element: evaluate directional relation
  const rel = getElementRelationship(personalElement, colorAnalysis.element);
  const colorDisplay = colorAnalysis.normalizedValue || furniture.color || 'đã chọn';

  if (rel === 'SAME') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: colorAnalysis.certainty || 'applied',
      sourceId: colorAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) đồng hành với bản mệnh ${personalElement} của gia chủ, giúp củng cố bản khí và tạo sự ổn định vững bền.`,
      evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'GENERATED_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: colorAnalysis.certainty || 'applied',
      sourceId: colorAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) tương sinh (Sinh nhập) cho bản mệnh ${personalElement} của gia chủ, thu hút năng lượng nuôi dưỡng và tăng cường sinh khí.`,
      evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'GENERATES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: colorAnalysis.certainty || 'applied',
      sourceId: colorAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) tương sinh (Sinh xuất) với bản mệnh ${personalElement} của gia chủ, hỗ trợ luân chuyển trường khí hài hòa.`,
      evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // If clashing (OVERCOME_BY or OVERCOMES), NH-COLOR-01 indicates no support (handled primarily by NH-COLOR-02)
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'warn',
    severity: 'minor',
    certainty: colorAnalysis.certainty || 'applied',
    sourceId: colorAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    relationType: rel,
    explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) không thuộc nhóm tương sinh hay đồng hành với bản mệnh ${personalElement}. Yếu tố xung khắc được kiểm soát độc lập tại quy tắc NH-COLOR-02.`,
    evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
    inputs: { color: furniture.color, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 2: NH-COLOR-02 — Màu sắc nội thất tương khắc bản mệnh
// =============================================================================

export function evaluateRuleNhColor02(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  precomputedColor?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-COLOR-02';
  const ruleName = 'Màu sắc nội thất tương khắc bản mệnh';
  const colorAnalysis = precomputedColor || classifyColorElement(furniture.color);

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở để kiểm tra tương khắc màu sắc.',
      inputs: { color: furniture.color, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (colorAnalysis.dataStatus !== 'known' || !colorAnalysis.element) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: colorAnalysis.dataStatus === 'ambiguous' ? 'sufficient' : 'insufficient',
      elementDataStatus: colorAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: colorAnalysis.certainty || 'applied',
      sourceId: colorAnalysis.sourceId || 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: colorAnalysis.sourceRef.length ? colorAnalysis.sourceRef : ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: `Màu sắc của ${furniture.name || furniture.type} không đủ căn cứ để kết luận xung khắc (${colorAnalysis.explanation}).`,
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, colorAnalysis.element);
  const colorDisplay = colorAnalysis.normalizedValue || furniture.color || 'đã chọn';

  if (rel === 'OVERCOME_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'fail',
      severity: 'major',
      certainty: colorAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) khắc nhập bản mệnh ${personalElement} của gia chủ (${colorAnalysis.element} khắc ${personalElement}), gây áp lực xung khắc tiêu cực trực tiếp lên trường khí.`,
      remedy: `Cân nhắc thay đổi màu sắc hoặc phối thêm phụ kiện mang hành tương sinh với ${personalElement}.`,
      evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'OVERCOMES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'warn',
      severity: 'minor',
      certainty: colorAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) bị bản mệnh ${personalElement} của gia chủ khắc xuất (${personalElement} khắc ${colorAnalysis.element}), làm tiêu hao phần nào sinh khí để chế ngự đối tượng.`,
      evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
      inputs: { color: furniture.color, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // Not overcoming (SAME, GENERATES, GENERATED_BY) -> pass (no clash detected)
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'pass',
    severity: 'info',
    certainty: colorAnalysis.certainty || 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA'],
    relationType: rel,
    explanation: `Màu sắc ${colorDisplay} (${colorAnalysis.element}) không xung khắc với bản mệnh ${personalElement} của gia chủ.`,
    evidence: { personalElement, colorElement: colorAnalysis.element, relation: rel },
    inputs: { color: furniture.color, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 3: NH-MAT-01 — Vật liệu nội thất chính hỗ trợ bản mệnh
// =============================================================================

export function evaluateRuleNhMat01(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  precomputedMaterial?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-MAT-01';
  const ruleName = 'Vật liệu nội thất chính hỗ trợ bản mệnh';

  // Applicability check: only main furniture items (bed, desk, wardrobe)
  if (!APPLICABLE_MATERIAL_TYPES.includes(furniture.type.toLowerCase())) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: 'not_applicable',
      elementDataStatus: 'known',
      verdict: 'n/a',
      severity: 'info',
      certainty: 'applied',
      sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: `Quy tắc vật liệu nội thất hỗ trợ chỉ áp dụng cho các đồ vật chính (${APPLICABLE_MATERIAL_TYPES.join(', ')}). Vật thể '${furniture.type}' không thuộc diện bắt buộc.`,
      inputs: { objectType: furniture.type, material: furniture.material },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở để đánh giá vật liệu hỗ trợ.',
      inputs: { objectType: furniture.type, material: furniture.material, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  const matAnalysis = precomputedMaterial || classifyMaterialElement(furniture.material);

  if (matAnalysis.dataStatus !== 'known' || !matAnalysis.element) {
    const isAmbiguous = matAnalysis.dataStatus === 'ambiguous';
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: isAmbiguous ? 'sufficient' : 'insufficient',
      elementDataStatus: matAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: matAnalysis.certainty || 'applied',
      sourceId: matAnalysis.sourceId || 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: matAnalysis.sourceRef.length ? matAnalysis.sourceRef : ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: isAmbiguous
        ? `Vật liệu ${furniture.material} của ${furniture.name || furniture.type} mang tính đa nghĩa/nhân tạo tổng hợp (${matAnalysis.explanation}), không thể phân định tương sinh chính xác.`
        : `Vật liệu của ${furniture.name || furniture.type} bị thiếu hoặc chưa được hỗ trợ phân loại (${matAnalysis.dataStatus}).`,
      inputs: { objectType: furniture.type, material: furniture.material, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, matAnalysis.element);

  if (rel === 'SAME' || rel === 'GENERATED_BY' || rel === 'GENERATES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: matAnalysis.certainty || 'applied',
      sourceId: matAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Vật liệu ${furniture.material} (${matAnalysis.element}) tương sinh hoặc đồng hành (${RELATION_LABELS[rel]}) với bản mệnh ${personalElement} của gia chủ, giúp gia tăng vượng khí.`,
      evidence: { personalElement, materialElement: matAnalysis.element, relation: rel },
      inputs: { objectType: furniture.type, material: furniture.material, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // Not generating or matching
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'warn',
    severity: 'minor',
    certainty: matAnalysis.certainty || 'applied',
    sourceId: matAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    relationType: rel,
    explanation: `Vật liệu ${furniture.material} (${matAnalysis.element}) không thuộc nhóm tương sinh/đồng hành với bản mệnh ${personalElement}. Yếu tố xung khắc được kiểm soát tại NH-MAT-02.`,
    evidence: { personalElement, materialElement: matAnalysis.element, relation: rel },
    inputs: { objectType: furniture.type, material: furniture.material, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 4: NH-MAT-02 — Vật liệu nội thất chính xung khắc bản mệnh
// =============================================================================

export function evaluateRuleNhMat02(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  precomputedMaterial?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-MAT-02';
  const ruleName = 'Vật liệu nội thất chính xung khắc bản mệnh';

  if (!APPLICABLE_MATERIAL_TYPES.includes(furniture.type.toLowerCase())) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: 'not_applicable',
      elementDataStatus: 'known',
      verdict: 'n/a',
      severity: 'info',
      certainty: 'applied',
      sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: `Quy tắc vật liệu xung khắc chỉ áp dụng cho nội thất chính (${APPLICABLE_MATERIAL_TYPES.join(', ')}). Vật thể '${furniture.type}' được bỏ qua.`,
      inputs: { objectType: furniture.type, material: furniture.material },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở để đánh giá tương khắc vật liệu.',
      inputs: { objectType: furniture.type, material: furniture.material, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  const matAnalysis = precomputedMaterial || classifyMaterialElement(furniture.material);

  if (matAnalysis.dataStatus !== 'known' || !matAnalysis.element) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: matAnalysis.dataStatus === 'ambiguous' ? 'sufficient' : 'insufficient',
      elementDataStatus: matAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: matAnalysis.certainty || 'applied',
      sourceId: matAnalysis.sourceId || 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: matAnalysis.sourceRef.length ? matAnalysis.sourceRef : ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: `Không thể đánh giá tương khắc vật liệu do trạng thái dữ liệu là ${matAnalysis.dataStatus} (${matAnalysis.explanation}).`,
      inputs: { objectType: furniture.type, material: furniture.material, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, matAnalysis.element);

  if (rel === 'OVERCOME_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'fail',
      severity: 'major',
      certainty: matAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `Vật liệu ${furniture.material} (${matAnalysis.element}) khắc nhập bản mệnh ${personalElement} của gia chủ (${matAnalysis.element} khắc ${personalElement}), gây xung khắc trực tiếp cho đồ vật chính trong không gian.`,
      remedy: `Nên ưu tiên sử dụng đồ vật bằng vật liệu tương sinh hoặc đồng hành với bản mệnh ${personalElement}.`,
      evidence: { personalElement, materialElement: matAnalysis.element, relation: rel },
      inputs: { objectType: furniture.type, material: furniture.material, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'OVERCOMES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'warn',
      severity: 'minor',
      certainty: matAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `Vật liệu ${furniture.material} (${matAnalysis.element}) bị bản mệnh ${personalElement} của gia chủ khắc xuất (${personalElement} khắc ${matAnalysis.element}), làm tiêu hao phần nào sinh lực để áp chế.`,
      evidence: { personalElement, materialElement: matAnalysis.element, relation: rel },
      inputs: { objectType: furniture.type, material: furniture.material, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // SAME, GENERATES, GENERATED_BY -> pass
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'pass',
    severity: 'info',
    certainty: matAnalysis.certainty || 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA'],
    relationType: rel,
    explanation: `Vật liệu ${furniture.material} (${matAnalysis.element}) không xung khắc với bản mệnh ${personalElement} của gia chủ.`,
    evidence: { personalElement, materialElement: matAnalysis.element, relation: rel },
    inputs: { objectType: furniture.type, material: furniture.material, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 5: NH-SHAPE-01 — Hình dạng đồ vật theo tỷ lệ hình học 3D
// =============================================================================

export function evaluateRuleNhShape01(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  precomputedShape?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-SHAPE-01';
  const ruleName = 'Hình dạng hình học đồ nội thất theo Ngũ Hành';
  const shapeAnalysis = precomputedShape || classifyShapeElement(furniture.dimensions);

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở đánh giá tương quan hình dạng.',
      disclaimer: shapeAnalysis.disclaimer,
      inputs: { dimensions: furniture.dimensions, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (shapeAnalysis.dataStatus !== 'known' || !shapeAnalysis.element) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: shapeAnalysis.dataStatus === 'ambiguous' ? 'sufficient' : 'insufficient',
      elementDataStatus: shapeAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      explanation: shapeAnalysis.dataStatus === 'ambiguous'
        ? `Tỷ lệ hình học 3D của ${furniture.name || furniture.type} nằm trong khoảng tiêu chuẩn thông thường, không thể hiện hình thế Ngũ Hành đơn nhất vượt trội.`
        : `Kích thước của ${furniture.name || furniture.type} không hợp lệ hoặc bị thiếu (${shapeAnalysis.dataStatus}).`,
      disclaimer: shapeAnalysis.disclaimer,
      inputs: { dimensions: furniture.dimensions, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, shapeAnalysis.element);

  if (rel === 'SAME' || rel === 'GENERATED_BY' || rel === 'GENERATES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      relationType: rel,
      explanation: `Hình thế hình học 3D (${shapeAnalysis.explanation}) tương sinh hoặc đồng hành (${RELATION_LABELS[rel]}) với bản mệnh ${personalElement} của gia chủ.`,
      disclaimer: shapeAnalysis.disclaimer,
      evidence: { personalElement, shapeElement: shapeAnalysis.element, relation: rel },
      inputs: { dimensions: furniture.dimensions, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'OVERCOME_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'optional',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'fail',
      severity: 'major',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      relationType: rel,
      explanation: `Hình thế hình học 3D (${shapeAnalysis.explanation}) xung khắc trực tiếp (Khắc nhập) với bản mệnh ${personalElement} của gia chủ.`,
      disclaimer: shapeAnalysis.disclaimer,
      evidence: { personalElement, shapeElement: shapeAnalysis.element, relation: rel },
      inputs: { dimensions: furniture.dimensions, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // OVERCOMES
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'optional',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'warn',
    severity: 'minor',
    certainty: 'heuristic',
    sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
    sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-SHAPE-DIMENSIONS'],
    relationType: rel,
    explanation: `Hình thế hình học 3D (${shapeAnalysis.explanation}) bị bản mệnh ${personalElement} của gia chủ khắc xuất.`,
    disclaimer: shapeAnalysis.disclaimer,
    evidence: { personalElement, shapeElement: shapeAnalysis.element, relation: rel },
    inputs: { dimensions: furniture.dimensions, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 6: NH-DIR-01 — Phương vị đặt đồ vật theo Ngũ Hành
// =============================================================================

export function evaluateRuleNhDir01(
  direction: CompassDirection | 'center' | string | null | undefined,
  personalElement: NguHanhElement | null,
  northBearingDeg: number | null = null,
  precomputedDir?: ElementAnalysisResult
): ElementRuleResult {
  const ruleId = 'NH-DIR-01';
  const ruleName = 'Phương vị đặt đồ vật nội thất theo Ngũ Hành';
  const dirAnalysis = precomputedDir || classifyDirectionElement(direction, northBearingDeg);

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không đủ cơ sở đánh giá phương vị đặt đồ vật.',
      inputs: { direction, northBearingDeg, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (dirAnalysis.dataStatus !== 'known' || !dirAnalysis.element) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      elementDataStatus: dirAnalysis.dataStatus,
      verdict: 'unknown',
      severity: 'info',
      certainty: dirAnalysis.certainty || 'applied',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: `Phương vị không hợp lệ hoặc bị thiếu (${dirAnalysis.dataStatus}).`,
      inputs: { direction, northBearingDeg, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, dirAnalysis.element);
  const dirLabel = direction === 'center' ? 'Trung cung (Tâm phòng)' : `Hướng ${direction}`;

  if (rel === 'SAME' || rel === 'GENERATED_BY' || rel === 'GENERATES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: dirAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `${dirLabel} thuộc hành ${dirAnalysis.element}, tương sinh/đồng hành (${RELATION_LABELS[rel]}) với bản mệnh ${personalElement} của gia chủ.${dirAnalysis.disclaimer ? ` [Lưu ý: ${dirAnalysis.disclaimer}]` : ''}`,
      disclaimer: dirAnalysis.disclaimer,
      evidence: { personalElement, directionElement: dirAnalysis.element, relation: rel, direction, northBearingDeg },
      inputs: { direction, northBearingDeg, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'OVERCOME_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'fail',
      severity: 'major',
      certainty: dirAnalysis.certainty || 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      relationType: rel,
      explanation: `${dirLabel} thuộc hành ${dirAnalysis.element}, khắc nhập bản mệnh ${personalElement} của gia chủ (${dirAnalysis.element} khắc ${personalElement}), gây xung khắc bất lợi tại phương vị bố trí.${dirAnalysis.disclaimer ? ` [Lưu ý: ${dirAnalysis.disclaimer}]` : ''}`,
      disclaimer: dirAnalysis.disclaimer,
      remedy: `Xem xét điều chỉnh vị trí đặt đồ vật sang các phương vị tương sinh hoặc đồng hành với bản mệnh ${personalElement}.`,
      evidence: { personalElement, directionElement: dirAnalysis.element, relation: rel, direction, northBearingDeg },
      inputs: { direction, northBearingDeg, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // OVERCOMES
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'warn',
    severity: 'minor',
    certainty: dirAnalysis.certainty || 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA'],
    relationType: rel,
    explanation: `${dirLabel} thuộc hành ${dirAnalysis.element}, bị bản mệnh ${personalElement} của gia chủ khắc xuất.${dirAnalysis.disclaimer ? ` [Lưu ý: ${dirAnalysis.disclaimer}]` : ''}`,
    disclaimer: dirAnalysis.disclaimer,
    evidence: { personalElement, directionElement: dirAnalysis.element, relation: rel, direction, northBearingDeg },
    inputs: { direction, northBearingDeg, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// RULE 7: NH-ROOM-01 — Màu sắc tổng thể không gian phòng
// =============================================================================

export function evaluateRuleNhRoom01(
  roomConfig: RoomConfig,
  personalElement: NguHanhElement | null
): ElementRuleResult {
  const ruleId = 'NH-ROOM-01';
  const ruleName = 'Màu sắc tổng thể không gian phòng theo Ngũ Hành';

  if (!personalElement) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['personalElement'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'classical',
      sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA'],
      explanation: 'Thiếu thông tin bản mệnh gia chủ, không thể đánh giá màu sắc tổng thể không gian.',
      inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement: null },
      engineVersion: ENGINE_VERSION,
    };
  }

  const hasWallColor = typeof roomConfig.wallColor === 'string' && roomConfig.wallColor.trim() !== '';
  const hasFloorColor = typeof roomConfig.floorColor === 'string' && roomConfig.floorColor.trim() !== '';

  // If both wall and floor colors are absent -> insufficient data
  if (!hasWallColor && !hasFloorColor) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      elementDataStatus: 'insufficient',
      missingInputs: ['wallColor', 'floorColor'],
      verdict: 'unknown',
      severity: 'info',
      certainty: 'applied',
      sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: 'Phòng chưa có dữ liệu màu tường (wallColor) hoặc màu sàn (floorColor), không đủ cơ sở đánh giá Ngũ Hành tổng thể không gian.',
      inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // Evaluate available room colors
  const wallAnalysis = hasWallColor ? classifyColorElement(roomConfig.wallColor) : null;
  const floorAnalysis = hasFloorColor ? classifyColorElement(roomConfig.floorColor) : null;

  // Determine dominant or primary surface
  const primaryAnalysis = wallAnalysis?.dataStatus === 'known' ? wallAnalysis : floorAnalysis;

  if (!primaryAnalysis || primaryAnalysis.dataStatus !== 'known' || !primaryAnalysis.element) {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      elementDataStatus: primaryAnalysis?.dataStatus || 'insufficient',
      verdict: 'unknown',
      severity: 'info',
      certainty: 'applied',
      sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
      sources: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      explanation: 'Dữ liệu màu tường hoặc màu sàn chưa thể phân loại Ngũ Hành xác định.',
      inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  const rel = getElementRelationship(personalElement, primaryAnalysis.element);

  if (rel === 'SAME' || rel === 'GENERATED_BY' || rel === 'GENERATES') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'pass',
      severity: 'info',
      certainty: primaryAnalysis.certainty || 'applied',
      sourceId: primaryAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Màu sắc không gian chủ đạo (${primaryAnalysis.element}) tương sinh hoặc đồng hành (${RELATION_LABELS[rel]}) với bản mệnh ${personalElement} của gia chủ, tạo trường khí hài hòa toàn phòng.`,
      evidence: { personalElement, roomElement: primaryAnalysis.element, relation: rel },
      inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  if (rel === 'OVERCOME_BY') {
    return {
      ruleId,
      name: ruleName,
      ruleName,
      category: 'ngu_hanh',
      school: 'ngu_hanh',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      elementDataStatus: 'known',
      verdict: 'fail',
      severity: 'major',
      certainty: primaryAnalysis.certainty || 'applied',
      sourceId: primaryAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
      sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
      relationType: rel,
      explanation: `Màu sắc chủ đạo của phòng (${primaryAnalysis.element}) khắc nhập bản mệnh ${personalElement} của gia chủ (${primaryAnalysis.element} khắc ${personalElement}), bao phủ không gian bằng trường khí xung khắc.`,
      evidence: { personalElement, roomElement: primaryAnalysis.element, relation: rel },
      inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement },
      engineVersion: ENGINE_VERSION,
    };
  }

  // OVERCOMES
  return {
    ruleId,
    name: ruleName,
    ruleName,
    category: 'ngu_hanh',
    school: 'ngu_hanh',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    elementDataStatus: 'known',
    verdict: 'warn',
    severity: 'minor',
    certainty: primaryAnalysis.certainty || 'applied',
    sourceId: primaryAnalysis.sourceId || 'SRC-NGU-HANH-DAI-NGHIA',
    sources: ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    relationType: rel,
    explanation: `Màu sắc chủ đạo của phòng (${primaryAnalysis.element}) bị bản mệnh ${personalElement} của gia chủ khắc xuất.`,
    evidence: { personalElement, roomElement: primaryAnalysis.element, relation: rel },
    inputs: { wallColor: roomConfig.wallColor, floorColor: roomConfig.floorColor, personalElement },
    engineVersion: ENGINE_VERSION,
  };
}

// =============================================================================
// MULTI-ATTRIBUTE EVALUATION PIPELINE
// =============================================================================

/**
 * Options for multi-attribute furniture evaluation.
 */
export interface FurnitureRuleEvaluationOptions {
  direction?: CompassDirection | 'center' | string | null;
  northBearingDeg?: number | null;
}

/**
 * Evaluates all applicable Five Elements rules for a single furniture object.
 * Analyzes each physical attribute (Color, Material, Shape, Direction) independently.
 * Never merges or overwrites conflicting rule results into an arbitrary unified score.
 */
export function evaluateFurnitureElementRules(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  options: FurnitureRuleEvaluationOptions = {}
): ElementRuleResult[] {
  const results: ElementRuleResult[] = [];

  // 1. Color rules
  results.push(evaluateRuleNhColor01(furniture, personalElement));
  results.push(evaluateRuleNhColor02(furniture, personalElement));

  // 2. Material rules
  results.push(evaluateRuleNhMat01(furniture, personalElement));
  results.push(evaluateRuleNhMat02(furniture, personalElement));

  // 3. Shape rule
  results.push(evaluateRuleNhShape01(furniture, personalElement));

  // 4. Direction rule (if direction or placement provided)
  if (options.direction !== undefined) {
    results.push(evaluateRuleNhDir01(options.direction, personalElement, options.northBearingDeg));
  }

  return results;
}

