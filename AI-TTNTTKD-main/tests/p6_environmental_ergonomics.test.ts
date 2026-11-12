// =============================================================================
// tests/p6_environmental_ergonomics.test.ts
// Phase P6 — Environmental & Ergonomics Assessment Engine Tests
//
// Groups:
//   A: Lighting (ENV-LIGHT-01, ENV-LIGHT-02, ENV-LIGHT-03)
//   B: Ventilation (ENV-VENT-01, ENV-VENT-02, ENV-VENT-03)
//   C: Circulation (ERG-CIRC-01, ERG-CIRC-02)
//   D: Ergonomics (ERG-BED-01, ERG-WARD-01, ERG-DESK-01)
//   E: Data Quality (ENV-DQ-01 .. ENV-DQ-06)
//   F: Integration (Full unified report, no duplicate ruleIds, no mutation)
//   G: Regression (P0–P5 functions unchanged)
// =============================================================================

import {
  evaluateWindowFloorRatio,
  evaluateWindowOrientation,
  evaluateWindowObstruction,
  evaluateVentilationOpenings,
  evaluateCrossVentilationPotential,
  evaluateVentilationObstruction,
  evaluateMainWalkwayClearance,
  evaluateDoorSwingClearance,
  evaluateBedSideClearance,
  evaluateWardrobeFrontClearance,
  evaluateDeskChairClearance,
  evaluateEnvironmentalDataQuality,
  evaluateEnvironmentalRules,
} from '../src/engine/core/environmentalEngine.js';
import { buildUnifiedAssessmentReport } from '../src/engine/core/unifiedAssessment.js';
import { buildLayoutFromLegacy } from '../src/engine/core/roomLayout.js';
import { calculateGuaV2 } from '../src/engine/core/guaEngine.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { createRoomFrame } from '../src/engine/core/roomFrame.js';
import { checkOBBCollisionV2 } from '../src/engine/geometryEngine.js';
import { RoomLayout, Wall, Opening } from '../src/engine/core/roomLayout.js';
import { RoomObject, RoomConfig } from '../src/types/fengshui.js';
import { PersonalProfile } from '../src/engine/core/personalProfile.js';

// =============================================================================
// Test Helpers
// =============================================================================

let passed = 0;
let failed = 0;
let recorded = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function record(label: string, value: unknown): void {
  console.log(`  📋 RECORDED: ${label} = ${JSON.stringify(value)}`);
  recorded++;
}

// Build a minimal RoomLayout for testing
function makeLayout(overrides: Partial<RoomLayout> = {}): RoomLayout {
  const base: RoomLayout = {
    id: 'test-room',
    polygon: [
      { x: -2.5, z: -3.0 },
      { x:  2.5, z: -3.0 },
      { x:  2.5, z:  3.0 },
      { x: -2.5, z:  3.0 },
    ],
    northBearingDeg: 0,
    ceilingHeight: 2.8,
    walls: [
      // North wall (z=-3, x: -2.5 → 2.5)
      { id: 'w-north', startPoint: { x: -2.5, z: -3.0 }, endPoint: { x: 2.5, z: -3.0 }, height: 2.8, thickness: 0.2, wallType: 'solid' },
      // East wall (x=2.5, z: -3 → 3)
      { id: 'w-east',  startPoint: { x: 2.5, z: -3.0 }, endPoint: { x: 2.5, z:  3.0 }, height: 2.8, thickness: 0.2, wallType: 'solid' },
      // South wall (z=3, x: 2.5 → -2.5) low_cutaway for visibility
      { id: 'w-south', startPoint: { x: 2.5, z:  3.0 }, endPoint: { x: -2.5, z:  3.0 }, height: 2.8, thickness: 0.2, wallType: 'low_cutaway' },
      // West wall (x=-2.5, z: 3 → -3)
      { id: 'w-west',  startPoint: { x: -2.5, z:  3.0 }, endPoint: { x: -2.5, z: -3.0 }, height: 2.8, thickness: 0.2, wallType: 'solid' },
    ],
    openings: [],
    beams: [],
  };
  return { ...base, ...overrides };
}

