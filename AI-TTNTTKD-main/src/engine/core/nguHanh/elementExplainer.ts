// =============================================================================
// src/engine/core/nguHanh/elementExplainer.ts
// Phase P8-M3 — Five Elements (Ngũ Hành) Natural Language Explainer
//
// DESIGN PRINCIPLES:
// - Converts technical rule evaluations into clear, auditable, natural Vietnamese.
// - Every explanation includes all 9 required components:
//   1. Đối tượng được đánh giá (targetObject)
//   2. Thuộc tính được đánh giá (attribute)
//   3. Bản mệnh và hành của thuộc tính (personalElement, attributeElement)
//   4. Quan hệ Ngũ Hành (relationship)
//   5. Kết quả rule (verdict, verdictLabel)
//   6. Lý do và bằng chứng (rationale / evidence)
//   7. Nguồn tham chiếu (sources / sourceId)
//   8. Mức độ chắc chắn (certainty, certaintyLabel)
//   9. Disclaimer khi sử dụng heuristic hoặc dữ liệu chưa đầy đủ (disclaimer)
// - Strictly respects epistemological boundaries: does NOT invent sources;
//   never claims heuristics or modern applied conventions are classical texts.
// - Purely deterministic and functional: zero AI hallucination, no external network calls.
// =============================================================================

import { RuleVerdict } from '../ruleTypes.js';
import {
  NguHanhElement,
  ElementDataStatus,
  ElementCertainty,
  FurnitureElementProfile,
  ElementRoomAssessment,
  ElementRelationType,
} from './elementTypes.js';
import {
  RELATION_LABELS,
  HARMONY_SCORE_DISCLAIMER,
} from './elementRelationship.js';
import { ElementRuleResult } from './elementRuleEngine.js';
import {
  FurnitureAssessmentSummary,
  DetailedRoomElementAssessment,
} from './elementAssessment.js';

/**
 * Structured, auditable breakdown of a single Five Elements rule explanation.
 * Contains all 9 mandatory specification fields.
 */
export interface StructuredElementExplanation {
  /** 1. Đối tượng được đánh giá (e.g. "Giường ngủ", "Bàn làm việc", "Không gian phòng") */
  targetObject: string;

  /** 2. Thuộc tính được đánh giá (e.g. "Màu sắc nội thất", "Vật liệu cấu tạo", "Hình khối 3D OBB", "Phương vị đặt đồ", "Màu sắc không gian phòng") */
  attribute: string;

  /** 3a. Bản mệnh gia chủ (e.g. "Kim", "Mộc", "Thủy", "Hỏa", "Thổ", "Chưa xác định") */
  personalElement: string;

  /** 3b. Hành của thuộc tính (e.g. "Thổ", "Hỏa", "Chưa rõ", "N/A") */
  attributeElement: string;

  /** 4. Quan hệ Ngũ Hành có hướng (e.g. "Tương sinh (Thổ sinh Kim - Sinh nhập)", "Tương hòa", "Tương khắc (Hỏa khắc Kim - Khắc nhập)") */
  relationship: string;

  /** 5a. Kết quả đánh giá rule kỹ thuật ('pass' | 'warn' | 'fail' | 'unknown' | 'n/a') */
  verdict: RuleVerdict;

  /** 5b. Nhãn kết quả tiếng Việt rõ ràng */
  verdictLabel: string;

  /** Mức độ ưu tiên / nghiêm trọng kỹ thuật (Info, Minor, Major, Critical) */
  severity: string;

  /** 6. Lý do và bằng chứng chi tiết */
  rationale: string;

  /** 7. Nguồn tham chiếu chính quy (Source IDs từ Source Registry) */
  sources: string[];

  /** 8a. Mức độ chắc chắn tri thức luận ('classical' | 'applied' | 'heuristic') */
  certainty: ElementCertainty;

  /** 8b. Nhãn mức độ chắc chắn tiếng Việt */
  certaintyLabel: string;

  /** 9. Cảnh báo / Miễn trừ trách nhiệm (bắt buộc khi dùng heuristic hoặc dữ liệu thiếu/chưa đầy đủ) */
  disclaimer?: string;

  /** Chuỗi văn bản tiếng Việt hoàn chỉnh được định dạng sẵn để hiển thị trực tiếp */
  formattedText: string;
}

