// =============================================================================
// tests/user_facing_report_adapter.test.ts
// Test suite for User-Facing Feng Shui Report Presentation Adapter
// =============================================================================

import assert from 'node:assert';
import { buildUnifiedAssessmentReport } from '../src/engine/core/unifiedAssessment.js';
import { evaluateRoomElementAssessment } from '../src/engine/core/nguHanh/elementAssessment.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules.js';
import { buildUserFacingReportViewModel } from '../src/engine/core/userFacingReportAdapter.js';

console.log('================================================================================');
console.log('TEST SUITE: USER-FACING FENG SHUI REPORT ADAPTER (SIMPLIFIED CONSULTATION)');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. SETUP TEST FIXTURES (Master Preset: 1985 Male)
const profile1985 = getUserFengShuiProfile(1985, 'male');
const masterConfig = { ...ROOM_PRESETS.master.config };
const masterObjects = [...ROOM_PRESETS.master.objects];

// Invariance check: Master Preset score must remain 51
const baselineEval = evaluateRoomFengShui(profile1985, masterConfig, masterObjects);
assert.strictEqual(baselineEval.overallScore, 51, 'Baseline Master Preset score invariant strictly 51');

const personalProfileInput = {
  id: 'profile_test_01',
  displayName: 'Nguyễn Văn A',
  birthDate: '1985-06-15',
  genderForTraditionalCalculation: 'male' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const unifiedReport = buildUnifiedAssessmentReport({
  roomConfig: masterConfig,
  objects: masterObjects,
  profile: personalProfileInput,
  roomName: 'Phòng ngủ Master',
});

const nhAssessment = evaluateRoomElementAssessment(
  masterConfig,
  masterObjects,
  profile1985.element,
  { northBearingDeg: (masterConfig as any).northBearingDeg ?? null }
);

// Run Adapter
const viewModel = buildUserFacingReportViewModel({
  report: unifiedReport,
  nguHanhAssessment: nhAssessment,
  roomConfig: masterConfig,
  objects: masterObjects,
});

// -----------------------------------------------------------------------------
// DOMAIN 1: PHẦN 1 — TỔNG QUAN PHÒNG NGỦ
// -----------------------------------------------------------------------------
console.log('--- Domain 1: Phần 1 — Tổng Quan Phòng Ngủ ---');

it('TC-REP-01: Generates human-readable overview with natural narrative summary', () => {
  assert.strictEqual(viewModel.overview.roomName, 'Phòng ngủ Master');
  assert.ok(viewModel.overview.dimensionsText.includes('m'), 'Dimensions must have metric formatting');
  assert.ok(viewModel.overview.areaM2 > 0, 'Area must be greater than 0');
  assert.ok(viewModel.overview.narrativeSummary.length > 50, 'Narrative summary must be substantial');
  // Must NOT contain software testing or developer jargon
  assert.ok(!viewModel.overview.narrativeSummary.includes('tiêu chí PASS'), 'Must not say tiêu chí PASS');
  assert.ok(!viewModel.overview.narrativeSummary.includes('Hệ thống ghi nhận'), 'Must not say Hệ thống ghi nhận');
  assert.ok(!viewModel.overview.narrativeSummary.includes('độ chính xác 100%'), 'Must not claim 100% engine precision');
});

// -----------------------------------------------------------------------------
// DOMAIN 2: PHẦN 2 — PHONG THỦY GIA CHỦ
// -----------------------------------------------------------------------------
console.log('\n--- Domain 2: Phần 2 — Phong Thủy Gia Chủ ---');

it('TC-REP-03: Renders complete homeowner Feng Shui profile for 1985 male', () => {
  assert.strictEqual(viewModel.homeowner.hasData, true);
  assert.strictEqual(viewModel.homeowner.birthYear, 1985);
  assert.strictEqual(viewModel.homeowner.guaName, 'Càn');
  assert.strictEqual(viewModel.homeowner.groupText, 'Tây Tứ Mệnh');
  assert.strictEqual(viewModel.homeowner.element, 'Kim');
  assert.ok(viewModel.homeowner.prioritizedDirections.length === 4, 'Must have 4 prioritized directions for Càn');
  assert.ok(viewModel.homeowner.cautionDirections.length === 4, 'Must have 4 caution directions for Càn');
  assert.ok(viewModel.homeowner.friendlyExplanation.includes('Càn'), 'Friendly explanation must mention Gua name');
});

it('TC-REP-04: Gracefully handles missing profile without guessing or default falsification', () => {
  const anonymousReport = buildUnifiedAssessmentReport({
    roomConfig: masterConfig,
    objects: masterObjects,
    profile: null,
  });
  const anonymousViewModel = buildUserFacingReportViewModel({
    report: anonymousReport,
  });

  assert.strictEqual(anonymousViewModel.homeowner.hasData, false);
  assert.ok(anonymousViewModel.homeowner.missingDataMessage?.includes('Chưa có thông tin'), 'Must state missing notice');
  assert.strictEqual(anonymousViewModel.homeowner.guaName, undefined);
});

// -----------------------------------------------------------------------------
// DOMAIN 3: PHẦN 3 — ĐÁNH GIÁ PHONG THỦY PHÒNG NGỦ (8 NHÓM CỤ THỂ)
// -----------------------------------------------------------------------------
console.log('\n--- Domain 3: Phần 3 — Đánh Giá 8 Nhóm Phòng Ngủ ---');

it('TC-REP-05: Exactly 8 designated space groups are generated', () => {
  assert.strictEqual(viewModel.spaceGroups.length, 8);
  const groupIds = viewModel.spaceGroups.map((g) => g.id);
  assert.ok(groupIds.includes('bed'), 'Must include Giường ngủ');
  assert.ok(groupIds.includes('desk'), 'Must include Bàn làm việc');
  assert.ok(groupIds.includes('door'), 'Must include Cửa ra vào');
  assert.ok(groupIds.includes('window'), 'Must include Cửa sổ');
  assert.ok(groupIds.includes('mirror'), 'Must include Gương');
  assert.ok(groupIds.includes('elements'), 'Must include Màu sắc & vật liệu');
  assert.ok(groupIds.includes('lighting_ventilation'), 'Must include Ánh sáng & thông gió');
  assert.ok(groupIds.includes('circulation'), 'Must include Lối đi lại');
});

it('TC-REP-06: Space groups contain natural observations without technical rule codes in prose', () => {
  for (const group of viewModel.spaceGroups) {
    assert.ok(group.title.length > 0, `${group.id} must have a title`);
    assert.ok(group.icon.length > 0, `${group.id} must have an icon`);
    assert.ok(['Tốt', 'Cần lưu ý', 'Nên cải thiện', 'Chưa đủ dữ liệu'].includes(group.statusLabel), 'Status label must be standard');
    assert.ok(group.comment.length > 0, `${group.id} must have a comment`);
    assert.ok(!group.comment.includes('BED-WALL-01'), 'Comments must not leak technical rule codes like BED-WALL-01');
    assert.ok(!group.comment.includes('OBB_COLLISION'), 'Comments must not leak technical rule codes like OBB_COLLISION');
    assert.ok(!group.comment.includes('PASS'), 'Comments must not contain PASS/FAIL codes');
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 4: PHẦN 4 — ĐIỂM TỐT CỦA PHÒNG NGỦ (3–5 ĐIỂM)
// -----------------------------------------------------------------------------
console.log('\n--- Domain 4: Phần 4 — Điểm Tốt Của Phòng Ngủ ---');

it('TC-REP-07: Identifies between 3 and 5 outstanding favorable points', () => {
  const points = viewModel.favorablePoints;
  assert.ok(Array.isArray(points), 'Favorable points must be an array');
  assert.ok(points.length >= 3 && points.length <= 5, `Favorable points count must be 3-5 (Got: ${points.length})`);
  for (const pt of points) {
    assert.ok(pt.title.length > 0);
    assert.ok(pt.explanation.length > 0);
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 5: PHẦN 5 — NHỮNG ĐIỀU NÊN ĐIỀU CHỈNH (TỐI ĐA 5 KHUYẾN NGHỊ)
// -----------------------------------------------------------------------------
console.log('\n--- Domain 5: Phần 5 — Những Điều Nên Điều Chỉnh ---');

it('TC-REP-08: Each recommendation contains title, currentIssue, proposal, reason, priority', () => {
  assert.ok(viewModel.recommendations.length > 0 && viewModel.recommendations.length <= 5, 'Must have at most 5 recommendations');
  for (const rec of viewModel.recommendations) {
    assert.ok(rec.title.length > 0, 'Must have title');
    assert.ok(rec.currentIssue.length > 0, 'Must have current issue');
    assert.ok(rec.proposal.length > 0, 'Must have proposal');
    assert.ok(rec.reason.length > 0, 'Must have reason');
    assert.ok(['Cao', 'Trung bình', 'Thấp'].includes(rec.priority), 'Priority must be Cao, Trung bình or Thấp');
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 6: PHẦN 6 — LỜI KẾT VÀ TƯ VẤN & INVARIANTS
// -----------------------------------------------------------------------------
console.log('\n--- Domain 6: Phần 6 — Lời Kết & Invariants ---');

it('TC-REP-09: Conclusion summarizes priorities, elements to keep in friendly expert voice', () => {
  assert.ok(viewModel.conclusion.closingSummary.length > 0);
  assert.ok(viewModel.conclusion.keyPriorities.length > 0);
  assert.ok(viewModel.conclusion.elementsToPreserve.length > 0);
});

it('TC-REP-10: Invariants strictly preserved: Master Preset 51, no synthetic score alteration', () => {
  const afterEval = evaluateRoomFengShui(profile1985, masterConfig, masterObjects);
  assert.strictEqual(afterEval.overallScore, 51, 'Master Preset overallScore remains strictly 51');
  assert.strictEqual(afterEval.breakdown.bedScore, 30, 'Master Bed score remains 30');
  assert.strictEqual(afterEval.breakdown.deskScore, 92, 'Master Desk score remains 92');
  assert.strictEqual(afterEval.breakdown.circulationScore, 70, 'Circulation score remains 70');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`TEST RESULTS: ${passed} PASS, ${failed} FAIL`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
