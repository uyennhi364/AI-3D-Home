// =============================================================================
// src/engine/agent/transactionManager.ts
// Phase P7 — Safe Transaction Engine with Postcondition Verification & Rollback
// =============================================================================

import { RoomConfig, RoomObject } from '../../types/fengshui.js';
import { SceneProposal, TransactionRecord, SceneSnapshot } from './agentTypes.js';
import { computeRobustSceneVersion } from './sceneHasher.js';
import { ProposalManager } from './proposalManager.js';
import { checkOBBCollisionV2 } from '../geometryEngine.js';

export interface ExecuteTransactionResult {
  success: boolean;
  transaction?: TransactionRecord;
  updatedObjects?: RoomObject[];
  error?: string;
  statusCode?: number;
}

export interface UndoResult {
  success: boolean;
  restoredObjects?: RoomObject[];
  transactionId?: string;
  error?: string;
}

export interface RedoResult {
  success: boolean;
  restoredObjects?: RoomObject[];
  transactionId?: string;
  error?: string;
}

export class TransactionManager {
  private historyPast: Map<string, TransactionRecord[]> = new Map();
  private historyFuture: Map<string, TransactionRecord[]> = new Map();

  private getPastStack(sessionId: string): TransactionRecord[] {
    if (!this.historyPast.has(sessionId)) {
      this.historyPast.set(sessionId, []);
    }
    return this.historyPast.get(sessionId)!;
  }

  private getFutureStack(sessionId: string): TransactionRecord[] {
    if (!this.historyFuture.has(sessionId)) {
      this.historyFuture.set(sessionId, []);
    }
    return this.historyFuture.get(sessionId)!;
  }

  /**
   * Executes a confirmed proposal as an atomic transaction.
   * If any postcondition fails (collision, out-of-bounds, invalid WC), rolls back.
   */
  public executeProposalTransaction(
    proposal: SceneProposal,
    currentObjects: RoomObject[],
    roomConfig: RoomConfig,
    proposalManager: ProposalManager
  ): ExecuteTransactionResult {
    const sessionId = proposal.sessionId || 'default_session';
    const currentSceneVersion = computeRobustSceneVersion(currentObjects, roomConfig);

    // 1. Double-check proposal validity and atomically claim it
    const validation = proposalManager.atomicClaimProposal({
      proposalId: proposal.proposalId,
      sessionId,
      fnName: proposal.fnName,
      args: proposal.normalizedArgs,
      currentSceneVersion,
    });

    if (!validation.valid || !validation.proposal) {
      return {
        success: false,
        error: validation.error || 'Xác thực proposal thất bại.',
        statusCode: validation.statusCode || 400,
      };
    }

    // 2. Capture Before Snapshot
    const beforeSnapshot: SceneSnapshot = {
      sceneVersion: currentSceneVersion,
      objects: JSON.parse(JSON.stringify(currentObjects)),
      roomConfig: { ...roomConfig },
      timestamp: new Date().toISOString(),
    };

    // 3. Apply Operations
    let workingObjects: RoomObject[] = JSON.parse(JSON.stringify(currentObjects));

    for (const change of proposal.changes) {
      switch (change.action) {
        case 'add': {
          const newObj: RoomObject = {
            id: change.objectId,
            type: change.objectType,
            name: change.name,
            position: change.targetPosition || { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: change.targetRotationY || 0, z: 0 },
            dimensions: change.targetDimensions || { width: 1, length: 1, height: 1 },
          };
          workingObjects.push(newObj);
          break;
        }

        case 'move': {
          const target = workingObjects.find((o) => o.id === change.objectId);
          if (target && change.targetPosition) {
            target.position = { ...change.targetPosition };
          }
          break;
        }

        case 'rotate': {
          const target = workingObjects.find((o) => o.id === change.objectId);
          if (target && change.targetRotationY !== undefined) {
            target.rotation = { ...target.rotation, y: change.targetRotationY };
          }
          break;
        }

        case 'delete': {
          workingObjects = workingObjects.filter((o) => o.id !== change.objectId);
          break;
        }

        case 'optimize': {
          // If proposal provided full previewObjects, adopt them
          if (proposal.previewObjects && proposal.previewObjects.length > 0) {
            workingObjects = JSON.parse(JSON.stringify(proposal.previewObjects));
          }
          break;
        }
      }
    }

    // 4. Verify Postconditions
    const violations = this.verifyPostconditions(workingObjects, roomConfig);
    if (violations.length > 0) {
      // ROLLBACK TO BEFORE SNAPSHOT & Release Proposal as cancelled
      proposalManager.releaseClaim(proposal.proposalId, 'cancelled');
      return {
        success: false,
        error: `Thực thi bị hủy bỏ (Rollback) do vi phạm an toàn không gian: ${violations.join('; ')}`,
        statusCode: 422,
      };
    }

    // 5. Commit Transaction
    const afterSceneVersion = computeRobustSceneVersion(workingObjects, roomConfig);
    const afterSnapshot: SceneSnapshot = {
      sceneVersion: afterSceneVersion,
      objects: JSON.parse(JSON.stringify(workingObjects)),
      roomConfig: { ...roomConfig },
      timestamp: new Date().toISOString(),
    };

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const transactionRecord: TransactionRecord = {
      transactionId,
      proposalId: proposal.proposalId,
      sessionId,
      fnName: proposal.fnName,
      createdAt: Date.now(),
      status: 'committed',
      beforeSnapshot,
      afterSnapshot,
      changes: proposal.changes,
      verificationResult: {
        passed: true,
        violations: [],
      },
    };

    // Push to Past stack, clear Future stack
    this.getPastStack(sessionId).push(transactionRecord);
    this.getFutureStack(sessionId).length = 0;

    // Mark proposal executed so it cannot be re-used
    proposalManager.markExecuted(proposal.proposalId);

    return {
      success: true,
      transaction: transactionRecord,
      updatedObjects: workingObjects,
    };
  }

