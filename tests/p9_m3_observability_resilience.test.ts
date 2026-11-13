// =============================================================================
// tests/p9_m3_observability_resilience.test.ts
// Phase P9-M3 — Observability & Resilience Test Suite
// =============================================================================
//
// TEST COVERAGE:
//  Domain 1: Structured JSON Logger (redaction, format, levels, requestId)
//  Domain 2: Request Context (timing, start/end events, error events)
//  Domain 3: StorageResilience (quota, versioning, migration, error types)
//  Domain 4: ProposalStore Interface (InMemoryProposalStore contract)
//  Domain 5: Proposal Lifecycle + Store Integration (create, claim, executed, rollback)
//  Domain 6: Architecture Invariants (Master Preset, overallScore preserved)
//
// INVARIANTS:
//  - Master Preset default: 51/100; Bed: 30; Optimized: 89/100
//  - P5 overallScore computation: UNCHANGED
//  - Proposal Confirm Gate: 2-turn, TTL, sceneVersion — UNCHANGED
// =============================================================================

import { strict as assert } from 'node:assert';

// ---------------------------------------------------------------------------
// MODULE IMPORTS
// ---------------------------------------------------------------------------
import {
  Logger,
  getLogger,
  generateRequestId,
  createRequestContext,
  redactValue,
  redactObject,
} from '../src/services/logger.js';

import {
  safeLocalStorageSet,
  safeLocalStorageGet,
  registerMigrator,
  migrateAndLoad,
  isStorageLow,
  getStorageStatus,
  estimateStorageQuota,
} from '../src/services/storageResilience.js';

import {
  IProposalStore,
  InMemoryProposalStore,
  createDefaultProposalStore,
} from '../src/engine/agent/proposalStore.js';

import { ProposalManager } from '../src/engine/agent/proposalManager.js';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules.js';
import { generateOptimizedLayout } from '../src/engine/layoutOptimizer.js';
import { getUserFengShuiProfile } from '../src/engine/batTrach.js';
import { ROOM_PRESETS } from '../src/engine/presets.js';
import {
  getSavedLayouts,
  saveLayoutToLocalSafe,
  saveLayoutToLocal,
  deleteSavedLayout,
} from '../src/engine/layoutStorage.js';

// ---------------------------------------------------------------------------
// TEST UTILITIES
// ---------------------------------------------------------------------------
let passCount = 0;
let failCount = 0;
let recordedCount = 0;
const results: { name: string; status: 'PASS' | 'FAIL' | 'RECORDED'; error?: string }[] = [];

function pass(name: string) {
  passCount++;
  results.push({ name, status: 'PASS' });
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name: string, err: unknown) {
  failCount++;
  const errMsg = err instanceof Error ? err.message : String(err);
  results.push({ name, status: 'FAIL', error: errMsg });
  console.error(`  ❌ [FAIL] ${name}: ${errMsg}`);
}

function recorded(name: string, value: unknown) {
  recordedCount++;
  results.push({ name, status: 'RECORDED' });
  console.log(`  [RECORDED] ${name} ->`, JSON.stringify(value).slice(0, 120));
}

// ---------------------------------------------------------------------------
// LOG CAPTURE (intercept stdout for unit tests)
// ---------------------------------------------------------------------------
function captureLog(fn: () => void): string[] {
  const lines: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array, ...args: any[]) => {
    if (typeof chunk === 'string') lines.push(chunk.trim());
    return original(chunk, ...args);
  };
  try {
    fn();
  } finally {
    process.stdout.write = original;
  }
  return lines.filter((l) => l.length > 0);
}

// ---------------------------------------------------------------------------
// MOCK localStorage (Node.js doesn't have it)
// ---------------------------------------------------------------------------
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  private quotaBytes: number;
  private usedBytes: number = 0;

  constructor(quotaBytes: number = 5 * 1024 * 1024) {
    this.quotaBytes = quotaBytes;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const bytes = (key.length + value.length) * 2;
    if (this.usedBytes + bytes > this.quotaBytes) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    // Remove old value bytes if overwriting
    if (this.store.has(key)) {
      const old = this.store.get(key)!;
      this.usedBytes -= (key.length + old.length) * 2;
    }
    this.store.set(key, value);
    this.usedBytes += bytes;
  }

  removeItem(key: string): void {
    const val = this.store.get(key);
    if (val !== undefined) {
      this.usedBytes -= (key.length + val.length) * 2;
      this.store.delete(key);
    }
  }

  get length(): number { return this.store.size; }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  clear(): void {
    this.store.clear();
    this.usedBytes = 0;
  }
}

