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
console.log('TEST SUITE: USER-FACING FENG SHUI REPORT ADAPTER');
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
  roomName: 'Phòng ngủ Master 89/51',
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
// DOMAIN 1: PHẦN 1 — TỔNG QUAN PHONG THỦY
// -----------------------------------------------------------------------------
console.log('--- Domain 1: Phần 1 — Tổng Quan Phong Thủy ---');

it('TC-REP-01: Generates human-readable overview with title and room name', () => {
  assert.ok(viewModel.overview.reportTitle.length > 0, 'Report title must be non-empty');
  assert.strictEqual(viewModel.overview.roomName, 'Phòng ngủ Master 89/51');
  assert.ok(viewModel.overview.dimensionsFormatted.includes('m'), 'Dimensions must have metric formatting');
  assert.ok(viewModel.overview.areaM2 > 0, 'Area must be greater than 0');
});

it('TC-REP-02: Generates non-hardcoded natural language executive summary', () => {
  assert.ok(viewModel.overview.executiveSummary.length > 20, 'Executive summary must be detailed');
  assert.ok(viewModel.overview.highlights.length > 0, 'Must have at least one highlight point');
  assert.strictEqual(typeof viewModel.overview.dataCompleteness, 'number');
});

// -----------------------------------------------------------------------------
// DOMAIN 2: PHẦN 2 — THÔNG TIN PHONG THỦY GIA CHỦ
// -----------------------------------------------------------------------------
console.log('\n--- Domain 2: Phần 2 — Thông Tin Phong Thủy Gia Chủ ---');

it('TC-REP-03: Renders complete homeowner Feng Shui profile for 1985 male', () => {
  assert.strictEqual(viewModel.homeowner.hasData, true);
  assert.strictEqual(viewModel.homeowner.birthYear, 1985);
  assert.strictEqual(viewModel.homeowner.guaName, 'Càn');
  assert.strictEqual(viewModel.homeowner.group, 'Tây Tứ Mệnh');
  assert.strictEqual(viewModel.homeowner.element, 'Kim');
  assert.ok(viewModel.homeowner.auspiciousDirections.length === 4, 'Must have 4 auspicious directions for Càn');
  assert.ok(viewModel.homeowner.inauspiciousDirections.length === 4, 'Must have 4 inauspicious directions for Càn');
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
  assert.ok(anonymousViewModel.homeowner.missingDataNotice?.includes('Chưa có đầy đủ'), 'Must state missing notice');
  assert.strictEqual(anonymousViewModel.homeowner.guaName, undefined);
});

// -----------------------------------------------------------------------------
// DOMAIN 3: PHẦN 3 — ĐÁNH GIÁ 8 KHU VỰC KHÔNG GIAN
// -----------------------------------------------------------------------------
console.log('\n--- Domain 3: Phần 3 — Đánh Giá 8 Nhóm Không Gian ---');

it('TC-REP-05: Exactly 8 designated space groups are generated', () => {
  assert.strictEqual(viewModel.spaceGroups.length, 8);
  const groupIds = viewModel.spaceGroups.map((g) => g.id);
  assert.ok(groupIds.includes('room_orientation'), 'Must include room orientation');
  assert.ok(groupIds.includes('bed_placement'), 'Must include bed placement');
  assert.ok(groupIds.includes('desk_placement'), 'Must include desk placement');
  assert.ok(groupIds.includes('openings_flow'), 'Must include openings flow');
  assert.ok(groupIds.includes('mirrors_reflective'), 'Must include mirrors');
  assert.ok(groupIds.includes('elements_colors'), 'Must include elements & colors');
  assert.ok(groupIds.includes('lighting_ventilation'), 'Must include lighting & ventilation');
  assert.ok(groupIds.includes('circulation_ergonomics'), 'Must include circulation ergonomics');
});

it('TC-REP-06: Space groups contain natural observations without technical rule codes in prose', () => {
  for (const group of viewModel.spaceGroups) {
    assert.ok(group.title.length > 0, `${group.id} must have a title`);
    assert.ok(group.icon.length > 0, `${group.id} must have an icon`);
    assert.ok(group.observations.length > 0, `${group.id} must have at least one observation`);
    for (const obs of group.observations) {
      assert.ok(!obs.includes('BED-WALL-01'), 'Observations must not leak technical rule codes like BED-WALL-01');
      assert.ok(!obs.includes('OBB_COLLISION'), 'Observations must not leak technical rule codes like OBB_COLLISION');
    }
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 4: PHẦN 4 — ĐIỂM TỐT VÀ VẤN ĐỀ CẦN LƯU Ý
// -----------------------------------------------------------------------------
console.log('\n--- Domain 4: Phần 4 — Điểm Tốt & Vấn Đề Cần Lưu Ý ---');

it('TC-REP-07: Separates favorable aspects and concerns with actionable advice', () => {
  const { favorablePoints, concernPoints } = viewModel.favorableAndConcerns;
  assert.ok(Array.isArray(favorablePoints), 'Favorable points must be an array');
  assert.ok(Array.isArray(concernPoints), 'Concern points must be an array');
  assert.ok(favorablePoints.length > 0, 'Must identify at least one favorable aspect');
  for (const pt of favorablePoints) {
    assert.ok(pt.title.length > 0);
    assert.ok(pt.advice.length > 0);
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 5: PHẦN 5 — KHUYẾN NGHỊ ĐIỀU CHỈNH (5 TRƯỜNG BẮT BUỘC)
// -----------------------------------------------------------------------------
console.log('\n--- Domain 5: Phần 5 — Khuyến Nghị Điều Chỉnh (5 Trường Bắt Buộc) ---');

it('TC-REP-08: Each recommendation contains target, issue, explanation, proposal, priority, expected benefit', () => {
  assert.ok(viewModel.recommendations.length > 0, 'Must have recommendations');
  for (const rec of viewModel.recommendations) {
    assert.ok(rec.targetArea.length > 0, 'Recommendation must specify target area');
    assert.ok(rec.issue.length > 0, 'Recommendation must specify issue');
    assert.ok(rec.explanation.length > 0, 'Recommendation must provide explanation');
    assert.ok(rec.proposal.length > 0, 'Recommendation must provide concrete proposal');
    assert.ok(['Cao', 'Trung bình', 'Thấp'].includes(rec.priority), 'Priority must be Cao, Trung bình or Thấp');
    assert.ok(rec.expectedBenefit.length > 0, 'Recommendation must specify expected benefit');
  }
});

// -----------------------------------------------------------------------------
// DOMAIN 6: PHẦN 6 — KẾT LUẬN TỔNG THỂ & TÍNH TOÀN VẸN
// -----------------------------------------------------------------------------
console.log('\n--- Domain 6: Phần 6 — Kết Luận Tổng Thể & Invariants ---');

it('TC-REP-09: Conclusion summarizes priorities, elements to keep, and data integrity note', () => {
  assert.ok(viewModel.conclusion.overallAssessment.length > 0);
  assert.ok(viewModel.conclusion.topPriorities.length > 0);
  assert.ok(viewModel.conclusion.elementsToKeep.length > 0);
  assert.ok(viewModel.conclusion.dataIntegrityNotice.length > 0);
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