// =============================================================================
// TRANSLATION & LOCALIZATION HELPERS
// =============================================================================

export const FURNITURE_TYPE_NAMES: Record<string, string> = {
  bed: 'Giường ngủ',
  desk: 'Bàn làm việc',
  wardrobe: 'Tủ quần áo',
  door: 'Cửa chính / Cửa phòng',
  window: 'Cửa sổ',
  mirror: 'Gương soi',
  plant: 'Cây cảnh',
  altar: 'Bàn thờ',
  room: 'Không gian phòng',
};

export const RULE_ATTRIBUTE_MAP: Record<string, string> = {
  'NH-COLOR-01': 'Màu sắc nội thất (Tương sinh / Đồng hành)',
  'NH-COLOR-02': 'Màu sắc nội thất (Tương khắc)',
  'NH-MAT-01': 'Vật liệu cấu tạo nội thất (Tương sinh / Đồng hành)',
  'NH-MAT-02': 'Vật liệu cấu tạo nội thất (Tương khắc)',
  'NH-SHAPE-01': 'Hình khối hình học 3D (Tỷ lệ OBB)',
  'NH-DIR-01': 'Phương vị tọa lạc (Hướng / Cung vị)',
  'NH-ROOM-01': 'Màu sắc tổng thể không gian phòng (Tường & Sàn)',
};

export const CERTAINTY_LABELS: Record<ElementCertainty, string> = {
  classical: 'Kinh điển cổ văn (Classical)',
  applied: 'Quy ước ứng dụng thực hành hiện đại (Applied)',
  heuristic: 'Heuristic suy diễn hình học/không gian nội bộ (Heuristic)',
};

export const VERDICT_LABELS: Record<RuleVerdict, string> = {
  pass: 'HỢP CÁCH (PASS)',
  warn: 'CẢNH BÁO (WARN)',
  fail: 'XUNG KHẮC (FAIL)',
  unknown: 'CHƯA XÁC ĐỊNH (UNKNOWN)',
  'n/a': 'KHÔNG ÁP DỤNG (N/A)',
};

export const SEVERITY_LABELS: Record<string, string> = {
  info: 'Thông tin tham khảo (Info)',
  minor: 'Lưu ý nhỏ (Minor)',
  major: 'Bất lợi đáng kể (Major)',
  critical: 'Xung khắc nghiêm trọng (Critical)',
};

/**
 * Returns localized Vietnamese description of relationship with directional context.
 */
export function getRelationVietnameseLabel(
  relationType: ElementRelationType | string | undefined,
  sourceElement?: string | null,
  targetElement?: string | null
): string {
  if (!relationType || relationType === 'UNKNOWN') {
    return 'Chưa xác định quan hệ';
  }

  const s = sourceElement || 'Bản mệnh';
  const t = targetElement || 'Thuộc tính';

  switch (relationType) {
    case 'SAME':
      return `Tương hòa (Cùng hành ${s} — Bình hòa, hỗ trợ tự nhiên)`;
    case 'GENERATES':
      return `Sinh xuất (${s} sinh ${t} — Bản mệnh hao tổn năng lượng trợ lực cho ngoại vật)`;
    case 'GENERATED_BY':
      return `Sinh nhập (${t} sinh ${s} — Ngoại vật tương sinh, bồi bổ sinh khí cho bản mệnh)`;
    case 'OVERCOMES':
      return `Khắc xuất (${s} khắc ${t} — Bản mệnh phải tiết khí để áp chế ngoại vật)`;
    case 'OVERCOME_BY':
      return `Khắc nhập (${t} khắc ${s} — Ngoại vật xung khắc, gây tổn hại trực tiếp bản mệnh)`;
    default:
      return relationType;
  }
}

/**
 * Humanizes furniture object type to Vietnamese.
 */
export function humanizeObjectName(typeOrName?: string | null): string {
  if (!typeOrName) return 'Đồ nội thất';
  const lower = typeOrName.toLowerCase().trim();
  return FURNITURE_TYPE_NAMES[lower] || typeOrName;
}

// =============================================================================
// CORE RULE EXPLAINER (9 MANDATORY FIELDS)
// =============================================================================

/**
 * Converts an ElementRuleResult into a StructuredElementExplanation containing all 9 fields.
 */
