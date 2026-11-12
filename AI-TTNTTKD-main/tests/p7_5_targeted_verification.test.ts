// =============================================================================
// tests/p7_5_targeted_verification.test.ts
// Phase P7.5 Final Technical Verification — Targeted Fixes Suite
//
// 1. Scene Hash Completeness:
//    - Door position change -> hash changes
//    - Door dimension change -> hash changes
//    - Window position change -> hash changes
//    - Window dimension change -> hash changes
//    - Window swing change ('fixed' vs 'slide') -> hash changes
//    - Wall geometry / polygon change -> hash changes
//
// 2. Atomic Proposal Consumption:
//    - Validate proposal & atomic claim transition (pending -> claiming)
//    - Concurrent request simulation via Promise/barrier (exactly 1 succeeds, 1 rejected with 409)
//    - Transaction rollback release policy (cancelled & purged from store)
//
// 3. Environmental Engine Source Attribution:
//    - Verify TCVN 4451:2012 attribution for natural ventilation rules (ENV-VENT-01, ENV-VENT-02)
//    - Verify QCVN 06:2022 is NOT used for ventilation
// =============================================================================

import {
  computeRobustSceneVersion,
  normalizeLayoutForHash,
  computeArgsHash,
} from '../src/engine/agent/sceneHasher.js';
import { ProposalManager } from '../src/engine/agent/proposalManager.js';
import { TransactionManager } from '../src/engine/agent/transactionManager.js';
import { RoomLayout, buildLayoutFromLegacy } from '../src/engine/core/roomLayout.js';
import { RoomConfig, RoomObject } from '../src/types/fengshui.js';
import { evaluateEnvironmentalRules } from '../src/engine/core/environmentalEngine.js';

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

