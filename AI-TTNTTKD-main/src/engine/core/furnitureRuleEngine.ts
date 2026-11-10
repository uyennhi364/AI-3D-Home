// =============================================================================
// src/engine/core/furnitureRuleEngine.ts
// Phase P3 — Furniture Feng Shui Rule Engine
//
// DESIGN PRINCIPLES:
// - Three separated assessment categories: Traditional FS, Geometric Layout, Environmental.
// - Every RuleResult must cite its geometric measurements and data sources.
// - Unknown data must remain 'unknown' — never promoted to pass/fail.
// - 'assumed' data from P2 legacy adapter must propagate to result dataStatus.
// - No scene mutations. Engine is pure read-only: RoomLayout + RoomObject[] → RuleResult[].
// - Verdict mapping: 'pass' = favorable, 'warn' = marginal, 'fail' = unfavorable,
//                    'unknown' = missing data, 'n/a' = rule not applicable.
//
// API DEPENDENCY CLARITY:
// - Uses V2 Three.js rotation convention (worldBearingOfAxis via rotateByYaw).
// - createOBBFromObject in geometryEngine uses V1 convention — NOT used here.
// - Instead: builds OBB2D manually from RoomObject fields with V2 convention.
// - P2 sectorEngine spatial functions used for all geometric intersection tests.
// =============================================================================

import { RoomObject, RoomObjectType } from '../../types/fengshui.js';
import { RuleResult, RuleCategory, FengShuiSchool, RuleSeverity } from './ruleTypes.js';
import { RoomLayout, Wall, Opening, getWallLength, getWallVector, getWallNormal, getOpeningWorldPosition } from './roomLayout.js';
import { OBB2D } from '../geometryEngine.js';
import { getOBBCornersV2, checkOBBCollisionV2 } from '../geometryEngine.js';
import { isObjectInsideRoom, checkWallIntersection, checkOpeningIntersection, isPointInsidePolygon } from './sectorEngine.js';
import { Vector2D, rotateByYaw, worldBearingOfAxis, bearingOfVector, directionFromBearing } from './compass.js';
import { ORIENTATION_CATALOG, ObjectOrientationDefinition } from './orientationCatalog.js';

export const P3_ENGINE_VERSION = '3.0.0-p3';

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Builds an OBB2D from a RoomObject using V2 Three.js rotation convention.
 * angleRad = object.rotation.y, halfWidth = dimensions.width/2, halfLength = dimensions.length/2.
 */
function buildOBBFromObject(obj: RoomObject, margin = 0): OBB2D {
  return {
    center: { x: obj.position.x, z: obj.position.z },
    halfWidth: Math.max(0.05, obj.dimensions.width / 2 - margin),
    halfLength: Math.max(0.05, obj.dimensions.length / 2 - margin),
    angleRad: obj.rotation.y,
  };
}

/**
 * Rotates a local axis vector by the object's yaw (V2 Three.js convention)
 * and returns the world-space 2D vector on the XZ floor plane.
 */
function localAxisToWorld(localAxis: Vector2D, yawRad: number): Vector2D {
  return rotateByYaw(localAxis, yawRad);
}

/**
 * Calculates Euclidean floor distance between two 2D points.
 */
function floorDist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Finds the minimum distance from any of an OBB's corners to a wall segment.
 * Returns the closest distance in meters.
 */
