// =============================================================================
// tests/p9_m1_hardening.test.ts
// Phase P9-M1: Hardening & Core Stability Test Suite
// Covers Gemini Timeout, AbortSignal Cancellation, Error Classification,
// CORS Security (Fail-Closed & Whitelist), API Key Redaction, Health Check,
// Transaction Safety, and Scene Invariants.
// =============================================================================

import {
  APP_VERSION,
  GEMINI_TIMEOUT_MS,
  classifyGeminiError,
  redactSecret,
  sanitizeObjectForLogging,
  getEffectiveAllowedOrigins,
  DEV_LOCALHOST_WHITELIST,
  corsOptions,
  executeGeminiContentGeneration,
  setMockGenAIClient,
  app,
} from '../server';
import { evaluateRoomFengShui } from '../src/engine/fengshuiRules';
import { getUserFengShuiProfile } from '../src/engine/batTrach';
import { ROOM_PRESETS } from '../src/engine/presets';
import { evaluateIntentSafety } from '../src/services/intentGuard';
import {
  createDestructiveProposal,
  confirmProposal,
  computeSceneVersion,
  pendingConfirmations,
} from '../src/services/serverGuard';

let passed = 0;
let failed = 0;
let recorded = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passed++;
  } else {
    console.log(`  ❌ [FAIL] ${label}`);
    failed++;
  }
}

