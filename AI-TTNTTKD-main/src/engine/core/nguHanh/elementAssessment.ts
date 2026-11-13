// =============================================================================
// src/engine/core/nguHanh/elementAssessment.ts
// Phase P8-M3 — Five Elements (Ngũ Hành) Assessment Engine
//
// DESIGN PRINCIPLES:
// - Aggregates classification, relationship, and rule evaluation deterministically.
// - Evaluates per-object and whole-room Five Elements harmony.
// - Strictly preserves independent results of each rule (zero conflation).
// - Transparent count of PASS / WARN / FAIL / UNKNOWN / N/A (never treats UNKNOWN as PASS).
// - ZERO synthetic score creation: no syntheticScore, no artificial room-level score.
// - Strictly decoupled from P5 overallScore and Master Preset benchmark (89/51).
// =============================================================================

import {
  RoomObject,
  RoomConfig,
  CompassDirection,
} from '../../../types/fengshui.js';
import {
  NguHanhElement,
  ElementDataStatus,
  FurnitureElementProfile,
  ElementRoomAssessment,
  ElementRelationResult,
} from './elementTypes.js';
import {
  classifyColorElement,
  classifyMaterialElement,
  classifyShapeElement,
  classifyDirectionElement,
} from './elementMapping.js';
import {
  getElementRelationship,
  analyzeElementRelationship,
  HARMONY_SCORE_DISCLAIMER,
} from './elementRelationship.js';
import {
  ElementRuleResult,
  evaluateRuleNhColor01,
  evaluateRuleNhColor02,
  evaluateRuleNhMat01,
  evaluateRuleNhMat02,
  evaluateRuleNhShape01,
  evaluateRuleNhDir01,
  evaluateRuleNhRoom01,
  evaluateFurnitureElementRules,
  ENGINE_VERSION,
} from './elementRuleEngine.js';

/**
 * Options for single furniture profile construction and assessment.
 */
export interface FurnitureProfileOptions {
  direction?: CompassDirection | 'center' | string | null;
  northBearingDeg?: number | null;
}

/**
 * Options for whole-room Five Elements assessment.
 */
export interface RoomAssessmentOptions {
  northBearingDeg?: number | null;
  napAmElement?: NguHanhElement | null;
}

/**
 * Comprehensive per-furniture assessment output preserving independent rule results.
 */
export interface FurnitureAssessmentSummary {
  profile: FurnitureElementProfile;
  rules: ElementRuleResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  unknownCount: number;
  naCount: number;
  keyIssues: string[];
  remedies: string[];
}

/**
 * Extended whole-room assessment report including raw rule results and audit counts.
 */
export interface DetailedRoomElementAssessment extends ElementRoomAssessment {
  allRules: ElementRuleResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  unknownCount: number;
  naCount: number;
  totalEvaluated: number;
  furnitureSummaries: FurnitureAssessmentSummary[];
}

/**
 * Builds a deterministic Five Elements profile for a single furniture object.
 * Analyzes color, material, shape, and direction independently.
 * Determines dominant element only with transparent, auditable rationale.
 */
