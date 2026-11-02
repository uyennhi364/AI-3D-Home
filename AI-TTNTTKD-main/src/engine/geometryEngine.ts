import { RoomConfig, RoomObject } from '../types/fengshui';

export interface Point2D {
  x: number;
  z: number;
}

export interface OBB2D {
  center: Point2D;
  halfWidth: number;
  halfLength: number;
  angleRad: number;
}

/**
 * Creates an Oriented Bounding Box (OBB) representation on the XZ floor plane for a room object.
 */
export function createOBBFromObject(
  position: { x: number; z: number },
  dimensions: { width: number; length: number },
  rotationY: number = 0,
  margin: number = 0
): OBB2D {
  return {
    center: { x: position.x, z: position.z },
    halfWidth: Math.max(0.05, dimensions.width / 2 - margin),
    halfLength: Math.max(0.05, dimensions.length / 2 - margin),
    angleRad: rotationY,
  };
}

/**
 * Calculates the 4 corner points of an OBB on the XZ floor plane.
 */
export function getOBBCorners(obb: OBB2D): Point2D[] {
  const cos = Math.cos(obb.angleRad);
  const sin = Math.sin(obb.angleRad);

  const hw = obb.halfWidth;
  const hl = obb.halfLength;

  const localCorners: Point2D[] = [
    { x: -hw, z: -hl },
    { x: hw, z: -hl },
    { x: hw, z: hl },
    { x: -hw, z: hl },
  ];

  return localCorners.map((pt) => ({
    x: obb.center.x + (pt.x * cos - pt.z * sin),
    z: obb.center.z + (pt.x * sin + pt.z * cos),
  }));
}

/**
 * Projects a polygon's vertices onto a 2D axis and returns the [min, max] scalar interval.
 */
function projectVerticesOntoAxis(vertices: Point2D[], axis: Point2D): [number, number] {
  let min = vertices[0].x * axis.x + vertices[0].z * axis.z;
  let max = min;

  for (let i = 1; i < vertices.length; i++) {
    const projection = vertices[i].x * axis.x + vertices[i].z * axis.z;
    if (projection < min) min = projection;
    if (projection > max) max = projection;
  }

  return [min, max];
}

/**
 * Checks if two scalar intervals [minA, maxA] and [minB, maxB] overlap.
 */
function intervalsOverlap(minA: number, maxA: number, minB: number, maxB: number): boolean {
  return maxA >= minB && maxB >= minA;
}

/**
 * Checks 2D collision between two Oriented Bounding Boxes (OBBs) using the Separating Axis Theorem (SAT).
 * Accounts for arbitrary Y-axis rotations with mathematical rigor.
 */
