// =============================================================================
// src/engine/core/orientationCatalog.ts
// Standardized Orientation Catalog for 3D Furniture & Architectural Elements (P1)
//
// Every model's local coordinate frame is grounded in proceduralModels.ts.
// - basis: 'model_code' means verified directly against procedural geometry.
// - basis: 'assumed' means theoretical assumption pending CAD model verification.
// =============================================================================

import { RoomObjectType } from '../../types/fengshui.js';
import { Vector2D } from './compass.js';

export type OrientationBasis = 'model_code' | 'assumed';

export interface ObjectOrientationDefinition {
  objectType: RoomObjectType;
  nameVi: string;
  /** Primary front-facing axis in local model coordinates (usually where doors/drawers/openings face) */
  frontAxis: Vector2D;
  /** Axis pointing towards headboard/backrest if applicable */
  headAxis?: Vector2D;
  /** Axis pointing in the direction a person looks when using this furniture */
  userFacingAxis?: Vector2D;
  /** Source basis of this orientation contract */
  basis: OrientationBasis;
  /** Engineering/architectural rationale */
  notes: string;
}

export const ORIENTATION_CATALOG: Record<string, ObjectOrientationDefinition> = {
  bed: {
    objectType: 'bed',
    nameVi: 'Giường ngủ',
    // Headboard is constructed at z = -length/2 (proceduralModels.ts line 428)
    headAxis: { x: 0, z: -1 },
    // Foot of bed is at +Z
    frontAxis: { x: 0, z: 1 },
    // Sleeper lying down looks from headboard (-Z) towards foot (+Z)
    userFacingAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createBedModel: nệm trải dọc Z, tựa đầu (headboard) đặt tại Z- = (0, -1).',
  },

  wardrobe: {
    objectType: 'wardrobe',
    nameVi: 'Tủ quần áo',
    // Cabinet doors and handles face +Z (proceduralModels.ts line 561)
    frontAxis: { x: 0, z: 1 },
    // User stands in front of doors (+Z) looking into the wardrobe (-Z)
    userFacingAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createWardrobeModel: cánh tủ mở và tay nắm hướng về Z+ = (0, 1).',
  },

  desk: {
    objectType: 'desk',
    nameVi: 'Bàn làm việc',
    // Laptop screen is open facing +Z where the user sits (proceduralModels.ts line 708)
    frontAxis: { x: 0, z: 1 },
    // User seated at +Z looks towards laptop/wall in direction -Z
    userFacingAxis: { x: 0, z: -1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createDeskModel: laptop mở mặt nhìn về Z+, người ngồi tại Z+ hướng mắt về Z- = (0, -1).',
  },

  chair: {
    objectType: 'chair',
    nameVi: 'Ghế làm việc / Ghế tựa',
    // Backrest is at z = -0.06 (proceduralModels.ts line 784)
    headAxis: { x: 0, z: -1 },
    // Front edge of seat cushion faces +Z
    frontAxis: { x: 0, z: 1 },
    // User seated with back against -Z faces forwards towards +Z
    userFacingAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createChairModel: tựa lưng cong đặt tại Z-, người ngồi nhìn về Z+ = (0, 1).',
  },

  mirror: {
    objectType: 'mirror',
    nameVi: 'Gương soi',
    // Reflective glass panel is on +Z side, walnut backing and kickstand on -Z side (proceduralModels.ts lines 1036, 1052)
    frontAxis: { x: 0, z: 1 },
    userFacingAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createMirrorModel: mặt kính phản xạ hướng về Z+ = (0, 1), chân chống đứng ở Z-.',
  },

  nightstand: {
    objectType: 'nightstand',
    nameVi: 'Táp đầu giường',
    frontAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createNightstandModel: khối hộp đầu giường mặt trước hướng về Z+ = (0, 1).',
  },

  bookshelf: {
    objectType: 'bookshelf',
    nameVi: 'Kệ sách',
    // Bookshelf delegates directly to createWardrobeModel (proceduralModels.ts line 1208)
    frontAxis: { x: 0, z: 1 },
    userFacingAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createBookshelfModel: tái sử dụng cấu trúc createWardrobeModel, mặt kệ hướng về Z+ = (0, 1).',
  },

  door: {
    objectType: 'door',
    nameVi: 'Cửa ra vào',
    // Handle is placed at z = +0.045 facing inward (proceduralModels.ts line 1074)
    frontAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createDoorModel: tay nắm cửa ở Z+ = (0, 1), hướng mở vào phòng.',
  },

  window: {
    objectType: 'window',
    nameVi: 'Cửa sổ',
    // Window glass in frame, normal facing into the room along +Z
    frontAxis: { x: 0, z: 1 },
    basis: 'model_code',
    notes: 'Kiểm chứng từ createWindowModel: khung nhôm bao quanh kính, mặt hứng sáng vào phòng theo trục Z+.',
  },
};

/**
 * Retrieves the standardized orientation definition for a given room object type.
 * Returns null if the type is not registered.
 */
export function getObjectOrientation(type: string): ObjectOrientationDefinition | null {
  return ORIENTATION_CATALOG[type] || null;
}

