// =============================================================================
// src/engine/core/houseRoom.ts
// Standardized House & Room Spatial Orientation Model (Phase P4)
//
// DISAMBIGUATION CONTRACT:
// 1. houseFacingBearing: Azimuth where the entire house/building facade looks out.
// 2. roomFacingBearing: Azimuth of the primary light/window/balcony facade of this specific room.
// 3. mainEntranceBearing: Facing vector walking out of the building's main front door.
// 4. roomDoorBearing: Facing vector walking out of this specific room's door into hallway.
// 5. northBearingDeg: Azimuth of local North (-Z). null strictly means uncalibrated.
//
// These 5 directions MUST NEVER be conflated into a single generic "direction".
// =============================================================================

import { CompassDirection, RoomConfig } from '../../types/fengshui.js';
import { directionFromBearing } from './compass.js';

export type OrientationSource = 'compass_survey' | 'architectural_drawing' | 'assumed_cardinal';

export interface HouseRoomOrientation {
  houseId: string;
  roomId: string;

  /** True azimuth (0..360°) of the house front facade */
  houseFacingBearing: number | null;

  /** True azimuth (0..360°) of the room main window/balcony facade */
  roomFacingBearing: number | null;

  /** True azimuth (0..360°) of walking out through the main building entrance */
  mainEntranceBearing: number | null;

  /** True azimuth (0..360°) of walking out through this bedroom's door */
  roomDoorBearing: number | null;

  /** True azimuth (0..360°) of local -Z axis. null if uncalibrated. NEVER default to 0°. */
  northBearingDeg: number | null;

  orientationSource: OrientationSource;
  measurementConfidence: number; // 0.0 to 1.0
  notes?: string;
}

/**
 * Creates a HouseRoomOrientation model from explicit parameters.
 */
export function createHouseRoomOrientation(params: Partial<HouseRoomOrientation>): HouseRoomOrientation {
  return {
    houseId: params.houseId || `house_${Date.now()}`,
    roomId: params.roomId || `room_${Date.now()}`,
    houseFacingBearing: params.houseFacingBearing ?? null,
    roomFacingBearing: params.roomFacingBearing ?? null,
    mainEntranceBearing: params.mainEntranceBearing ?? null,
    roomDoorBearing: params.roomDoorBearing ?? null,
    northBearingDeg: params.northBearingDeg ?? null,
    orientationSource: params.orientationSource || 'assumed_cardinal',
    measurementConfidence: params.measurementConfidence ?? (params.northBearingDeg === null ? 0.5 : 0.9),
    notes: params.notes,
  };
}

/**
 * Converts a legacy RoomConfig to a formal HouseRoomOrientation.
 * Marks source as 'assumed_cardinal' and northBearingDeg as null unless surveyed.
 */
export function buildHouseRoomFromLegacy(
  roomConfig: RoomConfig,
  northBearingDeg: number | null = null
): HouseRoomOrientation {
  const CARDINAL_MAP: Record<CompassDirection, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };

  const nominalBearing = roomConfig.direction ? CARDINAL_MAP[roomConfig.direction] : null;

  return {
    houseId: 'legacy_house',
    roomId: 'legacy_room',
    houseFacingBearing: null, // Legacy RoomConfig only specifies room direction, NOT whole house direction
    roomFacingBearing: nominalBearing,
    mainEntranceBearing: null,
    roomDoorBearing: null,
    northBearingDeg, // Preserves null if uncalibrated
    orientationSource: 'assumed_cardinal',
    measurementConfidence: northBearingDeg === null ? 0.5 : 0.85,
    notes: 'Khởi tạo từ RoomConfig legacy: Hướng nhà và hướng cửa chính chưa được xác định riêng biệt.',
  };
}

/**
 * Resolves the compass direction category ('N', 'SE', etc.) from an azimuth, or null if uncalibrated.
 */
export function getDirectionCategory(bearing: number | null): CompassDirection | null {
  if (bearing === null || bearing === undefined || isNaN(bearing)) {
    return null;
  }
  return directionFromBearing(bearing);
}

