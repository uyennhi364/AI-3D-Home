// =============================================================================
// src/engine/core/nguHanh/elementMapping.ts
// Phase P8-M1 — Five Elements (Ngũ Hành) Attribute Mapping Engine
//
// DESIGN PRINCIPLES:
// - Maps physical & spatial attributes to Five Elements (Kim, Mộc, Thủy, Hỏa, Thổ).
// - PURE CLASSIFICATION ONLY:
//   * No good/bad evaluation.
//   * No generation/overcoming (tương sinh/tương khắc).
//   * No Harmony Score.
//   * Zero mutation of P0–P7.5 engines or overallScore P5.
// - Strictly enforces 4 data statuses: 'known' | 'ambiguous' | 'insufficient' | 'unsupported'.
// - Only 'known' status returns a non-null element.
// =============================================================================

import { CompassDirection } from '../../../types/fengshui.js';
import {
  NguHanhElement,
  ElementDataStatus,
  ElementCertainty,
  ElementAnalysisResult,
} from './elementTypes.js';

// =============================================================================
// 1. COLOR ELEMENT MAPPING
// =============================================================================

/**
 * Normalizes any hex color representation:
 * - Trims whitespace
 * - Handles 3-char hex (#rgb -> #rrggbb) and 6-char hex (#rrggbb)
 * - Lowercases for consistent matching
 * - Returns null if invalid hex format
 */
export function normalizeHexColor(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const clean = input.trim();
  if (!clean) return null;

  // Add leading # if missing from 3 or 6 hex digits
  let hex = clean.startsWith('#') ? clean : `#${clean}`;

  // 3-digit hex: #RGB -> #RRGGBB
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  // 6-digit hex validation
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }

  return null;
}

interface ColorMappingRule {
  element: NguHanhElement | null;
  dataStatus: ElementDataStatus;
  certainty: ElementCertainty | null;
  sourceId: string;
  sourceRef: string[];
  explanation: string;
  disclaimer?: string;
}

