// =============================================================================
// src/engine/core/guaEngine.ts
// Standardized Gua (Quái Mệnh) Computation Engine V2 (Phase P4)
//
// DESIGN PRINCIPLES:
// - Integrates Lập Xuân solar term boundary resolution.
// - Supports calculation trace for full transparency and auditability.
// - Handles Male/Female, <2000 and >=2000 accurately.
// - Gua 5 rule: Male -> 2 (Khôn), Female -> 8 (Cấn) under classical Bát Trạch.
// - Distinguishes Gua Element (Thủy/Thổ/Mộc/Kim/Hỏa) from Nạp Âm.
// - If birthDate is on an uncertain Lập Xuân boundary, flags dataStatus: 'insufficient'.
// =============================================================================

import { GuaElement, GuaGroup } from '../../types/fengshui.js';
import { PersonalProfile, CalculationPolicy, DEFAULT_CALCULATION_POLICY } from './personalProfile.js';
import { resolveEffectiveSolarYear, LapXuanResolutionResult } from './lapXuanCalendar.js';

export interface GuaCalculationResult {
  guaNumber: number;
  guaName: string;
  element: GuaElement;
  group: GuaGroup;
  calculationTrace: string[];
  effectiveSolarYear: number;
  lapXuanResolution: LapXuanResolutionResult;
  dataStatus: 'sufficient' | 'insufficient';
  isCertain: boolean;
  uncertaintyReason?: string;
  sources: string[];
}

export const GUA_V2_METADATA: Record<number, { name: string; element: GuaElement; group: GuaGroup }> = {
  1: { name: 'Khảm', element: 'Thủy', group: 'Đông Tứ Mệnh' },
  2: { name: 'Khôn', element: 'Thổ', group: 'Tây Tứ Mệnh' },
  3: { name: 'Chấn', element: 'Mộc', group: 'Đông Tứ Mệnh' },
  4: { name: 'Tốn', element: 'Mộc', group: 'Đông Tứ Mệnh' },
  6: { name: 'Càn', element: 'Kim', group: 'Tây Tứ Mệnh' },
  7: { name: 'Đoài', element: 'Kim', group: 'Tây Tứ Mệnh' },
  8: { name: 'Cấn', element: 'Thổ', group: 'Tây Tứ Mệnh' },
  9: { name: 'Ly', element: 'Hỏa', group: 'Đông Tứ Mệnh' },
};

/**
 * Computes digital root of a positive integer (sum of digits reduced to 1-9).
 */
export function computeDigitRoot(n: number): { root: number; steps: string[] } {
  const steps: string[] = [];
  let current = Math.abs(Math.floor(n));
  steps.push(`Bắt đầu từ số: ${current}`);

  while (current > 9) {
    const digits = current.toString().split('').map(Number);
    const sum = digits.reduce((a, b) => a + b, 0);
    steps.push(`Tổng các chữ số của ${current} = ${digits.join(' + ')} = ${sum}`);
    current = sum;
  }
  return { root: current, steps };
}

/**
 * Calculates Gua (Quái Mệnh) V2 with full auditability, step-by-step trace,
 * and astronomical Lập Xuân boundary handling.
 */
