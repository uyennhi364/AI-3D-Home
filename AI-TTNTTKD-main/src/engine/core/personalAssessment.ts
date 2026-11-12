// =============================================================================
// src/engine/core/personalAssessment.ts
// Personal Feng Shui & House/Room Integration Assessment Engine (Phase P4)
//
// INTEGRATION CONTRACT:
// - Evaluates personal Gua compatibility with Bed headboard, Desk facing, and Room orientation.
// - Strictly preserves all P3 geometric layout rules (never overrides geometric results).
// - Returns standardized RuleResult schema items categorized under 'traditional_feng_shui'.
// - If PersonalProfile or Gua is missing/insufficient, returns dataStatus: 'insufficient', verdict: 'unknown'.
// - If northBearingDeg is null (uncalibrated), evaluates in room local reference frame and
//   records that orientation is assumed/pending true compass survey.
// =============================================================================

import { RoomObject, CompassDirection } from '../../types/fengshui.js';
import { RuleResult, RuleSeverity } from './ruleTypes.js';
import { RoomLayout } from './roomLayout.js';
import { PersonalProfile } from './personalProfile.js';
import { calculateGuaV2, GuaCalculationResult } from './guaEngine.js';
import { getNapAmByYear, NapAmCalculationResult } from './napAmEngine.js';
import { getBatTrachGuaProfile, BatTrachGuaProfile } from './batTrachEngine.js';
import { HouseRoomOrientation, getDirectionCategory } from './houseRoom.js';
import { worldBearingOfAxis, directionFromBearing, toTrueBearing } from './compass.js';
import { ORIENTATION_CATALOG } from './orientationCatalog.js';

export const P4_ENGINE_VERSION = '4.0.0-p4';

export interface PersonalAssessmentInput {
  profile?: PersonalProfile | null;
  layout: RoomLayout;
  objects: RoomObject[];
  houseRoom?: HouseRoomOrientation | null;
}

export interface PersonalAssessmentOutput {
  guaResult?: GuaCalculationResult;
  napAmResult?: NapAmCalculationResult;
  batTrachProfile?: BatTrachGuaProfile;
  personalRules: RuleResult[];
  dataStatus: 'sufficient' | 'insufficient';
  engineVersion: string;
}

function makePersonalResult(partial: Omit<RuleResult, 'engineVersion'>): RuleResult {
  return { ...partial, engineVersion: P4_ENGINE_VERSION };
}

/**
 * Evaluates Bed Headboard direction compatibility with Personal Gua.
 */