// Canonical exact hex matches
const CANONICAL_COLOR_HEX_MAP: Record<string, ColorMappingRule> = {
  // --- MỘC (Wood) ---
  '#228b22': {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu xanh lục (Forest Green) thuộc hành Mộc theo Ngũ Hành Đại Nghĩa (sắc Thanh).',
  },
  '#00ff00': {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu xanh lục tươi (Lime) thuộc hành Mộc theo Ngũ Hành Đại Nghĩa.',
  },
  '#008000': {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu xanh lá cây thuần (Green) thuộc hành Mộc theo Ngũ Hành Đại Nghĩa.',
  },
  '#2e8b57': {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu xanh lục biển (Sea Green) thuộc phổ hành Mộc.',
  },

  // --- HỎA (Fire) ---
  '#ff0000': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu đỏ tươi (Red) thuộc hành Hỏa theo Ngũ Hành Đại Nghĩa (sắc Xích).',
  },
  '#b22222': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu đỏ thẫm / đỏ gạch (Firebrick) thuộc phổ hành Hỏa cổ điển.',
  },
  '#cc0000': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu đỏ cờ đậm thuộc hành Hỏa theo Ngũ Hành Đại Nghĩa.',
  },
  '#ffa500': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu cam (Orange) thuộc hành Hỏa theo quy ước nội thất ứng dụng hiện đại.',
  },
  '#ffb6c1': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu hồng phấn (Light Pink) thuộc phổ Hỏa theo quy ước ứng dụng hiện đại.',
  },
  '#ffc0cb': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu hồng (Pink) thuộc phổ Hỏa theo quy ước nội thất hiện đại.',
  },
  '#800080': {
    element: 'Hỏa',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu tím (Purple) quy về hành Hỏa (sắc đỏ chiếm ưu thế trong hỗn hợp).',
  },

  // --- THỔ (Earth) ---
  '#ffd700': {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu vàng hoàng thổ (Gold/Yellow) thuộc hành Thổ theo Ngũ Hành Đại Nghĩa (sắc Hoàng).',
  },
  '#ffff00': {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu vàng chanh thuần (Yellow) thuộc hành Thổ theo Ngũ Hành Đại Nghĩa.',
  },
  '#e6c280': {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu vàng cát / thổ hoàng nhạt thuộc hành Thổ theo quy ước nội thất.',
  },

  // --- KIM (Metal) ---
  '#ffffff': {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu trắng tinh (White) thuộc hành Kim theo Ngũ Hành Đại Nghĩa (sắc Bạch).',
  },
  '#c0c0c0': {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu bạc sáng (Silver) phản chiếu kim loại, thuộc hành Kim cổ điển.',
  },
  '#faebd7': {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu trắng sữa / kem (Antique White) thuộc hành Kim theo quy ước mở rộng.',
  },
  '#fff8dc': {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu kem bơ nhạt (Cornsilk) thuộc hành Kim mở rộng.',
  },

  // --- THỦY (Water) ---
  '#000000': {
    element: 'Thủy',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Màu đen tuyền (Black) thuộc hành Thủy theo Ngũ Hành Đại Nghĩa (sắc Hắc).',
  },
  '#00008b': {
    element: 'Thủy',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu xanh navy đậm (Dark Blue) thuộc phổ Thủy theo quy ước ứng dụng.',
  },
  '#000080': {
    element: 'Thủy',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu xanh navy (Navy) thuộc hành Thủy theo quy ước ứng dụng.',
  },
  '#1e90ff': {
    element: 'Thủy',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu xanh lam nhạt (Dodger Blue) tượng trưng dòng nước, thuộc hành Thủy.',
  },
  '#87ceeb': {
    element: 'Thủy',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Màu xanh da trời (Sky Blue) thuộc phổ Thủy theo quy ước ứng dụng.',
  },

  // --- AMBIGUOUS COLORS (Strictly no forced classification) ---
  '#808080': {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Màu xám trung tính (#808080) nằm ở ranh giới giữa Kim (trắng) và Thổ (đất tro), không thể phân loại dứt khoát.',
  },
  '#8b4513': {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Màu nâu gỗ (#8B4513) có mâu thuẫn: sắc tố nâu thuộc Thổ nhưng nguồn gốc vật liệu gỗ thuộc Mộc, không ép phân loại.',
  },
  '#9acd32': {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Màu vàng chanh ngả lục (#9ACD32) nằm ở ranh giới giữa Mộc (lục) và Thổ (hoàng), không thể phân loại dứt khoát.',
  },
  '#a52a2a': {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Màu nâu đỏ (#A52A2A) nằm ở ranh giới Thổ và Hỏa, không ép phân loại.',
  },
};

// Recognized basic color name aliases
const COLOR_NAME_ALIASES: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#1e90ff',
  yellow: '#ffff00',
  gold: '#ffd700',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  brown: '#8b4513',
  orange: '#ffa500',
  pink: '#ffc0cb',
  purple: '#800080',
  navy: '#000080',
};

/**
 * Classifies a color attribute into a Five Elements result.
 */
export function classifyColorElement(color: unknown): ElementAnalysisResult {
  // 1. Missing / null / empty
  if (color === null || color === undefined || (typeof color === 'string' && color.trim() === '')) {
    return {
      element: null,
      dataStatus: 'insufficient',
      certainty: null,
      sourceRef: [],
      explanation: 'Không có dữ liệu màu sắc được cung cấp.',
      rawInput: color,
      input: color,
    };
  }

  // 2. Type validation
  if (typeof color !== 'string') {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: 'Dữ liệu màu sắc không phải định dạng chuỗi hợp lệ.',
      rawInput: color,
      input: color,
    };
  }

  const rawStr = color.trim().toLowerCase();

  // 3. Resolve hex code (either directly or via known color name alias)
  let hex = normalizeHexColor(rawStr);
  if (!hex && COLOR_NAME_ALIASES[rawStr]) {
    hex = COLOR_NAME_ALIASES[rawStr];
  }

  // 4. Invalid hex format
  if (!hex) {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: `Mã màu "${color}" không phải là định dạng HEX 3/6 ký tự hoặc tên màu hợp lệ.`,
      rawInput: color,
      input: color,
      normalizedValue: rawStr,
    };
  }

  // 5. Exact match in canonical catalog
  const match = CANONICAL_COLOR_HEX_MAP[hex];
  if (match) {
    return {
      element: match.element,
      dataStatus: match.dataStatus,
      certainty: match.certainty,
      sourceRef: match.sourceRef,
      sourceId: match.sourceId,
      explanation: match.explanation,
      disclaimer: match.disclaimer,
      rawInput: color,
      input: color,
      normalizedValue: hex,
    };
  }

  // 6. Generic RGB component analysis for non-catalog hex codes
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Gray tolerance check (ambiguous)
  if (Math.abs(r - g) <= 20 && Math.abs(g - b) <= 20 && Math.abs(r - b) <= 20) {
    if (r > 230 && g > 230 && b > 230) {
      return {
        element: 'Kim',
        dataStatus: 'known',
        certainty: 'applied',
        sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
        sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
        explanation: `Mã màu ${hex} thuộc phổ trắng sáng (Kim).`,
        rawInput: color,
        input: color,
        normalizedValue: hex,
      };
    }
    if (r < 25 && g < 25 && b < 25) {
      return {
        element: 'Thủy',
        dataStatus: 'known',
        certainty: 'classical',
        sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
        sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
        explanation: `Mã màu ${hex} thuộc phổ đen tối (Thủy).`,
        rawInput: color,
        input: color,
        normalizedValue: hex,
      };
    }
    return {
      element: null,
      dataStatus: 'ambiguous',
      certainty: null,
      sourceRef: [],
      explanation: `Mã màu ${hex} là màu xám trung tính, nằm giữa Kim và Thổ, không thể phân loại dứt khoát.`,
      rawInput: color,
      input: color,
      normalizedValue: hex,
    };
  }

  // Default fallback for unmapped hex ranges: unsupported
  return {
    element: null,
    dataStatus: 'unsupported',
    certainty: null,
    sourceRef: [],
    explanation: `Mã màu ${hex} nằm ngoài các phổ màu Ngũ Hành đã được định nghĩa.`,
    rawInput: color,
    input: color,
    normalizedValue: hex,
  };
}

