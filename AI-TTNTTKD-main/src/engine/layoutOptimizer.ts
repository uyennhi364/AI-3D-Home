import {
  FengShuiRoomEvaluation,
  LayoutOptimizationProposal,
  ProposedAdjustment,
  RoomConfig,
  RoomObject,
  UserFengShuiProfile,
} from '../types/fengshui';
import { evaluateRoomFengShui, isLineOfSight } from './fengshuiRules';
import {
  checkOBBCollision,
  clampOBBInsideRoom,
  createOBBFromObject,
  isOBBInsideRoom,
  validatePlacementSafety,
} from './geometryEngine';

export interface OptimizationResult {
  proposal: LayoutOptimizationProposal;
  optimizedObjects: RoomObject[];
}

// ---------------------------------------------------------------------------
// PlacedObject: compact record of an object whose optimized position has been
// committed in the current pass. Used so each subsequent object checks against
// ALL already-placed items, not just the original workingObjects snapshot.
// ---------------------------------------------------------------------------
interface PlacedObject {
  id: string;
  dims: { width: number; length: number };
  pos: { x: number; z: number };
  rotY: number;
}

/** Checks if a candidate OBB collides with any item in placedList. */
function collidesWithPlaced(
  candidatePos: { x: number; z: number },
  candidateDims: { width: number; length: number },
  candidateRotY: number,
  placedList: PlacedObject[],
  margin = 0.04
): boolean {
  const candidateOBB = createOBBFromObject(candidatePos, candidateDims, candidateRotY, margin);
  for (const p of placedList) {
    const otherOBB = createOBBFromObject(p.pos, p.dims, p.rotY, margin);
    if (checkOBBCollision(candidateOBB, otherOBB)) return true;
  }
  return false;
}

type Candidate = { pos: { x: number; z: number }; rotY: number; reason: string };

/**
 * Finds the first candidate position that:
 *  1. Has all OBB corners inside the room.
 *  2. Does NOT collide with any existing workingObject (excluding excludeId
 *     and ignoreTypes).
 *  3. Does NOT collide with any item already committed to placedList.
 *
 * Falls back to an expanding spiral search around each candidate if none of
 * the fixed candidates pass.  Returns null when truly no position is found.
 */
function findSafePos(
  candidates: Candidate[],
  dims: { width: number; length: number },
  workingObjects: RoomObject[],
  roomSize: { width: number; length: number },
  excludeId: string,
  placedList: PlacedObject[],
  ignoreTypes: string[] = []
): (Candidate & { clamped: { x: number; z: number } }) | null {
  const tryPos = (pos: { x: number; z: number }, rotY: number): { x: number; z: number } | null => {
    const clamped = clampOBBInsideRoom(pos, dims, rotY, roomSize, 0.06);
    const obb = createOBBFromObject(clamped, dims, rotY, 0.03);
    if (!isOBBInsideRoom(obb, roomSize, 0.05)) return null;

    const workCheck = validatePlacementSafety(clamped, dims, rotY, workingObjects, roomSize, excludeId, ignoreTypes);
    if (!workCheck.valid) return null;

    if (collidesWithPlaced(clamped, dims, rotY, placedList)) return null;
    return clamped;
  };

  // 1. Try each fixed candidate as-is
  for (const cand of candidates) {
    const clamped = tryPos(cand.pos, cand.rotY);
    if (clamped) return { ...cand, clamped };
  }

  // 2. Spiral search around first few candidates
  const stepDist = 0.25;
  const maxRings = 14;
  for (const cand of candidates.slice(0, 4)) {
    const baseClamped = clampOBBInsideRoom(cand.pos, dims, cand.rotY, roomSize, 0.06);
    for (let ring = 1; ring <= maxRings; ring++) {
      const radius = ring * stepDist;
      const numSamples = Math.max(8, ring * 6);
      for (let s = 0; s < numSamples; s++) {
        const angle = (s / numSamples) * Math.PI * 2;
        const testPos = {
          x: baseClamped.x + radius * Math.cos(angle),
          z: baseClamped.z + radius * Math.sin(angle),
        };
        const clamped = tryPos(testPos, cand.rotY);
        if (clamped) {
          return { pos: testPos, rotY: cand.rotY, reason: cand.reason + ' (vị trí thích ứng)', clamped };
        }
      }
    }
  }
  return null;
}

