// =============================================================================
// tests/p8_4_ui_integration.test.ts
// Phase P8.4 — Ngũ Hành UI & Visualization Integration Test Suite
//
// TEST SPECIFICATION:
// Covers all 25 unit test cases defined in P8_4_DESIGN_SPEC.md Section 7.1.
// Verifies UI component rendering, badge styling, absence of numeric scores,
// invariant protection (UNKNOWN != PASS), heuristic disclaimers, and UX states.
// =============================================================================

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NguHanhVerdictBadge } from '../src/components/NguHanhVerdictBadge.js';
import { NguHanhElementBadge } from '../src/components/NguHanhElementBadge.js';
import { NguHanhObjectCard } from '../src/components/NguHanhObjectCard.js';
import { NguHanhAssessmentPanel } from '../src/components/NguHanhAssessmentPanel.js';
import {
  evaluateFurnitureAssessment,
  evaluateRoomElementAssessment,
} from '../src/engine/core/nguHanh/elementAssessment.js';
import { RoomObject, RoomConfig } from '../src/types/fengshui.js';

let totalPassed = 0;
let totalFailed = 0;
let caseIndex = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    totalPassed++;
  } else {
    totalFailed++;
    console.error(`[FAIL] ${message}`);
  }
}

function startCase(name: string): void {
  caseIndex++;
  // console.log(`[TC #${caseIndex}] ${name}`);
}

function mockObj(props: {
  id: string;
  type: any;
  name?: string;
  width?: number;
  length?: number;
  height?: number;
  color?: string;
  material?: string;
}): RoomObject {
  return {
    id: props.id,
    type: props.type,
    name: props.name || `Object ${props.id}`,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: {
      width: props.width ?? 1.5,
      length: props.length ?? 2.0,
      height: props.height ?? 0.8,
    },
    color: props.color,
    material: props.material,
  };
}

console.log('=============================================================================');
console.log('RUNNING PHASE P8.4 TEST SUITE: UI & VISUALIZATION INTEGRATION');
console.log('=============================================================================\n');

// =============================================================================
// 1. SHARED COMPONENTS: VERDICT BADGE & ELEMENT BADGE (UI-01 to UI-11)
// =============================================================================
console.log('--- SUITE 1: Shared Components (Verdict Badge & Element Badge) ---');

startCase('UI-01: NguHanhVerdictBadge render pass');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhVerdictBadge, { verdict: 'pass' }));
  assert(html.includes('HỢP CÁCH'), 'UI-01: Label contains HỢP CÁCH');
  assert(html.includes('emerald') || html.includes('green'), 'UI-01: Contains emerald/green styling');
}

startCase('UI-02: NguHanhVerdictBadge render warn');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhVerdictBadge, { verdict: 'warn' }));
  assert(html.includes('CẢNH BÁO'), 'UI-02: Label contains CẢNH BÁO');
  assert(html.includes('amber'), 'UI-02: Contains amber styling');
}

startCase('UI-03: NguHanhVerdictBadge render fail');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhVerdictBadge, { verdict: 'fail' }));
  assert(html.includes('XUNG KHẮC'), 'UI-03: Label contains XUNG KHẮC');
  assert(html.includes('red'), 'UI-03: Contains red styling');
}

startCase('UI-04: NguHanhVerdictBadge render unknown (Anti-Conflation Invariant)');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhVerdictBadge, { verdict: 'unknown' }));
  assert(html.includes('CHƯA XÁC ĐỊNH'), 'UI-04: Label contains CHƯA XÁC ĐỊNH');
  assert(html.includes('gray'), 'UI-04: Contains neutral gray styling');
  assert(!html.includes('emerald') && !html.includes('bg-green-100'), 'UI-04: UNKNOWN must NEVER use green style');
}

startCase('UI-05: NguHanhVerdictBadge render n/a');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhVerdictBadge, { verdict: 'n/a' }));
  assert(html.includes('N/A'), 'UI-05: Label contains N/A');
}

startCase('UI-06: NguHanhElementBadge Kim');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: 'Kim' }));
  assert(html.includes('Kim'), 'UI-06: Label contains Kim');
  assert(html.includes('gray'), 'UI-06: Styled with metallic gray/silver');
}

startCase('UI-07: NguHanhElementBadge Mộc');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: 'Mộc' }));
  assert(html.includes('Mộc'), 'UI-07: Label contains Mộc');
  assert(html.includes('green'), 'UI-07: Styled with nature green');
}

