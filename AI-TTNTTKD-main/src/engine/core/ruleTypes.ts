// =============================================================================
// src/engine/core/ruleTypes.ts
// Standard Schema for Rule Results, Assessment Reports, and Source Metadata.
// Supports multi-layered auditability with verification tracking.
// =============================================================================

export type RuleCategory =
  | 'traditional_feng_shui'      // Bát Trạch, Cung Vị, Hướng Cát/Hung
  | 'geometric_layout'           // Va chạm OBB, biên phòng, lối đi, hành lang cửa
  | 'environmental_ergonomics'   // Ánh sáng, thông gió, khoảng cách sử dụng
  | 'advanced_flying_stars';     // Huyền Không Phi Tinh (chỉ bật khi đủ tham số)

export type FengShuiSchool =
  | 'bat_trach'       // Bát Trạch Minh Kính / Bát Trạch Tam Yếu
  | 'loan_dau'        // Loan Đầu Hình Thế Học
  | 'huyen_khong'     // Huyền Không Phi Tinh
  | 'ergonomics'      // Tiêu chuẩn Nhân trắc học & Kiến trúc nội thất
  | 'general';        // Nguyên lý không gian cơ bản

export type RuleVerdict = 'pass' | 'warn' | 'fail' | 'unknown' | 'n/a';

export type RuleDataStatus = 'sufficient' | 'insufficient' | 'not_applicable';

export type RuleSeverity = 'critical' | 'major' | 'minor' | 'info';

export interface MeasurementEvidence {
  metric: string;
  value: number | string;
  unit?: string;
  threshold?: number | string;
  passed?: boolean;
  geometryDetails?: {
    point1?: { x: number; z: number };
    point2?: { x: number; z: number };
    vector?: { x: number; z: number };
    angleDeg?: number;
    distanceMeters?: number;
    overlapAreaM2?: number;
  };
}

export interface RuleResult {
  ruleId: string;
  name: string;
  category: RuleCategory;
  school: FengShuiSchool;
  applicability: 'mandatory' | 'recommended' | 'optional';
  dataStatus: RuleDataStatus;
  missingInputs?: string[];
  inputs?: Record<string, unknown>;
  measurement?: MeasurementEvidence;
  verdict: RuleVerdict;
  severity: RuleSeverity;
  explanation: string;
  remedy?: string;
  sources: string[]; // Reference IDs registered in SourceRegistry
  engineVersion: string;
}

export interface CategoryAssessmentSummary {
  category: RuleCategory;
  categoryNameVi: string;
  rules: RuleResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  unknownCount: number;
  naCount: number;
  totalEvaluated: number;
  coverageRatio: number; // [0, 1] evaluated / applicable
  status: 'optimal' | 'acceptable' | 'warning' | 'critical' | 'insufficient_data';
  summaryNotes: string[];
}

export interface MultiLayerAssessmentReport {
  timestamp: string;
  engineVersion: string;
  personInfo: {
    birthYear: number;
    gender: 'male' | 'female';
    guaNumber: number;
    guaName: string;
    element: string;
    group: string;
    calculationMethod: string;
    sourceRef: string;
  };
  roomInfo: {
    dimensions: { width: number; length: number; height: number };
    northBearingDeg: number | null;
    doorWall?: string;
    windowWall?: string;
  };
  traditionalAssessment: CategoryAssessmentSummary;
  geometricAssessment: CategoryAssessmentSummary;
  environmentalAssessment: CategoryAssessmentSummary;
  overallCoverage: number;
  criticalIssues: RuleResult[];
  recommendedCures: Array<{ ruleId: string; remedy: string; priority: number }>;
}

