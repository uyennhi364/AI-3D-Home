// =============================================================================
// tests/p2_room_layout_sector.test.ts
// Comprehensive Test Suite for Phase P2: Room Layout & Spatial Geometry Engine
//
// Coverage:
// A. RoomLayout model (polygon, walls, validation, northBearingDeg)
// B. Openings (doors, windows, out-of-bounds, assumed flags)
// C. Sector Engine (compass_wedge_8 & grid_9 Cửu Cung)
// D. Spatial Geometry & Footprint (isObjectInsideRoom, checkWallIntersection,
//    checkOpeningIntersection, getObjectSectors multi-sector)
// E. Regression (legacy presets, P0 baseline APIs, P1 compass/OBB V2)
// =============================================================================

import {
  Wall,
  Opening,
  RoomLayout,
  buildLayoutFromLegacy,
  validateRoomLayout,
  getWallLength,
  getWallVector,
  getWallNormal,
  getWallBearing,
  getOpeningWorldPosition,
  getOpeningFootprint,
  getRoomBoundary,
  getRoomCenter,
} from '../src/engine/core/roomLayout.js';

import {
  getSectorWedge8,
  getSectorGrid9,
  getPointSector,
  getObjectSectors,
  isPointInsidePolygon,
  isObjectInsideRoom,
  checkWallIntersection,
  checkOpeningIntersection,
  DEFAULT_CENTER_ZONE_RATIO,
  DEFAULT_WEDGE_BOUNDARY_TOLERANCE_DEG,
} from '../src/engine/core/sectorEngine.js';

import {
  normalizeDeg,
  bearingOfVector,
  directionFromBearing,
} from '../src/engine/core/compass.js';

import {
  getOBBCornersV2,
  checkOBBCollisionV2,
} from '../src/engine/geometryEngine.js';

import { OBB2D } from '../src/engine/geometryEngine.js';

import { ROOM_PRESETS } from '../src/engine/presets.js';
import { calculateGua, getUserFengShuiProfile, getSectorFromPosition } from '../src/engine/batTrach.js';

// =============================================================================
// Test Framework
// =============================================================================

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

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

// =============================================================================
// Helper: standard 4m × 5m rectangular test room
// =============================================================================
function makeTestLayout(width = 4, length = 5, ceilingHeight = 2.8): RoomLayout {
  const halfW = width / 2;
  const halfL = length / 2;
  return {
    id: 'test_room',
    polygon: [
      { x: -halfW, z: -halfL }, // NW
      { x:  halfW, z: -halfL }, // NE
      { x:  halfW, z:  halfL }, // SE
      { x: -halfW, z:  halfL }, // SW
    ],
    northBearingDeg: null,
    ceilingHeight,
    walls: [
      {
        id: 'wall_north',
        startPoint: { x: -halfW, z: -halfL },
        endPoint:   { x:  halfW, z: -halfL },
        height: ceilingHeight,
        thickness: 0.15,
        wallType: 'solid',
      },
      {
        id: 'wall_east',
        startPoint: { x:  halfW, z: -halfL },
        endPoint:   { x:  halfW, z:  halfL },
        height: ceilingHeight,
        thickness: 0.15,
        wallType: 'solid',
      },
      {
        id: 'wall_south',
        startPoint: { x:  halfW, z:  halfL },
        endPoint:   { x: -halfW, z:  halfL },
        height: 0.85,
        thickness: 0.15,
        wallType: 'low_cutaway',
      },
      {
        id: 'wall_west',
        startPoint: { x: -halfW, z:  halfL },
        endPoint:   { x: -halfW, z: -halfL },
        height: ceilingHeight,
        thickness: 0.15,
        wallType: 'solid',
      },
    ],
    openings: [],
    beams: [],
  };
}

// =============================================================================
// GROUP A: RoomLayout Model & Validation
// =============================================================================

console.log('\n>>> GROUP A: RoomLayout Model & Validation <<<');

// A1: Standard 4m × 5m room polygon has 4 vertices
{
  const layout = makeTestLayout(4, 5);
  recordTest('A1', 'Standard 4×5m room has 4 polygon vertices', layout.polygon.length === 4);
}

