// =============================================================================
// tests/p3_furniture_rules.test.ts
// Comprehensive Test Suite for Phase P3: Furniture Feng Shui Rule Engine
//
// Coverage:
// A. RuleResult Schema & Data Status
// B. Bed Rules (Headboard backing, Door collision & axis conflict, Window, WC)
// C. Desk Rules (User facing orientation, Desk-door, Desk-wall backing)
// D. Mirror Rules (Mirror facing bed, Mirror with obstacle, Mirror orientation)
// E. Regression (calculateGua, Bát Trạch, P1/P2 APIs, ROOM_PRESETS mutation, Intent Guard)
// =============================================================================

import {
  evaluateBedHeadboardWall,
  evaluateBedDoorConflict,
  evaluateBedWindowRelationship,
  evaluateBedToiletRelationship,
  evaluateDeskOrientation,
  evaluateDeskWallBacking,
  evaluateDeskDoorRelationship,
  evaluateMirrorBedRelationship,
  evaluateMirrorOrientation,
  evaluateFurnitureRules,
  P3_ENGINE_VERSION,
  BedRuleInputs,
  DeskRuleInputs,
  MirrorRuleInputs,
} from '../src/engine/core/furnitureRuleEngine.js';

import { RoomLayout, buildLayoutFromLegacy } from '../src/engine/core/roomLayout.js';
import { RoomObject } from '../src/types/fengshui.js';
import { calculateGua, getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { normalizeDeg, bearingOfVector } from '../src/engine/core/compass.js';
import { getOBBCornersV2, checkOBBCollisionV2 } from '../src/engine/geometryEngine.js';
import { evaluateIntentSafety } from '../src/services/intentGuard.js';

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

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

// =============================================================================
// Helper: Mock RoomLayout (5m x 6m room)
// =============================================================================
function createMockLayout(hasDoor = true, hasWindow = true, assumed = false): RoomLayout {
  const halfW = 2.5; // X: -2.5 to 2.5
  const halfL = 3.0; // Z: -3.0 to 3.0
  const ceilingH = 2.8;

  const layout: RoomLayout = {
    id: 'test_layout_5x6',
    polygon: [
      { x: -halfW, z: -halfL }, // NW
      { x: halfW, z: -halfL },  // NE
      { x: halfW, z: halfL },   // SE
      { x: -halfW, z: halfL },  // SW
    ],
    northBearingDeg: null,
    ceilingHeight: ceilingH,
    walls: [
      {
        id: 'wall_north',
        startPoint: { x: -halfW, z: -halfL },
        endPoint: { x: halfW, z: -halfL },
        height: ceilingH,
        thickness: 0.15,
        wallType: 'solid',
      },
      {
        id: 'wall_east',
        startPoint: { x: halfW, z: -halfL },
        endPoint: { x: halfW, z: halfL },
        height: ceilingH,
        thickness: 0.15,
        wallType: 'solid',
      },
      {
        id: 'wall_south',
        startPoint: { x: halfW, z: halfL },
        endPoint: { x: -halfW, z: halfL },
        height: 0.85,
        thickness: 0.15,
        wallType: 'low_cutaway',
      },
      {
        id: 'wall_west',
        startPoint: { x: -halfW, z: halfL },
        endPoint: { x: -halfW, z: -halfL },
        height: ceilingH,
        thickness: 0.15,
        wallType: 'solid',
      },
    ],
    openings: [],
    beams: [],
  };

  if (hasDoor) {
    layout.openings.push({
      id: 'door_main',
      wallId: 'wall_east',
      kind: 'door',
      offset: 1.5, // 1.5m from start of wall_east (at z = -1.5)
      width: 0.9,
      height: 2.1,
      sillHeight: 0,
      swing: 'in',
      assumed,
    });
  }

  if (hasWindow) {
    layout.openings.push({
      id: 'window_main',
      wallId: 'wall_west',
      kind: 'window',
      offset: 3.0, // 3m from start of wall_west (mid wall)
      width: 1.4,
      height: 1.6,
      sillHeight: 0.8,
      swing: 'slide',
      assumed,
    });
  }

  return layout;
}

// =============================================================================
// GROUP A: RuleResult Schema & Data Status
// =============================================================================
console.log('\n>>> GROUP A: RuleResult Schema & Data Status <<<');

// A1: Check RuleResult required fields
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: -1.9 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedHeadboardWall({ bed, layout, allObjects: [bed] });
  const hasFields =
    typeof res.ruleId === 'string' &&
    typeof res.name === 'string' &&
    typeof res.category === 'string' &&
    typeof res.school === 'string' &&
    typeof res.applicability === 'string' &&
    typeof res.dataStatus === 'string' &&
    typeof res.verdict === 'string' &&
    typeof res.severity === 'string' &&
    typeof res.explanation === 'string' &&
    Array.isArray(res.sources) &&
    res.engineVersion === P3_ENGINE_VERSION;

  recordTest('A1', 'RuleResult contains all standardized fields & correct engineVersion', hasFields);
}

