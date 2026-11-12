/**
 * PILOT-01 — Phase B: Natural Language Understanding (NLU) Test
 * Tests /api/chat endpoint with 30 prompts covering all intent categories.
 * Uses in-process Express server to guarantee 100% reliable local socket communication.
 * Run with: npx tsx tests/pilot_phase_b_nlu.ts
 */

import http from 'http';
import fs from 'fs';
import { app, setMockGenAIClient } from '../server.js';

interface NLUTestCase {
  id: string;
  prompt: string;
  expectedIntent: string; // THEORY | ANALYZE | COMMAND | CLARIFY | MULTI-PROPOSAL | OUT-OF-SCOPE
  expectSceneChange: boolean;
  expectClarification: boolean;
  expectProposal: boolean;
  note: string;
}

interface NLUResult {
  id: string;
  prompt: string;
  expectedIntent: string;
  actualResponse: string;
  toolsCalledInResponse: string[];
  sceneChangeAttempted: boolean;
  clarificationDetected: boolean;
  proposalDetected: boolean;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'PARTIAL';
  evidence: string;
  durationMs: number;
}

const NLU_TESTS: NLUTestCase[] = [
  // --- MANDATORY 12 (from PILOT-01 specification) ---
  {
    id: 'B-01',
    prompt: 'Bát Trạch là gì?',
    expectedIntent: 'THEORY',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'General feng shui theory question — must NOT trigger scene change',
  },
  {
    id: 'B-02',
    prompt: 'Phòng ngủ của tôi có hợp phong thủy không?',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Room analysis request — should return assessment, not modify scene',
  },
  {
    id: 'B-03',
    prompt: 'Tại sao không nên đặt giường đối diện cửa?',
    expectedIntent: 'THEORY',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Explanation request — expects theoretical/educational response without write action',
  },
  {
    id: 'B-04',
    prompt: 'Hãy kiểm tra vị trí giường hiện tại.',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Object-specific analysis — must not modify bed position',
  },
  {
    id: 'B-05',
    prompt: 'Tôi muốn chuyển giường sang trái 50cm.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false, // direct write forbidden without confirmation
    expectClarification: false,
    expectProposal: true,
    note: 'Move command — must generate proposal, NOT direct unconfirmed scene mutation',
  },
  {
    id: 'B-06',
    prompt: 'Xoay bàn học 90 độ.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Rotate command — must generate action proposal with rotation angle',
  },
  {
    id: 'B-07',
    prompt: 'Đưa nó sang bên trái.',
    expectedIntent: 'CLARIFY',
    expectSceneChange: false,
    expectClarification: true,
    expectProposal: false,
    note: 'Ambiguous pronoun "nó" — must ask for target clarification',
  },
  {
    id: 'B-08',
    prompt: 'Xóa cái đó đi.',
    expectedIntent: 'CLARIFY',
    expectSceneChange: false,
    expectClarification: true,
    expectProposal: false,
    note: 'Ambiguous "cái đó" — must ask which object to delete',
  },
  {
    id: 'B-09',
    prompt: 'Hãy đề xuất ba cách bố trí phòng ngủ.',
    expectedIntent: 'MULTI-PROPOSAL',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Multi-proposal request — expects layout options',
  },
  {
    id: 'B-10',
    prompt: 'Tôi không thích phương án này, hãy đề xuất phương án khác.',
    expectedIntent: 'MULTI-PROPOSAL',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Alternative proposal request — must generate alternative',
  },
  {
    id: 'B-11',
    prompt: 'Giữ nguyên giường, chỉ thay đổi vị trí bàn.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Constrained command — must respect constraint "giữ nguyên giường"',
  },
  {
    id: 'B-12',
    prompt: 'Tại sao bạn đề xuất vị trí này?',
    expectedIntent: 'THEORY',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Explanation of recommendation — no scene mutation',
  },
  // --- ADDITIONAL 18 SCENARIOS ---
  {
    id: 'B-13',
    prompt: 'Thủ đô của Việt Nam là gì?',
    expectedIntent: 'OUT-OF-SCOPE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'General knowledge — AI responds directly, does not crash or mutate',
  },
  {
    id: 'B-14',
    prompt: 'Python là gì và dùng để làm gì?',
    expectedIntent: 'OUT-OF-SCOPE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Tech question outside feng shui — general assistant capability',
  },
  {
    id: 'B-15',
    prompt: 'Thêm giường vào phòng và phân tích phong thủy luôn.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Multi-intent: add + analyze',
  },
  {
    id: 'B-16',
    prompt: 'Đặt giường ở góc tốt nhất cho tuổi Tý.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Feng shui-aware placement request',
  },
  {
    id: 'B-17',
    prompt: 'Xóa tất cả đồ nội thất trong phòng.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Mass destructive action — proposal required',
  },
  {
    id: 'B-18',
    prompt: 'Tôi muốn đặt giường ở giữa phòng và cũng sát tường.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: true,
    expectProposal: false,
    note: 'Contradictory constraints — flagged or clarified',
  },
  {
    id: 'B-19',
    prompt: 'Mệnh Hỏa hợp với màu gì?',
    expectedIntent: 'THEORY',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Color/element theory advisory',
  },
  {
    id: 'B-20',
    prompt: 'Căn phòng này có ánh sáng tốt không?',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Environmental inquiry — must not fabricate lux figures',
  },
  {
    id: 'B-21',
    prompt: 'Hãy tối ưu bố cục phòng ngủ cho tôi.',
    expectedIntent: 'MULTI-PROPOSAL',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Full room layout optimization request',
  },
  {
    id: 'B-22',
    prompt: 'Giường của tôi có bị soi gương không?',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Mirror-bed relationship analysis',
  },
  {
    id: 'B-23',
    prompt: 'Hãy vẽ sơ đồ phòng ngủ của tôi.',
    expectedIntent: 'OUT-OF-SCOPE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Explains limitation gracefully',
  },
  {
    id: 'B-24',
    prompt: 'Thêm cây xanh góc Đông Nam phòng.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Add furniture with direction context',
  },
  {
    id: 'B-25',
    prompt: 'Căn phòng có thể đặt được bao nhiêu người ngủ?',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Capacity estimation analysis',
  },
  {
    id: 'B-26',
    prompt: 'Cho tôi biết điểm phong thủy tổng thể là bao nhiêu.',
    expectedIntent: 'ANALYZE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Score request',
  },
  {
    id: 'B-27',
    prompt: 'Dịch sang tiếng Anh: "Phòng ngủ hợp phong thủy"',
    expectedIntent: 'OUT-OF-SCOPE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Language translation — general knowledge response',
  },
  {
    id: 'B-28',
    prompt: 'Di chuyển bàn làm việc 20cm về phía cửa sổ.',
    expectedIntent: 'COMMAND',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: true,
    note: 'Relative directional move',
  },
  {
    id: 'B-29',
    prompt: 'Xin chào',
    expectedIntent: 'OUT-OF-SCOPE',
    expectSceneChange: false,
    expectClarification: false,
    expectProposal: false,
    note: 'Greeting conversation',
  },
  {
    id: 'B-30',
    prompt: 'aaabbbccc 123 !@# không hiểu gì cả',
    expectedIntent: 'CLARIFY',
    expectSceneChange: false,
    expectClarification: true,
    expectProposal: false,
    note: 'Garbage or confusing input — handles gracefully without crash',
  },
];

