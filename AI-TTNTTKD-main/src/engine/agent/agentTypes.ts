// =============================================================================
// src/engine/agent/agentTypes.ts
// Phase P7 — Unified Gemini AI Agent & Safe Scene Execution Types
// =============================================================================

import { RoomConfig, RoomObject, RoomObjectType, UserFengShuiProfile } from '../../types/fengshui.js';
import { RuleResult } from '../core/ruleTypes.js';

export type UnifiedIntentCategory =
  | 'THEORY'    // Feng shui, architecture, general knowledge inquiries
  | 'ANALYZE'   // Audit/inspect current room layout without mutating
  | 'PROPOSE'   // Requesting layout suggestions or alternative placements
  | 'COMMAND'   // Direct order to modify scene (must be specific & validated)
  | 'UNDO'      // Undo last executed transaction
  | 'REDO'      // Redo previously undone transaction
  | 'CHAT';     // General casual dialogue

export type ToolCategory = 'READ_ONLY' | 'PROPOSAL' | 'EXECUTION';

export type ProposalStatus = 'pending' | 'claiming' | 'confirmed' | 'executed' | 'cancelled' | 'expired';

export interface SceneSnapshot {
  sceneVersion: string;
  objects: RoomObject[];
  roomConfig: RoomConfig;
  timestamp: string;
}

export interface ProposedChange {
  objectId: string;
  objectType: RoomObjectType;
  name: string;
  action: 'add' | 'move' | 'rotate' | 'delete' | 'optimize';
  currentPosition?: { x: number; y: number; z: number };
  currentRotationY?: number;
  currentDimensions?: { width: number; length: number; height: number };
  targetPosition?: { x: number; y: number; z: number };
  targetRotationY?: number;
  targetDimensions?: { width: number; length: number; height: number };
  reason?: string;
}

export interface SceneProposal {
  proposalId: string;
  sessionId: string;
  fnName: string;
  normalizedArgs: Record<string, unknown>;
  argsHash: string;
  sceneVersion: string;
  createdAt: number;
  expiresAt: number;
  status: ProposalStatus;
  title: string;
  description: string;
  changes: ProposedChange[];
  previewObjects: RoomObject[];
  ruleEvaluationBefore?: {
    totalRules: number;
    passCount: number;
    warnCount: number;
    failCount: number;
  };
  ruleEvaluationAfter?: {
    totalRules: number;
    passCount: number;
    warnCount: number;
    failCount: number;
  };
  requiresConfirmation: boolean;
}

export interface TransactionRecord {
  transactionId: string;
  proposalId: string;
  sessionId: string;
  fnName: string;
  createdAt: number;
  status: 'committed' | 'rolled_back' | 'undone';
  beforeSnapshot: SceneSnapshot;
  afterSnapshot: SceneSnapshot;
  changes: ProposedChange[];
  verificationResult: {
    passed: boolean;
    violations: string[];
  };
}

export interface ToolCallDecision {
  toolName: string;
  category: ToolCategory;
  allowed: boolean;
  reason?: string;
}

export interface AgentResponse {
  reply: string;
  intent: UnifiedIntentCategory;
  sessionId: string;
  sceneVersion: string;
  proposal?: SceneProposal;
  transaction?: TransactionRecord;
  previewState?: {
    active: boolean;
    proposalId?: string;
    previewObjects?: RoomObject[];
    changes?: ProposedChange[];
  };
  ruleResults?: RuleResult[];
  dataQualityIssues?: Array<{ id: string; title: string; description: string }>;
  suggestedFollowUps?: string[];
  toolActivity?: Array<{ name: string; category: ToolCategory; success: boolean }>;
  error?: string;
}

export interface UnifiedAgentConfig {
  maxTurns?: number;
  maxToolCallsPerTurn?: number;
  proposalTtlMs?: number;
}