function withMockStorage<T>(quota: number, fn: (ls: MockLocalStorage) => T): T {
  const mock = new MockLocalStorage(quota);
  (global as any).window = { localStorage: mock };
  (global as any).localStorage = mock;
  try {
    return fn(mock);
  } finally {
    delete (global as any).window;
    delete (global as any).localStorage;
  }
}

// ---------------------------------------------------------------------------
// DOMAIN 1: Structured JSON Logger
// ---------------------------------------------------------------------------
console.log('\n--- Domain 1: Structured JSON Logger ---');

try {
  const lines = captureLog(() => {
    const logger = getLogger('test.module');
    logger.info('req_001', 'test_event', { userId: 'u1', score: 51 });
  });
  assert.ok(lines.length > 0, 'Should produce output');
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.level, 'INFO');
  assert.strictEqual(parsed.module, 'test.module');
  assert.strictEqual(parsed.event, 'test_event');
  assert.strictEqual(parsed.requestId, 'req_001');
  assert.ok(parsed.timestamp, 'Should have timestamp');
  assert.strictEqual(typeof parsed.timestamp, 'string');
  pass('TC-LOG-01: INFO log produces structured JSON with correct fields');
} catch (e) { fail('TC-LOG-01: INFO log produces structured JSON with correct fields', e); }

try {
  const lines = captureLog(() => {
    const logger = getLogger('test.warn');
    logger.warn('req_002', 'warn_event', { detail: 'something' });
  });
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.level, 'WARN');
  assert.strictEqual(parsed.event, 'warn_event');
  pass('TC-LOG-02: WARN log has correct level field');
} catch (e) { fail('TC-LOG-02: WARN log has correct level field', e); }

try {
  const lines = captureLog(() => {
    const logger = getLogger('test.error');
    logger.error('req_003', 'error_event', { code: 'E500' });
  });
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.level, 'ERROR');
  pass('TC-LOG-03: ERROR log has correct level field');
} catch (e) { fail('TC-LOG-03: ERROR log has correct level field', e); }

try {
  const reqId = generateRequestId();
  assert.ok(reqId.startsWith('req_'), 'Should start with req_');
  assert.ok(reqId.length > 10, 'Should be reasonably long');
  const reqId2 = generateRequestId();
  assert.notStrictEqual(reqId, reqId2, 'Each requestId must be unique');
  pass('TC-LOG-04: generateRequestId produces unique IDs');
} catch (e) { fail('TC-LOG-04: generateRequestId produces unique IDs', e); }

try {
  // Logger singleton
  const a = getLogger('singleton.test');
  const b = getLogger('singleton.test');
  assert.strictEqual(a, b, 'Same module name should return same Logger instance');
  pass('TC-LOG-05: getLogger returns singleton per module name');
} catch (e) { fail('TC-LOG-05: getLogger returns singleton per module name', e); }

// ---------------------------------------------------------------------------
// DOMAIN 2: Redaction
// ---------------------------------------------------------------------------
console.log('\n--- Domain 2: Redaction ---');

try {
  const redacted = redactValue('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456');
  assert.ok(redacted.includes('REDACTED'), 'Long key should be redacted');
  assert.ok(!redacted.includes('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456'), 'Full key must not appear');
  pass('TC-REDACT-01: Long API key value is redacted');
} catch (e) { fail('TC-REDACT-01: Long API key value is redacted', e); }

try {
  const redacted = redactValue('short');
  assert.ok(redacted.includes('REDACTED'), 'Short key should be fully redacted');
  pass('TC-REDACT-02: Short secret value is fully masked');
} catch (e) { fail('TC-REDACT-02: Short secret value is fully masked', e); }

