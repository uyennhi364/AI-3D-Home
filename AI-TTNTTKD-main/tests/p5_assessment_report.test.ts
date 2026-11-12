// =============================================================================
// tests/p5_assessment_report.test.ts
// Comprehensive Test Suite for Phase P5: Unified Feng Shui Assessment Report UI
//
// Coverage:
// A. UnifiedAssessmentReport Data Model & Aggregation
// B. UI State Coverage (With Profile, Without Profile, Insufficient, Assumed, Uncertain Lập Xuân)
// C. Rule Detail Integrity (Measurement, Explanation, Remedy, Sources, Missing inputs)
// D. Source Registry Resolution & Verification Badges (Verified vs Pending vs Unverified)
// E. Regression (P0-P4 intact, Intent Guard, Presets unmutated, Scene unmutated)
// =============================================================================

import {
  buildUnifiedAssessmentReport,
  UnifiedAssessmentReport,
  P5_ENGINE_VERSION,
} from '../src/engine/core/unifiedAssessment.js';

import { PersonalProfile } from '../src/engine/core/personalProfile.js';
import { RoomConfig, RoomObject } from '../src/types/fengshui.js';
import { RoomLayout, buildLayoutFromLegacy } from '../src/engine/core/roomLayout.js';
import { HouseRoomOrientation, createHouseRoomOrientation } from '../src/engine/core/houseRoom.js';
import { getSourceInfo } from '../src/engine/core/sourceRegistry.js';
import { calculateGua, getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { evaluateIntentSafety } from '../src/services/intentGuard.js';
import { normalizeDeg, bearingOfVector } from '../src/engine/core/compass.js';
import { checkOBBCollisionV2 } from '../src/engine/geometryEngine.js';

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestCaseResult[] = [];

function recordTest(id: string, name: string, passed: boolean, details?: string) {
  testResults.push({ id, name, passed, details });
  if (passed) {
    console.log(`  ✅ [${id}] ${name}`);
  } else {
    console.error(`  ❌ [${id}] ${name}${details ? '\n       → ' + details : ''}`);
  }
}

// Sample fixtures
function createTestObjects(): RoomObject[] {
  return [
    {
      id: 'bed_01',
      type: 'bed',
      name: 'Giường ngủ Master',
      position: { x: 0, y: 0, z: -1.8 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1.8, length: 2.0, height: 1.0 },
    },
    {
      id: 'desk_01',
      type: 'desk',
      name: 'Bàn làm việc',
      position: { x: -1.2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1.4, length: 0.7, height: 0.75 },
    },
    {
      id: 'mirror_01',
      type: 'mirror',
      name: 'Gương soi toàn thân',
      position: { x: 1.5, y: 0, z: 0 },
      rotation: { x: 0, y: Math.PI, z: 0 }, // Rotated away from bed
      dimensions: { width: 0.6, length: 0.1, height: 1.6 },
    },
  ];
}

const defaultRoomConfig: RoomConfig = {
  width: 5.0,
  length: 5.2,
  height: 2.8,
  direction: 'N',
};

const defaultProfile: PersonalProfile = {
  id: 'usr_test_1990',
  displayName: 'Nguyễn Văn A',
  birthDate: '1990-08-15',
  genderForTraditionalCalculation: 'male',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// =============================================================================
// GROUP A: UnifiedAssessmentReport Data Model & Aggregation
// =============================================================================
console.log('\n>>> GROUP A: UnifiedAssessmentReport Data Model & Aggregation <<<');

// A1: buildUnifiedAssessmentReport creates complete report conforming to schema
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
    roomName: 'Phòng ngủ Thử nghiệm',
  });

  const validStructure =
    typeof report.reportId === 'string' &&
    typeof report.createdAt === 'string' &&
    report.engineVersions.p5 === P5_ENGINE_VERSION &&
    report.roomSummary.roomName === 'Phòng ngủ Thử nghiệm' &&
    report.roomSummary.dimensions.areaM2 === 26.0 &&
    typeof report.dataCompleteness === 'number' &&
    report.allRules.length > 0 &&
    Array.isArray(report.geometricRules) &&
    Array.isArray(report.traditionalRules) &&
    Array.isArray(report.personalRules);

  recordTest('A1', 'UnifiedAssessmentReport conforms to standardized schema with correct metadata', validStructure);
}

// A2: Input objects and roomConfig are strictly NOT mutated
{
  const objects = createTestObjects();
  const originalObjectsSnapshot = JSON.stringify(objects);
  const originalConfigSnapshot = JSON.stringify(defaultRoomConfig);
  const originalProfileSnapshot = JSON.stringify(defaultProfile);

  buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const unmutated =
    JSON.stringify(objects) === originalObjectsSnapshot &&
    JSON.stringify(defaultRoomConfig) === originalConfigSnapshot &&
    JSON.stringify(defaultProfile) === originalProfileSnapshot;

  recordTest('A2', 'buildUnifiedAssessmentReport is pure function and mutates zero input objects', unmutated);
}

