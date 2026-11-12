// =============================================================================
// src/services/serverGuard.ts
// Server-Side Intent Guard for Gemini Function-Calling Path.
//
// DESIGN PRINCIPLES:
// - Server never trusts client-sent intent labels.
// - Server re-evaluates the raw user message independently.
// - Write actions (move/rotate/add/delete/optimize) only proceed when
//   evaluateIntentSafety() confirms COMMAND or UNDO mode.
// - THEORY / ANALYZE / PROPOSE modes block all write function calls.
// - Ambiguous targets (requiresTargetClarification) block write calls.
// - Destructive actions (delete/optimize) require a confirmed proposal ID.
// =============================================================================

import { evaluateIntentSafety, GuardEvaluationResult, IntentExecutionMode } from './intentGuard.js';

/** Categories of function call risk */
export type FunctionCallRisk = 'read_only' | 'write' | 'destructive';

/** Map Gemini function names to risk category */
const FUNCTION_RISK_MAP: Record<string, FunctionCallRisk> = {
  add_furniture:        'write',
  move_furniture:       'write',
  rotate_furniture:     'write',
  delete_furniture:     'destructive',
  optimize_room_layout: 'destructive',
  undo_last_action:     'write',      // undo is safe — it reverts, does not originate mutation
};

export interface ServerGuardResult {
  /** Overall guard decision for the entire request */
  allowed: boolean;
  /** Guard evaluation on the user's raw message */
  guard: GuardEvaluationResult;
  /** Per-function-call decisions */
  decisions: FunctionCallDecision[];
  /** If blocked, human-readable reason to send back to the user */
  blockedReply?: string;
}

export interface FunctionCallDecision {
  fnName: string;
  risk: FunctionCallRisk;
  allowed: boolean;
  needsProposal?: boolean;
  reason?: string;
}

/**
 * Evaluate all Gemini-proposed function calls against the user's raw message.
 * Returns per-call decisions so the execution loop can skip rejected calls.
 *
 * @param userMessage  Raw text the user typed
 * @param proposedCalls Array of { name, args } from Gemini response
 * @param pendingConfirmations Active confirmation map (delete/optimize)
 * @param targetObjectFound Whether a specific object was identified in context
 */
