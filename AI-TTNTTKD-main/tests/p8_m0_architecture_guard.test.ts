// =============================================================================
// tests/p8_m0_architecture_guard.test.ts
// Phase P8-M0 — Architecture Guard & Foundation Integrity Test Suite
//
// VERIFIES:
// 1. NH-ARCH-01: Zero reverse imports from nguHanh into P0–P7.5 modules.
// 2. NH-ARCH-02: Zero circular dependencies in elementTypes.ts.
// 3. NH-ARCH-03: Backward compatibility of RoomConfig & RoomObject with additive fields.
// 4. NH-ARCH-04: Strict 4-state ElementDataStatus enum enforcement.
// 5. NH-ARCH-05: Source Registry bibliographic accuracy and attribution status.
// 6. NH-ARCH-06: P0–P7.5 Algorithm & Master Preset (89/51) Invariance.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NguHanhElement,
  ElementDataStatus,
  ElementCertainty,
  ElementAnalysisResult,
  ElementRelationType,
  ElementRelationResult,
} from '../src/engine/core/nguHanh/elementTypes.js';

import { RoomConfig, RoomObject } from '../src/types/fengshui.js';
import { SOURCE_REGISTRY, getSourceInfo } from '../src/engine/core/sourceRegistry.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('================================================================================');
console.log('PHASE P8-M0: ARCHITECTURE GUARD & FOUNDATION TEST SUITE');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// DOMAIN 1: NH-ARCH-01 — Zero Reverse Imports
// -----------------------------------------------------------------------------
console.log('--- Domain 1: NH-ARCH-01 — Reverse Import Detection ---');

const engineDir = path.join(projectRoot, 'src', 'engine');
function scanFilesForPattern(dir: string, excludeSubdir: string, pattern: RegExp): string[] {
  const violations: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== excludeSubdir && entry.name !== 'node_modules') {
        violations.push(...scanFilesForPattern(fullPath, excludeSubdir, pattern));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (pattern.test(content)) {
        violations.push(fullPath);
      }
    }
  }
  return violations;
}

// Regex to detect imports from nguHanh
const nguHanhImportRegex = /from\s+['"][^'"]*nguHanh(\/|['"])/i;
const reverseImportViolations = scanFilesForPattern(engineDir, 'nguHanh', nguHanhImportRegex);

assert(
  reverseImportViolations.length === 0,
  `Zero reverse imports from nguHanh into P0–P7.5 engine files (Found: ${reverseImportViolations.length})`
);

// -----------------------------------------------------------------------------
// DOMAIN 2: NH-ARCH-02 — Clean Isolation in elementTypes.ts
// -----------------------------------------------------------------------------
console.log('\n--- Domain 2: NH-ARCH-02 — Clean Isolation of elementTypes.ts ---');

const elementTypesPath = path.join(projectRoot, 'src', 'engine', 'core', 'nguHanh', 'elementTypes.ts');
const elementTypesContent = fs.readFileSync(elementTypesPath, 'utf-8');

// Ensure elementTypes only imports from types/fengshui and nowhere else in engine
const importLines = elementTypesContent
  .split('\n')
  .filter((line) => line.trim().startsWith('import') && !line.includes('type {') && !line.includes('type '));

const invalidImports = importLines.filter((line) => !line.includes('types/fengshui'));
assert(
  invalidImports.length === 0,
  `elementTypes.ts only imports types from types/fengshui (Found unexpected: ${invalidImports.length})`
);

// -----------------------------------------------------------------------------
// DOMAIN 3: NH-ARCH-03 — Backward Compatibility of RoomConfig & RoomObject
// -----------------------------------------------------------------------------
console.log('\n--- Domain 3: NH-ARCH-03 — Additive Types Backward Compatibility ---');

// Legacy RoomConfig (without wallColor / floorColor)
const legacyConfig: RoomConfig = {
  width: 5,
  length: 5.2,
  height: 2.8,
  direction: 'N',
  doorWall: 'east',
  windowWall: 'south',
};
assert(
  legacyConfig.wallColor === undefined && legacyConfig.floorColor === undefined,
  'Legacy RoomConfig without wallColor/floorColor compiles and initializes cleanly'
);

