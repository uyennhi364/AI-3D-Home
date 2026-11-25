// =============================================================================
// tests/rotation_360_tool.test.ts
// Comprehensive Regression Suite for 360°+ Continuous Rotation Tool
// Covers all 12 mandatory test cases + Geometry Engine & OBB SAT integration
// =============================================================================

import assert from 'node:assert';
import {
  computeFloorPlanePointerAngle,
  computeContinuousRotationDelta,
  normalizeDeg,
  bearingOfVector,
  rotateByYaw,
} from '../src/engine/core/compass.js';
import {
  createOBBFromObject,
  checkOBBCollisionV2,
} from '../src/engine/geometryEngine.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { RoomObject } from '../src/types/fengshui.js';

console.log('=============================================================================');
console.log('SUITE: 360+ CONTINUOUS ROTATION TOOL & GEOMETRY ENGINE INTEGRATION');
console.log('=============================================================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

/**
 * Simulates dragging the mouse along a circle of radius R around center (cx, cz)
 * from startDeg to endDeg in stepDeg increments (positive = CCW, negative = CW).
 */
function simulateCircularDrag(
  cx: number,
  cz: number,
  initialRotY: number,
  startDeg: number,
  endDeg: number,
  stepDeg: number
): { finalRotY: number; maxSingleStepRad: number; steps: number[] } {
  const radius = 1.2;
  const toRad = (d: number) => (d * Math.PI) / 180;

  let prevAngle = computeFloorPlanePointerAngle(
    cx + radius * Math.cos(toRad(startDeg)),
    cz - radius * Math.sin(toRad(startDeg)),
    cx,
    cz
  )!;
  let totalRotation = initialRotY;
  let maxSingleStepRad = 0;
  const steps: number[] = [totalRotation];

  const dir = endDeg >= startDeg ? 1 : -1;
  const absStep = Math.abs(stepDeg) * dir;
  const count = Math.round(Math.abs(endDeg - startDeg) / Math.abs(stepDeg));

  for (let i = 1; i <= count; i++) {
    const deg = startDeg + i * absStep;
    const px = cx + radius * Math.cos(toRad(deg));
    const pz = cz - radius * Math.sin(toRad(deg));
    const currAngle = computeFloorPlanePointerAngle(px, pz, cx, cz)!;
    const delta = computeContinuousRotationDelta(currAngle, prevAngle);
    maxSingleStepRad = Math.max(maxSingleStepRad, Math.abs(delta));
    totalRotation += delta;
    prevAngle = currAngle;
    steps.push(totalRotation);
  }

  return { finalRotY: totalRotation, maxSingleStepRad, steps };
}

const EPS = 1e-6;

// TC 1: Xoay từ 0° đến 90°
test('TC-ROT-01: Xoay từ 0° đến 90°', () => {
  const res = simulateCircularDrag(0, 0, 0, 0, 90, 5);
  assert.ok(Math.abs(res.finalRotY - Math.PI / 2) < EPS, `Expected π/2, got ${res.finalRotY}`);
});

// TC 2: Xoay từ 90° đến 180°
test('TC-ROT-02: Xoay từ 90° đến 180°', () => {
  const res = simulateCircularDrag(0, 0, Math.PI / 2, 90, 180, 5);
  assert.ok(Math.abs(res.finalRotY - Math.PI) < EPS, `Expected π, got ${res.finalRotY}`);
});

// TC 3: Xoay từ 180° đến 270°
test('TC-ROT-03: Xoay từ 180° đến 270°', () => {
  const res = simulateCircularDrag(0, 0, Math.PI, 180, 270, 5);
  assert.ok(Math.abs(res.finalRotY - (3 * Math.PI) / 2) < EPS, `Expected 3π/2, got ${res.finalRotY}`);
});

// TC 4: Xoay từ 270° đến 360°
test('TC-ROT-04: Xoay từ 270° đến 360°', () => {
  const res = simulateCircularDrag(0, 0, (3 * Math.PI) / 2, 270, 360, 5);
  assert.ok(Math.abs(res.finalRotY - 2 * Math.PI) < EPS, `Expected 2π, got ${res.finalRotY}`);
});

// TC 5: Xoay ngược chiều (clockwise / negative delta)
test('TC-ROT-05: Xoay theo cả chiều âm (0° -> -360°)', () => {
  const res = simulateCircularDrag(0, 0, 0, 0, -360, 5);
  assert.ok(Math.abs(res.finalRotY - -2 * Math.PI) < EPS, `Expected -2π, got ${res.finalRotY}`);
});

// TC 6: Xoay qua mốc 180° không giật hoặc đảo chiều
test('TC-ROT-06: Xoay qua mốc 180° liên tục (170° -> 190°)', () => {
  const res = simulateCircularDrag(1.5, -0.8, (170 * Math.PI) / 180, 170, 190, 2);
  const expected = (190 * Math.PI) / 180;
  assert.ok(Math.abs(res.finalRotY - expected) < EPS, `Expected ${expected}, got ${res.finalRotY}`);
  for (let i = 1; i < res.steps.length; i++) {
    assert.ok(res.steps[i] > res.steps[i - 1], `Angle reversed at step ${i}`);
  }
});

// TC 7: Xoay qua mốc -180° / +180° không nhảy góc
test('TC-ROT-07: Chuyển tiếp qua mốc -180°/+180° (175° -> 185° và -175° -> -185°)', () => {
  const a1 = (179 * Math.PI) / 180;
  const a2 = (-179 * Math.PI) / 180;
  const deltaPos = computeContinuousRotationDelta(a2, a1);
  assert.ok(Math.abs(deltaPos - (2 * Math.PI) / 180) < EPS, `Expected +2° delta, got ${(deltaPos * 180) / Math.PI}°`);

  const deltaNeg = computeContinuousRotationDelta(a1, a2);
  assert.ok(Math.abs(deltaNeg - (-2 * Math.PI) / 180) < EPS, `Expected -2° delta, got ${(deltaNeg * 180) / Math.PI}°`);
});

// TC 8: Xoay liên tục nhiều vòng (0° -> 1080°, 3 vòng)
test('TC-ROT-08: Xoay liên tục nhiều vòng (0° -> 1080° = 3 vòng)', () => {
  const res = simulateCircularDrag(0, 0, 0, 0, 1080, 10);
  const expected = 6 * Math.PI;
  assert.ok(Math.abs(res.finalRotY - expected) < 1e-5, `Expected 6π, got ${res.finalRotY}`);
  assert.ok(res.maxSingleStepRad < (11 * Math.PI) / 180, `No sudden jump allowed; max step was ${res.maxSingleStepRad}`);
});

// TC 9: Lưu trạng thái đối tượng giữ đúng góc xoay
test('TC-ROT-09: Lưu trạng thái đối tượng giữ đúng góc xoay 270°', () => {
  const desk: RoomObject = {
    id: 'desk_test',
    type: 'desk',
    name: 'Bàn học',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1.2, length: 0.6, height: 0.75 },
  };
  const { finalRotY } = simulateCircularDrag(0, 0, desk.rotation.y, 0, 270, 5);
  const updated: RoomObject = { ...desk, rotation: { ...desk.rotation, y: finalRotY } };
  assert.ok(Math.abs(updated.rotation.y - (3 * Math.PI) / 2) < EPS);
  assert.strictEqual(Math.round(normalizeDeg((updated.rotation.y * 180) / Math.PI)), 270);
});