export function checkOBBCollision(obb1: OBB2D, obb2: OBB2D): boolean {
  const corners1 = getOBBCorners(obb1);
  const corners2 = getOBBCorners(obb2);

  // 4 separating axes to test: 2 normal axes of obb1 + 2 normal axes of obb2
  const axes: Point2D[] = [
    { x: Math.cos(obb1.angleRad), z: Math.sin(obb1.angleRad) },
    { x: -Math.sin(obb1.angleRad), z: Math.cos(obb1.angleRad) },
    { x: Math.cos(obb2.angleRad), z: Math.sin(obb2.angleRad) },
    { x: -Math.sin(obb2.angleRad), z: Math.cos(obb2.angleRad) },
  ];

  for (const axis of axes) {
    const [min1, max1] = projectVerticesOntoAxis(corners1, axis);
    const [min2, max2] = projectVerticesOntoAxis(corners2, axis);

    // If there is any axis where projections do not overlap, they do not collide
    if (!intervalsOverlap(min1, max1, min2, max2)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if all 4 corners of an OBB lie strictly inside the room floor perimeter.
 */
export function isOBBInsideRoom(
  obb: OBB2D,
  roomConfig: { width: number; length: number },
  margin: number = 0.05
): boolean {
  const halfW = roomConfig.width / 2 - margin;
  const halfL = roomConfig.length / 2 - margin;
  const corners = getOBBCorners(obb);

  for (const corner of corners) {
    if (
      corner.x < -halfW ||
      corner.x > halfW ||
      corner.z < -halfL ||
      corner.z > halfL
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Clamps the position of an object so that all of its rotated corners stay inside the room perimeter.
 */
export function clampOBBInsideRoom(
  targetPos: Point2D,
  dimensions: { width: number; length: number },
  rotationY: number,
  roomConfig: { width: number; length: number },
  margin: number = 0.08
): Point2D {
  const halfW = roomConfig.width / 2 - margin;
  const halfL = roomConfig.length / 2 - margin;

  // Compute AABB extent of the rotated OBB relative to its center
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const extentX = (dimensions.width / 2) * cos + (dimensions.length / 2) * sin;
  const extentZ = (dimensions.width / 2) * sin + (dimensions.length / 2) * cos;

  const maxAllowedX = Math.max(0, halfW - extentX);
  const maxAllowedZ = Math.max(0, halfL - extentZ);

  const clampedX = Math.min(maxAllowedX, Math.max(-maxAllowedX, targetPos.x));
  const clampedZ = Math.min(maxAllowedZ, Math.max(-maxAllowedZ, targetPos.z));

  return {
    x: Math.round(clampedX * 100) / 100,
    z: Math.round(clampedZ * 100) / 100,
  };
}

/**
 * Checks whether an object blocks the entrance door swing corridor.
 * Default door opening clearance zone is 0.9m in front of the door.
 */
export function isDoorCorridorBlocked(
  obb: OBB2D,
  roomConfig: { width: number; length: number },
  doorObj?: RoomObject
): boolean {
  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;

  // Door position: either explicit door object or standard East wall entrance
  const doorX = doorObj ? doorObj.position.x : halfW - 0.1;
  const doorZ = doorObj ? doorObj.position.z : -0.2;
  const doorWidth = doorObj ? doorObj.dimensions.width : 0.9;

  // Define door clearance OBB zone (0.9m x 0.9m in front of doorway)
  const clearanceZone: OBB2D = {
    center: {
      x: doorX > 0 ? doorX - 0.55 : doorX + 0.55,
      z: doorZ,
    },
    halfWidth: 0.45,
    halfLength: doorWidth / 2 + 0.1,
    angleRad: 0,
  };

  return checkOBBCollision(obb, clearanceZone);
}

/**
 * Comprehensive Collision and Safety Validator for placing or moving an object.
 * Returns { valid: boolean, conflictObjectId?: string, reason?: string }
 */
export function validatePlacementSafety(
  targetPos: Point2D,
  dimensions: { width: number; length: number },
  rotationY: number,
  existingObjects: RoomObject[],
  roomConfig: { width: number; length: number },
  excludeObjectId?: string,
  ignoreTypes: string[] = []
): { valid: boolean; conflictObjectId?: string; reason?: string } {
  const candidateOBB = createOBBFromObject(targetPos, dimensions, rotationY, 0.02);

  // 1. Check boundary containment
  if (!isOBBInsideRoom(candidateOBB, roomConfig, 0.05)) {
    return {
      valid: false,
      reason: 'Đồ vật vượt ra ngoài ranh giới tường phòng ngủ.',
    };
  }

  // 2. Check door corridor clearance
  const door = existingObjects.find((o) => o.type === 'door');
  if (isDoorCorridorBlocked(candidateOBB, roomConfig, door)) {
    return {
      valid: false,
      reason: 'Vị trí này chắn lối mở cửa chính của căn phòng.',
    };
  }

  // 3. Check collision with all other solid furniture
  for (const other of existingObjects) {
    if (other.id === excludeObjectId) continue;
    // Rugs, wall paintings and ceiling lights do not collide on the floor
    if (['rug', 'painting', 'curtain'].includes(other.type)) continue;
    if (ignoreTypes.includes(other.type)) continue;

    const otherOBB = createOBBFromObject(other.position, other.dimensions, other.rotation.y, 0.02);

    if (checkOBBCollision(candidateOBB, otherOBB)) {
      return {
        valid: false,
        conflictObjectId: other.id,
        reason: `Va chạm với đồ vật "${other.name}" (id: ${other.id}).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Intelligent Position Resolver.
 * When a collision or wall violation occurs, finds the nearest safe valid placement
 * using an adaptive Archimedean spiral search pattern.
 */
export function resolveSafePlacement(
  initialPos: Point2D,
  dimensions: { width: number; length: number },
  rotationY: number,
  existingObjects: RoomObject[],
  roomConfig: { width: number; length: number },
  excludeObjectId?: string
): { safePos: Point2D; resolved: boolean; attempts: number } {
  // First test if initial position is already safe
  const initialClamped = clampOBBInsideRoom(initialPos, dimensions, rotationY, roomConfig);
  const initialCheck = validatePlacementSafety(
    initialClamped,
    dimensions,
    rotationY,
    existingObjects,
    roomConfig,
    excludeObjectId
  );

  if (initialCheck.valid) {
    return { safePos: initialClamped, resolved: true, attempts: 0 };
  }

  // Adaptive radial search pattern (expanding rings from initial position)
  const stepDist = 0.2; // 20cm step
  const maxRings = 14;  // up to 2.8m search radius
  let attempts = 0;

  for (let ring = 1; ring <= maxRings; ring++) {
    const radius = ring * stepDist;
    const numSamples = Math.max(8, ring * 6);

    for (let s = 0; s < numSamples; s++) {
      attempts++;
      const angle = (s / numSamples) * Math.PI * 2;
      const testPos: Point2D = {
        x: initialClamped.x + radius * Math.cos(angle),
        z: initialClamped.z + radius * Math.sin(angle),
      };

      const clamped = clampOBBInsideRoom(testPos, dimensions, rotationY, roomConfig);
      const safety = validatePlacementSafety(
        clamped,
        dimensions,
        rotationY,
        existingObjects,
        roomConfig,
        excludeObjectId
      );

      if (safety.valid) {
        return { safePos: clamped, resolved: true, attempts };
      }
    }
  }

  // If no safe position in local radius, return initial clamped position with failure flag
  return { safePos: initialClamped, resolved: false, attempts };
}

/**
 * Intelligent Smart Placement Engine.
 * Tests multiple orientations, room strategic candidate zones, and adaptive dimensions
 * to guarantee robust 3D placement even in tightly furnished rooms.
 */
export function findSmartPlacement(
  objType: string,
  preferredDims: { width: number; length: number; height?: number },
  existingObjects: RoomObject[],
  roomConfig: { width: number; length: number },
  initialCandidatePos?: Point2D,
  excludeObjectId?: string
): {
  resolved: boolean;
  safePos: Point2D;
  dimensions: { width: number; length: number; height?: number };
  rotationY: number;
  adapted: boolean;
} {
  const candidateRotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;

  // Strategic starting anchor points across the room
  const candidateOrigins: Point2D[] = [];
  if (initialCandidatePos && (initialCandidatePos.x !== 0 || initialCandidatePos.z !== 0)) {
    candidateOrigins.push(initialCandidatePos);
  }
  candidateOrigins.push(
    { x: 0, z: -halfL * 0.4 },
    { x: 0, z: halfL * 0.3 },
    { x: 0, z: 0 },
    { x: -halfW * 0.45, z: -halfL * 0.35 },
    { x: halfW * 0.45, z: -halfL * 0.35 },
    { x: -halfW * 0.45, z: halfL * 0.35 },
    { x: halfW * 0.45, z: halfL * 0.35 }
  );

  // 1. Try preferred exact dimensions with all rotations & origins
  for (const rot of candidateRotations) {
    for (const origin of candidateOrigins) {
      const res = resolveSafePlacement(origin, preferredDims, rot, existingObjects, roomConfig, excludeObjectId);
      if (res.resolved) {
        return {
          resolved: true,
          safePos: res.safePos,
          dimensions: preferredDims,
          rotationY: rot,
          adapted: false,
        };
      }
    }
  }

  // 2. If object is a bed and room is too tight for a king/queen, try adaptive single/twin bed dimensions
  if (objType === 'bed' || objType.includes('giường')) {
    const fallbackBedDims = [
      { width: 1.2, length: 1.9, height: preferredDims.height || 0.85 },
      { width: 1.0, length: 1.9, height: preferredDims.height || 0.85 },
      { width: 0.9, length: 1.85, height: preferredDims.height || 0.8 },
    ];

    for (const fDims of fallbackBedDims) {
      for (const rot of candidateRotations) {
        for (const origin of candidateOrigins) {
          const res = resolveSafePlacement(origin, fDims, rot, existingObjects, roomConfig, excludeObjectId);
          if (res.resolved) {
            return {
              resolved: true,
              safePos: res.safePos,
              dimensions: fDims,
              rotationY: rot,
              adapted: true,
            };
          }
        }
      }
    }
  }

  // 3. If object is a desk/table/sofa and doesn't fit, try slightly streamlined dimensions
  if (['desk', 'table', 'sofa', 'wardrobe'].includes(objType)) {
    const streamlined = {
      width: Math.max(0.7, preferredDims.width * 0.85),
      length: Math.max(0.5, preferredDims.length * 0.85),
      height: preferredDims.height,
    };
    for (const rot of candidateRotations) {
      for (const origin of candidateOrigins) {
        const res = resolveSafePlacement(origin, streamlined, rot, existingObjects, roomConfig, excludeObjectId);
        if (res.resolved) {
          return {
            resolved: true,
            safePos: res.safePos,
            dimensions: streamlined,
            rotationY: rot,
            adapted: true,
          };
        }
      }
    }
  }

  return {
    resolved: false,
    safePos: initialCandidatePos || { x: 0, z: 0 },
    dimensions: preferredDims,
    rotationY: 0,
    adapted: false,
  };
}

