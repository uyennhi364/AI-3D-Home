// =============================================================================
// tests/p0_characterization_baseline.ts
// Characterization Baseline Tests for P0.
// Records existing system behavior without changing business logic.
// =============================================================================

import { calculateGua, getUserFengShuiProfile, DIRECTION_ANGLES } from '../src/engine/batTrach';
import { getBedHeadboardDirection, getFacingDirectionFromYaw, evaluateRoomFengShui } from '../src/engine/fengshuiRules';
import { createOBBFromObject, getOBBCorners, checkOBBCollision } from '../src/engine/geometryEngine';
import { ROOM_PRESETS } from '../src/engine/presets';
import { generateOptimizedLayout } from '../src/engine/layoutOptimizer';
import { SOURCE_REGISTRY, getAllSources } from '../src/engine/core/sourceRegistry';
import { CompassDirection } from '../src/types/fengshui';

interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  input: any;
  output: any;
  sourceStatus: 'verified' | 'pending-source';
  status: 'PASS' | 'FAIL' | 'RECORDED';
  note?: string;
}

const results: TestCaseResult[] = [];

function record(tc: TestCaseResult) {
  results.push(tc);
  console.log(`[${tc.status}] ${tc.id}: ${tc.name} -> ${JSON.stringify(tc.output)}`);
}

console.log('================================================================');
console.log('   P0: CHARACTERIZATION BASELINE TESTS (NGHIỆM THU HIỆN TRẠNG)  ');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Quái Số (10 Trường Hợp Nam / Nữ Các Năm Biên)
// -----------------------------------------------------------------------------
console.log('--- 1. Quái Số 10 trường hợp biên ---');
const testGuaCases: Array<{ year: number; gender: 'male' | 'female'; sourceStatus: 'verified' | 'pending-source'; note: string }> = [
  { year: 1985, gender: 'male', sourceStatus: 'verified', note: 'Sinh trước 2000, Nam: 11 - (1+9+8+5=23->5) = 6 (Càn)' },
  { year: 1985, gender: 'female', sourceStatus: 'verified', note: 'Sinh trước 2000, Nữ: 4 + 5 = 9 (Ly)' },
  { year: 1999, gender: 'male', sourceStatus: 'verified', note: 'Sinh 1999, Nam: 1+9+9+9=28->10->1; 11-1 = 1 (Khảm)' },
  { year: 1999, gender: 'female', sourceStatus: 'verified', note: 'Sinh 1999, Nữ: 4+1 = 5 -> Cấn (8)' },
  { year: 2000, gender: 'male', sourceStatus: 'pending-source', note: 'Năm 2000, Nam: Code: (11-2)-1 = 8 (Cấn)' },
  { year: 2000, gender: 'female', sourceStatus: 'pending-source', note: 'Năm 2000, Nữ: Code: 4+2+1 = 7 (Đoài)' },
  { year: 2004, gender: 'male', sourceStatus: 'pending-source', note: 'Năm 2004, Nam: Code: (11-6)-1 = 4 (Tốn)' },
  { year: 2004, gender: 'female', sourceStatus: 'pending-source', note: 'Năm 2004, Nữ: Code: 4+6+1 = 11->2 (Khôn)' },
  { year: 2010, gender: 'male', sourceStatus: 'pending-source', note: 'Năm 2010, Nam: Code: (11-3)-1 = 7 (Đoài)' },
  { year: 2010, gender: 'female', sourceStatus: 'pending-source', note: 'Năm 2010, Nữ: Code: 4+3+1 = 8 (Cấn)' },
];

for (let i = 0; i < testGuaCases.length; i++) {
  const c = testGuaCases[i];
  const gua = calculateGua(c.year, c.gender);
  const profile = getUserFengShuiProfile(c.year, c.gender);
  record({
    id: `TC-GUA-${String(i + 1).padStart(2, '0')}`,
    name: `Quái mệnh ${c.gender === 'male' ? 'Nam' : 'Nữ'} ${c.year}`,
    category: 'GuaNumber',
    input: { year: c.year, gender: c.gender },
    output: { guaNumber: gua, guaName: profile.guaName, group: profile.group, element: profile.element },
    sourceStatus: c.sourceStatus,
    status: 'RECORDED',
    note: c.note,
  });
}