// =============================================================================
// 2. MATERIAL ELEMENT MAPPING
// =============================================================================

interface MaterialMappingRule {
  element: NguHanhElement | null;
  dataStatus: ElementDataStatus;
  certainty: ElementCertainty | null;
  sourceId: string;
  sourceRef: string[];
  explanation: string;
}

const MATERIAL_CATALOG: Record<string, MaterialMappingRule> = {
  // --- MỘC (Natural & Engineered Wood, Plant Fibers) ---
  wood: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ tự nhiên (Wood) thuộc hành Mộc theo Ngũ Hành cổ điển.',
  },
  natural_wood: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ tự nhiên thuộc hành Mộc cổ điển.',
  },
  oak: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ sồi (Oak) là gỗ tự nhiên, thuộc hành Mộc cổ điển.',
  },
  walnut: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ óc chó (Walnut) là gỗ tự nhiên, thuộc hành Mộc cổ điển.',
  },
  pine: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ thông (Pine) là gỗ tự nhiên, thuộc hành Mộc cổ điển.',
  },
  teak: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gỗ giá tỵ (Teak) thuộc hành Mộc cổ điển.',
  },
  bamboo: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Tre nứa tự nhiên (Bamboo) thuộc hành Mộc theo quy ước ứng dụng.',
  },
  rattan: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Mây tre đan (Rattan) là sợi thực vật, thuộc hành Mộc ứng dụng.',
  },
  cork: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Vỏ bần (Cork) là vật liệu thực vật, thuộc hành Mộc.',
  },
  cotton: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Vải sợi bông tự nhiên (Cotton) thuộc hành Mộc.',
  },
  linen: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Vải lanh tự nhiên (Linen) thuộc hành Mộc.',
  },
  fabric: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Vải dệt tự nhiên (Fabric) quy về hành Mộc.',
  },
  mdf: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Gỗ ép công nghiệp MDF có gốc sợi gỗ, thuộc hành Mộc ứng dụng.',
  },
  plywood: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Gỗ ván ép (Plywood) có gốc gỗ, thuộc hành Mộc ứng dụng.',
  },
  chipboard: {
    element: 'Mộc',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Ván dăm gỗ (Chipboard) thuộc hành Mộc ứng dụng.',
  },

  // --- KIM (Metals & Alloys) ---
  metal: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Kim loại (Metal) thuộc hành Kim theo Ngũ Hành cổ điển.',
  },
  iron: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Sắt (Iron) là kim loại thô, thuộc hành Kim cổ điển.',
  },
  steel: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Thép (Steel) là hợp kim kim loại, thuộc hành Kim cổ điển.',
  },
  aluminum: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Hợp kim nhôm (Aluminum) thuộc hành Kim theo quy ước ứng dụng.',
  },
  stainless_steel: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Thép không gỉ (Inox) thuộc hành Kim theo quy ước ứng dụng.',
  },
  gold: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Vàng (Gold) là kim loại quý, thuộc hành Kim cổ điển.',
  },
  silver: {
    element: 'Kim',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Bạc (Silver) là kim loại quý, thuộc hành Kim cổ điển.',
  },

  // --- THỔ (Ceramics, Stones, Minerals) ---
  ceramic: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Gốm sứ đất nung (Ceramic) thuộc hành Thổ theo Ngũ Hành cổ điển.',
  },
  porcelain: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Sứ cao cấp (Porcelain) có nguồn gốc đất sét nung, thuộc hành Thổ cổ điển.',
  },
  clay: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'classical',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Đất sét (Clay) là bản thể của hành Thổ.',
  },
  marble: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Đá cẩm thạch (Marble) là khoáng chất tự nhiên, thuộc hành Thổ.',
  },
  granite: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Đá hoa cương (Granite) thuộc hành Thổ theo quy ước ứng dụng.',
  },
  stone: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Đá tự nhiên (Stone) thuộc hành Thổ theo quy ước ứng dụng.',
  },
  concrete: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Bê tông / xi măng (Concrete) là hỗn hợp khoáng sản, thuộc hành Thổ.',
  },
  cement: {
    element: 'Thổ',
    dataStatus: 'known',
    certainty: 'applied',
    sourceId: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    sourceRef: ['SRC-PHONG-THUY-NOI-THAT-HIEN-DAI'],
    explanation: 'Xi măng (Cement) thuộc hành Thổ theo quy ước ứng dụng.',
  },

  // --- AMBIGUOUS MATERIALS (Synthetic, Composites, Glass, Leather) ---
  plastic: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Vật liệu nhựa tổng hợp (Plastic/PVC) là sản phẩm hóa dầu, không có trong cổ thư và không thể phân loại dứt khoát vào một hành.',
  },
  acrylic: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Nhựa mica/acrylic là vật liệu tổng hợp, thuộc trạng thái mơ hồ (ambiguous).',
  },
  pvc: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Nhựa PVC nhân tạo không đủ cơ sở phân loại dứt khoát vào một hành đơn lẻ.',
  },
  glass: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Thủy tinh/kính (Glass) có tính trong suốt liên hệ Thủy, nhưng độ cứng quang học liên hệ Kim. Hệ thống không ép phân loại.',
  },
  mirror_glass: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Gương phản chiếu mang đặc tính phản xạ (Kim) và mặt kính (Thủy), thuộc trạng thái mơ hồ (ambiguous).',
  },
  leather: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Da thuộc (Leather) có nguồn gốc động vật (tranh cãi Thổ vs Mộc), không phân loại dứt khoát.',
  },
  faux_leather: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Da nhân tạo PU/Simili là vật liệu tổng hợp, thuộc trạng thái mơ hồ.',
  },
  wood_and_metal_alloy: {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceId: '',
    sourceRef: [],
    explanation: 'Vật liệu hỗn hợp phức hợp gỗ và kim loại mang đa hành tương khắc nội tại, thuộc trạng thái mơ hồ.',
  },
};

