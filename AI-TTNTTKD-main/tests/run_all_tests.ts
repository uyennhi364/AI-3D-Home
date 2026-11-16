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

console.log('\n>>> RUNNING SUITE 7: PHASE P4 PERSONAL & HOUSE/ROOM ASSESSMENT <<<');
execSync('npx tsx tests/p4_personal_house_room.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 8: PHASE P5 UNIFIED ASSESSMENT REPORT <<<');
execSync('npx tsx tests/p5_assessment_report.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 9: PHASE P6 ENVIRONMENTAL & ERGONOMICS <<<');
execSync('npx tsx tests/p6_environmental_ergonomics.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 10: PHASE P7 UNIFIED GEMINI AI AGENT & SAFE SCENE EXECUTION <<<');
execSync('npx tsx tests/p7_agent_execution.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 11: PHASE P7.5 TARGETED VERIFICATION (SCENE HASH & ATOMIC CONCURRENCY) <<<');
execSync('npx tsx tests/p7_5_targeted_verification.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 12: PHASE P7.5 PLAYWRIGHT E2E BROWSER VALIDATION <<<');
execSync('npx tsx tests/p7_5_e2e_scenarios.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 13: PILOT-01.1 DEFECT REMEDIATION REGRESSION TESTS <<<');
execSync('npx tsx tests/p1_defect_remediation.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 14: PHASE P8.2 PRODUCTION READINESS & SECURITY HARDENING <<<');
execSync('npx tsx tests/p8_2_production_readiness.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 15: THREE DISTINCT ROOM LAYOUT ALTERNATIVES <<<');
execSync('npx tsx tests/three_distinct_layouts.test.ts', { stdio: 'inherit' });

console.log('\n>>> ALL TEST SUITES EXECUTED SUCCESSFULLY! <<<');