export function explainRuleResult(
  ruleResult: ElementRuleResult,
  objectName?: string
): StructuredElementExplanation {
  const evidence = ruleResult.evidence || {};

  // 1. Target Object
  let targetObject = objectName || humanizeObjectName(evidence.furnitureType as string);
  if (ruleResult.ruleId === 'NH-ROOM-01' && !objectName) {
    targetObject = 'Không gian phòng (Tường & Sàn)';
  }

  // 2. Evaluated Attribute
  const attribute = RULE_ATTRIBUTE_MAP[ruleResult.ruleId] || 'Thuộc tính Ngũ Hành';

  // 3a. Personal Element
  const personalElement = (evidence.personalElement as string) || 'Chưa xác định';

  // 3b. Attribute Element
  let attributeElement = 'Chưa rõ';
  if (evidence.colorElement) {
    attributeElement = String(evidence.colorElement);
  } else if (evidence.materialElement) {
    attributeElement = String(evidence.materialElement);
  } else if (evidence.shapeElement) {
    attributeElement = String(evidence.shapeElement);
  } else if (evidence.directionElement) {
    attributeElement = String(evidence.directionElement);
  } else if (evidence.wallElement || evidence.floorElement) {
    const wall = evidence.wallElement ? `Tường: ${evidence.wallElement}` : 'Tường: Chưa rõ';
    const floor = evidence.floorElement ? `Sàn: ${evidence.floorElement}` : 'Sàn: Chưa rõ';
    attributeElement = `${wall}, ${floor}`;
  }

  // 4. Relationship
  const relType = ruleResult.relationType || (evidence.relation as any)?.relation;
  const relationship = getRelationVietnameseLabel(
    relType,
    personalElement !== 'Chưa xác định' ? personalElement : null,
    attributeElement !== 'Chưa rõ' ? attributeElement : null
  );

  // 5. Verdict & Severity
  const verdict = ruleResult.verdict;
  const verdictLabel = VERDICT_LABELS[verdict] || verdict.toUpperCase();
  const severity = SEVERITY_LABELS[ruleResult.severity] || ruleResult.severity;

  // 6. Rationale & Evidence
  const rationale = ruleResult.explanation;

  // 7. Sources
  const sources = ruleResult.sources && ruleResult.sources.length > 0
    ? ruleResult.sources
    : (ruleResult.sourceId ? [ruleResult.sourceId] : []);

  // 8. Certainty
  const certainty = ruleResult.certainty;
  const certaintyLabel = CERTAINTY_LABELS[certainty] || certainty;

  // 9. Disclaimer
  const disclaimer = ruleResult.disclaimer || (certainty === 'heuristic' ? HARMONY_SCORE_DISCLAIMER : undefined);

  // Build formatted text block
  const lines: string[] = [
    `【${ruleResult.ruleId}】${ruleResult.name}`,
    `• Đối tượng đánh giá: ${targetObject}`,
    `• Thuộc tính: ${attribute}`,
    `• Bản mệnh gia chủ: ${personalElement} | Hành của thuộc tính: ${attributeElement}`,
    `• Tương quan Ngũ Hành: ${relationship}`,
    `• Kết luận: ${verdictLabel} [${severity}]`,
    `• Căn cứ & Lý giải: ${rationale}`,
    `• Nguồn tham chiếu: ${sources.join(', ')}`,
    `• Mức độ chắc chắn: ${certaintyLabel}`,
  ];

  if (disclaimer) {
    lines.push(`• Lưu ý / Miễn trừ: ${disclaimer}`);
  }

  if (ruleResult.remedy) {
    lines.push(`• Khuyến nghị hóa giải: ${ruleResult.remedy}`);
  }

  const formattedText = lines.join('\n');

  return {
    targetObject,
    attribute,
    personalElement,
    attributeElement,
    relationship,
    verdict,
    verdictLabel,
    severity,
    rationale,
    sources,
    certainty,
    certaintyLabel,
    disclaimer,
    formattedText,
  };
}

// =============================================================================
// FURNITURE PROFILE EXPLAINER
// =============================================================================

/**
 * Generates an explainable text summary of a FurnitureElementProfile.
 */
