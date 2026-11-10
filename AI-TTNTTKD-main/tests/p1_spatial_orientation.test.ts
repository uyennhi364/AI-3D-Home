// =============================================================================
// tests/p1_spatial_orientation.test.ts
// Comprehensive Test Suite for Phase P1: Spatial Coordinate & Orientation Engine
//
// Coverage:
// A. Compass Core (normalizeDeg, bearingOfVector, directionFromBearing, toTrueBearing, null safety)
// B. Three.js Rotation verification (rotateByYaw vs THREE.Vector3.applyAxisAngle)
// C. Bed Headboard V2 Direction (0° -> N, 90° -> W, 180° -> S, 270° -> E)
// D. OBB Corners V2 vs THREE.BoxGeometry + Matrix4 & SAT Collision at 0°, 30°, 45°, 60°, 90°
// E. Orientation Catalog verification for all 9 model types
// F. RoomFrame Local & True Bearing conversions
// G. Regression checks (legacy APIs, Presets, Optimizer, Pinned objects)
// =============================================================================

import * as THREE from 'three';
import {
  normalizeDeg,
  bearingOfVector,
  rotateByYaw,
  worldBearingOfAxis,
  toTrueBearing,
  directionFromBearing,
} from '../src/engine/core/compass.js';
import {
  ORIENTATION_CATALOG,
  getObjectOrientation,
} from '../src/engine/core/orientationCatalog.js';
import {
  createRoomFrame,
  localToTrueBearing,
  trueToLocalBearing,
} from '../src/engine/core/roomFrame.js';
import {
  getBedHeadboardDirection,
  getBedHeadboardDirectionV2,
  evaluateRoomFengShui,
} from '../src/engine/fengshuiRules.js';
import {
  createOBBFromObject,
  getOBBCorners,
  getOBBCornersV2,
  checkOBBCollision,
  checkOBBCollisionV2,
} from '../src/engine/geometryEngine.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { generateOptimizedLayout } from '../src/engine/layoutOptimizer.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';

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
    console.log(`[✓ PASS] ${id}: ${name}`);
  } else {
    console.log(`[✕ FAIL] ${id}: ${name} -- ${details}`);
  }
}

console.log('=============================================================================');
console.log('RUNNING PHASE P1 SPATIAL COORDINATE & ORIENTATION ENGINE TESTS');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// A. COMPASS CORE TESTS
// -----------------------------------------------------------------------------
console.log('--- A. Compass Core Math & Normalization ---');

// TC-CMP-01: normalizeDeg
{
  const ok1 = normalizeDeg(0) === 0;
  const ok2 = normalizeDeg(360) === 0;
  const ok3 = normalizeDeg(450) === 90;
  const ok4 = normalizeDeg(-90) === 270;
  const ok5 = normalizeDeg(-360) === 0;
  const ok6 = normalizeDeg(720.5) === 0.5;
  recordTest('TC-CMP-01', 'normalizeDeg bounds to [0, 360)', ok1 && ok2 && ok3 && ok4 && ok5 && ok6);
}

// TC-CMP-02: bearingOfVector
{
  const n = bearingOfVector({ x: 0, z: -1 });   // North
  const e = bearingOfVector({ x: 1, z: 0 });    // East
  const s = bearingOfVector({ x: 0, z: 1 });    // South
  const w = bearingOfVector({ x: -1, z: 0 });   // West
  const ne = bearingOfVector({ x: 1, z: -1 });  // NE (45°)
  const sw = bearingOfVector({ x: -1, z: 1 });  // SW (225°)

  const passed =
    Math.abs(n - 0) < 1e-6 &&
    Math.abs(e - 90) < 1e-6 &&
    Math.abs(s - 180) < 1e-6 &&
    Math.abs(w - 270) < 1e-6 &&
    Math.abs(ne - 45) < 1e-6 &&
    Math.abs(sw - 225) < 1e-6;

  recordTest('TC-CMP-02', 'bearingOfVector matches clockwise navigation bearings (N=0, E=90, S=180, W=270)', passed, `n=${n}, e=${e}, s=${s}, w=${w}`);
}

