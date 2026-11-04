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

  return { passed, failed };
}
