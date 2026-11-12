// =============================================================================
// src/engine/core/napAmEngine.ts
// Standardized 60 Hoa Giáp Can Chi & Nạp Âm Ngũ Hành Engine (Phase P4)
//
// DESIGN PRINCIPLES:
// - Full cycle of 60 Can Chi combinations (0 to 59).
// - Exact 30 Nạp Âm pairs mapped to their classical 5 elements (Kim, Mộc, Thủy, Hỏa, Thổ).
// - Strictly separated from Quái Mệnh Element (e.g., a person born in 1990 has
//   Nạp Âm = Lộ Bàng Thổ [Thổ], but Male Gua = Khảm [Thủy]).
// - Evaluated using effective solar year from Lập Xuân resolution.
// =============================================================================

import { GuaElement } from '../../types/fengshui.js';

export const THIEN_CAN = [
  'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý',
] as const;

export const DIA_CHI = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
] as const;

export interface HoaGiapEntry {
  index: number; // 0 to 59
  can: typeof THIEN_CAN[number];
  chi: typeof DIA_CHI[number];
  canChi: string;
  napAm: string;
  element: GuaElement;
}

/**
 * Classical 60 Hoa Giáp table with exact Nạp Âm Ngũ Hành mappings.
 * Cycle index 0 = Giáp Tý (e.g. 1924, 1984, 2044).
 */