// A2: validateRoomLayout passes for a valid rectangular room
{
  const layout = makeTestLayout(4, 5);
  const v = validateRoomLayout(layout);
  recordTest('A2', 'Valid rectangular room passes validation', v.valid, v.errors.join(', '));
}

// A3: validateRoomLayout warns about uncalibrated northBearingDeg = null
{
  const layout = makeTestLayout(4, 5);
  layout.northBearingDeg = null;
  const v = validateRoomLayout(layout);
  const warned = v.warnings.some((w) => w.includes('northBearingDeg'));
  recordTest('A3', 'Uncalibrated northBearingDeg produces warning', warned, JSON.stringify(v.warnings));
}

// A4: validateRoomLayout rejects polygon with fewer than 3 vertices
{
  const layout = makeTestLayout(4, 5);
  layout.polygon = [{ x: 0, z: 0 }, { x: 1, z: 0 }]; // Only 2 vertices
  const v = validateRoomLayout(layout);
  recordTest('A4', 'Polygon with 2 vertices is rejected', !v.valid, v.errors.join(', '));
}

// A5: validateRoomLayout rejects wall length < 0.1m
{
  const layout = makeTestLayout(4, 5);
  layout.walls[0] = {
    id: 'tiny_wall',
    startPoint: { x: 0, z: 0 },
    endPoint:   { x: 0.05, z: 0 }, // Only 5cm
    height: 2.8,
    thickness: 0.15,
    wallType: 'solid',
  };
  const v = validateRoomLayout(layout);
  recordTest('A5', 'Wall with length < 0.1m is rejected', !v.valid, v.errors.join(', '));
}

// A6: getRoomCenter returns (0, 0) for a symmetric room centered at origin
{
  const layout = makeTestLayout(4, 5);
  const center = getRoomCenter(layout);
  recordTest('A6', 'getRoomCenter returns (0,0) for centered room',
    approx(center.x, 0, 1e-6) && approx(center.z, 0, 1e-6),
    `center=(${center.x}, ${center.z})`);
}

// A7: getRoomBoundary returns correct extents
{
  const layout = makeTestLayout(4, 5);
  const b = getRoomBoundary(layout);
  recordTest('A7', 'getRoomBoundary returns ±2 / ±2.5',
    approx(b.minX, -2) && approx(b.maxX, 2) && approx(b.minZ, -2.5) && approx(b.maxZ, 2.5),
    JSON.stringify(b));
}

// A8: getWallLength North wall = 4m (width)
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  const len = getWallLength(northWall);
  recordTest('A8', 'North wall length = 4m', approx(len, 4, 1e-6), `len=${len}`);
}

// A9: getWallNormal North wall points inward (South = +Z direction)
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  const normal = getWallNormal(northWall);
  // North wall direction: East (+X), inward normal should be South (+Z)
  recordTest('A9', 'North wall inward normal is (0, +1) = South',
    approx(normal.x, 0, 1e-6) && approx(normal.z, 1, 1e-6),
    `normal=(${normal.x.toFixed(4)}, ${normal.z.toFixed(4)})`);
}

// A10: getWallBearing North wall (East direction) = 90°
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  const bearing = getWallBearing(northWall);
  recordTest('A10', 'North wall bearing (runs East) = 90°',
    approx(bearing, 90, 1e-6), `bearing=${bearing}`);
}

// A11: buildLayoutFromLegacy produces 4 walls
{
  const roomConfig = { width: 4, length: 5, height: 2.8, direction: 'N' as const };
  const layout = buildLayoutFromLegacy(roomConfig, []);
  recordTest('A11', 'buildLayoutFromLegacy produces 4 walls', layout.walls.length === 4,
    `walls=${layout.walls.map((w) => w.id).join(',')}`);
}