export function buildFurnitureElementProfile(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  options: FurnitureProfileOptions = {}
): FurnitureElementProfile {
  const colorAnalysis = classifyColorElement(furniture.color);
  const materialAnalysis = classifyMaterialElement(furniture.material);
  const shapeAnalysis = classifyShapeElement(furniture.dimensions);
  const locationDirectionAnalysis = classifyDirectionElement(
    options.direction,
    options.northBearingDeg
  );

  // Dominant element determination with auditable rationale
  let dominantElement: NguHanhElement | null = null;
  let dominantElementBasis = 'Chưa đủ dữ liệu để xác định hành chủ đạo.';
  let overallDataStatus: ElementDataStatus = 'insufficient';

  const hasKnownMaterial = materialAnalysis.dataStatus === 'known' && materialAnalysis.element !== null;
  const hasKnownColor = colorAnalysis.dataStatus === 'known' && colorAnalysis.element !== null;

  if (hasKnownMaterial && hasKnownColor) {
    if (materialAnalysis.element === colorAnalysis.element) {
      dominantElement = materialAnalysis.element;
      dominantElementBasis = `Vật liệu (${materialAnalysis.element}) và màu sắc (${colorAnalysis.element}) đồng nhất hành ${dominantElement}.`;
      overallDataStatus = 'known';
    } else {
      // Natural material defines core physical body; color defines surface energy
      dominantElement = materialAnalysis.element;
      dominantElementBasis = `Hành vật liệu cốt lõi (${materialAnalysis.element}) được chọn làm hành chủ đạo về thể chất; màu sắc bề mặt (${colorAnalysis.element}) mang tính bổ trợ.`;
      overallDataStatus = 'known';
    }
  } else if (hasKnownMaterial) {
    dominantElement = materialAnalysis.element;
    dominantElementBasis = `Hành chủ đạo xác định theo vật liệu cấu tạo chính (${materialAnalysis.element}).`;
    overallDataStatus = 'known';
  } else if (hasKnownColor) {
    dominantElement = colorAnalysis.element;
    dominantElementBasis = `Hành chủ đạo xác định theo sắc màu bề mặt (${colorAnalysis.element}) do chưa có thông tin vật liệu.`;
    overallDataStatus = 'known';
  } else if (
    materialAnalysis.dataStatus === 'ambiguous' ||
    colorAnalysis.dataStatus === 'ambiguous' ||
    shapeAnalysis.dataStatus === 'ambiguous'
  ) {
    dominantElement = null;
    dominantElementBasis = 'Các thuộc tính mang tính đa nghĩa/trung tính, không áp đặt hành chủ đạo.';
    overallDataStatus = 'ambiguous';
  } else if (
    materialAnalysis.dataStatus === 'unsupported' ||
    colorAnalysis.dataStatus === 'unsupported'
  ) {
    dominantElement = null;
    dominantElementBasis = 'Thuộc tính nằm ngoài phạm vi catalog hỗ trợ.';
    overallDataStatus = 'unsupported';
  }

  return {
    objectId: furniture.id,
    objectType: furniture.type,
    colorAnalysis,
    materialAnalysis,
    shapeAnalysis,
    locationDirectionAnalysis,
    dominantElement,
    dominantElementBasis,
    overallDataStatus,
  };
}

/**
 * Evaluates a single furniture object across all physical attributes and rules.
 * Keeps rule results strictly separate without averaging.
 */
export function evaluateFurnitureAssessment(
  furniture: RoomObject,
  personalElement: NguHanhElement | null,
  options: FurnitureProfileOptions = {}
): FurnitureAssessmentSummary {
  const profile = buildFurnitureElementProfile(furniture, personalElement, options);
  const rules = evaluateFurnitureElementRules(furniture, personalElement, {
    direction: options.direction,
    northBearingDeg: options.northBearingDeg,
  });

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let unknownCount = 0;
  let naCount = 0;

  const keyIssues: string[] = [];
  const remedies: string[] = [];

  for (const rule of rules) {
    switch (rule.verdict) {
      case 'pass':
        passCount++;
        break;
      case 'warn':
        warnCount++;
        keyIssues.push(`[${rule.ruleId}] ${rule.explanation}`);
        if (rule.remedy) remedies.push(rule.remedy);
        break;
      case 'fail':
        failCount++;
        keyIssues.push(`[${rule.ruleId}] ${rule.explanation}`);
        if (rule.remedy) remedies.push(rule.remedy);
        break;
      case 'unknown':
        unknownCount++;
        break;
      case 'n/a':
        naCount++;
        break;
    }
  }

  return {
    profile,
    rules,
    passCount,
    warnCount,
    failCount,
    unknownCount,
    naCount,
    keyIssues,
    remedies,
  };
}

/**
 * Evaluates whole-room Five Elements harmony across all objects and room boundary surfaces.
 *
 * GUARANTEES:
 * - Independent rule evaluation.
 * - Explicit count of PASS / WARN / FAIL / UNKNOWN / N/A.
 * - UNKNOWN is never treated as PASS.
 * - overallHarmonyScore is strictly null to prevent synthetic aggregation score creation.
 * - Zero modification of P5 overallScore or Master Preset benchmark.
 */
