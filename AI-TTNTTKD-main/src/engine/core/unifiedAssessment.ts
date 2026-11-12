// =============================================================================
// src/engine/core/unifiedAssessment.ts
// Unified Feng Shui Assessment Report Model & Aggregator Engine (Phase P5 + P6)
//
// DESIGN PRINCIPLES:
// - Aggregates pure evaluation results from P3 (Furniture Rules), P4 (Personal Assessment),
//   and P6 (Environmental & Ergonomics).
// - Groups rules strictly: geometricRules, traditionalRules, personalRules,
//   environmentalRules, ergonomicRules, environmentalDataQuality.
// - Strictly NO arbitrary 0-100 total score.
// - Full transparency: dataCompleteness, dataQualityIssues, source references with status badges.
// - Pure function: DOES NOT mutate input roomConfig, objects, or profile.
// =============================================================================

import { RoomConfig, RoomObject, CompassDirection } from '../../types/fengshui.js';
import { RuleResult } from './ruleTypes.js';
import { RoomLayout, buildLayoutFromLegacy } from './roomLayout.js';
import { PersonalProfile } from './personalProfile.js';
import { evaluateFurnitureRules } from './furnitureRuleEngine.js';
import { evaluatePersonalAssessment, PersonalAssessmentOutput } from './personalAssessment.js';
import { HouseRoomOrientation, buildHouseRoomFromLegacy } from './houseRoom.js';
import { getSourceInfo, SourceReference } from './sourceRegistry.js';
import { evaluateEnvironmentalRules } from './environmentalEngine.js';

export const P5_ENGINE_VERSION = '5.0.0-p5';
export const P6_UNIFIED_VERSION = '6.0.0-p6';

export interface DataQualityIssue {
  id: string;
  kind: 'uncalibrated_north' | 'assumed_opening' | 'missing_profile' | 'uncertain_lap_xuan' | 'pending_source';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  impactedRuleIds: string[];
}

export interface RecommendationItem {
  ruleId: string;
  ruleName: string;
  remedy: string;
  severity: string;
}

export interface UnifiedAssessmentReport {
  // A. Report Metadata
  reportId: string;
  createdAt: string;
  engineVersions: {
    engine: string;
    p3: string;
    p4: string;
    p5: string;
    p6: string;
  };
  roomId: string;
  personalProfileId?: string;
  dataCompleteness: number; // 0 to 100 (%)

  // B. Room Summary
  roomSummary: {
    roomName: string;
    dimensions: {
      width: number;
      length: number;
      height: number;
      areaM2: number;
    };
    roomOrientation: CompassDirection;
    northBearingDeg: number | null;
    orientationSource: string;
    measurementConfidence: number;
    objectCount: number;
  };

  // C. Personal Summary (if PersonalProfile provided)
  personalSummary?: {
    hasProfile: boolean;
    displayName?: string;
    birthDate: string;
    effectiveSolarYear?: number;
    genderConvention: 'male' | 'female';
    guaNumber?: number;
    guaName?: string;
    group?: string;
    element?: string;
    canChi?: string;
    napAm?: string;
    napAmElement?: string;
    isCertain: boolean;
    calendarPolicy: string;
    auspiciousDirections?: CompassDirection[];
    inauspiciousDirections?: CompassDirection[];
    notes?: string;
  };

  // D. Overview Statistics (Strictly NO 0-100 total score)
  statistics: {
    totalRules: number;
    passCount: number;      // Favorable
    warnCount: number;      // Caution / Marginal
    failCount: number;      // Unfavorable
    unknownCount: number;   // Insufficient data
    naCount: number;        // Not applicable
  };

  // E. Assessment Rule Groups
  geometricRules: RuleResult[];
  traditionalRules: RuleResult[];
  personalRules: RuleResult[];
  environmentalRules: RuleResult[];     // P6: Lighting + Ventilation
  ergonomicRules: RuleResult[];         // P6: Circulation + Ergonomics
  environmentalDataQuality: RuleResult[]; // P6: Data Quality Group E
  allRules: RuleResult[];

  // F. Data Quality & Uncertainty
  dataQualityIssues: DataQualityIssue[];

  // G. Actionable Recommendations
  recommendations: RecommendationItem[];

  // H. Resolved Source Citations Map
  sourcesMap: Record<string, SourceReference>;
}

export interface BuildUnifiedAssessmentInput {
  roomConfig: RoomConfig;
  objects: RoomObject[];
  profile?: PersonalProfile | null;
  layout?: RoomLayout;
  houseRoom?: HouseRoomOrientation | null;
  roomName?: string;
}

/**
 * Pure builder function assembling the UnifiedAssessmentReport.
 * Never mutates inputs.
 */
