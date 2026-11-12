// =============================================================================
// tests/p4_personal_house_room.test.ts
// Comprehensive Test Suite for Phase P4: Personal Feng Shui & House/Room Engine
//
// Coverage:
// A. PersonalProfile & Validation
// B. Gua Engine V2 (pre-2000, post-2000, Gua 5, full 8 Gua, calculation trace)
// C. Bát Trạch 64-Direction Matrix (8 Gua x 8 Directions, East/West groups)
// D. 60 Hoa Giáp Can Chi & Nạp Âm Engine (60 combinations, cyclical test, distinct elements)
// E. HouseRoom Orientation Model (Disambiguation, North null safety)
// F. Integration with P3 Furniture Rules (Bed, Desk, Room, missing data)
// G. Regression Tests (Legacy APIs, P0/P1/P2/P3 intact, Intent Guard, Presets unmutated)
// =============================================================================

import {
  PersonalProfile,
  validatePersonalProfile,
  DEFAULT_CALCULATION_POLICY,
} from '../src/engine/core/personalProfile.js';

import {
  resolveEffectiveSolarYear,
  estimateLapXuanMomentUTC7,
} from '../src/engine/core/lapXuanCalendar.js';

import {
  calculateGuaV2,
  computeDigitRoot,
  GUA_V2_METADATA,
} from '../src/engine/core/guaEngine.js';

import {
  getNapAmByYear,
  HOA_GIAP_60_TABLE,
} from '../src/engine/core/napAmEngine.js';

import {
  getBatTrachGuaProfile,
  BAT_TRACH_64_MATRIX,
  ALL_COMPASS_DIRECTIONS,
} from '../src/engine/core/batTrachEngine.js';

import {
  createHouseRoomOrientation,
  buildHouseRoomFromLegacy,
  getDirectionCategory,
} from '../src/engine/core/houseRoom.js';

import {
  evaluatePersonalAssessment,
  evaluateBedPersonalGua,
  evaluateDeskPersonalGua,
  evaluateHouseRoomPersonalGua,
  generateNapAmInfoRule,
  P4_ENGINE_VERSION,
} from '../src/engine/core/personalAssessment.js';

