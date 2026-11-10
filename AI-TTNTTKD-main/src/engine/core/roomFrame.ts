// =============================================================================
// src/engine/core/roomFrame.ts
// Standardized Room Spatial Reference Frame (Phase P1)
//
// DISAMBIGUATION OF ARCHITECTURAL & FENG SHUI DIRECTIONS:
// - Hướng nhà (House Direction): Hướng mặt tiền tổng thể của ngôi nhà.
// - Hướng phòng (Room Direction): Hướng tiếp giáp mặt thoáng chính hoặc ban công của phòng ngủ.
// - Hướng cửa (Door Direction): Hướng pháp tuyến đi từ trong phòng bước ra ngoài qua cửa chính.
// - Hướng đầu giường (Bed Headboard Direction): Hướng tựa của đỉnh đầu người nằm (tọa sơn của giường).
// - Hướng mặt trước đồ vật (Furniture Front Direction): Hướng mở cánh tủ, mặt ngồi bàn, mặt phản xạ gương.
//
// These concepts MUST NEVER be conflated into a single ambiguous "direction".
// =============================================================================

import { CompassDirection, RoomConfig } from '../../types/fengshui.js';
import { Vector2D, normalizeDeg, toTrueBearing } from './compass.js';

export interface RoomLocalAxes {
  readonly north: Vector2D; // { x:  0, z: -1 }
  readonly east: Vector2D;  // { x:  1, z:  0 }
  readonly south: Vector2D; // { x:  0, z:  1 }
  readonly west: Vector2D;  // { x: -1, z:  0 }
}

export const ROOM_LOCAL_AXES: RoomLocalAxes = {
  north: { x:  0, z: -1 },
  east:  { x:  1, z:  0 },
  south: { x:  0, z:  1 },
  west:  { x: -1, z:  0 },
};

export interface RoomFrame {
  /**
   * True geographic azimuth (in degrees, 0..360) of the room's local -Z axis (local North).
   * - null strictly means true North has NOT been surveyed/specified.
   * - NEVER assume 0° if null.
   */
  northBearingDeg: number | null;

  /** Dimensions in meters */
  dimensions: {
    width: number;  // X axis span
    length: number; // Z axis span
    height: number; // Y axis span
  };

  /** Hướng mặt tiền ngôi nhà */
  houseDirection?: CompassDirection;

  /** Hướng mặt thoáng chính của phòng ngủ */
  roomDirection?: CompassDirection;

  /** Hướng mở của cửa ra vào chính */
  doorDirection?: CompassDirection;
}

/**
 * Creates a standardized RoomFrame from existing RoomConfig.
 *
 * @param config Existing RoomConfig from frontend
 * @param northBearingDeg True azimuth of local North, or null if uncalibrated
 */
export function createRoomFrame(
  config: RoomConfig,
  northBearingDeg: number | null = null
): RoomFrame {
  return {
    northBearingDeg,
    dimensions: {
      width: config.width,
      length: config.length,
      height: config.height,
    },
    roomDirection: config.direction,
  };
}

/**
 * Converts a bearing measured in the room's local reference frame
 * (where local -Z is 0°) to a True Geographic Bearing.
 * Returns null if the room's true North has not been defined.
 */
export function localToTrueBearing(
  localBearingDeg: number,
  frame: RoomFrame
): number | null {
  return toTrueBearing(localBearingDeg, frame.northBearingDeg);
}

/**
 * Converts a True Geographic Bearing back into the room's local reference frame.
 * Returns null if the room's true North has not been defined.
 */
export function trueToLocalBearing(
  trueBearingDeg: number,
  frame: RoomFrame
): number | null {
  if (frame.northBearingDeg === null || frame.northBearingDeg === undefined) {
    return null;
  }
  return normalizeDeg(trueBearingDeg - frame.northBearingDeg);
}

