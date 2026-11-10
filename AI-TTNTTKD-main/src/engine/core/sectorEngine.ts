// =============================================================================
// src/engine/core/sectorEngine.ts
// Standardized Sector Division & Spatial Intersection Engine (Phase P2)
//
// SUPPORTS TWO COMPLEMENTARY FENG SHUI SECTORING METHODS:
// 1. compass_wedge_8: 8 45° radial wedges with center zone (Trung Cung) and boundary tolerance.
// 2. grid_9 (Cửu Cung 3x3): 9 rectangular zones accommodating elongated and rectangular rooms.
//
// FOOTPRINT MULTI-SECTOR ANALYSIS:
// - Evaluates all 4 corners and center point of an OBB footprint.
// - Returns all distinct sectors intersected by the object footprint.
// =============================================================================

import { CompassDirection } from '../../types/fengshui.js';
import { Vector2D, normalizeDeg, bearingOfVector, directionFromBearing } from './compass.js';
import { RoomLayout, Wall, Opening, getWallVector, getWallLength, getOpeningWorldPosition, getRoomBoundary, getRoomCenter } from './roomLayout.js';
import { OBB2D, getOBBCornersV2, checkOBBCollisionV2 } from '../geometryEngine.js';

export type SectorMethod = 'compass_wedge_8' | 'grid_9';
export type BoundaryStatus = 'definite' | 'near_boundary' | 'center_zone';

export interface SectorResult {
  sectorId: string;
  direction: CompassDirection | 'CENTER';
  centerZone: boolean;
  nearBoundary: boolean;
  boundaryStatus: BoundaryStatus;
  confidence: number; // 0.0 to 1.0
  method: SectorMethod;
  angleDeg?: number;
  distanceFromCenter?: number;
  notes?: string;
}

// Technical heuristic parameters (marked as heuristic / pending source)
export const DEFAULT_WEDGE_BOUNDARY_TOLERANCE_DEG = 2.5; // ±2.5° around 22.5°, 67.5°...
export const DEFAULT_CENTER_ZONE_RATIO = 0.15; // Inner 15% of room diagonal is Trung Cung

// =============================================================================
// 1. Compass Wedge 8 Method
// =============================================================================

/**
 * Calculates sector using 8 radial 45° compass wedges radiating from room center.
 * Features:
 * - Detects center zone (Trung Cung) so center points are not forced into an arbitrary direction.
 * - Flags nearBoundary when within tolerance of 45° dividers (22.5°, 67.5°...).
 */
export function getSectorWedge8(
  point: Vector2D,
  center: Vector2D = { x: 0, z: 0 },
  maxRadius: number = 5.0,
  boundaryToleranceDeg: number = DEFAULT_WEDGE_BOUNDARY_TOLERANCE_DEG,
  centerRadiusRatio: number = DEFAULT_CENTER_ZONE_RATIO
): SectorResult {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const dist = Math.hypot(dx, dz);
  const centerRadiusThreshold = maxRadius * centerRadiusRatio;

  // 1. Center Zone Check (Trung Cung)
  if (dist <= centerRadiusThreshold) {
    return {
      sectorId: 'CENTER',
      direction: 'CENTER',
      centerZone: true,
      nearBoundary: false,
      boundaryStatus: 'center_zone',
      confidence: 1.0,
      method: 'compass_wedge_8',
      distanceFromCenter: dist,
      notes: 'Điểm nằm trong vùng Trung Cung (tâm phòng).',
    };
  }

  // 2. Radial Bearing calculation (Clockwise: 0° is North = -Z, 90° is East = +X)
  const angleDeg = bearingOfVector({ x: dx, z: dz });
  const direction = directionFromBearing(angleDeg);

  // 3. Boundary Tolerance Check
  // Sector dividers are at 22.5 + k*45: 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5
  let minDiffToDivider = 180;
  for (let k = 0; k < 8; k++) {
    const divider = 22.5 + k * 45;
    const diff = Math.abs(angleDeg - divider);
    const circularDiff = Math.min(diff, 360 - diff);
    if (circularDiff < minDiffToDivider) {
      minDiffToDivider = circularDiff;
    }
  }

  const nearBoundary = minDiffToDivider <= boundaryToleranceDeg;
  const confidence = nearBoundary
    ? Math.max(0.5, Math.min(0.85, 0.5 + (minDiffToDivider / boundaryToleranceDeg) * 0.35))
    : 1.0;

  return {
    sectorId: `wedge_${direction}`,
    direction,
    centerZone: false,
    nearBoundary,
    boundaryStatus: nearBoundary ? 'near_boundary' : 'definite',
    confidence,
    method: 'compass_wedge_8',
    angleDeg,
    distanceFromCenter: dist,
    notes: nearBoundary
      ? `Gần ranh giới phân cung (cách ranh giới ${minDiffToDivider.toFixed(1)}°).`
      : undefined,
  };
}