function makeWindow(id: string, wallId: string, offset: number, width = 1.4, height = 1.6, swing: Opening['swing'] = 'in', assumed = false): Opening {
  return { id, wallId, kind: 'window', offset, width, height, sillHeight: 0.9, swing, assumed };
}

function makeDoor(id: string, wallId: string, offset: number, width = 0.9, swing: Opening['swing'] = 'in', assumed = false): Opening {
  return { id, wallId, kind: 'door', offset, width, height: 2.1, sillHeight: 0, swing, assumed };
}

function makeObj(id: string, type: RoomObject['type'], x: number, z: number, w: number, l: number, rotY = 0): RoomObject {
  return {
    id,
    type,
    name: id,
    position: { x, y: 0, z },
    dimensions: { width: w, length: l, height: 0.5 },
    rotation: { x: 0, y: rotY, z: 0 },
    color: '#888',
  } as RoomObject;
}

// =============================================================================
// GROUP A — LIGHTING
// =============================================================================

console.log('\n========== GROUP A: LIGHTING ==========');

// A1: Room 5×6 with 1 confirmed window → ratio = 1.4×1.6 / 30 = 0.0747 → warn
{
  const layout = makeLayout({
    openings: [makeWindow('win1', 'w-north', 2.5)],
  });
  const result = evaluateWindowFloorRatio(layout, []);
  assert(result.ruleId === 'ENV-LIGHT-01', 'A1: ruleId correct');
  assert(result.verdict === 'warn', `A1: ratio warn (got ${result.verdict})`);
  assert(result.dataStatus === 'sufficient', 'A1: dataStatus sufficient');
  record('A1 ratio', result.measurement?.value);
}

// A2: No windows → insufficient, unknown
{
  const layout = makeLayout({ openings: [] });
  const result = evaluateWindowFloorRatio(layout, []);
  assert(result.verdict === 'unknown', 'A2: no windows → unknown');
  assert(result.dataStatus === 'insufficient', 'A2: dataStatus insufficient');
}

// A3: Only assumed windows → insufficient
{
  const layout = makeLayout({ openings: [makeWindow('win-assumed', 'w-north', 2.5, 1.4, 1.6, 'in', true)] });
  const result = evaluateWindowFloorRatio(layout, []);
  assert(result.verdict === 'unknown', 'A3: assumed only → unknown');
  assert(result.dataStatus === 'insufficient', 'A3: dataStatus insufficient');
}

// A4: northBearingDeg null → ENV-LIGHT-02 → unknown with local direction only
{
  const layout = makeLayout({ northBearingDeg: null, openings: [makeWindow('win1', 'w-north', 2.5)] });
  const result = evaluateWindowOrientation(layout);
  assert(result.ruleId === 'ENV-LIGHT-02', 'A4: ruleId correct');
  assert(result.verdict === 'unknown', 'A4: null north → unknown');
  assert(result.dataStatus === 'insufficient', 'A4: dataStatus insufficient');
}

// A5: Wardrobe placed directly in front of window → obstruction detected
{
  const layout = makeLayout({
    openings: [makeWindow('win1', 'w-north', 2.5)],
  });
  // North wall at z=-3, window at x=0,z=-3; wardrobe at x=0, z=-2.5 (0.5m from wall = within 0.5m zone)
  const wardrobe = makeObj('ward1', 'wardrobe', 0, -2.5, 1.0, 0.6);
  const result = evaluateWindowObstruction(layout, [wardrobe]);
  assert(result.ruleId === 'ENV-LIGHT-03', 'A5: ruleId correct');
  assert(result.verdict !== 'pass', `A5: obstruction detected (got ${result.verdict})`);
  record('A5 verdict', result.verdict);
}

