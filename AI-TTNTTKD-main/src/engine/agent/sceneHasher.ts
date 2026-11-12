// =============================================================================
// src/engine/agent/sceneHasher.ts
// Phase P7 & P7.5 — Canonical Scene Serialization & Robust Version Hashing
//
// SECURITY GUARANTEE:
// - Incorporates object ID, type, position (x, y, z), rotation (x, y, z), dimensions (w, l, h).
// - Incorporates room dimensions (w, l, h), room direction, doorWall, and windowWall.
// - Incorporates walls and geometry (startPoint, endPoint, height, thickness, wallType).
// - Incorporates doors, windows, openings (offset, width, height, sillHeight, swing, assumed).
// - Canonical ordering (sorted by ID) ensures deterministic representation.
// - Any rotation-only, dimension-only, opening-only, or position-only change causes version hash mismatch.
// =============================================================================

import { RoomConfig, RoomObject } from '../../types/fengshui.js';
import { RoomLayout, buildLayoutFromLegacy } from '../core/roomLayout.js';
import crypto from 'crypto';

/**
 * Normalizes an object into a canonical, deterministic representation.
 */
function normalizeObjectForHash(obj: RoomObject) {
  return {
    id: String(obj.id),
    type: String(obj.type),
    pos: [
      Number((obj.position?.x ?? 0).toFixed(3)),
      Number((obj.position?.y ?? 0).toFixed(3)),
      Number((obj.position?.z ?? 0).toFixed(3)),
    ],
    rot: [
      Number((obj.rotation?.x ?? 0).toFixed(3)),
      Number((obj.rotation?.y ?? 0).toFixed(3)),
      Number((obj.rotation?.z ?? 0).toFixed(3)),
    ],
    dim: [
      Number((obj.dimensions?.width ?? 0).toFixed(3)),
      Number((obj.dimensions?.length ?? 0).toFixed(3)),
      Number((obj.dimensions?.height ?? 0).toFixed(3)),
    ],
  };
}

/**
 * Normalizes room configuration into a canonical representation.
 */
function normalizeRoomConfigForHash(roomConfig?: RoomConfig) {
  if (!roomConfig) {
    return { w: 5.0, l: 5.2, h: 2.8, dir: 'N' };
  }
  return {
    w: Number((roomConfig.width ?? 5.0).toFixed(3)),
    l: Number((roomConfig.length ?? 5.2).toFixed(3)),
    h: Number((roomConfig.height ?? 2.8).toFixed(3)),
    dir: String(roomConfig.direction ?? 'N'),
    doorWall: roomConfig.doorWall ? String(roomConfig.doorWall) : undefined,
    windowWall: roomConfig.windowWall ? String(roomConfig.windowWall) : undefined,
  };
}

/**
 * Normalizes a RoomLayout (walls, openings, polygon, bearings) into a canonical representation.
 */
export function normalizeLayoutForHash(layout?: RoomLayout) {
  if (!layout) return null;
  // NOTE: layout.id is intentionally excluded because it represents a runtime instance identifier
  // rather than a physical geometric property of the room.
  return {
    poly: (layout.polygon || []).map((pt) => [
      Number(pt.x.toFixed(3)),
      Number(pt.z.toFixed(3)),
    ]),
    walls: (layout.walls || [])
      .map((w) => ({
        id: String(w.id),
        s: [Number(w.startPoint.x.toFixed(3)), Number(w.startPoint.z.toFixed(3))],
        e: [Number(w.endPoint.x.toFixed(3)), Number(w.endPoint.z.toFixed(3))],
        h: Number(w.height.toFixed(3)),
        t: Number(w.thickness.toFixed(3)),
        type: String(w.wallType),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    openings: (layout.openings || [])
      .map((o) => ({
        id: String(o.id),
        wallId: String(o.wallId),
        kind: String(o.kind),
        offset: Number(o.offset.toFixed(3)),
        w: Number(o.width.toFixed(3)),
        h: Number(o.height.toFixed(3)),
        sill: Number(o.sillHeight.toFixed(3)),
        swing: String(o.swing),
        assumed: Boolean(o.assumed),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    northBearing:
      layout.northBearingDeg !== null && layout.northBearingDeg !== undefined
        ? Number(layout.northBearingDeg.toFixed(2))
        : null,
  };
}

/**
 * Computes a robust, deterministic SHA-256 scene version hash.
 * Includes object positions, rotations, dimensions, types, IDs, room bounds,
 * wall geometries, and opening positions/dimensions/swings.
 */
export function computeRobustSceneVersion(
  objects: RoomObject[],
  roomConfig?: RoomConfig,
  layout?: RoomLayout
): string {
  const normConfig = normalizeRoomConfigForHash(roomConfig);
  const normObjects = (objects || [])
    .map(normalizeObjectForHash)
    .sort((a, b) => a.id.localeCompare(b.id));

  // If layout is explicitly provided, use it; otherwise derive from roomConfig + objects
  let effectiveLayout = layout;
  if (!effectiveLayout && roomConfig) {
    try {
      effectiveLayout = buildLayoutFromLegacy(roomConfig, objects || []);
    } catch {
      // Fallback if buildLayoutFromLegacy fails
      effectiveLayout = undefined;
    }
  }

  const normLayout = effectiveLayout ? normalizeLayoutForHash(effectiveLayout) : null;

  const canonicalPayload = JSON.stringify({
    room: normConfig,
    objects: normObjects,
    layout: normLayout,
  });

  const hash = crypto.createHash('sha256').update(canonicalPayload).digest('hex').slice(0, 20);
  return `sv_${hash}`;
}

/**
 * Computes canonical hash of tool arguments to prevent argument tampering during proposal confirmation.
 */
export function computeArgsHash(args: Record<string, unknown>): string {
  // Deep sort object keys recursively
  const canonicalString = serializeCanonicalJson(args);
  return crypto.createHash('sha256').update(canonicalString).digest('hex').slice(0, 16);
}

/**
 * Recursively serializes arbitrary objects into canonical JSON strings with sorted keys.
 */
export function serializeCanonicalJson(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'number') return Number.isFinite(val) ? val.toFixed(4) : 'null';
  if (typeof val === 'boolean' || typeof val === 'string') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + val.map(serializeCanonicalJson).join(',') + ']';
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${serializeCanonicalJson((val as Record<string, unknown>)[k])}`);
    return '{' + parts.join(',') + '}';
  }
  return JSON.stringify(String(val));
}
