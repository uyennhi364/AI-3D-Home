// =============================================================================
// src/engine/core/batTrachEngine.ts
// Standardized 64-Sector Bát Trạch Direction Engine (Phase P4)
//
// MAPPING MATRIX (8 Quái x 8 Phương Vị = 64 combinations):
// - Đông Tứ Mệnh (Khảm 1, Chấn 3, Tốn 4, Ly 9):
//   Cát: Bắc, Đông, Đông Nam, Nam | Hung: Tây Bắc, Tây, Tây Nam, Đông Bắc
// - Tây Tứ Mệnh (Khôn 2, Càn 6, Đoài 7, Cấn 8):
//   Cát: Tây Bắc, Tây, Tây Nam, Đông Bắc | Hung: Bắc, Đông, Đông Nam, Nam
//
// DISAMBIGUATION:
// - Direction category ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')
// - Local bearing vs True bearing (calculated via northBearingDeg from P1 roomFrame)
// =============================================================================

import { CompassDirection, SectorType, GuaElement, GuaGroup } from '../../types/fengshui.js';
import { GUA_V2_METADATA } from './guaEngine.js';
import { toTrueBearing, directionFromBearing } from './compass.js';

export interface BatTrachSectorDetail {
  direction: CompassDirection;
  directionNameVi: string;
  nominalBearingDeg: number;
  trueBearingDeg: number | null;
  sectorType: SectorType;
  sectorNameVi: string;
  isAuspicious: boolean;
  meaning: string;
  sourceRef: string;
}

export interface BatTrachGuaProfile {
  guaNumber: number;
  guaName: string;
  element: GuaElement;
  group: GuaGroup;
  auspiciousDirections: CompassDirection[];
  inauspiciousDirections: CompassDirection[];
  sectors: Record<CompassDirection, BatTrachSectorDetail>;
  sources: string[];
}

export const DIRECTION_NAMES_MAP: Record<CompassDirection, string> = {
  N: 'Bắc',
  NE: 'Đông Bắc',
  E: 'Đông',
  SE: 'Đông Nam',
  S: 'Nam',
  SW: 'Tây Nam',
  W: 'Tây',
  NW: 'Tây Bắc',
};

export const DIRECTION_NOMINAL_BEARING: Record<CompassDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

export const SECTOR_TYPE_NAMES: Record<SectorType, string> = {
  SINH_KHI: 'Sinh Khí',
  THIEN_Y: 'Thiên Y',
  DIEN_NIEN: 'Diên Niên',
  PHUC_VI: 'Phục Vị',
  TUYET_MENH: 'Tuyệt Mệnh',
  NGU_QUY: 'Ngũ Quỷ',
  LUC_SAT: 'Lục Sát',
  HOA_HAI: 'Họa Hại',
};

export const SECTOR_TYPE_MEANINGS: Record<SectorType, string> = {
  SINH_KHI: 'Đại cát: Thu hút tài lộc, danh tiếng, thăng quan tiến chức, năng lượng sống dồi dào.',
  THIEN_Y: 'Cát lợi: Nâng cao sức khỏe, trường thọ, gặp quý nhân phù trợ, giấc ngủ sâu.',
  DIEN_NIEN: 'Hòa thuận: Củng cố các mối quan hệ tình cảm, gia đình êm ấm, tinh thần an định.',
  PHUC_VI: 'Bình an: Vững vàng tâm trí, tăng cường học vấn, kiên định bản lĩnh cá nhân.',
  TUYET_MENH: 'Đại hung: Hao tán tài lộc, suy kiệt sức khỏe, tinh thần bất an trằn trọc.',
  NGU_QUY: 'Hung hiểm: Dễ gặp tranh cãi, hỏa hoạn, thị phi, mất mát nguồn thu.',
  LUC_SAT: 'Xáo trộn khí trường: Quan hệ trắc trở, dễ mắc bệnh tật và thị phi.',
  HOA_HAI: 'Kém may mắn: Việc làm ăn dễ gặp trục trặc, mâu thuẫn vụn vặt thường xuyên.',
};

/**
 * Verified Classical Bát Trạch Matrix for all 8 Gua (64 combinations).
 * Excludes 5 because Gua 5 is resolved to 2 for male, 8 for female prior to lookup.
 */
