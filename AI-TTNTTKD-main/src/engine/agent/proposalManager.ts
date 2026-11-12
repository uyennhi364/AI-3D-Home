// =============================================================================
// src/engine/agent/proposalManager.ts
// Phase P7 — Secure Proposal Binding & Lifecycle Management
// =============================================================================

import { SceneProposal, ProposalStatus } from './agentTypes.js';
import { computeArgsHash } from './sceneHasher.js';

export const DEFAULT_PROPOSAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ValidateConfirmationInput {
  proposalId: string;
  sessionId?: string;
  fnName?: string;
  args?: Record<string, unknown>;
  currentSceneVersion: string;
}

export interface ValidationConfirmationResult {
  valid: boolean;
  proposal?: SceneProposal;
  error?: string;
  statusCode?: number;
}

export class ProposalManager {
  private proposals: Map<string, SceneProposal> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_PROPOSAL_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Creates a strictly bound proposal.
   */
  public createProposal(params: {
    sessionId: string;
    fnName: string;
    normalizedArgs: Record<string, unknown>;
    sceneVersion: string;
    title: string;
    description: string;
    changes: SceneProposal['changes'];
    previewObjects: SceneProposal['previewObjects'];
    requiresConfirmation?: boolean;
    ruleEvaluationBefore?: SceneProposal['ruleEvaluationBefore'];
    ruleEvaluationAfter?: SceneProposal['ruleEvaluationAfter'];
  }): SceneProposal {
    this.cleanExpired();

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const argsHash = computeArgsHash(params.normalizedArgs);

    const proposal: SceneProposal = {
      proposalId,
      sessionId: params.sessionId || 'default_session',
      fnName: params.fnName,
      normalizedArgs: params.normalizedArgs,
      argsHash,
      sceneVersion: params.sceneVersion,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      status: 'pending',
      title: params.title,
      description: params.description,
      changes: params.changes,
      previewObjects: params.previewObjects,
      requiresConfirmation: params.requiresConfirmation ?? true,
      ruleEvaluationBefore: params.ruleEvaluationBefore,
      ruleEvaluationAfter: params.ruleEvaluationAfter,
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Retrieves proposal by ID, checking expiration.
   */
  public getProposal(proposalId: string): SceneProposal | null {
    const prop = this.proposals.get(proposalId);
    if (!prop) return null;
    if (Date.now() > prop.expiresAt) {
      prop.status = 'expired';
      this.proposals.delete(proposalId);
      return null;
    }
    return prop;
  }

  /**
   * Strictly validates a confirmation request against all binding constraints.
   */
  public validateConfirmation(input: ValidateConfirmationInput): ValidationConfirmationResult {
    const { proposalId, sessionId, fnName, args, currentSceneVersion } = input;

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        valid: false,
        error: `Proposal ID "${proposalId}" không tồn tại hoặc đã bị hủy.`,
        statusCode: 404,
      };
    }

    // 1. Expiration Check
    if (Date.now() > proposal.expiresAt || proposal.status === 'expired') {
      proposal.status = 'expired';
      this.proposals.delete(proposalId);
      return {
        valid: false,
        error: `Proposal ID "${proposalId}" đã hết thời hạn hiệu lực (${this.ttlMs / 1000}s). Vui lòng tạo đề xuất mới.`,
        statusCode: 410,
      };
    }

    // 2. Reuse & Claim Check
    if (proposal.status === 'executed') {
      return {
        valid: false,
        error: `Proposal "${proposalId}" đã được thực thi trước đó. Không thể tái sử dụng.`,
        statusCode: 409,
      };
    }
    if (proposal.status === 'claiming') {
      return {
        valid: false,
        error: `Proposal "${proposalId}" đang được xử lý trong một giao dịch đồng thời khác.`,
        statusCode: 409,
      };
    }
    if (proposal.status === 'cancelled') {
      return {
        valid: false,
        error: `Proposal "${proposalId}" đã bị hủy trước đó.`,
        statusCode: 409,
      };
    }

    // 3. Session Binding Check
    if (sessionId && proposal.sessionId !== 'default_session' && proposal.sessionId !== sessionId) {
      return {
        valid: false,
        error: 'Phiên làm việc (Session) không khớp với phiên đã tạo proposal này.',
        statusCode: 403,
      };
    }

    // 4. Function Name Binding Check
    if (fnName && proposal.fnName !== fnName) {
      return {
        valid: false,
        error: `Hành động xác nhận ("${fnName}") không khớp với hành động đã đề xuất ("${proposal.fnName}").`,
        statusCode: 400,
      };
    }

    // 5. Arguments Binding Check (anti-tampering)
    if (args) {
      const incomingArgsHash = computeArgsHash(args);
      if (incomingArgsHash !== proposal.argsHash) {
        return {
          valid: false,
          error: 'Tham số thực thi đã bị sửa đổi so với phương án đã được đề xuất ban đầu.',
          statusCode: 400,
        };
      }
    }

    // 6. Scene Version Staleness Check
    if (proposal.sceneVersion !== currentSceneVersion) {
      proposal.status = 'cancelled';
      this.proposals.delete(proposalId);
      return {
        valid: false,
        error: 'Bố cục phòng 3D đã bị thay đổi kể từ khi tạo đề xuất. Đề xuất cũ không còn an toàn để áp dụng.',
        statusCode: 409,
      };
    }

    return {
      valid: true,
      proposal,
    };
  }