const DEFAULT_SCENE_CONTEXT = {
  roomConfig: {
    width: 5.0,
    length: 5.2,
    height: 2.8,
    direction: 'N',
  },
  objects: [
    {
      id: 'bed_01',
      type: 'bed',
      name: 'Giường đôi bọc nệm 1m6',
      position: { x: -0.05, y: 0, z: 0.55 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      dimensions: { width: 1.6, length: 2.0, height: 0.85 },
    },
    {
      id: 'desk_window',
      type: 'desk',
      name: 'Bàn làm việc',
      position: { x: 1.6, y: 0, z: -1.9 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      dimensions: { width: 1.3, length: 0.65, height: 0.75 },
    },
    {
      id: 'wardrobe_north',
      type: 'wardrobe',
      name: 'Tủ quần áo kịch trần',
      position: { x: -0.2, y: 0, z: -2.15 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2.5, length: 0.6, height: 2.45 },
    },
  ],
  userProfile: {
    birthYear: 1990,
    gender: 'male',
    guaName: 'Khảm',
    element: 'Thủy',
    group: 'Đông Tứ Mệnh',
    auspiciousDirections: ['Bắc', 'Đông Nam', 'Đông', 'Nam'],
    inauspiciousDirections: ['Tây Nam', 'Đông Bắc', 'Tây Bắc', 'Tây'],
  },
};

function detectProposal(text: string, data: any): boolean {
  if (data?.awaitingConfirmation || data?.proposalId || data?.optimizationProposal || data?.proposedAdjustment) {
    return true;
  }
  const keywords = ['đề xuất', 'phương án', 'áp dụng', 'xem trước', 'preview', 'bố cục', 'thay đổi'];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function detectClarification(text: string, data: any): boolean {
  if (data?.requiresTargetClarification || data?.possibleTargets?.length > 0) {
    return true;
  }
  const keywords = ['bạn muốn', 'cụ thể', 'đối tượng nào', 'rõ hơn', 'bạn có thể', 'chưa rõ', 'làm rõ', 'không hiểu'];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

async function runPhaseB(): Promise<void> {
  console.log('================================================================================');
  console.log('PILOT-01 — PHASE B: NLU TESTING (30 SCENARIOS)');
  console.log('Starting ephemeral in-process Express server...');
  console.log('================================================================================\n');

  // Start in-process server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[TEST SERVER] Active on ${baseUrl}\n`);

  const results: NLUResult[] = [];
  let pass = 0;
  let fail = 0;
  let partial = 0;

  try {
    for (const tc of NLU_TESTS) {
      process.stdout.write(`[${tc.id}] "${tc.prompt.substring(0, 50)}" ... `);
      const start = Date.now();

      try {
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: tc.prompt }],
            ...DEFAULT_SCENE_CONTEXT,
          }),
        });

        const durationMs = Date.now() - start;
        const data = await res.json() as any;

        const responseText: string = data.reply || data.message || JSON.stringify(data);
        const proposalDet = detectProposal(responseText, data);
        const clarifDet = detectClarification(responseText, data);
        const sceneChanged = Boolean(data.sceneChanged || data.executed);

        const checks: string[] = [];
        let testPass = true;

        // Rule 1: No direct unconfirmed scene write
        if (tc.expectSceneChange === false && sceneChanged) {
          testPass = false;
          checks.push('FAIL: Direct scene mutation without confirmation');
        } else {
          checks.push('OK: Scene guarded');
        }

        // Rule 2: Theory / Explain questions must NOT return executable actions
        if (tc.expectedIntent === 'THEORY' && data.aiActions?.actions?.length > 0) {
          testPass = false;
          checks.push('FAIL: Theory returned executable actions');
        }

        // Rule 3: Clarification check
        if (tc.expectClarification && !clarifDet) {
          checks.push('PARTIAL: Clarification expected but not explicitly flagged');
          testPass = false;
        } else if (tc.expectClarification) {
          checks.push('OK: Clarification handled');
        }

        // Rule 4: Proposal check for COMMAND / MULTI-PROPOSAL
        if (tc.expectProposal && !proposalDet && !data.aiActions) {
          checks.push('PARTIAL: Proposal/Action expected but not detected');
          testPass = false;
        } else if (tc.expectProposal) {
          checks.push('OK: Proposal/Action created');
        }

        // Rule 5: Non-empty response
        if (!responseText || responseText.length < 10) {
          testPass = false;
          checks.push('FAIL: Empty response');
        }

        const evidence = checks.join(' | ');
        const finalStatus = testPass ? 'PASS' : checks.some((c) => c.startsWith('FAIL')) ? 'FAIL' : 'PARTIAL';

        if (finalStatus === 'PASS') {
          pass++;
          console.log(`✅ PASS (${durationMs}ms)`);
        } else if (finalStatus === 'PARTIAL') {
          partial++;
          console.log(`⚠️  PARTIAL (${durationMs}ms)`);
        } else {
          fail++;
          console.log(`❌ FAIL (${durationMs}ms)`);
        }

        results.push({
          id: tc.id,
          prompt: tc.prompt,
          expectedIntent: tc.expectedIntent,
          actualResponse: responseText.substring(0, 150),
          toolsCalledInResponse: data.aiActions?.actions?.map((a: any) => a.type) || [],
          sceneChangeAttempted: sceneChanged,
          clarificationDetected: clarifDet,
          proposalDetected: proposalDet,
          status: finalStatus,
          evidence,
          durationMs,
        });
      } catch (err: any) {
        fail++;
        console.log(`❌ ERROR: ${err.message}`);
        results.push({
          id: tc.id,
          prompt: tc.prompt,
          expectedIntent: tc.expectedIntent,
          actualResponse: '',
          toolsCalledInResponse: [],
          sceneChangeAttempted: false,
          clarificationDetected: false,
          proposalDetected: false,
          status: 'FAIL',
          evidence: `Fetch error: ${err.message}`,
          durationMs: Date.now() - start,
        });
      }
    }
  } finally {
    server.close();
  }

  console.log('\n================================================================================');
  console.log(`PHASE B RESULTS: ${pass} PASS | ${partial} PARTIAL | ${fail} FAIL | 0 BLOCKED`);
  console.log('================================================================================\n');

  fs.writeFileSync(
    'tests/pilot_phase_b_results.json',
    JSON.stringify({ phase: 'B', summary: { pass, partial, fail, blocked: 0, total: NLU_TESTS.length }, results }, null, 2)
  );
  console.log('Results saved to tests/pilot_phase_b_results.json');
}

runPhaseB().catch(console.error);
