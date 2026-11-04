import { runBatTrachTests } from './batTrach.test';
import { runGeometryEngineTests } from './geometryEngine.test';
import { runIntentClassifierTests } from './intentClassifier.test';

console.log('====================================================');
console.log('   AI-TTNTTKD AUTOMATED COMPREHENSIVE TEST SUITE    ');
console.log('====================================================');

const t1 = runBatTrachTests();
const t2 = runGeometryEngineTests();
const t3 = runIntentClassifierTests();

const totalPassed = t1.passed + t2.passed + t3.passed;
const totalFailed = t1.failed + t2.failed + t3.failed;

console.log('\n====================================================');
console.log(`TỔNG KẾT KIỂM THỬ: ${totalPassed} Passed, ${totalFailed} Failed`);
console.log('====================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✓ TOÀN BỘ CÁC BÀI KIỂM THỬ ĐỀU ĐẠT CHUẨN 100%!\n');
  process.exit(0);
}