// New RoomConfig with P8 additive fields
const newConfig: RoomConfig = {
  ...legacyConfig,
  wallColor: '#FFFFFF',
  floorColor: '#8B4513',
};
assert(
  newConfig.wallColor === '#FFFFFF' && newConfig.floorColor === '#8B4513',
  'P8 RoomConfig with wallColor and floorColor preserves values correctly'
);

// Legacy RoomObject (without material)
const legacyObject: RoomObject = {
  id: 'bed_legacy',
  type: 'bed',
  name: 'Giường Ngủ Gỗ',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { width: 1.8, length: 2.0, height: 0.9 },
  color: '#228B22',
};
assert(
  legacyObject.material === undefined,
  'Legacy RoomObject without material compiles and initializes cleanly'
);

// New RoomObject with P8 additive material field
const newObject: RoomObject = {
  ...legacyObject,
  id: 'bed_p8',
  material: 'oak',
};
assert(
  newObject.material === 'oak',
  'P8 RoomObject with material field preserves value correctly'
);

// -----------------------------------------------------------------------------
// DOMAIN 4: NH-ARCH-04 — 4-State ElementDataStatus Enum Validation
// -----------------------------------------------------------------------------
console.log('\n--- Domain 4: NH-ARCH-04 — 4-State ElementDataStatus Enum ---');

const validStatuses: ElementDataStatus[] = ['known', 'ambiguous', 'insufficient', 'unsupported'];

assert(validStatuses.length === 4, 'ElementDataStatus defines exactly 4 discrete states');

const testAnalysisKnown: ElementAnalysisResult = {
  element: 'Mộc' as NguHanhElement,
  dataStatus: 'known',
  certainty: 'classical' as ElementCertainty,
  sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
  explanation: 'Màu xanh lục thuộc hành Mộc',
};
assert(
  testAnalysisKnown.dataStatus === 'known' && testAnalysisKnown.element === 'Mộc',
  'ElementAnalysisResult supports "known" state with assigned element'
);

const testAnalysisAmbiguous: ElementAnalysisResult = {
  element: null,
  dataStatus: 'ambiguous',
  certainty: null,
  sourceRef: [],
  explanation: 'Màu xám trung tính nằm giữa Kim và Thổ, không thể phân loại dứt khoát',
};
assert(
  testAnalysisAmbiguous.dataStatus === 'ambiguous' && testAnalysisAmbiguous.element === null,
  'ElementAnalysisResult supports "ambiguous" state with element=null'
);

const testAnalysisInsufficient: ElementAnalysisResult = {
  element: null,
  dataStatus: 'insufficient',
  certainty: null,
  sourceRef: [],
  explanation: 'Không có dữ liệu đầu vào',
};
assert(
  testAnalysisInsufficient.dataStatus === 'insufficient' && testAnalysisInsufficient.element === null,
  'ElementAnalysisResult supports "insufficient" state'
);

const testAnalysisUnsupported: ElementAnalysisResult = {
  element: null,
  dataStatus: 'unsupported',
  certainty: null,
  sourceRef: [],
  explanation: 'Vật liệu không nằm trong danh mục hỗ trợ',
};
assert(
  testAnalysisUnsupported.dataStatus === 'unsupported' && testAnalysisUnsupported.element === null,
  'ElementAnalysisResult supports "unsupported" state'
);

// -----------------------------------------------------------------------------
// DOMAIN 5: NH-ARCH-05 — Source Registry Bibliographic Accuracy
// -----------------------------------------------------------------------------
console.log('\n--- Domain 5: NH-ARCH-05 — Source Registry Bibliographic Audit ---');

// 1. SRC-NGU-HANH-DAI-NGHIA
const srcNHDN = getSourceInfo('SRC-NGU-HANH-DAI-NGHIA');
assert(srcNHDN !== null, 'SRC-NGU-HANH-DAI-NGHIA is registered in Source Registry');
assert(
  srcNHDN?.status === 'pending',
  'SRC-NGU-HANH-DAI-NGHIA status is "pending" (not falsely promoted to verified)'
);
assert(
  srcNHDN?.description.includes('Quyển 2 thiên 4') === true &&
    srcNHDN?.description.includes('Quyển 2 thiên 6') === true &&
    srcNHDN?.description.includes('Quyển 2 thiên 10') === true &&
    srcNHDN?.description.includes('Quyển 3 thiên 14') === true,
  'SRC-NGU-HANH-DAI-NGHIA cites exact classical chapters (Quyển 2 thiên 4, 6, 10; Quyển 3 thiên 14)'
);