// -----------------------------------------------------------------------------
// 2. Bát Trạch 8 Quái × 8 Hướng
// -----------------------------------------------------------------------------
console.log('\n--- 2. Kiểm tra tính toàn vẹn Bát Trạch 8 Quái × 8 Hướng ---');
const allGuas = [1, 2, 3, 4, 6, 7, 8, 9];
const allDirs: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
let allSectorsComplete = true;

for (const g of allGuas) {
  // Mock profile by passing a dummy year that yields Gua g
  // 1999 male -> 1; 2004 female -> 2; 1988 male -> 3; 2004 male -> 4; 1985 male -> 6; 2010 male -> 7; 2000 male -> 8; 1985 female -> 9
  const yearMap: Record<number, { year: number; gender: 'male' | 'female' }> = {
    1: { year: 1999, gender: 'male' },
    2: { year: 2004, gender: 'female' },
    3: { year: 1988, gender: 'male' },
    4: { year: 2004, gender: 'male' },
    6: { year: 1985, gender: 'male' },
    7: { year: 2010, gender: 'male' },
    8: { year: 2000, gender: 'male' },
    9: { year: 1985, gender: 'female' },
  };
  const { year, gender } = yearMap[g];
  const p = getUserFengShuiProfile(year, gender);
  const auspiciousCount = p.auspiciousDirections.length;
  const inauspiciousCount = p.inauspiciousDirections.length;
  if (auspiciousCount !== 4 || inauspiciousCount !== 4) {
    allSectorsComplete = false;
  }
}

record({
  id: 'TC-SECTOR-8X8',
  name: 'Kiểm tra 8 Quái x 8 Hướng: mỗi Quái có đúng 4 Cát và 4 Hung',
  category: 'BatTrachMatrix',
  input: { guas: allGuas, directions: allDirs },
  output: { complete: allSectorsComplete, countPerGua: '4 Cát / 4 Hung' },
  sourceStatus: 'verified',
  status: allSectorsComplete ? 'PASS' : 'FAIL',
  note: 'Căn cứ Bát Trạch Minh Kính',
});

// -----------------------------------------------------------------------------
// 3. Hướng Đầu Giường & Yaw Angle (Current Behavior)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Đo đạc góc quay và hướng đầu giường hiện tại ---');
const testAnglesDeg = [0, 90, 180, 270];
const headboardResults: Record<number, { headboard: string; facing: string }> = {};

for (const deg of testAnglesDeg) {
  const rad = (deg * Math.PI) / 180;
  const headboardDir = getBedHeadboardDirection(rad);
  const facingDir = getFacingDirectionFromYaw(rad);
  headboardResults[deg] = { headboard: headboardDir, facing: facingDir };
}

record({
  id: 'TC-ORIENTATION-BASELINE',
  name: 'Đo lường hướng đầu giường & hướng nhìn mặt trước theo góc quay hiện tại',
  category: 'OrientationBaseline',
  input: testAnglesDeg,
  output: headboardResults,
  sourceStatus: 'pending-source',
  status: 'RECORDED',
  note: 'Ghi nhận baseline: deg=90 cho headboard=E; yaw=0 cho facing=S',
});

// -----------------------------------------------------------------------------
// 4. OBB Geometry & Collision Detection
// -----------------------------------------------------------------------------
console.log('\n--- 4. Kiểm tra OBB & Va Chạm SAT ---');
const obbA = createOBBFromObject({ x: 0, z: 0 }, { width: 1.6, length: 2.0 }, 0);
const obbB_overlapping = createOBBFromObject({ x: 0.5, z: 0.5 }, { width: 1.0, length: 1.0 }, 0);
const obbC_separated = createOBBFromObject({ x: 3.0, z: 3.0 }, { width: 1.0, length: 1.0 }, 0);

const collision1 = checkOBBCollision(obbA, obbB_overlapping);
const collision2 = checkOBBCollision(obbA, obbC_separated);
const obbPass = collision1 === true && collision2 === false;

