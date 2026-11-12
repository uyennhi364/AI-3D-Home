// =============================================================================
// tests/p1_defect_remediation.test.ts
// Regression Test Suite for PILOT-01.1 Defect Remediation:
// - BUG-P1-01: CompassDirection normalization & Vietnamese label mapping
// - BUG-P1-02: Missing/partial directionDetails null safety & crash prevention
// =============================================================================

import {
  evaluateRoomFengShui,
  getSectorInfoFromDetails,
  UNKNOWN_SECTOR_INFO,
} from '../src/engine/fengshuiRules.js';
import {
  getUserFengShuiProfile,
  normalizeCompassDirection,
  formatCompassDirectionVi,
  DIRECTION_NAMES_VI,
} from '../src/engine/batTrach.js';
import { RoomConfig, RoomObject, UserFengShuiProfile } from '../src/types/fengshui.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, message: string): void {
  if (condition) {
    console.log(`  ✅ [PASS] ${testId}: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${message}`);
    failed++;
  }
}

const standardRoom: RoomConfig = {
  width: 5.0,
  length: 5.2,
  height: 2.8,
  direction: 'N',
};

const standardObjects: RoomObject[] = [
  {
    id: 'bed_01',
    type: 'bed',
    name: 'Giường đôi Master',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: Math.PI, z: 0 },
    dimensions: { width: 1.6, length: 2.0, height: 0.85 },
  },
  {
    id: 'desk_01',
    type: 'desk',
    name: 'Bàn làm việc',
    position: { x: 1.6, y: 0, z: -1.9 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { width: 1.3, length: 0.65, height: 0.75 },
  },
  {
    id: 'mirror_01',
    type: 'mirror',
    name: 'Gương soi đứng',
    position: { x: 1.8, y: 0, z: 1.0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 0.55, length: 0.15, height: 1.65 },
  },
  {
    id: 'wardrobe_01',
    type: 'wardrobe',
    name: 'Tủ quần áo',
    position: { x: -0.2, y: 0, z: -2.15 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 2.5, length: 0.6, height: 2.45 },
  },
];

console.log('=============================================================================');
console.log('RUNNING PILOT-01.1 REGRESSION TESTS (BUG-P1-01 & BUG-P1-02 REMEDIATION)');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: normalizeCompassDirection & formatCompassDirectionVi
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Compass Direction Normalization & Localization ---');

assert(normalizeCompassDirection('N') === 'N', 'NORM-01', 'Standard uppercase "N" normalizes to "N"');
assert(normalizeCompassDirection('se') === 'SE', 'NORM-02', 'Lowercase "se" normalizes to "SE"');
assert(normalizeCompassDirection('Bắc') === 'N', 'NORM-03', 'Vietnamese "Bắc" normalizes to "N"');
assert(normalizeCompassDirection('Đông Nam') === 'SE', 'NORM-04', 'Vietnamese "Đông Nam" normalizes to "SE"');
assert(normalizeCompassDirection('tây bắc') === 'NW', 'NORM-05', 'Lowercase Vietnamese "tây bắc" normalizes to "NW"');
assert(normalizeCompassDirection('INVALID') === null, 'NORM-06', 'Invalid string returns null');
assert(normalizeCompassDirection(null) === null, 'NORM-07', 'Null returns null');
assert(normalizeCompassDirection(undefined) === null, 'NORM-08', 'Undefined returns null');
assert(formatCompassDirectionVi('N') === 'Bắc', 'FORMAT-01', '"N" formats to "Bắc"');
assert(formatCompassDirectionVi('SW') === 'Tây Nam', 'FORMAT-02', '"SW" formats to "Tây Nam"');

// -----------------------------------------------------------------------------
// SECTION 2: BUG-P1-01 REGRESSION TESTS (AuspiciousDirections format compatibility)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: BUG-P1-01 (AuspiciousDirections format compatibility) ---');