try {
  const obj = {
    apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456',
    Authorization: 'Bearer tok_secret_abc123def456',
    username: 'alice',
    score: 89,
    nested: {
      secretToken: 'hidden_value_here_long',
      visible: 'keep_me',
    },
  };
  const sanitized = redactObject(obj) as any;
  assert.ok(sanitized.apiKey.includes('REDACTED'), 'apiKey should be redacted');
  assert.ok(sanitized.Authorization.includes('REDACTED'), 'Authorization should be redacted');
  assert.strictEqual(sanitized.username, 'alice', 'username should NOT be redacted');
  assert.strictEqual(sanitized.score, 89, 'score should NOT be redacted');
  assert.ok(sanitized.nested.secretToken.includes('REDACTED'), 'nested secretToken should be redacted');
  assert.strictEqual(sanitized.nested.visible, 'keep_me', 'nested visible should NOT be redacted');
  pass('TC-REDACT-03: redactObject sanitizes nested secret fields, preserves normal fields');
} catch (e) { fail('TC-REDACT-03: redactObject sanitizes nested secret fields, preserves normal fields', e); }

try {
  const lines = captureLog(() => {
    const logger = getLogger('test.redact.log');
    logger.info('req_x', 'api_call', {
      'x-gemini-api-key': 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456',
      path: '/api/chat',
    });
  });
  const parsed = JSON.parse(lines[0]);
  assert.ok(parsed['x-gemini-api-key'].includes('REDACTED'), 'x-gemini-api-key must be redacted in log output');
  assert.ok(!parsed['x-gemini-api-key'].includes('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456'), 'Full key must not appear in log');
  pass('TC-REDACT-04: x-gemini-api-key is redacted in structured JSON log output');
} catch (e) { fail('TC-REDACT-04: x-gemini-api-key is redacted in structured JSON log output', e); }

try {
  const ctx = createRequestContext('test.ctx', 'req_ctx_001');
  const lines = captureLog(() => {
    ctx.logStart('request_start', { path: '/api/chat' });
  });
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.requestId, 'req_ctx_001');
  assert.strictEqual(parsed.event, 'request_start');
  assert.strictEqual(parsed.path, '/api/chat');
  pass('TC-REDACT-05: createRequestContext logStart emits correct structured entry');
} catch (e) { fail('TC-REDACT-05: createRequestContext logStart emits correct structured entry', e); }

try {
  const ctx = createRequestContext('test.ctx2', 'req_ctx_002');
  // Simulate elapsed time
  const lines = captureLog(() => {
    ctx.logEnd('request_end', 200, { result: 'ok' });
  });
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.statusCode, 200);
  assert.ok(typeof parsed.durationMs === 'number', 'durationMs should be a number');
  pass('TC-REDACT-06: createRequestContext logEnd emits durationMs and statusCode');
} catch (e) { fail('TC-REDACT-06: createRequestContext logEnd emits durationMs and statusCode', e); }

// ---------------------------------------------------------------------------
// DOMAIN 3: Storage Resilience
// ---------------------------------------------------------------------------
console.log('\n--- Domain 3: Storage Resilience ---');

try {
  withMockStorage(1024 * 1024, (ls) => {
    const result = safeLocalStorageSet('test.key', { a: 1, b: 'hello' }, 1);
    assert.ok(result.ok, 'Write should succeed with enough quota');
    const item = ls.getItem('test.key');
    assert.ok(item !== null, 'Item should be in storage');
    const parsed = JSON.parse(item!);
    assert.strictEqual(parsed.v, 1, 'Version should be 1');
    assert.deepStrictEqual(parsed.data, { a: 1, b: 'hello' });
  });
  pass('TC-STOR-01: safeLocalStorageSet writes versioned envelope successfully');
} catch (e) { fail('TC-STOR-01: safeLocalStorageSet writes versioned envelope successfully', e); }