// A2: Missing data returns dataStatus: 'insufficient' and verdict: 'unknown'
{
  const layout = createMockLayout(false, false); // No doors, no windows
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedDoorConflict({ bed, layout, allObjects: [bed] });
  recordTest(
    'A2',
    'Missing door data returns dataStatus: insufficient and verdict: unknown',
    res.dataStatus === 'insufficient' && res.verdict === 'unknown' && Array.isArray(res.missingInputs) && res.missingInputs.length > 0,
    `dataStatus=${res.dataStatus}, verdict=${res.verdict}`
  );
}

// A3: Assumed opening propagates assumed note in explanation / dataStatus
{
  const layout = createMockLayout(true, true, true); // assumed = true
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedDoorConflict({ bed, layout, allObjects: [bed] });
  const notesAssumed = res.explanation.includes('assumed: true') || res.dataStatus === 'insufficient';
  recordTest('A3', 'Inferred/assumed opening records assumption notice in explanation or dataStatus', notesAssumed);
}

// =============================================================================
// GROUP B: Bed Rules
// =============================================================================
console.log('\n>>> GROUP B: Bed Rules <<<');

// B1: Headboard backed by solid wall (North wall at z = -3.0, bed at z = -1.9, length=2.0 -> headboard at z = -2.9 -> gap = 0.1m)
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_backed',
    type: 'bed',
    name: 'Giường có tựa',
    position: { x: 0, y: 0, z: -1.9 },
    rotation: { x: 0, y: 0, z: 0 }, // rot=0 -> headboard points North (z = -1)
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedHeadboardWall({ bed, layout, allObjects: [bed] });
  recordTest(
    'B1',
    'Bed headboard backed by solid North wall within 0.15m passes',
    res.verdict === 'pass' && res.measurement?.passed === true,
    `verdict=${res.verdict}, dist=${res.measurement?.value}m`
  );
}

// B2: Headboard floating in the center of the room (z = 0.0, far from North wall)
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_floating',
    type: 'bed',
    name: 'Giường giữa phòng',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedHeadboardWall({ bed, layout, allObjects: [bed] });
  recordTest(
    'B2',
    'Bed headboard floating with no wall behind fails',
    res.verdict === 'fail' && res.severity === 'major',
    `verdict=${res.verdict}, severity=${res.severity}`
  );
}

