// =============================================================================
// src/engine/core/compass.ts
// Standardized Spatial Coordinate & Compass Engine (Phase P1)
//
// INTERNAL SPATIAL CONVENTION:
// - Bắc (North) = -Z
// - Đông (East)  = +X
// - Nam (South)  = +Z
// - Tây (West)   = -X
//
// BEARING SPECIFICATION:
// - Measured clockwise in degrees [0, 360) starting from North.
// - 0° = North, 90° = East, 180° = South, 270° = West.
// - northBearingDeg = null strictly means true North is unknown;
//   NEVER automatically fallback or default to 0°.
//
// THREE.JS ROTATION CONVENTION (around +Y axis, looking down at XZ floor):
// - x' =  x * cos(yaw) + z * sin(yaw)
// - z' = -x * sin(yaw) + z * cos(yaw)
// =============================================================================

import { CompassDirection } from '../../types/fengshui.js';

export interface Vector2D {
  x: number;
  z: number;
}

/**
 * Normalizes any angle in degrees to the range [0, 360).
 */
export function normalizeDeg(deg: number): number {
  const norm = deg % 360;
  return norm < 0 ? norm + 360 : norm === -0 ? 0 : norm;
}

/**
 * Calculates the clockwise compass bearing (in degrees, 0..360) of a 2D floor vector.
 * - (0, -1) -> 0° (North)
 * - (1, 0)  -> 90° (East)
 * - (0, 1)  -> 180° (South)
 * - (-1, 0) -> 270° (West)
 */
export function bearingOfVector(vec: Vector2D): number {
  if (Math.abs(vec.x) < 1e-12 && Math.abs(vec.z) < 1e-12) {
    return 0;
  }
  // atan2(dx, -dz): when dz = -1 (North), -dz = +1 -> atan2(0, 1) = 0°
  const rad = Math.atan2(vec.x, -vec.z);
  const deg = (rad * 180) / Math.PI;
  return normalizeDeg(deg);
}

/**
 * Rotates a 2D floor vector around the vertical Y-axis by yaw angle (in radians),
 * matching Three.js right-handed coordinate system and Matrix4.makeRotationY.
 *
 * x' =  x * cos(yaw) + z * sin(yaw)
 * z' = -x * sin(yaw) + z * cos(yaw)
 */
export function rotateByYaw(vec: Vector2D, yawRad: number): Vector2D {
  const cos = Math.cos(yawRad);
  const sin = Math.sin(yawRad);
  return {
    x: vec.x * cos + vec.z * sin,
    z: -vec.x * sin + vec.z * cos,
  };
}

/**
 * Computes the world compass bearing of a local object axis given its rotation.y (yaw in radians).
 *
 * @param localAxis Local 2D vector on XZ plane (e.g. { x: 0, z: -1 } for bed headboard)
 * @param yawRad Object rotation around Y axis in radians
 */
export function worldBearingOfAxis(localAxis: Vector2D, yawRad: number): number {
  const worldVec = rotateByYaw(localAxis, yawRad);
  return bearingOfVector(worldVec);
}

/**
 * Converts a local room bearing (where local -Z is 0°) to a True Geographic Bearing.
 * If northBearingDeg is null (unknown true North), returns null.
 *
 * @param localBearing Clockwise bearing relative to room local North (0..360)
 * @param northBearingDeg True azimuth of room's local North, or null if unknown
 */
export function toTrueBearing(localBearing: number, northBearingDeg: number | null): number | null {
  if (northBearingDeg === null || northBearingDeg === undefined) {
    return null;
  }
  return normalizeDeg(localBearing + northBearingDeg);
}

/**
 * Maps a compass bearing in degrees [0, 360) to one of the 8 standard Compass Directions.
 * Each 45-degree sector spans +/- 22.5 degrees centered on the cardinal/intercardinal direction.
 */
export function directionFromBearing(bearingDeg: number): CompassDirection {
  const norm = normalizeDeg(bearingDeg);
  if (norm >= 337.5 || norm < 22.5) return 'N';
  if (norm >= 22.5 && norm < 67.5) return 'NE';
  if (norm >= 67.5 && norm < 112.5) return 'E';
  if (norm >= 112.5 && norm < 157.5) return 'SE';
  if (norm >= 157.5 && norm < 202.5) return 'S';
  if (norm >= 202.5 && norm < 247.5) return 'SW';
  if (norm >= 247.5 && norm < 292.5) return 'W';
  return 'NW';
}

/**
 * Computes the continuous polar angle (radians) of a 2D floor pointer relative
 * to an object's center, aligned with Three.js right-handed +Y rotation.
 * Returns null if the pointer is too close to the rotation center.
 */
export function computeFloorPlanePointerAngle(
  pointerX: number,
  pointerZ: number,
  centerX: number,
  centerZ: number
): number | null {
  const dx = pointerX - centerX;
  const dz = pointerZ - centerZ;
  if (dx * dx + dz * dz < 1e-8) {
    return null;
  }
  return Math.atan2(-dz, dx);
}

/**
 * Computes the shortest-arc signed angular delta in [-PI, PI] between two angles,
 * preventing discontinuities or direction reversals when crossing +/- 180 degrees.
 */
export function computeContinuousRotationDelta(
  currentAngle: number,
  previousAngle: number
): number {
  return Math.atan2(
    Math.sin(currentAngle - previousAngle),
    Math.cos(currentAngle - previousAngle)
  );
}

