export type Gender = 'male' | 'female';

export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type SectorType =
  | 'SINH_KHI'    // Sinh Khí (Cát)
  | 'THIEN_Y'     // Thiên Y (Cát)
  | 'DIEN_NIEN'   // Diên Niên (Cát)
  | 'PHUC_VI'     // Phục Vị (Cát)
  | 'TUYET_MENH'  // Tuyệt Mệnh (Hung)
  | 'NGU_QUY'     // Ngũ Quỷ (Hung)
  | 'LUC_SAT'     // Lục Sát (Hung)
  | 'HOA_HAI';    // Họa Hại (Hung)

export type GuaElement = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
export type GuaGroup = 'Đông Tứ Mệnh' | 'Tây Tứ Mệnh';

export interface DirectionSectorInfo {
  name: string;
  type: SectorType;
  isGood: boolean;
  meaning: string;
}

export interface UserFengShuiProfile {
  birthYear: number;
  gender: Gender;
  guaNumber: number; // 1 to 9
  guaName: string; // Khảm, Khôn, Chấn, Tốn, Càn, Đoài, Cấn, Ly
  element: GuaElement;
  group: GuaGroup;
  auspiciousDirections: CompassDirection[];
  inauspiciousDirections: CompassDirection[];
  directionDetails: Record<CompassDirection, DirectionSectorInfo>;
}

export interface RoomConfig {
  width: number;  // Width in meters (X axis)
  length: number; // Length in meters (Z axis)
  height: number; // Height in meters (Y axis)
  direction: CompassDirection; // Room facing direction
  doorWall?: 'east' | 'west' | 'south' | 'north' | string;
  windowWall?: 'east' | 'west' | 'south' | 'north' | string;
  wallColor?: string;  // P8: Optional wall color hex (e.g. '#ffffff')
  floorColor?: string; // P8: Optional floor color hex (e.g. '#8b4513')
}

export type RoomObjectType =
  | 'bed'
  | 'desk'
  | 'wardrobe'
  | 'chair'
  | 'mirror'
  | 'nightstand'
  | 'plant'
  | 'tv'
  | 'bookshelf'
  | 'door'
  | 'window'
  | 'wc'
  | 'sofa'
  | 'table'
  | 'kitchen'
  | 'lamp'
  | 'rug'
  | 'painting'
  | 'curtain';

export interface RoomObject {
  id: string;
  type: RoomObjectType;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // radians
  dimensions: { width: number; length: number; height: number }; // meters
  color?: string;
  material?: string; // P8: Optional material key (e.g. 'wood', 'metal', 'ceramic')
  subType?: string; // e.g. 'double_1m6', 'double_1m8', 'single'
}

export interface FengShuiItemEvaluation {
  objectId: string;
  objectName: string;
  type: RoomObjectType;
  score: number;
  sector: SectorType;
  sectorName: string;
  isSectorGood: boolean;
  facingDirection: CompassDirection;
  status: 'good' | 'warning' | 'bad';
  pros: string[];
  issues: string[];
  recommendation: string;
  hasDirectConflict?: boolean;
}

export interface FengShuiRoomEvaluation {
  overallScore: number;
  statusText: string;
  statusLevel: 'excellent' | 'good' | 'neutral' | 'poor';
  items: FengShuiItemEvaluation[];
  breakdown: {
    roomDirectionScore: number;
    bedScore: number;
    deskScore: number;
    mirrorScore: number;
    circulationScore: number;
  };
  keyIssues: string[];
  cures: string[];
}

export interface ProposedAdjustment {
  objectId: string;
  suggestedX: number;
  suggestedZ: number;
  suggestedRotationY: number;
  reason: string;
  estimatedScore: number;
}

export interface AIActionCommand {
  type: 'add_object' | 'move_object' | 'rotate_object' | 'delete_object' | 'optimize_room' | 'select_object' | 'undo_action';
  objectType?: RoomObjectType;
  objectId?: string;
  objectIds?: string[];
  name?: string;
  dimensions?: { width: number; length: number; height: number };
  position?: { x: number; z: number };
  rotationY?: number;
  rotationDelta?: number;
  description?: string;
  adjustments?: ProposedAdjustment[];
}

export interface LayoutOptimizationProposal {
  id: string;
  title: string;
  beforeScore: number;
  afterScore: number;
  keyIssues: string[];
  improvements: string[];
  adjustments: ProposedAdjustment[];
  createdObjects?: RoomObject[];
}

export interface StructuredActionHistoryEntry {
  actionId: string;
  actionType: 'add_object' | 'move_object' | 'rotate_object' | 'delete_object';
  objectId: string;
  objectType: RoomObjectType;
  objectName: string;
  quantity: number;
  timestamp: number;
  batchGroupId: string;
  executionStatus: 'SUCCESS' | 'FAILED';
  meta?: Record<string, any>;
}

export interface NearestWallInfo {
  wall: 'North' | 'South' | 'East' | 'West';
  distance: number;
}

export interface ObjectSpatialDetail {
  id: string;
  name: string;
  type: RoomObjectType;
  dimensions: { width: number; length: number; height: number };
  position: { x: number; z: number };
  rotationDeg: number;
  distToDoor: number;
  distToWindow: number;
  distToWc: number;
  distToBed?: number;
  nearestWall: NearestWallInfo;
  adjacentObjectIds: string[];
  isFacingBed?: boolean;
}

export interface DoorCorridorStatus {
  isBlocked: boolean;
  blockingObjectIds: string[];
  blockingObjectNames: string[];
  clearanceDepth: number;
}

export interface FloorUtilizationSummary {
  totalArea: number;
  occupiedArea: number;
  freeArea: number;
  densityPercentage: number;
}

export interface LargestFreeSpaceZone {
  areaName: string;
  bounds: { width: number; length: number };
  approxCenter: { x: number; z: number };
  description: string;
}

export interface GroundTruthSpatialContext {
  roomDimensions: { width: number; length: number; height: number; areaM2: number };
  roomOrientation: CompassDirection;
  doorCorridor: DoorCorridorStatus;
  floorUtilization: FloorUtilizationSummary;
  objectSpatialDetails: ObjectSpatialDetail[];
  largestFreeSpaces: LargestFreeSpaceZone[];
  formattedAgentPrompt: string;
}

// =========================================================================
// 3 NÂNG CẤP MỚI: MULTI-STRATEGY PROPOSALS & EXPLAINABLE FENG SHUI
// =========================================================================

export type LayoutStrategyType = 'feng_shui_priority' | 'balance_usability' | 'balance_aesthetics';

export interface StrategicLayoutOption {
  strategy: LayoutStrategyType;
  title: string;
  tagline: string;
  badgeText: string;
  proposal: LayoutOptimizationProposal;
  pros: string[];
  limitations: string[];
  scoreBreakdown: {
    fengShui: number;
    usability: number;
    aesthetics: number;
  };
}

export interface MultipleLayoutProposals {
  options: StrategicLayoutOption[];
  activeStrategy: LayoutStrategyType;
  roomSummary: string;
}

export interface ExplainableRuleDetail {
  ruleCode: string;
  ruleName: string;
  targetObjectId: string;
  targetObjectName: string;
  status: 'passed' | 'violation' | 'warning';
  severity: 'high' | 'medium' | 'low';
  geometricEvidence: string;
  fengShuiPrinciple: string;
  negativeImpact: string;
  remedyAction: string;
}

export interface ExplainableRoomAnalysis {
  roomOverallScore: number;
  statusText: string;
  kuaSummary: string;
  rulesEvaluated: ExplainableRuleDetail[];
  recommendationsSummary: string[];
}