function minDistanceOBBToWall(obb: OBB2D, wall: Wall): number {
  const corners = getOBBCornersV2(obb);
  const wallLen = getWallLength(wall);
  const wv = getWallVector(wall);
  let minDist = Infinity;

  for (const corner of corners) {
    // Project corner onto wall line
    const toPt = { x: corner.x - wall.startPoint.x, z: corner.z - wall.startPoint.z };
    const t = Math.max(0, Math.min(wallLen, toPt.x * wv.x + toPt.z * wv.z));
    const closestPt = {
      x: wall.startPoint.x + wv.x * t,
      z: wall.startPoint.z + wv.z * t,
    };
    const d = floorDist(corner, closestPt);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Checks if a world vector A is pointing roughly towards point B from point A_pos.
 * Returns angle difference in degrees.
 */
function facingAngleDiff(
  fromPos: { x: number; z: number },
  facingVec: Vector2D,
  targetPos: { x: number; z: number }
): number {
  const toTarget = { x: targetPos.x - fromPos.x, z: targetPos.z - fromPos.z };
  const len = Math.hypot(toTarget.x, toTarget.z);
  if (len < 1e-9) return 0;
  const toTargetNorm = { x: toTarget.x / len, z: toTarget.z / len };
  const dot = Math.min(1, Math.max(-1, facingVec.x * toTargetNorm.x + facingVec.z * toTargetNorm.z));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Returns whether any opening in the layout has assumed: true.
 */
function hasAssumedOpenings(layout: RoomLayout): boolean {
  return layout.openings.some((o) => o.assumed);
}

/** Gets all openings of a given kind */
function getOpeningsByKind(layout: RoomLayout, kind: 'door' | 'window'): Array<{ opening: Opening; wall: Wall }> {
  return layout.openings.flatMap((op) => {
    if (op.kind !== kind) return [];
    const wall = layout.walls.find((w) => w.id === op.wallId);
    if (!wall) return [];
    return [{ opening: op, wall }];
  });
}

// =============================================================================
// Rule Result Factory
// =============================================================================

function makeResult(
  partial: Omit<RuleResult, 'engineVersion'>
): RuleResult {
  return { ...partial, engineVersion: P3_ENGINE_VERSION };
}

// =============================================================================
// GROUP 1: BED RULES
// =============================================================================

export interface BedRuleInputs {
  bed: RoomObject;
  layout: RoomLayout;
  allObjects: RoomObject[];
}

/**
 * RULE BED-WALL-01: Headboard-to-Wall Support
 *
 * Checks whether the headboard edge of the bed is backed by a solid wall
 * within acceptable distance (≤ 0.15m gap = wall thickness tolerance).
 *
 * Feng shui principle (Loan Đầu): Bed requires 'tọa sơn' — solid mountain backing.
 * Geometric measurement: distance from headboard OBB edge to nearest wall segment.
 *
 * Data: 'sufficient' if walls are defined. 'assumed' if walls are inferred.
 */
export function evaluateBedHeadboardWall(inputs: BedRuleInputs): RuleResult {
  const { bed, layout } = inputs;
  const orientation = ORIENTATION_CATALOG['bed'];
  if (!orientation || !orientation.headAxis) {
    return makeResult({
      ruleId: 'BED-WALL-01',
      name: 'Đầu giường tựa tường',
      category: 'geometric_layout',
      school: 'loan_dau',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['orientation.headAxis not found for bed type'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không tìm thấy metadata hướng đầu giường trong Orientation Catalog.',
      sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const bedOBB = buildOBBFromObject(bed);
  const headAxisWorld = localAxisToWorld(orientation.headAxis, bed.rotation.y);

  // Headboard edge midpoint: center + headAxis * halfLength
  const headboardCenter: Vector2D = {
    x: bed.position.x + headAxisWorld.x * (bed.dimensions.length / 2),
    z: bed.position.z + headAxisWorld.z * (bed.dimensions.length / 2),
  };

  // Find the wall closest to the headboard center in the headboard direction
  const SOLID_WALL_MAX_GAP = 0.20; // 20cm tolerance — wall thickness typically 0.15m
  let closestWall: Wall | null = null;
  let closestDist = Infinity;

  for (const wall of layout.walls) {
    if (wall.wallType === 'low_cutaway') continue; // South viewing cutaway not structural
    const dist = minDistanceOBBToWall(bedOBB, wall);
    if (dist < closestDist) {
      closestDist = dist;
      closestWall = wall;
    }
  }

  // Also check specifically whether headboard midpoint is near any wall
  let headboardNearestWallDist = Infinity;
  let headboardNearestWall: Wall | null = null;
  for (const wall of layout.walls) {
    if (wall.wallType === 'low_cutaway') continue;
    const wallLen = getWallLength(wall);
    const wv = getWallVector(wall);
    const toPt = { x: headboardCenter.x - wall.startPoint.x, z: headboardCenter.z - wall.startPoint.z };
    const t = Math.max(0, Math.min(wallLen, toPt.x * wv.x + toPt.z * wv.z));
    const closestPt = { x: wall.startPoint.x + wv.x * t, z: wall.startPoint.z + wv.z * t };
    const d = floorDist(headboardCenter, closestPt);
    if (d < headboardNearestWallDist) {
      headboardNearestWallDist = d;
      headboardNearestWall = wall;
    }
  }

  const isBackedByWall = headboardNearestWallDist <= SOLID_WALL_MAX_GAP;
  const isNearWall = headboardNearestWallDist <= 0.5;

  const headboardBearing = worldBearingOfAxis(orientation.headAxis, bed.rotation.y);
  const headboardDirection = directionFromBearing(headboardBearing);

  const dataStatus = layout.walls.length > 0 ? 'sufficient' : 'insufficient';

  return makeResult({
    ruleId: 'BED-WALL-01',
    name: 'Đầu giường tựa tường',
    category: 'geometric_layout',
    school: 'loan_dau',
    applicability: 'mandatory',
    dataStatus,
    inputs: {
      bedId: bed.id,
      bedPosition: { x: bed.position.x, z: bed.position.z },
      headboardDirection,
      headboardBearingDeg: headboardBearing,
    },
    measurement: {
      metric: 'headboard_to_nearest_solid_wall',
      value: parseFloat(headboardNearestWallDist.toFixed(3)),
      unit: 'm',
      threshold: SOLID_WALL_MAX_GAP,
      passed: isBackedByWall,
      geometryDetails: {
        point1: headboardCenter,
        point2: headboardNearestWall
          ? { x: (headboardNearestWall.startPoint.x + headboardNearestWall.endPoint.x) / 2, z: (headboardNearestWall.startPoint.z + headboardNearestWall.endPoint.z) / 2 }
          : undefined,
        distanceMeters: parseFloat(headboardNearestWallDist.toFixed(3)),
      },
    },
    verdict: isBackedByWall ? 'pass' : isNearWall ? 'warn' : 'fail',
    severity: isBackedByWall ? 'info' : isNearWall ? 'minor' : 'major',
    explanation: isBackedByWall
      ? `Đầu giường hướng ${headboardDirection} tựa vào tường cách ${headboardNearestWallDist.toFixed(2)}m. Nguyên lý tọa sơn được đáp ứng.`
      : isNearWall
      ? `Đầu giường hướng ${headboardDirection} cách tường ${headboardNearestWallDist.toFixed(2)}m (gần nhưng chưa tựa sát tường).`
      : `Đầu giường hướng ${headboardDirection} không có tường hỗ trợ phía sau (cách tường gần nhất ${headboardNearestWallDist.toFixed(2)}m).`,
    remedy: isBackedByWall
      ? undefined
      : 'Di chuyển giường để đầu giường sát hoặc gần tường đặc. Tránh đặt đầu giường ở giữa phòng.',
    sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE BED-DOOR-01: Bed-Door Corridor Conflict
 *
 * Checks three distinct conditions (not conflated):
 * 1. Physical OBB collision: bed footprint overlaps door clearance corridor.
 * 2. Direct axis conflict: headboard faces door direction (Trực xung cửa môn sát).
 *
 * Uses Opening geometry from P2 (checkOpeningIntersection).
 * Marks dataStatus 'assumed' if openings are inferred from legacy adapter.
 */
export function evaluateBedDoorConflict(inputs: BedRuleInputs): RuleResult {
  const { bed, layout } = inputs;
  const doors = getOpeningsByKind(layout, 'door');

  if (doors.length === 0) {
    return makeResult({
      ruleId: 'BED-DOOR-01',
      name: 'Giường và cửa ra vào',
      category: 'geometric_layout',
      school: 'loan_dau',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['Không tìm thấy dữ liệu cửa ra vào trong layout.'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có cửa ra vào được định nghĩa trong RoomLayout — không thể đánh giá quan hệ giường-cửa.',
      sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const bedOBB = buildOBBFromObject(bed);
  const anyAssumed = hasAssumedOpenings(layout);

  let physicalConflict = false;
  let conflictingDoorId = '';
  let corridorClearanceDepth = 0.9;
  let closestDoorDist = Infinity;

  for (const { opening, wall } of doors) {
    const doorPos = getOpeningWorldPosition(opening, wall);
    const dist = floorDist(bed.position, doorPos);
    if (dist < closestDoorDist) closestDoorDist = dist;

    const conflict = checkOpeningIntersection(bedOBB, opening, wall, corridorClearanceDepth);
    if (conflict) {
      physicalConflict = true;
      conflictingDoorId = opening.id;
    }
  }

  // Check direct axis conflict: headboard direction faces toward door
  const orientation = ORIENTATION_CATALOG['bed'];
  let axisConflict = false;
  let axisConflictAngleDeg = 180;

  if (orientation?.headAxis) {
    const headWorldVec = localAxisToWorld(orientation.headAxis, bed.rotation.y);
    for (const { opening, wall } of doors) {
      const doorPos = getOpeningWorldPosition(opening, wall);
      const angleDiff = facingAngleDiff(bed.position, headWorldVec, doorPos);
      if (angleDiff < axisConflictAngleDeg) axisConflictAngleDeg = angleDiff;
      if (angleDiff <= 30) axisConflict = true;
    }
  }

  const dataStatus: RuleResult['dataStatus'] = anyAssumed ? 'insufficient' : 'sufficient';

  let verdict: RuleResult['verdict'];
  let severity: RuleSeverity;
  let explanation: string;
  let remedy: string | undefined;

  if (physicalConflict) {
    verdict = 'fail';
    severity = 'critical';
    explanation = `Footprint giường giao với hành lang thông thoáng ${corridorClearanceDepth}m trước cửa "${conflictingDoorId}". Cản trở lối đi vật lý.`;
    remedy = 'Di chuyển giường ra khỏi khu vực hành lang trước cửa ra vào.';
  } else if (axisConflict) {
    verdict = 'warn';
    severity = 'major';
    explanation = `Đầu giường có trục hướng thẳng về phía cửa (sai lệch ${axisConflictAngleDeg.toFixed(1)}° < 30°). Nguyên lý phong thủy: trực xung cửa môn sát. Chưa có cản trở vật lý.`;
    remedy = 'Xoay giường để đầu giường không hướng thẳng vào cửa, hoặc sử dụng bình phong ngăn cách.';
  } else {
    verdict = 'pass';
    severity = 'info';
    explanation = `Footprint giường không giao với hành lang cửa. Trục đầu giường lệch ${axisConflictAngleDeg.toFixed(1)}° so với trục cửa.`;
  }

  if (anyAssumed) {
    explanation += ' [LƯU Ý: Dữ liệu cửa được suy luận tự động (assumed: true) — vị trí cửa thực tế cần xác minh.]';
  }

  return makeResult({
    ruleId: 'BED-DOOR-01',
    name: 'Giường và cửa ra vào',
    category: 'geometric_layout',
    school: 'loan_dau',
    applicability: 'mandatory',
    dataStatus,
    inputs: {
      bedId: bed.id,
      doorCount: doors.length,
      anyAssumed,
      closestDoorDistM: parseFloat(closestDoorDist.toFixed(2)),
    },
    measurement: {
      metric: 'bed_door_corridor_intersection',
      value: physicalConflict ? 'intersects' : axisConflict ? 'axis_conflict' : 'clear',
      passed: !physicalConflict && !axisConflict,
      geometryDetails: {
        angleDeg: parseFloat(axisConflictAngleDeg.toFixed(1)),
        distanceMeters: parseFloat(closestDoorDist.toFixed(2)),
      },
    },
    verdict,
    severity,
    explanation,
    remedy,
    sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE BED-WIN-01: Bed-Window Relationship
 *
 * Checks:
 * 1. Headboard edge is NOT positioned directly below/against a window opening.
 * 2. Bed footprint does NOT intersect window clearance zone.
 *
 * Data is marked 'insufficient' if window is assumed (inferred from legacy adapter).
 */
export function evaluateBedWindowRelationship(inputs: BedRuleInputs): RuleResult {
  const { bed, layout } = inputs;
  const windows = getOpeningsByKind(layout, 'window');

  if (windows.length === 0) {
    return makeResult({
      ruleId: 'BED-WIN-01',
      name: 'Giường và cửa sổ',
      category: 'geometric_layout',
      school: 'loan_dau',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Không tìm thấy dữ liệu cửa sổ trong layout.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không có cửa sổ được định nghĩa trong RoomLayout — không thể đánh giá quan hệ giường-cửa sổ.',
      sources: ['SRC-LOAN-DAU-HINH-THE'],
    });
  }

  const bedOBB = buildOBBFromObject(bed);
  const anyAssumed = windows.some(({ opening }) => opening.assumed);
  const orientation = ORIENTATION_CATALOG['bed'];

  let headboardOverWindow = false;
  let bedIntersectsWindow = false;
  let closestWindowDist = Infinity;

  // Headboard center in world coordinates
  const headAxisWorld = orientation?.headAxis
    ? localAxisToWorld(orientation.headAxis, bed.rotation.y)
    : { x: 0, z: -1 };

  const headboardCenter: Vector2D = {
    x: bed.position.x + headAxisWorld.x * (bed.dimensions.length / 2),
    z: bed.position.z + headAxisWorld.z * (bed.dimensions.length / 2),
  };

  for (const { opening, wall } of windows) {
    const winPos = getOpeningWorldPosition(opening, wall);
    const dist = floorDist(bed.position, winPos);
    if (dist < closestWindowDist) closestWindowDist = dist;

    // Check headboard proximity to window center
    const headToWin = floorDist(headboardCenter, winPos);
    if (headToWin < (opening.width / 2) + 0.2) {
      headboardOverWindow = true;
    }

    // Check physical footprint intersection (0.3m depth zone)
    if (checkOpeningIntersection(bedOBB, opening, wall, 0.3)) {
      bedIntersectsWindow = true;
    }
  }

  const dataStatus: RuleResult['dataStatus'] = anyAssumed ? 'insufficient' : 'sufficient';

  let verdict: RuleResult['verdict'];
  let severity: RuleSeverity;
  let explanation: string;
  let remedy: string | undefined;

  if (headboardOverWindow) {
    verdict = 'fail';
    severity = 'major';
    explanation = `Đầu giường nằm trực tiếp trước cửa sổ. Nguyên lý phong thủy: đầu giường không nên thiếu tọa sơn — cửa sổ không tạo chỗ dựa vững chắc, dễ bị gió lùa.`;
    remedy = 'Di chuyển giường để đầu giường tựa vào tường đặc, không phải vào vị trí có cửa sổ.';
  } else if (bedIntersectsWindow) {
    verdict = 'warn';
    severity = 'minor';
    explanation = `Footprint giường giao với vùng cửa sổ. Có thể cản trở ánh sáng và thông gió.`;
    remedy = 'Điều chỉnh vị trí giường để không chắn cửa sổ.';
  } else {
    verdict = 'pass';
    severity = 'info';
    explanation = `Giường không chắn cửa sổ. Đầu giường không tựa vào vị trí cửa sổ.`;
  }

  if (anyAssumed) {
    explanation += ' [LƯU Ý: Dữ liệu cửa sổ được suy luận tự động (assumed: true) — kết quả cần xác minh với thiết kế thực tế.]';
  }

  return makeResult({
    ruleId: 'BED-WIN-01',
    name: 'Giường và cửa sổ',
    category: 'geometric_layout',
    school: 'loan_dau',
    applicability: 'recommended',
    dataStatus,
    inputs: {
      bedId: bed.id,
      windowCount: windows.length,
      anyAssumed,
      closestWindowDistM: parseFloat(closestWindowDist.toFixed(2)),
      headboardOverWindow,
    },
    measurement: {
      metric: 'bed_window_conflict',
      value: headboardOverWindow ? 'headboard_over_window' : bedIntersectsWindow ? 'footprint_intersects' : 'clear',
      passed: !headboardOverWindow && !bedIntersectsWindow,
      geometryDetails: {
        point1: headboardCenter,
        distanceMeters: parseFloat(closestWindowDist.toFixed(2)),
      },
    },
    verdict,
    severity,
    explanation,
    remedy,
    sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE BED-WC-01: Bed-Toilet Relationship
 *
 * Only evaluates if a 'wc' type object is explicitly present in the scene.
 * Returns 'insufficient' if no toilet data is found — never infers toilet presence.
 */
export function evaluateBedToiletRelationship(inputs: BedRuleInputs): RuleResult {
  const { bed, allObjects } = inputs;
  const toilets = allObjects.filter((o) => o.type === 'wc');

  if (toilets.length === 0) {
    return makeResult({
      ruleId: 'BED-WC-01',
      name: 'Giường và nhà vệ sinh',
      category: 'traditional_feng_shui',
      school: 'loan_dau',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['Không tìm thấy object loại "wc" trong scene.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không có dữ liệu nhà vệ sinh trong scene. Quy tắc này chỉ áp dụng khi có phòng tắm/WC được xác định rõ.',
      sources: ['SRC-LOAN-DAU-HINH-THE'],
    });
  }

  // Basic geometric analysis: distance and relative position only
  const measurements: Array<{ wcId: string; distM: number; relativeDir: string }> = [];
  let minDist = Infinity;

  for (const wc of toilets) {
    const dist = floorDist(bed.position, wc.position);
    if (dist < minDist) minDist = dist;
    const toWc = { x: wc.position.x - bed.position.x, z: wc.position.z - bed.position.z };
    const len = Math.hypot(toWc.x, toWc.z);
    const dir = len > 0.01 ? directionFromBearing(bearingOfVector({ x: toWc.x / len, z: toWc.z / len })) : 'N';
    measurements.push({ wcId: wc.id, distM: parseFloat(dist.toFixed(2)), relativeDir: dir });
  }

  // No partition/door data between bed and WC — cannot determine barrier existence
  const tooClose = minDist < 1.5;

  return makeResult({
    ruleId: 'BED-WC-01',
    name: 'Giường và nhà vệ sinh',
    category: 'traditional_feng_shui',
    school: 'loan_dau',
    applicability: 'optional',
    dataStatus: 'sufficient',
    inputs: {
      bedId: bed.id,
      wcCount: toilets.length,
      wcMeasurements: measurements,
    },
    measurement: {
      metric: 'bed_to_wc_min_distance',
      value: parseFloat(minDist.toFixed(2)),
      unit: 'm',
      threshold: 1.5,
      passed: !tooClose,
      geometryDetails: { distanceMeters: parseFloat(minDist.toFixed(2)) },
    },
    verdict: tooClose ? 'warn' : 'pass',
    severity: tooClose ? 'major' : 'info',
    explanation: tooClose
      ? `Giường cách nhà vệ sinh ${minDist.toFixed(2)}m (< 1.5m). Lưu ý: dữ liệu tường ngăn/cửa phân cách chưa đủ để đánh giá đầy đủ.`
      : `Khoảng cách giường-nhà vệ sinh ${minDist.toFixed(2)}m. Lưu ý: quy tắc đầy đủ cần biết có tường/cửa ngăn cách hay không.`,
    remedy: tooClose ? 'Xem xét tăng khoảng cách hoặc thêm vách ngăn giữa giường và nhà vệ sinh.' : undefined,
    sources: ['SRC-LOAN-DAU-HINH-THE'],
  });
}

// =============================================================================
// GROUP 2: DESK RULES
// =============================================================================

export interface DeskRuleInputs {
  desk: RoomObject;
  layout: RoomLayout;
  allObjects: RoomObject[];
}

/**
 * RULE DESK-ORI-01: Desk User-Facing Orientation
 *
 * Determines the direction the person sitting at the desk is looking.
 * Uses orientationCatalog: desk.userFacingAxis = {x:0, z:-1} in local space.
 *
 * Returns the compass direction the person faces in world space.
 * Does NOT evaluate feng shui quality — that requires personal Gua (P4).
 */
export function evaluateDeskOrientation(inputs: DeskRuleInputs): RuleResult {
  const { desk } = inputs;
  const orientation = ORIENTATION_CATALOG['desk'];

  if (!orientation || !orientation.userFacingAxis) {
    return makeResult({
      ruleId: 'DESK-ORI-01',
      name: 'Hướng người ngồi làm việc',
      category: 'geometric_layout',
      school: 'general',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Thiếu userFacingAxis cho loại "desk" trong Orientation Catalog.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không tìm thấy metadata hướng người ngồi trong Orientation Catalog cho bàn làm việc.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const facingBearing = worldBearingOfAxis(orientation.userFacingAxis, desk.rotation.y);
  const facingDirection = directionFromBearing(facingBearing);
  const facingVecWorld = localAxisToWorld(orientation.userFacingAxis, desk.rotation.y);

  return makeResult({
    ruleId: 'DESK-ORI-01',
    name: 'Hướng người ngồi làm việc',
    category: 'geometric_layout',
    school: 'general',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    inputs: {
      deskId: desk.id,
      rotationYRad: desk.rotation.y,
      userFacingAxisLocal: orientation.userFacingAxis,
      basis: orientation.basis,
    },
    measurement: {
      metric: 'user_facing_bearing',
      value: parseFloat(facingBearing.toFixed(1)),
      unit: '°',
      geometryDetails: {
        angleDeg: parseFloat(facingBearing.toFixed(1)),
        vector: facingVecWorld,
      },
    },
    verdict: 'pass', // Geometric measurement only — no feng shui verdict without Gua
    severity: 'info',
    explanation: `Người ngồi làm việc hướng mặt về ${facingDirection} (${facingBearing.toFixed(1)}°). Đánh giá phong thủy cần kết hợp cung Mệnh người dùng (Phase P4).`,
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE DESK-WALL-01: Desk-Wall Backing Support
 *
 * Checks whether the user has a solid wall behind their back while seated.
 * Ergonomic principle: back to wall = psychological support, reduces distraction.
 * Also Feng Shui: "Minh Đường Rộng Rãi" — open view in front, solid backing behind.
 *
 * backAxis = opposite of userFacingAxis = {x:0, z:+1} in local space.
 */
export function evaluateDeskWallBacking(inputs: DeskRuleInputs): RuleResult {
  const { desk, layout } = inputs;
  const orientation = ORIENTATION_CATALOG['desk'];

  if (!orientation || !orientation.userFacingAxis) {
    return makeResult({
      ruleId: 'DESK-WALL-01',
      name: 'Tường phía sau ghế bàn làm việc',
      category: 'geometric_layout',
      school: 'general',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Thiếu orientation metadata cho desk.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không thể đánh giá tường phía sau bàn do thiếu metadata hướng.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  // Back axis = opposite of userFacingAxis
  const backAxisLocal: Vector2D = {
    x: -orientation.userFacingAxis.x,
    z: -orientation.userFacingAxis.z,
  };
  const backAxisWorld = localAxisToWorld(backAxisLocal, desk.rotation.y);

  // Back of seated person = desk center + backAxis * halfLength
  const backCenter: Vector2D = {
    x: desk.position.x + backAxisWorld.x * (desk.dimensions.length / 2 + 0.5), // 0.5m offset for chair
    z: desk.position.z + backAxisWorld.z * (desk.dimensions.length / 2 + 0.5),
  };

  const BACK_SUPPORT_MAX_GAP = 1.0; // 1m — if wall within 1m behind person, counts as backing
  let nearestBackWallDist = Infinity;
  let nearestBackWall: Wall | null = null;

  for (const wall of layout.walls) {
    if (wall.wallType === 'low_cutaway') continue;
    const wallLen = getWallLength(wall);
    const wv = getWallVector(wall);
    const toPt = { x: backCenter.x - wall.startPoint.x, z: backCenter.z - wall.startPoint.z };
    const t = Math.max(0, Math.min(wallLen, toPt.x * wv.x + toPt.z * wv.z));
    const cp = { x: wall.startPoint.x + wv.x * t, z: wall.startPoint.z + wv.z * t };
    const d = floorDist(backCenter, cp);
    if (d < nearestBackWallDist) {
      nearestBackWallDist = d;
      nearestBackWall = wall;
    }
  }

  const hasBacking = nearestBackWallDist <= BACK_SUPPORT_MAX_GAP;

  return makeResult({
    ruleId: 'DESK-WALL-01',
    name: 'Tường phía sau ghế bàn làm việc',
    category: 'geometric_layout',
    school: 'general',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    inputs: {
      deskId: desk.id,
      backAxisWorld,
      backCenterEstimate: backCenter,
    },
    measurement: {
      metric: 'back_to_nearest_wall',
      value: parseFloat(nearestBackWallDist.toFixed(2)),
      unit: 'm',
      threshold: BACK_SUPPORT_MAX_GAP,
      passed: hasBacking,
      geometryDetails: {
        point1: backCenter,
        distanceMeters: parseFloat(nearestBackWallDist.toFixed(2)),
      },
    },
    verdict: hasBacking ? 'pass' : 'warn',
    severity: hasBacking ? 'info' : 'minor',
    explanation: hasBacking
      ? `Có tường phía sau ghế cách khoảng ${nearestBackWallDist.toFixed(2)}m. Hỗ trợ tâm lý ổn định khi làm việc.`
      : `Phía sau ghế không có tường hỗ trợ trong vòng ${BACK_SUPPORT_MAX_GAP}m (cách tường gần nhất ${nearestBackWallDist.toFixed(2)}m).`,
    remedy: hasBacking
      ? undefined
      : 'Di chuyển bàn để lưng người ngồi quay về phía tường.',
    sources: ['SRC-NEUFERT-ERGONOMICS', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE DESK-DOOR-01: Desk-Door Relationship
 *
 * Checks whether the door is in front of, behind, or beside the person seated at desk.
 * Feng shui principle: ideally the person can see the door from their seat (không bị giật mình).
 * Geometric: angle between user facing vector and vector from desk to door center.
 */
export function evaluateDeskDoorRelationship(inputs: DeskRuleInputs): RuleResult {
  const { desk, layout } = inputs;
  const doors = getOpeningsByKind(layout, 'door');
  const orientation = ORIENTATION_CATALOG['desk'];

  if (doors.length === 0) {
    return makeResult({
      ruleId: 'DESK-DOOR-01',
      name: 'Bàn làm việc và cửa ra vào',
      category: 'geometric_layout',
      school: 'general',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Không tìm thấy dữ liệu cửa ra vào.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không có cửa ra vào trong layout — không thể đánh giá quan hệ bàn-cửa.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  if (!orientation?.userFacingAxis) {
    return makeResult({
      ruleId: 'DESK-DOOR-01',
      name: 'Bàn làm việc và cửa ra vào',
      category: 'geometric_layout',
      school: 'general',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Thiếu userFacingAxis cho desk.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Thiếu metadata hướng bàn.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const facingVecWorld = localAxisToWorld(orientation.userFacingAxis, desk.rotation.y);
  const anyAssumed = hasAssumedOpenings(layout);

  let minAngleDiff = 180;
  let closestDist = Infinity;
  let doorPosition: { x: number; z: number } | undefined;

  for (const { opening, wall } of doors) {
    const doorPos = getOpeningWorldPosition(opening, wall);
    const dist = floorDist(desk.position, doorPos);
    if (dist < closestDist) {
      closestDist = dist;
      doorPosition = doorPos;
    }
    const angleDiff = facingAngleDiff(desk.position, facingVecWorld, doorPos);
    if (angleDiff < minAngleDiff) minAngleDiff = angleDiff;
  }

  // Categories: front (0-60°), side (60-120°), back (120-180°)
  const doorInFront = minAngleDiff <= 60;
  const doorInBack = minAngleDiff > 120;

  let verdict: RuleResult['verdict'];
  let explanation: string;
  let remedy: string | undefined;

  if (doorInFront) {
    verdict = 'pass';
    explanation = `Cửa nằm trong tầm nhìn phía trước người ngồi (lệch ${minAngleDiff.toFixed(1)}°). Có thể quan sát cửa khi làm việc.`;
  } else if (doorInBack) {
    verdict = 'warn';
    explanation = `Cửa nằm phía sau người ngồi (lệch ${minAngleDiff.toFixed(1)}°). Không nhìn thấy cửa khi làm việc — có thể gây mất tập trung.`;
    remedy = 'Xoay bàn hoặc sử dụng gương phụ để có thể quan sát cửa ra vào.';
  } else {
    verdict = 'pass';
    explanation = `Cửa nằm bên cạnh người ngồi (lệch ${minAngleDiff.toFixed(1)}°). Vị trí trung tính.`;
  }

  if (anyAssumed) {
    explanation += ' [LƯU Ý: Dữ liệu cửa là assumed — cần xác minh vị trí thực tế.]';
  }

  return makeResult({
    ruleId: 'DESK-DOOR-01',
    name: 'Bàn làm việc và cửa ra vào',
    category: 'geometric_layout',
    school: 'general',
    applicability: 'recommended',
    dataStatus: anyAssumed ? 'insufficient' : 'sufficient',
    inputs: {
      deskId: desk.id,
      facingDirection: directionFromBearing(worldBearingOfAxis(orientation.userFacingAxis, desk.rotation.y)),
      closestDoorDistM: parseFloat(closestDist.toFixed(2)),
      anyAssumed,
    },
    measurement: {
      metric: 'user_to_door_facing_angle',
      value: parseFloat(minAngleDiff.toFixed(1)),
      unit: '°',
      threshold: 60,
      passed: !doorInBack,
      geometryDetails: {
        angleDeg: parseFloat(minAngleDiff.toFixed(1)),
        distanceMeters: parseFloat(closestDist.toFixed(2)),
        point1: { x: desk.position.x, z: desk.position.z },
        point2: doorPosition,
      },
    },
    verdict,
    severity: doorInBack ? 'minor' : 'info',
    explanation,
    remedy,
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

// =============================================================================
// GROUP 3: MIRROR RULES
// =============================================================================

export interface MirrorRuleInputs {
  mirror: RoomObject;
  layout: RoomLayout;
  allObjects: RoomObject[];
}

/**
 * RULE MIRROR-BED-01: Mirror Facing Bed
 *
 * Determines if the mirror's reflective face is oriented toward the bed.
 * Uses mirror orientation: frontAxis = {x:0, z:+1} = reflective surface faces Z+.
 * Requires OBB-based line-of-sight estimate (simple angular check).
 *
 * Feng shui principle (Loan Đầu Quang Sát): Mirror reflecting the bed is inauspicious.
 * Returns 'insufficient' if mirror orientation metadata is 'assumed'.
 */
export function evaluateMirrorBedRelationship(inputs: MirrorRuleInputs): RuleResult {
  const { mirror, allObjects } = inputs;
  const beds = allObjects.filter((o) => o.type === 'bed');

  const orientation = ORIENTATION_CATALOG['mirror'];

  if (!orientation || orientation.basis !== 'model_code') {
    return makeResult({
      ruleId: 'MIRROR-BED-01',
      name: 'Gương soi và giường ngủ',
      category: 'traditional_feng_shui',
      school: 'loan_dau',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['Mirror orientation metadata chưa được xác minh (basis != model_code).'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không thể đánh giá hướng mặt gương do metadata chưa được xác minh từ model code.',
      sources: ['SRC-LOAN-DAU-HINH-THE'],
    });
  }

  if (beds.length === 0) {
    return makeResult({
      ruleId: 'MIRROR-BED-01',
      name: 'Gương soi và giường ngủ',
      category: 'traditional_feng_shui',
      school: 'loan_dau',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['Không tìm thấy giường ngủ trong scene.'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có giường ngủ — không thể đánh giá quan hệ gương-giường.',
      sources: ['SRC-LOAN-DAU-HINH-THE'],
    });
  }

  // Mirror's reflective normal in world space
  const mirrorFrontWorld = localAxisToWorld(orientation.frontAxis, mirror.rotation.y);

  let mirrorFacesBed = false;
  let closestBedDist = Infinity;
  let minAngleDiff = 180;
  let targetBedId = '';

  for (const bed of beds) {
    const dist = floorDist(mirror.position, bed.position);
    if (dist < closestBedDist) {
      closestBedDist = dist;
      targetBedId = bed.id;
    }
    const angleDiff = facingAngleDiff(mirror.position, mirrorFrontWorld, bed.position);
    if (angleDiff < minAngleDiff) minAngleDiff = angleDiff;
    if (angleDiff <= 45) mirrorFacesBed = true; // 45° cone from reflective face
  }

  // Simple obstacle check: look for furniture between mirror and bed
  // (OBB intersection along the ray — simplified: check if any solid object center is between them)
  let hasObstacle = false;
  const mirrorBearingToBed = (() => {
    const target = beds.reduce((acc, b) => floorDist(mirror.position, b.position) < floorDist(mirror.position, acc.position) ? b : acc);
    const toTarget = { x: target.position.x - mirror.position.x, z: target.position.z - mirror.position.z };
    return toTarget;
  })();

  const mirrorBedDist = closestBedDist;
  const solidTypes = new Set(['wardrobe', 'bookshelf', 'desk', 'nightstand']);
  for (const obj of allObjects) {
    if (!solidTypes.has(obj.type)) continue;
    const dMirror = floorDist(mirror.position, obj.position);
    const dBed = floorDist(obj.position, { x: mirror.position.x + mirrorBearingToBed.x, z: mirror.position.z + mirrorBearingToBed.z });
    // Object is "between" mirror and bed if its distance to both endpoints sum ≈ mirror-bed distance
    if (dMirror < mirrorBedDist * 0.9 && dBed < mirrorBedDist * 0.9) {
      hasObstacle = true;
    }
  }

  let verdict: RuleResult['verdict'];
  let severity: RuleSeverity;
  let explanation: string;
  let remedy: string | undefined;

  if (mirrorFacesBed && !hasObstacle) {
    verdict = 'fail';
    severity = 'major';
    explanation = `Mặt kính gương hướng thẳng về giường (lệch ${minAngleDiff.toFixed(1)}°, khoảng cách ${closestBedDist.toFixed(2)}m) và không có vật cản. Nguyên lý phong thủy: gương phản chiếu giường (Quang Sát) gây bất an, ảnh hưởng giấc ngủ.`;
    remedy = 'Xoay gương để không hướng mặt phản chiếu về giường, hoặc dùng màn/vải che gương khi ngủ.';
  } else if (mirrorFacesBed && hasObstacle) {
    verdict = 'warn';
    severity = 'minor';
    explanation = `Mặt gương hướng về giường (lệch ${minAngleDiff.toFixed(1)}°) nhưng có vật cản giữa gương và giường. Rủi ro thấp hơn.`;
    remedy = 'Kiểm tra lại thực tế để xác nhận vật cản có thực sự che khuất ánh phản chiếu.';
  } else {
    verdict = 'pass';
    severity = 'info';
    explanation = `Mặt kính gương không hướng trực tiếp về giường (lệch ${minAngleDiff.toFixed(1)}°).`;
  }

  return makeResult({
    ruleId: 'MIRROR-BED-01',
    name: 'Gương soi và giường ngủ',
    category: 'traditional_feng_shui',
    school: 'loan_dau',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    inputs: {
      mirrorId: mirror.id,
      mirrorFrontAxisWorld: mirrorFrontWorld,
      targetBedId,
      closestBedDistM: parseFloat(closestBedDist.toFixed(2)),
      hasObstacle,
      basis: orientation.basis,
    },
    measurement: {
      metric: 'mirror_facing_bed_angle',
      value: parseFloat(minAngleDiff.toFixed(1)),
      unit: '°',
      threshold: 45,
      passed: !mirrorFacesBed,
      geometryDetails: {
        angleDeg: parseFloat(minAngleDiff.toFixed(1)),
        distanceMeters: parseFloat(closestBedDist.toFixed(2)),
        vector: mirrorFrontWorld,
      },
    },
    verdict,
    severity,
    explanation,
    remedy,
    sources: ['SRC-LOAN-DAU-HINH-THE', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * RULE MIRROR-ORI-01: Mirror Orientation (Normal Direction)
 *
 * Reports the world-space direction of the mirror's reflective normal.
 * Returns geometric measurement only — interpretation is context-dependent.
 * Returns 'insufficient' if orientation is not model_code verified.
 */
export function evaluateMirrorOrientation(inputs: MirrorRuleInputs): RuleResult {
  const { mirror } = inputs;
  const orientation = ORIENTATION_CATALOG['mirror'];

  if (!orientation || orientation.basis !== 'model_code') {
    return makeResult({
      ruleId: 'MIRROR-ORI-01',
      name: 'Hướng mặt phản chiếu gương',
      category: 'geometric_layout',
      school: 'loan_dau',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['Thiếu hoặc chưa xác minh orientation metadata cho gương.'],
      verdict: 'unknown',
      severity: 'minor',
      explanation: 'Không kết luận hướng gương vì orientation chưa được xác minh từ model_code.',
      sources: ['SRC-LOAN-DAU-HINH-THE'],
    });
  }

  const reflectiveFacingWorld = localAxisToWorld(orientation.frontAxis, mirror.rotation.y);
  const reflectiveBearing = worldBearingOfAxis(orientation.frontAxis, mirror.rotation.y);
  const reflectiveDirection = directionFromBearing(reflectiveBearing);

  return makeResult({
    ruleId: 'MIRROR-ORI-01',
    name: 'Hướng mặt phản chiếu gương',
    category: 'geometric_layout',
    school: 'loan_dau',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    inputs: {
      mirrorId: mirror.id,
      rotationYRad: mirror.rotation.y,
      frontAxisLocal: orientation.frontAxis,
      basis: orientation.basis,
    },
    measurement: {
      metric: 'mirror_reflective_bearing',
      value: parseFloat(reflectiveBearing.toFixed(1)),
      unit: '°',
      geometryDetails: {
        angleDeg: parseFloat(reflectiveBearing.toFixed(1)),
        vector: reflectiveFacingWorld,
      },
    },
    verdict: 'pass', // Geometric measurement only
    severity: 'info',
    explanation: `Mặt kính phản chiếu gương hướng về ${reflectiveDirection} (${reflectiveBearing.toFixed(1)}°). Đây là kết quả đo lường hình học — không phải đánh giá phong thủy độc lập.`,
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

// =============================================================================
// Main Entry Point: evaluateFurnitureRules
// =============================================================================

export interface FurnitureRuleEngineInput {
  layout: RoomLayout;
  objects: RoomObject[];
}

export interface FurnitureRuleEngineOutput {
  traditionalRules: RuleResult[];
  geometricRules: RuleResult[];
  timestamp: string;
  engineVersion: string;
  evaluatedObjectCount: number;
  ruleCount: number;
}

/**
 * Main evaluation function.
 * Evaluates all applicable rules for beds, desks, and mirrors in the scene.
 * Returns results split by category: traditional_feng_shui vs geometric_layout.
 * Does NOT mutate any input data.
 */
export function evaluateFurnitureRules(input: FurnitureRuleEngineInput): FurnitureRuleEngineOutput {
  const { layout, objects } = input;
  const allResults: RuleResult[] = [];

  // Evaluate each BED
  const beds = objects.filter((o) => o.type === 'bed');
  for (const bed of beds) {
    const bedInputs: BedRuleInputs = { bed, layout, allObjects: objects };
    allResults.push(evaluateBedHeadboardWall(bedInputs));
    allResults.push(evaluateBedDoorConflict(bedInputs));
    allResults.push(evaluateBedWindowRelationship(bedInputs));
    allResults.push(evaluateBedToiletRelationship(bedInputs));
  }

  // Evaluate each DESK
  const desks = objects.filter((o) => o.type === 'desk');
  for (const desk of desks) {
    const deskInputs: DeskRuleInputs = { desk, layout, allObjects: objects };
    allResults.push(evaluateDeskOrientation(deskInputs));
    allResults.push(evaluateDeskWallBacking(deskInputs));
    allResults.push(evaluateDeskDoorRelationship(deskInputs));
  }

  // Evaluate each MIRROR
  const mirrors = objects.filter((o) => o.type === 'mirror');
  for (const mirror of mirrors) {
    const mirrorInputs: MirrorRuleInputs = { mirror, layout, allObjects: objects };
    allResults.push(evaluateMirrorBedRelationship(mirrorInputs));
    allResults.push(evaluateMirrorOrientation(mirrorInputs));
  }

  const traditionalRules = allResults.filter((r) => r.category === 'traditional_feng_shui');
  const geometricRules = allResults.filter(
    (r) => r.category === 'geometric_layout' || r.category === 'environmental_ergonomics'
  );

  return {
    traditionalRules,
    geometricRules,
    timestamp: new Date().toISOString(),
    engineVersion: P3_ENGINE_VERSION,
    evaluatedObjectCount: beds.length + desks.length + mirrors.length,
    ruleCount: allResults.length,
  };
}