// A3: No duplicate rule IDs in allRules list
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const ruleIds = report.allRules.map((r) => r.ruleId);
  const uniqueRuleIds = new Set(ruleIds);

  recordTest('A3', 'allRules contains zero duplicate rule IDs', ruleIds.length === uniqueRuleIds.size, `total=${ruleIds.length}, unique=${uniqueRuleIds.size}`);
}

// A4: Overview statistics sum equals totalRules count (No 0-100 arbitrary score)
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const s = report.statistics;
  const sum = s.passCount + s.warnCount + s.failCount + s.unknownCount + s.naCount;
  const matchesTotal = sum === s.totalRules && s.totalRules === report.allRules.length;

  recordTest('A4', 'Statistics (pass+warn+fail+unknown+na) sum strictly equals totalRules', matchesTotal, `sum=${sum}, totalRules=${s.totalRules}`);
}

// =============================================================================
// GROUP B: UI State Coverage
// =============================================================================
console.log('\n>>> GROUP B: UI State Coverage <<<');

// B1: Report with valid PersonalProfile populates personalSummary and personalRules
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const hasPersonal =
    !!report.personalSummary &&
    report.personalSummary.hasProfile === true &&
    report.personalSummary.guaNumber === 1 &&
    report.personalSummary.guaName === 'Khảm' &&
    report.personalSummary.canChi === 'Canh Ngọ' &&
    report.personalRules.length > 0;

  recordTest('B1', 'With PersonalProfile: personalSummary and personalRules are fully populated', hasPersonal);
}

// B2: Report without PersonalProfile still evaluates geometric rules and flags missing profile in dataQuality
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: null,
  });

  const missingProfileFlag = report.dataQualityIssues.some((i) => i.kind === 'missing_profile');
  const geometricEvaluated = report.geometricRules.length > 0;
  const noPersonalSummary = report.personalSummary === undefined;

  recordTest(
    'B2',
    'Without PersonalProfile: geometric rules still evaluated, missing_profile flagged in dataQualityIssues',
    missingProfileFlag && geometricEvaluated && noPersonalSummary
  );
}

// B3: Uncertain Lập Xuân boundary flags uncertain_lap_xuan in dataQualityIssues
{
  const objects = createTestObjects();
  const profileUncertain: PersonalProfile = {
    id: 'usr_uncertain',
    birthDate: '1990-02-04', // Exact Lập Xuân day without birthTime
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };

  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: profileUncertain,
  });

  const hasUncertainFlag = report.dataQualityIssues.some((i) => i.kind === 'uncertain_lap_xuan');
  recordTest('B3', 'Uncertain Lập Xuân boundary date flags uncertain_lap_xuan issue in data quality', hasUncertainFlag);
}

// B4: Uncalibrated North bearing flags uncalibrated_north issue
{
  const objects = createTestObjects();
  const layout = buildLayoutFromLegacy(defaultRoomConfig, objects);
  layout.northBearingDeg = null; // Uncalibrated

  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    layout,
    profile: defaultProfile,
  });

  const hasNorthFlag = report.dataQualityIssues.some((i) => i.kind === 'uncalibrated_north');
  recordTest('B4', 'Uncalibrated North bearing (northBearingDeg = null) flags uncalibrated_north issue', hasNorthFlag);
}

// B5: Assumed openings flag assumed_opening issue
{
  const objects = createTestObjects();
  const layout = buildLayoutFromLegacy(defaultRoomConfig, objects);
  // Default legacy adapter infers openings with assumed: true

  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    layout,
    profile: defaultProfile,
  });

  const hasAssumedFlag = report.dataQualityIssues.some((i) => i.kind === 'assumed_opening');
  recordTest('B5', 'Assumed openings flag assumed_opening issue in data quality report', hasAssumedFlag);
}

// =============================================================================
// GROUP C: Rule Detail Integrity
// =============================================================================
console.log('\n>>> GROUP C: Rule Detail Integrity <<<');

// C1: Every rule has non-empty explanation and valid sources array
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const allHaveExplanation = report.allRules.every((r) => typeof r.explanation === 'string' && r.explanation.trim().length > 0);
  const allHaveSources = report.allRules.every((r) => Array.isArray(r.sources) && r.sources.length > 0);

  recordTest('C1', 'All evaluated rules contain non-empty explanations and valid sources arrays', allHaveExplanation && allHaveSources);
}