try {
  withMockStorage(100, (ls) => {
    // Write a small item first
    ls.setItem('filler', 'x'.repeat(40));
    // Now try to write something that exceeds remaining quota
    const bigData = { payload: 'x'.repeat(200) };
    const result = safeLocalStorageSet('overflow.key', bigData, 1);
    assert.ok(!result.ok, 'Write should fail when quota exceeded');
    assert.strictEqual((result as any).error, 'quota_exceeded');
    assert.ok((result as any).message.includes('localStorage') || (result as any).message.includes('đầy'));
  });
  pass('TC-STOR-02: safeLocalStorageSet returns quota_exceeded error when storage is full');
} catch (e) { fail('TC-STOR-02: safeLocalStorageSet returns quota_exceeded error when storage is full', e); }

try {
  withMockStorage(1024 * 1024, (ls) => {
    ls.setItem('test.read', JSON.stringify({ v: 2, savedAt: '2026-01-01T00:00:00Z', data: { score: 51 } }));
    const result = safeLocalStorageGet<{ score: number }>('test.read', 1);
    assert.ok(result.ok);
    assert.ok(result.data !== null);
    assert.strictEqual(result.data!.v, 2);
    assert.strictEqual(result.data!.data.score, 51);
  });
  pass('TC-STOR-03: safeLocalStorageGet reads and validates versioned envelope');
} catch (e) { fail('TC-STOR-03: safeLocalStorageGet reads and validates versioned envelope', e); }

try {
  withMockStorage(1024 * 1024, (ls) => {
    ls.setItem('corrupt.key', 'NOT_JSON{{{');
    const result = safeLocalStorageGet<unknown>('corrupt.key');
    assert.ok(!result.ok, 'Should fail on corrupt JSON');
    assert.strictEqual((result as any).error, 'parse_error');
  });
  pass('TC-STOR-04: safeLocalStorageGet returns parse_error for corrupt JSON');
} catch (e) { fail('TC-STOR-04: safeLocalStorageGet returns parse_error for corrupt JSON', e); }

try {
  withMockStorage(1024 * 1024, (ls) => {
    // Store v0 data (legacy — no envelope)
    ls.setItem('legacy.key', JSON.stringify([{ id: 'layout_1', name: 'Old Layout' }]));

    registerMigrator('legacy.key', {
      fromVersion: 0,
      toVersion: 1,
      migrate: (data: unknown) => {
        const arr = data as any[];
        return arr.map((item) => ({ ...item, migrated: true, schemaVersion: 1 }));
      },
    });

    const result = migrateAndLoad<any[]>('legacy.key', 1);
    assert.ok(result.ok, 'Migration should succeed');
    assert.ok(Array.isArray(result.data), 'Result should be array');
    assert.strictEqual(result.data![0].migrated, true, 'Item should be migrated');
  });
  pass('TC-STOR-05: migrateAndLoad applies v0→v1 migrator correctly');
} catch (e) { fail('TC-STOR-05: migrateAndLoad applies v0→v1 migrator correctly', e); }

try {
  withMockStorage(1024 * 1024, (_ls) => {
    const result = safeLocalStorageGet<unknown>('nonexistent.key');
    assert.ok(result.ok, 'Missing key should return ok:true');
    assert.strictEqual(result.data, null, 'Missing key should return null data');
  });
  pass('TC-STOR-06: safeLocalStorageGet returns null for nonexistent key (not error)');
} catch (e) { fail('TC-STOR-06: safeLocalStorageGet returns null for nonexistent key (not error)', e); }

try {
  // Server-side context (no window)
  const originalWindow = (global as any).window;
  delete (global as any).window;
  delete (global as any).localStorage;
  const result = safeLocalStorageSet('test', { x: 1 });
  assert.ok(!result.ok, 'Should fail in server context');
  assert.strictEqual((result as any).error, 'unknown');
  if (originalWindow !== undefined) (global as any).window = originalWindow;
  pass('TC-STOR-07: safeLocalStorageSet gracefully fails in server-side (no window) context');
} catch (e) { fail('TC-STOR-07: safeLocalStorageSet gracefully fails in server-side (no window) context', e); }

// ---------------------------------------------------------------------------
// DOMAIN 4: ProposalStore Interface Contract
// ---------------------------------------------------------------------------
console.log('\n--- Domain 4: ProposalStore Interface Contract ---');