export const BAT_TRACH_64_MATRIX: Record<number, Record<CompassDirection, SectorType>> = {
  // 1: Khảm (Thủy - Đông Tứ Mệnh)
  1: {
    SE: 'SINH_KHI',
    E: 'THIEN_Y',
    S: 'DIEN_NIEN',
    N: 'PHUC_VI',
    SW: 'TUYET_MENH',
    NE: 'NGU_QUY',
    NW: 'LUC_SAT',
    W: 'HOA_HAI',
  },
  // 2: Khôn (Thổ - Tây Tứ Mệnh)
  2: {
    NE: 'SINH_KHI',
    W: 'THIEN_Y',
    NW: 'DIEN_NIEN',
    SW: 'PHUC_VI',
    N: 'TUYET_MENH',
    SE: 'NGU_QUY',
    S: 'LUC_SAT',
    E: 'HOA_HAI',
  },
  // 3: Chấn (Mộc - Đông Tứ Mệnh)
  3: {
    S: 'SINH_KHI',
    N: 'THIEN_Y',
    SE: 'DIEN_NIEN',
    E: 'PHUC_VI',
    W: 'TUYET_MENH',
    NW: 'NGU_QUY',
    NE: 'LUC_SAT',
    SW: 'HOA_HAI',
  },
  // 4: Tốn (Mộc - Đông Tứ Mệnh)
  4: {
    N: 'SINH_KHI',
    S: 'THIEN_Y',
    E: 'DIEN_NIEN',
    SE: 'PHUC_VI',
    NE: 'TUYET_MENH',
    SW: 'NGU_QUY',
    W: 'LUC_SAT',
    NW: 'HOA_HAI',
  },
  // 6: Càn (Kim - Tây Tứ Mệnh)
  6: {
    W: 'SINH_KHI',
    NE: 'THIEN_Y',
    SW: 'DIEN_NIEN',
    NW: 'PHUC_VI',
    S: 'TUYET_MENH',
    E: 'NGU_QUY',
    N: 'LUC_SAT',
    SE: 'HOA_HAI',
  },
  // 7: Đoài (Kim - Tây Tứ Mệnh)
  7: {
    NW: 'SINH_KHI',
    SW: 'THIEN_Y',
    NE: 'DIEN_NIEN',
    W: 'PHUC_VI',
    E: 'TUYET_MENH',
    S: 'NGU_QUY',
    SE: 'LUC_SAT',
    N: 'HOA_HAI',
  },
  // 8: Cấn (Thổ - Tây Tứ Mệnh)
  8: {
    SW: 'SINH_KHI',
    NW: 'THIEN_Y',
    W: 'DIEN_NIEN',
    NE: 'PHUC_VI',
    SE: 'TUYET_MENH',
    N: 'NGU_QUY',
    E: 'LUC_SAT',
    S: 'HOA_HAI',
  },
  // 9: Ly (Hỏa - Đông Tứ Mệnh)
  9: {
    E: 'SINH_KHI',
    SE: 'THIEN_Y',
    N: 'DIEN_NIEN',
    S: 'PHUC_VI',
    NW: 'TUYET_MENH',
    W: 'NGU_QUY',
    SW: 'LUC_SAT',
    NE: 'HOA_HAI',
  },
};

export const ALL_COMPASS_DIRECTIONS: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Builds the complete Bát Trạch direction profile for a given Gua number.
 * Can resolve true bearings if northBearingDeg is provided.
 */
export function getBatTrachGuaProfile(
  guaNumber: number,
  northBearingDeg: number | null = null
): BatTrachGuaProfile {
  const meta = GUA_V2_METADATA[guaNumber];
  if (!meta) {
    throw new Error(`Invalid Gua number: ${guaNumber}. Expected one of 1, 2, 3, 4, 6, 7, 8, 9.`);
  }

  const sectorMap = BAT_TRACH_64_MATRIX[guaNumber];
  if (!sectorMap) {
    throw new Error(`Missing 64-matrix row for Gua ${guaNumber}.`);
  }

  const auspiciousDirections: CompassDirection[] = [];
  const inauspiciousDirections: CompassDirection[] = [];
  const sectors: Record<CompassDirection, BatTrachSectorDetail> = {} as any;

  for (const dir of ALL_COMPASS_DIRECTIONS) {
    const sType = sectorMap[dir];
    const isAuspicious = ['SINH_KHI', 'THIEN_Y', 'DIEN_NIEN', 'PHUC_VI'].includes(sType);

    if (isAuspicious) {
      auspiciousDirections.push(dir);
    } else {
      inauspiciousDirections.push(dir);
    }

    const nominalBearing = DIRECTION_NOMINAL_BEARING[dir];
    const trueBearing = toTrueBearing(nominalBearing, northBearingDeg);

    sectors[dir] = {
      direction: dir,
      directionNameVi: DIRECTION_NAMES_MAP[dir],
      nominalBearingDeg: nominalBearing,
      trueBearingDeg: trueBearing,
      sectorType: sType,
      sectorNameVi: SECTOR_TYPE_NAMES[sType],
      isAuspicious,
      meaning: SECTOR_TYPE_MEANINGS[sType],
      sourceRef: 'SRC-BAT-TRACH-MINH-KINH',
    };
  }

  return {
    guaNumber,
    guaName: meta.name,
    element: meta.element,
    group: meta.group,
    auspiciousDirections,
    inauspiciousDirections,
    sectors,
    sources: ['SRC-BAT-TRACH-MINH-KINH', 'SRC-BAT-TRACH-TAM-YEU'],
  };
}