// TC-CMP-03: directionFromBearing (8 sectors)
{
  const dirs = [
    directionFromBearing(0) === 'N',
    directionFromBearing(15) === 'N',
    directionFromBearing(45) === 'NE',
    directionFromBearing(90) === 'E',
    directionFromBearing(135) === 'SE',
    directionFromBearing(180) === 'S',
    directionFromBearing(225) === 'SW',
    directionFromBearing(270) === 'W',
    directionFromBearing(315) === 'NW',
    directionFromBearing(350) === 'N',
  ];
  recordTest('TC-CMP-03', 'directionFromBearing maps all 8 sectors correctly', dirs.every(Boolean));
}

// TC-CMP-04: toTrueBearing & null safety
{
  const knownNorth = toTrueBearing(90, 45); // local East (90°) when room North is at 45° true azimuth -> 135°
  const nullNorth = toTrueBearing(90, null); // unknown North MUST return null!
  const undefinedNorth = toTrueBearing(90, undefined as any);

  const passed = knownNorth === 135 && nullNorth === null && undefinedNorth === null;
  recordTest('TC-CMP-04', 'toTrueBearing calculates true azimuth and strictly returns null if uncalibrated', passed, `known=${knownNorth}, null=${nullNorth}`);
}

// -----------------------------------------------------------------------------
// B. THREE.JS ROTATION ENGINE VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- B. Three.js Rotation Engine Rigor ---');

// TC-ROT-01: rotateByYaw vs THREE.Vector3.applyAxisAngle
{
  const testAnglesDeg = [0, 15, 30, 45, 60, 90, 120, 180, 225, 270, 330];
  const testVectors = [
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1.5, z: 2.2 },
    { x: 0.8, z: -1.6 },
  ];

  let maxDiff = 0;
  for (const deg of testAnglesDeg) {
    const rad = (deg * Math.PI) / 180;
    for (const v of testVectors) {
      const ours = rotateByYaw(v, rad);

      const threeV = new THREE.Vector3(v.x, 0, v.z);
      threeV.applyAxisAngle(new THREE.Vector3(0, 1, 0), rad);

      const diffX = Math.abs(ours.x - threeV.x);
      const diffZ = Math.abs(ours.z - threeV.z);
      maxDiff = Math.max(maxDiff, diffX, diffZ);
    }
  }

  const passed = maxDiff < 1e-12;
  recordTest('TC-ROT-01', 'rotateByYaw perfectly matches THREE.Vector3.applyAxisAngle across all angles', passed, `maxDiff=${maxDiff}`);
}

// -----------------------------------------------------------------------------
// C. BED HEADBOARD V2 ORIENTATION
// -----------------------------------------------------------------------------
console.log('\n--- C. Bed Headboard V2 Direction ---');

// TC-BED-01: Headboard V2 at 0°, 90°, 180°, 270°
{
  const h0 = getBedHeadboardDirectionV2(0);
  const h90 = getBedHeadboardDirectionV2(Math.PI / 2);
  const h180 = getBedHeadboardDirectionV2(Math.PI);
  const h270 = getBedHeadboardDirectionV2((3 * Math.PI) / 2);

  const passed = h0 === 'N' && h90 === 'W' && h180 === 'S' && h270 === 'E';
  recordTest('TC-BED-01', 'getBedHeadboardDirectionV2 correctly produces 0°->N, 90°->W, 180°->S, 270°->E', passed, `0°=${h0}, 90°=${h90}, 180°=${h180}, 270°=${h270}`);
}

// TC-BED-02: Legacy getBedHeadboardDirection preserves previous recorded behavior
{
  const leg0 = getBedHeadboardDirection(0);
  const leg90 = getBedHeadboardDirection(Math.PI / 2);
  const leg180 = getBedHeadboardDirection(Math.PI);
  const leg270 = getBedHeadboardDirection((3 * Math.PI) / 2);

  const passed = leg0 === 'N' && leg90 === 'E' && leg180 === 'S' && leg270 === 'W';
  recordTest('TC-BED-02', 'Legacy getBedHeadboardDirection preserves baseline behavior without breaking older callers', passed, `0°=${leg0}, 90°=${leg90}, 180°=${leg180}, 270°=${leg270}`);
}

