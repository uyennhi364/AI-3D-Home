// =============================================================================
// src/engine/core/roomLayout.ts
// Standardized Room Layout, Wall Geometry & Opening Data Model (Phase P2)
//
// DESIGN PRINCIPLES:
// - Room is modeled as a 2D floor polygon with walls, openings and beams.
// - Openings (doors/windows) are defined relative to their host Wall via offset.
// - Supports arbitrary polygons (defaults to standard rectangle).
// - Openings carry 'assumed' flag when inferred from heuristics.
// - Inward wall normals point into room interior.
// - Standard coordinate frame: North = -Z, East = +X, South = +Z, West = -X.
// =============================================================================

import { CompassDirection, RoomConfig, RoomObject } from '../../types/fengshui.js';
import { Vector2D, normalizeDeg, bearingOfVector } from './compass.js';
import { OBB2D } from '../geometryEngine.js';

export type WallType = 'solid' | 'curtain' | 'partition' | 'low_cutaway';
export type OpeningKind = 'door' | 'window';
export type OpeningSwing = 'in' | 'out' | 'slide' | 'fixed';

export interface Wall {
  id: string;
  startPoint: Vector2D;
  endPoint: Vector2D;
  height: number;
  thickness: number;
  wallType: WallType;
}

export interface Opening {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /** Distance in meters from wall.startPoint along wall vector to opening center */
  offset: number;
  width: number;
  height: number;
  /** Floor sill height (0 for standard floor doors, > 0 for windows) */
  sillHeight: number;
  swing: OpeningSwing;
  /** True if this opening was inferred by heuristics rather than user/cad specification */
  assumed: boolean;
}

export interface Beam {
  id: string;
  startPoint: Vector2D;
  endPoint: Vector2D;
  dropHeight: number; // Vertical drop from ceiling in meters
  width: number;
}

export interface RoomLayout {
  id: string;
  polygon: Vector2D[]; // Closed polygon vertices in clockwise order
  northBearingDeg: number | null; // True azimuth of local -Z axis (null if uncalibrated)
  ceilingHeight: number;
  walls: Wall[];
  openings: Opening[];
  beams: Beam[];
  roomDirection?: CompassDirection;
  houseDirection?: CompassDirection;
}

// =============================================================================
// Wall & Opening Geometric Functions
// =============================================================================

/**
 * Calculates Euclidean length of a wall segment in meters.
 */
export function getWallLength(wall: Wall): number {
  const dx = wall.endPoint.x - wall.startPoint.x;
  const dz = wall.endPoint.z - wall.startPoint.z;
  return Math.hypot(dx, dz);
}

/**
 * Computes the normalized unit direction vector from wall startPoint to endPoint.
 */
export function getWallVector(wall: Wall): Vector2D {
  const len = getWallLength(wall);
  if (len < 1e-9) return { x: 1, z: 0 };
  return {
    x: (wall.endPoint.x - wall.startPoint.x) / len,
    z: (wall.endPoint.z - wall.startPoint.z) / len,
  };
}

/**
 * Computes the inward unit normal of a wall segment (pointing into room interior).
 * For a clockwise polygon in XZ plane (North=-Z, East=+X, South=+Z, West=-X),
 * traversing walls clockwise means the interior is to the LEFT of each wall direction.
 * Left of wall direction vector (dx, dz) in XZ plane = (-dz, dx).
 */
export function getWallNormal(wall: Wall): Vector2D {
  const v = getWallVector(wall);
  // Rotate vector +90° (counter-clockwise on XZ plane) = left turn = inward for CW polygon
  // (x', z') = (-z, x)
  return { x: -v.z, z: v.x };
}

/**
 * Computes the compass bearing in degrees [0, 360) of the wall vector.
 */
export function getWallBearing(wall: Wall): number {
  const v = getWallVector(wall);
  return bearingOfVector(v);
}

/**
 * Computes the 2D world floor coordinates of an opening's center point.
 */
export function getOpeningWorldPosition(opening: Opening, wall: Wall): Vector2D {
  const v = getWallVector(wall);
  return {
    x: wall.startPoint.x + v.x * opening.offset,
    z: wall.startPoint.z + v.z * opening.offset,
  };
}

