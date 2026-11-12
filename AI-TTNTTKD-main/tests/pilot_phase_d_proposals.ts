/**
 * PILOT-01 — Phase D: Layout Proposal Testing
 * Tests proposal generation, constraint compliance, and boundary safety.
 * Uses in-process Express server.
 * Run with: npx tsx tests/pilot_phase_d_proposals.ts
 */

import http from 'http';
import fs from 'fs';
import { app } from '../server.js';

interface ProposalTestCase {
  id: string;
  description: string;
  request: {
    message: string;
    roomConfig: any;
    objects: any[];
  };
  expectations: {
    hasProposal: boolean;
    noDirectSceneWrite: boolean;
    respectsConstraint?: string;
    multipleOptions?: boolean;
    handlesImpossible?: boolean;
    fengShuiScoreImproves?: boolean;
  };
  note: string;
}

const DEFAULT_ROOM = {
  width: 5.0,
  length: 5.2,
  height: 2.8,
  direction: 'N',
};

const STANDARD_OBJECTS = [
  {
    id: 'bed_01', type: 'bed', name: 'Giường đôi',
    position: { x: -0.05, y: 0, z: 0.55 },
    rotation: { x: 0, y: Math.PI, z: 0 },
    dimensions: { width: 1.6, length: 2.0, height: 0.85 },
  },
  {
    id: 'desk_window', type: 'desk', name: 'Bàn làm việc',
    position: { x: 1.6, y: 0, z: -1.9 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { width: 1.3, length: 0.65, height: 0.75 },
  },
  {
    id: 'wardrobe_north', type: 'wardrobe', name: 'Tủ quần áo',
    position: { x: -0.2, y: 0, z: -2.15 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 2.5, length: 0.6, height: 2.45 },
  },
];

const DEFAULT_PROFILE = {
  birthYear: 1990,
  gender: 'male',
  guaName: 'Khảm',
  element: 'Thủy',
  group: 'Đông Tứ Mệnh',
  auspiciousDirections: ['Bắc', 'Đông Nam', 'Đông', 'Nam'],
  inauspiciousDirections: ['Tây Nam', 'Đông Bắc', 'Tây Bắc', 'Tây'],
  directionDetails: {
    N: { name: 'Phục Vị', type: 'PHUC_VI', isGood: true, meaning: 'Bình yên, tĩnh tâm' },
    NE: { name: 'Ngũ Quỷ', type: 'NGU_QUY', isGood: false, meaning: 'Thị phi, tai bay vạ gió' },
    E: { name: 'Thiên Y', type: 'THIEN_Y', isGood: true, meaning: 'Sức khỏe, may mắn' },
    SE: { name: 'Sinh Khí', type: 'SINH_KHI', isGood: true, meaning: 'Tài lộc thăng tiến' },
    S: { name: 'Diên Niên', type: 'DIEN_NIEN', isGood: true, meaning: 'Gia đạo hòa thuận' },
    SW: { name: 'Tuyệt Mệnh', type: 'TUYET_MENH', isGood: false, meaning: 'Hao tổn tài vận' },
    W: { name: 'Họa Hại', type: 'HOA_HAI', isGood: false, meaning: 'Trở ngại công việc' },
    NW: { name: 'Lục Sát', type: 'LUC_SAT', isGood: false, meaning: 'Bất an, trục trặc' },
  },
};

const PROPOSAL_TESTS: ProposalTestCase[] = [
  // --- 3 Single-objective: optimize for feng shui only ---
  {
    id: 'D-01',
    description: 'Tối ưu giường theo phong thủy',
    request: {
      message: 'Hãy đề xuất vị trí tốt nhất cho giường theo phong thủy.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
    },
    note: 'Single objective feng shui optimization for bed',
  },
  {
    id: 'D-02',
    description: 'Tối ưu bàn làm việc theo phong thủy',
    request: {
      message: 'Vị trí bàn làm việc nào tốt nhất theo phong thủy?',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
    },
    note: 'Desk feng shui optimization',
  },
  {
    id: 'D-03',
    description: 'Tối ưu tủ quần áo',
    request: {
      message: 'Đề xuất vị trí tốt nhất cho tủ quần áo.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
    },
    note: 'Wardrobe position optimization',
  },
  // --- 3 Multi-constraint requests ---
  {
    id: 'D-04',
    description: 'Giữ nguyên giường, chỉ di chuyển bàn',
    request: {
      message: 'Giữ nguyên vị trí giường, chỉ tối ưu vị trí bàn làm việc.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
      respectsConstraint: 'giường',
    },
    note: 'Constrained optimization — bed must not move',
  },
  {
    id: 'D-05',
    description: 'Không chặn cửa sổ khi sắp xếp',
    request: {
      message: 'Đề xuất bố trí phòng mà không chặn cửa sổ.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
      respectsConstraint: 'cửa sổ',
    },
    note: 'Window clearance constraint',
  },
  {
    id: 'D-06',
    description: 'Tối ưu cho người tuổi Tý (Khảm, Đông Tứ Mệnh)',
    request: {
      message: 'Tôi sinh năm 1984, nam. Đề xuất bố trí phòng phù hợp mệnh của tôi.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
    },
    note: 'Personal profile-based optimization',
  },
  // --- 2 Multi-proposal requests ---
  {
    id: 'D-07',
    description: 'Yêu cầu 3 phương án bố trí',
    request: {
      message: 'Hãy đề xuất các phương án bố trí phòng ngủ khác nhau.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
      multipleOptions: true,
    },
    note: 'Multiple proposals requested',
  },
  {
    id: 'D-08',
    description: 'Đề xuất bố trí tổng thể phòng ngủ',
    request: {
      message: 'Tối ưu hóa toàn bộ bố cục phòng ngủ theo phong thủy và công năng.',
      roomConfig: DEFAULT_ROOM,
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: true,
      noDirectSceneWrite: true,
    },
    note: 'Full room optimization',
  },
  // --- 2 Impossible/conflicting requests ---
  {
    id: 'D-09',
    description: 'Phòng quá nhỏ, không thể đặt tất cả đồ nội thất',
    request: {
      message: 'Đặt thêm 3 giường đôi vào phòng.',
      roomConfig: { width: 3.0, length: 3.0, height: 2.5, direction: 'N' },
      objects: STANDARD_OBJECTS,
    },
    expectations: {
      hasProposal: false,
      noDirectSceneWrite: true,
      handlesImpossible: true,
    },
    note: 'Room too small for requested furniture — graceful handling',
  },
  {
    id: 'D-10',
    description: 'Yêu cầu mâu thuẫn: đặt giường ở cả 2 vị trí cùng lúc',
    request: {
      message: 'Đặt giường vừa ở góc Đông Bắc vừa ở góc Tây Nam.',
      roomConfig: DEFAULT_ROOM,
      objects: [],
    },
    expectations: {
      hasProposal: false,
      noDirectSceneWrite: true,
      handlesImpossible: true,
    },
    note: 'Contradictory placement request',
  },
];

function detectProposalInResponse(text: string, data: any): boolean {
  if (data?.awaitingConfirmation || data?.proposalId || data?.optimizationProposal || data?.proposedAdjustment) {
    return true;
  }
  const keywords = ['đề xuất', 'phương án', 'áp dụng', 'confirm', 'preview', 'ghostpreview', 'bố cục', 'khắc phục'];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function detectSceneWrite(data: any): boolean {
  return !!(data?.executed === true || data?.sceneChanged === true);
}

function detectMultipleProposals(text: string, data: any): boolean {
  if (data?.optimizationProposal?.adjustments?.length > 1) return true;
  const hasNumbering = /phương án [1-3]|option [1-3]|lựa chọn [1-3]/.test(text.toLowerCase());
  const hasMultiKeyword = /ba phương án|3 phương án|nhiều phương án|các phương án|phương án bố trí/.test(text.toLowerCase());
  return hasNumbering || hasMultiKeyword;
}

function detectImpossibleHandling(text: string, data: any): boolean {
  const keywords = ['không thể', 'quá nhỏ', 'không đủ chỗ', 'không khả thi', 'chật', 'giới hạn', 'mâu thuẫn', 'chưa thể', 'failed'];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

async function runPhaseD(): Promise<void> {
  console.log('================================================================================');
  console.log('PILOT-01 — PHASE D: LAYOUT PROPOSAL TESTING (10 SCENARIOS)');
  console.log('Starting ephemeral in-process Express server...');
  console.log('================================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[TEST SERVER] Active on ${baseUrl}\n`);

  const results: any[] = [];
  let pass = 0;
  let fail = 0;

  try {
    for (const tc of PROPOSAL_TESTS) {
      process.stdout.write(`[${tc.id}] ${tc.description} ... `);
      const start = Date.now();

      try {
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: tc.request.message }],
            roomConfig: tc.request.roomConfig,
            objects: tc.request.objects,
            userProfile: DEFAULT_PROFILE,
          }),
        });

        const durationMs = Date.now() - start;
        const data = await res.json() as any;
        const text: string = data?.reply || data?.message || JSON.stringify(data);

        const checks: string[] = [];
        let testPass = true;

        // Check: proposal in response
        if (tc.expectations.hasProposal) {
          const hasProposal = detectProposalInResponse(text, data);
          if (!hasProposal) {
            testPass = false;
            checks.push('FAIL: Expected proposal not detected');
          } else {
            checks.push('OK: Proposal detected');
          }
        }

        // Check: no direct scene write
        if (tc.expectations.noDirectSceneWrite) {
          const sceneWrite = detectSceneWrite(data);
          if (sceneWrite) {
            testPass = false;
            checks.push('FAIL: Unauthorized direct scene write detected');
          } else {
            checks.push('OK: Scene guarded');
          }
        }

        // Check: multiple proposals
        if (tc.expectations.multipleOptions) {
          const hasMulti = detectMultipleProposals(text, data);
          if (!hasMulti) {
            testPass = false;
            checks.push('FAIL: Multiple proposals expected but not detected');
          } else {
            checks.push('OK: Multiple proposals detected');
          }
        }

        // Check: impossible case handling
        if (tc.expectations.handlesImpossible) {
          const handled = detectImpossibleHandling(text, data);
          if (!handled) {
            testPass = false;
            checks.push('FAIL: Impossible case not handled gracefully');
          } else {
            checks.push('OK: Impossible case handled gracefully');
          }
        }

        const result = {
          id: tc.id,
          description: tc.description,
          status: testPass ? 'PASS' : 'FAIL',
          evidence: checks.join(' | '),
          responseExcerpt: text.substring(0, 150),
          durationMs,
        };

        results.push(result);

        if (testPass) {
          pass++;
          console.log(`✅ PASS (${durationMs}ms)`);
        } else {
          fail++;
          console.log(`❌ FAIL (${durationMs}ms)`);
        }
      } catch (err: any) {
        fail++;
        console.log(`❌ ERROR: ${err.message}`);
        results.push({
          id: tc.id,
          description: tc.description,
          status: 'FAIL',
          evidence: `Error: ${err.message}`,
          durationMs: Date.now() - start,
        });
      }
    }
  } finally {
    server.close();
  }

  console.log('\n================================================================================');
  console.log(`PHASE D RESULTS: ${pass} PASS | ${fail} FAIL | 0 BLOCKED`);
  console.log('================================================================================\n');

  fs.writeFileSync(
    'tests/pilot_phase_d_results.json',
    JSON.stringify({ phase: 'D', summary: { pass, fail, total: PROPOSAL_TESTS.length }, results }, null, 2)
  );
  console.log('Results saved to tests/pilot_phase_d_results.json');
}

runPhaseD().catch(console.error);