/**
 * Classifies a material string attribute into a Five Elements result.
 */
export function classifyMaterialElement(material: unknown): ElementAnalysisResult {
  // 1. Missing / null / empty
  if (material === null || material === undefined || (typeof material === 'string' && material.trim() === '')) {
    return {
      element: null,
      dataStatus: 'insufficient',
      certainty: null,
      sourceRef: [],
      explanation: 'Không có dữ liệu vật liệu được cung cấp.',
      rawInput: material,
      input: material,
    };
  }

  // 2. Type validation
  if (typeof material !== 'string') {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: 'Dữ liệu vật liệu không phải định dạng chuỗi hợp lệ.',
      rawInput: material,
      input: material,
    };
  }

  // 3. Normalization: lowercase, trim, replace spaces/hyphens with underscore
  const normalized = material.trim().toLowerCase().replace(/[\s-]+/g, '_');

  // 4. Look up in material catalog
  const match = MATERIAL_CATALOG[normalized];
  if (match) {
    return {
      element: match.element,
      dataStatus: match.dataStatus,
      certainty: match.certainty,
      sourceRef: match.sourceRef,
      sourceId: match.sourceId,
      explanation: match.explanation,
      rawInput: material,
      input: material,
      normalizedValue: normalized,
    };
  }

  // 5. Detection for composite strings with '+' or 'and'
  if (normalized.includes('+') || normalized.includes('_and_') || normalized.includes('_voi_')) {
    return {
      element: null,
      dataStatus: 'ambiguous',
      certainty: null,
      sourceRef: [],
      explanation: `Vật liệu phức hợp "${material}" chứa nhiều thành phần phối hợp, không thể ép về một hành duy nhất.`,
      rawInput: material,
      input: material,
      normalizedValue: normalized,
    };
  }

  // 6. Unknown / unsupported material
  return {
    element: null,
    dataStatus: 'unsupported',
    certainty: null,
    sourceRef: [],
    explanation: `Vật liệu "${material}" chưa có trong danh mục phân loại Ngũ Hành của hệ thống.`,
    rawInput: material,
    input: material,
    normalizedValue: normalized,
  };
}