/**
 * Computes the 2D Oriented Bounding Box (OBB) footprint of an opening on the floor.
 */
export function getOpeningFootprint(opening: Opening, wall: Wall): OBB2D {
  const pos = getOpeningWorldPosition(opening, wall);
  const wallBearing = getWallBearing(wall);
  const angleRad = (wallBearing * Math.PI) / 180;

  return {
    center: { x: pos.x, z: pos.z },
    halfWidth: opening.width / 2,
    halfLength: wall.thickness / 2,
    angleRad,
  };
}

/**
 * Computes the bounding box of the room layout on the XZ plane.
 */
export function getRoomBoundary(layout: RoomLayout): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (layout.polygon.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }
  let minX = layout.polygon[0].x;
  let maxX = minX;
  let minZ = layout.polygon[0].z;
  let maxZ = minZ;

  for (let i = 1; i < layout.polygon.length; i++) {
    const pt = layout.polygon[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.z < minZ) minZ = pt.z;
    if (pt.z > maxZ) maxZ = pt.z;
  }

  return { minX, maxX, minZ, maxZ };
}

/**
 * Computes the geometric center (centroid) of the room polygon.
 */
export function getRoomCenter(layout: RoomLayout): Vector2D {
  const b = getRoomBoundary(layout);
  return {
    x: (b.minX + b.maxX) / 2,
    z: (b.minZ + b.maxZ) / 2,
  };
}

/**
 * Validates structural consistency and geometric integrity of a RoomLayout.
 */