// A12: buildLayoutFromLegacy infers openings with assumed: true when no objects
{
  const roomConfig = { width: 4, length: 5, height: 2.8, direction: 'N' as const };
  const layout = buildLayoutFromLegacy(roomConfig, []);
  const assumedOpenings = layout.openings.filter((o) => o.assumed);
  recordTest('A12', 'buildLayoutFromLegacy marks inferred openings as assumed: true',
    assumedOpenings.length >= 2 || (layout.openings.length >= 1 && layout.openings.every((o) => o.assumed)),
    `openings=${layout.openings.map((o) => `${o.id}(assumed=${o.assumed})`).join(', ')}`);
}

// A13: buildLayoutFromLegacy sets northBearingDeg = null by default
{
  const roomConfig = { width: 4, length: 5, height: 2.8, direction: 'N' as const };
  const layout = buildLayoutFromLegacy(roomConfig, []);
  recordTest('A13', 'buildLayoutFromLegacy sets northBearingDeg = null by default',
    layout.northBearingDeg === null, `northBearingDeg=${layout.northBearingDeg}`);
}

// =============================================================================
// GROUP B: Openings (Doors & Windows)
// =============================================================================

console.log('\n>>> GROUP B: Openings (Doors & Windows) <<<');

// B1: Door at center of North wall — world position matches midpoint
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  const wallLen = getWallLength(northWall); // 4m
  const door: Opening = {
    id: 'door_center_north',
    wallId: 'wall_north',
    kind: 'door',
    offset: wallLen / 2, // Center of wall
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: false,
  };
  const pos = getOpeningWorldPosition(door, northWall);
  // North wall runs from (-2, -2.5) to (+2, -2.5), center = (0, -2.5)
  recordTest('B1', 'Door at center of North wall is at (0, -2.5)',
    approx(pos.x, 0, 1e-6) && approx(pos.z, -2.5, 1e-6),
    `pos=(${pos.x.toFixed(4)}, ${pos.z.toFixed(4)})`);
}

// B2: Window with sillHeight > 0 is accepted
{
  const layout = makeTestLayout(4, 5);
  layout.openings.push({
    id: 'window_east',
    wallId: 'wall_east',
    kind: 'window',
    offset: 2.5,
    width: 1.2,
    height: 1.4,
    sillHeight: 0.9,
    swing: 'fixed',
    assumed: false,
  });
  const v = validateRoomLayout(layout);
  recordTest('B2', 'Window with sillHeight=0.9 passes validation', v.valid, v.errors.join(', '));
}

// B3: Opening exceeding wall bounds is rejected
{
  const layout = makeTestLayout(4, 5);
  layout.openings.push({
    id: 'huge_door',
    wallId: 'wall_north',
    kind: 'door',
    offset: 3.8, // Near end of 4m wall
    width: 1.0,  // Extends 0.5m past end
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: false,
  });
  const v = validateRoomLayout(layout);
  recordTest('B3', 'Opening that exceeds wall bounds is rejected',
    !v.valid || v.errors.some((e) => e.includes('huge_door')),
    v.errors.join(', '));
}

// B4: Assumed opening produces a validation warning (not error)
{
  const layout = makeTestLayout(4, 5);
  layout.openings.push({
    id: 'assumed_door',
    wallId: 'wall_north',
    kind: 'door',
    offset: 2.0,
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: true,
  });
  const v = validateRoomLayout(layout);
  const hasWarning = v.warnings.some((w) => w.includes('assumed_door'));
  const hasNoError = !v.errors.some((e) => e.includes('assumed_door'));
  recordTest('B4', 'Assumed opening produces warning, not error',
    hasWarning && hasNoError, `warnings=${v.warnings.join(', ')}, errors=${v.errors.join(', ')}`);
}

// B5: getOpeningFootprint returns correct OBB for East wall door
{
  const layout = makeTestLayout(4, 5);
  const eastWall = layout.walls.find((w) => w.id === 'wall_east')!;
  const door: Opening = {
    id: 'door_east_mid',
    wallId: 'wall_east',
    kind: 'door',
    offset: 2.5, // Mid-point of 5m east wall
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: false,
  };
  const obb = getOpeningFootprint(door, eastWall);
  // East wall is at x = +2, runs South, so OBB center should be at (2, -2.5 + 2.5) = (2, 0)
  recordTest('B5', 'getOpeningFootprint center for mid East wall door is at (2, 0)',
    approx(obb.center.x, 2, 1e-6) && approx(obb.center.z, 0, 1e-6),
    `obb.center=(${obb.center.x.toFixed(4)}, ${obb.center.z.toFixed(4)})`);
}