export function explainFurnitureProfile(profile: FurnitureElementProfile): string {
  const objName = humanizeObjectName(profile.objectType);
  const lines: string[] = [
    `=== HỒ SƠ NGŨ HÀNH: ${objName.toUpperCase()} (ID: ${profile.objectId}) ===`,
    `1. Hành chủ đạo: ${profile.dominantElement ? `Hành ${profile.dominantElement}` : 'Chưa xác định'}`,
    `   - Cơ sở xác định: ${profile.dominantElementBasis}`,
    `   - Trạng thái dữ liệu: ${profile.overallDataStatus.toUpperCase()}`,
    `2. Phân tích chi tiết 4 thuộc tính:`,
    `   - Màu sắc: ${profile.colorAnalysis.element ? `Hành ${profile.colorAnalysis.element}` : 'Không rõ'} [${profile.colorAnalysis.dataStatus}] (${profile.colorAnalysis.explanation})`,
    `   - Vật liệu: ${profile.materialAnalysis.element ? `Hành ${profile.materialAnalysis.element}` : 'Không rõ'} [${profile.materialAnalysis.dataStatus}] (${profile.materialAnalysis.explanation})`,
    `   - Hình khối 3D: ${profile.shapeAnalysis.element ? `Hành ${profile.shapeAnalysis.element}` : 'Không rõ'} [${profile.shapeAnalysis.dataStatus}] (${profile.shapeAnalysis.explanation})`,
    `   - Phương vị tọa lạc: ${profile.locationDirectionAnalysis.element ? `Hành ${profile.locationDirectionAnalysis.element}` : 'Không rõ'} [${profile.locationDirectionAnalysis.dataStatus}] (${profile.locationDirectionAnalysis.explanation})`,
  ];

  if (profile.shapeAnalysis.disclaimer) {
    lines.push(`   * Lưu ý hình khối: ${profile.shapeAnalysis.disclaimer}`);
  }

  return lines.join('\n');
}

// =============================================================================
// PER-FURNITURE ASSESSMENT EXPLAINER
// =============================================================================

/**
 * Explains full evaluation for a single furniture item including independent rule results.
 */