function makeMockProposal(id: string): any {
  return {
    proposalId: id,
    sessionId: 'test_session',
    fnName: 'move_furniture',
    normalizedArgs: { objectId: 'bed_1', dx: 0.5 },
    argsHash: 'hash_abc',
    sceneVersion: 'sv_001',
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000,
    status: 'pending',
    title: 'Di chuyển giường',
    description: 'Di chuyển giường 50cm',
    changes: [],
    previewObjects: [],
    requiresConfirmation: true,
  };
}

try {
  const store: IProposalStore = new InMemoryProposalStore();
  const p = makeMockProposal('prop_001');
  store.set('prop_001', p);
  const retrieved = store.get('prop_001');
  assert.ok(retrieved !== null, 'Should retrieve stored proposal');
  assert.strictEqual(retrieved!.proposalId, 'prop_001');
  assert.strictEqual(store.size(), 1);
  pass('TC-STORE-01: InMemoryProposalStore set/get/size works correctly');
} catch (e) { fail('TC-STORE-01: InMemoryProposalStore set/get/size works correctly', e); }

try {
  const store: IProposalStore = new InMemoryProposalStore();
  store.set('prop_002', makeMockProposal('prop_002'));
  const deleted = store.delete('prop_002');
  assert.ok(deleted, 'delete should return true');
  assert.strictEqual(store.get('prop_002'), null, 'Deleted proposal should not be retrievable');
  assert.strictEqual(store.size(), 0);
  pass('TC-STORE-02: InMemoryProposalStore delete removes proposal correctly');
} catch (e) { fail('TC-STORE-02: InMemoryProposalStore delete removes proposal correctly', e); }

try {
  const store: IProposalStore = new InMemoryProposalStore();
  store.set('prop_003', makeMockProposal('prop_003'));
  store.set('prop_004', makeMockProposal('prop_004'));
  const entries = Array.from(store.entries());
  assert.strictEqual(entries.length, 2);
  store.clear();
  assert.strictEqual(store.size(), 0);
  pass('TC-STORE-03: InMemoryProposalStore entries/clear works correctly');
} catch (e) { fail('TC-STORE-03: InMemoryProposalStore entries/clear works correctly', e); }

try {
  const defaultStore = createDefaultProposalStore();
  assert.ok(defaultStore !== null);
  assert.strictEqual(typeof defaultStore.set, 'function');
  assert.strictEqual(typeof defaultStore.get, 'function');
  assert.strictEqual(typeof defaultStore.delete, 'function');
  assert.strictEqual(typeof defaultStore.entries, 'function');
  assert.strictEqual(typeof defaultStore.size, 'function');
  assert.strictEqual(typeof defaultStore.clear, 'function');
  pass('TC-STORE-04: createDefaultProposalStore returns IProposalStore-compliant object');
} catch (e) { fail('TC-STORE-04: createDefaultProposalStore returns IProposalStore-compliant object', e); }

try {
  const store: IProposalStore = new InMemoryProposalStore();
  const deleted = store.delete('nonexistent_key');
  assert.strictEqual(deleted, false, 'delete of non-existent key should return false');
  assert.strictEqual(store.get('nonexistent_key'), null, 'get of non-existent key should return null');
  pass('TC-STORE-05: InMemoryProposalStore handles non-existent keys gracefully');
} catch (e) { fail('TC-STORE-05: InMemoryProposalStore handles non-existent keys gracefully', e); }

