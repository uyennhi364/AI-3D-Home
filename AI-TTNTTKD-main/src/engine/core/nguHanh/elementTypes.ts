// =============================================================================
// src/engine/core/nguHanh/elementTypes.ts
// Phase P8 — Ngũ Hành Module Foundation & Type Specifications (V1.1)
//
// DESIGN PRINCIPLES:
// - Standardizes NguHanhElement as a direct alias of existing GuaElement.
// - 4-state data status enum: 'known' | 'ambiguous' | 'insufficient' | 'unsupported'.
// - Strict separation between classical principles, applied conventions, and internal heuristics.
// - Purely additive types — zero mutation of P0–P7.5 baseline structures.
// =============================================================================

import { GuaElement } from '../../../types/fengshui.js';

/**
 * Standardized Five Elements type (Ngũ Hành).
 * Reuses existing GuaElement type alias from P4 ('Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ').
 */
export type NguHanhElement = GuaElement;

/**
 * 4-state Data Status Enum for Five Elements Analysis.
 * Null is never used to represent these states.
 */
export type ElementDataStatus =
  | 'known'          // Valid input, deterministically classified with assigned certainty.
  | 'ambiguous'      // Valid input, but legitimately spans multiple elements (e.g. gray, wood-brown, plastic). Never forced.
  | 'insufficient'   // Missing or empty input (null, undefined, empty string).
  | 'unsupported';   // Valid datatype, but format/value is unmapped or out of scope.

/**
 * Academic / Epistemological certainty classification.
 */
export type ElementCertainty =
  | 'classical'    // Traceable directly to verifiable classical texts (with chapter/section).
  | 'applied'      // Modern architectural/practical convention (no direct classical attribution).
  | 'heuristic';   // Internal AI Studio heuristic rule (must present user-facing disclaimer).

/**
 * Result of single-attribute Five Elements classification (e.g. Color, Material, Shape, Direction).
 */
export interface ElementAnalysisResult {
  element: NguHanhElement | null;    // null when dataStatus !== 'known'
  dataStatus: ElementDataStatus;
  certainty: ElementCertainty | null; // null when dataStatus !== 'known'
  sourceRef: string[];               // Registered IDs in SOURCE_REGISTRY
  sourceId?: string;                 // Primary source ID alias
  explanation: string;               // Clear human-readable explanation
  disclaimer?: string;               // Mandatory if certainty === 'heuristic'
  rawInput?: unknown;                // Original input preserved for traceability
  input?: unknown;                   // Alias for input value
  normalizedValue?: string;          // Normalized string representation (e.g. #ffffff, wood)
}

/**
 * Directional Relationship Types between two Elements.
 * Distinguishes source-to-target relationship orientation.
 */
export type ElementRelationType =
  | 'SAME'          // Đồng hành (cùng Ngũ Hành)
  | 'GENERATES'     // Tương sinh thuận: source sinh target
  | 'GENERATED_BY'  // Tương sinh nghịch: source được target sinh
  | 'OVERCOMES'     // Tương khắc thuận: source khắc target
  | 'OVERCOME_BY'   // Tương khắc nghịch: source bị target khắc
  | 'UNKNOWN';      // Thiếu dữ liệu để xác định quan hệ

/**
 * Result of evaluating relationship between two elements.
 * Contains heuristic HarmonyScore (0.0 to 1.0) strictly decoupled from P5 overallScore.
 */
export interface ElementRelationResult {
  relationType: ElementRelationType;
  harmonyScore: number;              // 0.0 to 1.0 heuristic score for UI ranking
  harmonyLabel: string;              // Vietnamese display label
  explanation: string;               // Classical / logical explanation
  disclaimer: string;                // Mandatory heuristic disclaimer
  sourceRef: string[];               // Source citations
}

/**
 * Five Elements profile of a furniture object across all physical attributes.
 */
export interface FurnitureElementProfile {
  objectId: string;
  objectType: string;
  colorAnalysis: ElementAnalysisResult;
  materialAnalysis: ElementAnalysisResult;
  shapeAnalysis: ElementAnalysisResult;
  locationDirectionAnalysis: ElementAnalysisResult;
  dominantElement: NguHanhElement | null;
  dominantElementBasis: string;      // Traceable rationale for dominant element selection
  overallDataStatus: ElementDataStatus;
}

/**
 * Input schema for whole-room Five Elements Assessment.
 */
export interface ElementAssessmentInput {
  personalElement: NguHanhElement | null;    // Derived from personal Gua (not Nạp Âm)
  napAmElement: NguHanhElement | null;       // Auxiliary reference only
  furnitureProfiles: FurnitureElementProfile[];
  roomDirectionAnalysis: ElementAnalysisResult;
  northBearingDeg: number | null;            // null = uncalibrated (Model North used with disclaimer)
}

/**
 * Assessment summary for whole-room Five Elements harmony.
 * Strictly decoupled from P5 overallScore.
 */
export interface ElementRoomAssessment {
  personalElement: NguHanhElement | null;
  overallHarmonyScore: number | null;         // null if personalElement is unknown
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
  disclaimers: string[];
  engineVersion: string;
}

