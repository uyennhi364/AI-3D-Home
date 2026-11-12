// =============================================================================
// src/engine/core/personalProfile.ts
// Standardized Personal Profile & Calculation Policy Model (Phase P4)
//
// DESIGN PRINCIPLES:
// - Stores personal info strictly necessary for metaphysical computations.
// - No assumptions of default birthDate or guessing gender from name.
// - genderForTraditionalCalculation is clearly documented as an input required by
//   the classical calculation convention, not an inference of personal identity.
// - Missing required fields return dataStatus: 'insufficient'.
// =============================================================================

export type CalculationGua5Rule = 'male_2_female_8' | 'male_8_female_2';
export type SolarTermPolicy = 'exact_lap_xuan' | 'fixed_feb_4' | 'calendar_year';

export interface CalculationPolicy {
  solarTermPolicy: SolarTermPolicy;
  gua5Rule: CalculationGua5Rule;
  timezone: string; // e.g. 'Asia/Ho_Chi_Minh', 'UTC+7'
  allowBoundaryEstimation: boolean;
}

export const DEFAULT_CALCULATION_POLICY: CalculationPolicy = {
  solarTermPolicy: 'exact_lap_xuan',
  gua5Rule: 'male_2_female_8',
  timezone: 'Asia/Ho_Chi_Minh',
  allowBoundaryEstimation: false,
};

export interface PersonalProfile {
  id: string;
  displayName?: string;
  /** ISO format: YYYY-MM-DD */
  birthDate: string;
  /** 24h format: HH:mm (optional, but required for exact solar term boundary resolution) */
  birthTime?: string;
  birthLocation?: string;
  /** Formal convention for classical yin/yang calculation formula */
  genderForTraditionalCalculation: 'male' | 'female';
  timezone?: string;
  calculationPolicy?: CalculationPolicy;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  dataStatus: 'sufficient' | 'insufficient';
  missingFields: string[];
  warnings: string[];
}

/**
 * Validates a PersonalProfile for metaphysical computation readiness.
 * Enforces that birthDate and genderForTraditionalCalculation are strictly provided.
 */
export function validatePersonalProfile(profile: Partial<PersonalProfile> | null | undefined): ProfileValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!profile) {
    return {
      valid: false,
      dataStatus: 'insufficient',
      missingFields: ['profile_object_missing'],
      warnings: ['Không tìm thấy thông tin hồ sơ cá nhân.'],
    };
  }

  if (!profile.birthDate || typeof profile.birthDate !== 'string') {
    missingFields.push('birthDate');
  } else {
    // Validate YYYY-MM-DD
    const match = /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate.trim());
    if (!match) {
      missingFields.push('birthDate_invalid_format (expected YYYY-MM-DD)');
    } else {
      const parts = profile.birthDate.trim().split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) {
        missingFields.push('birthDate_invalid_calendar_date');
      }
    }
  }

  if (!profile.genderForTraditionalCalculation || !['male', 'female'].includes(profile.genderForTraditionalCalculation)) {
    missingFields.push('genderForTraditionalCalculation');
  }

  if (!profile.birthTime) {
    warnings.push('Chưa có giờ sinh (birthTime) — các ngày gần Lập Xuân (3-5/2) có thể không phân định được năm chính xác.');
  }

  const valid = missingFields.length === 0;

  return {
    valid,
    dataStatus: valid ? 'sufficient' : 'insufficient',
    missingFields,
    warnings,
  };
}