record({
  id: 'TC-OBB-SAT-COLLISION',
  name: 'Va chạm OBB SAT: phát hiện chồng lấn và tách biệt',
  category: 'GeometryOBB',
  input: { boxA: obbA.center, boxB: obbB_overlapping.center, boxC: obbC_separated.center },
  output: { overlapDetected: collision1, separatedDetected: !collision2 },
  sourceStatus: 'verified',
  status: obbPass ? 'PASS' : 'FAIL',
  note: 'Separating Axis Theorem 2D',
});

// -----------------------------------------------------------------------------
// 5. Preset Baseline Evaluation
// -----------------------------------------------------------------------------
console.log('\n--- 5. Đánh giá Preset Mẫu Hiện Tại ---');
const masterPreset = ROOM_PRESETS.master;
const profile1985 = getUserFengShuiProfile(1985, 'male');
const evalResult = evaluateRoomFengShui(profile1985, masterPreset.config, masterPreset.objects);

record({
  id: 'TC-PRESET-MASTER-EVAL',
  name: 'Điểm số & Vấn đề phòng ngủ Master mặc định',
  category: 'PresetEvaluation',
  input: { room: masterPreset.config, objectsCount: masterPreset.objects.length },
  output: {
    overallScore: evalResult.overallScore,
    statusText: evalResult.statusText,
    breakdown: evalResult.breakdown,
    issuesCount: evalResult.keyIssues.length,
  },
  sourceStatus: 'verified',
  status: 'RECORDED',
  note: 'Preset Master có vanity_east đã chuẩn hóa kích thước',
});

// -----------------------------------------------------------------------------
// 6. Layout Optimizer & Pinned Objects
// -----------------------------------------------------------------------------
console.log('\n--- 6. Thử nghiệm Layout Optimizer & Khóa Đồ Vật ---');
const optResult = generateOptimizedLayout(profile1985, masterPreset.config, masterPreset.objects, evalResult, 'feng_shui_priority', ['wardrobe_north']);
const wardrobeBefore = masterPreset.objects.find((o) => o.id === 'wardrobe_north');
const wardrobeAfter = optResult.optimizedObjects.find((o) => o.id === 'wardrobe_north');

const wardUnchanged =
  wardrobeBefore &&
  wardrobeAfter &&
  Math.abs(wardrobeBefore.position.x - wardrobeAfter.position.x) < 0.001 &&
  Math.abs(wardrobeBefore.position.z - wardrobeAfter.position.z) < 0.001;

record({
  id: 'TC-OPTIMIZER-PINNED',
  name: 'Layout Optimizer tuân thủ Pinned Object (Tủ quần áo bị khóa không di chuyển)',
  category: 'OptimizerPinned',
  input: { pinnedId: 'wardrobe_north' },
  output: {
    beforeScore: optResult.proposal.beforeScore,
    afterScore: optResult.proposal.afterScore,
    wardrobeLocked: wardUnchanged,
    adjustmentsCount: optResult.proposal.adjustments.length,
  },
  sourceStatus: 'verified',
  status: wardUnchanged ? 'PASS' : 'FAIL',
  note: 'Tủ giữ nguyên vị trí, các đồ vật khác được tối ưu',
});

// -----------------------------------------------------------------------------
// 7. Source Registry Verification
// -----------------------------------------------------------------------------
console.log('\n--- 7. Kiểm tra Source Registry ---');
const registeredSources = getAllSources();
const hasClassic = registeredSources.some((s) => s.id === 'SRC-BAT-TRACH-MINH-KINH');
const hasErgo = registeredSources.some((s) => s.id === 'SRC-TCVN-4451-2012');

record({
  id: 'TC-SOURCE-REGISTRY',
  name: 'Đăng ký đầy đủ nguồn cổ thư Bát Trạch & Tiêu chuẩn Kiến trúc',
  category: 'SourceRegistry',
  input: { totalSources: registeredSources.length },
  output: { hasClassic, hasErgo, total: registeredSources.length },
  sourceStatus: 'verified',
  status: hasClassic && hasErgo ? 'PASS' : 'FAIL',
});

console.log('\n================================================================');
const total = results.length;
const passCount = results.filter((r) => r.status === 'PASS').length;
const recCount = results.filter((r) => r.status === 'RECORDED').length;
const failCount = results.filter((r) => r.status === 'FAIL').length;
console.log(`P0 KẾT THÚC: ${total} Tests | ${passCount} PASS | ${recCount} RECORDED | ${failCount} FAIL`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
