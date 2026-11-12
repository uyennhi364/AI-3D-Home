// =============================================================================
// src/engine/core/environmentalConfig.ts
// Phase P6 — Environmental & Ergonomics Threshold Configuration
//
// DESIGN PRINCIPLES:
// - Each threshold carries source ID and verification status.
// - Only mark 'verified' when confirmed against official text.
// - 'pending' = mentioned in standard but exact value not text-confirmed.
// - 'experimental' = internal heuristic, not from published standard.
// - DO NOT auto-upgrade status without explicit text confirmation.
// =============================================================================

import { VerificationStatus } from './sourceRegistry.js';

export interface ThresholdDefinition {
  id: string;
  value: number;
  unit: string;
  description: string;
  applicableObjects?: string[];
  sourceId: string;
  verificationStatus: VerificationStatus;
  notes?: string;
}

// =============================================================================
// Threshold Registry
// =============================================================================

export const ENVIRONMENTAL_THRESHOLDS: Record<string, ThresholdDefinition> = {

  // --- Lighting ---
  WINDOW_FLOOR_RATIO_MIN: {
    id: 'WINDOW_FLOOR_RATIO_MIN',
    value: 0.10,
    unit: 'm²/m²',
    description: 'Tỷ lệ diện tích cửa sổ / diện tích sàn tối thiểu (10%) để đảm bảo chiếu sáng tự nhiên.',
    applicableObjects: ['window'],
    sourceId: 'SRC-TCVN-4451-2012',
    // The 1/10 ratio for natural lighting is referenced in TCVN 4451 but
    // exact clause text not confirmed numerically. Using 'pending'.
    verificationStatus: 'pending',
    notes: 'TCVN 4451:2012 đề cập tỷ lệ cửa sáng; giá trị 1/10 cần đối chiếu khoản cụ thể.',
  },

  WINDOW_FLOOR_RATIO_WARN: {
    id: 'WINDOW_FLOOR_RATIO_WARN',
    value: 0.05,
    unit: 'm²/m²',
    description: 'Ngưỡng cảnh báo tỷ lệ cửa sổ / sàn (5%) — dưới ngưỡng này thiếu ánh sáng nghiêm trọng.',
    applicableObjects: ['window'],
    sourceId: 'SRC-HEURISTIC-STUDIO-V1',
    verificationStatus: 'pending',
  },

  WINDOW_OBSTRUCTION_ZONE_DEPTH: {
    id: 'WINDOW_OBSTRUCTION_ZONE_DEPTH',
    value: 0.5,
    unit: 'm',
    description: 'Chiều sâu vùng kiểm tra cản sáng phía trước cửa sổ (tính vào trong phòng).',
    applicableObjects: ['window'],
    sourceId: 'SRC-HEURISTIC-STUDIO-V1',
    verificationStatus: 'pending',
  },

  // --- Ventilation ---
  VENTILATION_OBSTRUCTION_ZONE_DEPTH: {
    id: 'VENTILATION_OBSTRUCTION_ZONE_DEPTH',
    value: 0.9,
    unit: 'm',
    description: 'Chiều sâu vùng kiểm tra cản thông gió phía trước mọi lỗ mở cửa/cửa sổ.',
    applicableObjects: ['door', 'window'],
    sourceId: 'SRC-HEURISTIC-STUDIO-V1',
    verificationStatus: 'pending',
  },

  // --- Circulation ---
  MAIN_WALKWAY_MIN: {
    id: 'MAIN_WALKWAY_MIN',
    value: 0.90,
    unit: 'm',
    description: 'Chiều rộng lối đi chính tối thiểu trong không gian nội thất (hành lang chính).',
    applicableObjects: ['general'],
    sourceId: 'SRC-TCVN-4451-2012',
    verificationStatus: 'verified',
    notes: 'TCVN 4451:2012 — Lối thông 0.9m đã xác minh cho hành lang tiếp cận phòng ngủ.',
  },

  SECONDARY_WALKWAY_MIN: {
    id: 'SECONDARY_WALKWAY_MIN',
    value: 0.60,
    unit: 'm',
    description: 'Chiều rộng lối đi phụ / khoảng thông thủy tối thiểu (hành lang thứ cấp giữa các vật thể).',
    applicableObjects: ['general'],
    sourceId: 'SRC-HEURISTIC-STUDIO-V1',
    verificationStatus: 'pending',
  },

  DOOR_CLEARANCE_MIN: {
    id: 'DOOR_CLEARANCE_MIN',
    value: 0.90,
    unit: 'm',
    description: 'Khoảng thông thủy tối thiểu trước cửa ra vào (độ rộng mở cửa và vùng an toàn).',
    applicableObjects: ['door'],
    sourceId: 'SRC-TCVN-4451-2012',
    verificationStatus: 'verified',
  },

  // --- Ergonomics ---
  BED_SIDE_CLEARANCE_MIN: {
    id: 'BED_SIDE_CLEARANCE_MIN',
    value: 0.60,
    unit: 'm',
    description: 'Khoảng trống tối thiểu tại cạnh bên giường để có thể bước xuống và dọn giường.',
    applicableObjects: ['bed'],
    sourceId: 'SRC-NEUFERT-ERGONOMICS',
    verificationStatus: 'verified',
    notes: 'Neufert — Bedroom ergonomics: min. 0.6m beside bed.',
  },

  BED_FOOT_CLEARANCE_MIN: {
    id: 'BED_FOOT_CLEARANCE_MIN',
    value: 0.60,
    unit: 'm',
    description: 'Khoảng trống tối thiểu ở chân giường.',
    applicableObjects: ['bed'],
    sourceId: 'SRC-NEUFERT-ERGONOMICS',
    verificationStatus: 'verified',
  },

  WARDROBE_FRONT_CLEARANCE_MIN: {
    id: 'WARDROBE_FRONT_CLEARANCE_MIN',
    value: 0.75,
    unit: 'm',
    description: 'Khoảng trống tối thiểu trước cánh tủ quần áo để mở cánh và lấy đồ.',
    applicableObjects: ['wardrobe'],
    sourceId: 'SRC-NEUFERT-ERGONOMICS',
    verificationStatus: 'verified',
    notes: 'Neufert — Wardrobe: 0.75–0.9m in front for door swing + user standing.',
  },

  WARDROBE_FRONT_CLEARANCE_WARN: {
    id: 'WARDROBE_FRONT_CLEARANCE_WARN',
    value: 0.60,
    unit: 'm',
    description: 'Ngưỡng cảnh báo khoảng trống trước tủ quần áo — dưới mức tối ưu.',
    applicableObjects: ['wardrobe'],
    sourceId: 'SRC-HEURISTIC-STUDIO-V1',
    verificationStatus: 'pending',
  },

  DESK_CHAIR_PULLBACK_MIN: {
    id: 'DESK_CHAIR_PULLBACK_MIN',
    value: 0.75,
    unit: 'm',
    description: 'Khoảng trống sau bàn làm việc để kéo ghế ra và đứng lên.',
    applicableObjects: ['desk'],
    sourceId: 'SRC-NEUFERT-ERGONOMICS',
    verificationStatus: 'verified',
    notes: 'Neufert — Desk: 0.75m pullback clearance for seated occupant.',
  },
};

/**
 * Returns threshold definition by ID, or null if not found.
 */
export function getThreshold(id: string): ThresholdDefinition | null {
  return ENVIRONMENTAL_THRESHOLDS[id] ?? null;
}