// C2: Rules with warn or fail verdicts contain actionable remedy
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const warnOrFailRules = report.allRules.filter((r) => r.verdict === 'warn' || r.verdict === 'fail');
  const remediesGenerated = report.recommendations.length > 0 || warnOrFailRules.length === 0;

  recordTest('C2', 'Actionable recommendations are populated from failed/warned rules', remediesGenerated);
}

// C3: Geometric layout rules contain measurement evidence with metric name
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const bedWallRule = report.geometricRules.find((r) => r.ruleId === 'BED-WALL-01');
  const hasMeasurement = !!bedWallRule?.measurement && typeof bedWallRule.measurement.metric === 'string';

  recordTest('C3', 'BED-WALL-01 contains measurement evidence with metric details', hasMeasurement);
}

// =============================================================================
// GROUP D: Source Registry Resolution
// =============================================================================
console.log('\n>>> GROUP D: Source Registry Resolution <<<');

// D1: sourcesMap resolves cited source IDs to actual registered SourceReference objects
{
  const objects = createTestObjects();
  const report = buildUnifiedAssessmentReport({
    roomConfig: defaultRoomConfig,
    objects,
    profile: defaultProfile,
  });

  const sourceIds = Object.keys(report.sourcesMap);
  const allResolved = sourceIds.length > 0 && sourceIds.every((id) => {
    const src = report.sourcesMap[id];
    return src && typeof src.title === 'string' && typeof src.status === 'string';
  });

  recordTest('D1', 'All cited source references are resolved from SourceRegistry', allResolved, `resolvedCount=${sourceIds.length}`);
}

// D2: Verified vs Pending source status badges accurately distinguish standards
{
  const tcvn = getSourceInfo('SRC-TCVN-4451-2012');
  const btmk = getSourceInfo('SRC-BAT-TRACH-MINH-KINH');
  const hoaGiap = getSourceInfo('SRC-60-HOA-GIAP-NAP-AM');

  const accurateStatuses =
    tcvn?.status === 'verified' &&
    btmk?.status === 'pending' &&
    hoaGiap?.status === 'verified';

  recordTest('D2', 'SourceRegistry accurately maintains verified vs pending statuses', accurateStatuses);
}

// =============================================================================
// GROUP E: Regression Tests
// =============================================================================
console.log('\n>>> GROUP E: Regression Tests <<<');

// E1: Legacy calculateGua(1990, 'male') remains 1
{
  const legacyGua = calculateGua(1990, 'male');
  recordTest('E1', 'Legacy calculateGua(1990, male) strictly preserved as 1', legacyGua === 1);
}

// E2: Legacy getUserFengShuiProfile operates without alteration
{
  const legacyProfile = getUserFengShuiProfile(1990, 'male');
  recordTest('E2', 'Legacy getUserFengShuiProfile operates without alteration', legacyProfile.guaNumber === 1);
}

// E3: ROOM_PRESETS.master config and objects remain unmutated after report generation
{
  const master = ROOM_PRESETS['master'];
  const origW = master.config.width;
  const origObjs = master.objects.length;

  buildUnifiedAssessmentReport({
    roomConfig: master.config,
    objects: master.objects,
    profile: defaultProfile,
  });

  recordTest('E3', 'ROOM_PRESETS config and objects remain unmutated after report generation', master.config.width === origW && master.objects.length === origObjs);
}

// E4: P1 Compass and P2 OBB functions intact
{
  const n = normalizeDeg(360);
  const b = bearingOfVector({ x: 0, z: -1 });
  const obb1 = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb2 = { center: { x: 0.5, z: 0.5 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  recordTest('E4', 'P1 & P2 core functions intact (normalizeDeg, bearingOfVector, checkOBBCollisionV2)', n === 0 && b === 0 && checkOBBCollisionV2(obb1, obb2));
}

// E5: Intent Guard evaluateIntentSafety unaffected
{
  const res = evaluateIntentSafety('Hãy xoay giường 90 độ', true);
  recordTest('E5', 'Intent Guard evaluateIntentSafety operates without regression', res.isSafeToExecute === true);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(72));
console.log('PHASE P5 TEST SUITE — FINAL RESULTS');
console.log('='.repeat(72));

const passed = testResults.filter((r) => r.passed).length;
const failed = testResults.filter((r) => !r.passed).length;
const total = testResults.length;

console.log(`Total: ${total} | ✅ PASS: ${passed} | ❌ FAIL: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tests:');
  testResults.filter((r) => !r.passed).forEach((r) => {
    console.error(`  ❌ [${r.id}] ${r.name}`);
    if (r.details) console.error(`       → ${r.details}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All P5 tests passed.');
}