// TC 10: Xoay rồi Undo / Redo khôi phục đúng trạng thái
test('TC-ROT-10: Xoay rồi Undo/Redo khôi phục đúng góc xoay', () => {
  const initialObjects: RoomObject[] = JSON.parse(JSON.stringify(ROOM_PRESETS.master.objects));
  const bedBefore = initialObjects.find((o) => o.id === 'bed_01')!;
  const initialRot = bedBefore.rotation.y;

  const historyStack: RoomObject[][] = [JSON.parse(JSON.stringify(initialObjects))];
  const redoStack: RoomObject[][] = [];

  const { finalRotY } = simulateCircularDrag(
    bedBefore.position.x,
    bedBefore.position.z,
    initialRot,
    0,
    225,
    15
  );
  let currentObjects: RoomObject[] = initialObjects.map((o) =>
    o.id === 'bed_01' ? { ...o, rotation: { ...o.rotation, y: finalRotY } } : o
  );
  assert.ok(Math.abs(currentObjects.find((o) => o.id === 'bed_01')!.rotation.y - finalRotY) < EPS);

  // Undo
  redoStack.push(currentObjects);
  currentObjects = historyStack.pop()!;
  assert.strictEqual(currentObjects.find((o) => o.id === 'bed_01')!.rotation.y, initialRot, 'Undo must restore initial rotation');

  // Redo
  historyStack.push(currentObjects);
  currentObjects = redoStack.pop()!;
  assert.ok(Math.abs(currentObjects.find((o) => o.id === 'bed_01')!.rotation.y - finalRotY) < EPS, 'Redo must restore 225° rotation');
});