export function buildUnifiedAssessmentReport(input: BuildUnifiedAssessmentInput): UnifiedAssessmentReport {
  const {
    roomConfig,
    objects,
    profile,
    roomName = 'Phòng ngủ Master',
  } = input;

  // 1. Build or use provided RoomLayout & HouseRoomOrientation
  const layout = input.layout || buildLayoutFromLegacy(roomConfig, objects);
  const houseRoom = input.houseRoom || buildHouseRoomFromLegacy(roomConfig, layout.northBearingDeg);

  // 2. Run P3 Furniture Rule Engine
  const p3Output = evaluateFurnitureRules({ layout, objects });

  // 3. Run P4 Personal Assessment Engine
  const p4Output: PersonalAssessmentOutput = evaluatePersonalAssessment({
    profile,
    layout,
    objects,
    houseRoom,
  });

  // 4. Run P6 Environmental & Ergonomics Engine
  const p6Output = evaluateEnvironmentalRules({ layout, objects });

  // 5. Group rules
  // Geometric: Pure physical, boundary, clearance, and line-of-sight layout rules
  const geometricRules = [...p3Output.geometricRules];

  // Traditional: Loan Đầu form school rules and personal Bát Trạch rules
  const traditionalRules = [
    ...p3Output.traditionalRules,
    ...p4Output.personalRules.filter((r) => r.category === 'traditional_feng_shui'),
  ];

  // Personal: Rules specifically matching personal Gua & Nạp Âm
  const personalRules = [...p4Output.personalRules];

  // P6: Environmental (Lighting + Ventilation) and Ergonomic (Circulation + Ergonomics)
  const environmentalRules = [...p6Output.environmentalRules];
  const ergonomicRules = [...p6Output.ergonomicRules];
  const environmentalDataQuality = [...p6Output.dataQualityRules];

  // Unified allRules list without duplicate ruleIds
  const seenIds = new Set<string>();
  const allRules: RuleResult[] = [];

  for (const r of [
    ...geometricRules,
    ...traditionalRules,
    ...personalRules,
    ...environmentalRules,
    ...ergonomicRules,
    ...environmentalDataQuality,
  ]) {
    if (!seenIds.has(r.ruleId)) {
      seenIds.add(r.ruleId);
      allRules.push(r);
    }
  }

  // 6. Statistics (No 0-100 score) — count across ALL rule groups
  const passCount = allRules.filter((r) => r.verdict === 'pass').length;
  const warnCount = allRules.filter((r) => r.verdict === 'warn').length;
  const failCount = allRules.filter((r) => r.verdict === 'fail').length;
  const unknownCount = allRules.filter((r) => r.verdict === 'unknown').length;
  const naCount = allRules.filter((r) => r.verdict === 'n/a').length;

  // 7. Data Completeness Calculation (factoring P6 environmental gaps)
  let completenessScore = 100;
  if (layout.northBearingDeg === null) completenessScore -= 20;
  if (layout.openings.some((o) => o.assumed)) completenessScore -= 15;
  if (!profile) completenessScore -= 35;
  else if (p4Output.guaResult && !p4Output.guaResult.isCertain) completenessScore -= 20;
  // P6: penalise if no confirmed windows at all
  const confirmedWindows = layout.openings.filter((o) => o.kind === 'window' && !o.assumed);
  if (confirmedWindows.length === 0) completenessScore -= 10;
  completenessScore = Math.max(10, completenessScore);

  // 7. Data Quality Issues
  const dataQualityIssues: DataQualityIssue[] = [];

  if (layout.northBearingDeg === null) {
    const impacted = allRules
      .filter((r) => r.category === 'traditional_feng_shui')
      .map((r) => r.ruleId);

    dataQualityIssues.push({
      id: 'dq_uncalibrated_north',
      kind: 'uncalibrated_north',
      title: 'Trục Bắc địa lý chưa hiệu chuẩn (northBearingDeg = null)',
      description: 'Số đo phương vị hiện dựa trên quy ước trục tọa độ phòng 3D. Cần dùng la bàn số/thực tế để khảo sát góc lệch chính xác.',
      severity: 'warning',
      impactedRuleIds: impacted,
    });
  }

  const assumedOpenings = layout.openings.filter((o) => o.assumed);
  if (assumedOpenings.length > 0) {
    dataQualityIssues.push({
      id: 'dq_assumed_opening',
      kind: 'assumed_opening',
      title: 'Cửa phòng / Cửa sổ được suy luận tự động (assumed: true)',
      description: `Có ${assumedOpenings.length} vị trí cửa mở được tạo theo giả định kiến trúc mặc định. Cần kiểm tra lại bản vẽ mặt bằng thực tế.`,
      severity: 'info',
      impactedRuleIds: ['BED-DOOR-01', 'BED-WIN-01', 'DESK-DOOR-01'],
    });
  }

  if (!profile) {
    dataQualityIssues.push({
      id: 'dq_missing_profile',
      kind: 'missing_profile',
      title: 'Chưa có hồ sơ bản mệnh gia chủ (PersonalProfile)',
      description: 'Các quy tắc Bát Trạch phối hợp cá nhân (hướng giường, hướng bàn làm việc theo Mệnh) đang ở trạng thái chưa đủ dữ liệu (unknown).',
      severity: 'info',
      impactedRuleIds: ['PERS-BED-01', 'PERS-DESK-01', 'PERS-ROOM-01', 'PERS-NAP-AM-01'],
    });
  } else if (p4Output.guaResult && !p4Output.guaResult.isCertain) {
    dataQualityIssues.push({
      id: 'dq_uncertain_lap_xuan',
      kind: 'uncertain_lap_xuan',
      title: 'Ranh giới năm sinh giáp Tiết khí Lập Xuân',
      description: p4Output.guaResult.uncertaintyReason || 'Sinh vào ngày 3-5/2 thiếu giờ sinh chính xác, chưa thể phân định năm Bát Trạch.',
      severity: 'warning',
      impactedRuleIds: ['PERS-BED-01', 'PERS-DESK-01', 'PERS-ROOM-01'],
    });
  }

  // 8. Actionable Recommendations from Rules
  const recommendations: RecommendationItem[] = [];
  for (const r of allRules) {
    if (r.remedy && (r.verdict === 'warn' || r.verdict === 'fail')) {
      recommendations.push({
        ruleId: r.ruleId,
        ruleName: r.name,
        remedy: r.remedy,
        severity: r.severity,
      });
    }
  }

  // 9. Resolve Source Citations Map (across ALL rule groups including P6)
  const sourcesMap: Record<string, SourceReference> = {};
  for (const r of allRules) {
    for (const srcId of r.sources) {
      if (!sourcesMap[srcId]) {
        const info = getSourceInfo(srcId);
        if (info) {
          sourcesMap[srcId] = info;
        }
      }
    }
  }

  // 10. Room dimensions
  const areaM2 = parseFloat((roomConfig.width * roomConfig.length).toFixed(2));

  return {
    reportId: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    engineVersions: {
      engine: 'AI Feng Shui Studio',
      p3: '3.0.0-p3',
      p4: '4.0.0-p4',
      p5: P5_ENGINE_VERSION,
      p6: P6_UNIFIED_VERSION,
    },
    roomId: layout.id,
    personalProfileId: profile?.id,
    dataCompleteness: completenessScore,

    roomSummary: {
      roomName,
      dimensions: {
        width: roomConfig.width,
        length: roomConfig.length,
        height: roomConfig.height || 2.8,
        areaM2,
      },
      roomOrientation: roomConfig.direction,
      northBearingDeg: layout.northBearingDeg,
      orientationSource: houseRoom.orientationSource,
      measurementConfidence: houseRoom.measurementConfidence,
      objectCount: objects.length,
    },

    personalSummary: profile ? {
      hasProfile: true,
      displayName: profile.displayName,
      birthDate: profile.birthDate,
      effectiveSolarYear: p4Output.guaResult?.effectiveSolarYear,
      genderConvention: profile.genderForTraditionalCalculation,
      guaNumber: p4Output.guaResult?.guaNumber,
      guaName: p4Output.guaResult?.guaName,
      group: p4Output.guaResult?.group,
      element: p4Output.guaResult?.element,
      canChi: p4Output.napAmResult?.canChi,
      napAm: p4Output.napAmResult?.napAm,
      napAmElement: p4Output.napAmResult?.napAmElement,
      isCertain: p4Output.guaResult?.isCertain ?? false,
      calendarPolicy: p4Output.guaResult?.lapXuanResolution.boundaryPolicy || 'exact_lap_xuan',
      auspiciousDirections: p4Output.batTrachProfile?.auspiciousDirections,
      inauspiciousDirections: p4Output.batTrachProfile?.inauspiciousDirections,
      notes: p4Output.guaResult?.lapXuanResolution.notes,
    } : undefined,

    statistics: {
      totalRules: allRules.length,
      passCount,
      warnCount,
      failCount,
      unknownCount,
      naCount,
    },

    geometricRules,
    traditionalRules,
    personalRules,
    environmentalRules,
    ergonomicRules,
    environmentalDataQuality,
    allRules,

    dataQualityIssues,
    recommendations,
    sourcesMap,
  };
}

