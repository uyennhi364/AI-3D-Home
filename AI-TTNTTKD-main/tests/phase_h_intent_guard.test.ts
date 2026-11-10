// =============================================================================
// tests/phase_h_intent_guard.test.ts
// Comprehensive Test Suite for Phase H Intent Guard & Execution Safeguards
// Validates all 12 Mandatory Rules from Master Specification Phase H
// =============================================================================

import { evaluateIntentSafety } from '../src/services/intentGuard';
import {
  classifyUserIntent,
  detectObjectTypeFromText,
  extractAllActionItems,
} from '../src/engine/intentClassifier';

interface TestCaseResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestCaseResult[] = [];

function recordTest(name: string, category: string, passed: boolean, expected: string, actual: string, error?: string) {
  results.push({ name, category, passed, expected, actual, error });
  const status = passed ? '✓ PASS' : '✕ FAIL';
  console.log(`[${status}] [${category}] ${name}`);
  if (!passed) {
    console.log(`       Expected: ${expected}`);
    console.log(`       Actual:   ${actual}`);
    if (error) console.log(`       Error:    ${error}`);
  }
}

console.log('=============================================================================');
console.log('RUNNING PHASE H INTENT GUARD & EXECUTION SAFETY TESTS');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// GROUP 1: Rule 1 & Rule 7: Theoretical questions must not execute 3D mutations
// -----------------------------------------------------------------------------
{
  const prompt = 'Gương đối diện giường có sao không?';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'THEORY' &&
    guard.isSafeToExecute === false &&
    guard.isAdvisoryOrQuestion === true &&
    intent.needs3DExecution === false;

  recordTest(
    'TC01: "Gương đối diện giường có sao không?" -> THEORY mode, no 3D execution',
    'Rule 1 & 7',
    passed,
    'executionMode=THEORY, isSafeToExecute=false, needs3DExecution=false',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, needs3DExecution=${intent.needs3DExecution}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 2: Rule 2: Questions mentioning action words ("di chuyển", "xoay", "tối ưu")
// -----------------------------------------------------------------------------
{
  const prompt = 'Tại sao cần di chuyển giường tựa vào tường?';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'THEORY' &&
    guard.isSafeToExecute === false &&
    guard.isAdvisoryOrQuestion === true &&
    intent.needs3DExecution === false;

  recordTest(
    'TC02: "Tại sao cần di chuyển giường..." -> THEORY mode, no 3D execution',
    'Rule 2',
    passed,
    'executionMode=THEORY, isSafeToExecute=false, needs3DExecution=false',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, needs3DExecution=${intent.needs3DExecution}`
  );
}

{
  const prompt = 'Nếu xoay giường 90 độ thì có phạm phong thủy không?';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'THEORY' &&
    guard.isSafeToExecute === false &&
    guard.isAdvisoryOrQuestion === true &&
    intent.needs3DExecution === false;

  recordTest(
    'TC03: "Nếu xoay giường 90 độ thì có phạm..." -> THEORY mode, no 3D execution',
    'Rule 2',
    passed,
    'executionMode=THEORY, isSafeToExecute=false, needs3DExecution=false',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, needs3DExecution=${intent.needs3DExecution}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 3: Rule 6: "Có nên tối ưu phòng không?" must NEVER trigger optimize_room
// -----------------------------------------------------------------------------
{
  const prompt = 'Có nên tối ưu phòng không?';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'THEORY' &&
    guard.isSafeToExecute === false &&
    guard.isAdvisoryOrQuestion === true &&
    intent.intent !== 'OPTIMIZE_ROOM' &&
    intent.needs3DExecution === false;

  recordTest(
    'TC04: "Có nên tối ưu phòng không?" -> THEORY mode, NOT OPTIMIZE_ROOM',
    'Rule 6',
    passed,
    'executionMode=THEORY, isSafeToExecute=false, intent!=OPTIMIZE_ROOM, needs3DExecution=false',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, intent=${intent.intent}, needs3DExecution=${intent.needs3DExecution}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 4: Rule 8: Compound remedy request before action must PROPOSE, not mutate
// -----------------------------------------------------------------------------
{
  const prompt = 'Làm sao xử lý việc gương đối diện giường? Hãy gợi ý cách khắc phục và di chuyển trên 3D.';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    (guard.executionMode === 'PROPOSE' || guard.executionMode === 'THEORY') &&
    guard.isSafeToExecute === false &&
    guard.isAdvisoryOrQuestion === true &&
    intent.needs3DExecution === false;

  recordTest(
    'TC05: "Làm sao xử lý gương đối diện giường? Gợi ý khắc phục..." -> PROPOSE/THEORY, no 3D mutation',
    'Rule 8',
    passed,
    'executionMode in [PROPOSE, THEORY], isSafeToExecute=false, needs3DExecution=false',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, needs3DExecution=${intent.needs3DExecution}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 5: Rule 3: Polite commands with clear targets must be recognized as COMMAND
// -----------------------------------------------------------------------------
{
  const prompt = 'Bạn có thể giúp tôi di chuyển giường sang trái 50cm được không?';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'COMMAND' &&
    guard.isSafeToExecute === true &&
    guard.isAdvisoryOrQuestion === false &&
    intent.intent === 'MOVE_OBJECT' &&
    intent.extractedObjectType === 'bed' &&
    intent.distanceMeters === 0.5 &&
    intent.targetDirection === 'left';

  recordTest(
    'TC06: Polite command: "Bạn có thể giúp tôi di chuyển giường sang trái 50cm được không?" -> COMMAND',
    'Rule 3',
    passed,
    'executionMode=COMMAND, isSafeToExecute=true, intent=MOVE_OBJECT, obj=bed, dist=0.5, dir=left',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, intent=${intent.intent}, obj=${intent.extractedObjectType}, dist=${intent.distanceMeters}, dir=${intent.targetDirection}`
  );
}

{
  const prompt = 'Nhờ bạn xoay giường 90 độ giúp tôi với';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'COMMAND' &&
    guard.isSafeToExecute === true &&
    intent.intent === 'ROTATE_OBJECT' &&
    intent.extractedObjectType === 'bed' &&
    intent.rotationDegrees === 90;

  recordTest(
    'TC07: Polite command: "Nhờ bạn xoay giường 90 độ giúp tôi với" -> COMMAND rot=90',
    'Rule 3',
    passed,
    'executionMode=COMMAND, isSafeToExecute=true, intent=ROTATE_OBJECT, obj=bed, rot=90',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, intent=${intent.intent}, obj=${intent.extractedObjectType}, rot=${intent.rotationDegrees}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 6: Rule 4 & 5: Ambiguous target commands must ask back, NEVER pick objects[0]
// -----------------------------------------------------------------------------
{
  const prompt = 'Di chuyển sang trái 50cm';
  const guard = evaluateIntentSafety(prompt, false);

  const passed =
    guard.hasAmbiguousTarget === true &&
    guard.requiresTargetClarification === true &&
    guard.isSafeToExecute === false;

  recordTest(
    'TC08: Ambiguous target "Di chuyển sang trái 50cm" -> requiresTargetClarification=true',
    'Rule 4 & 5',
    passed,
    'hasAmbiguousTarget=true, requiresTargetClarification=true, isSafeToExecute=false',
    `hasAmbiguousTarget=${guard.hasAmbiguousTarget}, requiresTargetClarification=${guard.requiresTargetClarification}, isSafeToExecute=${guard.isSafeToExecute}`
  );
}

{
  const prompt = 'Xoay 90 độ';
  const guard = evaluateIntentSafety(prompt, false);

  const passed =
    guard.hasAmbiguousTarget === true &&
    guard.requiresTargetClarification === true &&
    guard.isSafeToExecute === false;

  recordTest(
    'TC09: Ambiguous target "Xoay 90 độ" -> requiresTargetClarification=true',
    'Rule 4 & 5',
    passed,
    'hasAmbiguousTarget=true, requiresTargetClarification=true, isSafeToExecute=false',
    `hasAmbiguousTarget=${guard.hasAmbiguousTarget}, requiresTargetClarification=${guard.requiresTargetClarification}, isSafeToExecute=${guard.isSafeToExecute}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 7: Rule 9 & 10: Standard imperative commands must continue working
// -----------------------------------------------------------------------------
{
  const prompt = 'Xoay giường 90 độ';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);

  const passed =
    guard.executionMode === 'COMMAND' &&
    guard.isSafeToExecute === true &&
    intent.intent === 'ROTATE_OBJECT' &&
    intent.extractedObjectType === 'bed' &&
    intent.rotationDegrees === 90 &&
    intent.needs3DExecution === true;

  recordTest(
    'TC10: "Xoay giường 90 độ" -> ROTATE_OBJECT bed 90deg needs3DExecution=true',
    'Rule 9',
    passed,
    'executionMode=COMMAND, isSafeToExecute=true, intent=ROTATE_OBJECT, obj=bed, deg=90',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, intent=${intent.intent}, obj=${intent.extractedObjectType}, deg=${intent.rotationDegrees}`
  );
}

{
  const prompt = 'Thêm bàn học';
  const guard = evaluateIntentSafety(prompt, true);
  const intent = classifyUserIntent(prompt);
  const actionItems = extractAllActionItems(prompt);

  const passed =
    guard.executionMode === 'COMMAND' &&
    guard.isSafeToExecute === true &&
    intent.intent === 'ADD_OBJECT' &&
    intent.extractedObjectType === 'desk' &&
    actionItems.length === 1 &&
    actionItems[0].type === 'desk';

  recordTest(
    'TC11: "Thêm bàn học" -> ADD_OBJECT desk needs3DExecution=true',
    'Rule 10',
    passed,
    'executionMode=COMMAND, isSafeToExecute=true, intent=ADD_OBJECT, obj=desk',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}, intent=${intent.intent}, obj=${intent.extractedObjectType}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 8: Rule 11: "Xóa tủ quần áo" vs "Xóa tủ đầu giường" collision resolution
// -----------------------------------------------------------------------------
{
  const prompt = 'Xóa tủ quần áo';
  const detected = detectObjectTypeFromText(prompt);
  const intent = classifyUserIntent(prompt);
  const actionItems = extractAllActionItems(prompt);

  const passed =
    detected?.type === 'wardrobe' &&
    intent.extractedObjectType === 'wardrobe' &&
    actionItems[0]?.type === 'wardrobe';

  recordTest(
    'TC12: "Xóa tủ quần áo" -> detects "wardrobe", NOT nightstand',
    'Rule 11',
    passed,
    'type=wardrobe',
    `detected=${detected?.type}, intentObj=${intent.extractedObjectType}, actionItem=${actionItems[0]?.type}`
  );
}

{
  const prompt = 'Xóa tủ đầu giường';
  const detected = detectObjectTypeFromText(prompt);
  const intent = classifyUserIntent(prompt);
  const actionItems = extractAllActionItems(prompt);

  const passed =
    detected?.type === 'nightstand' &&
    intent.extractedObjectType === 'nightstand' &&
    actionItems[0]?.type === 'nightstand';

  recordTest(
    'TC13: "Xóa tủ đầu giường" -> detects "nightstand", NOT wardrobe or bed',
    'Rule 11',
    passed,
    'type=nightstand',
    `detected=${detected?.type}, intentObj=${intent.extractedObjectType}, actionItem=${actionItems[0]?.type}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 9: Rule 12: Undo vs Cancel Preview collision resolution
// -----------------------------------------------------------------------------
{
  const prompt = 'Hoàn tác thao tác vừa rồi';
  const guard = evaluateIntentSafety(prompt);

  const passed =
    guard.executionMode === 'UNDO' &&
    guard.isSafeToExecute === true;

  recordTest(
    'TC14: "Hoàn tác thao tác vừa rồi" -> executionMode=UNDO',
    'Rule 12',
    passed,
    'executionMode=UNDO, isSafeToExecute=true',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}`
  );
}

{
  const prompt = 'Hủy thao tác vừa rồi';
  const guard = evaluateIntentSafety(prompt);

  const passed =
    guard.executionMode === 'UNDO' &&
    guard.isSafeToExecute === true;

  recordTest(
    'TC15: "Hủy thao tác vừa rồi" -> executionMode=UNDO (NOT Cancel Preview)',
    'Rule 12',
    passed,
    'executionMode=UNDO, isSafeToExecute=true',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}`
  );
}

{
  const prompt = 'Tắt xem trước bóng mờ 3D';
  const guard = evaluateIntentSafety(prompt);

  const passed =
    guard.executionMode === 'COMMAND' &&
    guard.isSafeToExecute === true;

  recordTest(
    'TC16: "Tắt xem trước bóng mờ 3D" -> executionMode=COMMAND (preview cancellation)',
    'Rule 12',
    passed,
    'executionMode=COMMAND, isSafeToExecute=true',
    `executionMode=${guard.executionMode}, isSafeToExecute=${guard.isSafeToExecute}`
  );
}

// -----------------------------------------------------------------------------
// GROUP 10: Rule 4 & 5 Regression: Pinned phrase "Giữ nguyên tủ, chỉ di chuyển giường"
// -----------------------------------------------------------------------------
{
  const prompt = 'Giữ nguyên tủ quần áo, chỉ di chuyển giường sang trái 50cm';
  const intent = classifyUserIntent(prompt);

  const passed =
    intent.intent === 'MOVE_OBJECT' &&
    intent.extractedObjectType === 'bed' &&
    intent.pinnedObjectType === 'wardrobe';

  recordTest(
    'TC17: Pinned phrase: "Giữ nguyên tủ quần áo, chỉ di chuyển giường..." -> targets bed, pins wardrobe',
    'Rule 4 & Regression',
    passed,
    'intent=MOVE_OBJECT, extracted=bed, pinned=wardrobe',
    `intent=${intent.intent}, extracted=${intent.extractedObjectType}, pinned=${intent.pinnedObjectType}`
  );
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
const total = results.length;
const passedCount = results.filter((r) => r.passed).length;
const failedCount = total - passedCount;

console.log(`TOTAL TESTS:  ${total}`);
console.log(`PASSED:       ${passedCount}`);
console.log(`FAILED:       ${failedCount}`);
console.log(`SKIPPED:      0`);
console.log('=============================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE H INTENT GUARD & SAFETY TESTS PASSED SUCCESSFULLY!\n');
}
