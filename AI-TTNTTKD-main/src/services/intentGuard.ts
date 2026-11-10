// =============================================================================
// src/services/intentGuard.ts
// Robust Safety Guard for AI Intent Classification and Command Execution.
// Enforces zero unauthorized 3D mutations on theoretical/advisory queries.
// =============================================================================

export type IntentExecutionMode = 'THEORY' | 'ANALYZE' | 'PROPOSE' | 'COMMAND' | 'CHAT' | 'UNDO';

export interface GuardEvaluationResult {
  executionMode: IntentExecutionMode;
  isSafeToExecute: boolean; // true ONLY if executionMode === 'COMMAND' or 'UNDO'
  isAdvisoryOrQuestion: boolean;
  blockedActionReason?: string;
  sanitizedPrompt: string;
  hasAmbiguousTarget: boolean;
  requiresTargetClarification: boolean;
}

// Preview cancellation phrases (must NOT be confused with history Undo)
const CANCEL_PREVIEW_REGEX = /(?:tắt|bỏ|đóng|dừng|hủy|huy)\s*(?:xem\s*trước|bóng\s*mờ|preview)/i;

// Undo action phrases
const UNDO_ACTION_REGEX = /(?:^|\s)(?:undo|hoàn\s*tác|hoàn\s*lại|khôi\s*phục|quay\s*lại\s*như\s*cũ|trở\s*lại\s*như\s*cũ|như\s*lúc\s*trước|bỏ\s*thao\s*tác|huỷ\s*thao\s*tác|hủy\s*thao\s*tác|hủy\s*lệnh)(?:\s|$|[.,;!?])/i;

// Advisory / Question indicators that ask why, how, whether it is good/bad/allowed
const QUESTION_INDICATOR_REGEX =
  /(?:có\s*(?:sao|được|nên|hợp|phạm|ảnh\s*hưởng|tốt|xấu|vấn\s*đề\s*gì)\s*(?:không|ko|chăng)|tại\s*sao|vì\s*sao|làm\s*sao|như\s*thế\s*nào|thế\s*nào|ra\s*sao|xin\s*hỏi|cho\s*tôi\s*hỏi|giải\s*thích|ảnh\s*hưởng\s*gì|lý\s*do\s*gì|căn\s*cứ\s*nào|hướng\s*dẫn|tư\s*vấn\s*(?:giúp|cho|về)|xem\s*giúp|hóa\s*giải\s*(?:thế\s*nào|như\s*thế\s*nào|sao)|cách\s*(?:khắc\s*phục|hóa\s*giải|xử\s*lý)|gợi\s*ý\s*cách)/i;

// Questions specifically about optimization
const OPTIMIZE_QUESTION_REGEX =
  /(?:có\s*nên\s*(?:tối\s*ưu|sắp\s*xếp|bố\s*trí)|tối\s*ưu\s*(?:thế\s*nào|như\s*thế\s*nào|ra\s*sao|có\s*tốt\s*không|được\s*không)|làm\s*sao\s*để\s*tối\s*ưu)/i;

// Polite request markers (e.g. "Bạn có thể giúp tôi... được không?")
const POLITE_PREFIX_REGEX =
  /(?:^(?:bạn\s*có\s*thể|có\s*thể|nhờ\s*bạn|làm\s*ơn|xin\s*vui\s*lòng|vui\s*lòng|phiền\s*bạn|hãy\s*giúp\s*tôi|giúp\s*tôi|nhờ\s*em|nhờ\s*ai)\b)/i;

// Action verbs that can form a command
const ACTION_VERBS_REGEX =
  /(?:di\s*chuyển|chuyển|dời|dịch|kê|xoay|quay|đổi\s*hướng|thêm|đặt|tạo|xóa|bỏ|gỡ|xóa\s*bỏ)\b/i;

