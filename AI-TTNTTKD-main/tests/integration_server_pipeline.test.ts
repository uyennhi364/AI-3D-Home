// =============================================================================
// tests/integration_server_pipeline.test.ts
// Real Express Server HTTP Integration Tests for /api/chat Pipeline
// Tests the full HTTP request-response cycle, Server-Side Intent Guard,
// and Destructive Action Confirmation Gate at the SDK boundary.
// =============================================================================

import http from 'http';
import {
  app,
  setMockGenAIClient,
  computeSceneVersion,
  pendingConfirmations,
} from '../server.js';

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestCaseResult[] = [];

// Sample test room & profile fixtures
const defaultProfile = {
  birthYear: 1985,
  gender: 'male' as const,
  guaName: 'Càn',
  element: 'Kim',
  group: 'Tây Tứ Mệnh',
  auspiciousDirections: ['Tây', 'Đông Bắc', 'Tây Nam', 'Tây Bắc'],
  inauspiciousDirections: ['Đông', 'Đông Nam', 'Nam', 'Bắc'],
};

const defaultRoom = {
  width: 5.0,
  length: 5.2,
  height: 2.8,
  direction: 'Tây',
};

const defaultObjects = [
  {
    id: 'bed_01',
    type: 'bed',
    name: 'Giường ngủ Master',
    dimensions: { width: 1.8, length: 2.0, height: 0.95 },
    position: { x: 0, y: 0, z: -1.0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'wardrobe_01',
    type: 'wardrobe',
    name: 'Tủ quần áo',
    dimensions: { width: 1.8, length: 0.6, height: 2.2 },
    position: { x: -1.8, y: 0, z: 0.5 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
  },
];

async function runIntegrationTests() {
  console.log('\n=============================================================================');
  console.log('RUNNING FULL EXPRESS HTTP SERVER INTEGRATION TESTS (/api/chat)');
  console.log('=============================================================================\n');

  // Start Express server on random ephemeral port
  process.env.NODE_ENV = 'test';
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`[TEST SERVER] Listening on ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: THEORY prompt -> không có write action
    // -------------------------------------------------------------------------
    {
      setMockGenAIClient(null); // Local AI path
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Tại sao không nên để đầu giường sát cửa sổ?' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const passed = data.success === true && (data.aiActions === null || data.aiActions === undefined) && typeof data.reply === 'string';
      results.push({
        id: 'INT-01',
        name: 'THEORY prompt -> không có write action trên scene 3D',
        passed,
        details: `aiActions=${JSON.stringify(data.aiActions)}, reply length=${data.reply?.length}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: ANALYZE prompt -> không có write action
    // -------------------------------------------------------------------------
    {
      setMockGenAIClient(null);
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Điểm phong thủy phòng ngủ là bao nhiêu?' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const passed = data.success === true && (data.aiActions === null || data.aiActions === undefined) && data.reply?.includes('Điểm phong thủy');
      results.push({
        id: 'INT-02',
        name: 'ANALYZE prompt -> trả về điểm số/phân tích, không thay đổi 3D',
        passed,
        details: `aiActions=${JSON.stringify(data.aiActions)}, score mentioned=${data.reply?.includes('Điểm phong thủy')}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: COMMAND prompt hợp lệ -> action được kiểm tra và thực thi
    // -------------------------------------------------------------------------
    {
      // Mock Gemini SDK proposing rotate_furniture for bed_01
      setMockGenAIClient({
        models: {
          generateContent: async () => ({
            text: 'Tôi sẽ xoay giường 90 độ cho bạn.',
            functionCalls: [
              {
                name: 'rotate_furniture',
                args: { objectId: 'bed_01', angleDegrees: 90, reason: 'Chỉnh hướng đầu giường' },
              },
            ],
          }),
        },
      });

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Xoay giường 90 độ' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const actions = data.aiActions?.actions || [];
      const hasRotateAction = actions.some((a: any) => a.type === 'rotate_object' && a.objectId === 'bed_01');
      const passed = data.success === true && hasRotateAction;
      results.push({
        id: 'INT-03',
        name: 'COMMAND prompt hợp lệ ("Xoay giường 90 độ") -> action được thực thi',
        passed,
        details: `hasRotateAction=${hasRotateAction}, actions=${JSON.stringify(actions)}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: COMMAND nhưng target mơ hồ -> yêu cầu làm rõ
    // -------------------------------------------------------------------------
    {
      setMockGenAIClient(null);
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Di chuyển sang trái 50cm' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const passed = data.success === true && (data.aiActions === null || data.guardBlocked === true);
      results.push({
        id: 'INT-04',
        name: 'COMMAND nhưng target mơ hồ ("Di chuyển sang trái 50cm") -> không tự ý thực thi',
        passed,
        details: `aiActions=${JSON.stringify(data.aiActions)}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Gemini đề xuất move_object khi user chỉ hỏi lý thuyết -> Server từ chối
    // -------------------------------------------------------------------------
    {
      // Mock rogue Gemini proposing a move_furniture call when user only asked a question
      setMockGenAIClient({
        models: {
          generateContent: async () => ({
            text: 'Tôi sẽ di chuyển giường để hóa giải.',
            functionCalls: [
              {
                name: 'move_furniture',
                args: { objectId: 'bed_01', targetX: 1.0, targetZ: 0.5, reason: 'Tự ý di chuyển' },
              },
            ],
          }),
        },
      });

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Gương đối diện giường có sao không?' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const passed = data.success === true && (data.guardBlocked === true || data.aiActions === null);
      results.push({
        id: 'INT-05',
        name: 'Gemini đề xuất move_object khi user hỏi lý thuyết -> Server Guard TỪ CHỐI',
        passed,
        details: `guardBlocked=${data.guardBlocked}, aiActions=${JSON.stringify(data.aiActions)}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Gemini đề xuất delete_object nhưng chưa xác nhận -> Chuyển sang Proposal
    // -------------------------------------------------------------------------
    let capturedDeleteProposalId = '';
    const initialSceneVersion = computeSceneVersion(defaultObjects);

    {
      setMockGenAIClient({
        models: {
          generateContent: async () => ({
            text: 'Tôi sẽ xóa tủ quần áo.',
            functionCalls: [
              {
                name: 'delete_furniture',
                args: { objectType: 'wardrobe', reason: 'Dọn phòng' },
              },
            ],
          }),
        },
      });

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Xóa tủ quần áo' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const hasExecutedDelete = data.aiActions?.actions?.some((a: any) => a.type === 'delete_object');
      capturedDeleteProposalId = data.proposalId || '';

      const passed = data.success === true && !hasExecutedDelete && Boolean(capturedDeleteProposalId);

      results.push({
        id: 'INT-06',
        name: 'Gemini đề xuất delete_object chưa xác nhận -> Chờ confirmation, không xóa ngay',
        passed,
        details: `hasExecutedDelete=${hasExecutedDelete}, proposalCreated=${capturedDeleteProposalId}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: Gemini đề xuất optimize_room nhưng chưa xác nhận -> Chờ confirmation
    // -------------------------------------------------------------------------
    let capturedOptimizeProposalId = '';
    {
      setMockGenAIClient({
        models: {
          generateContent: async () => ({
            text: 'Tôi sẽ tối ưu phòng cho bạn.',
            functionCalls: [
              {
                name: 'optimize_room_layout',
                args: { reason: 'Tối ưu phong thủy' },
              },
            ],
          }),
        },
      });

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Tối ưu phòng cho tôi' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const data = await res.json();
      const hasExecutedOptimize = data.aiActions?.actions?.some((a: any) => a.type === 'optimize_room');
      capturedOptimizeProposalId = data.proposalId || '';

      const passed = data.success === true && !hasExecutedOptimize && Boolean(capturedOptimizeProposalId);
      results.push({
        id: 'INT-07',
        name: 'Gemini đề xuất optimize_room chưa xác nhận -> Chờ confirmation',
        passed,
        details: `hasExecutedOptimize=${hasExecutedOptimize}, proposalCreated=${capturedOptimizeProposalId}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 8: Confirmation hợp lệ -> Chỉ thực thi đúng proposal đã xác nhận
    // -------------------------------------------------------------------------
    {
      // 8a: Confirm the delete proposal via /api/chat/confirm
      const confirmRes = await fetch(`${baseUrl}/api/chat/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: capturedDeleteProposalId,
          sceneVersion: initialSceneVersion,
        }),
      });
      const confirmData = await confirmRes.json();
      const confirmOk = confirmData.success === true;

      // 8b: Execute confirmed delete request passing proposalId
      setMockGenAIClient({
        models: {
          generateContent: async () => ({
            text: 'Xóa tủ quần áo đã xác nhận.',
            functionCalls: [
              {
                name: 'delete_furniture',
                args: { objectType: 'wardrobe', proposalId: capturedDeleteProposalId },
              },
            ],
          }),
        },
      });

      const execRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Xác nhận ${capturedDeleteProposalId}` }],
          proposalId: capturedDeleteProposalId,
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const execData = await execRes.json();
      const actions = execData.aiActions?.actions || [];
      const hasDeleted = actions.some((a: any) => a.type === 'delete_object');

      const passed = confirmOk && hasDeleted;
      results.push({
        id: 'INT-08',
        name: 'Confirmation hợp lệ -> thực thi đúng proposal đã xác nhận',
        passed,
        details: `confirmOk=${confirmOk}, hasDeleted=${hasDeleted}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 9: Proposal cũ hoặc scene version đã thay đổi -> Bị từ chối
    // -------------------------------------------------------------------------
    {
      // Attempt to confirm the optimize proposal with a mutated/wrong scene version
      const wrongSceneVersion = 'sv_mutated_hash_99999';
      const rejectRes = await fetch(`${baseUrl}/api/chat/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: capturedOptimizeProposalId,
          sceneVersion: wrongSceneVersion,
        }),
      });
      const rejectData = await rejectRes.json();
      const rejectedOnMismatch = rejectData.success === false && rejectRes.status === 409;

      // Attempt to confirm a non-existent proposal ID
      const notFoundRes = await fetch(`${baseUrl}/api/chat/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: 'prop_non_existent_123',
          sceneVersion: initialSceneVersion,
        }),
      });
      const notFoundData = await notFoundRes.json();
      const rejectedOnNotFound = notFoundData.success === false && notFoundRes.status === 409;

      const passed = rejectedOnMismatch && rejectedOnNotFound;
      results.push({
        id: 'INT-09',
        name: 'Proposal có scene version không khớp hoặc không tồn tại -> TỪ CHỐI (409)',
        passed,
        details: `rejectedOnMismatch=${rejectedOnMismatch}, rejectedOnNotFound=${rejectedOnNotFound}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 10: Undo -> hoạt động đúng, không nhầm với Cancel Preview
    // -------------------------------------------------------------------------
    {
      setMockGenAIClient(null);
      const undoRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hoàn tác thao tác vừa rồi' }],
          userProfile: defaultProfile,
          roomConfig: defaultRoom,
          objects: defaultObjects,
        }),
      });
      const undoData = await undoRes.json();
      const actions = undoData.aiActions?.actions || [];
      const hasUndoAction = actions.some((a: any) => a.type === 'undo_action');

      results.push({
        id: 'INT-10',
        name: 'Undo ("Hoàn tác thao tác vừa rồi") -> thực thi undo_action an toàn',
        passed: undoData.success === true && hasUndoAction,
        details: `hasUndoAction=${hasUndoAction}, reply=${undoData.reply?.slice(0, 50)}...`,
      });
    }

  } finally {
    // Clean up mock and shut down server cleanly
    setMockGenAIClient(null);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('[TEST SERVER] Closed.\n');
  }

  // Print results summary
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    if (r.passed) {
      passCount++;
      console.log(`[✓ PASS] ${r.id}: ${r.name}`);
    } else {
      failCount++;
      console.log(`[✕ FAIL] ${r.id}: ${r.name}`);
      console.log(`         Details: ${r.details}`);
    }
  }

  console.log('\n=============================================================================');
  console.log(`TOTAL INTEGRATION TESTS: ${results.length}`);
  console.log(`PASSED:                  ${passCount}`);
  console.log(`FAILED:                  ${failCount}`);
  console.log('=============================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runIntegrationTests().catch((err) => {
  console.error('Fatal error in integration tests:', err);
  process.exit(1);
});