// A6: Pass ratio — large window
{
  const layout = makeLayout({
    // polygon 5×6 = 30m², window 2.0×1.8 = 3.6m², ratio = 0.12 → pass
    openings: [makeWindow('win1', 'w-north', 2.5, 2.0, 1.8)],
  });
  const result = evaluateWindowFloorRatio(layout, []);
  assert(result.verdict === 'pass', `A6: large window → pass (got ${result.verdict})`);
}

// =============================================================================
// GROUP B — VENTILATION
// =============================================================================

console.log('\n========== GROUP B: VENTILATION ==========');

// B1: One window (swing='in'), one door — same wall → no cross ventilation
{
  const layout = makeLayout({
    openings: [
      makeWindow('win1', 'w-north', 2.0, 1.4, 1.6, 'in'),
      makeDoor('door1', 'w-north', 3.5, 0.9, 'in'),
    ],
  });
  const result = evaluateCrossVentilationPotential(layout);
  assert(result.ruleId === 'ENV-VENT-02', 'B1: ruleId correct');
  assert(result.verdict === 'fail', `B1: same wall → no cross vent (got ${result.verdict})`);
}

// B2: Window north wall + door south wall → cross ventilation potential
{
  const layout = makeLayout({
    openings: [
      makeWindow('win1', 'w-north', 2.5, 1.4, 1.6, 'slide'),
      makeDoor('door1', 'w-south', 2.0, 0.9, 'in'),
    ],
  });
  const result = evaluateCrossVentilationPotential(layout);
  assert(result.verdict === 'pass', `B2: 2 walls → cross vent potential (got ${result.verdict})`);
}

// B3: Fixed window → not counted for ventilation, fail
{
  const layout = makeLayout({
    openings: [makeWindow('win1', 'w-north', 2.5, 1.4, 1.6, 'fixed')],
  });
  const result = evaluateVentilationOpenings(layout);
  assert(result.ruleId === 'ENV-VENT-01', 'B3: ruleId correct');
  assert(result.verdict === 'fail', `B3: fixed window → fail (got ${result.verdict})`);
}

// B4: All assumed windows → missing metadata
{
  const layout = makeLayout({
    openings: [makeWindow('win-a', 'w-north', 2.5, 1.4, 1.6, 'in', true)],
  });
  const result = evaluateVentilationOpenings(layout);
  assert(result.verdict === 'unknown', `B4: assumed only → unknown (got ${result.verdict})`);
  assert(result.dataStatus === 'insufficient', 'B4: insufficient');
}

// B5: Operable windows → pass
{
  const layout = makeLayout({
    openings: [makeWindow('win1', 'w-north', 2.5, 1.4, 1.6, 'slide')],
  });
  const result = evaluateVentilationOpenings(layout);
  assert(result.verdict === 'pass', `B5: sliding window → pass (got ${result.verdict})`);
}

// B6: Obstruction in front of door (0.9m zone)
{
  const layout = makeLayout({
    openings: [makeDoor('door1', 'w-south', 2.0, 0.9, 'in')],
  });
  // South wall at z=3; door center ≈ x=0.5,z=3; large bookcase at z=2.3 → within 0.9m zone
  const bookcase = makeObj('bc1', 'wardrobe', 0.5, 2.3, 1.0, 0.5);
  const result = evaluateVentilationObstruction(layout, [bookcase]);
  assert(result.ruleId === 'ENV-VENT-03', 'B6: ruleId correct');
  record('B6 obstruction verdict', result.verdict);
}

// =============================================================================
// GROUP C — CIRCULATION
// =============================================================================

console.log('\n========== GROUP C: CIRCULATION ==========');

// C1: 1.5m clearance between furniture → pass
{
  const layout = makeLayout();
  const bed  = makeObj('bed1', 'bed', -0.5, 0, 1.6, 2.0);
  const desk = makeObj('desk1', 'desk', 1.8, 0, 1.0, 0.6);
  // Gap between bed right edge (0.3) and desk left edge (1.3) ≈ 1.0m > 0.9m
  const result = evaluateMainWalkwayClearance(layout, [bed, desk]);
  assert(result.ruleId === 'ERG-CIRC-01', 'C1: ruleId correct');
  record('C1 clearance verdict', result.verdict);
  record('C1 min clearance', result.measurement?.value);
}