export const HOA_GIAP_60_TABLE: HoaGiapEntry[] = [
  { index: 0,  can: 'Giáp', chi: 'Tý',   canChi: 'Giáp Tý',   napAm: 'Hải Trung Kim',   element: 'Kim' },
  { index: 1,  can: 'Ất',   chi: 'Sửu',  canChi: 'Ất Sửu',   napAm: 'Hải Trung Kim',   element: 'Kim' },
  { index: 2,  can: 'Bính', chi: 'Dần',  canChi: 'Bính Dần',  napAm: 'Lư Trung Hỏa',    element: 'Hỏa' },
  { index: 3,  can: 'Đinh', chi: 'Mão',  canChi: 'Đinh Mão',  napAm: 'Lư Trung Hỏa',    element: 'Hỏa' },
  { index: 4,  can: 'Mậu',  chi: 'Thìn', canChi: 'Mậu Thìn', napAm: 'Đại Lâm Mộc',     element: 'Mộc' },
  { index: 5,  can: 'Kỷ',   chi: 'Tỵ',   canChi: 'Kỷ Tỵ',   napAm: 'Đại Lâm Mộc',     element: 'Mộc' },
  { index: 6,  can: 'Canh', chi: 'Ngọ',  canChi: 'Canh Ngọ',  napAm: 'Lộ Bàng Thổ',     element: 'Thổ' },
  { index: 7,  can: 'Tân',  chi: 'Mùi',  canChi: 'Tân Mùi',  napAm: 'Lộ Bàng Thổ',     element: 'Thổ' },
  { index: 8,  can: 'Nhâm', chi: 'Thân', canChi: 'Nhâm Thân', napAm: 'Kiếm Phong Kim',  element: 'Kim' },
  { index: 9,  can: 'Quý',  chi: 'Dậu',  canChi: 'Quý Dậu',  napAm: 'Kiếm Phong Kim',  element: 'Kim' },

  { index: 10, can: 'Giáp', chi: 'Tuất', canChi: 'Giáp Tuất', napAm: 'Sơn Đầu Hỏa',     element: 'Hỏa' },
  { index: 11, can: 'Ất',   chi: 'Hợi',  canChi: 'Ất Hợi',   napAm: 'Sơn Đầu Hỏa',     element: 'Hỏa' },
  { index: 12, can: 'Bính', chi: 'Tý',   canChi: 'Bính Tý',   napAm: 'Giản Hạ Thủy',    element: 'Thủy' },
  { index: 13, can: 'Đinh', chi: 'Sửu',  canChi: 'Đinh Sửu',  napAm: 'Giản Hạ Thủy',    element: 'Thủy' },
  { index: 14, can: 'Mậu',  chi: 'Dần',  canChi: 'Mậu Dần',  napAm: 'Thành Đầu Thổ',   element: 'Thổ' },
  { index: 15, can: 'Kỷ',   chi: 'Mão',  canChi: 'Kỷ Mão',   napAm: 'Thành Đầu Thổ',   element: 'Thổ' },
  { index: 16, can: 'Canh', chi: 'Thìn', canChi: 'Canh Thìn', napAm: 'Bạch Lạp Kim',    element: 'Kim' },
  { index: 17, can: 'Tân',  chi: 'Tỵ',   canChi: 'Tân Tỵ',   napAm: 'Bạch Lạp Kim',    element: 'Kim' },
  { index: 18, can: 'Nhâm', chi: 'Ngọ',  canChi: 'Nhâm Ngọ',  napAm: 'Dương Liễu Mộc',  element: 'Mộc' },
  { index: 19, can: 'Quý',  chi: 'Mùi',  canChi: 'Quý Mùi',  napAm: 'Dương Liễu Mộc',  element: 'Mộc' },

  { index: 20, can: 'Giáp', chi: 'Thân', canChi: 'Giáp Thân', napAm: 'Tuyền Trung Thủy', element: 'Thủy' },
  { index: 21, can: 'Ất',   chi: 'Dậu',  canChi: 'Ất Dậu',   napAm: 'Tuyền Trung Thủy', element: 'Thủy' },
  { index: 22, can: 'Bính', chi: 'Tuất', canChi: 'Bính Tuất', napAm: 'Ốc Thượng Thổ',   element: 'Thổ' },
  { index: 23, can: 'Đinh', chi: 'Hợi',  canChi: 'Đinh Hợi',  napAm: 'Ốc Thượng Thổ',   element: 'Thổ' },
  { index: 24, can: 'Mậu',  chi: 'Tý',   canChi: 'Mậu Tý',   napAm: 'Tích Lịch Hỏa',   element: 'Hỏa' },
  { index: 25, can: 'Kỷ',   chi: 'Sửu',  canChi: 'Kỷ Sửu',   napAm: 'Tích Lịch Hỏa',   element: 'Hỏa' },
  { index: 26, can: 'Canh', chi: 'Dần',  canChi: 'Canh Dần',  napAm: 'Tùng Bách Mộc',   element: 'Mộc' },
  { index: 27, can: 'Tân',  chi: 'Mão',  canChi: 'Tân Mão',  napAm: 'Tùng Bách Mộc',   element: 'Mộc' },
  { index: 28, can: 'Nhâm', chi: 'Thìn', canChi: 'Nhâm Thìn', napAm: 'Trường Lưu Thủy', element: 'Thủy' },
  { index: 29, can: 'Quý',  chi: 'Tỵ',   canChi: 'Quý Tỵ',   napAm: 'Trường Lưu Thủy', element: 'Thủy' },

  { index: 30, can: 'Giáp', chi: 'Ngọ',  canChi: 'Giáp Ngọ',  napAm: 'Sa Trung Kim',    element: 'Kim' },
  { index: 31, can: 'Ất',   chi: 'Mùi',  canChi: 'Ất Mùi',   napAm: 'Sa Trung Kim',    element: 'Kim' },
  { index: 32, can: 'Bính', chi: 'Thân', canChi: 'Bính Thân', napAm: 'Sơn Hạ Hỏa',     element: 'Hỏa' },
  { index: 33, can: 'Đinh', chi: 'Dậu',  canChi: 'Đinh Dậu',  napAm: 'Sơn Hạ Hỏa',     element: 'Hỏa' },
  { index: 34, can: 'Mậu',  chi: 'Tuất', canChi: 'Mậu Tuất', napAm: 'Bình Địa Mộc',   element: 'Mộc' },
  { index: 35, can: 'Kỷ',   chi: 'Hợi',  canChi: 'Kỷ Hợi',   napAm: 'Bình Địa Mộc',   element: 'Mộc' },
  { index: 36, can: 'Canh', chi: 'Tý',   canChi: 'Canh Tý',   napAm: 'Bích Thượng Thổ', element: 'Thổ' },
  { index: 37, can: 'Tân',  chi: 'Sửu',  canChi: 'Tân Sửu',  napAm: 'Bích Thượng Thổ', element: 'Thổ' },
  { index: 38, can: 'Nhâm', chi: 'Dần',  canChi: 'Nhâm Dần',  napAm: 'Kim Bạch Kim',    element: 'Kim' },
  { index: 39, can: 'Quý',  chi: 'Mão',  canChi: 'Quý Mão',  napAm: 'Kim Bạch Kim',    element: 'Kim' },

  { index: 40, can: 'Giáp', chi: 'Thìn', canChi: 'Giáp Thìn', napAm: 'Phúc Đăng Hỏa',   element: 'Hỏa' },
  { index: 41, can: 'Ất',   chi: 'Tỵ',   canChi: 'Ất Tỵ',   napAm: 'Phúc Đăng Hỏa',   element: 'Hỏa' },
  { index: 42, can: 'Bính', chi: 'Ngọ',  canChi: 'Bính Ngọ',  napAm: 'Thiên Hà Thủy',   element: 'Thủy' },
  { index: 43, can: 'Đinh', chi: 'Mùi',  canChi: 'Đinh Mùi',  napAm: 'Thiên Hà Thủy',   element: 'Thủy' },
  { index: 44, can: 'Mậu',  chi: 'Thân', canChi: 'Mậu Thân', napAm: 'Đại Trạch Thổ',   element: 'Thổ' },
  { index: 45, can: 'Kỷ',   chi: 'Dậu',  canChi: 'Kỷ Dậu',   napAm: 'Đại Trạch Thổ',   element: 'Thổ' },
  { index: 46, can: 'Canh', chi: 'Tuất', canChi: 'Canh Tuất', napAm: 'Thoa Xuyến Kim',  element: 'Kim' },
  { index: 47, can: 'Tân',  chi: 'Hợi',  canChi: 'Tân Hợi',  napAm: 'Thoa Xuyến Kim',  element: 'Kim' },
  { index: 48, can: 'Nhâm', chi: 'Tý',   canChi: 'Nhâm Tý',   napAm: 'Tang Đố Mộc',     element: 'Mộc' },
  { index: 49, can: 'Quý',  chi: 'Sửu',  canChi: 'Quý Sửu',  napAm: 'Tang Đố Mộc',     element: 'Mộc' },

  { index: 50, can: 'Giáp', chi: 'Dần',  canChi: 'Giáp Dần',  napAm: 'Đại Khê Thủy',    element: 'Thủy' },
  { index: 51, can: 'Ất',   chi: 'Mão',  canChi: 'Ất Mão',   napAm: 'Đại Khê Thủy',    element: 'Thủy' },
  { index: 52, can: 'Bính', chi: 'Thìn', canChi: 'Bính Thìn', napAm: 'Sa Trung Thổ',    element: 'Thổ' },
  { index: 53, can: 'Đinh', chi: 'Tỵ',   canChi: 'Đinh Tỵ',   napAm: 'Sa Trung Thổ',    element: 'Thổ' },
  { index: 54, can: 'Mậu',  chi: 'Ngọ',  canChi: 'Mậu Ngọ',  napAm: 'Thiên Thượng Hỏa', element: 'Hỏa' },
  { index: 55, can: 'Kỷ',   chi: 'Mùi',  canChi: 'Kỷ Mùi',   napAm: 'Thiên Thượng Hỏa', element: 'Hỏa' },
  { index: 56, can: 'Canh', chi: 'Thân', canChi: 'Canh Thân', napAm: 'Thạch Lựu Mộc',   element: 'Mộc' },
  { index: 57, can: 'Tân',  chi: 'Dậu',  canChi: 'Tân Dậu',  napAm: 'Thạch Lựu Mộc',   element: 'Mộc' },
  { index: 58, can: 'Nhâm', chi: 'Tuất', canChi: 'Nhâm Tuất', napAm: 'Đại Hải Thủy',    element: 'Thủy' },
  { index: 59, can: 'Quý',  chi: 'Hợi',  canChi: 'Quý Hợi',  napAm: 'Đại Hải Thủy',    element: 'Thủy' },
];

export interface NapAmCalculationResult {
  effectiveYear: number;
  can: typeof THIEN_CAN[number];
  chi: typeof DIA_CHI[number];
  canChi: string;
  napAm: string;
  napAmElement: GuaElement;
  cycleIndex: number;
  sourceRef: string;
}

/**
 * Calculates Can Chi and Nạp Âm for a given solar year.
 * Reference anchor: Year 4 AD = Giáp Tý (index 0).
 */
export function getNapAmByYear(effectiveYear: number): NapAmCalculationResult {
  // Index in 60 Hoa Giáp cycle
  const offset = effectiveYear - 4;
  const cycleIndex = ((offset % 60) + 60) % 60;

  const entry = HOA_GIAP_60_TABLE[cycleIndex];
  if (!entry) {
    throw new Error(`Invalid Hoa Giap cycle index: ${cycleIndex}`);
  }

  return {
    effectiveYear,
    can: entry.can,
    chi: entry.chi,
    canChi: entry.canChi,
    napAm: entry.napAm,
    napAmElement: entry.element,
    cycleIndex,
    sourceRef: 'SRC-60-HOA-GIAP-NAP-AM',
  };
}