// Test 2.1: Full valid profile with standard Latin codes
{
  const fullProfile = getUserFengShuiProfile(1990, 'male');
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(fullProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-01-A', 'Full valid profile with Latin codes evaluates without error');
  assert(evalResult && evalResult.overallScore > 0, 'P1-01-B', 'Score calculated successfully');
}

// Test 2.2: Profile with auspiciousDirections in Vietnamese
{
  const viProfile: any = {
    ...getUserFengShuiProfile(1990, 'male'),
    auspiciousDirections: ['Bắc', 'Đông Nam', 'Đông', 'Nam'],
    inauspiciousDirections: ['Tây Nam', 'Đông Bắc', 'Tây Bắc', 'Tây'],
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(viProfile, standardRoom, standardObjects);
  } catch (e: any) {
    threw = true;
    console.error('P1-01-C threw:', e.message);
  }
  assert(!threw, 'P1-01-C', 'Profile with Vietnamese auspiciousDirections evaluates without crash');
  assert(evalResult && typeof evalResult.overallScore === 'number', 'P1-01-D', 'Overall score is numeric');
  const bedItem = evalResult.items.find((i: any) => i.type === 'bed');
  assert(bedItem && typeof bedItem.recommendation === 'string', 'P1-01-E', 'Bed recommendation rendered safely');
}

// Test 2.3: Profile with mixed Latin & Vietnamese directions
{
  const mixedProfile: any = {
    ...getUserFengShuiProfile(1990, 'male'),
    auspiciousDirections: ['N', 'Đông Nam', 'E', 'Nam'],
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(mixedProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-01-F', 'Mixed Latin/Vietnamese directions evaluated without crash');
}

// Test 2.4: Profile with invalid direction values in auspiciousDirections
{
  const invalidDirProfile: any = {
    ...getUserFengShuiProfile(1990, 'male'),
    auspiciousDirections: ['INVALID_DIR', '123', null, undefined],
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(invalidDirProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-01-G', 'Invalid direction values in auspiciousDirections handled safely without crash');
}

// -----------------------------------------------------------------------------
// SECTION 3: BUG-P1-02 REGRESSION TESTS (Missing/Partial directionDetails null safety)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: BUG-P1-02 (Missing/Partial directionDetails null safety) ---');

// Test 3.1: Profile with only birthYear and gender (directionDetails is undefined)
{
  const minimalProfile: any = {
    birthYear: 1990,
    gender: 'male',
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(minimalProfile, standardRoom, standardObjects);
  } catch (e: any) {
    threw = true;
    console.error('P1-02-A threw:', e.message);
  }
  assert(!threw, 'P1-02-A', 'Minimal profile (birthYear, gender only) evaluates without crash');
  assert(evalResult && typeof evalResult.overallScore === 'number', 'P1-02-B', 'Produces valid evaluation structure');
  assert(
    evalResult.keyIssues.some((issue: string) => issue.includes('Chưa đủ dữ liệu quái mệnh')),
    'P1-02-C',
    'Explains missing data in keyIssues without guessing fake directions'
  );
}

// Test 3.2: Profile with directionDetails = undefined
{
  const undefinedDetailsProfile: any = {
    birthYear: 1985,
    gender: 'female',
    guaName: 'Cấn',
    directionDetails: undefined,
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(undefinedDetailsProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-02-D', 'directionDetails = undefined evaluates without crash');
}

// Test 3.3: Profile with directionDetails = null
{
  const nullDetailsProfile: any = {
    birthYear: 1985,
    gender: 'female',
    directionDetails: null,
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(nullDetailsProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-02-E', 'directionDetails = null evaluates without crash');
}

// Test 3.4: Profile with room direction not present in directionDetails
{
  const partialDetailsProfile: any = {
    birthYear: 1990,
    gender: 'male',
    directionDetails: {
      S: { name: 'Diên Niên', type: 'DIEN_NIEN', isGood: true, meaning: 'Hòa thuận' },
      // 'N' is omitted intentionally
    },
  };
  let threw = false;
  let evalResult: any = null;
  try {
    evalResult = evaluateRoomFengShui(partialDetailsProfile, standardRoom, standardObjects);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'P1-02-F', 'Room direction omitted from directionDetails evaluates without crash');
  assert(
    evalResult.keyIssues.some((k: string) => k.includes('Chưa đủ dữ liệu quái mệnh hoặc hướng phòng')),
    'P1-02-G',
    'Flags missing room direction in keyIssues'
  );
}

// Test 3.5: getSectorInfoFromDetails helper unit tests
{
  assert(getSectorInfoFromDetails(null, 'N') === null, 'SECTOR-01', 'null details returns null');
  assert(getSectorInfoFromDetails(undefined, 'N') === null, 'SECTOR-02', 'undefined details returns null');
  const details = {
    N: { name: 'Phục Vị', type: 'PHUC_VI' as any, isGood: true, meaning: 'Bình yên' },
  };
  assert(getSectorInfoFromDetails(details, 'N')?.name === 'Phục Vị', 'SECTOR-03', 'Retrieves by standard Latin code');
  assert(getSectorInfoFromDetails(details, 'Bắc')?.name === 'Phục Vị', 'SECTOR-04', 'Retrieves by Vietnamese alias "Bắc"');
  assert(getSectorInfoFromDetails(details, 'n')?.name === 'Phục Vị', 'SECTOR-05', 'Retrieves by lowercase "n"');
  assert(getSectorInfoFromDetails(details, 'W') === null, 'SECTOR-06', 'Missing direction returns null');
}

// -----------------------------------------------------------------------------
// SECTION 4: INVARIANCE OF VALID EXISTING CALCULATIONS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Calculation Invariance on Valid Existing Cases ---');
{
  const standardProfile = getUserFengShuiProfile(1990, 'male');
  const result = evaluateRoomFengShui(standardProfile, standardRoom, standardObjects);

  // Default Master Preset: Bed N (Phục Vị), Room N (Phục Vị)
  assert(result.overallScore >= 70 && result.overallScore <= 98, 'INVAR-01', `Valid profile score: ${result.overallScore}`);
  assert(result.breakdown.roomDirectionScore === 95, 'INVAR-02', 'Room facing N (Phục Vị cát) gets score 95');
  assert(result.items.length === 4, 'INVAR-03', 'All 4 objects evaluated');
  const bedEval = result.items.find((i) => i.objectId === 'bed_01');
  assert(bedEval?.isSectorGood === true, 'INVAR-04', 'Bed at north sector correctly recognized as good');
}

console.log('\n=============================================================================');
console.log(`P1 DEFECT REMEDIATION TESTS: ${passed} PASS | ${failed} FAIL`);
console.log('=============================================================================\n');

if (failed > 0) {
  process.exit(1);
}