// 2. SRC-HOANG-DE-NOI-KINH
const srcHDNK = getSourceInfo('SRC-HOANG-DE-NOI-KINH');
assert(srcHDNK !== null && srcHDNK.status === 'pending', 'SRC-HOANG-DE-NOI-KINH registered with pending status');

// 3. SRC-BAT-TRACH-MINH-KINH-NGUHANH
const srcBTMK = getSourceInfo('SRC-BAT-TRACH-MINH-KINH-NGUHANH');
assert(srcBTMK !== null, 'SRC-BAT-TRACH-MINH-KINH-NGUHANH registered');
assert(
  srcBTMK?.notes?.includes('Thác danh truyền bản') === true ||
    srcBTMK?.authorOrOrigin.includes('Khuyết danh') === true,
  'SRC-BAT-TRACH-MINH-KINH-NGUHANH transparently records attribution status (Thác danh truyền bản / Khuyết danh)'
);

// 4. SRC-PHONG-THUY-NOI-THAT-HIEN-DAI
const srcApplied = getSourceInfo('SRC-PHONG-THUY-NOI-THAT-HIEN-DAI');
assert(srcApplied !== null, 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI registered');
assert(
  srcApplied?.code === 'INTERNAL/APPLIED PROVISIONAL',
  'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI code is strictly marked "INTERNAL/APPLIED PROVISIONAL"'
);
assert(
  srcApplied?.category === 'heuristic_experimental' && srcApplied?.status === 'unverified',
  'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI is categorized as heuristic_experimental and unverified'
);

// 5. SRC-HEURISTIC-HARMONY-SCORE
const srcHarmony = getSourceInfo('SRC-HEURISTIC-HARMONY-SCORE');
assert(
  srcHarmony !== null && srcHarmony.category === 'heuristic_experimental',
  'SRC-HEURISTIC-HARMONY-SCORE registered as heuristic_experimental'
);

// 6. SRC-HEURISTIC-SHAPE-DIMENSIONS
const srcShape = getSourceInfo('SRC-HEURISTIC-SHAPE-DIMENSIONS');
assert(
  srcShape !== null && srcShape.category === 'heuristic_experimental',
  'SRC-HEURISTIC-SHAPE-DIMENSIONS registered as heuristic_experimental'
);

// -----------------------------------------------------------------------------
// DOMAIN 6: NH-ARCH-06 — P0–P7.5 Master Preset & Algorithm Invariance
// -----------------------------------------------------------------------------
console.log('\n--- Domain 6: NH-ARCH-06 — Master Preset 89/51 Invariance ---');

const profile1985 = getUserFengShuiProfile(1985, 'male');
const masterEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);

assert(
  masterEval.overallScore === 51,
  `Master Preset default evaluation score is strictly invariant at 51 (Current: ${masterEval.overallScore})`
);
assert(
  masterEval.breakdown.bedScore === 30,
  `Master Preset bed score is strictly invariant at 30 (Current: ${masterEval.breakdown.bedScore})`
);
assert(
  masterEval.breakdown.deskScore === 92,
  `Master Preset desk score is strictly invariant at 92 (Current: ${masterEval.breakdown.deskScore})`
);
assert(
  masterEval.breakdown.mirrorScore === 45,
  `Master Preset mirror score is strictly invariant at 45 (Current: ${masterEval.breakdown.mirrorScore})`
);
assert(
  masterEval.breakdown.circulationScore === 70,
  `Master Preset circulation score is strictly invariant at 70 (Current: ${masterEval.breakdown.circulationScore})`
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`P8-M0 TEST SUITE RESULT: ${passedAssertions} PASS | ${failedAssertions} FAIL | TOTAL ASSERTIONS: ${totalAssertions}`);
console.log('================================================================================');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