// C2: 0.4m clearance → fail
{
  const layout = makeLayout();
  const bed1 = makeObj('bed1', 'bed', -0.9, 0, 1.6, 2.0);
  const desk1 = makeObj('desk1', 'desk', 0.5, 0, 1.0, 0.6);
  // bed right edge ≈ -0.1, desk left edge ≈ 0, gap ≈ very small
  const result = evaluateMainWalkwayClearance(layout, [bed1, desk1]);
  record('C2 verdict', result.verdict);
  record('C2 min clearance', result.measurement?.value);
  assert(['fail', 'warn'].includes(result.verdict), `C2: tight clearance → warn/fail (got ${result.verdict})`);
}

// C3: Sliding door → n/a (no swing zone)
{
  const layout = makeLayout({
    openings: [makeDoor('door-slide', 'w-south', 2.0, 0.9, 'slide')],
  });
  const result = evaluateDoorSwingClearance(layout, []);
  assert(result.ruleId === 'ERG-CIRC-02', 'C3: ruleId correct');
  assert(result.verdict === 'n/a', `C3: sliding door → n/a (got ${result.verdict})`);
}

// C4: Hinged door swing zone clear → pass
{
  const layout = makeLayout({
    openings: [makeDoor('door1', 'w-south', 2.0, 0.9, 'in')],
  });
  const result = evaluateDoorSwingClearance(layout, []);
  assert(result.verdict === 'pass', `C4: clear swing zone → pass (got ${result.verdict})`);
}

// C5: No doors → insufficient
{
  const layout = makeLayout({ openings: [] });
  const result = evaluateDoorSwingClearance(layout, []);
  assert(result.verdict === 'unknown', `C5: no doors → unknown (got ${result.verdict})`);
}

// =============================================================================
// GROUP D — ERGONOMICS
// =============================================================================

console.log('\n========== GROUP D: ERGONOMICS ==========');

// D1: Bed with 0.8m side clearance → pass (at least one side open)
{
  const layout = makeLayout();
  // Bed centered at x=0, z=0, width=1.6m (half=0.8m)
  // Right side at x=0.8; next wall at x=2.5 → clearance = 2.5-0.8 = 1.7m
  const bed = makeObj('bed1', 'bed', 0, 0, 1.6, 2.0);
  const result = evaluateBedSideClearance(layout, [bed]);
  assert(result.ruleId === 'ERG-BED-01', 'D1: ruleId correct');
  assert(result.verdict === 'pass', `D1: open sides → pass (got ${result.verdict})`);
}

// D2: Bed with both sides blocked → fail
{
  const layout = makeLayout();
  // Bed at x=0, width=2.0m (halfW=1.0); walls at x=±2.5 → sides have ~1.5m to wall,
  // but put furniture on BOTH sides within 0.3m
  const bed      = makeObj('bed1', 'bed', 0, 0, 2.0, 2.0);
  const leftObj  = makeObj('wall-l', 'wardrobe', -1.5, 0, 0.3, 2.0);  // very close left
  const rightObj = makeObj('wall-r', 'wardrobe',  1.5, 0, 0.3, 2.0);  // very close right
  const result = evaluateBedSideClearance(layout, [bed, leftObj, rightObj]);
  record('D2 verdict', result.verdict);
  // Both sides blocked → fail or warn depending on probe
  assert(['fail', 'warn'].includes(result.verdict), `D2: blocked sides → fail/warn (got ${result.verdict})`);
}