// ---------------------------------------------------------------------------
// DOMAIN 5: Proposal Lifecycle + Concurrency Invariants
// ---------------------------------------------------------------------------
console.log('\n--- Domain 5: Proposal Lifecycle & Invariants ---');

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_1',
    fnName: 'move_furniture',
    normalizedArgs: { objectId: 'bed_1', dx: 0.5 },
    sceneVersion: 'sv_001',
    title: 'Di chuyển giường',
    description: 'Test proposal',
    changes: [],
    previewObjects: [],
  });
  assert.ok(proposal.proposalId.startsWith('prop_'), 'ProposalId should start with prop_');
  assert.strictEqual(proposal.status, 'pending');
  assert.ok(proposal.argsHash, 'argsHash should be set');
  assert.ok(proposal.expiresAt > Date.now(), 'expiresAt should be in the future');
  pass('TC-LIFE-01: ProposalManager.createProposal creates valid pending proposal with argsHash and TTL');
} catch (e) { fail('TC-LIFE-01: ProposalManager.createProposal creates valid pending proposal with argsHash and TTL', e); }

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_2',
    fnName: 'delete_furniture',
    normalizedArgs: { objectId: 'mirror_1' },
    sceneVersion: 'sv_002',
    title: 'Xóa gương',
    description: 'Test',
    changes: [],
    previewObjects: [],
  });

  // Atomic claim
  const claimed = pm.atomicClaimProposal({
    proposalId: proposal.proposalId,
    sessionId: 'sess_2',
    fnName: 'delete_furniture',
    args: { objectId: 'mirror_1' },
    currentSceneVersion: 'sv_002',
  });
  assert.ok(claimed.valid, 'Claim should succeed');
  assert.strictEqual(claimed.proposal!.status, 'claiming');

  // Second claim attempt on claiming proposal should fail
  const secondClaim = pm.atomicClaimProposal({
    proposalId: proposal.proposalId,
    sessionId: 'sess_2',
    fnName: 'delete_furniture',
    args: { objectId: 'mirror_1' },
    currentSceneVersion: 'sv_002',
  });
  assert.ok(!secondClaim.valid, 'Second concurrent claim should fail');
  assert.ok(secondClaim.statusCode === 409, 'Should return 409 Conflict');
  pass('TC-LIFE-02: atomicClaimProposal prevents concurrent double-claim (concurrency safety)');
} catch (e) { fail('TC-LIFE-02: atomicClaimProposal prevents concurrent double-claim (concurrency safety)', e); }

try {
  const pm = new ProposalManager(1); // 1ms TTL — expires instantly
  const proposal = pm.createProposal({
    sessionId: 'sess_3',
    fnName: 'add_furniture',
    normalizedArgs: { type: 'desk' },
    sceneVersion: 'sv_003',
    title: 'Thêm bàn học',
    description: 'Test TTL',
    changes: [],
    previewObjects: [],
  });

  // Wait for expiry
  const startWait = Date.now();
  while (Date.now() - startWait < 10) { /* spin wait 10ms */ }

  const retrieved = pm.getProposal(proposal.proposalId);
  assert.strictEqual(retrieved, null, 'Expired proposal should not be retrievable');
  pass('TC-LIFE-03: Expired proposal returns null (TTL enforcement)');
} catch (e) { fail('TC-LIFE-03: Expired proposal returns null (TTL enforcement)', e); }

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_4',
    fnName: 'move_furniture',
    normalizedArgs: { objectId: 'bed_1', dx: 0.5 },
    sceneVersion: 'sv_original',
    title: 'Test scene version',
    description: 'Test',
    changes: [],
    previewObjects: [],
  });

  // Try to validate against different scene version
  const result = pm.validateConfirmation({
    proposalId: proposal.proposalId,
    currentSceneVersion: 'sv_changed', // Scene changed!
    fnName: 'move_furniture',
  });
  assert.ok(!result.valid, 'Should reject when scene version changed');
  assert.ok(result.statusCode === 409, 'Should return 409 for stale scene');
  pass('TC-LIFE-04: Proposal rejected when sceneVersion has changed (scene safety)');
} catch (e) { fail('TC-LIFE-04: Proposal rejected when sceneVersion has changed (scene safety)', e); }

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_5',
    fnName: 'move_furniture',
    normalizedArgs: { objectId: 'bed_1', dx: 0.5 },
    sceneVersion: 'sv_005',
    title: 'Test rollback',
    description: 'Test',
    changes: [],
    previewObjects: [],
  });

  // Claim it
  pm.atomicClaimProposal({
    proposalId: proposal.proposalId,
    currentSceneVersion: 'sv_005',
  });

  // Simulate rollback: release claim back to pending
  pm.releaseClaim(proposal.proposalId, 'pending');
  const retrieved = pm.getProposal(proposal.proposalId);
  assert.ok(retrieved !== null, 'Released proposal should still exist');
  assert.strictEqual(retrieved!.status, 'pending', 'Released proposal should be pending again');
  pass('TC-LIFE-05: releaseClaim(pending) correctly rolls back claiming→pending for retry');
} catch (e) { fail('TC-LIFE-05: releaseClaim(pending) correctly rolls back claiming→pending for retry', e); }

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_6',
    fnName: 'delete_furniture',
    normalizedArgs: { objectId: 'desk_1' },
    sceneVersion: 'sv_006',
    title: 'Xóa bàn',
    description: 'Test replay',
    changes: [],
    previewObjects: [],
  });

  // Execute it
  pm.markExecuted(proposal.proposalId);

  // Try to validate again (replay attack)
  const replay = pm.validateConfirmation({
    proposalId: proposal.proposalId,
    currentSceneVersion: 'sv_006',
  });
  assert.ok(!replay.valid, 'Replay of executed proposal should fail');
  assert.ok([404, 409].includes(replay.statusCode!), 'Should return 404 or 409');
  pass('TC-LIFE-06: markExecuted removes proposal, preventing replay attack');
} catch (e) { fail('TC-LIFE-06: markExecuted removes proposal, preventing replay attack', e); }