function record(label: string, value: unknown): void {
  console.log(`  📋 [RECORDED] ${label}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
  recorded++;
}

async function runP9M1HardeningTests() {
  console.log('================================================================================');
  console.log('PHASE P9-M1 — HARDENING & CORE STABILITY SPECIFICATION TEST SUITE');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. GEMINI TIMEOUT & ABORT SIGNAL CANCELLATION
  // ---------------------------------------------------------------------------
  console.log('--- Domain 1: Gemini Timeout & Real SDK AbortSignal Cancellation ---');
  assert(GEMINI_TIMEOUT_MS === 25000, `Configured Gemini Timeout is exactly 25s (${GEMINI_TIMEOUT_MS}ms)`);

  let capturedSignal: AbortSignal | null = null;
  let capturedHttpTimeout: number | undefined = undefined;

  const mockTimingClient: any = {
    models: {
      generateContent: async (params: any) => {
        capturedSignal = params?.config?.abortSignal || null;
        capturedHttpTimeout = params?.config?.httpOptions?.timeout;
        // Simulate immediate response
        return { text: 'Test response' };
      },
    },
  };

  await executeGeminiContentGeneration(mockTimingClient, {
    model: 'gemini-2.5-flash',
    contents: 'Ping',
  });

  assert(capturedSignal !== null, 'executeGeminiContentGeneration attaches real AbortSignal to config');
  assert(capturedHttpTimeout === 25000, 'executeGeminiContentGeneration configures httpOptions.timeout = 25000ms');

  // Test timeout triggering abort
  const mockHangingClient: any = {
    models: {
      generateContent: async (params: any) => {
        const signal: AbortSignal = params.config.abortSignal;
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const abortErr = new Error('Request aborted by controller');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      },
    },
  };

  let timedOut = false;
  const startT = Date.now();
  try {
    // Run with small 50ms timeout for unit test
    await executeGeminiContentGeneration(mockHangingClient, { model: 'gemini-2.5-flash', contents: 'hang' }, 50);
  } catch (err: any) {
    timedOut = true;
    const classified = classifyGeminiError(err);
    assert(classified.category === 'timeout', `Hanging call aborted and classified as "timeout" (status: ${classified.status})`);
  }
  const elapsed = Date.now() - startT;
  assert(timedOut, 'executeGeminiContentGeneration aborts hanging call on timeout');
  assert(elapsed < 1000, `Abort signal terminated request promptly (${elapsed}ms < 1000ms)`);

  // ---------------------------------------------------------------------------
  // 2. ERROR CLASSIFICATION RESILIENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 2: Gemini Error Classification Resilience ---');
  const timeoutErr = new Error('The user aborted a request.');
  timeoutErr.name = 'AbortError';
  const c1 = classifyGeminiError(timeoutErr);
  assert(c1.category === 'timeout' && c1.status === 504, 'AbortError classified as timeout (504)');

  const quotaErr: any = new Error('RESOURCE_EXHAUSTED: Quota exceeded for quota group');
  quotaErr.status = 429;
  const c2 = classifyGeminiError(quotaErr);
  assert(c2.category === 'quota' && c2.status === 429, 'RESOURCE_EXHAUSTED / 429 classified as quota (429)');

  const networkErr: any = new Error('fetch failed');
  networkErr.code = 'ENOTFOUND';
  const c3 = classifyGeminiError(networkErr);
  assert(c3.category === 'network' && c3.status === 503, 'ENOTFOUND classified as network (503)');

  const upstreamErr: any = new Error('Internal Server Error from upstream');
  upstreamErr.status = 502;
  const c4 = classifyGeminiError(upstreamErr);
  assert(c4.category === 'upstream' && c4.status === 502, 'HTTP 502 classified as upstream (502)');

  const unknownErr = new Error('Random parsing defect');
  const c5 = classifyGeminiError(unknownErr);
  assert(c5.category === 'unknown' && c5.status === 500, 'Unknown error classified as unknown (500)');

  // ---------------------------------------------------------------------------
  // 3. CORS SECURITY SPECIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 3: CORS Security (Fail-Closed & Whitelist) ---');
  const oldNodeEnv = process.env.NODE_ENV;
  const oldAllowed = process.env.ALLOWED_ORIGINS;

  try {
    // 3.1. Production without ALLOWED_ORIGINS -> Fail-Closed
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOWED_ORIGINS;
    const prodOrigins = getEffectiveAllowedOrigins();
    assert(Array.isArray(prodOrigins) && prodOrigins.length === 0, 'Production fail-closed: empty whitelist when ALLOWED_ORIGINS missing');

    // Test cors callback on prodOrigins
    let corsBlocked = false;
    (corsOptions.origin as any)('https://malicious-website.com', (err: any, allow: boolean) => {
      if (err && !allow) corsBlocked = true;
    });
    assert(corsBlocked, 'CORS rejects unauthorized origin in production');

    // 3.2. Development default -> Localhost whitelist
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOWED_ORIGINS;
    const devOrigins = getEffectiveAllowedOrigins();
    assert(devOrigins.includes('http://localhost:5173'), 'Dev mode includes http://localhost:5173');
    assert(devOrigins.includes('http://127.0.0.1:3000'), 'Dev mode includes http://127.0.0.1:3000');

    let devAllowed = false;
    (corsOptions.origin as any)('http://localhost:5173', (err: any, allow: boolean) => {
      if (!err && allow) devAllowed = true;
    });
    assert(devAllowed, 'CORS allows localhost origin in development');

    // 3.3. Non-browser request (no Origin header) -> Always allowed
    let nonBrowserAllowed = false;
    (corsOptions.origin as any)(undefined, (err: any, allow: boolean) => {
      if (!err && allow) nonBrowserAllowed = true;
    });
    assert(nonBrowserAllowed, 'CORS allows server-to-server / curl requests with no Origin header');

    // 3.4. Credentials flag
    assert(corsOptions.credentials === true, 'CORS credentials enabled (credentials: true)');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldAllowed !== undefined) process.env.ALLOWED_ORIGINS = oldAllowed;
  }

  // ---------------------------------------------------------------------------
  // 4. API KEY REDACTION & SECRET PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 4: API Key Protection & Secret Redaction ---');
  const sampleKey = 'AIzaSyD-1234567890abcdefghijklmnop';
  const redacted = redactSecret(sampleKey);
  assert(redacted === '[REDACTED]', 'redactSecret completely masks secret to [REDACTED] with zero prefix/suffix leak');
  assert(!redacted.includes('AIza'), 'redactSecret does not leak prefix');
  assert(!redacted.includes('mnop'), 'redactSecret does not leak suffix');

  const shortKey = 'short';
  assert(redactSecret(shortKey) === '[REDACTED]', 'redactSecret masks short keys completely');
  assert(redactSecret('') === '[NONE]', 'redactSecret handles empty/null');

  const logPayload = {
    headers: {
      'x-gemini-api-key': sampleKey,
      'content-type': 'application/json',
    },
    body: {
      apiKey: sampleKey,
      userMessage: 'Xin chào',
      nested: {
        geminiSecret: 'top-secret-token-12345',
      },
    },
  };

  const sanitized = sanitizeObjectForLogging(logPayload);
  assert(!JSON.stringify(sanitized).includes(sampleKey), 'sanitizeObjectForLogging purges all raw API keys');
  assert(!JSON.stringify(sanitized).includes('top-secret-token-12345'), 'sanitizeObjectForLogging purges nested secret tokens');
  assert(sanitized.body.userMessage === 'Xin chào', 'sanitizeObjectForLogging preserves non-secret fields');

  // ---------------------------------------------------------------------------
  // 5. HEALTH CHECK & OBSERVABILITY DECOUPLING
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 5: Health Check & System Version Decoupling ---');
  assert(APP_VERSION === 'v1.0.0-p9.1', `System version is synchronized to v1.0.0-p9.1 (${APP_VERSION})`);

  // ---------------------------------------------------------------------------
  // 6. TRANSACTION SAFETY & PROPOSAL CONFIRM GATE INVARIANTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 6: Transaction Safety & Confirm Gate Invariants ---');
  const dummyObjects = [
    { id: 'bed_01', type: 'bed', name: 'Giường', position: { x: 0, y: 0, z: 0 }, dimensions: { width: 1.6, length: 2.0, height: 0.95 } },
  ];
  const sceneVer = computeSceneVersion(dummyObjects as any);
  assert(typeof sceneVer === 'string' && sceneVer.length > 0, `Scene hash computed: ${sceneVer}`);

  // Test confirming non-existent proposal -> must fail with 409 status logic
  const fakeConfirm = confirmProposal('fake_prop_99999', sceneVer);
  assert(fakeConfirm.success === false, 'confirmProposal rejects non-existent proposalId');

  // Test valid proposal creation and consumption
  const prop = createDestructiveProposal('delete_furniture', { objectId: 'bed_01' }, sceneVer);
  assert(typeof prop.proposalId === 'string' && prop.proposalId.startsWith('prop_'), `Proposal created with ID: ${prop.proposalId}`);
  assert(pendingConfirmations.has(prop.proposalId), 'Proposal registered in pending confirmations store');

  // Confirm with mismatching scene version -> must be rejected
  const mismatchConfirm = confirmProposal(prop.proposalId, 'outdated_hash_xyz');
  assert(mismatchConfirm.success === false, 'confirmProposal rejects when scene version does not match');

  // Re-create and confirm with matching version
  const prop2 = createDestructiveProposal('delete_furniture', { objectId: 'bed_01' }, sceneVer);
  const validConfirm = confirmProposal(prop2.proposalId, sceneVer);
  assert(validConfirm.success === true, 'confirmProposal approves when proposalId and sceneVersion match');
  assert(prop2.isConfirmed === true, 'Confirmed proposal marked as isConfirmed = true');

  // Double confirmation must be rejected (replay attack prevention)
  const doubleConfirm = confirmProposal(prop2.proposalId, sceneVer);
  assert(doubleConfirm.success === false, 'Replay protection: cannot re-confirm already confirmed proposal');

  // ---------------------------------------------------------------------------
  // 7. ARCHITECTURAL INVARIANTS: MASTER PRESET & OVERALL SCORE
  // ---------------------------------------------------------------------------
  console.log('\n--- Domain 7: Non-Negotiable Architecture Invariants ---');
  const profile1985 = getUserFengShuiProfile(1985, 'male');
  const defaultEval = evaluateRoomFengShui(profile1985, ROOM_PRESETS.master.config, ROOM_PRESETS.master.objects);
  assert(defaultEval.overallScore === 51, `Master Preset default score invariant strictly preserved at 51 (Current: ${defaultEval.overallScore})`);
  assert(defaultEval.breakdown.bedScore === 30, `Master Bed score invariant strictly preserved at 30 (Current: ${defaultEval.breakdown.bedScore})`);
  assert(defaultEval.breakdown.deskScore === 92, `Master Desk score invariant strictly preserved at 92 (Current: ${defaultEval.breakdown.deskScore})`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`P9-M1 TEST SUMMARY: ${passed} PASS, ${recorded} RECORDED, ${failed} FAIL`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runP9M1HardeningTests().catch((err) => {
  console.error('Fatal test error in P9-M1 suite:', err);
  process.exit(1);
});