export function calculateGuaV2(
  profile: PersonalProfile,
  policy: CalculationPolicy = profile.calculationPolicy || DEFAULT_CALCULATION_POLICY
): GuaCalculationResult {
  const trace: string[] = [];
  const sources = ['SRC-BAT-TRACH-MINH-KINH', 'SRC-LICH-TIET-KHI-LAP-XUAN'];

  trace.push(`1. Nhận thông tin đầu vào: Ngày sinh = ${profile.birthDate}, Giờ sinh = ${profile.birthTime || 'Không cung cấp'}, Giới tính quy ước = ${profile.genderForTraditionalCalculation}`);

  // 1. Resolve Effective Solar Year via Lập Xuân Calendar
  const lapXuanRes = resolveEffectiveSolarYear(profile.birthDate, profile.birthTime, policy);
  const effectiveYear = lapXuanRes.effectiveSolarYear;
  trace.push(`2. Phân giải ranh giới Lập Xuân: Chính sách = ${lapXuanRes.boundaryPolicy}, Năm dương lịch = ${lapXuanRes.inputYear} -> Năm Bát Trạch hiệu lực = ${effectiveYear}`);
  trace.push(`   Ghi chú Lập Xuân: ${lapXuanRes.notes}`);

  // If uncertain boundary and no estimation allowed -> mark insufficient
  if (!lapXuanRes.isCertain) {
    trace.push(`⚠️ CẢNH BÁO: Ranh giới năm sinh giáp Lập Xuân không chắc chắn (thiếu giờ sinh). Không thể kết luận Quái mệnh.`);
    return {
      guaNumber: 0,
      guaName: 'Chưa xác định',
      element: 'Thổ', // placeholder
      group: 'Đông Tứ Mệnh', // placeholder
      calculationTrace: trace,
      effectiveSolarYear: effectiveYear,
      lapXuanResolution: lapXuanRes,
      dataStatus: 'insufficient',
      isCertain: false,
      uncertaintyReason: lapXuanRes.notes,
      sources,
    };
  }

  // 2. Compute Digital Root of effective year
  const { root, steps: digitSteps } = computeDigitRoot(effectiveYear);
  digitSteps.forEach((s) => trace.push(`   ${s}`));
  trace.push(`3. Số dư rút gọn của năm ${effectiveYear} là: ${root}`);

  // 3. Formula for Male / Female (<2000 vs >=2000)
  const isPre2000 = effectiveYear < 2000;
  const isMale = profile.genderForTraditionalCalculation === 'male';
  let rawGua: number;

  if (isPre2000) {
    if (isMale) {
      rawGua = 11 - root;
      trace.push(`4. Nam sinh trước năm 2000: Công thức = 11 - ${root} = ${rawGua}`);
    } else {
      rawGua = 4 + root;
      trace.push(`4. Nữ sinh trước năm 2000: Công thức = 4 + ${root} = ${rawGua}`);
    }
  } else {
    // Born in 2000 or later
    if (isMale) {
      rawGua = (11 - root) - 1; // 10 - root
      trace.push(`4. Nam sinh từ năm 2000 trở đi: Công thức = (11 - ${root}) - 1 = ${rawGua}`);
    } else {
      rawGua = 4 + root + 1; // 5 + root
      trace.push(`4. Nữ sinh từ năm 2000 trở đi: Công thức = 4 + ${root} + 1 = ${rawGua}`);
    }
  }

  // 4. Modulo 9 reduction to range [1, 9]
  let reducedGua = rawGua;
  while (reducedGua > 9) {
    reducedGua -= 9;
  }
  while (reducedGua < 1) {
    reducedGua += 9;
  }
  if (reducedGua !== rawGua) {
    trace.push(`5. Rút gọn theo chu kỳ cửu cung (1..9): ${rawGua} -> ${reducedGua}`);
  }

  // 5. Special Case Gua 5 (Trung Cung)
  let finalGua = reducedGua;
  if (reducedGua === 5) {
    if (policy.gua5Rule === 'male_2_female_8') {
      finalGua = isMale ? 2 : 8;
      trace.push(`6. Trường hợp đặc biệt Quái 5 (Trung Cung): Nam quy về Khôn (2), Nữ quy về Cấn (8) -> Kết quả: ${finalGua}`);
    } else {
      finalGua = isMale ? 8 : 2;
      trace.push(`6. Trường hợp đặc biệt Quái 5 (Quy ước đảo): Nam quy về Cấn (8), Nữ quy về Khôn (2) -> Kết quả: ${finalGua}`);
    }
  }

  const meta = GUA_V2_METADATA[finalGua];
  if (!meta) {
    throw new Error(`Invalid calculated Gua number: ${finalGua}`);
  }

  trace.push(`7. Kết luận Quái mệnh: Quái số ${finalGua} (${meta.name}), Ngũ hành = ${meta.element}, Cung Mệnh = ${meta.group}`);

  return {
    guaNumber: finalGua,
    guaName: meta.name,
    element: meta.element,
    group: meta.group,
    calculationTrace: trace,
    effectiveSolarYear: effectiveYear,
    lapXuanResolution: lapXuanRes,
    dataStatus: 'sufficient',
    isCertain: true,
    sources,
  };
}

