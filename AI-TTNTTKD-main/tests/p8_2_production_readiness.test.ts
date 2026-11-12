// =============================================================================
// tests/p8_2_production_readiness.test.ts
// Phase P8.2 — Production Readiness, Security Hardening & Healthcheck Tests
// NOTE: deepDisposeObject Three.js test runs in-process via THREE (Node-compatible).
//       Browser-only DOM imports (ThreeRoomCanvas) are excluded from Node test.
// =============================================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { app } from '../server.js';
import { deepDisposeObject } from '../src/engine/threeResourceUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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

async function runProductionReadinessTests() {
  console.log('================================================================================');
  console.log('PHASE P8.2 — PRODUCTION READINESS & SECURITY HARDENING TEST SUITE');
  console.log('================================================================================\n');

  // 1. Production Artifacts Verification
  console.log('--- Domain 1: Production Artifacts & Build Verification ---');
  const distServerPath = path.join(projectRoot, 'dist', 'server.js');
  const distIndexPath = path.join(projectRoot, 'dist', 'index.html');
  const distAssetsDir = path.join(projectRoot, 'dist', 'assets');

  const hasDistServer = fs.existsSync(distServerPath);
  const distServerSize = hasDistServer ? fs.statSync(distServerPath).size : 0;
  assert(hasDistServer && distServerSize > 100000, `dist/server.js exists and is bundled (${Math.round(distServerSize / 1024)} KB)`);

  const hasDistIndex = fs.existsSync(distIndexPath);
  assert(hasDistIndex, 'dist/index.html exists for static SPA serving');

  const hasVendorThree = fs.existsSync(distAssetsDir) && fs.readdirSync(distAssetsDir).some((f) => f.startsWith('vendor-three'));
  const hasVendorReact = fs.existsSync(distAssetsDir) && fs.readdirSync(distAssetsDir).some((f) => f.startsWith('vendor-react'));
  assert(hasVendorThree, 'Code-splitting: vendor-three chunk generated');
  assert(hasVendorReact, 'Code-splitting: vendor-react chunk generated');
  record('Build Artifacts', { distServerKb: Math.round(distServerSize / 1024), hasIndex: hasDistIndex, hasVendorThree, hasVendorReact });

  // 2. Start In-Process Ephemeral Server for Network / Security Tests
  console.log('\n--- Domain 2: HTTP Security Headers, Healthcheck & Correlation IDs ---');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Healthcheck Test
    const healthRes = await fetch(`${baseUrl}/health`);
    assert(healthRes.status === 200, 'GET /health responds HTTP 200');
    const healthData = await healthRes.json() as any;
    assert(healthData.status === 'healthy', 'GET /health status is "healthy"');
    assert(healthData.version === 'v1.0.0-p7.5', `GET /health version is "v1.0.0-p7.5" (${healthData.version})`);
    assert(typeof healthData.uptime === 'number' && healthData.uptime >= 0, 'GET /health returns valid uptime');
    assert(typeof healthData.instanceId === 'string' && healthData.instanceId.length > 0, `GET /health returns instanceId (${healthData.instanceId})`);
    record('Healthcheck payload', healthData);

    // Security Headers & Request Correlation IDs
    const headers = healthRes.headers;
    const xFrameOptions = headers.get('x-frame-options');
    const xContentTypeOptions = headers.get('x-content-type-options');
    const xRequestId = headers.get('x-request-id');
    const xInstanceId = headers.get('x-instance-id');

    assert(xFrameOptions === 'SAMEORIGIN', `Helmet: X-Frame-Options is SAMEORIGIN (${xFrameOptions})`);
    assert(xContentTypeOptions === 'nosniff', `Helmet: X-Content-Type-Options is nosniff (${xContentTypeOptions})`);
    assert(Boolean(xRequestId && xRequestId.startsWith('req_')), `Request Correlation: X-Request-ID present (${xRequestId})`);
    assert(Boolean(xInstanceId && xInstanceId.startsWith('inst_')), `Instance ID: X-Instance-ID present (${xInstanceId})`);

    // 3. Payload Limit Hardening (DoS Mitigation)
    console.log('\n--- Domain 3: Payload Limit (2MB Body Cap) ---');
    // Payload slightly above 2MB
    const oversizedBody = JSON.stringify({ data: 'A'.repeat(2.2 * 1024 * 1024) });
    const payloadRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedBody,
    });
    assert(payloadRes.status === 413, `Oversized payload (>2MB) returns HTTP 413 Payload Too Large (${payloadRes.status})`);
    const payloadErr = await payloadRes.json() as any;
    assert(payloadErr.success === false, 'Error response schema contains success: false');
    record('Oversized payload response', payloadErr);

    // 4. Rate Limiting Headers
    console.log('\n--- Domain 4: Rate Limiting ---');
    const statusRes = await fetch(`${baseUrl}/api/gemini/status`);
    const rateLimitHeader = statusRes.headers.get('ratelimit-limit');
    assert(statusRes.status === 200, 'GET /api/gemini/status responds 200');
    assert(rateLimitHeader !== null, `Rate limit headers present (RateLimit-Limit: ${rateLimitHeader})`);

    // 5. State & Concurrency Safety (Proposal Confirm Gate)
    console.log('\n--- Domain 5: State & Concurrency Hardening (Proposal Gate) ---');
    const confirmRes = await fetch(`${baseUrl}/api/chat/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: 'non_existent_proposal_12345', sceneVersion: 'hash_test' }),
    });
    assert(confirmRes.status === 409, `Confirming nonexistent/expired proposal rejected with HTTP 409 (${confirmRes.status})`);
    const confirmData = await confirmRes.json() as any;
    assert(confirmData.success === false, 'Confirm response contains success: false');
    record('Confirm rejection', confirmData);

  } finally {
    server.close();
  }

  // 6. Three.js GPU Resource Management
  console.log('\n--- Domain 6: Three.js GPU Memory Disposal (deepDisposeObject) ---');
  const group = new THREE.Group();
  let geomDisposed = false;
  let matDisposed = false;

  const geom = new THREE.BoxGeometry(1, 1, 1);
  geom.addEventListener('dispose', () => { geomDisposed = true; });

  const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  mat.addEventListener('dispose', () => { matDisposed = true; });

  const mesh = new THREE.Mesh(geom, mat);
  group.add(mesh);

  deepDisposeObject(group);
  assert(geomDisposed, 'deepDisposeObject disposed mesh geometry');
  assert(matDisposed, 'deepDisposeObject disposed mesh material');

  // Test array material
  let mat1Disposed = false;
  let mat2Disposed = false;
  const m1 = new THREE.MeshBasicMaterial();
  const m2 = new THREE.MeshBasicMaterial();
  m1.addEventListener('dispose', () => { mat1Disposed = true; });
  m2.addEventListener('dispose', () => { mat2Disposed = true; });
  const multiMatMesh = new THREE.Mesh(new THREE.BufferGeometry(), [m1, m2]);
  deepDisposeObject(multiMatMesh);
  assert(mat1Disposed && mat2Disposed, 'deepDisposeObject disposed multi-materials');

  console.log('\n================================================================================');
  console.log(`P8.2 TEST SUMMARY: ${passed} PASS, ${recorded} RECORDED, ${failed} FAIL`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionReadinessTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