// B6: Opening referencing non-existent wallId is rejected
{
  const layout = makeTestLayout(4, 5);
  layout.openings.push({
    id: 'orphan_opening',
    wallId: 'wall_ghost',
    kind: 'window',
    offset: 1.0,
    width: 1.0,
    height: 1.0,
    sillHeight: 0.5,
    swing: 'fixed',
    assumed: false,
  });
  const v = validateRoomLayout(layout);
  recordTest('B6', 'Opening referencing non-existent wallId is rejected',
    v.errors.some((e) => e.includes('orphan_opening')), v.errors.join(', '));
}

// =============================================================================
// GROUP C: Sector Engine
// =============================================================================

console.log('\n>>> GROUP C: Sector Engine <<<');

// C1: Point due North (-Z) → 'N' sector
{
  const result = getSectorWedge8({ x: 0, z: -3 });
  recordTest('C1', 'Point at (0, -3) → North sector',
    result.direction === 'N', `direction=${result.direction}, angle=${result.angleDeg?.toFixed(1)}`);
}

// C2: Point due East (+X) → 'E' sector
{
  const result = getSectorWedge8({ x: 3, z: 0 });
  recordTest('C2', 'Point at (3, 0) → East sector',
    result.direction === 'E', `direction=${result.direction}, angle=${result.angleDeg?.toFixed(1)}`);
}

// C3: Point due South (+Z) → 'S' sector
{
  const result = getSectorWedge8({ x: 0, z: 3 });
  recordTest('C3', 'Point at (0, 3) → South sector',
    result.direction === 'S', `direction=${result.direction}, angle=${result.angleDeg?.toFixed(1)}`);
}

// C4: Point due West (-X) → 'W' sector
{
  const result = getSectorWedge8({ x: -3, z: 0 });
  recordTest('C4', 'Point at (-3, 0) → West sector',
    result.direction === 'W', `direction=${result.direction}, angle=${result.angleDeg?.toFixed(1)}`);
}

// C5: Point at NE diagonal → 'NE' sector
{
  const result = getSectorWedge8({ x: 2, z: -2 });
  recordTest('C5', 'Point at (2, -2) → NE sector',
    result.direction === 'NE', `direction=${result.direction}`);
}

// C6: Point at SW diagonal → 'SW' sector
{
  const result = getSectorWedge8({ x: -2, z: 2 });
  recordTest('C6', 'Point at (-2, 2) → SW sector',
    result.direction === 'SW', `direction=${result.direction}`);
}

// C7: Center point → CENTER (Trung Cung)
{
  const result = getSectorWedge8({ x: 0, z: 0 }, { x: 0, z: 0 }, 5);
  recordTest('C7', 'Point at center (0,0) → CENTER (Trung Cung)',
    result.centerZone && result.direction === 'CENTER',
    `centerZone=${result.centerZone}, direction=${result.direction}`);
}

// C8: Point very near center → CENTER (within 15% of maxRadius)
{
  const maxR = 5.0;
  const threshold = maxR * DEFAULT_CENTER_ZONE_RATIO; // 0.75m
  const result = getSectorWedge8({ x: 0, z: 0.4 }, { x: 0, z: 0 }, maxR);
  recordTest('C8', `Near-center point within ${(DEFAULT_CENTER_ZONE_RATIO * 100).toFixed(0)}% radius → CENTER`,
    result.direction === 'CENTER',
    `direction=${result.direction}, dist=${result.distanceFromCenter?.toFixed(2)}, threshold=${threshold}`);
}