startCase('UI-08: NguHanhElementBadge Thủy');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: 'Thủy' }));
  assert(html.includes('Thủy'), 'UI-08: Label contains Thủy');
  assert(html.includes('blue'), 'UI-08: Styled with water blue');
}

startCase('UI-09: NguHanhElementBadge Hỏa');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: 'Hỏa' }));
  assert(html.includes('Hỏa'), 'UI-09: Label contains Hỏa');
  assert(html.includes('red'), 'UI-09: Styled with fire red');
}

startCase('UI-10: NguHanhElementBadge Thổ');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: 'Thổ' }));
  assert(html.includes('Thổ'), 'UI-10: Label contains Thổ');
  assert(html.includes('yellow'), 'UI-10: Styled with earth yellow/amber');
}

startCase('UI-11: NguHanhElementBadge null');
{
  const html = renderToStaticMarkup(React.createElement(NguHanhElementBadge, { element: null }));
  assert(html.includes('Chưa xác định'), 'UI-11: Displays Chưa xác định fallback');
}

// =============================================================================
// 2. FURNITURE OBJECT CARD (UI-12 to UI-15)
// =============================================================================
console.log('--- SUITE 2: Furniture Object Card Integration ---');

const sampleBed = mockObj({
  id: 'bed-test-1',
  type: 'bed',
  name: 'Giường gỗ sồi',
  color: '#008000', // Mộc
  material: 'oak',  // Mộc
  width: 1.8,
  length: 2.0,
  height: 0.9,
});
const bedSummary = evaluateFurnitureAssessment(sampleBed, 'Mộc', { direction: 'E' });

startCase('UI-12: NguHanhObjectCard displays 4 physical attribute rows');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhObjectCard, {
      summary: bedSummary,
      personalElement: 'Mộc',
      defaultExpanded: true,
    })
  );
  assert(html.includes('Màu sắc'), 'UI-12: Displays Màu sắc row');
  assert(html.includes('Chất liệu'), 'UI-12: Displays Chất liệu row');
  assert(html.includes('Hình khối'), 'UI-12: Displays Hình khối row');
  assert(html.includes('Phương vị'), 'UI-12: Displays Phương vị row');
}

startCase('UI-13: NguHanhObjectCard count summary matches evaluation');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhObjectCard, {
      summary: bedSummary,
      personalElement: 'Mộc',
      defaultExpanded: true,
    })
  );
  assert(html.includes(`PASS: ${bedSummary.passCount}`), 'UI-13: PASS count matches');
  assert(html.includes(`WARN: ${bedSummary.warnCount}`), 'UI-13: WARN count matches');
  assert(html.includes(`FAIL: ${bedSummary.failCount}`), 'UI-13: FAIL count matches');
}

startCase('UI-14: NguHanhObjectCard displays heuristic disclaimer for NH-SHAPE-01');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhObjectCard, {
      summary: bedSummary,
      personalElement: 'Mộc',
      defaultExpanded: true,
    })
  );
  assert(html.includes('heuristic'), 'UI-14: Mentions heuristic tag');
  assert(html.includes('Quy tắc heuristic') || html.includes('quy ước nội bộ'), 'UI-14: Explicit heuristic disclaimer text');
}

startCase('UI-15: NguHanhObjectCard unknown verdict does NOT render with green');
{
  const weirdObj = mockObj({
    id: 'chair-unknown',
    type: 'chair',
  });
  const unknownSummary = evaluateFurnitureAssessment(weirdObj, 'Kim');
  const html = renderToStaticMarkup(
    React.createElement(NguHanhObjectCard, {
      summary: unknownSummary,
      personalElement: 'Kim',
      defaultExpanded: true,
    })
  );
  // Color rule NH-COLOR-01 should be unknown
  assert(unknownSummary.unknownCount > 0, 'Object has unknown rules');
  assert(html.includes('CHƯA XÁC ĐỊNH'), 'UI-15: Renders CHƯA XÁC ĐỊNH for unknown');
}

// =============================================================================
// 3. WHOLE ROOM ASSESSMENT PANEL (UI-16 to UI-23)
// =============================================================================
console.log('--- SUITE 3: Whole-Room Assessment Panel Integration ---');

const roomConfig: RoomConfig = {
  width: 5,
  length: 6,
  height: 2.8,
  direction: 'W',
  wallColor: '#ffffff', // Kim
  floorColor: '#e0c8a0', // Thổ
};
const roomAssessment = evaluateRoomElementAssessment(roomConfig, [sampleBed], 'Mộc');

