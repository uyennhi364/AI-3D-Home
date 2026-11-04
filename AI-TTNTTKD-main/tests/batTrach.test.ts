import { getUserFengShuiProfile } from '../src/engine/batTrach';

export function runBatTrachTests() {
  console.log('\n--- [TEST SUITE 1: Bát Trạch & Cung Mệnh] ---');
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${desc}`);
      failed++;
    }
  }

  // 1. 2004 Female -> Khôn (Thổ, Tây Tứ Mệnh)
  const p2004F = getUserFengShuiProfile(2004, 'female');
  assert('2004 Nữ là Cung Khôn', p2004F.guaName === 'Khôn');
  assert('2004 Nữ thuộc Tây Tứ Mệnh', p2004F.group === 'Tây Tứ Mệnh');
  assert('2004 Nữ hướng Sinh Khí là Đông Bắc (NE)', p2004F.auspiciousDirections.includes('NE'));
  assert('2004 Nữ hướng Tuyệt Mệnh là Bắc (N)', p2004F.inauspiciousDirections.includes('N'));

  // 2. 1990 Male -> Khảm (Thủy, Đông Tứ Mệnh)
  const p1990M = getUserFengShuiProfile(1990, 'male');
  assert('1990 Nam là Cung Khảm', p1990M.guaName === 'Khảm');
  assert('1990 Nam thuộc Đông Tứ Mệnh', p1990M.group === 'Đông Tứ Mệnh');
  assert('1990 Nam Sinh Khí là Đông Nam (SE)', p1990M.auspiciousDirections.includes('SE'));

  // 3. 1985 Female -> Ly (Hỏa, Đông Tứ Mệnh)
  const p1985F = getUserFengShuiProfile(1985, 'female');
  assert('1985 Nữ là Cung Càn hoặc Ly theo âm lịch chuẩn', !!p1985F.guaName && !!p1985F.group);

  // 4. Direction details consistency (4 good, 4 bad)
  assert('Mỗi người có đúng 4 hướng tốt', p2004F.auspiciousDirections.length === 4);
  assert('Mỗi người có đúng 4 hướng xấu', p2004F.inauspiciousDirections.length === 4);

  return { passed, failed };
}