// -----------------------------------------------------------------------------
// D. OBB CORNERS V2 & SAT COLLISION
// -----------------------------------------------------------------------------
console.log('\n--- D. OBB Corners V2 & SAT Collision ---');

// TC-OBB-01: Compare getOBBCornersV2 against THREE.BoxGeometry + Matrix4
{
  const testAngles = [0, 30, 45, 60, 90, 180, 270].map((d) => (d * Math.PI) / 180);
  const obb = {
    center: { x: 1.5, z: -0.8 },
    halfWidth: 0.8,
    halfLength: 1.0,
    angleRad: 0,
  };

  let maxDiff = 0;
  for (const rad of testAngles) {
    obb.angleRad = rad;
    const cornersV2 = getOBBCornersV2(obb);

    // Build Three.js transformation matrix
    const matrix = new THREE.Matrix4();
    matrix.makeRotationY(rad);
    matrix.setPosition(obb.center.x, 0, obb.center.z);

    const localPoints = [
      new THREE.Vector3(-obb.halfWidth, 0, -obb.halfLength),
      new THREE.Vector3(obb.halfWidth, 0, -obb.halfLength),
      new THREE.Vector3(obb.halfWidth, 0, obb.halfLength),
      new THREE.Vector3(-obb.halfWidth, 0, obb.halfLength),
    ];

    for (let i = 0; i < 4; i++) {
      const threePoint = localPoints[i].applyMatrix4(matrix);
      const diffX = Math.abs(cornersV2[i].x - threePoint.x);
      const diffZ = Math.abs(cornersV2[i].z - threePoint.z);
      maxDiff = Math.max(maxDiff, diffX, diffZ);
    }
  }

  const passed = maxDiff < 1e-12;
  recordTest('TC-OBB-01', 'getOBBCornersV2 matches THREE.BoxGeometry + Matrix4 transformation within epsilon < 1e-12', passed, `maxDiff=${maxDiff}`);
}

// TC-OBB-02: SAT Collision V2 at 0°, 30°, 45°, 60°, 90°
{
  const angles = [0, 30, 45, 60, 90].map((d) => (d * Math.PI) / 180);
  let allCorrect = true;

  for (const rad of angles) {
    // Two overlapping boxes at the origin
    const boxA = { center: { x: 0, z: 0 }, halfWidth: 0.8, halfLength: 0.8, angleRad: rad };
    const boxOverlap = { center: { x: 0.5, z: 0.5 }, halfWidth: 0.8, halfLength: 0.8, angleRad: 0 };
    const boxSeparated = { center: { x: 5.0, z: 5.0 }, halfWidth: 0.8, halfLength: 0.8, angleRad: rad };

    const collides = checkOBBCollisionV2(boxA, boxOverlap);
    const separated = !checkOBBCollisionV2(boxA, boxSeparated);

    if (!collides || !separated) {
      allCorrect = false;
      break;
    }
  }

  recordTest('TC-OBB-02', 'checkOBBCollisionV2 SAT correctly detects overlaps & separations at 0°, 30°, 45°, 60°, 90°', allCorrect);
}

// -----------------------------------------------------------------------------
// E. ORIENTATION CATALOG VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- E. Orientation Catalog Verification ---');

// TC-CAT-01: Orientation Catalog completeness
{
  const requiredTypes = ['bed', 'desk', 'chair', 'mirror', 'wardrobe', 'nightstand', 'bookshelf', 'door', 'window'];
  const allPresent = requiredTypes.every((t) => {
    const def = getObjectOrientation(t);
    return def !== null && def.frontAxis !== undefined && (def.basis === 'model_code' || def.basis === 'assumed');
  });

  const bedDef = getObjectOrientation('bed')!;
  const deskDef = getObjectOrientation('desk')!;
  const chairDef = getObjectOrientation('chair')!;
  const mirrorDef = getObjectOrientation('mirror')!;

  const axesValid =
    bedDef.headAxis?.z === -1 &&
    deskDef.userFacingAxis?.z === -1 &&
    chairDef.userFacingAxis?.z === 1 &&
    mirrorDef.frontAxis.z === 1;

  recordTest('TC-CAT-01', 'Orientation Catalog defines all 9 required types with verified procedural axes', allPresent && axesValid);
}