  /**
   * Reverts the latest transaction in the session.
   */
  public undo(sessionId: string = 'default_session'): UndoResult {
    const past = this.getPastStack(sessionId);
    if (past.length === 0) {
      return { success: false, error: 'Không có thao tác nào để hoàn tác.' };
    }

    const tx = past.pop()!;
    tx.status = 'undone';

    // Push into future stack for redo
    this.getFutureStack(sessionId).push(tx);

    return {
      success: true,
      restoredObjects: JSON.parse(JSON.stringify(tx.beforeSnapshot.objects)),
      transactionId: tx.transactionId,
    };
  }

  /**
   * Redoes the most recently undone transaction in the session.
   */
  public redo(sessionId: string = 'default_session', currentObjects: RoomObject[], roomConfig: RoomConfig): RedoResult {
    const future = this.getFutureStack(sessionId);
    if (future.length === 0) {
      return { success: false, error: 'Không có thao tác nào để làm lại.' };
    }

    const tx = future.pop()!;
    const currentVer = computeRobustSceneVersion(currentObjects, roomConfig);

    // Guard: Current scene must match beforeSnapshot version
    if (currentVer !== tx.beforeSnapshot.sceneVersion) {
      return {
        success: false,
        error: 'Bố cục phòng đã thay đổi từ lần hoàn tác trước, không thể làm lại thao tác này.',
      };
    }

    tx.status = 'committed';
    this.getPastStack(sessionId).push(tx);

    return {
      success: true,
      restoredObjects: JSON.parse(JSON.stringify(tx.afterSnapshot.objects)),
      transactionId: tx.transactionId,
    };
  }

  /**
   * Verifies spatial safety postconditions.
   */
  public verifyPostconditions(objects: RoomObject[], roomConfig: RoomConfig): string[] {
    const violations: string[] = [];
    const halfW = (roomConfig.width || 5.0) / 2;
    const halfL = (roomConfig.length || 5.2) / 2;
    const NON_COLLIDING = ['rug', 'plant', 'door', 'window', 'curtain', 'painting'];

    // 1. Boundary checks
    for (const obj of objects) {
      const hw = (obj.dimensions?.width || 0.5) / 2;
      const hl = (obj.dimensions?.length || 0.5) / 2;
      const x = obj.position.x;
      const z = obj.position.z;

      // Allow 15cm margin for tolerance
      if (Math.abs(x) - hw > halfW + 0.15 || Math.abs(z) - hl > halfL + 0.15) {
        violations.push(`Đồ vật "${obj.name}" (${obj.id}) bị vượt ra ngoài ranh giới tường phòng`);
      }
    }

    // 2. WC count check (max 1 WC inside bedroom)
    const wcCount = objects.filter((o) => o.type === 'wc').length;
    if (wcCount > 1) {
      violations.push(`Phòng ngủ chỉ được phép có tối đa 1 khu vực WC khép kín (hiện có: ${wcCount})`);
    }

    // 3. Collision check between solid furniture items
    const solidObjs = objects.filter((o) => !NON_COLLIDING.includes(o.type));
    for (let i = 0; i < solidObjs.length; i++) {
      for (let j = i + 1; j < solidObjs.length; j++) {
        const a = solidObjs[i];
        const b = solidObjs[j];

        const obbA = {
          center: { x: a.position.x, z: a.position.z },
          halfWidth: Math.max(0.05, (a.dimensions.width / 2) - 0.03),
          halfLength: Math.max(0.05, (a.dimensions.length / 2) - 0.03),
          angleRad: a.rotation.y,
        };

        const obbB = {
          center: { x: b.position.x, z: b.position.z },
          halfWidth: Math.max(0.05, (b.dimensions.width / 2) - 0.03),
          halfLength: Math.max(0.05, (b.dimensions.length / 2) - 0.03),
          angleRad: b.rotation.y,
        };

        if (checkOBBCollisionV2(obbA, obbB)) {
          violations.push(`Va chạm hình học nghiêm trọng giữa "${a.name}" và "${b.name}"`);
        }
      }
    }

    return violations;
  }

  public clearSession(sessionId: string): void {
    this.historyPast.delete(sessionId);
    this.historyFuture.delete(sessionId);
  }

  public getLatestTransaction(sessionId: string = 'default_session'): TransactionRecord | null {
    const past = this.getPastStack(sessionId);
    return past.length > 0 ? past[past.length - 1] : null;
  }
}

export const globalTransactionManager = new TransactionManager();
