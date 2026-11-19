// =============================================================================
// tests/bug_audit_fixes.test.ts
// Comprehensive Verification Suite for Bug 01, Bug 02, Bug 03, Bug 04
// =============================================================================

import { validateBirthYear, getUserFengShuiProfile, calculateGua } from '../src/engine/batTrach.js';
import { LIBRARY_ITEMS } from '../src/components/ObjectLibraryDock.js';
import { evaluateIntentSafety } from '../src/services/intentGuard.js';
import { classifyUserIntent } from '../src/engine/intentClassifier.js';
import { getFengShuiTheoryAnswer } from '../src/engine/fengShuiKnowledge.js';
import { evaluateFurnitureAssessment } from '../src/engine/core/nguHanh/elementAssessment.js';
import { parseIntent } from '../src/engine/sceneIntentParser.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';

let passed = 0;
let failed = 0;

function assert(cond: any, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

console.log('=============================================================================');
console.log('SUITE: COMPREHENSIVE BUG AUDIT & ROOT CAUSE FIX VERIFICATION');
console.log('=============================================================================');

// ---------------------------------------------------------------------------
// 1. BUG 01: VALIDATION NĂM SINH (TC5.2.02)
// ---------------------------------------------------------------------------
console.log('\n--- BUG 01: BIRTH YEAR VALIDATION (1930 - 2035) ---');
{
  // Invalid years
  const y1900 = validateBirthYear(1900);
  assert(!y1900.isValid && y1900.error !== undefined, 'Year 1900 is rejected with error message');

  const y2100 = validateBirthYear(2100);
  assert(!y2100.isValid && y2100.error !== undefined, 'Year 2100 is rejected with error message');

  const y1929 = validateBirthYear(1929);
  assert(!y1929.isValid, 'Boundary year 1929 (below min) is rejected');

  const y2036 = validateBirthYear(2036);
  assert(!y2036.isValid, 'Boundary year 2036 (above max) is rejected');

  const yEmpty = validateBirthYear('');
  assert(!yEmpty.isValid && yEmpty.error?.includes('Vui lòng'), 'Empty year input is rejected');

  const yText = validateBirthYear('abc');
  assert(!yText.isValid, 'Non-numeric string is rejected');

  // Valid years
  const y1930 = validateBirthYear(1930);
  assert(y1930.isValid && y1930.parsedYear === 1930, 'Boundary year 1930 (min) is accepted');

  const y1985 = validateBirthYear(1985);
  assert(y1985.isValid && y1985.parsedYear === 1985, 'Standard year 1985 is accepted');

  const y2004 = validateBirthYear(2004);
  assert(y2004.isValid && y2004.parsedYear === 2004, 'Standard year 2004 is accepted');

  const y2035 = validateBirthYear(2035);
  assert(y2035.isValid && y2035.parsedYear === 2035, 'Boundary year 2035 (max) is accepted');

  // Verify Kua calculation for valid years
  const gua1985M = calculateGua(1985, 'male');
  assert(gua1985M === 6, '1985 Male Kua is Càn (6)');

  const gua2004F = calculateGua(2004, 'female');
  assert(gua2004F === 2, '2004 Female Kua is Khôn (2)');
}

// ---------------------------------------------------------------------------
// 2. BUG 02: TÌM KIẾM NỘI THẤT (TC5.2.10)
// ---------------------------------------------------------------------------
console.log('\n--- BUG 02: FURNITURE SEARCH & ACCENT-INSENSITIVE FILTERING ---');
{
  function removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  function filterItems(query: string, category: string = 'all') {
    return LIBRARY_ITEMS.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return matchesCategory;

      const q = removeVietnameseTones(trimmedQuery);
      const rawQ = trimmedQuery.toLowerCase();
      const nameNorm = removeVietnameseTones(item.name);
      const subtextNorm = removeVietnameseTones(item.subtext);
      const catNorm = removeVietnameseTones(item.category);
      const typeNorm = removeVietnameseTones(item.type);

      const matchesSearch =
        nameNorm.includes(q) ||
        subtextNorm.includes(q) ||
        catNorm.includes(q) ||
        typeNorm.includes(q) ||
        item.name.toLowerCase().includes(rawQ) ||
        item.subtext.toLowerCase().includes(rawQ);

      if (category === 'all') return matchesSearch;
      return matchesCategory && matchesSearch;
    });
  }

  // Test keyword "Bàn"
  const resBanUpper = filterItems('Bàn');
  assert(resBanUpper.length >= 2, `Search "Bàn" returns ${resBanUpper.length} items (expected >= 2: Bàn học, Bàn làm việc)`);
  assert(resBanUpper.some((i) => i.name.includes('Bàn học')), 'Result includes "Bàn học"');
  assert(resBanUpper.some((i) => i.name.includes('Bàn làm việc')), 'Result includes "Bàn làm việc"');

  // Test lowercase "bàn"
  const resBanLower = filterItems('bàn');
  assert(resBanLower.length === resBanUpper.length, 'Lowercase "bàn" returns identical count as "Bàn"');

  // Test unaccented "ban"
  const resBanNoAccent = filterItems('ban');
  assert(resBanNoAccent.length === resBanUpper.length, 'Unaccented "ban" returns identical results');

  // Test keyword "Giường"
  const resGiuong = filterItems('Giường');
  assert(resGiuong.length >= 3, `Search "Giường" returns ${resGiuong.length} items (Queen, King, Single)`);

  // Test keyword "Tủ"
  const resTu = filterItems('Tủ');
  assert(resTu.some((i) => i.name.includes('Tủ quần áo')), 'Search "Tủ" finds "Tủ quần áo"');

  // Test non-existent keyword
  const resNone = filterItems('xyz123khongtontai');
  assert(resNone.length === 0, 'Non-existent keyword returns 0 items without error');

  // Test clearing keyword restores full catalog
  const resAll = filterItems('');
  assert(resAll.length === LIBRARY_ITEMS.length, `Empty query restores all ${LIBRARY_ITEMS.length} items`);
}

