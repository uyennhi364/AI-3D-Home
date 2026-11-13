// =============================================================================
// src/engine/core/nguHanh/elementRelationship.ts
// Phase P8-M2 — Five Elements (Ngũ Hành) Directional Relationship & Harmony Score Engine
//
// DESIGN PRINCIPLES:
// - Deterministic calculation of directional generation/overcoming between 5 elements.
// - Supports 6 distinct relation types: SAME, GENERATES, GENERATED_BY, OVERCOMES, OVERCOME_BY, UNKNOWN.
// - Accurately distinguishes orientation:
//   * Sinh xuất (source sinh target: GENERATES) vs Sinh nhập (source được target sinh: GENERATED_BY)
//   * Khắc xuất (source khắc target: OVERCOMES) vs Khắc nhập (source bị target khắc: OVERCOME_BY)
// - HarmonyScore (0.0 to 1.0) is strictly an internal AI Studio heuristic metric with mandatory disclaimer.
// - Pure additive calculation — completely decoupled from P5 overallScore and Master Preset benchmark.
// =============================================================================

import {
  NguHanhElement,
  ElementRelationType,
  ElementRelationResult,
} from './elementTypes.js';

/**
 * Standard list of Five Elements.
 */
export const NGU_HANH_ELEMENTS: readonly NguHanhElement[] = [
  'Kim',
  'Mộc',
  'Thủy',
  'Hỏa',
  'Thổ',
] as const;

/**
 * Generation Cycle (Tương Sinh):
 * Kim sinh Thủy -> Thủy sinh Mộc -> Mộc sinh Hỏa -> Hỏa sinh Thổ -> Thổ sinh Kim
 */
export const GENERATION_CYCLE: Record<NguHanhElement, NguHanhElement> = {
  Kim: 'Thủy',
  Thủy: 'Mộc',
  Mộc: 'Hỏa',
  Hỏa: 'Thổ',
  Thổ: 'Kim',
};

/**
 * Overcoming Cycle (Tương Khắc):
 * Kim khắc Mộc -> Mộc khắc Thổ -> Thổ khắc Thủy -> Thủy khắc Hỏa -> Hỏa khắc Kim
 */
export const OVERCOMING_CYCLE: Record<NguHanhElement, NguHanhElement> = {
  Kim: 'Mộc',
  Mộc: 'Thổ',
  Thổ: 'Thủy',
  Thủy: 'Hỏa',
  Hỏa: 'Kim',
};

/**
 * Internal heuristic harmony score table.
 * Values approved in P8 Architecture Specification V1.1:
 * - SAME (0.90): Đồng hành — ổn định, củng cố bản khí.
 * - GENERATES (0.85): Tương sinh thuận (sinh xuất) — tích cực, vượng khí.
 * - GENERATED_BY (0.75): Tương sinh nghịch (sinh nhập) — được bồi đắp nguồn khí.
 * - OVERCOME_BY (0.25): Bị khắc (khắc nhập) — xung đột trực tiếp với bản mệnh.
 * - OVERCOMES (0.20): Khắc đối tượng (khắc xuất) — hao tổn năng lượng áp chế.
 * - UNKNOWN (0.50): Mặc định trung tính khi thiếu dữ liệu.
 */
export const HARMONY_SCORE_TABLE: Record<ElementRelationType, number> = {
  SAME: 0.90,
  GENERATES: 0.85,
  GENERATED_BY: 0.75,
  OVERCOME_BY: 0.25,
  OVERCOMES: 0.20,
  UNKNOWN: 0.50,
};

/**
 * Vietnamese human-readable labels for relationship types.
 */
export const RELATION_LABELS: Record<ElementRelationType, string> = {
  SAME: 'Đồng hành',
  GENERATES: 'Tương sinh (Sinh xuất)',
  GENERATED_BY: 'Tương sinh (Sinh nhập)',
  OVERCOMES: 'Tương khắc (Khắc xuất)',
  OVERCOME_BY: 'Tương khắc (Khắc nhập)',
  UNKNOWN: 'Không xác định',
};

/**
 * Mandatory heuristic disclaimer for any output containing HarmonyScore.
 */
export const HARMONY_SCORE_DISCLAIMER =
  'HarmonyScore (0.0-1.0) là thang điểm quy ước nội bộ của AI Studio nhằm hỗ trợ xếp hạng trực quan, không phải là hệ số định lượng trong cổ thư phong thủy và không thay thế đánh giá tổng thể.';