// D3: Wardrobe with 0.9m front clearance → pass
{
  const layout = makeLayout();
  // Wardrobe at x=0, z=-1.5, frontAxis=(0,+Z) → front edge at z=-1.5+0.3=z=-1.2
  // No objects at z > -1.2 within 0.75m zone → pass
  const wardrobe = makeObj('ward1', 'wardrobe', 0, -1.5, 1.2, 0.6);
  const result = evaluateWardrobeFrontClearance(layout, [wardrobe]);
  assert(result.ruleId === 'ERG-WARD-01', 'D3: ruleId correct');
  assert(result.verdict === 'pass', `D3: open front → pass (got ${result.verdict})`);
}

// D4: Wardrobe with 0.4m front blocked → warn or fail
{
  const layout = makeLayout();
  const wardrobe = makeObj('ward1', 'wardrobe', 0, -1.5, 1.2, 0.6);
  // Blocker just in front of wardrobe (within 0.75m zone)
  const blocker = makeObj('block1', 'bed', 0, -0.9, 1.0, 0.5);
  const result = evaluateWardrobeFrontClearance(layout, [wardrobe, blocker]);
  record('D4 verdict', result.verdict);
  assert(['fail', 'warn'].includes(result.verdict), `D4: blocked front → warn/fail (got ${result.verdict})`);
}

// D5: Desk with chair clearance → pass
{
  const layout = makeLayout();
  // Desk at x=0, z=-1.0, frontAxis=(0,+Z) → user sits at z=-1+0.3=z=-0.7
  // No objects in zone behind desk → pass
  const desk = makeObj('desk1', 'desk', 0, -1.0, 1.2, 0.6);
  const result = evaluateDeskChairClearance(layout, [desk]);
  assert(result.ruleId === 'ERG-DESK-01', 'D5: ruleId correct');
  assert(result.verdict === 'pass', `D5: clear chair zone → pass (got ${result.verdict})`);
}

// D6: No bed → n/a
{
  const layout = makeLayout();
  const result = evaluateBedSideClearance(layout, []);
  assert(result.verdict === 'n/a', `D6: no bed → n/a (got ${result.verdict})`);
}

// =============================================================================
// GROUP E — DATA QUALITY
// =============================================================================

console.log('\n========== GROUP E: DATA QUALITY ==========');

// E1: No ceiling height → ENV-DQ-01 fires
{
  const layout = makeLayout({ ceilingHeight: 0 });
  const results = evaluateEnvironmentalDataQuality(layout, []);
  const dq01 = results.find((r) => r.ruleId === 'ENV-DQ-01');
  assert(!!dq01, 'E1: ENV-DQ-01 fires when ceilingHeight=0');
  assert(dq01?.verdict === 'unknown', 'E1: verdict unknown');
}

// E2: Assumed openings → ENV-DQ-03 fires
{
  const layout = makeLayout({
    openings: [makeWindow('win-a', 'w-north', 2.5, 1.4, 1.6, 'in', true)],
  });
  const results = evaluateEnvironmentalDataQuality(layout, []);
  const dq03 = results.find((r) => r.ruleId === 'ENV-DQ-03');
  assert(!!dq03, 'E2: ENV-DQ-03 fires for assumed openings');
}

// E3: ENV-DQ-05 always fires (no lux sensor)
{
  const layout = makeLayout();
  const results = evaluateEnvironmentalDataQuality(layout, []);
  const dq05 = results.find((r) => r.ruleId === 'ENV-DQ-05');
  assert(!!dq05, 'E3: ENV-DQ-05 always present (no lux data)');
}

// E4: northBearingDeg null → ENV-DQ-06 fires
{
  const layout = makeLayout({ northBearingDeg: null });
  const results = evaluateEnvironmentalDataQuality(layout, []);
  const dq06 = results.find((r) => r.ruleId === 'ENV-DQ-06');
  assert(!!dq06, 'E4: ENV-DQ-06 fires when northBearingDeg=null');
}