// -----------------------------------------------------------------------------
// F. ROOM FRAME SPECIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- F. Room Frame Architecture ---');

// TC-FRAME-01: RoomFrame conversions & disambiguation
{
  const roomConfig = { width: 5.0, length: 5.2, height: 2.8, direction: 'W' as const };
  const frameUncalibrated = createRoomFrame(roomConfig, null);
  const frameCalibrated = createRoomFrame(roomConfig, 90); // Room local North points to true East (90°)

  const uncalTrue = localToTrueBearing(0, frameUncalibrated); // MUST be null
  const calTrue = localToTrueBearing(0, frameCalibrated);      // 0 + 90 = 90°
  const calLocal = trueToLocalBearing(180, frameCalibrated);   // 180 - 90 = 90°

  const passed = uncalTrue === null && calTrue === 90 && calLocal === 90;
  recordTest('TC-FRAME-01', 'RoomFrame enforces null safety on uncalibrated north and accurately transforms local <-> true bearings', passed);
}

// -----------------------------------------------------------------------------
// G. REGRESSION TESTS (P0 & PREVIOUS FUNCTIONALITY PRESERVED)
// -----------------------------------------------------------------------------
console.log('\n--- G. Regression Tests ---');

// TC-REG-01: Master Preset Evaluation Preserved
{
  const profile = getUserFengShuiProfile(1985, 'male');
  const masterPreset = ROOM_PRESETS.master;
  const evalResult = evaluateRoomFengShui(profile, masterPreset.config, masterPreset.objects);

  const passed = evalResult.overallScore === 51 && evalResult.keyIssues.length === 3;
  recordTest('TC-REG-01', 'Legacy Preset evaluation preserved exactly (Master Score: 51/100, 3 issues)', passed, `score=${evalResult.overallScore}`);
}

// TC-REG-02: Layout Optimizer runs and obeys pinned objects
{
  const profile = getUserFengShuiProfile(1985, 'male');
  const masterPreset = ROOM_PRESETS.master;
  const initialEval = evaluateRoomFengShui(profile, masterPreset.config, masterPreset.objects);

  // Lock wardrobe_north
  const optResult = generateOptimizedLayout(
    profile,
    masterPreset.config,
    masterPreset.objects,
    initialEval,
    'feng_shui_priority',
    ['wardrobe_north']
  );

  const wardrobeBefore = masterPreset.objects.find((o) => o.id === 'wardrobe_north');
  const wardrobeAfter = optResult.optimizedObjects.find((o) => o.id === 'wardrobe_north');

  const wardrobeMoved =
    !wardrobeBefore ||
    !wardrobeAfter ||
    Math.abs(wardrobeBefore.position.x - wardrobeAfter.position.x) > 0.001 ||
    Math.abs(wardrobeBefore.position.z - wardrobeAfter.position.z) > 0.001;

  const scoreImproved = optResult.proposal.afterScore > optResult.proposal.beforeScore;

  const passed = !wardrobeMoved && scoreImproved;
  recordTest('TC-REG-02', 'Layout Optimizer respects pinned objects without regression', passed, `wardrobeMoved=${wardrobeMoved}, improvement=${optResult.proposal.beforeScore}->${optResult.proposal.afterScore}`);
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
const total = testResults.length;
const passedCount = testResults.filter((r) => r.passed).length;
const failedCount = total - passedCount;

console.log('\n=============================================================================');
console.log(`TOTAL PHASE P1 TESTS: ${total}`);
console.log(`PASSED:               ${passedCount}`);
console.log(`FAILED:               ${failedCount}`);
console.log('=============================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
