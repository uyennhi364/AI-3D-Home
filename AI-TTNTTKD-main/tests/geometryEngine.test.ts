import { checkOBBCollision, createOBBFromObject, clampOBBInsideRoom } from '../src/engine/geometryEngine';
import { RoomConfig, RoomObject } from '../src/types/fengshui';

export function runGeometryEngineTests() {
  console.log('\n--- [TEST SUITE 2: Geometry Engine & OBB SAT] ---');
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${desc}`);
      failed++;
    }
  }

  const roomConfig: RoomConfig = {
    width: 4.2,
    length: 5.0,
    height: 2.8,
    direction: 'N',
    doorWall: 'east',
    windowWall: 'west',
  };

  const bed: RoomObject = {
    id: 'bed_test',
    type: 'bed',
    name: 'Giường ngủ',
    dimensions: { width: 1.8, length: 2.0, height: 0.9 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  const deskOverlapping: RoomObject = {
    id: 'desk_test',
    type: 'desk',
    name: 'Bàn học',
    dimensions: { width: 1.2, length: 0.8, height: 0.75 },
    position: { x: 0.5, y: 0, z: 0.5 }, // overlaps with bed
    rotation: { x: 0, y: 0, z: 0 },
  };

  const deskFar: RoomObject = {
    id: 'desk_far',
    type: 'desk',
    name: 'Bàn học xa',
    dimensions: { width: 1.2, length: 0.8, height: 0.75 },
    position: { x: 1.8, y: 0, z: -1.8 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  const bedOBB = createOBBFromObject(bed.position, bed.dimensions, bed.rotation.y);
  const deskOverlapOBB = createOBBFromObject(deskOverlapping.position, deskOverlapping.dimensions, deskOverlapping.rotation.y);
  const deskFarOBB = createOBBFromObject(deskFar.position, deskFar.dimensions, deskFar.rotation.y);

  // 1. OBB Collision between overlapping bed and desk
  const collisionOverlap = checkOBBCollision(bedOBB, deskOverlapOBB);
  assert('Phát hiện va chạm OBB SAT khi 2 vật thể chồng lấn', collisionOverlap === true);

  // 2. No collision when objects are separated
  const collisionFar = checkOBBCollision(bedOBB, deskFarOBB);
  assert('Không báo va chạm giả khi 2 vật thể cách xa nhau', collisionFar === false);

  // 3. Clamping inside room boundary
  const outsidePos = { x: 5.0, z: 5.0 };
  const clamped = clampOBBInsideRoom(outsidePos, bed.dimensions, 0, roomConfig);
  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;
  assert(
    'clampOBBInsideRoom giữ vật thể nằm trọn vẹn trong biên phòng',
    clamped.x < halfW && clamped.x > -halfW && clamped.z < halfL && clamped.z > -halfL
  );

  return { passed, failed };
}