try {
  const pm = new ProposalManager(5 * 60 * 1000);
  const proposal = pm.createProposal({
    sessionId: 'sess_7',
    fnName: 'add_furniture',
    normalizedArgs: { type: 'wardrobe' },
    sceneVersion: 'sv_007',
    title: 'Thêm tủ',
    description: 'Test session binding',
    changes: [],
    previewObjects: [],
  });

  // Try to claim from different session
  const wrongSession = pm.validateConfirmation({
    proposalId: proposal.proposalId,
    sessionId: 'different_session',
    currentSceneVersion: 'sv_007',
  });
  assert.ok(!wrongSession.valid, 'Cross-session confirmation should fail');
  assert.ok(wrongSession.statusCode === 403, 'Should return 403 Forbidden');
  pass('TC-LIFE-07: Session binding prevents cross-session proposal confirmation');
} catch (e) { fail('TC-LIFE-07: Session binding prevents cross-session proposal confirmation', e); }

// ---------------------------------------------------------------------------
// DOMAIN 6: Architecture Invariants (Master Preset)
// ---------------------------------------------------------------------------
console.log('\n--- Domain 6: Architecture Invariants (Master Preset) ---');

const profile1985 = getUserFengShuiProfile(1985, 'male');

try {
  const masterEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);
  assert.strictEqual(masterEval.overallScore, 51, `Master Preset default overallScore must be 51 (got ${masterEval.overallScore})`);
  pass('TC-INV-01: P9-M3 preserves Master Preset default overallScore = 51');
} catch (e) { fail('TC-INV-01: P9-M3 preserves Master Preset default overallScore = 51', e); }

try {
  const masterEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);
  assert.strictEqual(masterEval.breakdown.bedScore, 30, `Master Preset bed score must be 30 (got ${masterEval.breakdown.bedScore})`);
  pass('TC-INV-02: P9-M3 preserves Master Preset bed score = 30');
} catch (e) { fail('TC-INV-02: P9-M3 preserves Master Preset bed score = 30', e); }

try {
  const masterEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);
  assert.strictEqual(masterEval.breakdown.deskScore, 92, `Master Preset desk score must be 92 (got ${masterEval.breakdown.deskScore})`);
  assert.strictEqual(masterEval.breakdown.circulationScore, 70, `Master Preset circulation score must be 70 (got ${masterEval.breakdown.circulationScore})`);
  pass('TC-INV-03: P9-M3 preserves Master Preset breakdown invariance (Desk: 92, Circulation: 70)');
} catch (e) { fail('TC-INV-03: P9-M3 preserves Master Preset breakdown invariance (Desk: 92, Circulation: 70)', e); }