// =============================================================================
// 2. Grid 9 Method (Cửu Cung 3x3)
// =============================================================================

/**
 * Calculates sector using a 3x3 rectangular grid (Cửu Cung).
 * Perfectly accommodates elongated and rectangular rooms.
 *
 * Layout:
 * Row 0 (Z < minZ + H/3): NW (col 0), N (col 1), NE (col 2)
 * Row 1 (middle):         W  (col 0), CENTER (col 1), E  (col 2)
 * Row 2 (Z > maxZ - H/3): SW (col 0), S (col 1), SE (col 2)
 */
export function getSectorGrid9(
  point: Vector2D,
  boundary: { minX: number; maxX: number; minZ: number; maxZ: number }
): SectorResult {
  const width = Math.max(0.01, boundary.maxX - boundary.minX);
  const length = Math.max(0.01, boundary.maxZ - boundary.minZ);

  // Clamp normalized coordinates to [0, 1]
  const u = Math.max(0, Math.min(1, (point.x - boundary.minX) / width));
  const v = Math.max(0, Math.min(1, (point.z - boundary.minZ) / length));

  // Determine 0, 1, 2 column and row
  const col = u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2;
  const row = v < 1 / 3 ? 0 : v < 2 / 3 ? 1 : 2;

  const GRID_MAP: Record<string, CompassDirection | 'CENTER'> = {
    '0,0': 'NW',
    '1,0': 'N',
    '2,0': 'NE',
    '0,1': 'W',
    '1,1': 'CENTER',
    '2,1': 'E',
    '0,2': 'SW',
    '1,2': 'S',
    '2,2': 'SE',
  };

  const key = `${col},${row}`;
  const direction = GRID_MAP[key] || 'CENTER';
  const isCenter = direction === 'CENTER';

  // Check proximity to grid dividing lines (1/3 and 2/3)
  const distToLineU = Math.min(Math.abs(u - 1 / 3), Math.abs(u - 2 / 3));
  const distToLineV = Math.min(Math.abs(v - 1 / 3), Math.abs(v - 2 / 3));
  const nearBoundary = distToLineU < 0.03 || distToLineV < 0.03;

  return {
    sectorId: `grid_${direction}`,
    direction,
    centerZone: isCenter,
    nearBoundary,
    boundaryStatus: isCenter ? 'center_zone' : nearBoundary ? 'near_boundary' : 'definite',
    confidence: nearBoundary ? 0.7 : 1.0,
    method: 'grid_9',
    notes: isCenter ? 'Nằm trong ô Trung Cung theo phân chia Cửu Cung 3x3.' : undefined,
  };
}

// =============================================================================
// 3. Point & Multi-Sector Analysis
// =============================================================================

/**
 * Determines the sector of a single point within a RoomLayout.
 */
export function getPointSector(
  point: Vector2D,
  layout: RoomLayout,
  method: SectorMethod = 'compass_wedge_8'
): SectorResult {
  const boundary = getRoomBoundary(layout);
  const center = getRoomCenter(layout);
  const diag = Math.hypot(boundary.maxX - boundary.minX, boundary.maxZ - boundary.minZ);

  if (method === 'grid_9') {
    return getSectorGrid9(point, boundary);
  }

  return getSectorWedge8(point, center, diag / 2);
}