export function validateRoomLayout(layout: RoomLayout): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (layout.polygon.length < 3) {
    errors.push('Room polygon must contain at least 3 vertices.');
  }

  if (layout.ceilingHeight <= 0) {
    errors.push(`Invalid ceiling height: ${layout.ceilingHeight}m.`);
  }

  const wallMap = new Map<string, Wall>();
  for (const w of layout.walls) {
    const len = getWallLength(w);
    if (len < 0.1) {
      errors.push(`Wall "${w.id}" length (${len.toFixed(2)}m) is below minimum (0.1m).`);
    }
    wallMap.set(w.id, w);
  }

  for (const op of layout.openings) {
    const hostWall = wallMap.get(op.wallId);
    if (!hostWall) {
      errors.push(`Opening "${op.id}" references non-existent wallId "${op.wallId}".`);
      continue;
    }
    const wallLen = getWallLength(hostWall);
    const halfW = op.width / 2;

    if (op.offset - halfW < -1e-3 || op.offset + halfW > wallLen + 1e-3) {
      errors.push(
        `Opening "${op.id}" (width ${op.width}m at offset ${op.offset.toFixed(2)}m) exceeds bounds of wall "${hostWall.id}" (length ${wallLen.toFixed(2)}m).`
      );
    }

    if (op.assumed) {
      warnings.push(`Opening "${op.id}" (${op.kind}) uses assumed/heuristic placement.`);
    }
  }

  if (layout.northBearingDeg === null) {
    warnings.push('Room layout has uncalibrated North bearing (northBearingDeg is null).');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Legacy Adapter: buildLayoutFromLegacy
// =============================================================================

/**
 * Converts legacy RoomConfig and RoomObject[] into a formal RoomLayout.
 * - Constructs rectangular perimeter walls.
 * - Extracts or infers doors and windows, marking heuristic ones as assumed: true.
 * - Preserves existing coordinates without mutating model presets.
 */
export function buildLayoutFromLegacy(
  roomConfig: RoomConfig,
  objects: RoomObject[] = []
): RoomLayout {
  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;
  const ceilingH = roomConfig.height || 2.8;
  const wallThick = 0.15;

  // 1. Polygon vertices: Clockwise starting from North-West corner
  // NW (-halfW, -halfL) -> NE (+halfW, -halfL) -> SE (+halfW, +halfL) -> SW (-halfW, +halfL)
  const polygon: Vector2D[] = [
    { x: -halfW, z: -halfL }, // Vertex 0: NW
    { x:  halfW, z: -halfL }, // Vertex 1: NE
    { x:  halfW, z:  halfL }, // Vertex 2: SE
    { x: -halfW, z:  halfL }, // Vertex 3: SW
  ];

  // 2. Rectangular Perimeter Walls (matching ThreeRoomCanvas.tsx architectural framing)
  const walls: Wall[] = [
    {
      id: 'wall_north',
      startPoint: { x: -halfW, z: -halfL },
      endPoint:   { x:  halfW, z: -halfL },
      height: ceilingH,
      thickness: wallThick,
      wallType: 'solid',
    },
    {
      id: 'wall_east',
      startPoint: { x:  halfW, z: -halfL },
      endPoint:   { x:  halfW, z:  halfL },
      height: ceilingH,
      thickness: wallThick,
      wallType: 'solid',
    },
    {
      id: 'wall_south',
      startPoint: { x:  halfW, z:  halfL },
      endPoint:   { x: -halfW, z:  halfL },
      height: 0.85, // Low cutaway wall in 3D viewport
      thickness: wallThick,
      wallType: 'low_cutaway',
    },
    {
      id: 'wall_west',
      startPoint: { x: -halfW, z:  halfL },
      endPoint:   { x: -halfW, z: -halfL },
      height: ceilingH,
      thickness: wallThick,
      wallType: 'solid',
    },
  ];

  // 3. Extract or Infer Openings (Door & Window)
  const openings: Opening[] = [];

  const doorObj = objects.find((o) => o.type === 'door');
  const windowObj = objects.find((o) => o.type === 'window');

  // Entrance Door:
  if (doorObj) {
    // Explicit door object present in scene
    // Determine closest host wall
    const wallEastLen = roomConfig.length;
    // By default door is along East wall at doorObj.position.z
    const offsetAlongEast = doorObj.position.z - (-halfL);
    openings.push({
      id: doorObj.id,
      wallId: 'wall_east',
      kind: 'door',
      offset: Math.max(0.5, Math.min(wallEastLen - 0.5, offsetAlongEast)),
      width: doorObj.dimensions.width || 0.9,
      height: doorObj.dimensions.height || 2.1,
      sillHeight: 0,
      swing: 'in',
      assumed: false,
    });
  } else {
    // Inferred from architectural default (East wall, z = -0.2m matching ThreeRoomCanvas.tsx line 841)
    const doorCenterZ = -0.2;
    const offsetEast = doorCenterZ - (-halfL);
    openings.push({
      id: 'door_entrance_inferred',
      wallId: 'wall_east',
      kind: 'door',
      offset: offsetEast,
      width: 1.0,
      height: 2.1,
      sillHeight: 0,
      swing: 'in',
      assumed: true,
    });
  }

  // Window / Balcony Door:
  if (windowObj) {
    const wallWestLen = roomConfig.length;
    // West wall runs from +halfL to -halfL, offset is distance from +halfL
    const offsetAlongWest = halfL - windowObj.position.z;
    openings.push({
      id: windowObj.id,
      wallId: 'wall_west',
      kind: 'window',
      offset: Math.max(0.5, Math.min(wallWestLen - 0.5, offsetAlongWest)),
      width: windowObj.dimensions.width || 1.4,
      height: windowObj.dimensions.height || 1.6,
      sillHeight: 0.8,
      swing: 'slide',
      assumed: false,
    });
  } else {
    // Inferred from architectural default (West wall sliding balcony door matching ThreeRoomCanvas.tsx lines 724-726)
    const westSolidLen = 2.45;
    const westDoorLen = roomConfig.length - westSolidLen;
    const westDoorCenterZ = halfL - westDoorLen / 2;
    // Distance along West wall (starts at z = +halfL)
    const offsetWest = halfL - westDoorCenterZ;
    openings.push({
      id: 'window_balcony_inferred',
      wallId: 'wall_west',
      kind: 'window',
      offset: offsetWest,
      width: Math.max(1.0, westDoorLen),
      height: ceilingH - 0.1,
      sillHeight: 0.05,
      swing: 'slide',
      assumed: true,
    });
  }

  return {
    id: `layout_${Date.now()}`,
    polygon,
    northBearingDeg: null, // Default uncalibrated; never assume 0°
    ceilingHeight: ceilingH,
    walls,
    openings,
    beams: [],
    roomDirection: roomConfig.direction,
  };
}