try {
  // overallHarmonyScore must remain null
  const masterEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);
  assert.strictEqual((masterEval as any).overallHarmonyScore, undefined,
    'overallHarmonyScore must remain absent/undefined — not exposed as a number');
  pass('TC-INV-04: overallHarmonyScore is not exposed as a number on P5 output');
} catch (e) { fail('TC-INV-04: overallHarmonyScore is not exposed as a number on P5 output', e); }

recorded('TC-INV-REC: Master Preset evaluation result',
  { overallScore: evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects).overallScore }
);

// ---------------------------------------------------------------------------
// DOMAIN 7: LayoutStorage Resilient Integration
// ---------------------------------------------------------------------------
console.log('\n--- Domain 7: LayoutStorage Resilient Integration ---');

try {
  withMockStorage(1024 * 1024, (ls) => {
    const entry = saveLayoutToLocal(
      'Phòng ngủ kiểm thử',
      ROOM_PRESETS.master.config,
      ROOM_PRESETS.master.objects,
      profile1985,
      51
    );
    assert.ok(entry.id.startsWith('layout_'));
    assert.strictEqual(entry.name, 'Phòng ngủ kiểm thử');
    const list = getSavedLayouts();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, entry.id);
  });
  pass('TC-LAYOUT-01: saveLayoutToLocal writes and getSavedLayouts reads resilient envelope');
} catch (e) { fail('TC-LAYOUT-01: saveLayoutToLocal writes and getSavedLayouts reads resilient envelope', e); }

try {
  withMockStorage(100, (ls) => {
    // Fill up mock storage to 92/100 bytes
    ls.setItem('filler', 'x'.repeat(40));
    // Safe save should return typed quota_exceeded error
    const res = saveLayoutToLocalSafe(
      'Phòng tràn bộ nhớ',
      ROOM_PRESETS.master.config,
      ROOM_PRESETS.master.objects
    );
    assert.ok(!res.ok);
    assert.strictEqual(res.error, 'quota_exceeded');
  });
  pass('TC-LAYOUT-02: saveLayoutToLocalSafe detects quota exceeded and returns typed error');
} catch (e) { fail('TC-LAYOUT-02: saveLayoutToLocalSafe detects quota exceeded and returns typed error', e); }

try {
  withMockStorage(1024 * 1024, (ls) => {
    const e1 = saveLayoutToLocal('Bố cục 1', ROOM_PRESETS.master.config, []);
    const e2 = saveLayoutToLocal('Bố cục 2', ROOM_PRESETS.master.config, []);
    assert.strictEqual(getSavedLayouts().length, 2);
    deleteSavedLayout(e1.id);
    const afterDelete = getSavedLayouts();
    assert.strictEqual(afterDelete.length, 1);
    assert.strictEqual(afterDelete[0].id, e2.id);
  });
  pass('TC-LAYOUT-03: deleteSavedLayout removes specific item and persists remaining items');
} catch (e) { fail('TC-LAYOUT-03: deleteSavedLayout removes specific item and persists remaining items', e); }

try {
  withMockStorage(1024 * 1024, (ls) => {
    // Write legacy raw JSON array without envelope
    const legacyArray = [
      { id: 'layout_legacy_1', name: 'Legacy 1', savedAt: '2026-01-01', roomConfig: ROOM_PRESETS.master.config, objects: [] }
    ];
    ls.setItem('ai_feng_shui_saved_layouts', JSON.stringify(legacyArray));
    const loaded = getSavedLayouts();
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].id, 'layout_legacy_1');
  });
  pass('TC-LAYOUT-04: getSavedLayouts seamlessly backward-compatible with legacy unversioned layouts');
} catch (e) { fail('TC-LAYOUT-04: getSavedLayouts seamlessly backward-compatible with legacy unversioned layouts', e); }

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`P9-M3 TEST RESULTS:`);
console.log(`• Test Cases: ${passCount + failCount + recordedCount} executed`);
console.log(`• Assertions: ${passCount} PASSED, ${failCount} FAILED, ${recordedCount} RECORDED`);
console.log('================================================================================\n');

if (failCount > 0) {
  console.error('FAILED TESTS:');
  results.filter((r) => r.status === 'FAIL').forEach((r) => {
    console.error(`  ❌ ${r.name}: ${r.error}`);
  });
  process.exit(1);
}