export function evaluateBedPersonalGua(
  bed: RoomObject,
  batTrachProfile: BatTrachGuaProfile | null,
  northBearingDeg: number | null
): RuleResult {
  if (!batTrachProfile) {
    return makePersonalResult({
      ruleId: 'PERS-BED-01',
      name: 'Hướng đầu giường theo Bát Trạch Quái Mệnh',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['Chưa có thông tin Quái mệnh cá nhân (Personal Gua).'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không thể đánh giá hướng đầu giường theo phong thủy cá nhân vì chưa có dữ liệu ngày sinh/giới tính hợp lệ.',
      sources: ['SRC-BAT-TRACH-MINH-KINH'],
    });
  }

  const orientation = ORIENTATION_CATALOG['bed'];
  const headAxis = orientation?.headAxis || { x: 0, z: -1 };

  // Local bearing of headboard
  const localBearing = worldBearingOfAxis(headAxis, bed.rotation.y);
  // True bearing if calibrated, otherwise local
  const trueBearing = toTrueBearing(localBearing, northBearingDeg);
  const effectiveBearing = trueBearing !== null ? trueBearing : localBearing;
  const headboardDir: CompassDirection = directionFromBearing(effectiveBearing);

  const sectorDetail = batTrachProfile.sectors[headboardDir];
  const isAuspicious = sectorDetail.isAuspicious;
  const isUncalibrated = northBearingDeg === null;

  let explanation = `Đầu giường hướng ${sectorDetail.directionNameVi} (${headboardDir} - ${effectiveBearing.toFixed(1)}°). Với Quái số ${batTrachProfile.guaNumber} (${batTrachProfile.guaName} - ${batTrachProfile.group}), phương vị này là cung ${sectorDetail.sectorNameVi} (${isAuspicious ? 'Cát' : 'Hung'}). ${sectorDetail.meaning}`;
  if (isUncalibrated) {
    explanation += ' [LƯU Ý: Chưa có số đo la bàn thực tế (northBearingDeg = null). Phương vị đang tính theo quy ước trục phòng - cần đo thực tế để hiệu chỉnh.]';
  }
  explanation += ' [GHI CHÚ: Đây là quy tắc diễn giải truyền thống theo Bát Trạch Minh Kính, không phải kết luận y khoa hay khoa học thực nghiệm.]';

  return makePersonalResult({
    ruleId: 'PERS-BED-01',
    name: 'Hướng đầu giường theo Bát Trạch Quái Mệnh',
    category: 'traditional_feng_shui',
    school: 'bat_trach',
    applicability: 'mandatory',
    dataStatus: isUncalibrated ? 'insufficient' : 'sufficient',
    inputs: {
      bedId: bed.id,
      guaNumber: batTrachProfile.guaNumber,
      guaName: batTrachProfile.guaName,
      headboardDirection: headboardDir,
      headboardBearingDeg: parseFloat(effectiveBearing.toFixed(1)),
      isNorthCalibrated: !isUncalibrated,
    },
    measurement: {
      metric: 'bed_headboard_bat_trach_sector',
      value: sectorDetail.sectorType,
      passed: isAuspicious,
      geometryDetails: {
        angleDeg: parseFloat(effectiveBearing.toFixed(1)),
      },
    },
    verdict: isAuspicious ? 'pass' : 'warn',
    severity: isAuspicious ? 'info' : 'major',
    explanation,
    remedy: isAuspicious
      ? undefined
      : `Xem xét xoay giường để đầu giường hướng về một trong các phương vị Cát của mệnh ${batTrachProfile.guaName}: ${batTrachProfile.auspiciousDirections.join(', ')}.`,
    sources: ['SRC-BAT-TRACH-MINH-KINH', 'SRC-BAT-TRACH-TAM-YEU'],
  });
}

/**
 * Evaluates Desk user facing direction compatibility with Personal Gua.
 */
export function evaluateDeskPersonalGua(
  desk: RoomObject,
  batTrachProfile: BatTrachGuaProfile | null,
  northBearingDeg: number | null
): RuleResult {
  if (!batTrachProfile) {
    return makePersonalResult({
      ruleId: 'PERS-DESK-01',
      name: 'Hướng ngồi bàn làm việc theo Bát Trạch',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Chưa có thông tin Quái mệnh cá nhân.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không thể đánh giá hướng ngồi bàn làm việc theo Bát Trạch vì chưa có hồ sơ cá nhân.',
      sources: ['SRC-BAT-TRACH-MINH-KINH'],
    });
  }

  const orientation = ORIENTATION_CATALOG['desk'];
  const userFacingAxis = orientation?.userFacingAxis || { x: 0, z: -1 };

  const localBearing = worldBearingOfAxis(userFacingAxis, desk.rotation.y);
  const trueBearing = toTrueBearing(localBearing, northBearingDeg);
  const effectiveBearing = trueBearing !== null ? trueBearing : localBearing;
  const facingDir: CompassDirection = directionFromBearing(effectiveBearing);

  const sectorDetail = batTrachProfile.sectors[facingDir];
  const isAuspicious = sectorDetail.isAuspicious;
  const isUncalibrated = northBearingDeg === null;

  let explanation = `Người ngồi làm việc nhìn về hướng ${sectorDetail.directionNameVi} (${facingDir} - ${effectiveBearing.toFixed(1)}°). Thuộc cung ${sectorDetail.sectorNameVi} (${isAuspicious ? 'Cát' : 'Hung'}) đối với Quái mệnh ${batTrachProfile.guaName}. ${sectorDetail.meaning}`;
  if (isUncalibrated) {
    explanation += ' [LƯU Ý: Hướng la bàn chưa hiệu chuẩn true North.]';
  }

  return makePersonalResult({
    ruleId: 'PERS-DESK-01',
    name: 'Hướng ngồi bàn làm việc theo Bát Trạch',
    category: 'traditional_feng_shui',
    school: 'bat_trach',
    applicability: 'recommended',
    dataStatus: isUncalibrated ? 'insufficient' : 'sufficient',
    inputs: {
      deskId: desk.id,
      guaNumber: batTrachProfile.guaNumber,
      facingDirection: facingDir,
      facingBearingDeg: parseFloat(effectiveBearing.toFixed(1)),
    },
    measurement: {
      metric: 'desk_facing_bat_trach_sector',
      value: sectorDetail.sectorType,
      passed: isAuspicious,
      geometryDetails: {
        angleDeg: parseFloat(effectiveBearing.toFixed(1)),
      },
    },
    verdict: isAuspicious ? 'pass' : 'warn',
    severity: isAuspicious ? 'info' : 'minor',
    explanation,
    remedy: isAuspicious
      ? undefined
      : `Có thể xoay bàn để người ngồi hướng mặt về các phương vị Sinh Khí, Thiên Y, Diên Niên, Phục Vị (${batTrachProfile.auspiciousDirections.join(', ')}).`,
    sources: ['SRC-BAT-TRACH-MINH-KINH'],
  });
}

/**
 * Evaluates Room Facade / House Facade compatibility with Personal Gua.
 */
export function evaluateHouseRoomPersonalGua(
  houseRoom: HouseRoomOrientation | null,
  batTrachProfile: BatTrachGuaProfile | null
): RuleResult {
  if (!batTrachProfile) {
    return makePersonalResult({
      ruleId: 'PERS-ROOM-01',
      name: 'Hướng phòng ngủ & Hướng nhà theo Bát Trạch',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Chưa có Quái mệnh cá nhân.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Chưa có thông tin Quái mệnh cá nhân để đánh giá hướng phòng.',
      sources: ['SRC-BAT-TRACH-TAM-YEU'],
    });
  }

  if (!houseRoom || houseRoom.roomFacingBearing === null) {
    return makePersonalResult({
      ruleId: 'PERS-ROOM-01',
      name: 'Hướng phòng ngủ & Hướng nhà theo Bát Trạch',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Chưa có thông tin hướng mặt thoáng phòng ngủ (roomFacingBearing).'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không có thông tin hướng tiếp giáp mặt thoáng chính của phòng ngủ.',
      sources: ['SRC-BAT-TRACH-TAM-YEU'],
    });
  }

  const roomDir = getDirectionCategory(houseRoom.roomFacingBearing);
  if (!roomDir) {
    return makePersonalResult({
      ruleId: 'PERS-ROOM-01',
      name: 'Hướng phòng ngủ & Hướng nhà theo Bát Trạch',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Hướng phòng không hợp lệ.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không thể xác định cung phương vị cho hướng phòng.',
      sources: ['SRC-BAT-TRACH-TAM-YEU'],
    });
  }

  const sectorDetail = batTrachProfile.sectors[roomDir];
  const isAuspicious = sectorDetail.isAuspicious;

  return makePersonalResult({
    ruleId: 'PERS-ROOM-01',
    name: 'Hướng phòng ngủ & Hướng nhà theo Bát Trạch',
    category: 'traditional_feng_shui',
    school: 'bat_trach',
    applicability: 'recommended',
    dataStatus: houseRoom.orientationSource === 'assumed_cardinal' ? 'insufficient' : 'sufficient',
    inputs: {
      roomFacingBearing: houseRoom.roomFacingBearing,
      roomDirection: roomDir,
      houseFacingBearing: houseRoom.houseFacingBearing,
      orientationSource: houseRoom.orientationSource,
    },
    measurement: {
      metric: 'room_facing_bat_trach_sector',
      value: sectorDetail.sectorType,
      passed: isAuspicious,
      geometryDetails: {
        angleDeg: houseRoom.roomFacingBearing,
      },
    },
    verdict: isAuspicious ? 'pass' : 'warn',
    severity: isAuspicious ? 'info' : 'minor',
    explanation: `Phòng ngủ hướng về ${sectorDetail.directionNameVi} (${roomDir} - ${houseRoom.roomFacingBearing}°), thuộc cung ${sectorDetail.sectorNameVi} của mệnh ${batTrachProfile.guaName}. ${sectorDetail.meaning}`,
    sources: ['SRC-BAT-TRACH-TAM-YEU', 'SRC-BAT-TRACH-MINH-KINH'],
  });
}

/**
 * Generates an informative RuleResult for the user's Can Chi and Nạp Âm.
 */
export function generateNapAmInfoRule(napAmResult: NapAmCalculationResult | null, guaResult?: GuaCalculationResult): RuleResult {
  if (!napAmResult) {
    return makePersonalResult({
      ruleId: 'PERS-NAP-AM-01',
      name: 'Can Chi và Nạp Âm Ngũ Hành',
      category: 'traditional_feng_shui',
      school: 'bat_trach',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['Chưa có thông tin năm sinh để tính Nạp Âm.'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Không thể tính Can Chi và Nạp Âm vì thiếu năm sinh.',
      sources: ['SRC-60-HOA-GIAP-NAP-AM'],
    });
  }

  let explanation = `Năm phong thủy hiệu lực: ${napAmResult.effectiveYear} (${napAmResult.canChi}). Mệnh Nạp Âm: ${napAmResult.napAm} (Ngũ hành: ${napAmResult.napAmElement}).`;
  if (guaResult && guaResult.guaNumber > 0) {
    explanation += ` Phân biệt: Ngũ hành Nạp Âm (${napAmResult.napAmElement}) khác với Ngũ hành Cung Phi/Quái mệnh (${guaResult.element} - ${guaResult.guaName}). Bát Trạch phương vị hướng nhà/phòng luôn ưu tiên theo Quái mệnh.`;
  }

  return makePersonalResult({
    ruleId: 'PERS-NAP-AM-01',
    name: 'Can Chi và Nạp Âm Ngũ Hành',
    category: 'traditional_feng_shui',
    school: 'bat_trach',
    applicability: 'optional',
    dataStatus: 'sufficient',
    inputs: {
      effectiveYear: napAmResult.effectiveYear,
      canChi: napAmResult.canChi,
      napAm: napAmResult.napAm,
      napAmElement: napAmResult.napAmElement,
      guaElement: guaResult?.element,
    },
    measurement: {
      metric: 'nap_am_element',
      value: napAmResult.napAmElement,
      passed: true,
    },
    verdict: 'pass',
    severity: 'info',
    explanation,
    sources: ['SRC-60-HOA-GIAP-NAP-AM'],
  });
}

/**
 * Main orchestrator for Phase P4 Personal Feng Shui Assessment.
 */
export function evaluatePersonalAssessment(input: PersonalAssessmentInput): PersonalAssessmentOutput {
  const { profile, layout, objects, houseRoom } = input;
  const personalRules: RuleResult[] = [];

  let guaResult: GuaCalculationResult | undefined;
  let napAmResult: NapAmCalculationResult | undefined;
  let batTrachProfile: BatTrachGuaProfile | null = null;
  let overallDataStatus: 'sufficient' | 'insufficient' = 'insufficient';

  if (profile && profile.birthDate && profile.genderForTraditionalCalculation) {
    guaResult = calculateGuaV2(profile);
    if (guaResult.isCertain && guaResult.guaNumber > 0) {
      batTrachProfile = getBatTrachGuaProfile(guaResult.guaNumber, layout.northBearingDeg);
      overallDataStatus = 'sufficient';
    }
    napAmResult = getNapAmByYear(guaResult.effectiveSolarYear);
  }

  // 1. Evaluate Bed vs Personal Gua
  const beds = objects.filter((o) => o.type === 'bed');
  for (const bed of beds) {
    personalRules.push(evaluateBedPersonalGua(bed, batTrachProfile, layout.northBearingDeg));
  }

  // 2. Evaluate Desk vs Personal Gua
  const desks = objects.filter((o) => o.type === 'desk');
  for (const desk of desks) {
    personalRules.push(evaluateDeskPersonalGua(desk, batTrachProfile, layout.northBearingDeg));
  }

  // 3. Evaluate Room / House Facade vs Personal Gua
  personalRules.push(evaluateHouseRoomPersonalGua(houseRoom || null, batTrachProfile));

  // 4. Informative Nạp Âm Rule
  personalRules.push(generateNapAmInfoRule(napAmResult || null, guaResult));

  return {
    guaResult,
    napAmResult,
    batTrachProfile: batTrachProfile || undefined,
    personalRules,
    dataStatus: overallDataStatus,
    engineVersion: P4_ENGINE_VERSION,
  };
}