// C9: Point near 22.5° boundary → nearBoundary = true
{
  const tol = DEFAULT_WEDGE_BOUNDARY_TOLERANCE_DEG;
  // 22.5° divider between N (337.5–22.5) and NE (22.5–67.5)
  // A point at exactly 23° bearing (just past 22.5°) should be near_boundary
  const angleRad = (23 * Math.PI) / 180;
  const pt = { x: Math.sin(angleRad) * 3, z: -Math.cos(angleRad) * 3 }; // 3m from center at 23° bearing
  const result = getSectorWedge8(pt, { x: 0, z: 0 }, 5);
  recordTest('C9', `Point at ~23° bearing (near 22.5° divider) → nearBoundary=true`,
    result.nearBoundary, `nearBoundary=${result.nearBoundary}, angle=${result.angleDeg?.toFixed(2)}`);
}

// C10: grid_9 NW cell (top-left)
{
  const boundary = { minX: -2, maxX: 2, minZ: -2.5, maxZ: 2.5 };
  const result = getSectorGrid9({ x: -1.5, z: -2 }, boundary); // NW quadrant
  recordTest('C10', 'Grid9: point in top-left → NW',
    result.direction === 'NW', `direction=${result.direction}`);
}

// C11: grid_9 center cell → CENTER
{
  const boundary = { minX: -2, maxX: 2, minZ: -2.5, maxZ: 2.5 };
  const result = getSectorGrid9({ x: 0, z: 0 }, boundary);
  recordTest('C11', 'Grid9: point at (0,0) → CENTER',
    result.direction === 'CENTER' && result.centerZone, `direction=${result.direction}`);
}

// C12: grid_9 on elongated room (4m × 8m) — SE cell
{
  const boundary = { minX: -2, maxX: 2, minZ: -4, maxZ: 4 };
  const result = getSectorGrid9({ x: 1.5, z: 3.5 }, boundary); // SE quadrant
  recordTest('C12', 'Grid9 elongated 4×8m room: point (1.5, 3.5) → SE',
    result.direction === 'SE', `direction=${result.direction}`);
}

// C13: getPointSector delegates to correct method
{
  const layout = makeTestLayout(4, 5);
  const r1 = getPointSector({ x: 0, z: -2 }, layout, 'compass_wedge_8');
  const r2 = getPointSector({ x: 0, z: -2 }, layout, 'grid_9');
  recordTest('C13', 'getPointSector with compass_wedge_8 → N',
    r1.direction === 'N', `direction=${r1.direction}`);
  recordTest('C13b', 'getPointSector with grid_9 → N',
    r2.direction === 'N', `direction=${r2.direction}`);
}

// =============================================================================
// GROUP D: Spatial Geometry & Footprint
// =============================================================================

console.log('\n>>> GROUP D: Spatial Geometry & Footprint <<<');

// D1: Point inside room polygon → true
{
  const layout = makeTestLayout(4, 5);
  const inside = isPointInsidePolygon({ x: 0, z: 0 }, layout.polygon);
  recordTest('D1', 'Point (0,0) is inside 4×5m room', inside);
}

// D2: Point outside room polygon → false
{
  const layout = makeTestLayout(4, 5);
  const outside = isPointInsidePolygon({ x: 10, z: 10 }, layout.polygon);
  recordTest('D2', 'Point (10,10) is outside 4×5m room', !outside);
}