// TC 11: Geometry Engine & OBB SAT nhận đúng hướng xoay ở 270° & 630°
test('TC-ROT-11: Geometry Engine & OBB SAT nhận đúng hướng xoay (270° và 630°)', () => {
  const rectObj: RoomObject = {
    id: 'desk_sat',
    type: 'desk',
    name: 'Bàn test',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: (3 * Math.PI) / 2, z: 0 }, // 270 deg
    dimensions: { width: 1.6, length: 0.6, height: 0.75 },
  };
  const obb270 = createOBBFromObject(rectObj.position, rectObj.dimensions, rectObj.rotation.y);
  const blockerAlongX: RoomObject = {
    id: 'blocker',
    type: 'chair',
    name: 'Ghế',
    position: { x: 0.6, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 0.4, length: 0.4, height: 0.8 },
  };
  const obbBlocker = createOBBFromObject(blockerAlongX.position, blockerAlongX.dimensions, blockerAlongX.rotation.y);
  assert.strictEqual(checkOBBCollisionV2(obb270, obbBlocker), false, 'At 270°, narrow side faces X so (0.6, 0) must NOT collide');

  // Verify at 0° (unrotated), wide side faces X so (0.6, 0) DOES collide
  const obb0 = createOBBFromObject(rectObj.position, rectObj.dimensions, 0);
  assert.strictEqual(checkOBBCollisionV2(obb0, obbBlocker), true, 'At 0°, wide side faces X so (0.6, 0) collides');

  const rotatedMulti = { ...rectObj, rotation: { ...rectObj.rotation, y: (630 * Math.PI) / 180 } };
  const obb630 = createOBBFromObject(rotatedMulti.position, rotatedMulti.dimensions, rotatedMulti.rotation.y);
  assert.strictEqual(checkOBBCollisionV2(obb630, obbBlocker), false, 'At 630° (270° + 360°), OBB SAT must match 270°');

  const v270 = rotateByYaw({ x: 0, z: -1 }, (270 * Math.PI) / 180);
  const v630 = rotateByYaw({ x: 0, z: -1 }, (630 * Math.PI) / 180);
  assert.strictEqual(Math.round(bearingOfVector(v270)), Math.round(bearingOfVector(v630)));
});

// TC 12: Chuyển qua Move rồi quay lại Rotate hoạt động bình thường
test('TC-ROT-12: Chuyển qua Move rồi quay lại Rotate vẫn cộng dồn góc xoay chuẩn xác', () => {
  const r1 = simulateCircularDrag(0, 0, 0, 0, 135, 15);
  const movedPos = { x: 1.0, z: -0.5 };
  const r2 = simulateCircularDrag(movedPos.x, movedPos.z, r1.finalRotY, 135, 315, 15);
  assert.ok(Math.abs(r2.finalRotY - (315 * Math.PI) / 180) < EPS, `Expected 315°, got ${(r2.finalRotY * 180) / Math.PI}°`);
});

console.log('\n=============================================================================');
console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
}