export function evaluateGeminiFunctionCalls(
  userMessage: string,
  proposedCalls: Array<{ name: string; args: any }>,
  pendingConfirmations: Map<string, PendingConfirmation>,
  targetObjectFound: boolean = true
): ServerGuardResult {
  const guard = evaluateIntentSafety(userMessage, targetObjectFound);

  const decisions: FunctionCallDecision[] = [];

  for (const call of proposedCalls) {
    const fnName = call.name;
    const risk = FUNCTION_RISK_MAP[fnName] ?? 'write';

    // ── RULE 1: THEORY / PROPOSE modes block ALL write and destructive calls ──
    if (
      guard.isAdvisoryOrQuestion &&
      (guard.executionMode === 'THEORY' || guard.executionMode === 'PROPOSE' || guard.executionMode === 'ANALYZE' || guard.executionMode === 'CHAT')
    ) {
      if (risk === 'write' || risk === 'destructive') {
        decisions.push({
          fnName,
          risk,
          allowed: false,
          reason: `Người dùng đang hỏi lý thuyết/tư vấn (mode=${guard.executionMode}). Không được thực thi lệnh ghi lên scene 3D.`,
        });
        continue;
      }
    }

    // ── RULE 2: Ambiguous target blocks write calls ──
    if (guard.requiresTargetClarification && (risk === 'write' || risk === 'destructive')) {
      decisions.push({
        fnName,
        risk,
        allowed: false,
        reason: 'Mục tiêu thao tác không rõ ràng. Yêu cầu người dùng chỉ định đối tượng cụ thể.',
      });
      continue;
    }

    // ── RULE 3: Destructive calls require a confirmed proposal ──
    if (risk === 'destructive') {
      const proposalId = call.args?.proposalId as string | undefined;
      if (!proposalId) {
        // First-turn destructive action: allow entering proposal generation loop
        decisions.push({
          fnName,
          risk,
          allowed: true,
          needsProposal: true,
          reason: `Hành động "${fnName}" là thao tác phá huỷ (destructive). Cần tạo proposal và chờ xác nhận.`,
        });
        continue;
      }

      const confirmation = pendingConfirmations.get(proposalId);
      if (!confirmation) {
        decisions.push({
          fnName,
          risk,
          allowed: false,
          reason: `Proposal ID "${proposalId}" không tồn tại hoặc đã hết hạn.`,
        });
        continue;
      }

      if (confirmation.isExpired()) {
        pendingConfirmations.delete(proposalId);
        decisions.push({
          fnName,
          risk,
          allowed: false,
          reason: `Proposal ID "${proposalId}" đã hết hạn (${PROPOSAL_TTL_MS / 1000}s). Vui lòng tạo yêu cầu mới.`,
        });
        continue;
      }

      if (!confirmation.isConfirmed) {
        decisions.push({
          fnName,
          risk,
          allowed: false,
          reason: `Proposal "${proposalId}" chưa được xác nhận bởi người dùng.`,
        });
        continue;
      }

      // Confirmed and valid — allow, then consume it
      pendingConfirmations.delete(proposalId);
    }

    // ── RULE 4: Non-COMMAND non-UNDO modes should not execute write calls ──
    if (
      risk === 'write' &&
      guard.executionMode !== 'COMMAND' &&
      guard.executionMode !== 'UNDO'
    ) {
      decisions.push({
        fnName,
        risk,
        allowed: false,
        reason: `Chế độ thực thi là "${guard.executionMode}", không phải COMMAND hoặc UNDO. Không thể thực thi lệnh ghi.`,
      });
      continue;
    }

    // ── ALLOW ──
    decisions.push({ fnName, risk, allowed: true });
  }

  const anyBlocked = decisions.some((d) => !d.allowed);
  const allBlocked = decisions.every((d) => !d.allowed);

  // Build a user-facing reply if everything is blocked
  let blockedReply: string | undefined;
  if (allBlocked && decisions.length > 0) {
    if (guard.requiresTargetClarification) {
      blockedReply =
        'Vui lòng cho biết bạn muốn thao tác với đồ vật nào (ví dụ: giường, bàn học, tủ quần áo...) hoặc nhấp chọn đồ vật trực tiếp trên không gian 3D.';
    } else if (guard.isAdvisoryOrQuestion) {
      blockedReply = guard.blockedActionReason || 'Đây là câu hỏi tư vấn. Hệ thống giữ nguyên bố cục 3D và chỉ cung cấp lời khuyên.';
    } else {
      const firstReason = decisions.find((d) => !d.allowed)?.reason;
      blockedReply = firstReason || 'Thao tác không được phép thực thi trong trạng thái hiện tại.';
    }
  }

  return {
    allowed: !allBlocked,
    guard,
    decisions,
    blockedReply,
  };
}

// =============================================================================
// Confirmation Gate — Proposal-based safety for destructive actions
// =============================================================================

export const PROPOSAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PendingConfirmation {
  proposalId: string;
  fnName: string;
  args: any;
  /** Snapshot hash of the scene state when the proposal was created */
  sceneVersion: string;
  createdAt: number;
  isConfirmed: boolean;
  isExpired(): boolean;
}

/** In-memory store. For production: use Redis or DB with TTL. */
export const pendingConfirmations = new Map<string, PendingConfirmation>();

/**
 * Create a new destructive action proposal.
 * Returns the proposalId that the client must echo back to confirm.
 */
export function createDestructiveProposal(
  fnName: string,
  args: any,
  sceneVersion: string
): PendingConfirmation {
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();

  const proposal: PendingConfirmation = {
    proposalId,
    fnName,
    args,
    sceneVersion,
    createdAt,
    isConfirmed: false,
    isExpired() {
      return Date.now() - this.createdAt > PROPOSAL_TTL_MS;
    },
  };

  pendingConfirmations.set(proposalId, proposal);
  return proposal;
}