// ---------------------------------------------------------------------------
// 3. BUG 03: ĐÁNH GIÁ PHONG THỦY RIÊNG CHO ĐỒ VẬT (TC5.2.16)
// ---------------------------------------------------------------------------
console.log('\n--- BUG 03: OBJECT-LEVEL FENG SHUI EVALUATION PANEL ---');
{
  const masterPreset = ROOM_PRESETS.master;
  const bed = masterPreset.objects.find((o) => o.type === 'bed')!;
  const desk = masterPreset.objects.find((o) => o.type === 'desk')!;
  const profile2004F = getUserFengShuiProfile(2004, 'female');

  assert(bed !== undefined, 'Master preset contains bed object');
  assert(desk !== undefined, 'Master preset contains desk object');

  // Evaluate bed with Ngũ Hành engine
  const bedSummary = evaluateFurnitureAssessment(bed, profile2004F.element as any, {
    direction: masterPreset.config.direction,
  });
  assert(bedSummary !== null && bedSummary !== undefined, 'Bed element assessment produced valid summary');
  assert(bedSummary.profile.objectId === bed.id, 'Assessment strictly matches bed ID');

  // Evaluate desk with Ngũ Hành engine
  const deskSummary = evaluateFurnitureAssessment(desk, profile2004F.element as any, {
    direction: masterPreset.config.direction,
  });
  assert(deskSummary.profile.objectId === desk.id, 'Assessment strictly matches desk ID');
  assert(deskSummary.profile.objectId !== bedSummary.profile.objectId, 'Bed and desk evaluations are strictly distinct entities');
}