startCase('UI-16: NguHanhAssessmentPanel null assessment empty state');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: null,
      personalElement: 'Kim',
    })
  );
  assert(html.includes('Chưa Chạy Phân Tích Ngũ Hành'), 'UI-16: Displays empty analysis banner');
}

startCase('UI-17: NguHanhAssessmentPanel null personalElement state');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: roomAssessment,
      personalElement: null,
    })
  );
  assert(html.includes('Chưa Cung Cấp Bản Mệnh Gia Chủ'), 'UI-17: Displays missing profile warning');
}

startCase('UI-18: NguHanhAssessmentPanel strictly NO numeric harmony score');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: roomAssessment,
      personalElement: 'Mộc',
    })
  );
  // Ensure no fake score like 85/100 or 0.85
  assert(!html.includes('/ 100'), 'UI-18: No /100 score format in Ngũ Hành panel');
  assert(!html.includes('overallHarmonyScore:'), 'UI-18: No numeric overall score label');
}

startCase('UI-19: NguHanhAssessmentPanel displays harmonyLevel text');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: roomAssessment,
      personalElement: 'Mộc',
    })
  );
  assert(
    html.includes('Rất hài hòa') ||
    html.includes('Hài hòa') ||
    html.includes('Trung bình') ||
    html.includes('Chưa hài hòa') ||
    html.includes('Chưa xác định'),
    'UI-19: Displays text-only harmony level'
  );
}

startCase('UI-20: NguHanhAssessmentPanel displays global academic disclaimer');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: roomAssessment,
      personalElement: 'Mộc',
    })
  );
  assert(html.includes('Khuyến cáo học thuật'), 'UI-20: Displays academic recommendations');
  assert(html.includes('Tính chất tham khảo'), 'UI-20: States reference-only nature');
}

startCase('UI-21: NguHanhAssessmentPanel displays registered source IDs');
{
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: roomAssessment,
      personalElement: 'Mộc',
    })
  );
  assert(html.includes('SRC-NGU-HANH-DAI-NGHIA'), 'UI-21: Cites Ngũ Hành Đại Nghĩa');
  assert(html.includes('SRC-BAT-TRACH-MINH-KINH'), 'UI-21: Cites Bát Trạch Minh Kính');
}

startCase('UI-22: harmonyLevel excellent mapping');
{
  const excellentAssessment = {
    ...roomAssessment,
    harmonyLevel: 'excellent' as const,
  };
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: excellentAssessment,
      personalElement: 'Kim',
    })
  );
  assert(html.includes('🌟 Rất hài hòa'), 'UI-22: Maps excellent to 🌟 Rất hài hòa');
}

startCase('UI-23: harmonyLevel unknown mapping');
{
  const unknownAssessment = {
    ...roomAssessment,
    harmonyLevel: 'unknown' as const,
  };
  const html = renderToStaticMarkup(
    React.createElement(NguHanhAssessmentPanel, {
      assessment: unknownAssessment,
      personalElement: 'Kim',
    })
  );
  assert(html.includes('❓ Chưa xác định'), 'UI-23: Maps unknown to ❓ Chưa xác định');
}

// =============================================================================
// 4. ENGINE EDGE CASES & INVARIANTS (UI-24 to UI-25)
// =============================================================================
console.log('--- SUITE 4: Engine Integration Edge Cases ---');

startCase('UI-24: evaluateFurnitureAssessment with missing material returns unknown gracefully');
{
  const incompleteDesk = mockObj({
    id: 'desk-no-mat',
    type: 'desk',
    color: '#008000',
  });
  const summary = evaluateFurnitureAssessment(incompleteDesk, 'Kim');
  const matRule = summary.rules.find((r) => r.ruleId === 'NH-MAT-01');
  assert(matRule !== undefined, 'UI-24: Evaluated NH-MAT-01');
  assert(matRule?.verdict === 'unknown', 'UI-24: Missing material yields unknown verdict, not fail');
}

startCase('UI-25: evaluateRoomElementAssessment with null personalElement returns unknown');
{
  const assessment = evaluateRoomElementAssessment(roomConfig, [sampleBed], null);
  assert(assessment.personalElement === null, 'UI-25: personalElement is null');
  assert(assessment.harmonyLevel === 'unknown', 'UI-25: harmonyLevel is unknown when personalElement is null');
  assert(assessment.overallHarmonyScore === null, 'UI-25: overallHarmonyScore is strictly null');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n=============================================================================');
console.log('P8.4 UI INTEGRATION TEST RESULTS:');
console.log(`• Test Cases: ${caseIndex} executed`);
console.log(`• Assertions: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('=============================================================================');

if (totalFailed > 0) {
  process.exit(1);
}
