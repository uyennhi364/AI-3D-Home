import { classifyUserIntent, extractAllActionItems, detectContextReference } from '../src/engine/intentClassifier';
import { resolveContextTargets } from '../src/engine/contextResolver';
import { RoomObject, StructuredActionHistoryEntry } from '../src/types/fengshui';

export function runIntentClassifierTests() {
  console.log('\n--- [TEST SUITE 3: AI NLP Intent Classifier & Multi-Action Parser] ---');
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

  // 1. Single action classification
  const c1 = classifyUserIntent('Thêm một chiếc giường');
  assert('Nhận diện đúng intent ADD_OBJECT cho "Thêm một chiếc giường"', c1.intent === 'ADD_OBJECT');
  assert('Nhận diện đúng objectType = bed', c1.extractedObjectType === 'bed');

  // 2. Multi-action item extraction
  const items = extractAllActionItems('Thêm giường ngủ, bàn học và 2 cây cảnh');
  assert('Tách được danh sách 3 loại vật thể từ câu lệnh liên hoàn', items.length === 3);
  const plantItem = items.find((it) => it.type === 'plant');
  assert('Trích xuất đúng quantity = 2 cho cây cảnh', plantItem?.quantity === 2);

  // 3. Multi-delete extraction
  const delItems = extractAllActionItems('Xóa giường và tủ');
  assert('Trích xuất được 2 đồ vật cần xóa', delItems.length === 2);

  // 4. Anaphora Context Reference
  const ref1 = detectContextReference('Xóa những cái vừa tạo');
  assert('Phát hiện ngữ cảnh "vừa tạo" (recently_created)', ref1?.type === 'recently_created');

  const ref2 = detectContextReference('Xoay nó 90 độ');
  assert('Phát hiện ngữ cảnh đại từ "nó" (pronoun)', ref2?.type === 'pronoun');

  // 5. Context Resolver
  const mockObjects: RoomObject[] = [
    {
      id: 'bed_101',
      type: 'bed',
      name: 'Giường ngủ',
      dimensions: { width: 1.8, length: 2.0, height: 0.9 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'desk_102',
      type: 'desk',
      name: 'Bàn làm việc',
      dimensions: { width: 1.2, length: 0.8, height: 0.75 },
      position: { x: 1.0, y: 0, z: -1.0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  ];

  const mockHistory: StructuredActionHistoryEntry[] = [
    {
      actionId: 'act_1',
      actionType: 'add_object',
      objectId: 'bed_101',
      objectType: 'bed',
      objectName: 'Giường ngủ',
      quantity: 1,
      timestamp: Date.now(),
      batchGroupId: 'batch_1',
      executionStatus: 'SUCCESS',
    },
    {
      actionId: 'act_2',
      actionType: 'add_object',
      objectId: 'desk_102',
      objectType: 'desk',
      objectName: 'Bàn làm việc',
      quantity: 1,
      timestamp: Date.now(),
      batchGroupId: 'batch_1',
      executionStatus: 'SUCCESS',
    },
  ];

  if (ref1) {
    const res = resolveContextTargets(ref1, mockHistory, mockObjects, null);
    assert('resolveContextTargets trả về đúng 2 đồ vật vừa tạo trong history', res.resolved && res.targetObjects.length === 2);
  }

  // =========================================================================
  // 8 MANDATORY INTEGRATION VERIFICATION TEST CASES
  // =========================================================================
  console.log('\n  -- 8 Mandatory Integration Test Cases --');

  // Case 1: "Thêm một bàn học" -> ADD_OBJECT (desk)
  const case1 = classifyUserIntent('Thêm một bàn học');
  assert('Test Case 1: "Thêm một bàn học" -> ADD_OBJECT', case1.intent === 'ADD_OBJECT');
  assert('Test Case 1: Trích xuất đúng objectType = desk', case1.extractedObjectType === 'desk');

  // Case 2: "Xóa bàn vừa mới thêm" -> DELETE_OBJECT, exact object ID
  const case2 = classifyUserIntent('xóa bàn vừa mới thêm');
  assert('Test Case 2: "xóa bàn vừa mới thêm" -> DELETE_OBJECT (NOT ADD_OBJECT)', case2.intent === 'DELETE_OBJECT');
  const refCase2 = detectContextReference('xóa bàn vừa mới thêm');
  assert('Test Case 2: Nhận diện specific_recent context', refCase2?.type === 'specific_recent');
  if (refCase2) {
    const resCase2 = resolveContextTargets(refCase2, mockHistory, mockObjects, null);
    assert('Test Case 2: Truy xuất chính xác đúng object ID bàn vừa thêm (desk_102)', resCase2.resolved && resCase2.targetObjects[0]?.id === 'desk_102');
  }

  // Case 3: "Xóa chiếc bàn cạnh cửa sổ" -> DELETE_OBJECT by spatial proximity
  const mockSpatialObjects: RoomObject[] = [
    {
      id: 'desk_near_window',
      type: 'desk',
      name: 'Bàn học gần cửa sổ',
      dimensions: { width: 1.2, length: 0.8, height: 0.75 },
      position: { x: -2.3, y: 0, z: 0.5 }, // Close to window at (-2.4, 0)
      rotation: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'desk_far_door',
      type: 'desk',
      name: 'Bàn học gần cửa chính',
      dimensions: { width: 1.2, length: 0.8, height: 0.75 },
      position: { x: 2.2, y: 0, z: -0.2 }, // Close to door at (2.4, -0.2)
      rotation: { x: 0, y: 0, z: 0 },
    },
  ];
  const case3 = classifyUserIntent('xóa chiếc bàn cạnh cửa sổ');
  assert('Test Case 3: "xóa chiếc bàn cạnh cửa sổ" -> DELETE_OBJECT', case3.intent === 'DELETE_OBJECT');
  const refCase3 = detectContextReference('xóa chiếc bàn cạnh cửa sổ');
  assert('Test Case 3: Nhận diện spatial_relation với spatialAnchor = window', refCase3?.type === 'spatial_relation' && refCase3.spatialAnchor === 'window');
  if (refCase3) {
    const mockRoomCfg = { width: 5.0, length: 5.2, height: 2.8, direction: 'S' as any };
    const resCase3 = resolveContextTargets(refCase3, mockHistory, mockSpatialObjects, null, mockRoomCfg);
    assert('Test Case 3: Tìm đúng bàn gần cửa sổ nhất (desk_near_window)', resCase3.resolved && resCase3.targetObjects[0]?.id === 'desk_near_window');
  }

  // Case 4: "Phân tích vị trí các đồ vật" -> ANALYZE_ROOM
  const case4 = classifyUserIntent('Phân tích vị trí các đồ vật');
  assert('Test Case 4: "Phân tích vị trí các đồ vật" -> ANALYZE_ROOM', case4.intent === 'ANALYZE_ROOM');

  // Case 5: "Phòng này có hợp phong thủy không?" -> ANALYZE_ROOM
  const case5 = classifyUserIntent('Phòng này có hợp phong thủy không?');
  assert('Test Case 5: "Phòng này có hợp phong thủy không?" -> ANALYZE_ROOM', case5.intent === 'ANALYZE_ROOM');

  // Case 6: "Tối ưu phong thủy phòng ngủ cho tôi" -> OPTIMIZE_ROOM
  const case6 = classifyUserIntent('Tối ưu phong thủy phòng ngủ cho tôi');
  assert('Test Case 6: "Tối ưu phong thủy phòng ngủ cho tôi" -> OPTIMIZE_ROOM', case6.intent === 'OPTIMIZE_ROOM');

  // Case 7: "Gương đối diện giường có sao không?" -> FENG_SHUI_CONSULT (theory text, no 3D action)
  const case7 = classifyUserIntent('Gương đối diện giường có sao không?');
  assert('Test Case 7: "Gương đối diện giường có sao không?" -> FENG_SHUI_CONSULT', case7.intent === 'FENG_SHUI_CONSULT');

  // Case 8: "Thêm một chậu cây" -> ADD_OBJECT (plant)
  const case8 = classifyUserIntent('Thêm một chậu cây');
  assert('Test Case 8: "Thêm một chậu cây" -> ADD_OBJECT', case8.intent === 'ADD_OBJECT');
  assert('Test Case 8: Trích xuất đúng objectType = plant', case8.extractedObjectType === 'plant');

  return { passed, failed };
}