// ---------------------------------------------------------------------------
// 4. BUG 04: AI TRẢ LỜI CÂU HỎI LÝ THUYẾT BÁT TRẠCH (TC5.2.18)
// ---------------------------------------------------------------------------
console.log('\n--- BUG 04: BÁT TRẠCH THEORY KNOWLEDGE BASE & INTENT DISCRIMINATION ---');
{
  const profile = getUserFengShuiProfile(2004, 'female');
  const room = ROOM_PRESETS.master.config;

  // 4.1 "Bát Trạch là gì?"
  const qBatTrach = 'Bát Trạch là gì?';
  const guardBatTrach = evaluateIntentSafety(qBatTrach);
  assert(guardBatTrach.isAdvisoryOrQuestion === true, 'IntentGuard flags "Bát Trạch là gì?" as advisory question');
  assert(guardBatTrach.isSafeToExecute === false, 'IntentGuard blocks 3D execution for theory query');

  const classifiedBatTrach = classifyUserIntent(qBatTrach);
  assert(classifiedBatTrach.intent === 'FENG_SHUI_CONSULT', 'Classified as FENG_SHUI_CONSULT');
  assert(classifiedBatTrach.needs3DExecution === false, 'needs3DExecution is strictly false');

  const answerBatTrach = getFengShuiTheoryAnswer(qBatTrach, profile, room);
  assert(answerBatTrach.isTheoryQuery === true, 'Knowledge base matches Bát Trạch theory query');
  assert(answerBatTrach.answer?.includes('Bát = 8, Trạch = Nhà'), 'Answer explains etymology (Bát = 8, Trạch = Nhà)');
  assert(answerBatTrach.answer?.includes('Đông Tứ Mệnh') && answerBatTrach.answer?.includes('Tây Tứ Mệnh'), 'Answer details East/West groups');
  assert(answerBatTrach.answer?.includes('Sinh Khí') && answerBatTrach.answer?.includes('Tuyệt Mệnh'), 'Answer lists Auspicious and Inauspicious sectors');

  // 4.2 "Đông Tứ Mệnh là gì?"
  const answerDongTu = getFengShuiTheoryAnswer('Đông Tứ Mệnh là gì?', profile, room);
  assert(answerDongTu.isTheoryQuery === true, 'Matches Đông Tứ Mệnh query');
  assert(answerDongTu.answer?.includes('Khảm') && answerDongTu.answer?.includes('Ly'), 'Explains Đông Tứ Mệnh quẻ');

  // 4.3 "Tây Tứ Mệnh là gì?"
  const answerTayTu = getFengShuiTheoryAnswer('Tây Tứ Mệnh là gì?', profile, room);
  assert(answerTayTu.isTheoryQuery === true, 'Matches Tây Tứ Mệnh query');
  assert(answerTayTu.answer?.includes('Càn') && answerTayTu.answer?.includes('Khôn'), 'Explains Tây Tứ Mệnh quẻ');

  // 4.4 "Sinh Khí là gì?"
  const answerSinhKhi = getFengShuiTheoryAnswer('Sinh Khí là gì?', profile, room);
  assert(answerSinhKhi.isTheoryQuery === true, 'Matches Sinh Khí query');
  assert(answerSinhKhi.answer?.includes('Tham Lang') && answerSinhKhi.answer?.includes('Mộc'), 'Explains Tham Lang / Mộc');

  // 4.5 "Hướng nào phù hợp với gia chủ?"
  const answerHuong = getFengShuiTheoryAnswer('Hướng nào phù hợp với gia chủ?', profile, room);
  assert(answerHuong.isTheoryQuery === true, 'Matches user direction query');
  assert(answerHuong.answer?.includes('4 Hướng Cát') && answerHuong.answer?.includes('4 Hướng Hung'), 'Lists both good and bad directions');

  // 4.6 Action command vs Theory inquiry: "Hãy xoay giường về hướng Sinh Khí"
  const cmdRotateSinhKhi = 'Hãy xoay giường về hướng Sinh Khí';
  const classifiedCmd = classifyUserIntent(cmdRotateSinhKhi);
  assert(classifiedCmd.intent === 'ROTATE_OBJECT', '"Hãy xoay giường về hướng Sinh Khí" correctly classified as ROTATE_OBJECT');
  assert(classifiedCmd.needs3DExecution === true, 'needs3DExecution is true for actual rotation command');

  // 4.7 Scene parsing fallback preserves scene
  const sceneState = {
    room,
    objects: ROOM_PRESETS.master.objects,
  };
  const parsedTheory = parseIntent('Bát Trạch là gì?', sceneState as any, profile, {} as any);
  assert(parsedTheory.commands.length === 0, 'parseIntent returns 0 commands for theory question (Scene strictly preserved)');
  assert(parsedTheory.replyText.includes('Bát = 8, Trạch = Nhà'), 'parseIntent returns rich theoretical explanation');
}

console.log('\n=============================================================================');
console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
}