async function runTargetedVerification() {
  console.log('='.repeat(80));
  console.log('PHASE P7.5 TARGETED VERIFICATION: SCENE HASH & ATOMIC CONCURRENCY');
  console.log('='.repeat(80));

  // Base fixtures
  const baseRoomConfig: RoomConfig = {
    width: 4.0,
    length: 5.0,
    height: 2.8,
    direction: 'S',
    doorWall: 'S',
    windowWall: 'N',
  };

  const baseObjects: RoomObject[] = [
    {
      id: 'bed_main',
      type: 'bed',
      name: 'Giường Ngủ Master',
      position: { x: -0.5, y: 0.4, z: -1.2 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1.8, length: 2.0, height: 0.9 },
    },
    {
      id: 'door_main',
      type: 'door',
      name: 'Cửa ra vào',
      position: { x: 1.2, y: 0, z: 2.5 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 0.9, length: 0.1, height: 2.1 },
    },
    {
      id: 'window_main',
      type: 'window',
      name: 'Cửa sổ lấy sáng',
      position: { x: 0.0, y: 1.0, z: -2.5 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1.5, length: 0.1, height: 1.2 },
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. SCENE HASH COMPLETENESS
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. SCENE HASH COMPLETENESS & PERMUTATION SENSITIVITY ---');

  const baseHash = computeRobustSceneVersion(baseObjects, baseRoomConfig);
  record('Base Scene Version Hash', baseHash);
  assert(baseHash.startsWith('sv_') && baseHash.length > 10, 'Base scene version computed successfully');

  // Test 1.1: Door Position Change Only
  const doorMovedObjects: RoomObject[] = baseObjects.map((obj) =>
    obj.id === 'door_main'
      ? { ...obj, position: { ...obj.position, x: 1.6 } } // moved from 1.2 to 1.6
      : { ...obj }
  );
  const hashDoorPos = computeRobustSceneVersion(doorMovedObjects, baseRoomConfig);
  assert(hashDoorPos !== baseHash, 'Scene version changes when door position changes (1.2 -> 1.6m)');

  // Test 1.2: Door Dimension Change Only
  const doorResizedObjects: RoomObject[] = baseObjects.map((obj) =>
    obj.id === 'door_main'
      ? { ...obj, dimensions: { ...obj.dimensions, width: 1.2 } } // resized from 0.9 to 1.2
      : { ...obj }
  );
  const hashDoorDim = computeRobustSceneVersion(doorResizedObjects, baseRoomConfig);
  assert(hashDoorDim !== baseHash, 'Scene version changes when door dimension changes (0.9 -> 1.2m width)');

  // Test 1.3: Window Position Change Only
  const windowMovedObjects: RoomObject[] = baseObjects.map((obj) =>
    obj.id === 'window_main'
      ? { ...obj, position: { ...obj.position, x: -0.8 } } // moved from 0.0 to -0.8
      : { ...obj }
  );
  const hashWindowPos = computeRobustSceneVersion(windowMovedObjects, baseRoomConfig);
  assert(hashWindowPos !== baseHash, 'Scene version changes when window position changes (0.0 -> -0.8m)');

  // Test 1.4: Window Dimension Change Only
  const windowResizedObjects: RoomObject[] = baseObjects.map((obj) =>
    obj.id === 'window_main'
      ? { ...obj, dimensions: { ...obj.dimensions, width: 2.0 } } // resized from 1.5 to 2.0
      : { ...obj }
  );
  const hashWindowDim = computeRobustSceneVersion(windowResizedObjects, baseRoomConfig);
  assert(hashWindowDim !== baseHash, 'Scene version changes when window dimension changes (1.5 -> 2.0m width)');

  // Test 1.5: Window Swing Change Only (in layout openings)
  const baseLayout = buildLayoutFromLegacy(baseRoomConfig, baseObjects);
  const hashBaseWithLayout = computeRobustSceneVersion(baseObjects, baseRoomConfig, baseLayout);

  const modifiedSwingLayout: RoomLayout = {
    ...baseLayout,
    openings: baseLayout.openings.map((op) =>
      op.kind === 'window' ? { ...op, swing: 'fixed' as const } : { ...op }
    ),
  };
  const hashSwingChanged = computeRobustSceneVersion(baseObjects, baseRoomConfig, modifiedSwingLayout);
  assert(hashSwingChanged !== hashBaseWithLayout, 'Scene version changes when opening swing changes (slide -> fixed)');

  // Test 1.6: Wall Geometry / Polygon Change with Same Room Dimensions
  // Adding an alcove / notch vertex into the polygon while overall bounding box remains 4x5
  const modifiedWallGeometryLayout: RoomLayout = {
    ...baseLayout,
    polygon: [
      { x: -2.0, z: -2.5 },
      { x: 0.0, z: -2.5 },
      { x: 0.0, z: -2.2 }, // alcove notch
      { x: 2.0, z: -2.2 },
      { x: 2.0, z: 2.5 },
      { x: -2.0, z: 2.5 },
    ],
  };
  const hashWallGeometryChanged = computeRobustSceneVersion(
    baseObjects,
    baseRoomConfig,
    modifiedWallGeometryLayout
  );
  assert(
    hashWallGeometryChanged !== hashBaseWithLayout,
    'Scene version changes when wall geometry/polygon changes (alcove notch) with identical bounding box'
  );

  // Test 1.7: Idempotency & Determinism
  const hashRepeated = computeRobustSceneVersion(baseObjects, baseRoomConfig, baseLayout);
  assert(hashRepeated === hashBaseWithLayout, 'Scene version computation is 100% deterministic & idempotent');

  // ---------------------------------------------------------------------------
  // 2. ATOMIC PROPOSAL CONSUMPTION & CONCURRENCY RACE TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. ATOMIC PROPOSAL CONSUMPTION & CONCURRENCY BARRIER ---');

  const proposalManager = new ProposalManager(60000); // 1 min TTL
  const transactionManager = new TransactionManager();

  // Setup proposal in manager
  const testProposal = proposalManager.createProposal({
    sessionId: 'session_race_test',
    fnName: 'apply_layout_adjustments',
    normalizedArgs: {
      adjustments: [
        { objectId: 'bed_main', position: { x: -0.8, y: 0.4, z: -1.0 } },
      ],
    },
    sceneVersion: baseHash,
    title: 'Đề xuất dịch chuyển giường ngủ',
    description: 'Dịch chuyển giường khỏi luồng xung đối cửa',
    changes: [
      {
        objectId: 'bed_main',
        objectType: 'bed',
        name: 'Giường Ngủ Master',
        action: 'move',
        targetPosition: { x: -0.8, y: 0.4, z: -1.0 },
        reason: 'Dời giường sang tọa độ x=-0.8, z=-1.0',
      },
    ],
    previewObjects: baseObjects,
    requiresConfirmation: true,
  });

  const proposalId = testProposal.proposalId;
  record('Created Test Proposal ID', proposalId);
  assert(testProposal.status === 'pending', 'Initial proposal status is "pending"');

  // Test 2.1: Concurrent Claim Simulation with Promise.all and Barrier
  // Simulate 2 parallel workers (Worker A and Worker B) attempting to claim the proposal simultaneously
  let barrierRelease: () => void = () => {};
  const barrier = new Promise<void>((resolve) => {
    barrierRelease = resolve;
  });

  const runWorker = async (workerName: string) => {
    // Wait for synchronized barrier release to maximize concurrency overlap
    await barrier;

    const claimResult = proposalManager.atomicClaimProposal({
      proposalId,
      sessionId: 'session_race_test',
      fnName: 'apply_layout_adjustments',
      args: {
        adjustments: [
          { objectId: 'bed_main', position: { x: -0.8, y: 0.4, z: -1.0 } },
        ],
      },
      currentSceneVersion: baseHash,
    });

    return { workerName, claimResult };
  };

  // Launch both workers in parallel
  const workerAPromise = runWorker('Worker-A');
  const workerBPromise = runWorker('Worker-B');

  // Release the barrier
  barrierRelease();

  const [resA, resB] = await Promise.all([workerAPromise, workerBPromise]);

  const successCount = (resA.claimResult.valid ? 1 : 0) + (resB.claimResult.valid ? 1 : 0);
  const rejectCount = (!resA.claimResult.valid ? 1 : 0) + (!resB.claimResult.valid ? 1 : 0);

  assert(successCount === 1, 'Concurrency: Exactly ONE worker successfully claimed the proposal');
  assert(rejectCount === 1, 'Concurrency: Exactly ONE worker was rejected');

  const rejectedResult = !resA.claimResult.valid ? resA.claimResult : resB.claimResult;
  assert(
    rejectedResult.statusCode === 409,
    `Concurrency: Rejected worker received HTTP 409 Conflict (${rejectedResult.error})`
  );

  // Test 2.2: Second sequential claim attempt also rejected
  const sequentialClaim = proposalManager.atomicClaimProposal({
    proposalId,
    sessionId: 'session_race_test',
    fnName: 'apply_layout_adjustments',
    currentSceneVersion: baseHash,
  });
  assert(
    !sequentialClaim.valid && sequentialClaim.statusCode === 409,
    'Subsequent claim attempt while claiming or executed is strictly rejected with 409'
  );

  // Test 2.3: Transaction Rollback Releases Claim and Purges Proposal
  console.log('\n--- 2.3 TRANSACTION ROLLBACK RELEASE POLICY ---');

  // Create another proposal destined to fail postcondition verification
  const doomedProposal = proposalManager.createProposal({
    sessionId: 'session_rollback_test',
    fnName: 'apply_layout_adjustments',
    normalizedArgs: {
      adjustments: [
        // Push bed out of bounds (x = 100.0) -> violates postconditions
        { objectId: 'bed_main', position: { x: 100.0, y: 0.4, z: 0.0 } },
      ],
    },
    sceneVersion: baseHash,
    title: 'Đề xuất vi phạm biên phòng',
    description: 'Thử nghiệm giao dịch bị rollback',
    changes: [
      {
        objectId: 'bed_main',
        objectType: 'bed',
        name: 'Giường Ngủ Master',
        action: 'move',
        targetPosition: { x: 100.0, y: 0.4, z: 0.0 },
        reason: 'Dời giường vượt quá kích thước phòng',
      },
    ],
    previewObjects: baseObjects,
  });

  const doomedId = doomedProposal.proposalId;
  const txResult = transactionManager.executeProposalTransaction(
    doomedProposal,
    baseObjects,
    baseRoomConfig,
    proposalManager
  );

  assert(!txResult.success, 'Transaction with invalid postcondition correctly fails');
  assert(txResult.statusCode === 422, 'Transaction rollback returns HTTP 422 Unprocessable Entity');

  // Verify doomed proposal is released and marked cancelled/deleted
  const lingeringProp = proposalManager.getProposal(doomedId);
  assert(lingeringProp === null, 'Rollback safely purges doomed proposal from active store (no lingering corrupted proposal)');

  // ---------------------------------------------------------------------------
  // 3. ENVIRONMENTAL ENGINE SOURCE ATTRIBUTION (P6 AUDIT)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. ENVIRONMENTAL ENGINE SOURCE ATTRIBUTION CHECK ---');

  const envReport = evaluateEnvironmentalRules({
    layout: baseLayout,
    objects: baseObjects,
  });

  const ventRuleResults = envReport.environmentalRules.filter(
    (r) => r.ruleId === 'ENV-VENT-01' || r.ruleId === 'ENV-VENT-02'
  );

  assert(ventRuleResults.length >= 2, 'Ventilation rules ENV-VENT-01 and ENV-VENT-02 evaluated');

  let hasQcvn06 = false;
  let hasTcvn4451 = false;

  for (const vr of ventRuleResults) {
    if (vr.sources.includes('SRC-QCVN-06-2022')) hasQcvn06 = true;
    if (vr.sources.includes('SRC-TCVN-4451-2012')) hasTcvn4451 = true;
  }

  assert(!hasQcvn06, 'P6 Source Attribution: SRC-QCVN-06-2022 (fire code) is NOT cited for ventilation');
  assert(hasTcvn4451, 'P6 Source Attribution: SRC-TCVN-4451-2012 is correctly cited for residential natural ventilation');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`TARGETED VERIFICATION SUMMARY: ${passed} PASS | ${failed} FAIL | ${recorded} RECORDED`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTargetedVerification().catch((err) => {
  console.error('Fatal error during verification test:', err);
  process.exit(1);
});