/**
 * Checks whether an element is a valid NguHanhElement.
 */
export function isValidNguHanhElement(el: unknown): el is NguHanhElement {
  return typeof el === 'string' && (NGU_HANH_ELEMENTS as readonly string[]).includes(el);
}

/**
 * Evaluates the directional relationship from source element to target element.
 *
 * @param source Source element (e.g. personal element or primary subject)
 * @param target Target element (e.g. furniture attribute element or room element)
 * @returns ElementRelationType ('SAME' | 'GENERATES' | 'GENERATED_BY' | 'OVERCOMES' | 'OVERCOME_BY' | 'UNKNOWN')
 */
export function getElementRelationship(
  source: NguHanhElement | null | undefined,
  target: NguHanhElement | null | undefined
): ElementRelationType {
  if (!isValidNguHanhElement(source) || !isValidNguHanhElement(target)) {
    return 'UNKNOWN';
  }

  if (source === target) {
    return 'SAME';
  }

  if (GENERATION_CYCLE[source] === target) {
    return 'GENERATES';
  }

  if (GENERATION_CYCLE[target] === source) {
    return 'GENERATED_BY';
  }

  if (OVERCOMING_CYCLE[source] === target) {
    return 'OVERCOMES';
  }

  if (OVERCOMING_CYCLE[target] === source) {
    return 'OVERCOME_BY';
  }

  return 'UNKNOWN';
}

/**
 * Retrieves the heuristic Harmony Score for an element pair.
 *
 * @param source Source element
 * @param target Target element
 * @returns number between 0.0 and 1.0
 */
export function getElementHarmonyScore(
  source: NguHanhElement | null | undefined,
  target: NguHanhElement | null | undefined
): number {
  const relation = getElementRelationship(source, target);
  return HARMONY_SCORE_TABLE[relation];
}

/**
 * Generates an explainable text summary of the relationship.
 */
function buildExplanation(
  source: NguHanhElement,
  target: NguHanhElement,
  relation: ElementRelationType
): string {
  switch (relation) {
    case 'SAME':
      return `${source} và ${target} đồng hành, tương hòa và củng cố năng lượng bản khí.`;
    case 'GENERATES':
      return `${source} sinh ${target} (Sinh xuất), chủ động chuyển hóa và phát tiết sinh khí cho đối tượng.`;
    case 'GENERATED_BY':
      return `${source} được ${target} sinh (Sinh nhập), đón nhận nguồn năng lượng nuôi dưỡng và tăng cường sinh khí bản mệnh.`;
    case 'OVERCOMES':
      return `${source} khắc ${target} (Khắc xuất), tiêu hao năng lượng để chế ước và kiềm tỏa đối tượng.`;
    case 'OVERCOME_BY':
      return `${source} bị ${target} khắc (Khắc nhập), chịu áp lực xung khắc trực tiếp làm suy giảm khí trường bản mệnh.`;
    default:
      return 'Chưa đủ dữ liệu Ngũ Hành để xác định quan hệ tương tác.';
  }
}

/**
 * Comprehensive analysis of directional relationship between two elements.
 * Produces structured ElementRelationResult with source citations and heuristic disclaimer.
 */
export function analyzeElementRelationship(
  source: NguHanhElement | null | undefined,
  target: NguHanhElement | null | undefined
): ElementRelationResult {
  const relationType = getElementRelationship(source, target);
  const harmonyScore = HARMONY_SCORE_TABLE[relationType];
  const harmonyLabel = RELATION_LABELS[relationType];

  let explanation: string;
  let sourceRef: string[];

  if (relationType === 'UNKNOWN' || !isValidNguHanhElement(source) || !isValidNguHanhElement(target)) {
    explanation = 'Chưa đủ dữ liệu Ngũ Hành của một hoặc cả hai đối tượng để phân tích quan hệ tương tác.';
    sourceRef = ['SRC-HEURISTIC-HARMONY-SCORE'];
  } else {
    explanation = buildExplanation(source, target, relationType);
    sourceRef = ['SRC-NGU-HANH-DAI-NGHIA', 'SRC-HEURISTIC-HARMONY-SCORE'];
  }

  return {
    relationType,
    harmonyScore,
    harmonyLabel,
    explanation,
    disclaimer: HARMONY_SCORE_DISCLAIMER,
    sourceRef,
  };
}