  /**
   * Atomically validates and claims a proposal for execution.
   * Ensures that concurrent requests cannot both claim the same proposal.
   */
  public atomicClaimProposal(input: ValidateConfirmationInput): ValidationConfirmationResult {
    const validation = this.validateConfirmation(input);
    if (!validation.valid || !validation.proposal) {
      return validation;
    }

    // Atomic claim: Transition status to 'claiming'
    if (validation.proposal.status !== 'pending' && validation.proposal.status !== 'confirmed') {
      return {
        valid: false,
        error: `Proposal "${input.proposalId}" không ở trạng thái sẵn sàng để thực thi (trạng thái: ${validation.proposal.status}).`,
        statusCode: 409,
      };
    }

    validation.proposal.status = 'claiming';
    return {
      valid: true,
      proposal: validation.proposal,
    };
  }

  /**
   * Releases a claimed proposal if transaction failed or rolled back.
   * Marks as cancelled and removes from active store so no corrupted proposal lingers.
   */
  public releaseClaim(proposalId: string, finalStatus: 'cancelled' | 'pending' = 'cancelled'): void {
    const prop = this.proposals.get(proposalId);
    if (!prop) return;
    prop.status = finalStatus;
    if (finalStatus === 'cancelled') {
      this.proposals.delete(proposalId);
    }
  }

  /**
   * Marks a proposal as executed.
   */
  public markExecuted(proposalId: string): boolean {
    const prop = this.proposals.get(proposalId);
    if (!prop) return false;
    prop.status = 'executed';
    // Remove to prevent replay attacks
    this.proposals.delete(proposalId);
    return true;
  }

  /**
   * Cancels a pending proposal.
   */
  public cancelProposal(proposalId: string): boolean {
    const prop = this.proposals.get(proposalId);
    if (!prop) return false;
    prop.status = 'cancelled';
    this.proposals.delete(proposalId);
    return true;
  }

  /**
   * Evicts expired proposals from memory.
   */
  public cleanExpired(): void {
    const now = Date.now();
    for (const [id, prop] of this.proposals.entries()) {
      if (now > prop.expiresAt) {
        prop.status = 'expired';
        this.proposals.delete(id);
      }
    }
  }

  public clearAll(): void {
    this.proposals.clear();
  }
}

// Global default singleton for server
export const globalProposalManager = new ProposalManager();

