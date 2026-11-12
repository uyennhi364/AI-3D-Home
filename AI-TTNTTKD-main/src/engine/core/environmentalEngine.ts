// =============================================================================
// src/engine/core/environmentalEngine.ts
// Phase P6 — Environmental & Ergonomics Assessment Engine
//
// DESIGN PRINCIPLES:
// - Pure functions: NO scene mutation.
// - Groups: A (Lighting), B (Ventilation), C (Circulation), D (Ergonomics), E (Data Quality).
// - Never infer lux values from 3D geometry.
// - Never claim cross-ventilation unless geometry explicitly supports it.
// - 'assumed' openings → dataStatus 'insufficient', verdict 'unknown'.
// - Missing operability metadata → flag 'insufficient' for ventilation rules.
// - V2 Three.js rotation convention throughout.
// =============================================================================

import { RoomObject } from '../../types/fengshui.js';
import { RuleResult } from './ruleTypes.js';
import { RoomLayout, Wall, Opening, getWallNormal, getWallVector, getWallLength, getOpeningWorldPosition } from './roomLayout.js';
import { OBB2D, getOBBCornersV2, checkOBBCollisionV2 } from '../geometryEngine.js';
import { Vector2D, rotateByYaw } from './compass.js';
import { ORIENTATION_CATALOG } from './orientationCatalog.js';
import { ENVIRONMENTAL_THRESHOLDS } from './environmentalConfig.js';

export const P6_ENGINE_VERSION = '6.0.0-p6';

// =============================================================================
// Internal helpers
// =============================================================================

function makeResult(partial: Omit<RuleResult, 'engineVersion'>): RuleResult {
  return { ...partial, engineVersion: P6_ENGINE_VERSION };
}

/** Build OBB2D from RoomObject using V2 convention */
function buildOBB(obj: RoomObject, margin = 0): OBB2D {
  return {
    center: { x: obj.position.x, z: obj.position.z },
    halfWidth: Math.max(0.05, obj.dimensions.width / 2 - margin),
    halfLength: Math.max(0.05, obj.dimensions.length / 2 - margin),
    angleRad: obj.rotation.y,
  };
}

/** Build a rectangular OBB2D from center, half-extents, angle */
function makeZoneOBB(cx: number, cz: number, hw: number, hl: number, angleRad = 0): OBB2D {
  return { center: { x: cx, z: cz }, halfWidth: hw, halfLength: hl, angleRad };
}

/** Shoelace formula for polygon area */
function polygonArea(pts: Vector2D[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].z;
    area -= pts[j].x * pts[i].z;
  }
  return Math.abs(area) / 2;
}

/** Get wall for an opening (null if wallId not found) */
function getWallForOpening(layout: RoomLayout, opening: Opening): Wall | null {
  return layout.walls.find((w) => w.id === opening.wallId) ?? null;
}

/** Get all windows (kind==='window'), skipping assumed if requested */
function getWindows(layout: RoomLayout, skipAssumed = false): Array<{ opening: Opening; wall: Wall }> {
  return layout.openings.flatMap((op) => {
    if (op.kind !== 'window') return [];
    if (skipAssumed && op.assumed) return [];
    const wall = getWallForOpening(layout, op);
    if (!wall) return [];
    return [{ opening: op, wall }];
  });
}

/** Get all openings (door + window) */
function getAllOpenings(layout: RoomLayout): Array<{ opening: Opening; wall: Wall }> {
  return layout.openings.flatMap((op) => {
    const wall = getWallForOpening(layout, op);
    if (!wall) return [];
    return [{ opening: op, wall }];
  });
}

/** Check if any furniture OBB overlaps a zone OBB */
function anyFurnitureOverlapsZone(
  objects: RoomObject[],
  zone: OBB2D,
  excludeTypes: string[] = ['door', 'window']
): boolean {
  for (const obj of objects) {
    if (excludeTypes.includes(obj.type)) continue;
    if (checkOBBCollisionV2(buildOBB(obj), zone)) return true;
  }
  return false;
}