// B3: Bed directly blocking door clearance corridor
{
  const layout = createMockLayout(true, false);
  // Door on east wall (x = +2.5) at offset 1.5 (z = -1.5). Clearance corridor extends west into the room.
  // Place bed right at x = 2.0, z = -1.5
  const bed: RoomObject = {
    id: 'bed_blocking_door',
    type: 'bed',
    name: 'Giường chắn cửa',
    position: { x: 1.8, y: 0, z: -1.5 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedDoorConflict({ bed, layout, allObjects: [bed] });
  recordTest(
    'B3',
    'Bed intersecting door clearance corridor returns verdict: fail, severity: critical',
    res.verdict === 'fail' && res.severity === 'critical',
    `verdict=${res.verdict}, severity=${res.severity}`
  );
}

// B4: Bed clear of door corridor and not on direct door axis
{
  const layout = createMockLayout(true, false);
  // Door is on East wall at z = -1.5. Place bed in NW corner at x = -1.2, z = -1.9
  const bed: RoomObject = {
    id: 'bed_clear',
    type: 'bed',
    name: 'Giường góc Tây Bắc',
    position: { x: -1.2, y: 0, z: -1.9 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedDoorConflict({ bed, layout, allObjects: [bed] });
  recordTest(
    'B4',
    'Bed placed far from door with no corridor obstruction passes',
    res.verdict === 'pass',
    `verdict=${res.verdict}, explanation=${res.explanation}`
  );
}

// B5: Bed headboard directly over window
{
  const layout = createMockLayout(false, true);
  // Window on West wall (x = -2.5) at offset 3.0 (z = 0.0)
  // Bed oriented so headboard points West: rotation.y = Math.PI / 2 (90 deg -> headboard points West)
  // Center at x = -1.4, z = 0.0 -> headboard at x = -2.4 (touching window on west wall)
  const bed: RoomObject = {
    id: 'bed_under_window',
    type: 'bed',
    name: 'Giường tựa cửa sổ',
    position: { x: -1.4, y: 0, z: 0.0 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedWindowRelationship({ bed, layout, allObjects: [bed] });
  recordTest(
    'B5',
    'Bed headboard situated directly over window fails',
    res.verdict === 'fail' && res.measurement?.passed === false,
    `verdict=${res.verdict}, metric=${res.measurement?.value}`
  );
}

// B6: Bed toilet evaluation - no toilet in scene
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateBedToiletRelationship({ bed, layout, allObjects: [bed] });
  recordTest(
    'B6',
    'No toilet in scene returns dataStatus: insufficient, verdict: unknown',
    res.dataStatus === 'insufficient' && res.verdict === 'unknown',
    `dataStatus=${res.dataStatus}`
  );
}

// B7: Bed toilet evaluation - toilet explicitly present in scene
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };
  const wc: RoomObject = {
    id: 'wc_1',
    type: 'wc',
    name: 'Bồn cầu / Toilet',
    position: { x: 0, y: 0, z: 1.0 }, // 1.0m away (< 1.5m threshold)
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 0.6, length: 0.8, height: 0.8 },
  };

  const res = evaluateBedToiletRelationship({ bed, layout, allObjects: [bed, wc] });
  recordTest(
    'B7',
    'Toilet within 1.5m produces warning with sufficient data status',
    res.dataStatus === 'sufficient' && res.verdict === 'warn',
    `verdict=${res.verdict}, dist=${res.measurement?.value}m`
  );
}

// =============================================================================
// GROUP C: Desk Rules
// =============================================================================
console.log('\n>>> GROUP C: Desk Rules <<<');

// C1: Desk user-facing orientation calculation (rot=0 -> faces North = -Z)
{
  const layout = createMockLayout();
  const desk: RoomObject = {
    id: 'desk_1',
    type: 'desk',
    name: 'Bàn làm việc',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }, // rot=0: userFacingAxis = (0, -1) = North
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const res = evaluateDeskOrientation({ desk, layout, allObjects: [desk] });
  recordTest(
    'C1',
    'Desk with rot=0 accurately calculates seated person facing North (0°)',
    res.verdict === 'pass' && approx(res.measurement?.value as number, 0, 1.0),
    `bearing=${res.measurement?.value}°`
  );
}

// C2: Desk with person facing South (rot = Math.PI)
{
  const layout = createMockLayout();
  const desk: RoomObject = {
    id: 'desk_south',
    type: 'desk',
    name: 'Bàn làm việc',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: Math.PI, z: 0 }, // rot=PI: userFacingAxis = (0, 1) = South (180°)
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const res = evaluateDeskOrientation({ desk, layout, allObjects: [desk] });
  recordTest(
    'C2',
    'Desk with rot=PI calculates seated person facing South (180°)',
    res.verdict === 'pass' && approx(res.measurement?.value as number, 180, 1.0),
    `bearing=${res.measurement?.value}°`
  );
}

// C3: Desk with back to solid wall
{
  const layout = createMockLayout();
  // Seated user faces North (z = -1), so user back is toward South (+Z)
  // Place desk near south wall (z = 2.0, south cutaway is at 3.0, but let's test backing against North wall with rot=PI)
  // If desk rot = Math.PI, user faces South (+Z), so user's back faces North (-Z) where wall_north is at z = -3.0!
  // Desk at z = -2.2 -> chair offset 0.5m South puts user back at z = -2.7 -> 0.3m from wall_north
  const desk: RoomObject = {
    id: 'desk_backed',
    type: 'desk',
    name: 'Bàn tựa tường',
    position: { x: 0, y: 0, z: -2.2 },
    rotation: { x: 0, y: Math.PI, z: 0 },
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const res = evaluateDeskWallBacking({ desk, layout, allObjects: [desk] });
  recordTest(
    'C3',
    'Desk with solid wall behind seated user passes backing check',
    res.verdict === 'pass' && res.measurement?.passed === true,
    `verdict=${res.verdict}, dist=${res.measurement?.value}m`
  );
}

// C4: Desk with door in front vs door in back
{
  const layout = createMockLayout(true, false);
  // Door is on East wall (+X) at z = -1.5
  // userFacingAxis is (0, -1) in local space.
  // Rotated by -PI/2 (-90°): local (0, -1) -> world (+1, 0) = East (facing door!)
  const deskFacingDoor: RoomObject = {
    id: 'desk_facing_door',
    type: 'desk',
    name: 'Bàn nhìn ra cửa',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const resFacing = evaluateDeskDoorRelationship({ desk: deskFacingDoor, layout, allObjects: [deskFacingDoor] });
  recordTest(
    'C4',
    'Desk user facing door passes line of sight check',
    resFacing.verdict === 'pass' && (resFacing.measurement?.value as number) <= 60,
    `verdict=${resFacing.verdict}, angleDiff=${resFacing.measurement?.value}°`
  );

  // If user sits with back to the door (rot = +Math.PI / 2 -> faces West (-1, 0), back to East door)
  const deskBackToDoor: RoomObject = {
    id: 'desk_back_to_door',
    type: 'desk',
    name: 'Bàn quay lưng ra cửa',
    position: { x: 0, y: 0, z: -1.5 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { width: 1.4, length: 0.7, height: 0.75 },
  };

  const resBack = evaluateDeskDoorRelationship({ desk: deskBackToDoor, layout, allObjects: [deskBackToDoor] });
  recordTest(
    'C4b',
    'Desk user with back directly to door returns warn',
    resBack.verdict === 'warn' && (resBack.measurement?.value as number) > 120,
    `verdict=${resBack.verdict}, angleDiff=${resBack.measurement?.value}°`
  );
}

// =============================================================================
// GROUP D: Mirror Rules
// =============================================================================
console.log('\n>>> GROUP D: Mirror Rules <<<');

// D1: Mirror directly facing bed (reflecting glass faces +Z in local frame)
// Mirror at (0, -2.5) with rot = 0 (faces +Z = South). Bed at (0, 0) South of mirror!
{
  const layout = createMockLayout();
  const mirror: RoomObject = {
    id: 'mirror_1',
    type: 'mirror',
    name: 'Gương soi',
    position: { x: 0, y: 0, z: -2.5 },
    rotation: { x: 0, y: 0, z: 0 }, // Reflective face points South (+Z)
    dimensions: { width: 0.6, length: 0.1, height: 1.6 },
  };
  const bed: RoomObject = {
    id: 'bed_target',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: 0.0 }, // directly in front of mirror
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateMirrorBedRelationship({ mirror, layout, allObjects: [mirror, bed] });
  recordTest(
    'D1',
    'Mirror directly facing bed with no obstacle returns verdict: fail (Quang Sát)',
    res.verdict === 'fail' && res.severity === 'major',
    `verdict=${res.verdict}, angle=${res.measurement?.value}°`
  );
}

// D2: Mirror facing away from bed (rot = Math.PI -> reflective face points North, away from bed)
{
  const layout = createMockLayout();
  const mirror: RoomObject = {
    id: 'mirror_away',
    type: 'mirror',
    name: 'Gương quay đi',
    position: { x: 0, y: 0, z: -2.5 },
    rotation: { x: 0, y: Math.PI, z: 0 }, // Reflective face points North (-Z)
    dimensions: { width: 0.6, length: 0.1, height: 1.6 },
  };
  const bed: RoomObject = {
    id: 'bed_target',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: 0.0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateMirrorBedRelationship({ mirror, layout, allObjects: [mirror, bed] });
  recordTest(
    'D2',
    'Mirror oriented away from bed passes',
    res.verdict === 'pass' && res.measurement?.passed === true,
    `verdict=${res.verdict}, angle=${res.measurement?.value}°`
  );
}

// D3: Mirror facing bed but blocked by wardrobe obstacle
{
  const layout = createMockLayout();
  const mirror: RoomObject = {
    id: 'mirror_blocked',
    type: 'mirror',
    name: 'Gương',
    position: { x: 0, y: 0, z: -2.5 },
    rotation: { x: 0, y: 0, z: 0 }, // Faces South
    dimensions: { width: 0.6, length: 0.1, height: 1.6 },
  };
  const wardrobe: RoomObject = {
    id: 'wardrobe_shield',
    type: 'wardrobe',
    name: 'Tủ ngăn cách',
    position: { x: 0, y: 0, z: -1.2 }, // between mirror at -2.5 and bed at 0
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.6, length: 0.6, height: 2.2 },
  };
  const bed: RoomObject = {
    id: 'bed_target',
    type: 'bed',
    name: 'Giường ngủ',
    position: { x: 0, y: 0, z: 0.0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };

  const res = evaluateMirrorBedRelationship({ mirror, layout, allObjects: [mirror, wardrobe, bed] });
  recordTest(
    'D3',
    'Mirror facing bed with solid wardrobe between returns verdict: warn',
    res.verdict === 'warn' && res.inputs?.hasObstacle === true,
    `verdict=${res.verdict}, hasObstacle=${res.inputs?.hasObstacle}`
  );
}

// D4: Mirror orientation measurement calculates correct world bearing
{
  const layout = createMockLayout();
  const mirror: RoomObject = {
    id: 'mirror_east',
    type: 'mirror',
    name: 'Gương hướng Đông',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }, // local +Z rotated +90 deg -> world +X (East = 90°)
    dimensions: { width: 0.6, length: 0.1, height: 1.6 },
  };

  const res = evaluateMirrorOrientation({ mirror, layout, allObjects: [mirror] });
  recordTest(
    'D4',
    'Mirror orientation calculation returns East (90°)',
    res.verdict === 'pass' && approx(res.measurement?.value as number, 90, 1.0),
    `bearing=${res.measurement?.value}°`
  );
}

// D5: evaluateFurnitureRules main orchestrator separates traditional vs geometric
{
  const layout = createMockLayout();
  const bed: RoomObject = {
    id: 'bed_1',
    type: 'bed',
    name: 'Giường',
    position: { x: 0, y: 0, z: -1.9 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.8, length: 2.0, height: 1.0 },
  };
  const desk: RoomObject = {
    id: 'desk_1',
    type: 'desk',
    name: 'Bàn',
    position: { x: -1.5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.2, length: 0.6, height: 0.75 },
  };
  const mirror: RoomObject = {
    id: 'mirror_1',
    type: 'mirror',
    name: 'Gương',
    position: { x: 1.5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 0.6, length: 0.1, height: 1.6 },
  };

  const output = evaluateFurnitureRules({ layout, objects: [bed, desk, mirror] });
  const hasSeparation =
    output.traditionalRules.length > 0 &&
    output.geometricRules.length > 0 &&
    output.evaluatedObjectCount === 3 &&
    output.ruleCount === output.traditionalRules.length + output.geometricRules.length;

  recordTest(
    'D5',
    'evaluateFurnitureRules orchestrates all items and separates traditional vs geometric rules',
    hasSeparation,
    `traditional=${output.traditionalRules.length}, geometric=${output.geometricRules.length}`
  );
}

// =============================================================================
// GROUP E: Regression Tests
// =============================================================================
console.log('\n>>> GROUP E: Regression Tests <<<');

// E1: calculateGua formula preserved
{
  const guaMale1990 = calculateGua(1990, 'male');
  const guaFemale1990 = calculateGua(1990, 'female');
  recordTest('E1', 'calculateGua unchanged (1990: Male=1 Khảm, Female=8 Cấn)', guaMale1990 === 1 && guaFemale1990 === 8, `male=${guaMale1990}, female=${guaFemale1990}`);
}

// E2: Bát Trạch table preserved via getUserFengShuiProfile
{
  const profile = getUserFengShuiProfile(1990, 'male');
  const isKhamCorrect =
    profile.directionDetails['SE'].type === 'SINH_KHI' &&
    profile.directionDetails['E'].type === 'THIEN_Y' &&
    profile.directionDetails['S'].type === 'DIEN_NIEN' &&
    profile.directionDetails['N'].type === 'PHUC_VI';
  recordTest('E2', 'Bát Trạch directions unchanged (Gua 1 Khảm auspicious sectors intact)', isKhamCorrect);
}

// E3: ROOM_PRESETS are not mutated by P3 rules evaluation
{
  const masterPreset = ROOM_PRESETS['master'];
  const originalWidth = masterPreset.config.width;
  const originalObjCount = masterPreset.objects.length;

  const layout = buildLayoutFromLegacy(masterPreset.config, masterPreset.objects);
  evaluateFurnitureRules({ layout, objects: masterPreset.objects });

  recordTest(
    'E3',
    'ROOM_PRESETS.master config and objects remain unmutated',
    masterPreset.config.width === originalWidth && masterPreset.objects.length === originalObjCount
  );
}

// E4: P1 Compass and Bearing functions preserved
{
  const n = normalizeDeg(450);
  const b = bearingOfVector({ x: 0, z: -1 });
  recordTest('E4', 'P1 compass functions intact (normalizeDeg(450)=90, bearingOfVector(0,-1)=0)', n === 90 && b === 0);
}

// E5: P1 OBB V2 SAT collision functions preserved
{
  const obb1 = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb2 = { center: { x: 0.5, z: 0.5 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const obb3 = { center: { x: 5, z: 5 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  recordTest('E5', 'P1 OBB V2 SAT collision intact', checkOBBCollisionV2(obb1, obb2) && !checkOBBCollisionV2(obb1, obb3));
}

// E6: Phase H Intent Guard remains intact
{
  const safetyRes = evaluateIntentSafety('Hãy xoay giường 90 độ', true);
  recordTest('E6', 'Intent Guard evaluateIntentSafety operates without regression', safetyRes.isSafeToExecute === true);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(72));
console.log('PHASE P3 TEST SUITE — FINAL RESULTS');
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
  console.log('\n✅ All P3 tests passed.');
}