// =============================================================================
// 3. SHAPE ELEMENT MAPPING (HEURISTIC OBB RATIOS)
// =============================================================================

export interface BoundingBoxDimensions {
  width: number;
  height: number;
  length: number;
}

const SHAPE_HEURISTIC_DISCLAIMER =
  'Phân loại hình dạng Ngũ Hành dựa trên tỉ lệ kích thước OBB là quy ước xấp xỉ heuristic, không phải nguyên lý cổ thư định lượng.';

/**
 * Classifies furniture 3D bounding box dimensions into a Five Elements result.
 *
 * Thresholds per P8 V1.1:
 * - h / max(w, l) > 2.0 -> Mộc (Trụ cao)
 * - h / max(w, l) < 0.3 -> Thổ (Dát phẳng / dẹt)
 * - abs(w - l) / max(w, l) < 0.1 && 0.3 <= h/max <= 2.0 -> Kim (Khối vuông cân)
 * - Intermediate ratios -> 'ambiguous' (never forced)
 */
export function classifyShapeElement(dimensions: unknown): ElementAnalysisResult {
  // 1. Missing / null / empty
  if (dimensions === null || dimensions === undefined || typeof dimensions !== 'object') {
    return {
      element: null,
      dataStatus: 'insufficient',
      certainty: null,
      sourceRef: [],
      explanation: 'Không có dữ liệu kích thước hình học 3D (dimensions).',
      rawInput: dimensions,
      input: dimensions,
    };
  }

  const dims = dimensions as Partial<BoundingBoxDimensions>;

  // 2. Numerical validation
  if (
    typeof dims.width !== 'number' ||
    typeof dims.height !== 'number' ||
    typeof dims.length !== 'number' ||
    !Number.isFinite(dims.width) ||
    !Number.isFinite(dims.height) ||
    !Number.isFinite(dims.length) ||
    dims.width <= 0 ||
    dims.height <= 0 ||
    dims.length <= 0
  ) {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: 'Kích thước hình học không hợp lệ (phải là số thực dương > 0).',
      rawInput: dimensions,
      input: dimensions,
    };
  }

  const { width: w, height: h, length: l } = dims as BoundingBoxDimensions;
  const maxBase = Math.max(w, l);
  const heightRatio = h / maxBase;
  const squareDiffRatio = Math.abs(w - l) / maxBase;

  // 3. Heuristic Rules
  // A. MỘC: Trụ cao vươn lên (h / max(w,l) > 2.0)
  if (heightRatio > 2.0) {
    return {
      element: 'Mộc',
      dataStatus: 'known',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sourceRef: ['SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      explanation: `Tỉ lệ chiều cao so với đáy đạt ${heightRatio.toFixed(2)} (> 2.0), mang hình thế trụ cao vươn lên đặc trưng của hành Mộc.`,
      disclaimer: SHAPE_HEURISTIC_DISCLAIMER,
      rawInput: dimensions,
      input: dimensions,
      normalizedValue: `tall_cylinder_ratio_${heightRatio.toFixed(2)}`,
    };
  }

  // B. THỔ: Dát phẳng bằng rộng (h / max(w,l) < 0.3)
  if (heightRatio < 0.3) {
    return {
      element: 'Thổ',
      dataStatus: 'known',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sourceRef: ['SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      explanation: `Tỉ lệ chiều cao so với đáy đạt ${heightRatio.toFixed(2)} (< 0.3), mang hình thế dẹt bằng phẳng đặc trưng của hành Thổ.`,
      disclaimer: SHAPE_HEURISTIC_DISCLAIMER,
      rawInput: dimensions,
      input: dimensions,
      normalizedValue: `flat_slab_ratio_${heightRatio.toFixed(2)}`,
    };
  }

  // C. KIM: Khối vuông cân đối (abs(w - l) / max < 0.1 và chiều cao trung bình)
  if (squareDiffRatio < 0.1 && heightRatio >= 0.3 && heightRatio <= 2.0) {
    return {
      element: 'Kim',
      dataStatus: 'known',
      certainty: 'heuristic',
      sourceId: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
      sourceRef: ['SRC-HEURISTIC-SHAPE-DIMENSIONS'],
      explanation: `Đáy vuông cân đối (chênh lệch ${(squareDiffRatio * 100).toFixed(1)}% < 10%) và chiều cao đều đặn, mang hình khối quy chuẩn của hành Kim.`,
      disclaimer: SHAPE_HEURISTIC_DISCLAIMER,
      rawInput: dimensions,
      input: dimensions,
      normalizedValue: `cubic_box_diff_${squareDiffRatio.toFixed(2)}`,
    };
  }

  // D. AMBIGUOUS: Intermediate ratios (e.g. Standard bed 1.6 x 0.9 x 2.0 or desk)
  return {
    element: null,
    dataStatus: 'ambiguous',
    certainty: null,
    sourceRef: [],
    explanation: `Kích thước ${w}m × ${h}m × ${l}m có tỉ lệ chiều cao ${heightRatio.toFixed(2)} nằm giữa các ngưỡng quy ước, không thể phân loại dứt khoát.`,
    rawInput: dimensions,
    input: dimensions,
    normalizedValue: `intermediate_ratio_${heightRatio.toFixed(2)}`,
  };
}

// =============================================================================
// 4. DIRECTION ELEMENT MAPPING
// =============================================================================

const UNCALIBRATED_COMPASS_DISCLAIMER =
  'Chưa hiệu chuẩn la bàn thực tế (True North); phương vị được phân loại theo Model North quy ước.';

interface DirectionMappingRule {
  element: NguHanhElement;
  sourceId: string;
  sourceRef: string[];
  explanation: string;
}

const DIRECTION_ELEMENT_MAP: Record<string, DirectionMappingRule> = {
  E: {
    element: 'Mộc',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Đông (Chấn) thuộc hành Mộc theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  SE: {
    element: 'Mộc',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Đông Nam (Tốn) thuộc hành Mộc theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  S: {
    element: 'Hỏa',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Nam (Ly) thuộc hành Hỏa theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  SW: {
    element: 'Thổ',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Tây Nam (Khôn) thuộc hành Thổ theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  NE: {
    element: 'Thổ',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Đông Bắc (Cấn) thuộc hành Thổ theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  W: {
    element: 'Kim',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Tây (Đoài) thuộc hành Kim theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  NW: {
    element: 'Kim',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Tây Bắc (Càn) thuộc hành Kim theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  N: {
    element: 'Thủy',
    sourceId: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    sourceRef: ['SRC-BAT-TRACH-MINH-KINH-NGUHANH', 'SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Phương Bắc (Khảm) thuộc hành Thủy theo cổ thư Bát Trạch & Ngũ Hành Đại Nghĩa.',
  },
  center: {
    element: 'Thổ',
    sourceId: 'SRC-NGU-HANH-DAI-NGHIA',
    sourceRef: ['SRC-NGU-HANH-DAI-NGHIA'],
    explanation: 'Vùng trung tâm (Trung cung) thuộc hành Thổ theo Ngũ Hành Đại Nghĩa (vị trí trung ương).',
  },
};

/**
 * Classifies a compass direction or central zone into a Five Elements result.
 *
 * @param direction Standard CompassDirection ('N'..'NW') or 'center'
 * @param northBearingDeg Calibration angle for True North (null = uncalibrated Model North)
 */
export function classifyDirectionElement(
  direction: unknown,
  northBearingDeg?: number | null
): ElementAnalysisResult {
  // 1. Missing / null / empty
  if (direction === null || direction === undefined || (typeof direction === 'string' && direction.trim() === '')) {
    return {
      element: null,
      dataStatus: 'insufficient',
      certainty: null,
      sourceRef: [],
      explanation: 'Không có dữ liệu phương vị được cung cấp.',
      rawInput: direction,
      input: direction,
    };
  }

  // 2. Type validation
  if (typeof direction !== 'string') {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: 'Dữ liệu phương vị không phải định dạng chuỗi hợp lệ.',
      rawInput: direction,
      input: direction,
    };
  }

  const raw = direction.trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();

  // 3. Resolve key: either standard Latin direction or center
  let key: string | null = null;
  if (lower === 'center' || lower === 'trung_tam' || lower === 'trung cung') {
    key = 'center';
  } else if (['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].includes(upper)) {
    key = upper;
  }

  // 4. Unsupported direction
  if (!key || !DIRECTION_ELEMENT_MAP[key]) {
    return {
      element: null,
      dataStatus: 'unsupported',
      certainty: null,
      sourceRef: [],
      explanation: `Phương vị "${direction}" không phải là hướng Bát Trạch (N, NE, E, SE, S, SW, W, NW) hoặc trung cung.`,
      rawInput: direction,
      input: direction,
      normalizedValue: raw,
    };
  }

  const rule = DIRECTION_ELEMENT_MAP[key];

  // 5. Handling calibration of True North vs Model North
  const isUncalibrated = northBearingDeg === null || northBearingDeg === undefined;

  return {
    element: rule.element,
    dataStatus: 'known',
    certainty: isUncalibrated ? 'applied' : 'classical',
    sourceRef: rule.sourceRef,
    sourceId: rule.sourceId,
    explanation: rule.explanation,
    disclaimer: isUncalibrated ? UNCALIBRATED_COMPASS_DISCLAIMER : undefined,
    rawInput: direction,
    input: direction,
    normalizedValue: key,
  };
}