/** Minimum distance between two OBB2Ds (approximate: corner-to-corner) */
function minOBBDistance(a: OBB2D, b: OBB2D): number {
  const cornersA = getOBBCornersV2(a);
  const cornersB = getOBBCornersV2(b);
  let minDist = Infinity;
  for (const ca of cornersA) {
    for (const cb of cornersB) {
      const d = Math.hypot(ca.x - cb.x, ca.z - cb.z);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

// =============================================================================
// GROUP A — LIGHTING
// =============================================================================

/**
 * ENV-LIGHT-01: Window-to-Floor Ratio
 * Checks whether the total window area meets the minimum ratio of floor area.
 */
export function evaluateWindowFloorRatio(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const floorArea = polygonArea(layout.polygon);
  const allWindows = layout.openings.filter((o) => o.kind === 'window');
  const assumedWindows = allWindows.filter((o) => o.assumed);
  const confirmedWindows = allWindows.filter((o) => !o.assumed);

  if (allWindows.length === 0) {
    return makeResult({
      ruleId: 'ENV-LIGHT-01',
      name: 'Tỷ lệ cửa sổ / diện tích sàn',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['window_openings'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có cửa sổ nào được định nghĩa trong bố cục phòng. Không thể đánh giá tỷ lệ chiếu sáng tự nhiên.',
      remedy: 'Thêm cửa sổ vào tường phòng để đánh giá chính xác hơn.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  if (confirmedWindows.length === 0 && assumedWindows.length > 0) {
    return makeResult({
      ruleId: 'ENV-LIGHT-01',
      name: 'Tỷ lệ cửa sổ / diện tích sàn',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_window_dimensions'],
      verdict: 'unknown',
      severity: 'major',
      explanation: `Có ${assumedWindows.length} cửa sổ được suy luận tự động (assumed: true). Kích thước chưa được xác nhận — không thể tính tỷ lệ chính xác.`,
      remedy: 'Nhập kích thước cửa sổ thực tế (chiều rộng, chiều cao) từ bản vẽ mặt bằng.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  // Use only confirmed windows for the ratio
  const totalWindowArea = confirmedWindows.reduce((sum, w) => sum + w.width * w.height, 0);
  const ratio = floorArea > 0 ? totalWindowArea / floorArea : 0;

  const thresholdMin = ENVIRONMENTAL_THRESHOLDS.WINDOW_FLOOR_RATIO_MIN.value;
  const thresholdWarn = ENVIRONMENTAL_THRESHOLDS.WINDOW_FLOOR_RATIO_WARN.value;

  let verdict: RuleResult['verdict'];
  let severity: RuleResult['severity'];
  let explanation: string;
  let remedy: string | undefined;

  if (ratio >= thresholdMin) {
    verdict = 'pass';
    severity = 'minor';
    explanation = `Tỷ lệ cửa sổ/sàn = ${(ratio * 100).toFixed(1)}% ≥ ${(thresholdMin * 100).toFixed(0)}% — đạt yêu cầu chiếu sáng tự nhiên.`;
  } else if (ratio >= thresholdWarn) {
    verdict = 'warn';
    severity = 'major';
    explanation = `Tỷ lệ cửa sổ/sàn = ${(ratio * 100).toFixed(1)}% nằm trong khoảng cảnh báo (${(thresholdWarn * 100).toFixed(0)}%–${(thresholdMin * 100).toFixed(0)}%) — chiếu sáng tự nhiên hạn chế.`;
    remedy = 'Cân nhắc mở thêm cửa sổ hoặc tăng kích thước cửa sổ hiện có để cải thiện lượng ánh sáng tự nhiên.';
  } else {
    verdict = 'fail';
    severity = 'major';
    explanation = `Tỷ lệ cửa sổ/sàn = ${(ratio * 100).toFixed(1)}% < ${(thresholdWarn * 100).toFixed(0)}% — chiếu sáng tự nhiên nghiêm trọng thiếu hụt.`;
    remedy = 'Cần thêm hoặc mở rộng đáng kể diện tích cửa sổ. Cân nhắc cửa trời (skylight) nếu tường bị hạn chế.';
  }

  const hasAssumed = assumedWindows.length > 0;
  const dataStatus: RuleResult['dataStatus'] = hasAssumed ? 'insufficient' : 'sufficient';

  return makeResult({
    ruleId: 'ENV-LIGHT-01',
    name: 'Tỷ lệ cửa sổ / diện tích sàn',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'mandatory',
    dataStatus,
    missingInputs: hasAssumed ? ['confirmed_window_dimensions'] : undefined,
    inputs: { confirmedWindows: confirmedWindows.length, assumedWindows: assumedWindows.length, floorAreaM2: floorArea },
    measurement: {
      metric: 'window_to_floor_ratio',
      value: parseFloat((ratio).toFixed(4)),
      unit: 'm²/m²',
      threshold: thresholdMin,
      passed: verdict === 'pass',
    },
    verdict,
    severity,
    explanation: hasAssumed
      ? explanation + ` (Lưu ý: ${assumedWindows.length} cửa sổ suy luận chưa tính vào.)`
      : explanation,
    remedy,
    sources: ['SRC-TCVN-4451-2012'],
  });
}

/**
 * ENV-LIGHT-02: Window Orientation (compass bearing of wall normal)
 * Reports geometric measurement only — does NOT infer solar gain or lux.
 */
export function evaluateWindowOrientation(layout: RoomLayout): RuleResult {
  const confirmedWindows = getWindows(layout, true);

  if (confirmedWindows.length === 0) {
    return makeResult({
      ruleId: 'ENV-LIGHT-02',
      name: 'Hướng cửa sổ (phương vị)',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_windows'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Không có cửa sổ được xác nhận — không thể xác định hướng chiếu sáng.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  if (layout.northBearingDeg === null) {
    // Can only report local room direction, not true compass bearing
    const wallBearings = confirmedWindows.map(({ opening, wall }) => {
      const normal = getWallNormal(wall);
      // Local room bearing: N=-Z → 0°, E=+X → 90°
      const localBearingDeg = (Math.atan2(normal.x, -normal.z) * 180 / Math.PI + 360) % 360;
      return { openingId: opening.id, localBearingDeg: parseFloat(localBearingDeg.toFixed(1)) };
    });

    return makeResult({
      ruleId: 'ENV-LIGHT-02',
      name: 'Hướng cửa sổ (phương vị)',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['northBearingDeg'],
      inputs: { windowBearingsLocal: wallBearings },
      verdict: 'unknown',
      severity: 'info',
      explanation: `Chưa có số đo la bàn thực tế (northBearingDeg = null). Hướng cửa sổ chỉ có thể báo cáo theo hệ tọa độ nội bộ phòng 3D. Cần dùng la bàn để xác định phương vị thực.`,
      remedy: 'Nhập giá trị northBearingDeg từ la bàn số hoặc bản đồ để có hướng cửa sổ chính xác.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  // With calibrated north, compute true compass bearing of each window's wall outward normal
  const windowDirections = confirmedWindows.map(({ opening, wall }) => {
    const inwardNormal = getWallNormal(wall);
    // Outward normal (away from room = towards outside) is opposite of inward
    const outwardNormal = { x: -inwardNormal.x, z: -inwardNormal.z };
    // Local room bearing of outward normal
    const localBearingDeg = (Math.atan2(outwardNormal.x, -outwardNormal.z) * 180 / Math.PI + 360) % 360;
    // True compass bearing = local + northBearingDeg offset
    const trueBearingDeg = (localBearingDeg + (layout.northBearingDeg ?? 0)) % 360;
    return {
      openingId: opening.id,
      localBearingDeg: parseFloat(localBearingDeg.toFixed(1)),
      trueBearingDeg: parseFloat(trueBearingDeg.toFixed(1)),
    };
  });

  return makeResult({
    ruleId: 'ENV-LIGHT-02',
    name: 'Hướng cửa sổ (phương vị)',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'optional',
    dataStatus: 'sufficient',
    inputs: { northBearingDeg: layout.northBearingDeg, windowCount: confirmedWindows.length },
    measurement: {
      metric: 'window_true_bearing_deg',
      value: windowDirections.map((w) => w.trueBearingDeg).join(', '),
      unit: '°',
    },
    verdict: 'pass',
    severity: 'info',
    explanation: `Đã xác định phương vị thực của ${confirmedWindows.length} cửa sổ. Lưu ý: đánh giá này chỉ ghi nhận hướng hình học — không tính toán lux thực tế hay bức xạ mặt trời.`,
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * ENV-LIGHT-03: Window Obstruction Check
 * Checks if large furniture blocks the zone in front of windows (depth 0.5m inward).
 */
export function evaluateWindowObstruction(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const confirmedWindows = getWindows(layout, true);

  if (confirmedWindows.length === 0) {
    return makeResult({
      ruleId: 'ENV-LIGHT-03',
      name: 'Vật cản trước cửa sổ',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_windows'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Không có cửa sổ được xác nhận — không thể kiểm tra vật cản.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const zoneDepth = ENVIRONMENTAL_THRESHOLDS.WINDOW_OBSTRUCTION_ZONE_DEPTH.value;
  const obstructedWindows: string[] = [];

  for (const { opening, wall } of confirmedWindows) {
    const pos = getOpeningWorldPosition(opening, wall);
    const inwardNormal = getWallNormal(wall);
    // Zone center is 0.5m * 0.5 = 0.25m inward from wall
    const zoneCenterX = pos.x + inwardNormal.x * (zoneDepth / 2);
    const zoneCenterZ = pos.z + inwardNormal.z * (zoneDepth / 2);

    // Zone OBB: width = opening.width, length = zoneDepth
    // Align zone OBB angle to wall direction
    const wallVec = getWallVector(wall);
    const wallAngle = Math.atan2(wallVec.x, wallVec.z);

    const zone = makeZoneOBB(
      zoneCenterX,
      zoneCenterZ,
      opening.width / 2,
      zoneDepth / 2,
      wallAngle
    );

    if (anyFurnitureOverlapsZone(objects, zone)) {
      obstructedWindows.push(opening.id);
    }
  }

  const count = obstructedWindows.length;
  const total = confirmedWindows.length;

  if (count === 0) {
    return makeResult({
      ruleId: 'ENV-LIGHT-03',
      name: 'Vật cản trước cửa sổ',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      measurement: { metric: 'obstructed_windows', value: 0, unit: 'cửa', threshold: 0, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Không có vật thể nào cản quang trước ${total} cửa sổ (vùng kiểm tra ${zoneDepth}m).`,
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  return makeResult({
    ruleId: 'ENV-LIGHT-03',
    name: 'Vật cản trước cửa sổ',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    measurement: { metric: 'obstructed_windows', value: count, unit: 'cửa', threshold: 0, passed: false },
    verdict: count === total ? 'fail' : 'warn',
    severity: 'major',
    explanation: `${count}/${total} cửa sổ bị nội thất cản trước (trong vùng ${zoneDepth}m): [${obstructedWindows.join(', ')}]. Ánh sáng tự nhiên bị giảm đáng kể.`,
    remedy: 'Dời hoặc thay thế nội thất cao (tủ đứng, giá sách) ra khỏi vùng 0.5m trước cửa sổ.',
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

// =============================================================================
// GROUP B — VENTILATION
// =============================================================================

/**
 * ENV-VENT-01: Operable Window Count
 * Counts non-fixed windows; flags when operability metadata is missing.
 */
export function evaluateVentilationOpenings(layout: RoomLayout): RuleResult {
  const allWindows = layout.openings.filter((o) => o.kind === 'window');

  if (allWindows.length === 0) {
    return makeResult({
      ruleId: 'ENV-VENT-01',
      name: 'Số cửa sổ có thể mở',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['window_openings'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có cửa sổ nào được định nghĩa — không thể đánh giá thông gió tự nhiên.',
      remedy: 'Thêm thông tin cửa sổ vào bố cục phòng.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  // Check if swing metadata is meaningful (not all assumed, and swing is defined)
  const confirmedWindows = allWindows.filter((o) => !o.assumed);
  const hasSwingMetadata = confirmedWindows.length > 0;

  if (!hasSwingMetadata) {
    return makeResult({
      ruleId: 'ENV-VENT-01',
      name: 'Số cửa sổ có thể mở',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['window_operability_metadata'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Tất cả cửa sổ đều là suy luận (assumed: true) — không có metadata kiểu mở/cố định. Không thể phân biệt cửa sổ cố định và cửa sổ có thể mở.',
      remedy: 'Nhập thông tin swing (in/out/slide/fixed) cho từng cửa sổ.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  const operableWindows = confirmedWindows.filter((o) => o.swing !== 'fixed');
  const fixedWindows = confirmedWindows.filter((o) => o.swing === 'fixed');

  if (operableWindows.length === 0) {
    return makeResult({
      ruleId: 'ENV-VENT-01',
      name: 'Số cửa sổ có thể mở',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      inputs: { total: confirmedWindows.length, operable: 0, fixed: fixedWindows.length },
      measurement: { metric: 'operable_windows', value: 0, unit: 'cửa', threshold: 1, passed: false },
      verdict: 'fail',
      severity: 'major',
      explanation: `Tất cả ${fixedWindows.length} cửa sổ đều cố định (swing: 'fixed') — không có cửa sổ nào có thể mở để thông gió tự nhiên.`,
      remedy: 'Lắp đặt ít nhất một cửa sổ có thể mở hoặc hệ thống thông gió cơ học bù đắp.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  return makeResult({
    ruleId: 'ENV-VENT-01',
    name: 'Số cửa sổ có thể mở',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    inputs: { total: confirmedWindows.length, operable: operableWindows.length, fixed: fixedWindows.length },
    measurement: { metric: 'operable_windows', value: operableWindows.length, unit: 'cửa', threshold: 1, passed: true },
    verdict: 'pass',
    severity: 'minor',
    explanation: `Có ${operableWindows.length}/${confirmedWindows.length} cửa sổ có thể mở — đáp ứng điều kiện thông gió tự nhiên cơ bản.`,
    sources: ['SRC-TCVN-4451-2012'],
  });
}

/**
 * ENV-VENT-02: Cross Ventilation Potential
 * Checks if openings exist on 2+ different walls (necessary — not sufficient — for cross ventilation).
 * Labels as "potential" only, never "verified_airflow".
 */
export function evaluateCrossVentilationPotential(layout: RoomLayout): RuleResult {
  // Collect all non-fixed openings from confirmed sources
  const operableOpenings = layout.openings.filter(
    (o) => !o.assumed && o.swing !== 'fixed'
  );

  if (operableOpenings.length === 0) {
    return makeResult({
      ruleId: 'ENV-VENT-02',
      name: 'Tiềm năng thông gió chéo',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['operable_openings'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có lỗ mở có thể vận hành được xác nhận — không thể đánh giá tiềm năng thông gió chéo.',
      remedy: 'Thêm cửa ra vào hoặc cửa sổ có thể mở trên ít nhất hai tường đối diện.',
      sources: ['SRC-TCVN-4451-2012', 'SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  // Group by wallId
  const wallIds = new Set(operableOpenings.map((o) => o.wallId));
  const wallCount = wallIds.size;

  if (wallCount < 2) {
    return makeResult({
      ruleId: 'ENV-VENT-02',
      name: 'Tiềm năng thông gió chéo',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      inputs: { openingsOnDistinctWalls: wallCount, totalOperableOpenings: operableOpenings.length },
      measurement: { metric: 'walls_with_operable_openings', value: wallCount, unit: 'tường', threshold: 2, passed: false },
      verdict: 'fail',
      severity: 'major',
      explanation: `Tất cả ${operableOpenings.length} lỗ mở đều nằm trên cùng một tường — không có tiềm năng thông gió chéo tự nhiên.`,
      remedy: 'Thêm cửa sổ hoặc cửa ra vào có thể mở trên tường đối diện hoặc tường bên.',
      sources: ['SRC-TCVN-4451-2012', 'SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const northNote = layout.northBearingDeg === null
    ? ' (Hướng gió thực tế chưa xác định — northBearingDeg = null.)'
    : '';

  return makeResult({
    ruleId: 'ENV-VENT-02',
    name: 'Tiềm năng thông gió chéo',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'recommended',
    dataStatus: layout.northBearingDeg === null ? 'insufficient' : 'sufficient',
    missingInputs: layout.northBearingDeg === null ? ['northBearingDeg'] : undefined,
    inputs: { openingsOnDistinctWalls: wallCount, totalOperableOpenings: operableOpenings.length },
    measurement: { metric: 'walls_with_operable_openings', value: wallCount, unit: 'tường', threshold: 2, passed: true },
    verdict: 'pass',
    severity: 'minor',
    explanation: `Có lỗ mở có thể vận hành trên ${wallCount} tường khác nhau — tiềm năng thông gió chéo về mặt hình học.${northNote} Lưu ý: đây là điều kiện cần, không phải đủ cho thông gió chéo thực tế.`,
    sources: ['SRC-TCVN-4451-2012', 'SRC-HEURISTIC-STUDIO-V1'],
  });
}

/**
 * ENV-VENT-03: Ventilation Obstruction
 * Checks if large furniture blocks the zone (0.9m) in front of any opening.
 */
export function evaluateVentilationObstruction(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const confirmedOpenings = getAllOpenings(layout).filter(({ opening }) => !opening.assumed);

  if (confirmedOpenings.length === 0) {
    return makeResult({
      ruleId: 'ENV-VENT-03',
      name: 'Vật cản trước lỗ thông gió',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_openings'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Không có lỗ mở được xác nhận — không thể kiểm tra vật cản thông gió.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  const zoneDepth = ENVIRONMENTAL_THRESHOLDS.VENTILATION_OBSTRUCTION_ZONE_DEPTH.value;
  const obstructed: string[] = [];

  for (const { opening, wall } of confirmedOpenings) {
    const pos = getOpeningWorldPosition(opening, wall);
    const inwardNormal = getWallNormal(wall);
    const zoneCenterX = pos.x + inwardNormal.x * (zoneDepth / 2);
    const zoneCenterZ = pos.z + inwardNormal.z * (zoneDepth / 2);
    const wallVec = getWallVector(wall);
    const wallAngle = Math.atan2(wallVec.x, wallVec.z);
    const zone = makeZoneOBB(zoneCenterX, zoneCenterZ, opening.width / 2, zoneDepth / 2, wallAngle);

    if (anyFurnitureOverlapsZone(objects, zone)) {
      obstructed.push(opening.id);
    }
  }

  const count = obstructed.length;
  const total = confirmedOpenings.length;

  if (count === 0) {
    return makeResult({
      ruleId: 'ENV-VENT-03',
      name: 'Vật cản trước lỗ thông gió',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      measurement: { metric: 'obstructed_openings', value: 0, unit: 'lỗ mở', threshold: 0, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Không có vật thể nào cản thông gió trước ${total} lỗ mở (vùng kiểm tra ${zoneDepth}m).`,
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    });
  }

  return makeResult({
    ruleId: 'ENV-VENT-03',
    name: 'Vật cản trước lỗ thông gió',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    measurement: { metric: 'obstructed_openings', value: count, unit: 'lỗ mở', threshold: 0, passed: false },
    verdict: count === total ? 'fail' : 'warn',
    severity: 'major',
    explanation: `${count}/${total} lỗ mở bị nội thất cản trong vùng ${zoneDepth}m: [${obstructed.join(', ')}]. Luồng không khí bị hạn chế.`,
    remedy: 'Dời nội thất cao (tủ, giá sách, kệ) ra khỏi vùng 0.9m trước cửa và cửa sổ.',
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  });
}

// =============================================================================
// GROUP C — CIRCULATION
// =============================================================================

/**
 * ERG-CIRC-01: Main Walkway Clearance
 * Measures minimum clearance between pairs of furniture facing each other.
 * Uses OBB corner-to-corner minimum distance as approximation.
 */
export function evaluateMainWalkwayClearance(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const solidObjects = objects.filter(
    (o) => !['door', 'window', 'plant'].includes(o.type)
  );

  if (solidObjects.length < 2) {
    return makeResult({
      ruleId: 'ERG-CIRC-01',
      name: 'Khoảng trống lối đi chính',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['multiple_furniture_objects'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Cần ít nhất 2 vật thể nội thất để đánh giá khoảng thông thủy lối đi.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  const threshold = ENVIRONMENTAL_THRESHOLDS.MAIN_WALKWAY_MIN.value;
  let minClearance = Infinity;
  let minPair: [string, string] | null = null;

  for (let i = 0; i < solidObjects.length; i++) {
    for (let j = i + 1; j < solidObjects.length; j++) {
      const obbA = buildOBB(solidObjects[i]);
      const obbB = buildOBB(solidObjects[j]);
      // If OBBs overlap, clearance = 0
      if (checkOBBCollisionV2(obbA, obbB)) {
        if (minClearance > 0) {
          minClearance = 0;
          minPair = [solidObjects[i].id, solidObjects[j].id];
        }
        continue;
      }
      const dist = minOBBDistance(obbA, obbB);
      if (dist < minClearance) {
        minClearance = dist;
        minPair = [solidObjects[i].id, solidObjects[j].id];
      }
    }
  }

  const passed = minClearance >= threshold;
  const warn = minClearance >= ENVIRONMENTAL_THRESHOLDS.SECONDARY_WALKWAY_MIN.value;

  let verdict: RuleResult['verdict'];
  let severity: RuleResult['severity'];
  let explanation: string;
  let remedy: string | undefined;

  if (passed) {
    verdict = 'pass';
    severity = 'minor';
    explanation = `Khoảng thông thủy tối thiểu giữa các nội thất = ${minClearance.toFixed(2)}m ≥ ${threshold}m — đủ lối đi chính.`;
  } else if (warn) {
    verdict = 'warn';
    severity = 'major';
    explanation = `Khoảng thông thủy tối thiểu = ${minClearance.toFixed(2)}m (giữa [${minPair?.join(', ')}]) — dưới ngưỡng lối đi chính 0.9m nhưng trên 0.6m.`;
    remedy = 'Dời nội thất để tạo lối đi rộng ít nhất 0.9m.';
  } else {
    verdict = 'fail';
    severity = 'critical';
    explanation = `Khoảng thông thủy tối thiểu = ${minClearance.toFixed(2)}m (giữa [${minPair?.join(', ')}]) — quá hẹp để di chuyển an toàn (cần ≥ 0.9m).`;
    remedy = 'Cần sắp xếp lại nội thất để đảm bảo lối đi chính rộng ≥ 0.9m theo TCVN 4451:2012.';
  }

  return makeResult({
    ruleId: 'ERG-CIRC-01',
    name: 'Khoảng trống lối đi chính',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    inputs: { solidObjectCount: solidObjects.length },
    measurement: {
      metric: 'min_furniture_clearance',
      value: parseFloat(minClearance.toFixed(3)),
      unit: 'm',
      threshold,
      passed,
    },
    verdict,
    severity,
    explanation,
    remedy,
    sources: ['SRC-TCVN-4451-2012'],
  });
}

/**
 * ERG-CIRC-02: Door Swing Clearance
 * For hinged doors (swing: 'in'|'out'), checks that the swing arc zone is clear of furniture.
 * Sliding doors (swing: 'slide') are skipped.
 * Fixed openings (swing: 'fixed') are skipped.
 */
export function evaluateDoorSwingClearance(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const doors = layout.openings.filter((o) => o.kind === 'door' && !o.assumed);

  if (doors.length === 0) {
    return makeResult({
      ruleId: 'ERG-CIRC-02',
      name: 'Khoảng thông thủy vung cánh cửa',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_door_openings'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Không có cửa ra vào được xác nhận — không thể đánh giá vùng vung cánh.',
      remedy: 'Nhập thông tin cửa ra vào (vị trí, kiểu mở) vào bố cục phòng.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  const hingedDoors = doors.filter((o) => o.swing === 'in' || o.swing === 'out');
  const slidingDoors = doors.filter((o) => o.swing === 'slide');
  const unknownSwingDoors = doors.filter((o) => o.swing === 'fixed');

  if (hingedDoors.length === 0 && unknownSwingDoors.length > 0) {
    return makeResult({
      ruleId: 'ERG-CIRC-02',
      name: 'Khoảng thông thủy vung cánh cửa',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'insufficient',
      missingInputs: ['door_swing_direction'],
      verdict: 'unknown',
      severity: 'major',
      explanation: 'Có cửa nhưng không xác định được kiểu mở (swing metadata chưa rõ). Không thể kiểm tra vùng vung cánh.',
      remedy: 'Nhập hướng mở cửa (mở vào/ra/trượt) cho từng cửa.',
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  if (hingedDoors.length === 0) {
    // Only sliding doors — no swing arc needed
    return makeResult({
      ruleId: 'ERG-CIRC-02',
      name: 'Khoảng thông thủy vung cánh cửa',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      inputs: { slidingDoors: slidingDoors.length },
      verdict: 'n/a',
      severity: 'info',
      explanation: `Tất cả ${slidingDoors.length} cửa đều là cửa trượt (slide) — không cần vùng vung cánh.`,
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  const blockedDoors: string[] = [];

  for (const door of hingedDoors) {
    const wall = getWallForOpening(layout, door);
    if (!wall) continue;

    const pos = getOpeningWorldPosition(door, wall);
    const inwardNormal = getWallNormal(wall);
    const swingRadius = door.width; // Quarter-circle radius = door width

    // Approximate swing zone as a square zone (door.width × door.width)
    // placed on the swing side (inward for 'in', outward for 'out')
    const swingSign = door.swing === 'in' ? 1 : -1;
    const zoneCenterX = pos.x + inwardNormal.x * swingSign * (swingRadius / 2);
    const zoneCenterZ = pos.z + inwardNormal.z * swingSign * (swingRadius / 2);
    const wallVec = getWallVector(wall);
    const wallAngle = Math.atan2(wallVec.x, wallVec.z);
    const zone = makeZoneOBB(zoneCenterX, zoneCenterZ, swingRadius / 2, swingRadius / 2, wallAngle);

    if (anyFurnitureOverlapsZone(objects, zone)) {
      blockedDoors.push(door.id);
    }
  }

  const count = blockedDoors.length;
  const total = hingedDoors.length;

  if (count === 0) {
    return makeResult({
      ruleId: 'ERG-CIRC-02',
      name: 'Khoảng thông thủy vung cánh cửa',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      inputs: { hingedDoors: total, slidingDoors: slidingDoors.length },
      measurement: { metric: 'blocked_door_swing_zones', value: 0, unit: 'cửa', threshold: 0, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Vùng vung cánh của ${total} cửa bản lề đều thông thoáng.`,
      sources: ['SRC-TCVN-4451-2012'],
    });
  }

  return makeResult({
    ruleId: 'ERG-CIRC-02',
    name: 'Khoảng thông thủy vung cánh cửa',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    measurement: { metric: 'blocked_door_swing_zones', value: count, unit: 'cửa', threshold: 0, passed: false },
    verdict: count === total ? 'fail' : 'warn',
    severity: 'major',
    explanation: `${count}/${total} cửa bản lề bị nội thất cản vùng vung cánh: [${blockedDoors.join(', ')}].`,
    remedy: 'Dời nội thất ra khỏi vùng vung cánh cửa (bán kính = chiều rộng cánh cửa).',
    sources: ['SRC-TCVN-4451-2012'],
  });
}

// =============================================================================
// GROUP D — ERGONOMICS
// =============================================================================

/**
 * ERG-BED-01: Bed Side Clearance
 * At least one side of the bed must have ≥ 0.6m clearance from wall or furniture.
 */
export function evaluateBedSideClearance(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const beds = objects.filter((o) => o.type === 'bed');

  if (beds.length === 0) {
    return makeResult({
      ruleId: 'ERG-BED-01',
      name: 'Khoảng trống cạnh bên giường',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'not_applicable',
      verdict: 'n/a',
      severity: 'info',
      explanation: 'Không có giường trong phòng — quy tắc không áp dụng.',
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  const threshold = ENVIRONMENTAL_THRESHOLDS.BED_SIDE_CLEARANCE_MIN.value;
  const orientation = ORIENTATION_CATALOG['bed'];
  const failedBeds: string[] = [];
  const warnedBeds: string[] = [];

  for (const bed of beds) {
    // Side axes are perpendicular to the head-foot axis (headAxis = 0,0,-1 local → foot = 0,0,+1)
    // Sides: local +X and -X
    const rightAxisWorld = rotateByYaw({ x: 1, z: 0 }, bed.rotation.y);
    const leftAxisWorld = rotateByYaw({ x: -1, z: 0 }, bed.rotation.y);

    const halfWidth = bed.dimensions.width / 2;
    const halfLength = bed.dimensions.length / 2;

    // Right side center point (bed edge)
    const rightEdge: Vector2D = {
      x: bed.position.x + rightAxisWorld.x * halfWidth,
      z: bed.position.z + rightAxisWorld.z * halfWidth,
    };
    // Left side center point (bed edge)
    const leftEdge: Vector2D = {
      x: bed.position.x + leftAxisWorld.x * halfWidth,
      z: bed.position.z + leftAxisWorld.z * halfWidth,
    };

    // Measure clearance on each side: cast a probe zone 0.6m from bed edge
    const probeHalfLength = halfLength * 0.8; // Probe spans 80% of bed length
    const probeHalfWidth = threshold / 2;

    const rightAngle = Math.atan2(rightAxisWorld.x, rightAxisWorld.z);
    const leftAngle = Math.atan2(leftAxisWorld.x, leftAxisWorld.z);

    const rightZoneCenter: Vector2D = {
      x: rightEdge.x + rightAxisWorld.x * probeHalfWidth,
      z: rightEdge.z + rightAxisWorld.z * probeHalfWidth,
    };
    const leftZoneCenter: Vector2D = {
      x: leftEdge.x + leftAxisWorld.x * probeHalfWidth,
      z: leftEdge.z + leftAxisWorld.z * probeHalfWidth,
    };

    const rightZone = makeZoneOBB(rightZoneCenter.x, rightZoneCenter.z, probeHalfWidth, probeHalfLength, rightAngle);
    const leftZone = makeZoneOBB(leftZoneCenter.x, leftZoneCenter.z, probeHalfWidth, probeHalfLength, leftAngle);

    // Check zone against walls
    function wallBlocksZone(zone: OBB2D): boolean {
      for (const wall of layout.walls) {
        if (wall.wallType === 'low_cutaway') continue;
        const wallLen = getWallLength(wall);
        const wv = getWallVector(wall);
        const corners = getOBBCornersV2(zone);
        for (const corner of corners) {
          const toPt = { x: corner.x - wall.startPoint.x, z: corner.z - wall.startPoint.z };
          const t = Math.max(0, Math.min(wallLen, toPt.x * wv.x + toPt.z * wv.z));
          const closest = {
            x: wall.startPoint.x + wv.x * t,
            z: wall.startPoint.z + wv.z * t,
          };
          if (Math.hypot(corner.x - closest.x, corner.z - closest.z) < 0.05) return true;
        }
      }
      return false;
    }

    const otherObjects = objects.filter((o) => o.id !== bed.id && !['door', 'window'].includes(o.type));
    const rightBlocked =
      wallBlocksZone(rightZone) ||
      otherObjects.some((o) => checkOBBCollisionV2(buildOBB(o), rightZone));
    const leftBlocked =
      wallBlocksZone(leftZone) ||
      otherObjects.some((o) => checkOBBCollisionV2(buildOBB(o), leftZone));

    if (rightBlocked && leftBlocked) {
      failedBeds.push(bed.id);
    } else if (rightBlocked || leftBlocked) {
      warnedBeds.push(bed.id);
    }
  }

  if (failedBeds.length === 0 && warnedBeds.length === 0) {
    return makeResult({
      ruleId: 'ERG-BED-01',
      name: 'Khoảng trống cạnh bên giường',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      inputs: { bedCount: beds.length },
      measurement: { metric: 'beds_with_sufficient_side_clearance', value: beds.length, unit: 'giường', threshold, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Tất cả ${beds.length} giường đều có ít nhất một bên thông thoáng ≥ ${threshold}m.`,
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  if (failedBeds.length > 0) {
    return makeResult({
      ruleId: 'ERG-BED-01',
      name: 'Khoảng trống cạnh bên giường',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'mandatory',
      dataStatus: 'sufficient',
      inputs: { failedBeds, warnedBeds },
      measurement: { metric: 'beds_with_insufficient_clearance', value: failedBeds.length, unit: 'giường', threshold, passed: false },
      verdict: 'fail',
      severity: 'major',
      explanation: `${failedBeds.length} giường bị cản cả hai bên — không có khoảng trống ${threshold}m để bước xuống: [${failedBeds.join(', ')}].`,
      remedy: `Đảm bảo ít nhất một cạnh giường có khoảng trống ≥ ${threshold}m. Dời nội thất hoặc điều chỉnh vị trí giường.`,
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  return makeResult({
    ruleId: 'ERG-BED-01',
    name: 'Khoảng trống cạnh bên giường',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'mandatory',
    dataStatus: 'sufficient',
    inputs: { warnedBeds },
    measurement: { metric: 'beds_with_one_side_blocked', value: warnedBeds.length, unit: 'giường', threshold, passed: true },
    verdict: 'warn',
    severity: 'minor',
    explanation: `${warnedBeds.length} giường chỉ có một bên thông thoáng — đủ điều kiện tối thiểu nhưng hạn chế tiếp cận: [${warnedBeds.join(', ')}].`,
    remedy: 'Khuyến nghị để cả hai bên giường thông thoáng ≥ 0.6m.',
    sources: ['SRC-NEUFERT-ERGONOMICS'],
  });
}

/**
 * ERG-WARD-01: Wardrobe Front Clearance
 * Checks if there is at least 0.75m clearance in front of each wardrobe.
 */
export function evaluateWardrobeFrontClearance(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const wardrobes = objects.filter((o) => o.type === 'wardrobe');

  if (wardrobes.length === 0) {
    return makeResult({
      ruleId: 'ERG-WARD-01',
      name: 'Khoảng trống trước tủ quần áo',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'not_applicable',
      verdict: 'n/a',
      severity: 'info',
      explanation: 'Không có tủ quần áo trong phòng — quy tắc không áp dụng.',
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  const thresholdMin = ENVIRONMENTAL_THRESHOLDS.WARDROBE_FRONT_CLEARANCE_MIN.value;
  const thresholdWarn = ENVIRONMENTAL_THRESHOLDS.WARDROBE_FRONT_CLEARANCE_WARN.value;
  const catalogEntry = ORIENTATION_CATALOG['wardrobe'];
  const frontAxis = catalogEntry?.frontAxis ?? { x: 0, z: 1 };

  const failedWardrobes: string[] = [];
  const warnedWardrobes: string[] = [];

  for (const wardrobe of wardrobes) {
    const frontAxisWorld = rotateByYaw(frontAxis, wardrobe.rotation.y);
    const halfLength = wardrobe.dimensions.length / 2;

    // Front edge center
    const frontEdge: Vector2D = {
      x: wardrobe.position.x + frontAxisWorld.x * halfLength,
      z: wardrobe.position.z + frontAxisWorld.z * halfLength,
    };

    const probeHalfWidth = wardrobe.dimensions.width / 2;

    // Probe zone at min threshold
    const minZoneCenter: Vector2D = {
      x: frontEdge.x + frontAxisWorld.x * (thresholdMin / 2),
      z: frontEdge.z + frontAxisWorld.z * (thresholdMin / 2),
    };
    const frontAngle = Math.atan2(frontAxisWorld.x, frontAxisWorld.z);
    const minZone = makeZoneOBB(minZoneCenter.x, minZoneCenter.z, probeHalfWidth, thresholdMin / 2, frontAngle);

    const otherObjects = objects.filter((o) => o.id !== wardrobe.id && !['door', 'window'].includes(o.type));
    const minZoneBlocked = otherObjects.some((o) => checkOBBCollisionV2(buildOBB(o), minZone));

    if (minZoneBlocked) {
      // Check warn threshold
      const warnZoneCenter: Vector2D = {
        x: frontEdge.x + frontAxisWorld.x * (thresholdWarn / 2),
        z: frontEdge.z + frontAxisWorld.z * (thresholdWarn / 2),
      };
      const warnZone = makeZoneOBB(warnZoneCenter.x, warnZoneCenter.z, probeHalfWidth, thresholdWarn / 2, frontAngle);
      const warnZoneBlocked = otherObjects.some((o) => checkOBBCollisionV2(buildOBB(o), warnZone));

      if (warnZoneBlocked) {
        failedWardrobes.push(wardrobe.id);
      } else {
        warnedWardrobes.push(wardrobe.id);
      }
    }
  }

  if (failedWardrobes.length === 0 && warnedWardrobes.length === 0) {
    return makeResult({
      ruleId: 'ERG-WARD-01',
      name: 'Khoảng trống trước tủ quần áo',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      inputs: { wardrobeCount: wardrobes.length },
      measurement: { metric: 'wardrobes_with_sufficient_clearance', value: wardrobes.length, unit: 'tủ', threshold: thresholdMin, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Tất cả ${wardrobes.length} tủ quần áo đều có khoảng trống phía trước ≥ ${thresholdMin}m.`,
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  if (failedWardrobes.length > 0) {
    return makeResult({
      ruleId: 'ERG-WARD-01',
      name: 'Khoảng trống trước tủ quần áo',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      inputs: { failedWardrobes, warnedWardrobes },
      measurement: { metric: 'wardrobes_with_blocked_front', value: failedWardrobes.length, unit: 'tủ', threshold: thresholdMin, passed: false },
      verdict: 'fail',
      severity: 'major',
      explanation: `${failedWardrobes.length} tủ quần áo bị cản hoàn toàn phía trước (< ${thresholdWarn}m): [${failedWardrobes.join(', ')}].`,
      remedy: `Đảm bảo ≥ ${thresholdMin}m trước cánh tủ để mở và lấy đồ. Dời nội thất cản trở.`,
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  return makeResult({
    ruleId: 'ERG-WARD-01',
    name: 'Khoảng trống trước tủ quần áo',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    inputs: { warnedWardrobes },
    measurement: { metric: 'wardrobes_with_limited_clearance', value: warnedWardrobes.length, unit: 'tủ', threshold: thresholdMin, passed: false },
    verdict: 'warn',
    severity: 'minor',
    explanation: `${warnedWardrobes.length} tủ quần áo có khoảng trống hạn chế phía trước (${thresholdWarn}m–${thresholdMin}m): [${warnedWardrobes.join(', ')}].`,
    remedy: `Mở rộng khoảng trống lên ≥ ${thresholdMin}m trước tủ quần áo để thuận tiện sử dụng.`,
    sources: ['SRC-NEUFERT-ERGONOMICS'],
  });
}

/**
 * ERG-DESK-01: Desk Chair Pullback Clearance
 * Checks if there is ≥ 0.75m clearance behind the desk (behind the user).
 */
export function evaluateDeskChairClearance(layout: RoomLayout, objects: RoomObject[]): RuleResult {
  const desks = objects.filter((o) => o.type === 'desk');

  if (desks.length === 0) {
    return makeResult({
      ruleId: 'ERG-DESK-01',
      name: 'Khoảng trống kéo ghế bàn làm việc',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'not_applicable',
      verdict: 'n/a',
      severity: 'info',
      explanation: 'Không có bàn làm việc trong phòng — quy tắc không áp dụng.',
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  const threshold = ENVIRONMENTAL_THRESHOLDS.DESK_CHAIR_PULLBACK_MIN.value;
  const catalogEntry = ORIENTATION_CATALOG['desk'];
  // User sits at frontAxis (+Z local), facing userFacingAxis (-Z local)
  // Chair pullback zone is BEHIND the user = same direction as frontAxis (+Z local)
  const chairAxis = catalogEntry?.frontAxis ?? { x: 0, z: 1 };

  const failedDesks: string[] = [];

  for (const desk of desks) {
    const chairAxisWorld = rotateByYaw(chairAxis, desk.rotation.y);
    const halfLength = desk.dimensions.length / 2;

    // Chair pullback zone starts at the edge where user sits and extends out threshold distance
    const chairEdge: Vector2D = {
      x: desk.position.x + chairAxisWorld.x * halfLength,
      z: desk.position.z + chairAxisWorld.z * halfLength,
    };
    const zoneCenter: Vector2D = {
      x: chairEdge.x + chairAxisWorld.x * (threshold / 2),
      z: chairEdge.z + chairAxisWorld.z * (threshold / 2),
    };

    const chairAngle = Math.atan2(chairAxisWorld.x, chairAxisWorld.z);
    const probeHalfWidth = Math.min(desk.dimensions.width / 2, 0.5); // Max 0.5m wide probe
    const zone = makeZoneOBB(zoneCenter.x, zoneCenter.z, probeHalfWidth, threshold / 2, chairAngle);

    const otherObjects = objects.filter((o) => o.id !== desk.id && !['door', 'window'].includes(o.type));
    const blocked = otherObjects.some((o) => checkOBBCollisionV2(buildOBB(o), zone));

    // Also check wall proximity
    function wallBlocksZone(zone: OBB2D): boolean {
      for (const wall of layout.walls) {
        if (wall.wallType === 'low_cutaway') continue;
        const wallLen = getWallLength(wall);
        const wv = getWallVector(wall);
        const corners = getOBBCornersV2(zone);
        for (const corner of corners) {
          const toPt = { x: corner.x - wall.startPoint.x, z: corner.z - wall.startPoint.z };
          const t = Math.max(0, Math.min(wallLen, toPt.x * wv.x + toPt.z * wv.z));
          const closest = { x: wall.startPoint.x + wv.x * t, z: wall.startPoint.z + wv.z * t };
          if (Math.hypot(corner.x - closest.x, corner.z - closest.z) < 0.05) return true;
        }
      }
      return false;
    }

    if (blocked || wallBlocksZone(zone)) {
      failedDesks.push(desk.id);
    }
  }

  if (failedDesks.length === 0) {
    return makeResult({
      ruleId: 'ERG-DESK-01',
      name: 'Khoảng trống kéo ghế bàn làm việc',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'recommended',
      dataStatus: 'sufficient',
      inputs: { deskCount: desks.length },
      measurement: { metric: 'desks_with_chair_clearance', value: desks.length, unit: 'bàn', threshold, passed: true },
      verdict: 'pass',
      severity: 'minor',
      explanation: `Tất cả ${desks.length} bàn làm việc đều có khoảng trống kéo ghế ≥ ${threshold}m.`,
      sources: ['SRC-NEUFERT-ERGONOMICS'],
    });
  }

  return makeResult({
    ruleId: 'ERG-DESK-01',
    name: 'Khoảng trống kéo ghế bàn làm việc',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'recommended',
    dataStatus: 'sufficient',
    inputs: { failedDesks },
    measurement: { metric: 'desks_with_blocked_chair_zone', value: failedDesks.length, unit: 'bàn', threshold, passed: false },
    verdict: 'fail',
    severity: 'major',
    explanation: `${failedDesks.length} bàn làm việc bị cản vùng kéo ghế phía sau (cần ≥ ${threshold}m): [${failedDesks.join(', ')}].`,
    remedy: `Dời nội thất hoặc tường cản ra khỏi vùng ${threshold}m sau chỗ ngồi để có thể kéo ghế thoải mái.`,
    sources: ['SRC-NEUFERT-ERGONOMICS'],
  });
}

// =============================================================================
// GROUP E — ENVIRONMENTAL DATA QUALITY
// =============================================================================

export function evaluateEnvironmentalDataQuality(layout: RoomLayout, objects: RoomObject[]): RuleResult[] {
  const results: RuleResult[] = [];

  // ENV-DQ-01: Missing ceiling height
  if (!layout.ceilingHeight || layout.ceilingHeight <= 0) {
    results.push(makeResult({
      ruleId: 'ENV-DQ-01',
      name: 'Thiếu chiều cao trần nhà',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['ceilingHeight'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'Chiều cao trần nhà chưa được nhập hoặc bằng 0 — không thể đánh giá không gian thể tích và thông khí dọc.',
      remedy: 'Nhập chiều cao trần nhà (thông thường 2.4m–3.0m) vào cấu hình phòng.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    }));
  }

  // ENV-DQ-02: Missing window dimensions
  const confirmedWindows = layout.openings.filter((o) => o.kind === 'window' && !o.assumed);
  const windowsMissingDimensions = confirmedWindows.filter((o) => !o.width || !o.height || o.width <= 0 || o.height <= 0);
  if (windowsMissingDimensions.length > 0) {
    results.push(makeResult({
      ruleId: 'ENV-DQ-02',
      name: 'Cửa sổ thiếu kích thước',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['window_dimensions'],
      verdict: 'unknown',
      severity: 'info',
      explanation: `${windowsMissingDimensions.length} cửa sổ không có đủ kích thước (rộng × cao) — ảnh hưởng đến tính tỷ lệ chiếu sáng.`,
      remedy: 'Nhập chiều rộng và chiều cao cho từng cửa sổ từ bản vẽ mặt bằng.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    }));
  }

  // ENV-DQ-03: Assumed openings present
  const assumedOpenings = layout.openings.filter((o) => o.assumed);
  if (assumedOpenings.length > 0) {
    results.push(makeResult({
      ruleId: 'ENV-DQ-03',
      name: 'Lỗ mở suy luận (assumed openings)',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['confirmed_opening_positions'],
      verdict: 'unknown',
      severity: 'info',
      explanation: `${assumedOpenings.length} cửa/cửa sổ được suy luận tự động (assumed: true) — vị trí và kích thước chưa xác nhận từ bản vẽ.`,
      remedy: 'Nhập vị trí và kích thước thực tế của cửa/cửa sổ từ bản vẽ mặt bằng để có đánh giá chính xác.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    }));
  }

  // ENV-DQ-04: Missing operability metadata (windows with no swing info)
  const confirmedWindowsWithSwing = confirmedWindows.filter((o) => o.swing && o.swing !== 'fixed');
  const confirmedWindowsUnknownSwing = confirmedWindows.filter(
    (o) => !o.swing || (o.swing === 'fixed' && confirmedWindows.length > 0)
  );
  // Only fire if we have confirmed windows but can't distinguish operability
  if (confirmedWindows.length > 0 && confirmedWindowsWithSwing.length === 0) {
    results.push(makeResult({
      ruleId: 'ENV-DQ-04',
      name: 'Thiếu thông tin kiểu mở cửa sổ',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['window_operability_metadata'],
      verdict: 'unknown',
      severity: 'info',
      explanation: `${confirmedWindows.length} cửa sổ được xác nhận nhưng không có thông tin kiểu mở (swing) rõ ràng — ảnh hưởng đến đánh giá thông gió tự nhiên.`,
      remedy: 'Nhập kiểu mở (mở vào/ra/trượt/cố định) cho từng cửa sổ.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    }));
  }

  // ENV-DQ-05: No lux data available
  results.push(makeResult({
    ruleId: 'ENV-DQ-05',
    name: 'Không có dữ liệu độ chiếu sáng (lux)',
    category: 'environmental_ergonomics',
    school: 'ergonomics',
    applicability: 'optional',
    dataStatus: 'insufficient',
    missingInputs: ['lux_sensor_data'],
    verdict: 'unknown',
    severity: 'info',
    explanation: 'Hệ thống không có dữ liệu cảm biến ánh sáng (lux) thực tế. Đánh giá chiếu sáng chỉ dựa trên hình học cửa sổ — không thể dự đoán mức lux chính xác.',
    remedy: 'Sử dụng thiết bị đo lux hoặc phần mềm mô phỏng ánh sáng (Dialux, Velux Daylight) để có số liệu chính xác.',
    sources: ['SRC-HEURISTIC-STUDIO-V1'],
  }));

  // ENV-DQ-06: No wind direction data
  if (layout.northBearingDeg === null) {
    results.push(makeResult({
      ruleId: 'ENV-DQ-06',
      name: 'Không có dữ liệu hướng gió / phương vị la bàn',
      category: 'environmental_ergonomics',
      school: 'ergonomics',
      applicability: 'optional',
      dataStatus: 'insufficient',
      missingInputs: ['northBearingDeg', 'wind_direction_data'],
      verdict: 'unknown',
      severity: 'info',
      explanation: 'northBearingDeg = null — không thể xác định hướng gió thực tế tác động lên cửa sổ. Đánh giá thông gió chỉ dựa trên hình học tương đối.',
      remedy: 'Nhập số đo la bàn thực tế (northBearingDeg) và hướng gió chủ đạo tại địa phương để có đánh giá thông gió chính xác hơn.',
      sources: ['SRC-HEURISTIC-STUDIO-V1'],
    }));
  }

  return results;
}

// =============================================================================
// ORCHESTRATOR OUTPUT TYPE
// =============================================================================

export interface EnvironmentalRuleEngineOutput {
  environmentalRules: RuleResult[];  // Group A (Lighting) + Group B (Ventilation)
  ergonomicRules: RuleResult[];      // Group C (Circulation) + Group D (Ergonomics)
  dataQualityRules: RuleResult[];    // Group E (Data Quality)
  ruleCount: number;
  timestamp: string;
  engineVersion: string;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Evaluates all P6 Environmental & Ergonomics rules.
 * Pure function — does NOT mutate layout or objects.
 */
export function evaluateEnvironmentalRules(input: {
  layout: RoomLayout;
  objects: RoomObject[];
}): EnvironmentalRuleEngineOutput {
  const { layout, objects } = input;

  // Group A — Lighting
  const lightingRules: RuleResult[] = [
    evaluateWindowFloorRatio(layout, objects),
    evaluateWindowOrientation(layout),
    evaluateWindowObstruction(layout, objects),
  ];

  // Group B — Ventilation
  const ventilationRules: RuleResult[] = [
    evaluateVentilationOpenings(layout),
    evaluateCrossVentilationPotential(layout),
    evaluateVentilationObstruction(layout, objects),
  ];

  // Group C — Circulation
  const circulationRules: RuleResult[] = [
    evaluateMainWalkwayClearance(layout, objects),
    evaluateDoorSwingClearance(layout, objects),
  ];

  // Group D — Ergonomics
  const ergonomicsRules: RuleResult[] = [
    evaluateBedSideClearance(layout, objects),
    evaluateWardrobeFrontClearance(layout, objects),
    evaluateDeskChairClearance(layout, objects),
  ];

  // Group E — Data Quality
  const dataQualityRules = evaluateEnvironmentalDataQuality(layout, objects);

  const environmentalRules = [...lightingRules, ...ventilationRules];
  const ergonomicRules = [...circulationRules, ...ergonomicsRules];
  const ruleCount = environmentalRules.length + ergonomicRules.length + dataQualityRules.length;

  return {
    environmentalRules,
    ergonomicRules,
    dataQualityRules,
    ruleCount,
    timestamp: new Date().toISOString(),
    engineVersion: P6_ENGINE_VERSION,
  };
}