import { RoomLayout, buildLayoutFromLegacy } from '../src/engine/core/roomLayout.js';
import { RoomObject } from '../src/types/fengshui.js';
import { calculateGua, getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { evaluateIntentSafety } from '../src/services/intentGuard.js';
import { normalizeDeg, bearingOfVector } from '../src/engine/core/compass.js';
import { checkOBBCollisionV2 } from '../src/engine/geometryEngine.js';
import { evaluateFurnitureRules } from '../src/engine/core/furnitureRuleEngine.js';

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

// =============================================================================
// Helper: Mock RoomLayout (5m x 5m)
// =============================================================================
function createMockLayout(northBearingDeg: number | null = null): RoomLayout {
  return {
    id: 'test_room_p4',
    polygon: [
      { x: -2.5, z: -2.5 },
      { x:  2.5, z: -2.5 },
      { x:  2.5, z:  2.5 },
      { x: -2.5, z:  2.5 },
    ],
    northBearingDeg,
    ceilingHeight: 2.8,
    walls: [
      { id: 'w_north', startPoint: { x: -2.5, z: -2.5 }, endPoint: { x:  2.5, z: -2.5 }, height: 2.8, thickness: 0.15, wallType: 'solid' },
      { id: 'w_east',  startPoint: { x:  2.5, z: -2.5 }, endPoint: { x:  2.5, z:  2.5 }, height: 2.8, thickness: 0.15, wallType: 'solid' },
      { id: 'w_south', startPoint: { x:  2.5, z:  2.5 }, endPoint: { x: -2.5, z:  2.5 }, height: 0.85, thickness: 0.15, wallType: 'low_cutaway' },
      { id: 'w_west',  startPoint: { x: -2.5, z:  2.5 }, endPoint: { x: -2.5, z: -2.5 }, height: 2.8, thickness: 0.15, wallType: 'solid' },
    ],
    openings: [],
    beams: [],
  };
}

// =============================================================================
// GROUP A: PersonalProfile & Validation
// =============================================================================
console.log('\n>>> GROUP A: PersonalProfile & Validation <<<');

// A1: Valid profile passes validation with dataStatus: 'sufficient'
{
  const p: PersonalProfile = {
    id: 'usr_1',
    birthDate: '1990-08-15',
    genderForTraditionalCalculation: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const v = validatePersonalProfile(p);
  recordTest('A1', 'Valid profile passes validation with dataStatus: sufficient', v.valid && v.dataStatus === 'sufficient');
}

// A2: Missing birthDate fails validation with dataStatus: 'insufficient'
{
  const p: Partial<PersonalProfile> = {
    genderForTraditionalCalculation: 'female',
  };
  const v = validatePersonalProfile(p as PersonalProfile);
  recordTest('A2', 'Missing birthDate returns dataStatus: insufficient', !v.valid && v.dataStatus === 'insufficient' && v.missingFields.includes('birthDate'));
}

// A3: Missing genderForTraditionalCalculation fails validation
{
  const p: Partial<PersonalProfile> = {
    birthDate: '1995-05-20',
  };
  const v = validatePersonalProfile(p as PersonalProfile);
  recordTest('A3', 'Missing genderForTraditionalCalculation returns dataStatus: insufficient', !v.valid && v.missingFields.includes('genderForTraditionalCalculation'));
}

// A4: Birthdate on Lập Xuân boundary without birthTime returns isCertain: false
{
  // 1990 Lập Xuân occurred on Feb 4 at 10:14 UTC+7
  const res = resolveEffectiveSolarYear('1990-02-04');
  recordTest(
    'A4',
    'Birthdate exactly on Lập Xuân without birthTime returns isCertain: false',
    res.isBoundaryDate === true && res.isCertain === false,
    `isCertain=${res.isCertain}, isBoundaryDate=${res.isBoundaryDate}`
  );
}

// A5: Birthdate on Lập Xuân with morning birthTime before 10:14 resolves to previous year (1989)
{
  const res = resolveEffectiveSolarYear('1990-02-04', '08:00');
  recordTest(
    'A5',
    'Birthdate on Lập Xuân before event time resolves to year-1 (1989)',
    res.effectiveSolarYear === 1989 && res.isCertain === true,
    `effectiveYear=${res.effectiveSolarYear}`
  );
}

// A6: Birthdate on Lập Xuân with afternoon birthTime after 10:14 resolves to current year (1990)
{
  const res = resolveEffectiveSolarYear('1990-02-04', '15:30');
  recordTest(
    'A6',
    'Birthdate on Lập Xuân after event time resolves to current year (1990)',
    res.effectiveSolarYear === 1990 && res.isCertain === true,
    `effectiveYear=${res.effectiveSolarYear}`
  );
}

// A7: January birthdate strictly resolves to previous year (1990-01-15 -> 1989)
{
  const res = resolveEffectiveSolarYear('1990-01-15');
  recordTest(
    'A7',
    'January birthdate (before Lập Xuân) resolves to previous year (1989)',
    res.effectiveSolarYear === 1989 && res.isCertain === true,
    `effectiveYear=${res.effectiveSolarYear}`
  );
}

// =============================================================================
// GROUP B: Gua Engine V2
// =============================================================================
console.log('\n>>> GROUP B: Gua Engine V2 <<<');

// B1: 1990 Male born in August -> Effective year 1990 -> Gua 1 Khảm (Thủy - Đông Tứ Mệnh)
{
  const p: PersonalProfile = {
    id: 'p_1990_m',
    birthDate: '1990-08-20',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B1',
    '1990 Male -> Gua 1 Khảm (Thủy - Đông Tứ Mệnh)',
    g.guaNumber === 1 && g.guaName === 'Khảm' && g.element === 'Thủy' && g.group === 'Đông Tứ Mệnh',
    `gua=${g.guaNumber} (${g.guaName})`
  );
}

// B2: 1990 Female born in August -> Effective year 1990 -> Gua 8 Cấn (Thổ - Tây Tứ Mệnh) (4+1=5 -> Female 5 maps to 8)
{
  const p: PersonalProfile = {
    id: 'p_1990_f',
    birthDate: '1990-08-20',
    genderForTraditionalCalculation: 'female',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B2',
    '1990 Female -> Gua 8 Cấn (Thổ - Tây Tứ Mệnh) via Gua 5 mapping',
    g.guaNumber === 8 && g.guaName === 'Cấn' && g.element === 'Thổ' && g.group === 'Tây Tứ Mệnh',
    `gua=${g.guaNumber} (${g.guaName})`
  );
}

// B3: Male Gua 5 special case -> Maps to 2 Khôn (Thổ - Tây Tứ Mệnh)
// Example: Male 1986: 1+9+8+6 = 24 -> 2+4 = 6. Male < 2000: 11 - 6 = 5 -> Maps to 2 (Khôn)
{
  const p: PersonalProfile = {
    id: 'p_1986_m',
    birthDate: '1986-07-10',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B3',
    'Male Gua 5 maps to Gua 2 Khôn (Thổ - Tây Tứ Mệnh)',
    g.guaNumber === 2 && g.guaName === 'Khôn' && g.element === 'Thổ' && g.group === 'Tây Tứ Mệnh',
    `gua=${g.guaNumber} (${g.guaName})`
  );
}

// B4: Post-2000 Male calculation (e.g. 2002 Male: 2+0+0+2 = 4; Male >= 2000: (11 - 4) - 1 = 6 Càn)
{
  const p: PersonalProfile = {
    id: 'p_2002_m',
    birthDate: '2002-06-15',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B4',
    'Post-2000 Male: 2002 -> Gua 6 Càn (Kim - Tây Tứ Mệnh)',
    g.guaNumber === 6 && g.guaName === 'Càn' && g.group === 'Tây Tứ Mệnh',
    `gua=${g.guaNumber} (${g.guaName})`
  );
}

// B5: Post-2000 Female calculation (e.g. 2002 Female: 2+0+0+2 = 4; Female >= 2000: 4 + 4 + 1 = 9 Ly)
{
  const p: PersonalProfile = {
    id: 'p_2002_f',
    birthDate: '2002-06-15',
    genderForTraditionalCalculation: 'female',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B5',
    'Post-2000 Female: 2002 -> Gua 9 Ly (Hỏa - Đông Tứ Mệnh)',
    g.guaNumber === 9 && g.guaName === 'Ly' && g.group === 'Đông Tứ Mệnh',
    `gua=${g.guaNumber} (${g.guaName})`
  );
}

// B6: Full coverage of all 8 Gua numbers (1, 2, 3, 4, 6, 7, 8, 9)
{
  const testYears: Array<{ year: number; gender: 'male' | 'female'; expectedGua: number }> = [
    { year: 1990, gender: 'male',   expectedGua: 1 }, // Khảm
    { year: 1986, gender: 'male',   expectedGua: 2 }, // Khôn (via 5)
    { year: 1988, gender: 'male',   expectedGua: 3 }, // Chấn (1+9+8+8=26->8; 11-8=3)
    { year: 1987, gender: 'male',   expectedGua: 4 }, // Tốn (1+9+8+7=25->7; 11-7=4)
    { year: 1985, gender: 'male',   expectedGua: 6 }, // Càn (1+9+8+5=23->5; 11-5=6)
    { year: 1984, gender: 'male',   expectedGua: 7 }, // Đoài (1+9+8+4=22->4; 11-4=7)
    { year: 1990, gender: 'female', expectedGua: 8 }, // Cấn (via 5)
    { year: 1991, gender: 'male',   expectedGua: 9 }, // Ly (1+9+9+1=20->2; 11-2=9)
  ];

  const allPassed = testYears.every(({ year, gender, expectedGua }) => {
    const res = calculateGuaV2({
      id: `t_${year}`,
      birthDate: `${year}-07-01`,
      genderForTraditionalCalculation: gender,
      createdAt: '',
      updatedAt: '',
    });
    return res.guaNumber === expectedGua;
  });

  recordTest('B6', 'All 8 Gua numbers (1, 2, 3, 4, 6, 7, 8, 9) verified with correct test cases', allPassed);
}

// B7: Calculation trace is generated with readable step-by-step descriptions
{
  const p: PersonalProfile = {
    id: 'p_trace',
    birthDate: '1990-08-20',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  const hasDetailedTrace = g.calculationTrace.length >= 5 && g.calculationTrace.some((t) => t.includes('Lập Xuân'));
  recordTest('B7', 'Calculation trace produces transparent, step-by-step documentation', hasDetailedTrace);
}

// B8: Uncertain boundary returns dataStatus: 'insufficient'
{
  const p: PersonalProfile = {
    id: 'p_uncertain',
    birthDate: '1990-02-04', // Exact Lập Xuân day without hour
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const g = calculateGuaV2(p);
  recordTest(
    'B8',
    'Uncertain Lập Xuân boundary returns dataStatus: insufficient and isCertain: false',
    g.dataStatus === 'insufficient' && g.isCertain === false && !!g.uncertaintyReason
  );
}

// =============================================================================
// GROUP C: Bát Trạch 64-Direction Matrix
// =============================================================================
console.log('\n>>> GROUP C: Bát Trạch 64-Direction Matrix <<<');

// C1: Matrix contains exactly 8 Gua rows, each with 8 distinct directions (64 cells)
{
  const guaKeys = Object.keys(BAT_TRACH_64_MATRIX).map(Number);
  const has8Gua = guaKeys.length === 8 && !guaKeys.includes(5);
  let cellCount = 0;
  for (const k of guaKeys) {
    const dirs = Object.keys(BAT_TRACH_64_MATRIX[k]);
    if (dirs.length === 8) cellCount += 8;
  }
  recordTest('C1', 'BAT_TRACH_64_MATRIX contains exactly 8 Gua rows x 8 directions = 64 cells', has8Gua && cellCount === 64, `cells=${cellCount}`);
}

// C2: Every Gua row contains exactly 4 Auspicious and 4 Inauspicious sectors
{
  const guaKeys = [1, 2, 3, 4, 6, 7, 8, 9];
  const all4and4 = guaKeys.every((g) => {
    const prof = getBatTrachGuaProfile(g);
    return prof.auspiciousDirections.length === 4 && prof.inauspiciousDirections.length === 4;
  });
  recordTest('C2', 'Every Gua profile contains exactly 4 Auspicious and 4 Inauspicious directions', all4and4);
}

// C3: East Group (1, 3, 4, 9) Auspicious directions are strictly in { N, S, E, SE }
{
  const eastGuas = [1, 3, 4, 9];
  const eastExpected = new Set(['N', 'S', 'E', 'SE']);
  const allEastValid = eastGuas.every((g) => {
    const prof = getBatTrachGuaProfile(g);
    return (
      prof.group === 'Đông Tứ Mệnh' &&
      prof.auspiciousDirections.every((d) => eastExpected.has(d))
    );
  });
  recordTest('C3', 'East Group (Đông Tứ Mệnh: 1, 3, 4, 9) auspicious directions are strictly N, S, E, SE', allEastValid);
}

// C4: West Group (2, 6, 7, 8) Auspicious directions are strictly in { W, NW, SW, NE }
{
  const westGuas = [2, 6, 7, 8];
  const westExpected = new Set(['W', 'NW', 'SW', 'NE']);
  const allWestValid = westGuas.every((g) => {
    const prof = getBatTrachGuaProfile(g);
    return (
      prof.group === 'Tây Tứ Mệnh' &&
      prof.auspiciousDirections.every((d) => westExpected.has(d))
    );
  });
  recordTest('C4', 'West Group (Tây Tứ Mệnh: 2, 6, 7, 8) auspicious directions are strictly W, NW, SW, NE', allWestValid);
}

// C5: True bearing resolution via northBearingDeg
{
  const profUncalibrated = getBatTrachGuaProfile(1, null);
  const profCalibrated = getBatTrachGuaProfile(1, 15); // Local North is at true 15°
  const uncalNull = profUncalibrated.sectors['N'].trueBearingDeg === null;
  const calShifted = profCalibrated.sectors['N'].trueBearingDeg === 15;
  recordTest('C5', 'Bát Trạch profile correctly preserves null true bearing or applies calibration', uncalNull && calShifted);
}

// =============================================================================
// GROUP D: 60 Hoa Giáp Can Chi & Nạp Âm Engine
// =============================================================================
console.log('\n>>> GROUP D: 60 Hoa Giáp Can Chi & Nạp Âm Engine <<<');

// D1: Table contains exactly 60 distinct Can Chi entries
{
  const len = HOA_GIAP_60_TABLE.length;
  const uniqueCanChi = new Set(HOA_GIAP_60_TABLE.map((e) => e.canChi)).size;
  recordTest('D1', 'HOA_GIAP_60_TABLE contains 60 distinct Can Chi combinations', len === 60 && uniqueCanChi === 60);
}

// D2: 60-year cyclical test (1924, 1984, 2044 all resolve to Giáp Tý - Hải Trung Kim)
{
  const y1924 = getNapAmByYear(1924);
  const y1984 = getNapAmByYear(1984);
  const y2044 = getNapAmByYear(2044);
  const match =
    y1924.canChi === 'Giáp Tý' && y1924.napAm === 'Hải Trung Kim' && y1924.napAmElement === 'Kim' &&
    y1984.canChi === 'Giáp Tý' && y1984.napAm === 'Hải Trung Kim' &&
    y2044.canChi === 'Giáp Tý' && y2044.napAm === 'Hải Trung Kim';
  recordTest('D2', '60-year cycle test: 1924, 1984, 2044 all resolve to Giáp Tý - Hải Trung Kim', match);
}

// D3: 1990 resolves to Canh Ngọ - Lộ Bàng Thổ (Thổ)
{
  const res = getNapAmByYear(1990);
  recordTest(
    'D3',
    '1990 resolves to Canh Ngọ - Lộ Bàng Thổ (Thổ)',
    res.canChi === 'Canh Ngọ' && res.napAm === 'Lộ Bàng Thổ' && res.napAmElement === 'Thổ',
    `canChi=${res.canChi}, napAm=${res.napAm}`
  );
}

// D4: Strict separation: Nạp Âm element does NOT equal Gua element
{
  // For 1990 Male: Nạp Âm = Thổ (Lộ Bàng Thổ), but Gua = Thủy (1 Khảm)
  const napAm = getNapAmByYear(1990);
  const gua = calculateGuaV2({
    id: 't_sep',
    birthDate: '1990-07-01',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  });
  recordTest(
    'D4',
    'Strict separation: Nạp Âm Element (Thổ) differs from Gua Element (Thủy) for 1990 Male',
    napAm.napAmElement === 'Thổ' && gua.element === 'Thủy' && (napAm.napAmElement as string) !== (gua.element as string),
    `napAmElement=${napAm.napAmElement}, guaElement=${gua.element}`
  );
}

// =============================================================================
// GROUP E: HouseRoom Orientation Model
// =============================================================================
console.log('\n>>> GROUP E: HouseRoom Orientation Model <<<');

// E1: createHouseRoomOrientation preserves separate bearings
{
  const hr = createHouseRoomOrientation({
    houseFacingBearing: 180, // South
    roomFacingBearing: 90,   // East
    mainEntranceBearing: 180,
    roomDoorBearing: 270,    // West
    northBearingDeg: null,
  });
  const separated =
    hr.houseFacingBearing === 180 &&
    hr.roomFacingBearing === 90 &&
    hr.roomDoorBearing === 270 &&
    hr.northBearingDeg === null;
  recordTest('E1', 'HouseRoomOrientation disambiguates house, room, and door bearings', separated);
}

// E2: northBearingDeg = null is strictly preserved and not defaulted to 0
{
  const hr = buildHouseRoomFromLegacy({ width: 4, length: 5, height: 2.8, direction: 'N' });
  recordTest('E2', 'buildHouseRoomFromLegacy strictly preserves northBearingDeg as null', hr.northBearingDeg === null);
}

// E3: getDirectionCategory maps bearings to 8 standard Compass Directions
{
  const dN = getDirectionCategory(0);
  const dE = getDirectionCategory(90);
  const dS = getDirectionCategory(180);
  const dW = getDirectionCategory(270);
  const dNull = getDirectionCategory(null);
  recordTest(
    'E3',
    'getDirectionCategory correctly resolves 0->N, 90->E, 180->S, 270->W and null->null',
    dN === 'N' && dE === 'E' && dS === 'S' && dW === 'W' && dNull === null
  );
}

// =============================================================================
// GROUP F: Integration with P3
// =============================================================================
console.log('\n>>> GROUP F: Integration with P3 <<<');

// F1: Bed headboard oriented to Auspicious direction passes with verdict: 'pass'
{
  const layout = createMockLayout();
  // 1990 Male: Gua 1 Khảm (Đông Tứ Mệnh: Cát ở N, S, E, SE)
  const profile: PersonalProfile = {
    id: 'u_1990',
    birthDate: '1990-08-15',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const batTrachProf = getBatTrachGuaProfile(1, null);

  // Bed with rot = 0 -> headboard points North (Z-) -> North is PHUC_VI (Cát)
  const bedNorth: RoomObject = {
    id: 'bed_north',
    type: 'bed',
    name: 'Giường hướng Bắc',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedPersonalGua(bedNorth, batTrachProf, null);
  recordTest(
    'F1',
    'Bed with headboard in Auspicious sector (Bắc - Phục Vị) returns verdict: pass',
    res.verdict === 'pass' && res.measurement?.passed === true,
    `verdict=${res.verdict}, sector=${res.measurement?.value}`
  );
}

// F2: Bed headboard oriented to Inauspicious direction returns verdict: 'warn'
{
  const batTrachProf = getBatTrachGuaProfile(1, null);
  // Bed with rot = Math.PI / 2 (90°) -> headboard points West (X-) -> West is HOA_HAI (Hung)
  const bedWest: RoomObject = {
    id: 'bed_west',
    type: 'bed',
    name: 'Giường hướng Tây',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedPersonalGua(bedWest, batTrachProf, null);
  recordTest(
    'F2',
    'Bed with headboard in Inauspicious sector (Tây - Họa Hại) returns verdict: warn',
    res.verdict === 'warn' && res.measurement?.passed === false,
    `verdict=${res.verdict}, sector=${res.measurement?.value}`
  );
}

// F3: Desk facing Auspicious direction passes with verdict: 'pass'
{
  const batTrachProf = getBatTrachGuaProfile(1, null);
  // Desk with rot = 0 -> seated user faces North (Z-) -> North is PHUC_VI (Cát)
  const deskNorth: RoomObject = {
    id: 'desk_north',
    type: 'desk',
    name: 'Bàn nhìn hướng Bắc',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const res = evaluateDeskPersonalGua(deskNorth, batTrachProf, null);
  recordTest(
    'F3',
    'Desk with user facing Auspicious sector (Bắc) returns verdict: pass',
    res.verdict === 'pass' && res.measurement?.passed === true,
    `verdict=${res.verdict}`
  );
}

// F4: Missing PersonalProfile returns dataStatus: 'insufficient' and verdict: 'unknown'
{
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2, height: 1 },
  };
  const res = evaluateBedPersonalGua(bed, null, null);
  recordTest(
    'F4',
    'Missing PersonalProfile returns dataStatus: insufficient and verdict: unknown',
    res.dataStatus === 'insufficient' && res.verdict === 'unknown'
  );
}

// F5: evaluatePersonalAssessment orchestrator combines all rules and generates Nạp Âm
{
  const layout = createMockLayout();
  const profile: PersonalProfile = {
    id: 'u_1990',
    birthDate: '1990-08-15',
    genderForTraditionalCalculation: 'male',
    createdAt: '',
    updatedAt: '',
  };
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };
  const desk: RoomObject = {
    id: 'desk_1',
    type: 'desk',
    name: 'Bàn',
    position: { x: -1, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.2, length: 0.6, height: 0.75 },
  };

  const output = evaluatePersonalAssessment({
    profile,
    layout,
    objects: [bed, desk],
    houseRoom: createHouseRoomOrientation({ roomFacingBearing: 180 }),
  });

  const validOutput =
    output.dataStatus === 'sufficient' &&
    !!output.guaResult &&
    !!output.napAmResult &&
    !!output.batTrachProfile &&
    output.personalRules.length >= 4 &&
    output.engineVersion === P4_ENGINE_VERSION;

  recordTest('F5', 'evaluatePersonalAssessment orchestrator produces full personal profile & rules', validOutput);
}

// F6: Personal assessment does NOT overwrite or mutate P3 geometric rules
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const p3Output = evaluateFurnitureRules({ layout, objects: [bed] });
  const p4Output = evaluatePersonalAssessment({
    profile: { id: 'u_1', birthDate: '1990-08-15', genderForTraditionalCalculation: 'male', createdAt: '', updatedAt: '' },
    layout,
    objects: [bed],
  });

  // P3 rules remain separate from P4 rules
  const p3RuleIds = p3Output.geometricRules.map((r) => r.ruleId);
  const p4RuleIds = p4Output.personalRules.map((r) => r.ruleId);
  const disjoint = p3RuleIds.every((id) => !p4RuleIds.includes(id));

  recordTest('F6', 'P4 Personal rules are strictly disjoint from P3 geometric rules (never overwritten)', disjoint);
}

// =============================================================================
// GROUP G: Regression Tests
// =============================================================================
console.log('\n>>> GROUP G: Regression Tests <<<');

// G1: Legacy calculateGua(1990, 'male') remains 1 (Khảm)
{
  const legacyGua = calculateGua(1990, 'male');
  recordTest('G1', 'Legacy calculateGua(1990, male) strictly preserved as 1', legacyGua === 1);
}

// G2: Legacy getUserFengShuiProfile(1990, 'male') remains functional
{
  const legacyProfile = getUserFengShuiProfile(1990, 'male');
  recordTest('G2', 'Legacy getUserFengShuiProfile operates without alteration', legacyProfile.guaNumber === 1 && legacyProfile.group === 'Đông Tứ Mệnh');
}

// G3: ROOM_PRESETS are not mutated by P4 assessment
{
  const master = ROOM_PRESETS['master'];
  const origW = master.config.width;
  const origObjs = master.objects.length;

  const layout = buildLayoutFromLegacy(master.config, master.objects);
  evaluatePersonalAssessment({
    profile: { id: 'u_test', birthDate: '1990-08-15', genderForTraditionalCalculation: 'male', createdAt: '', updatedAt: '' },
    layout,
    objects: master.objects,
  });

  recordTest('G3', 'ROOM_PRESETS config and objects remain unmutated', master.config.width === origW && master.objects.length === origObjs);
}

// G4: P1 Compass & P2 OBB functions intact
{
  const n = normalizeDeg(720);
  const b = bearingOfVector({ x: 1, z: 0 });
  const obb1 = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb2 = { center: { x: 0.5, z: 0.5 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  recordTest('G4', 'P1 & P2 core functions intact (normalizeDeg, bearingOfVector, checkOBBCollisionV2)', n === 0 && b === 90 && checkOBBCollisionV2(obb1, obb2));
}

// G5: Intent Guard evaluateIntentSafety unaffected
{
  const res = evaluateIntentSafety('Hãy xoay giường 90 độ', true);
  recordTest('G5', 'Intent Guard evaluateIntentSafety operates without regression', res.isSafeToExecute === true);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(72));
console.log('PHASE P4 TEST SUITE — FINAL RESULTS');
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
  console.log('\n✅ All P4 tests passed.');
}