/**
 * Confirm a pending proposal with optional fnName, args, and session validation (Phase P7).
 * Returns false if proposal not found, expired, scene version mismatches, or parameters tampered.
 */
export function confirmProposal(
  proposalId: string,
  currentSceneVersion: string,
  options?: { fnName?: string; args?: Record<string, unknown>; sessionId?: string }
): { success: boolean; reason?: string } {
  const proposal = pendingConfirmations.get(proposalId);
  if (!proposal) {
    return { success: false, reason: 'Proposal không tồn tại hoặc đã hết hạn.' };
  }
  if (proposal.isExpired()) {
    pendingConfirmations.delete(proposalId);
    return { success: false, reason: 'Proposal đã hết thời hạn hiệu lực. Vui lòng tạo yêu cầu mới.' };
  }
  if (proposal.isConfirmed) {
    return { success: false, reason: 'Proposal đã được xác nhận trước đó. Không thể tái xác nhận.' };
  }
  if (options?.fnName && proposal.fnName !== options.fnName) {
    return { success: false, reason: `Hành động "${options.fnName}" không khớp với proposal "${proposal.fnName}".` };
  }
  if (options?.args && proposal.args) {
    const origStr = JSON.stringify(proposal.args);
    const newStr = JSON.stringify(options.args);
    if (origStr !== newStr) {
      return { success: false, reason: 'Tham số thực thi đã bị sửa đổi so với đề xuất ban đầu.' };
    }
  }
  if (proposal.sceneVersion !== currentSceneVersion) {
    pendingConfirmations.delete(proposalId);
    return {
      success: false,
      reason: 'Bố cục phòng đã thay đổi kể từ khi tạo proposal. Proposal không còn hợp lệ.',
    };
  }

  proposal.isConfirmed = true;
  return { success: true };
}

/**
 * Compute a comprehensive scene version hash incorporating object IDs, types, positions,
 * rotations, and dimensions (Phase P7 upgrade).
 */
export function computeSceneVersion(
  objects: Array<{
    id: string;
    type?: string;
    position?: { x: number; y?: number; z: number };
    rotation?: { x?: number; y?: number; z?: number };
    dimensions?: { width?: number; length?: number; height?: number };
  }>,
  roomConfig?: { width?: number; length?: number; height?: number; direction?: string }
): string {
  const normObjects = (objects || []).map((o) => {
    const x = o.position?.x !== undefined ? Number(o.position.x.toFixed(2)) : 0;
    const y = o.position?.y !== undefined ? Number(o.position.y.toFixed(2)) : 0;
    const z = o.position?.z !== undefined ? Number(o.position.z.toFixed(2)) : 0;
    const rx = o.rotation?.x !== undefined ? Number(o.rotation.x.toFixed(2)) : 0;
    const ry = o.rotation?.y !== undefined ? Number(o.rotation.y.toFixed(2)) : 0;
    const rz = o.rotation?.z !== undefined ? Number(o.rotation.z.toFixed(2)) : 0;
    const dw = o.dimensions?.width !== undefined ? Number(o.dimensions.width.toFixed(2)) : 0;
    const dl = o.dimensions?.length !== undefined ? Number(o.dimensions.length.toFixed(2)) : 0;
    const dh = o.dimensions?.height !== undefined ? Number(o.dimensions.height.toFixed(2)) : 0;
    return `${o.id}:${o.type || 'item'}:pos[${x},${y},${z}]:rot[${rx},${ry},${rz}]:dim[${dw},${dl},${dh}]`;
  }).sort().join('|');

  const roomSig = roomConfig
    ? `room[${roomConfig.width ?? 5},${roomConfig.length ?? 5.2},${roomConfig.height ?? 2.8},${roomConfig.direction ?? 'N'}]`
    : 'room[default]';

  const fullPayload = `${roomSig}#${normObjects}`;

  // 31-multiplier hash on full payload
  let hash = 0;
  for (let i = 0; i < fullPayload.length; i++) {
    hash = (hash * 31 + fullPayload.charCodeAt(i)) % 2147483647;
  }
  return `sv_${Math.abs(hash)}`;
}

