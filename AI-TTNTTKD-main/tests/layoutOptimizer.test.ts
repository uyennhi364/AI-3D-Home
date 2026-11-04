import {
  checkOBBCollision,
  createOBBFromObject,
  isOBBInsideRoom,
  clampOBBInsideRoom,
  validatePlacementSafety,
  findSmartPlacement,
} from '../src/engine/geometryEngine';
import {
  generateOptimizedLayout,
  validateOptimizedLayout,
} from '../src/engine/layoutOptimizer';
import { RoomConfig, RoomObject, UserFengShuiProfile } from '../src/types/fengshui';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules';
import { getUserFengShuiProfile } from '../src/engine/batTrach';

export function runLayoutOptimizerTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(desc: string, cond: boolean) {
    if (cond) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  console.log('\n--- [TEST SUITE 4: Layout Optimizer & 8 Collision Test Cases] ---');

  const standardRoom: RoomConfig = {
    width: 5.0,
    length: 5.2,
    height: 2.8,
    direction: 'N',
  };

  const userProfile: UserFengShuiProfile = getUserFengShuiProfile(2004, 'female');

  // -------------------------------------------------------------------------
  // Case 1: Di chuyển giường và tủ cùng lúc (Không bị chồng lấn)
  // -------------------------------------------------------------------------
  const bedObj: RoomObject = {
    id: 'bed_01',
    type: 'bed',
    name: 'Giường ngủ Master',
    dimensions: { width: 1.8, length: 2.0, height: 0.9 },
    position: { x: -1.2, y: 0, z: -1.5 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  const wardrobeObj: RoomObject = {
    id: 'wardrobe_01',
    type: 'wardrobe',
    name: 'Tủ quần áo',
    dimensions: { width: 1.8, length: 0.6, height: 2.2 },
    position: { x: 1.2, y: 0, z: -2.0 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  const c1Proposed = [bedObj, wardrobeObj];
  const c1Conflicts = validateOptimizedLayout(c1Proposed, { width: standardRoom.width, length: standardRoom.length });
  assert('Test 1: Di chuyển giường và tủ ở 2 vị trí riêng biệt không báo va chạm', c1Conflicts.length === 0);

  const wardrobeColliding: RoomObject = {
    ...wardrobeObj,
    position: { x: -1.2, y: 0, z: -1.5 }, // Same spot as bed
  };
  const c1BadConflicts = validateOptimizedLayout([bedObj, wardrobeColliding], { width: standardRoom.width, length: standardRoom.length });
  assert('Test 1b: Phát hiện va chạm khi giường và tủ cùng di chuyển vào một tọa độ', c1BadConflicts.length > 0);

  // -------------------------------------------------------------------------
  // Case 2: Di chuyển bàn và ghế cùng lúc
  // -------------------------------------------------------------------------
  const deskObj: RoomObject = {
    id: 'desk_01',
    type: 'desk',
    name: 'Bàn làm việc',
    dimensions: { width: 1.3, length: 0.65, height: 0.75 },
    position: { x: 1.5, y: 0, z: 1.0 },
    rotation: { x: 0, y: Math.PI, z: 0 },
  };

  const chairObj: RoomObject = {
    id: 'chair_01',
    type: 'chair',
    name: 'Ghế làm việc',
    dimensions: { width: 0.55, length: 0.55, height: 0.85 },
    position: { x: 1.5, y: 0, z: 1.6 }, // 0.6m offset along Z
    rotation: { x: 0, y: Math.PI, z: 0 },
  };

  const c2Conflicts = validateOptimizedLayout([deskObj, chairObj], { width: standardRoom.width, length: standardRoom.length });
  assert('Test 2: Bàn và ghế được đặt hợp lý trước nhau không bị xem là va chạm xuyên thấu', c2Conflicts.length === 0);

  // -------------------------------------------------------------------------
  // Case 3: Thêm nhiều đồ vật cùng loại (findSmartPlacement tránh trùng tọa độ)
  // -------------------------------------------------------------------------
  const existingObjects: RoomObject[] = [bedObj, wardrobeObj, deskObj];
  const plant1 = findSmartPlacement(
    'plant',
    { width: 0.5, length: 0.5, height: 0.9 },
    existingObjects,
    { width: standardRoom.width, length: standardRoom.length },
    { x: -1.5, z: 1.5 }
  );

  const plant1Obj: RoomObject = {
    id: 'plant_01',
    type: 'plant',
    name: 'Cây cảnh 1',
    dimensions: { width: 0.5, length: 0.5, height: 0.9 },
    position: { x: plant1.safePos.x, y: 0, z: plant1.safePos.z },
    rotation: { x: 0, y: plant1.rotationY, z: 0 },
  };

  const plant2 = findSmartPlacement(
    'plant',
    { width: 0.5, length: 0.5, height: 0.9 },
    [...existingObjects, plant1Obj],
    { width: standardRoom.width, length: standardRoom.length },
    { x: plant1.safePos.x, z: plant1.safePos.z } // requested same spot!
  );

  assert('Test 3: Cây cảnh thứ 2 tự động tìm vị trí khác, không đè lên cây cảnh 1',
    plant2.resolved && (Math.abs(plant2.safePos.x - plant1.safePos.x) > 0.3 || Math.abs(plant2.safePos.z - plant1.safePos.z) > 0.3)
  );

  // -------------------------------------------------------------------------
  // Case 4: Xoay tủ 90 độ rồi kiểm tra va chạm
  // -------------------------------------------------------------------------
  // Wardrobe original 1.8m x 0.6m at x: 0.0, z: -1.0. Bed at x: 0.9, z: -1.0
  const unrotatedWardrobeOBB = createOBBFromObject({ x: 0.0, z: -1.0 }, { width: 1.8, length: 0.6 }, 0);
  const rotatedWardrobeOBB = createOBBFromObject({ x: 0.0, z: -1.0 }, { width: 1.8, length: 0.6 }, Math.PI / 2);
  const sideBedOBB = createOBBFromObject({ x: 0.0, z: 0.0 }, { width: 1.6, length: 2.0 }, 0);

  // When rotated 90 deg, wardrobe extends from z = -1.0 - 0.9 (-1.9) to -1.0 + 0.9 (-0.1)
  // and bed extends from z = 0.0 - 1.0 (-1.0) to +1.0 -> they collide along Z!
  const collidesAfterRotate = checkOBBCollision(rotatedWardrobeOBB, sideBedOBB);
  assert('Test 4: Xoay tủ 90° kích hoạt kiểm tra SAT chính xác phát hiện va chạm với giường bên cạnh', collidesAfterRotate);

  // -------------------------------------------------------------------------
  // Case 5: Bố trí đồ vật trong phòng có diện tích nhỏ (3.0m x 3.0m)
  // -------------------------------------------------------------------------
  const smallRoom = { width: 3.0, length: 3.0 };
  const largeBedDims = { width: 2.2, length: 2.4, height: 1.0 };
  const smallRoomResult = findSmartPlacement('bed', largeBedDims, [], smallRoom);
  assert('Test 5: Trong phòng nhỏ, Smart Placement điều chỉnh kích thước thích ứng (adaptive sizing) để nằm trọn trong phòng',
    smallRoomResult.resolved && isOBBInsideRoom(
      createOBBFromObject(smallRoomResult.safePos, smallRoomResult.dimensions, smallRoomResult.rotationY),
      smallRoom
    )
  );

  // -------------------------------------------------------------------------
  // Case 6: Nhiều đồ vật tập trung tại một góc phòng
  // -------------------------------------------------------------------------
  const cornerItems: RoomObject[] = [
    { id: 'c1', type: 'wardrobe', name: 'Tủ', dimensions: { width: 1.0, length: 0.6, height: 2.0 }, position: { x: -1.8, y: 0, z: -1.8 }, rotation: { x: 0, y: 0, z: 0 } },
    { id: 'c2', type: 'desk', name: 'Bàn', dimensions: { width: 0.9, length: 0.5, height: 0.75 }, position: { x: -1.8, y: 0, z: -1.1 }, rotation: { x: 0, y: 0, z: 0 } },
  ];
  const cornerCheck = validatePlacementSafety(
    { x: -1.8, z: -1.5 }, // between c1 and c2
    { width: 1.0, length: 1.0 },
    0,
    cornerItems,
    { width: 5.0, length: 5.0 }
  );
  assert('Test 6: Đặt thêm đồ vật vào góc phòng đông đúc bị chặn do không đủ khoảng trống', !cornerCheck.valid);

  // -------------------------------------------------------------------------
  // Case 7: Không còn vị trí trống phù hợp
  // -------------------------------------------------------------------------
  // Create a room tightly packed with objects
  const packedObjects: RoomObject[] = [];
  for (let x = -1.8; x <= 1.8; x += 0.9) {
    for (let z = -1.8; z <= 1.8; z += 0.9) {
      packedObjects.push({
        id: `box_${x}_${z}`,
        type: 'wardrobe',
        name: 'Vật cản',
        dimensions: { width: 0.85, length: 0.85, height: 1.0 },
        position: { x: Math.round(x * 10) / 10, y: 0, z: Math.round(z * 10) / 10 },
        rotation: { x: 0, y: 0, z: 0 },
      });
    }
  }
  const noSpaceResult = findSmartPlacement('bed', { width: 1.8, length: 2.0 }, packedObjects, { width: 4.5, length: 4.5 });
  assert('Test 7: Khi phòng hoàn toàn kín chỗ, engine trả về resolved = false và không ép đặt đè lên đồ vật khác', !noSpaceResult.resolved);

  // -------------------------------------------------------------------------
  // Case 8: Áp dụng đề xuất khi một object bị chồng lấn (validateOptimizedLayout)
  // -------------------------------------------------------------------------
  const evalBefore = evaluateRoomFengShui(userProfile, standardRoom, [bedObj, wardrobeObj, deskObj]);
  const optResult = generateOptimizedLayout(userProfile, standardRoom, [bedObj, wardrobeObj, deskObj], evalBefore);

  // Verify that all adjustments generated have 0 collisions
  const finalTestObjects = [bedObj, wardrobeObj, deskObj].map((o) => {
    const adj = optResult.proposal.adjustments.find((a) => a.objectId === o.id);
    if (!adj) return o;
    return {
      ...o,
      position: { ...o.position, x: adj.suggestedX, z: adj.suggestedZ },
      rotation: { ...o.rotation, y: adj.suggestedRotationY },
    };
  });
  const optConflicts = validateOptimizedLayout(finalTestObjects, { width: standardRoom.width, length: standardRoom.length });
  assert('Test 8: Toàn bộ phương án sinh ra từ Layout Optimizer sạch va chạm OBB SAT 100%', optConflicts.length === 0);

  return { passed, failed };
}