/**
 * Post-optimization collision validation.
 * Returns all overlapping object pairs in the given layout so the caller can
 * decide whether to strip conflicting adjustments.
 */
export function validateOptimizedLayout(
  objects: RoomObject[],
  roomSize: { width: number; length: number }
): Array<{ id1: string; name1: string; id2: string; name2: string }> {
  const solid = objects.filter(
    (o) => !['rug', 'painting', 'curtain', 'door', 'window', 'lamp'].includes(o.type)
  );
  const conflicts: Array<{ id1: string; name1: string; id2: string; name2: string }> = [];
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i];
      const b = solid[j];
      const obbA = createOBBFromObject(a.position, a.dimensions, a.rotation.y, 0.02);
      const obbB = createOBBFromObject(b.position, b.dimensions, b.rotation.y, 0.02);
      if (checkOBBCollision(obbA, obbB)) {
        conflicts.push({ id1: a.id, name1: a.name, id2: b.id, name2: b.name });
      }
    }
  }
  return conflicts;
}

/**
 * Intelligent Constraint-based Layout Optimization Engine.
 *
 * Key guarantee: every object's new position is committed to `placedList`
 * before the next object is placed, so overlaps between newly placed items
 * are prevented, not just overlaps with the original furniture.
 */
export function generateOptimizedLayout(
  userProfile: UserFengShuiProfile,
  roomConfig: RoomConfig,
  currentObjects: RoomObject[],
  currentEvaluation: FengShuiRoomEvaluation
): OptimizationResult {
  const roomW = roomConfig.width || 5.0;
  const roomL = roomConfig.length || 5.2;
  const halfW = roomW / 2;
  const halfL = roomL / 2;
  const roomSize = { width: roomW, length: roomL };

  const door = currentObjects.find((o) => o.type === 'door');
  const windowObj = currentObjects.find((o) => o.type === 'window');
  const wc = currentObjects.find((o) => o.type === 'wc');

  // Deep clone so we can mutate freely without touching React state
  let workingObjects: RoomObject[] = currentObjects.map((obj) => ({
    ...obj,
    position: { ...obj.position },
    rotation: { ...obj.rotation },
    dimensions: { ...obj.dimensions },
  }));

  const adjustments: ProposedAdjustment[] = [];
  const improvements: string[] = [];

  // placedList tracks each object's COMMITTED optimized position. It is
  // populated after every successful placement so the next object avoids it.
  const placedList: PlacedObject[] = [];

  const commit = (obj: RoomObject, pos: { x: number; z: number }, rotY: number) => {
    const existing = placedList.findIndex((p) => p.id === obj.id);
    const entry: PlacedObject = {
      id: obj.id,
      dims: { width: obj.dimensions.width, length: obj.dimensions.length },
      pos,
      rotY,
    };
    if (existing >= 0) placedList[existing] = entry;
    else placedList.push(entry);
  };

  const DEFAULT_IGNORE = ['door', 'window', 'lamp', 'rug', 'painting', 'curtain'];

  // =========================================================================
  // 1. BED
  // =========================================================================
  const bed = workingObjects.find((o) => o.type === 'bed');
  if (bed) {
    const bedW = bed.dimensions.width;
    const bedL = bed.dimensions.length;

    interface BedCandidate extends Candidate { facingDirection: string; score: number; }
    const bedCandidates: BedCandidate[] = [
      {
        pos: { x: -Math.min(0.8, halfW - bedW / 2 - 0.6), z: -halfL + bedL / 2 + 0.05 },
        rotY: 0, facingDirection: 'S', score: 0,
        reason: 'Đầu giường tựa sát tường Bắc kiên cố (thế Tọa Sơn), đón sinh khí dịu êm',
      },
      {
        pos: { x: -halfW + bedL / 2 + 0.05, z: Math.min(0.5, halfL - bedW / 2 - 0.8) },
        rotY: Math.PI / 2, facingDirection: 'E', score: 0,
        reason: 'Đầu giường tựa vách tường Tây vững chãi, hướng nhìn thoáng đãng',
      },
      {
        pos: { x: halfW - bedL / 2 - 0.05, z: Math.min(0.5, halfL - bedW / 2 - 0.8) },
        rotY: -Math.PI / 2, facingDirection: 'W', score: 0,
        reason: 'Đầu giường tựa vách tường Đông, khoảng di chuyển hai bên rộng rãi',
      },
    ];

    for (const cand of bedCandidates) {
      let score = 70;
      if ((userProfile.directionDetails as any)?.[cand.facingDirection]?.isGood) score += 25;
      if (door) {
        const dx = Math.abs(cand.pos.x - door.position.x);
        const dz = Math.abs(cand.pos.z - door.position.z);
        score += dx < 0.8 || dz < 0.8 ? -40 : 10;
      }
      if (wc && Math.hypot(cand.pos.x - wc.position.x, cand.pos.z - wc.position.z) < 2.0) score -= 30;
      if (windowObj && Math.hypot(cand.pos.x - windowObj.position.x, cand.pos.z - windowObj.position.z) < 1.0) score -= 20;

      const cc = clampOBBInsideRoom(cand.pos, bed.dimensions, cand.rotY, roomSize, 0.05);
      const safety = validatePlacementSafety(cc, bed.dimensions, cand.rotY, workingObjects, roomSize, bed.id,
        [...DEFAULT_IGNORE, 'chair']);
      if (!safety.valid) score -= 60;
      cand.score = score;
    }
    bedCandidates.sort((a, b) => b.score - a.score);

    const chosenBed = bedCandidates[0];
    const clampedBedPos = clampOBBInsideRoom(chosenBed.pos, bed.dimensions, chosenBed.rotY, roomSize, 0.05);
    bed.position.x = clampedBedPos.x;
    bed.position.z = clampedBedPos.z;
    bed.rotation.y = chosenBed.rotY;
    commit(bed, clampedBedPos, chosenBed.rotY);

    adjustments.push({
      objectId: bed.id,
      suggestedX: clampedBedPos.x,
      suggestedZ: clampedBedPos.z,
      suggestedRotationY: chosenBed.rotY,
      reason: chosenBed.reason,
      estimatedScore: 90,
    });
    improvements.push('Kê đầu giường tựa vách kiên cố, triệt tiêu trục khí xung từ cửa vào');

    // Rug under bed (non-colliding)
    const rug = workingObjects.find((o) => o.type === 'rug');
    if (rug) {
      rug.position.x = clampedBedPos.x;
      rug.position.z = clampedBedPos.z;
      rug.rotation.y = chosenBed.rotY;
    }

    // Nightstands flanking the bed
    const cosB = Math.cos(chosenBed.rotY);
    const sinB = Math.sin(chosenBed.rotY);
    const offset = bedW / 2 + 0.35;

    workingObjects.filter((o) => o.type === 'nightstand').forEach((ns, idx) => {
      const sign = idx % 2 === 0 ? 1 : -1;
      const nsPos = {
        x: clampedBedPos.x + sign * offset * cosB,
        z: clampedBedPos.z - sign * offset * sinB,
      };
      const nsClamped = clampOBBInsideRoom(nsPos, ns.dimensions, chosenBed.rotY, roomSize);
      const nsWork = validatePlacementSafety(nsClamped, ns.dimensions, chosenBed.rotY, workingObjects, roomSize, ns.id,
        DEFAULT_IGNORE);
      if (nsWork.valid && !collidesWithPlaced(nsClamped, ns.dimensions, chosenBed.rotY, placedList)) {
        ns.position.x = nsClamped.x;
        ns.position.z = nsClamped.z;
        ns.rotation.y = chosenBed.rotY;
        commit(ns, nsClamped, chosenBed.rotY);
        adjustments.push({
          objectId: ns.id,
          suggestedX: nsClamped.x,
          suggestedZ: nsClamped.z,
          suggestedRotationY: chosenBed.rotY,
          reason: `Đặt ${ns.name} cân bằng hai bên đầu giường`,
          estimatedScore: 90,
        });
      }
      // No adjustment pushed if nightstand can't fit — keeps original position
    });
  }

  // =========================================================================
  // 2. WARDROBE
  // =========================================================================
  const wardrobe = workingObjects.find((o) => o.type === 'wardrobe');
  if (wardrobe) {
    const wardW = wardrobe.dimensions.width;
    const wardL = wardrobe.dimensions.length;
    const wardCandidates: Candidate[] = [
      { pos: { x: Math.max(0.6, halfW - wardW / 2 - 0.4), z: -halfL + wardL / 2 + 0.05 }, rotY: 0, reason: 'Tủ sát tường Bắc kiên cố' },
      { pos: { x: -halfW + wardL / 2 + 0.05, z: -halfL + wardW / 2 + 0.5 }, rotY: Math.PI / 2, reason: 'Tủ sát tường Tây' },
      { pos: { x: halfW - wardL / 2 - 0.05, z: -halfL + wardW / 2 + 0.5 }, rotY: -Math.PI / 2, reason: 'Tủ sát tường Đông' },
      { pos: { x: Math.max(0.6, halfW - wardW / 2 - 0.4), z: halfL - wardL / 2 - 0.05 }, rotY: 0, reason: 'Tủ sát tường Nam' },
      { pos: { x: -halfW + wardW / 2 + 0.4, z: halfL - wardL / 2 - 0.05 }, rotY: 0, reason: 'Tủ sát tường Nam phía trái' },
    ];

    const result = findSafePos(wardCandidates, wardrobe.dimensions, workingObjects, roomSize, wardrobe.id, placedList,
      [...DEFAULT_IGNORE, 'chair']);
    if (result) {
      wardrobe.position.x = result.clamped.x;
      wardrobe.position.z = result.clamped.z;
      wardrobe.rotation.y = result.rotY;
      commit(wardrobe, result.clamped, result.rotY);
      adjustments.push({
        objectId: wardrobe.id,
        suggestedX: result.clamped.x,
        suggestedZ: result.clamped.z,
        suggestedRotationY: result.rotY,
        reason: result.reason + ' — tạo thế che chắn trường khí ổn định',
        estimatedScore: 90,
      });
      improvements.push('Bố trí tủ quần áo gọn gàng, tăng cường khoảng trống lưu thông');
    }
  }

  // =========================================================================
  // 3. DESK + CHAIR
  // =========================================================================
  const desk = workingObjects.find((o) => o.type === 'desk');
  if (desk) {
    const deskL = desk.dimensions.length;
    const deskW = desk.dimensions.width;
    const deskCandidates: Candidate[] = [];

    if (windowObj) {
      const nearWinZ = windowObj.position.z > 0
        ? windowObj.position.z - (deskL / 2 + 0.25)
        : windowObj.position.z + (deskL / 2 + 0.25);
      deskCandidates.push({ pos: { x: windowObj.position.x, z: nearWinZ }, rotY: Math.PI, reason: 'Bàn học đón ánh sáng tự nhiên từ cửa sổ' });
    }
    deskCandidates.push(
      { pos: { x: halfW - deskW / 2 - 0.4, z: halfL - deskL / 2 - 0.8 }, rotY: Math.PI, reason: 'Bàn tựa tường bao quát cửa phòng' },
      { pos: { x: -halfW + deskW / 2 + 0.4, z: halfL - deskL / 2 - 0.8 }, rotY: Math.PI, reason: 'Bàn góc phòng đón sinh khí Thiên Y' },
      { pos: { x: halfW - deskW / 2 - 0.4, z: -halfL + deskL / 2 + 0.8 }, rotY: 0, reason: 'Bàn gần tường Bắc yên tĩnh' },
      { pos: { x: -halfW + deskW / 2 + 0.4, z: -halfL + deskL / 2 + 0.8 }, rotY: 0, reason: 'Bàn tường Bắc-Tây tập trung năng lượng' },
    );

    const deskResult = findSafePos(deskCandidates, desk.dimensions, workingObjects, roomSize, desk.id, placedList,
      [...DEFAULT_IGNORE, 'chair']);
    if (deskResult) {
      desk.position.x = deskResult.clamped.x;
      desk.position.z = deskResult.clamped.z;
      desk.rotation.y = deskResult.rotY;
      commit(desk, deskResult.clamped, deskResult.rotY);
      adjustments.push({
        objectId: desk.id,
        suggestedX: deskResult.clamped.x,
        suggestedZ: deskResult.clamped.z,
        suggestedRotationY: deskResult.rotY,
        reason: deskResult.reason,
        estimatedScore: 92,
      });
      improvements.push('Bàn học đạt thế chủ động đón sáng tự nhiên và bao quát không gian');

      // Chair in front of desk
      const chair = workingObjects.find((o) => o.type === 'chair');
      if (chair) {
        const chairOffsetZ = deskL / 2 + chair.dimensions.length / 2 + 0.08;
        const cosD = Math.cos(deskResult.rotY);
        const sinD = Math.sin(deskResult.rotY);
        const chairPos = {
          x: deskResult.clamped.x + sinD * chairOffsetZ,
          z: deskResult.clamped.z + cosD * chairOffsetZ,
        };
        const chairClamped = clampOBBInsideRoom(chairPos, chair.dimensions, deskResult.rotY, roomSize);
        const chairWork = validatePlacementSafety(chairClamped, chair.dimensions, deskResult.rotY, workingObjects, roomSize, chair.id,
          DEFAULT_IGNORE);
        if (chairWork.valid && !collidesWithPlaced(chairClamped, chair.dimensions, deskResult.rotY, placedList)) {
          chair.position.x = chairClamped.x;
          chair.position.z = chairClamped.z;
          chair.rotation.y = deskResult.rotY;
          commit(chair, chairClamped, deskResult.rotY);
          adjustments.push({
            objectId: chair.id,
            suggestedX: chairClamped.x,
            suggestedZ: chairClamped.z,
            suggestedRotationY: deskResult.rotY,
            reason: 'Ghế bố trí ngay trước bàn, tạo cặp làm việc hài hòa',
            estimatedScore: 90,
          });
        }
      }
    }
  }

  // =========================================================================
  // 4. MIRROR
  // =========================================================================
  const mirror = workingObjects.find((o) => o.type === 'mirror');
  if (mirror) {
    const mirrorCandidates: Candidate[] = [
      { pos: { x: halfW - 0.2, z: halfL - 1.2 }, rotY: -Math.PI / 2, reason: 'Gương tường Đông tránh chiếu giường' },
      { pos: { x: -halfW + 0.2, z: halfL - 1.2 }, rotY: Math.PI / 2, reason: 'Gương tường Tây thoáng đãng' },
      { pos: { x: halfW - 0.2, z: 0 }, rotY: -Math.PI / 2, reason: 'Gương tường Đông giữa phòng' },
      { pos: { x: -halfW + 0.2, z: 0 }, rotY: Math.PI / 2, reason: 'Gương tường Tây giữa phòng' },
    ].filter((mp) => {
      const reflectsBed = workingObjects
        .filter((o) => o.type === 'bed')
        .some((b) => isLineOfSight(mp.pos, mp.rotY, b.position, 45, 3.5));
      return !reflectsBed;
    });

    const mirrorResult = findSafePos(mirrorCandidates, mirror.dimensions, workingObjects, roomSize, mirror.id, placedList,
      DEFAULT_IGNORE);
    if (mirrorResult) {
      mirror.position.x = mirrorResult.clamped.x;
      mirror.position.z = mirrorResult.clamped.z;
      mirror.rotation.y = mirrorResult.rotY;
      commit(mirror, mirrorResult.clamped, mirrorResult.rotY);
      adjustments.push({
        objectId: mirror.id,
        suggestedX: mirrorResult.clamped.x,
        suggestedZ: mirrorResult.clamped.z,
        suggestedRotationY: mirrorResult.rotY,
        reason: 'Xoay gương lệch khỏi hướng giường để triệt tiêu quang sát',
        estimatedScore: 92,
      });
      improvements.push('Triệt tiêu góc chiếu của gương vào giường ngủ, an định thần khí');
    }
  }

  // =========================================================================
  // 5. POST-OPTIMIZATION COLLISION VALIDATION
  //    Build the full proposed layout and run OBB collision check on every
  //    pair of solid objects. Strip any adjustment that still causes overlap.
  // =========================================================================
  const proposedObjects: RoomObject[] = currentObjects.map((obj) => {
    const adj = adjustments.find((a) => a.objectId === obj.id);
    if (!adj) return { ...obj };
    return {
      ...obj,
      position: { ...obj.position, x: adj.suggestedX, z: adj.suggestedZ },
      rotation: { ...obj.rotation, y: adj.suggestedRotationY },
    };
  });

  const conflicts = validateOptimizedLayout(proposedObjects, roomSize);
  if (conflicts.length > 0) {
    // Strip the second object in each pair (lower priority) to fall back to original
    const toRemove = new Set<string>(conflicts.map((c) => c.id2));
    const before = adjustments.length;
    adjustments.splice(0, adjustments.length, ...adjustments.filter((a) => !toRemove.has(a.objectId)));
    if (adjustments.length < before) {
      improvements.push(`⚠ ${before - adjustments.length} vị trí bị loại bỏ do xung đột va chạm — đồ vật giữ nguyên vị trí cũ.`);
    }
  }

  // =========================================================================
  // 6. EVALUATE FINAL LAYOUT SCORE
  // =========================================================================
  const finalObjects: RoomObject[] = currentObjects.map((obj) => {
    const adj = adjustments.find((a) => a.objectId === obj.id);
    if (!adj) return { ...obj };
    return {
      ...obj,
      position: { ...obj.position, x: adj.suggestedX, z: adj.suggestedZ },
      rotation: { ...obj.rotation, y: adj.suggestedRotationY },
    };
  });

  const afterEvaluation = evaluateRoomFengShui(userProfile, roomConfig, finalObjects);
  const beforeScore = currentEvaluation.overallScore;
  const afterScore = afterEvaluation.overallScore;
  adjustments.forEach((adj) => { adj.estimatedScore = afterScore; });

  if (adjustments.length === 0 || afterScore <= beforeScore) {
    return {
      proposal: {
        id: `opt_${Date.now()}`,
        title: 'Chưa tìm được phương án tốt hơn',
        beforeScore,
        afterScore: beforeScore,
        keyIssues: currentEvaluation.keyIssues.slice(0, 3),
        improvements: [
          'Bộ máy bố trí không tìm được phương án hợp lệ và có điểm cao hơn. Hãy thử di chuyển thủ công đồ nặng (giường, tủ) rồi tối ưu lại.',
        ],
        adjustments: [],
      },
      optimizedObjects: currentObjects,
    };
  }

  return {
    proposal: {
      id: `opt_${Date.now()}`,
      title: 'Phương án Tối ưu Toàn diện Bát Trạch',
      beforeScore,
      afterScore,
      keyIssues: currentEvaluation.keyIssues.slice(0, 3),
      improvements,
      adjustments,
    },
    optimizedObjects: finalObjects,
  };
}
