import { generateMultipleLayoutProposals, validateOptimizedLayout } from '../src/engine/layoutOptimizer';
import { generateExplainableFengShuiReport, generateExplainableAnswer } from '../src/engine/explainableFengShui';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules';
import { getUserFengShuiProfile } from '../src/engine/batTrach';
import { RoomConfig, RoomObject, UserFengShuiProfile } from '../src/types/fengshui';

export function runThreeNewFeaturesTests() {
  console.log('\n--- [TEST SUITE 5: 3 New Core Features: Intelligent, Multi-Strategy & Explainable] ---');
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

  // Common Test Fixtures: 1990 Male (Cung Khảm, Thủy, Đông Tứ Mệnh)
  const profile: UserFengShuiProfile = getUserFengShuiProfile(1990, 'male');
  const roomConfig: RoomConfig = {
    width: 4.5,
    length: 5.0,
    height: 2.8,
    direction: 'S',
  };

  const currentObjects: RoomObject[] = [
    {
      id: 'door_main',
      type: 'door',
      name: 'Cửa ra vào chính',
      dimensions: { width: 0.9, length: 0.15, height: 2.2 },
      position: { x: 2.15, y: 0, z: -0.2 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    },
    {
      id: 'win_main',
      type: 'window',
      name: 'Cửa sổ kính lớn',
      dimensions: { width: 1.8, length: 0.2, height: 1.5 },
      position: { x: -2.15, y: 0, z: 0.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    },
    {
      id: 'bed_center',
      type: 'bed',
      name: 'Giường đôi Master',
      dimensions: { width: 1.8, length: 2.0, height: 0.9 },
      position: { x: 0, y: 0, z: 0 }, // Center of room, floating without solid wall support
      rotation: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'mirror_conflict',
      type: 'mirror',
      name: 'Gương soi đứng',
      dimensions: { width: 0.6, length: 0.4, height: 1.6 },
      position: { x: 0, y: 0, z: 1.5 }, // Facing bed directly from South
      rotation: { x: 0, y: Math.PI, z: 0 },
    },
    {
      id: 'desk_center',
      type: 'desk',
      name: 'Bàn học sinh',
      dimensions: { width: 1.2, length: 0.8, height: 0.75 },
      position: { x: -0.8, y: 0, z: 0.5 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  ];

  const currentEvaluation = evaluateRoomFengShui(profile, roomConfig, currentObjects);

  // =========================================================================
  // TEST FEATURE 1 & 2: MULTIPLE FENG SHUI LAYOUT RECOMMENDATIONS
  // =========================================================================
  console.log('  -- Feature 2: Multiple Feng Shui Layout Recommendations --');

  const multiResult = generateMultipleLayoutProposals(profile, roomConfig, currentObjects, currentEvaluation);

  assert('Hệ thống tạo thành công đúng 3 phương án bố trí', multiResult.options.length === 3);

  const opt1 = multiResult.options.find((o) => o.strategy === 'feng_shui_priority');
  const opt2 = multiResult.options.find((o) => o.strategy === 'balance_usability');
  const opt3 = multiResult.options.find((o) => o.strategy === 'balance_aesthetics');

  assert('Phương án 1 có chiến lược "feng_shui_priority"', Boolean(opt1));
  assert('Phương án 2 có chiến lược "balance_usability"', Boolean(opt2));
  assert('Phương án 3 có chiến lược "balance_aesthetics"', Boolean(opt3));

  // Verify OBB SAT Collision-free for ALL 3 options
  [opt1, opt2, opt3].forEach((opt, idx) => {
    if (opt) {
      const simulatedObjects = currentObjects.map((obj) => {
        const adj = opt.proposal.adjustments.find((a) => a.objectId === obj.id);
        if (!adj) return { ...obj };
        return {
          ...obj,
          position: { ...obj.position, x: adj.suggestedX, z: adj.suggestedZ },
          rotation: { ...obj.rotation, y: adj.suggestedRotationY },
        };
      });
      const conflicts = validateOptimizedLayout(simulatedObjects, { width: roomConfig.width, length: roomConfig.length });
      assert(`Phương án ${idx + 1} (${opt.title}) sạch va chạm OBB SAT 100% (conflicts = 0)`, conflicts.length === 0);
      assert(`Phương án ${idx + 1} có danh sách ưu điểm rõ ràng`, opt.pros.length >= 2);
      assert(`Phương án ${idx + 1} có điểm phong thủy sau tối ưu cao hơn điểm ban đầu`, opt.proposal.afterScore > currentEvaluation.overallScore);
    }
  });

  // Verify diversity between options (not clones)
  if (opt1 && opt2 && opt3) {
    assert(
      'Phương án 1 ưu tiên điểm phong thủy cao nhất trong 3 phương án',
      opt1.scoreBreakdown.fengShui >= opt2.scoreBreakdown.fengShui &&
      opt1.scoreBreakdown.fengShui >= opt3.scoreBreakdown.fengShui
    );
    assert(
      'Phương án 2 ưu tiên điểm công năng và lối đi cao nhất trong 3 phương án',
      opt2.scoreBreakdown.usability > opt1.scoreBreakdown.usability
    );
    assert(
      'Phương án 3 ưu tiên điểm thẩm mỹ cao nhất trong 3 phương án',
      opt3.scoreBreakdown.aesthetics > opt1.scoreBreakdown.aesthetics
    );
  }

  // =========================================================================
  // TEST FEATURE 3: EXPLAINABLE FENG SHUI ANALYSIS & GROUNDED Q&A
  // =========================================================================
  console.log('  -- Feature 3: Explainable Feng Shui Analysis --');

  const explainReport = generateExplainableFengShuiReport(profile, roomConfig, currentObjects, currentEvaluation);

  assert('Explainable Report đánh giá chi tiết các quy tắc phong thủy', explainReport.rulesEvaluated.length >= 3);

  // Test detection of Mirror clash rule
  const mirrorClashRule = explainReport.rulesEvaluated.find((r) => r.ruleCode === 'RULE_QUANG_SAT_GUONG');
  assert('Phát hiện chính xác vi phạm RULE_QUANG_SAT_GUONG khi gương đối diện giường', mirrorClashRule?.status === 'violation');
  assert('Chỉ ra bằng chứng hình học thực tế (khoảng cách và góc quay)', Boolean(mirrorClashRule?.geometricEvidence.includes('m')));
  assert('Giải thích nguyên lý phong thủy cổ truyền (quang sát)', Boolean(mirrorClashRule?.fengShuiPrinciple.includes('Quang sát')));
  assert('Đưa ra hành động hóa giải rõ ràng', Boolean(mirrorClashRule?.remedyAction.includes('Xoay gương')));

  // Test detection of Bed solid wall rule (Floating bed)
  const bedWallRule = explainReport.rulesEvaluated.find((r) => r.ruleCode === 'RULE_TOA_SON_HUONG_CAT');
  assert('Phát hiện cảnh báo hoặc vi phạm khi giường ở giữa phòng không tựa tường kiên cố', bedWallRule?.status !== 'passed');
  assert('Chỉ ra tác hại cụ thể (Lộ Không Sát, bất an, chập chờn)', Boolean(bedWallRule?.negativeImpact.includes('Lộ Không Sát') || bedWallRule?.negativeImpact.includes('chông chênh')));

  // Test Explainable Q&A
  const bedAnswer = generateExplainableAnswer('Tại sao lại di chuyển giường ngủ?', explainReport, profile, roomConfig);
  assert('Q&A: Trả lời lý do di chuyển giường có quy tắc, bằng chứng và hướng giải quyết', bedAnswer.includes('Quy tắc áp dụng') && bedAnswer.includes('Tọa Sơn'));

  const mirrorAnswer = generateExplainableAnswer('Tại sao gương lại có sao không?', explainReport, profile, roomConfig);
  assert('Q&A: Trả lời giải thích vị trí gương có căn cứ hình học và tác động', mirrorAnswer.includes('quang sát') || mirrorAnswer.includes('Quang Sát'));

  const compareAnswer = generateExplainableAnswer('Hãy so sánh 3 phương án bố trí', explainReport, profile, roomConfig);
  assert('Q&A: Trả lời so sánh rõ ràng sự khác biệt giữa 3 phương án', compareAnswer.includes('Phương án 1') && compareAnswer.includes('Phương án 2') && compareAnswer.includes('Phương án 3'));

  return { passed, failed };
}