export function explainFurnitureAssessment(summary: FurnitureAssessmentSummary): string {
  const objName = humanizeObjectName(summary.profile.objectType);
  const lines: string[] = [
    explainFurnitureProfile(summary.profile),
    '',
    `--- KẾT QUẢ QUY TẮC NGŨ HÀNH (${summary.rules.length} quy tắc) ---`,
    `Tổng hợp: ${summary.passCount} PASS | ${summary.warnCount} WARN | ${summary.failCount} FAIL | ${summary.unknownCount} UNKNOWN | ${summary.naCount} N/A`,
  ];

  for (const rule of summary.rules) {
    const explained = explainRuleResult(rule, objName);
    lines.push('');
    lines.push(explained.formattedText);
  }

  if (summary.keyIssues.length > 0) {
    lines.push('');
    lines.push(`VẤN ĐỀ CẦN LƯU Ý:`);
    for (const issue of summary.keyIssues) {
      lines.push(`• ${issue}`);
    }
  }

  if (summary.remedies.length > 0) {
    lines.push('');
    lines.push(`BIỆN PHÁP HÓA GIẢI ĐỀ XUẤT:`);
    for (const remedy of summary.remedies) {
      lines.push(`• ${remedy}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// WHOLE-ROOM ASSESSMENT EXPLAINER
// =============================================================================

/**
 * Localized human labels for harmony levels.
 */
export const HARMONY_LEVEL_LABELS: Record<NonNullable<ElementRoomAssessment['harmonyLevel']>, string> = {
  excellent: 'Rất hài hòa (Không có xung khắc, tương sinh vượt trội)',
  good: 'Hài hòa (Tương sinh hoặc đồng hành là chủ đạo)',
  neutral: 'Trung bình (Có cảnh báo khắc xuất hoặc màu sắc cần điều tiết)',
  poor: 'Chưa hài hòa (Có yếu tố tương khắc khắc nhập bất lợi)',
  unknown: 'Chưa đủ dữ liệu (Thiếu thông tin bản mệnh hoặc dữ liệu nội thất)',
};

/**
 * Generates an end-to-end, comprehensive plain-text Vietnamese report for whole-room Five Elements assessment.
 */
export function explainRoomElementAssessment(
  assessment: DetailedRoomElementAssessment | ElementRoomAssessment
): string {
  const pElem = assessment.personalElement ? `Hành ${assessment.personalElement}` : 'Chưa cung cấp';
  const levelLabel = HARMONY_LEVEL_LABELS[assessment.harmonyLevel] || assessment.harmonyLevel;

  const lines: string[] = [
    '============================================================================= ',
    'BÁO CÁO TỔNG HỢP ĐÁNH GIÁ PHONG THỦY NGŨ HÀNH KHÔNG GIAN',
    '============================================================================= ',
    `1. THÔNG TIN BẢN MỆNH GIA CHỦ: ${pElem}`,
    `2. TRẠNG THÁI HÀI HÒA TỔNG QUAN: ${levelLabel}`,
    `   - Điểm số tổng hợp (overallHarmonyScore): [NULL]`,
    `   * AI Studio tuyệt đối KHÔNG tự tạo điểm số tổng hợp giả lập cho Ngũ Hành.`,
    `   * Đánh giá được tổng hợp minh bạch từ tập hợp kết quả độc lập của từng quy tắc.`,
    `   - Trạng thái dữ liệu: ${assessment.dataStatus.toUpperCase()}`,
    `   - Phiên bản Engine: ${assessment.engineVersion}`,
  ];

  // Audit counts if DetailedRoomElementAssessment
  const detailed = assessment as DetailedRoomElementAssessment;
  if (typeof detailed.totalEvaluated === 'number') {
    lines.push('');
    lines.push(`3. THỐNG KÊ QUY TẮC ĐÃ KIỂM TRA (Tổng số: ${detailed.totalEvaluated} lượt):`);
    lines.push(`   • Đạt chuẩn (PASS):      ${detailed.passCount}`);
    lines.push(`   • Cảnh báo (WARN):       ${detailed.warnCount}`);
    lines.push(`   • Xung khắc (FAIL):      ${detailed.failCount}`);
    lines.push(`   • Chưa rõ (UNKNOWN):     ${detailed.unknownCount}`);
    lines.push(`   • Không áp dụng (N/A):   ${detailed.naCount}`);
  }

  // Key issues
  lines.push('');
  lines.push(`4. DANH SÁCH VẤN ĐỀ XUNG KHẮC / CẢNH BÁO:`);
  if (assessment.keyIssues.length === 0) {
    lines.push('   (Không ghi nhận xung khắc nghiêm trọng nào)');
  } else {
    for (let i = 0; i < assessment.keyIssues.length; i++) {
      lines.push(`   ${i + 1}. ${assessment.keyIssues[i]}`);
    }
  }

  // Cures
  lines.push('');
  lines.push(`5. BIỆN PHÁP HÓA GIẢI & ĐIỀU TIẾT:`);
  if (assessment.cures.length === 0) {
    lines.push('   (Không có khuyến nghị can thiệp đặc biệt)');
  } else {
    for (let i = 0; i < assessment.cures.length; i++) {
      lines.push(`   ${i + 1}. ${assessment.cures[i]}`);
    }
  }

  // Relations summary
  if (assessment.furnitureRelations.length > 0) {
    lines.push('');
    lines.push(`6. TỔNG HỢP TƯƠNG QUAN NỘI THẤT CHÍNH VỚI BẢN MỆNH:`);
    for (const rel of assessment.furnitureRelations) {
      const name = humanizeObjectName(rel.objectType);
      const eName = rel.dominantElement ? `Hành ${rel.dominantElement}` : 'Chưa rõ';
      const relDesc = getRelationVietnameseLabel(
        rel.relation?.relationType,
        assessment.personalElement,
        rel.dominantElement
      );
      lines.push(`   • [${rel.objectId}] ${name} (${eName}): ${relDesc}`);
    }
  }

  // Disclaimers
  if (assessment.disclaimers.length > 0) {
    lines.push('');
    lines.push(`7. LƯU Ý HỌC THUẬT & MIỄN TRỪ TRÁCH NHIỆM (DISCLAIMERS):`);
    for (const d of assessment.disclaimers) {
      lines.push(`   * ${d}`);
    }
  }

  lines.push('============================================================================= ');

  return lines.join('\n');
}