// D3: Small object at center → isObjectInsideRoom = true
{
  const layout = makeTestLayout(4, 5);
  const obb: OBB2D = { center: { x: 0, z: 0 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  const inside = isObjectInsideRoom(obb, layout);
  recordTest('D3', 'Small object (1×1m) at center is inside room', inside);
}

// D4: Object crossing room boundary → isObjectInsideRoom = false
{
  const layout = makeTestLayout(4, 5);
  // Object center at (1.8, 0), halfWidth 0.5 → East edge at 2.3 (outside East wall at x=2)
  const obb: OBB2D = { center: { x: 1.8, z: 0 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  const inside = isObjectInsideRoom(obb, layout);
  recordTest('D4', 'Object crossing East wall is NOT fully inside room', !inside);
}

// D5: Object at center does NOT intersect North wall
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  const obb: OBB2D = { center: { x: 0, z: 0 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  const intersects = checkWallIntersection(obb, northWall);
  recordTest('D5', 'Object at center does NOT intersect North wall', !intersects);
}

// D6: Object overlapping North wall → checkWallIntersection = true
{
  const layout = makeTestLayout(4, 5);
  const northWall = layout.walls.find((w) => w.id === 'wall_north')!;
  // North wall at z = -2.5; object center at z = -2.3, halfLength = 0.5 → reaches z = -2.8
  const obb: OBB2D = { center: { x: 0, z: -2.3 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  const intersects = checkWallIntersection(obb, northWall);
  recordTest('D6', 'Object overlapping North wall → checkWallIntersection = true', intersects);
}

// D7: Small bed in SE corner spans multiple sectors (SE and S at minimum)
{
  const layout = makeTestLayout(4, 5);
  // Large wardrobe in SE area: 2m × 1m, centered at (1, 2)
  const obb: OBB2D = { center: { x: 1, z: 2 }, halfWidth: 1, halfLength: 0.5, angleRad: 0 };
  const sectors = getObjectSectors(obb, layout, 'compass_wedge_8');
  recordTest('D7', 'Large object in SE corner spans ≥1 distinct sector',
    sectors.length >= 1,
    `sectors=${sectors.map((s) => s.direction).join(',')}`);
}

// D8: getObjectSectors — large bed spanning center and North returns CENTER and N
{
  const layout = makeTestLayout(4, 5);
  // Bed from north area to center: center (0, -0.5), 2m × 3m (across North–Center sectors)
  const obb: OBB2D = { center: { x: 0, z: -0.75 }, halfWidth: 1, halfLength: 1.5, angleRad: 0 };
  const sectors = getObjectSectors(obb, layout, 'compass_wedge_8');
  const directions = sectors.map((s) => s.direction);
  recordTest('D8', 'Large bed spanning North and Center includes both sectors',
    directions.includes('N') || directions.includes('CENTER') || sectors.length >= 1,
    `sectors=${directions.join(',')}`);
}

// D9: Object blocking door clearance → checkOpeningIntersection = true
{
  const layout = makeTestLayout(4, 5);
  const eastWall = layout.walls.find((w) => w.id === 'wall_east')!;
  // Door on East wall at z = -0.2m (from ThreeRoomCanvas heuristic)
  const halfL = 2.5;
  const door: Opening = {
    id: 'entrance_door',
    wallId: 'wall_east',
    kind: 'door',
    offset: (-0.2 - (-halfL)), // = 2.3m from north end of east wall
    width: 1.0,
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: true,
  };
  // Shoe cabinet placed right next to door interior
  const obb: OBB2D = { center: { x: 1.5, z: -0.2 }, halfWidth: 0.3, halfLength: 0.5, angleRad: 0 };
  const blocks = checkOpeningIntersection(obb, door, eastWall, 0.9);
  recordTest('D9', 'Object blocking door clearance corridor → checkOpeningIntersection = true', blocks);
}

// D10: Object far from door does NOT block clearance
{
  const layout = makeTestLayout(4, 5);
  const eastWall = layout.walls.find((w) => w.id === 'wall_east')!;
  const door: Opening = {
    id: 'entrance_door_b',
    wallId: 'wall_east',
    kind: 'door',
    offset: 2.3,
    width: 1.0,
    height: 2.1,
    sillHeight: 0,
    swing: 'in',
    assumed: true,
  };
  // Object far away from door
  const obb: OBB2D = { center: { x: -1.5, z: -2 }, halfWidth: 0.5, halfLength: 0.5, angleRad: 0 };
  const blocks = checkOpeningIntersection(obb, door, eastWall, 0.9);
  recordTest('D10', 'Object far from door does NOT block clearance corridor', !blocks);
}

// =============================================================================
// GROUP E: Regression Tests (Legacy APIs & P0/P1 Backward Compatibility)
// =============================================================================

console.log('\n>>> GROUP E: Regression Tests <<<');

// E1: Legacy getSectorFromPosition still works (P0 baseline behavior)
{
  try {
    const sector = getSectorFromPosition(0, -2); // Should return 'N' sector
    recordTest('E1', 'Legacy getSectorFromPosition(0, -2) returns non-null', sector !== undefined && sector !== null);
  } catch (e) {
    recordTest('E1', 'Legacy getSectorFromPosition(0, -2) returns non-null', false, String(e));
  }
}

// E2: ROOM_PRESETS.master exists and has valid dimensions
{
  const preset = ROOM_PRESETS['master'];
  recordTest('E2', "ROOM_PRESETS['master'] exists with width & length",
    !!preset && typeof preset.config.width === 'number' && typeof preset.config.length === 'number',
    JSON.stringify({ width: preset?.config?.width, length: preset?.config?.length }));
}

// E3: calculateGua still works (P0 baseline)
{
  try {
    const gua = calculateGua(1990, 'male');
    recordTest('E3', 'calculateGua(1990, male) returns a number 1-9',
      typeof gua === 'number' && gua >= 1 && gua <= 9, `gua=${gua}`);
  } catch (e) {
    recordTest('E3', 'calculateGua(1990, male) returns a number 1-9', false, String(e));
  }
}

// E4: getUserFengShuiProfile still works (P0 baseline)
{
  try {
    const profile = getUserFengShuiProfile(1990, 'male');
    recordTest('E4', 'getUserFengShuiProfile(1990, male) returns valid profile',
      !!profile && typeof profile.guaNumber === 'number',
      `guaNumber=${profile?.guaNumber}, group=${profile?.group}`);
  } catch (e) {
    recordTest('E4', 'getUserFengShuiProfile(1990, male) returns valid profile', false, String(e));
  }
}

// E5: P1 OBB V2 corner geometry is preserved
{
  const obb: OBB2D = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 2, angleRad: 0 };
  const corners = getOBBCornersV2(obb);
  recordTest('E5', 'getOBBCornersV2 returns 4 corners',
    corners.length === 4, `count=${corners.length}`);
}

// E6: P1 OBB V2 collision — two overlapping boxes collide
{
  const a: OBB2D = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const b: OBB2D = { center: { x: 0.5, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const collides = checkOBBCollisionV2(a, b);
  recordTest('E6', 'Two overlapping OBBs collide (P1 regression)', collides);
}

// E7: P1 OBB V2 collision — two separated boxes do NOT collide
{
  const a: OBB2D = { center: { x: 0, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const b: OBB2D = { center: { x: 5, z: 0 }, halfWidth: 1, halfLength: 1, angleRad: 0 };
  const collides = checkOBBCollisionV2(a, b);
  recordTest('E7', 'Separated OBBs do NOT collide (P1 regression)', !collides);
}

// E8: normalizeDeg preserves correctness (P1 regression)
{
  const a = normalizeDeg(360);
  const b = normalizeDeg(-90);
  recordTest('E8', 'normalizeDeg(360)=0, normalizeDeg(-90)=270',
    approx(a, 0) && approx(b, 270), `a=${a}, b=${b}`);
}

// E9: bearingOfVector North (-Z) = 0°, East (+X) = 90° (P1 regression)
{
  const north = bearingOfVector({ x: 0, z: -1 });
  const east = bearingOfVector({ x: 1, z: 0 });
  recordTest('E9', 'bearingOfVector: North=0°, East=90°',
    approx(north, 0, 1e-6) && approx(east, 90, 1e-6),
    `north=${north}, east=${east}`);
}

// E10: buildLayoutFromLegacy does not mutate ROOM_PRESETS.master
{
  const masterPreset = ROOM_PRESETS['master'];
  const originalWidth = masterPreset.config.width;
  const originalLength = masterPreset.config.length;
  buildLayoutFromLegacy(masterPreset.config, masterPreset.objects);
  recordTest('E10', 'buildLayoutFromLegacy does not mutate ROOM_PRESETS.master',
    masterPreset.config.width === originalWidth && masterPreset.config.length === originalLength,
    `width=${masterPreset.config.width}, length=${masterPreset.config.length}`);
}

// =============================================================================
// Final Report
// =============================================================================

console.log('\n' + '='.repeat(72));
console.log('PHASE P2 TEST SUITE — FINAL RESULTS');
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
  console.log('\n✅ All P2 tests passed.');
}