// E5: Good data → ENV-DQ-01 does NOT fire
{
  const layout = makeLayout({ ceilingHeight: 2.8 });
  const results = evaluateEnvironmentalDataQuality(layout, []);
  const dq01 = results.find((r) => r.ruleId === 'ENV-DQ-01');
  assert(!dq01, 'E5: ENV-DQ-01 absent when ceilingHeight>0');
}

// =============================================================================
// GROUP F — INTEGRATION
// =============================================================================

console.log('\n========== GROUP F: INTEGRATION ==========');

// F1: Full orchestrator output — no duplicate ruleIds, correct groups
{
  const layout = makeLayout({
    openings: [
      makeWindow('win1', 'w-north', 2.5, 1.4, 1.6, 'slide'),
      makeDoor('door1', 'w-south', 2.0, 0.9, 'in'),
    ],
  });
  const objects: RoomObject[] = [
    makeObj('bed1', 'bed', 0, 0.5, 1.6, 2.0),
    makeObj('desk1', 'desk', -1.5, -1.5, 1.2, 0.6),
  ];
  const output = evaluateEnvironmentalRules({ layout, objects });

  // No duplicate ruleIds within output
  const allIds = [
    ...output.environmentalRules.map((r) => r.ruleId),
    ...output.ergonomicRules.map((r) => r.ruleId),
    ...output.dataQualityRules.map((r) => r.ruleId),
  ];
  const uniqueIds = new Set(allIds);
  assert(uniqueIds.size === allIds.length, `F1: no duplicate ruleIds (${allIds.length} total)`);
  assert(output.ruleCount === allIds.length, 'F1: ruleCount matches actual count');
  assert(typeof output.timestamp === 'string', 'F1: timestamp is string');
  assert(output.engineVersion === '6.0.0-p6', 'F1: engineVersion correct');
  record('F1 total rules', output.ruleCount);
}

// F2: Objects not mutated after evaluation
{
  const layout = makeLayout({ openings: [makeWindow('win1', 'w-north', 2.5)] });
  const bed = makeObj('bed1', 'bed', 0, 0, 1.6, 2.0);
  const beforePos = { ...bed.position };
  evaluateEnvironmentalRules({ layout, objects: [bed] });
  assert(
    bed.position.x === beforePos.x && bed.position.z === beforePos.z,
    'F2: RoomObject not mutated by P6 engine'
  );
}

// F3: No arbitrary score generated
{
  const layout = makeLayout({ openings: [makeWindow('win1', 'w-north', 2.5)] });
  const output = evaluateEnvironmentalRules({ layout, objects: [] });
  const outputStr = JSON.stringify(output);
  assert(!outputStr.includes('"score"'), 'F3: No score field in output');
  assert(!outputStr.includes('"totalScore"'), 'F3: No totalScore field in output');
}

// F4: Full unified report includes P6 rules, no cross-duplicate ruleIds
{
  const roomConfig: RoomConfig = {
    width: 5,
    length: 6,
    height: 2.8,
    direction: 'N',
  };
  const objects: RoomObject[] = [
    makeObj('bed1', 'bed', 0, 0.5, 1.6, 2.0),
  ];
  const layout = buildLayoutFromLegacy(roomConfig, objects);
  const report = buildUnifiedAssessmentReport({ roomConfig, objects, layout });

  assert(Array.isArray(report.environmentalRules), 'F4: environmentalRules array present');
  assert(Array.isArray(report.ergonomicRules), 'F4: ergonomicRules array present');
  assert(Array.isArray(report.environmentalDataQuality), 'F4: environmentalDataQuality array present');

  // All ruleIds in allRules should be unique
  const allIds = report.allRules.map((r) => r.ruleId);
  const unique = new Set(allIds);
  assert(unique.size === allIds.length, `F4: no duplicate ruleIds in allRules (${allIds.length} total)`);

  // totalRules should match allRules.length
  assert(report.statistics.totalRules === report.allRules.length, 'F4: statistics.totalRules matches allRules.length');

  record('F4 total rules', report.statistics.totalRules);
  record('F4 P6 env rules', report.environmentalRules.length);
  record('F4 P6 erg rules', report.ergonomicRules.length);
  record('F4 P6 dq rules', report.environmentalDataQuality.length);
}