/**
 * Evaluates all distinct sectors covered by an object's 2D footprint (OBB).
 * Samples all 4 corners plus the center of the bounding box to ensure
 * furniture straddling two or more sectors is accurately identified.
 */
export function getObjectSectors(
  obb: OBB2D,
  layout: RoomLayout,
  method: SectorMethod = 'compass_wedge_8'
): SectorResult[] {
  const corners = getOBBCornersV2(obb);
  const samplePoints: Vector2D[] = [
    { x: obb.center.x, z: obb.center.z }, // Center point
    ...corners,                          // 4 corners
  ];

  const seenSectors = new Map<string, SectorResult>();

  for (const pt of samplePoints) {
    const res = getPointSector(pt, layout, method);
    if (!seenSectors.has(res.direction)) {
      seenSectors.set(res.direction, res);
    }
  }

  return Array.from(seenSectors.values());
}

// =============================================================================
// 4. Polygon & Spatial Intersection Functions
// =============================================================================

/**
 * Tests if a 2D point is strictly inside a closed 2D polygon using the Ray-Casting algorithm.
 */
export function isPointInsidePolygon(point: Vector2D, polygon: Vector2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;

    const intersect = zi > point.z !== zj > point.z && point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if an object's OBB footprint is completely contained within the room polygon.
 */
export function isObjectInsideRoom(obb: OBB2D, layout: RoomLayout): boolean {
  const corners = getOBBCornersV2(obb);
  // All 4 corners must be inside the room polygon
  return corners.every((c) => isPointInsidePolygon(c, layout.polygon));
}

/**
 * Tests if an object's OBB intersects a wall segment.
 */
export function checkWallIntersection(obb: OBB2D, wall: Wall): boolean {
  const wallLen = getWallLength(wall);
  const wallV = getWallVector(wall);
  const wallBearing = bearingOfVector(wallV);
  const angleRad = (wallBearing * Math.PI) / 180;

  // Represent wall as an OBB
  const wallCenter = {
    x: (wall.startPoint.x + wall.endPoint.x) / 2,
    z: (wall.startPoint.z + wall.endPoint.z) / 2,
  };

  // OBB V2 convention: halfWidth is along local X (before rotation), halfLength along local Z.
  // angleRad = wall bearing maps the local X axis to the wall direction.
  // halfLength = wallLen/2 extends along local Z → after rotation, aligns with wall direction.
  // halfWidth = thickness/2 extends along local X → after rotation, perpendicular to wall.
  const wallOBB: OBB2D = {
    center: wallCenter,
    halfWidth: wall.thickness / 2,  // perpendicular to wall direction
    halfLength: wallLen / 2,        // along wall direction
    angleRad,
  };

  return checkOBBCollisionV2(obb, wallOBB);
}

/**
 * Tests if an object's OBB footprint intersects an opening or its swing clearance corridor.
 */
export function checkOpeningIntersection(
  obb: OBB2D,
  opening: Opening,
  wall: Wall,
  clearanceDepth: number = 0.9
): boolean {
  const pos = getOpeningWorldPosition(opening, wall);
  const v = getWallVector(wall);
  const wallBearing = bearingOfVector(v);
  const angleRad = (wallBearing * Math.PI) / 180;

  // Door swing clearance box extending into the room (inward from wall).
  // For CW polygon, inward normal of wall direction (vx, vz) is (-vz, vx).
  const inNormal = { x: -v.z, z: v.x };
  const clearanceCenter = {
    x: pos.x + inNormal.x * (clearanceDepth / 2),
    z: pos.z + inNormal.z * (clearanceDepth / 2),
  };

  // OBB V2 convention with angleRad = wall bearing:
  // - local X axis (halfWidth) → perpendicular to wall direction after rotation
  // - local Z axis (halfLength) → along wall direction after rotation
  // So: halfWidth = clearanceDepth/2 (depth perpendicular to wall),
  //     halfLength = opening.width/2 (span along wall).
  const clearanceOBB: OBB2D = {
    center: clearanceCenter,
    halfWidth: clearanceDepth / 2,
    halfLength: opening.width / 2,
    angleRad,
  };

  return checkOBBCollisionV2(obb, clearanceOBB);
}

