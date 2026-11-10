// =============================================================================
// tests/run_all_tests.ts
// Test runner for P0 Characterization Baseline, Phase H Intent Guard,
// Express Server Integration, Phase P1 Spatial Orientation, and
// Phase P2 Room Layout & Sector Engine Suites
// =============================================================================

import { execSync } from 'child_process';

console.log('>>> RUNNING SUITE 1: P0 CHARACTERIZATION BASELINE <<<');
execSync('npx tsx tests/p0_characterization_baseline.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 2: PHASE H INTENT GUARD & SAFETY TESTS <<<');
execSync('npx tsx tests/phase_h_intent_guard.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 3: EXPRESS SERVER HTTP INTEGRATION TESTS <<<');
execSync('npx tsx tests/integration_server_pipeline.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 4: PHASE P1 SPATIAL COORDINATE & ORIENTATION <<<');
execSync('npx tsx tests/p1_spatial_orientation.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 5: PHASE P2 ROOM LAYOUT & SECTOR ENGINE <<<');
execSync('npx tsx tests/p2_room_layout_sector.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 6: PHASE P3 FURNITURE FENG SHUI RULES <<<');
execSync('npx tsx tests/p3_furniture_rules.test.ts', { stdio: 'inherit' });

console.log('\n>>> ALL TEST SUITES EXECUTED SUCCESSFULLY! <<<');