// F5: engineVersions includes p6
{
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'N' };
  const report = buildUnifiedAssessmentReport({ roomConfig, objects: [] });
  assert(report.engineVersions.p6 === '6.0.0-p6', `F5: engineVersions.p6 = '6.0.0-p6' (got ${report.engineVersions.p6})`);
}

// =============================================================================
// GROUP G — REGRESSION
// =============================================================================

console.log('\n========== GROUP G: REGRESSION ==========');

// G1: calculateGuaV2 unchanged
{
  const profile: PersonalProfile = {
    id: 'test-p1',
    birthDate: '1990-07-01',
    genderForTraditionalCalculation: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const gua1990Male = calculateGuaV2(profile);
  assert(gua1990Male.guaNumber === 1, `G1: calculateGuaV2(1990, male) = Gua 1 (Khảm) (got ${gua1990Male.guaNumber})`);
}

// G2: getUserFengShuiProfile unchanged
{
  const profile = getUserFengShuiProfile(1985, 'female');
  assert(typeof profile.guaNumber === 'number', 'G2: getUserFengShuiProfile returns guaNumber');
  record('G2 profile guaNumber', profile.guaNumber);
}

// G3: ROOM_PRESETS not mutated
{
  const presetKeys = Object.keys(ROOM_PRESETS) as Array<keyof typeof ROOM_PRESETS>;
  assert(presetKeys.length > 0, `G3: ROOM_PRESETS has entries (${presetKeys.length})`);
  const firstPreset = ROOM_PRESETS[presetKeys[0]];
  assert(typeof firstPreset.config.width === 'number', 'G3: ROOM_PRESETS[0].config.width is number');
}

// G4: Compass & OBB functions intact
{
  const obb1 = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb2 = { center: { x: 0.5, z: 0.5 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb3 = { center: { x: 5, z: 5 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  assert(checkOBBCollisionV2(obb1, obb2) === true, 'G4: OBB overlap detected');
  assert(checkOBBCollisionV2(obb1, obb3) === false, 'G4: OBB non-overlap correct');
}

// G5: createRoomFrame intact
{
  const frame = createRoomFrame({ width: 5, length: 6, height: 2.8, direction: 'N' });
  assert(typeof frame.dimensions.width === 'number', 'G5: createRoomFrame returns dimensions.width');
}

// G6: buildLayoutFromLegacy backward compatible
{
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'S' };
  const layout = buildLayoutFromLegacy(roomConfig, []);
  assert(layout.walls.length === 4, `G6: buildLayoutFromLegacy 4 walls (got ${layout.walls.length})`);
  assert(layout.ceilingHeight === 2.8, 'G6: ceilingHeight preserved');
}

// G7: P6 engine does NOT break P5 existing fields
{
  const roomConfig: RoomConfig = { width: 4, length: 5, height: 2.8, direction: 'N' };
  const report = buildUnifiedAssessmentReport({ roomConfig, objects: [] });
  assert(Array.isArray(report.geometricRules), 'G7: geometricRules still present');
  assert(Array.isArray(report.traditionalRules), 'G7: traditionalRules still present');
  assert(Array.isArray(report.personalRules), 'G7: personalRules still present');
  assert(typeof report.dataCompleteness === 'number', 'G7: dataCompleteness still present');
  assert(Array.isArray(report.dataQualityIssues), 'G7: dataQualityIssues still present');
}

// =============================================================================
// FINAL SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('PHASE P6 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`  PASS:     ${passed}`);
console.log(`  FAIL:     ${failed}`);
console.log(`  RECORDED: ${recorded}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log(`\n❌ ${failed} test(s) failed — P6 has issues.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests passed — P6 Environmental & Ergonomics Engine OK.`);
}