export function evaluateRoomElementAssessment(
  roomConfig: RoomConfig,
  objects: RoomObject[],
  personalElement: NguHanhElement | null,
  options: RoomAssessmentOptions = {}
): DetailedRoomElementAssessment {
  const northBearingDeg = options.northBearingDeg ?? null;
  const allRules: ElementRuleResult[] = [];
  const furnitureSummaries: FurnitureAssessmentSummary[] = [];
  const furnitureRelations: ElementRoomAssessment['furnitureRelations'] = [];
  const keyIssues: string[] = [];
  const cures: string[] = [];
  const disclaimersSet = new Set<string>();

  // Mandatory disclaimer for any output referencing heuristic metrics
  disclaimersSet.add(HARMONY_SCORE_DISCLAIMER);

  // 1. Evaluate each furniture object independently
  for (const obj of objects) {
    const summary = evaluateFurnitureAssessment(obj, personalElement, {
      direction: roomConfig.direction, // approximate default room orientation if object has no specific placement
      northBearingDeg,
    });

    furnitureSummaries.push(summary);
    allRules.push(...summary.rules);

    // Collect issues and remedies
    for (const issue of summary.keyIssues) keyIssues.push(`${obj.name || obj.type}: ${issue}`);
    for (const remedy of summary.remedies) cures.push(remedy);

    // Collect heuristic disclaimers from rules
    for (const r of summary.rules) {
      if (r.disclaimer) disclaimersSet.add(r.disclaimer);
    }

    // Determine relation for furnitureRelations contract
    let relation: ElementRelationResult;
    if (summary.profile.dominantElement && personalElement) {
      relation = analyzeElementRelationship(personalElement, summary.profile.dominantElement);
    } else {
      relation = analyzeElementRelationship(null, null);
    }

    furnitureRelations.push({
      objectId: obj.id,
      objectType: obj.type,
      dominantElement: summary.profile.dominantElement,
      relation,
      recommendations: summary.remedies,
    });
  }

  // 2. Evaluate whole-room color rule (NH-ROOM-01)
  const roomColorRule = evaluateRuleNhRoom01(roomConfig, personalElement);
  allRules.push(roomColorRule);
  if (roomColorRule.disclaimer) disclaimersSet.add(roomColorRule.disclaimer);

  if (roomColorRule.verdict === 'fail') {
    keyIssues.push(`[NH-ROOM-01] ${roomColorRule.explanation}`);
    if (roomColorRule.remedy) cures.push(roomColorRule.remedy);
  } else if (roomColorRule.verdict === 'warn') {
    keyIssues.push(`[NH-ROOM-01] ${roomColorRule.explanation}`);
    if (roomColorRule.remedy) cures.push(roomColorRule.remedy);
  }

  // 3. Count rule verdicts transparently
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let unknownCount = 0;
  let naCount = 0;

  for (const rule of allRules) {
    switch (rule.verdict) {
      case 'pass':
        passCount++;
        break;
      case 'warn':
        warnCount++;
        break;
      case 'fail':
        failCount++;
        break;
      case 'unknown':
        unknownCount++;
        break;
      case 'n/a':
        naCount++;
        break;
    }
  }

  const totalEvaluated = passCount + warnCount + failCount + unknownCount;

  // 4. Determine discrete harmonyLevel without fake math
  let harmonyLevel: ElementRoomAssessment['harmonyLevel'] = 'unknown';
  let dataStatus: ElementDataStatus = 'known';

  if (!personalElement) {
    harmonyLevel = 'unknown';
    dataStatus = 'insufficient';
  } else if (failCount > 0) {
    harmonyLevel = 'poor';
  } else if (warnCount > 0) {
    harmonyLevel = 'neutral';
  } else if (passCount > 0 && failCount === 0) {
    harmonyLevel = warnCount === 0 ? 'excellent' : 'good';
  } else {
    harmonyLevel = 'unknown';
    dataStatus = 'insufficient';
  }

  return {
    personalElement,
    // Strictly null: AI Studio does NOT synthesize fake aggregated numbers for Five Elements
    overallHarmonyScore: null,
    harmonyLevel,
    furnitureRelations,
    keyIssues,
    cures,
    dataStatus,
    disclaimers: Array.from(disclaimersSet),
    engineVersion: ENGINE_VERSION,
    allRules,
    passCount,
    warnCount,
    failCount,
    unknownCount,
    naCount,
    totalEvaluated,
    furnitureSummaries,
  };
}