// Known furniture / object keywords to verify target presence
const FURNITURE_TARGET_REGEX =
  /(?:giường|nệm|đệm|bàn\s*học|bàn\s*làm\s*việc|bàn\s*trà|bàn\s*ăn|bàn|ghế|tủ\s*quần\s*áo|tủ\s*áo|tủ\s*đầu\s*giường|táp\s*đầu\s*giường|táp|tab|tủ\s*sách|tủ|gương|đèn\s*ngủ|đèn\s*bàn|đèn\s*cây|đèn|chậu\s*cây|cây\s*cảnh|cây|sofa|thảm|kệ\s*tivi|tivi|nhà\s*vệ\s*sinh|bồn\s*cầu|toilet|wc|nó|chúng\s*nó|đồ\s*vừa\s*tạo|cái\s*vừa\s*thêm)/i;

/**
 * Evaluates whether a user prompt is safe to execute as a 3D command,
 * or must be downgraded to theory/advisory/analysis/proposal mode.
 *
 * @param prompt Raw user input text
 * @param targetObjectFound Whether a concrete target object exists or was identified in context
 */
export function evaluateIntentSafety(
  prompt: string,
  targetObjectFound: boolean = true
): GuardEvaluationResult {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();

  // 1. Undo Detection (must take priority, safe history rewind)
  if (UNDO_ACTION_REGEX.test(lower)) {
    return {
      executionMode: 'UNDO',
      isSafeToExecute: true,
      isAdvisoryOrQuestion: false,
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 2. Explicit Preview Cancellation
  if (CANCEL_PREVIEW_REGEX.test(lower)) {
    return {
      executionMode: 'COMMAND',
      isSafeToExecute: true,
      isAdvisoryOrQuestion: false,
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 3. Questions specifically questioning optimization viability (e.g. "Có nên tối ưu phòng không?")
  const isQuestionAboutOptimization = OPTIMIZE_QUESTION_REGEX.test(lower);
  if (isQuestionAboutOptimization) {
    return {
      executionMode: 'THEORY',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: true,
      blockedActionReason:
        'Người dùng đang tham khảo ý kiến về việc tối ưu, không ra lệnh thực thi tối ưu ngay lập tức.',
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 4. Distinguish Polite Imperative Commands from Advisory Inquiries
  // Example polite command: "Bạn có thể giúp tôi di chuyển giường sang trái 50cm được không?"
  // Example advisory query: "Gương đối diện giường có sao không?", "Làm sao xử lý việc gương đối diện giường? Hãy gợi ý cách khắc phục và di chuyển trên 3D."
  const hasActionVerb = ACTION_VERBS_REGEX.test(lower);
  const hasTargetObject = FURNITURE_TARGET_REGEX.test(lower) || targetObjectFound;
  const hasSpecificMetric = /(?:\d+\s*(?:cm|m|độ|degree)|sang\s*(?:trái|phải)|lên|xuống|sát\s*tường)/i.test(lower);

  const isAskingWhyOrHow = /(?:tại\s*sao|vì\s*sao|làm\s*sao|như\s*thế\s*nào|thế\s*nào|ảnh\s*hưởng\s*gì|ý\s*nghĩa\s*gì|giải\s*thích|căn\s*cứ)/i.test(lower);
  const isAskingRemedyOrSuggest = /(?:cách\s*(?:khắc\s*phục|hóa\s*giải|xử\s*lý)|hóa\s*giải|gợi\s*ý|đề\s*xuất\s*cách)/i.test(lower);
  const isAskingIsItOk =
    /(?:(?:^|\s)(?:có\s*(?:sao|nên|hợp|phạm|tốt|xấu|ảnh\s*hưởng|vấn\s*đề\s*gì|bị\s*phạm)).*?(?:không|ko|chăng|\?))/i.test(lower) ||
    /(?:nếu.*?(?:có|phạm|được|sao).*?(?:không|ko|\?))/i.test(lower);

  // If the query asks for remedy or advice before acting:
  // e.g. "Làm sao xử lý việc gương đối diện giường? Hãy gợi ý cách khắc phục và di chuyển trên 3D."
  if (isAskingWhyOrHow || isAskingRemedyOrSuggest) {
    const isProposeRequest = /(?:gợi\s*ý|đề\s*xuất|phương\s*án|cách\s*bố\s*trí)/i.test(lower);
    return {
      executionMode: isProposeRequest ? 'PROPOSE' : 'THEORY',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: true,
      blockedActionReason:
        'Câu hỏi yêu cầu tư vấn/gợi ý khắc phục: chuyển sang chế độ tư vấn, không được tự ý thực thi thay đổi 3D.',
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // If the query asks "có sao không", "có nên không":
  if (isAskingIsItOk) {
    return {
      executionMode: 'THEORY',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: true,
      blockedActionReason:
        'Câu hỏi phong thủy lý thuyết: giải đáp thắc mắc của gia chủ, không được tự ý di chuyển đồ vật.',
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // Check if it's a polite command with a clear action and object
  // e.g. "Bạn có thể giúp tôi di chuyển giường sang trái 50cm được không?"
  const hasPoliteEnvelope = POLITE_PREFIX_REGEX.test(lower) || /(?:được\s*không|giúp\s*tôi|giúp\s*mình)\s*[?!.]*$/i.test(lower);
  const isPoliteCommand = hasPoliteEnvelope && hasActionVerb && hasTargetObject;

  // 5. Analysis Request (Read-only, e.g. "Phân tích phòng ngủ")
  if (
    /(?:phân\s*tích|đánh\s*giá|báo\s*cáo\s*phong\s*thủy|xem\s*phong\s*thủy|điểm\s*phong\s*thủy)/i.test(lower) &&
    !hasActionVerb
  ) {
    return {
      executionMode: 'ANALYZE',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: false,
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 6. Explicit Multiple Layout Proposal Request (Read-only / Ghost Preview, e.g. "3 phương án bố trí")
  if (/(?:các\s*phương\s*án|3\s*phương\s*án|nhiều\s*phương\s*án|so\s*sánh\s*bố\s*trí|đề\s*xuất\s*bố\s*trí)/i.test(lower)) {
    return {
      executionMode: 'PROPOSE',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: false,
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 7. Imperative Command Execution (e.g. "Di chuyển giường sang trái 50cm", "Xoay giường 90 độ", "Thêm bàn học", "Xóa tủ quần áo")
  const isDirectAction = hasActionVerb || isPoliteCommand;

  if (isDirectAction) {
    // Check if target is missing or ambiguous
    // Rule: Never fallback to objects[0]. If prompt has no target object, ask for clarification!
    if (!hasTargetObject) {
      return {
        executionMode: 'COMMAND',
        isSafeToExecute: false,
        isAdvisoryOrQuestion: false,
        blockedActionReason:
          'Không tìm thấy đối tượng mục tiêu rõ ràng trong phòng. Yêu cầu gia chủ chỉ định cụ thể (ví dụ: giường, tủ quần áo, bàn học,...).',
        sanitizedPrompt: p,
        hasAmbiguousTarget: true,
        requiresTargetClarification: true,
      };
    }

    return {
      executionMode: 'COMMAND',
      isSafeToExecute: true,
      isAdvisoryOrQuestion: false,
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 8. General question indicator fallback
  if (p.includes('?') || QUESTION_INDICATOR_REGEX.test(lower)) {
    return {
      executionMode: 'THEORY',
      isSafeToExecute: false,
      isAdvisoryOrQuestion: true,
      blockedActionReason: 'Câu hỏi lý thuyết phong thủy: cung cấp lời giải thích, không thay đổi 3D.',
      sanitizedPrompt: p,
      hasAmbiguousTarget: false,
      requiresTargetClarification: false,
    };
  }

  // 9. General chat fallback
  return {
    executionMode: 'CHAT',
    isSafeToExecute: false,
    isAdvisoryOrQuestion: false,
    sanitizedPrompt: p,
    hasAmbiguousTarget: false,
    requiresTargetClarification: false,
  };
}
