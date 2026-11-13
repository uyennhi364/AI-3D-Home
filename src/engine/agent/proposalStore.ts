// =============================================================================
// src/engine/agent/proposalStore.ts
// Phase P9-M3 — Proposal Store Abstraction Interface
// =============================================================================
//
// DESIGN PRINCIPLES:
//  - Separates storage contract from business logic (ProposalManager)
//  - ProposalManager's Map<string, SceneProposal> is the default adapter
//  - Interface supports future adapters (e.g. Redis, DB) without touching business code
//  - All Proposal lifecycle semantics (TTL, sceneVersion, argsHash, claim, rollback)
//    remain exclusively in ProposalManager — the store only holds/retrieves raw proposals
//  - Current implementation: in-memory adapter wrapping the existing Map
//
// INVARIANTS PRESERVED:
//  - ProposalManager's validateConfirmation, atomicClaimProposal, markExecuted,
//    releaseClaim, cancelProposal — ALL unchanged
//  - Confirm Gate, TTL, concurrency claim, rollback and Undo/Redo — ALL unchanged
//  - globalProposalManager singleton continues to work as before
//  - Zero behavioral change — this is a pure interface extraction
// =============================================================================

import { SceneProposal } from './agentTypes.js';

// ---------------------------------------------------------------------------
// PROPOSAL STORE INTERFACE
// All implementations must satisfy this contract.
// ---------------------------------------------------------------------------
export interface IProposalStore {
  /**
   * Stores a proposal. Overwrites any existing entry with the same ID.
   */
  set(proposalId: string, proposal: SceneProposal): void;

  /**
   * Retrieves a proposal by ID, or null if not found.
   * Does NOT perform expiration or status checks — that is ProposalManager's job.
   */
  get(proposalId: string): SceneProposal | null;

  /**
   * Removes a proposal from the store.
   */
  delete(proposalId: string): boolean;

  /**
   * Returns all currently stored entries (for cleanup, inspection, testing).
   */
  entries(): IterableIterator<[string, SceneProposal]>;

  /**
   * Returns the number of proposals currently in the store.
   */
  size(): number;

  /**
   * Removes all proposals from the store.
   */
  clear(): void;
}

// ---------------------------------------------------------------------------
// IN-MEMORY ADAPTER (default)
// Wraps a plain Map<string, SceneProposal> — identical behaviour to the
// previous hardcoded Map in ProposalManager.
// ---------------------------------------------------------------------------
export class InMemoryProposalStore implements IProposalStore {
  private store: Map<string, SceneProposal> = new Map();

  set(proposalId: string, proposal: SceneProposal): void {
    this.store.set(proposalId, proposal);
  }

  get(proposalId: string): SceneProposal | null {
    return this.store.get(proposalId) ?? null;
  }

  delete(proposalId: string): boolean {
    return this.store.delete(proposalId);
  }

  entries(): IterableIterator<[string, SceneProposal]> {
    return this.store.entries();
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// STORE FACTORY
// Returns the default in-memory store.
// Future: could read config to return a Redis or DB adapter.
// ---------------------------------------------------------------------------
export function createDefaultProposalStore(): IProposalStore {
  return new InMemoryProposalStore();
}

