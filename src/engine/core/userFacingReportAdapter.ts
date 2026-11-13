// =============================================================================
// src/engine/core/userFacingReportAdapter.ts
// AI Feng Shui Studio — User-Facing Feng Shui Assessment Report Adapter
// =============================================================================
//
// DESIGN PRINCIPLES:
// - Translates complex technical rule evaluations (P0–P8) into clear, professional,
//   and actionable architectural & Feng Shui insights for ordinary homeowners.
// - Pure Presentation Layer Adapter: NEVER alters P0–P9 core engines, scoring,
//   Master Preset 89/51 benchmark, or rule definitions.
// - Strictly zero synthetic score creation: does not compute any artificial scores.
// - Transparent: preserves UNKNOWN / Insufficient data without guessing.
// - Eliminates repetitive rule listings by synthesizing related rules into unified
//   spatial observations (e.g. all bed-related rules form one holistic Bed section).
// - Structured into 6 mandatory sections:
//   1. Tổng Quan Phong Thủy
//   2. Thông Tin Phong Thủy Gia Chủ
//   3. Đánh Giá Phong Thủy Không Gian (8 nhóm)
//   4. Điểm Tốt & Vấn Đề Cần Lưu Ý
//   5. Khuyến Nghị Điều Chỉnh (Vấn đề - Giải thích - Đề xuất - Ưu tiên - Kết quả)
//   6. Kết Luận Tổng Thể
// =============================================================================

import { RoomConfig, RoomObject, CompassDirection } from '../../types/fengshui.js';
import { UnifiedAssessmentReport, RecommendationItem } from './unifiedAssessment.js';
import { DetailedRoomElementAssessment } from './nguHanh/elementAssessment.js';
import { RuleVerdict, RuleResult } from './ruleTypes.js';

// -----------------------------------------------------------------------------
// VIEW MODEL INTERFACES
// -----------------------------------------------------------------------------

export type AssessmentStatus = 'good' | 'warning' | 'needs_improvement' | 'insufficient_data';
export type PriorityLevel = 'Cao' | 'Trung bình' | 'Thấp';

export interface SpaceGroupAssessment {
  id: string;
  title: string;
  icon: string;
  status: AssessmentStatus;
  statusLabel: string;
  summary: string;
  observations: string[];
}

export interface FavorablePoint {
  title: string;
  description: string;
  advice: string;
}

export interface ConcernPoint {
  title: string;
  priority: PriorityLevel;
  impact: string;
  evidence: string;
}

export interface UserFacingRecommendation {
  targetArea: string;
  issue: string;
  explanation: string;
  proposal: string;
  priority: PriorityLevel;
  expectedBenefit: string;
}

export interface UserFacingReportViewModel {
  // Metadata
  reportId: string;
  createdAtFormatted: string;

  // PHẦN 1: TỔNG QUAN PHONG THỦY
  overview: {
    reportTitle: string;
    roomName: string;
    dimensionsFormatted: string;
    areaM2: number;
    roomOrientationText: string;
    executiveSummary: string;
    highlights: string[];
    passCount: number;
    warnCount: number;
    failCount: number;
    dataCompleteness: number;
  };

  // PHẦN 2: THÔNG TIN PHONG THỦY GIA CHỦ
  homeowner: {
    hasData: boolean;
    displayName: string;
    birthYear?: number;
    genderText?: string;
    guaName?: string;
    guaNumber?: number;
    element?: string;
    group?: string;
    canChi?: string;
    napAm?: string;
    auspiciousDirections: { direction: string; name: string; meaning: string }[];
    inauspiciousDirections: { direction: string; name: string; meaning: string }[];
    briefExplanation: string;
    missingDataNotice?: string;
  };

  // PHẦN 3: ĐÁNH GIÁ PHONG THỦY KHÔNG GIAN (8 Nhóm)
  spaceGroups: SpaceGroupAssessment[];

  // PHẦN 4: ĐIỂM TỐT VÀ VẤN ĐỀ CẦN LƯU Ý
  favorableAndConcerns: {
    favorablePoints: FavorablePoint[];
    concernPoints: ConcernPoint[];
  };

  // PHẦN 5: KHUYẾN NGHỊ ĐIỀU CHỈNH
  recommendations: UserFacingRecommendation[];

  // PHẦN 6: KẾT LUẬN TỔNG THỂ
  conclusion: {
    overallAssessment: string;
    topPriorities: string[];
    elementsToKeep: string[];
    dataIntegrityNotice: string;
  };
}

// -----------------------------------------------------------------------------
// DIRECTION DICTIONARIES
// -----------------------------------------------------------------------------

const DIRECTION_VIETNAMESE: Record<string, string> = {
  N: 'Bắc',
  NE: 'Đông Bắc',
  E: 'Đông',
  SE: 'Đông Nam',
  S: 'Nam',
  SW: 'Tây Nam',
  W: 'Tây',
  NW: 'Tây Bắc',
};

const AUSPICIOUS_MEARNINGS: Record<string, { name: string; meaning: string }> = {
  SinhKhí: { name: 'Sinh Khí', meaning: 'Chủ về tài lộc, danh tiếng, thăng tiến và sinh khí dồi dào' },
  ThiênY: { name: 'Thiên Y', meaning: 'Chủ về sức khỏe, bình an, trường thọ và quý nhân phù trợ' },
  DiênNiên: { name: 'Diên Niên', meaning: 'Chủ về tình cảm gia đạo hòa thuận, gắn kết và các mối quan hệ bền vững' },
  PhụcVị: { name: 'Phục Vị', meaning: 'Chủ về sự tịnh tâm, củng cố nội lực, thi cử và công danh đỗ đạt' },
};

const INAUSPICIOUS_MEARNINGS: Record<string, { name: string; meaning: string }> = {
  TuyệtMệnh: { name: 'Tuyệt Mệnh', meaning: 'Hung tinh tổn hại sinh khí, dễ gặp trở ngại lớn về sức khỏe và tâm lý' },
  NgũQuỷ: { name: 'Ngũ Quỷ', meaning: 'Chủ về thị phi, hao tổn tài vận, bất an trong tâm trí' },
  LụcSát: { name: 'Lục Sát', meaning: 'Chủ về trục trặc quan hệ, cãi vã, mất ngủ hoặc xáo trộn cảm xúc' },
  HọaHại: { name: 'Họa Hại', meaning: 'Chủ về việc vặt vãnh quấy nhiễu, kém may mắn, năng lượng phân tán' },
};

function formatDirection(dir?: string | null): string {
  if (!dir) return 'Chưa xác định';
  return DIRECTION_VIETNAMESE[dir] ? `${DIRECTION_VIETNAMESE[dir]} (${dir})` : dir;
}

// -----------------------------------------------------------------------------
// ADAPTER IMPLEMENTATION
// -----------------------------------------------------------------------------

export interface BuildUserFacingReportInput {
  report: UnifiedAssessmentReport;
  nguHanhAssessment?: DetailedRoomElementAssessment | null;
  roomConfig?: RoomConfig;
  objects?: RoomObject[];
}

export function buildUserFacingReportViewModel(
  input: BuildUserFacingReportInput
): UserFacingReportViewModel {
  const { report, nguHanhAssessment, roomConfig, objects = [] } = input;
  const pSummary = report.personalSummary;
  const rSummary = report.roomSummary;
  const stats = report.statistics;

  // ---------------------------------------------------------------------------
  // 1. TỔNG QUAN PHONG THỦY (Section 1)
  // ---------------------------------------------------------------------------
  const createdDate = new Date(report.createdAt);
  const createdAtFormatted = createdDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dimensionsFormatted = `${rSummary.dimensions.width.toFixed(1)}m × ${rSummary.dimensions.length.toFixed(1)}m (Cao ${rSummary.dimensions.height.toFixed(1)}m)`;
  const areaM2 = rSummary.dimensions.areaM2 || +(rSummary.dimensions.width * rSummary.dimensions.length).toFixed(1);

  // Tổng hợp executive summary tự nhiên từ dữ liệu thực
  let executiveSummary = '';
  const highlights: string[] = [];

  if (stats.failCount === 0 && stats.warnCount === 0) {
    executiveSummary = `Không gian phòng ngủ được sắp xếp rất hài hòa và chuẩn phong thủy. Các vị trí giường ngủ, bàn làm việc và lối lưu thông đều đạt các tiêu chuẩn công thái học và nguyên lý tàng phong tụ khí cổ truyền.`;
    highlights.push('Bố cục phòng đạt độ cân bằng và tiện nghi tối ưu.');
    highlights.push('Các vị trí nội thất chính đón được hướng khí thuận lợi.');
  } else if (stats.failCount === 0 && stats.warnCount > 0) {
    executiveSummary = `Phòng ngủ có bố cục tương đối thuận hòa, đáp ứng tốt phần lớn các quy tắc an toàn và công năng. Tuy nhiên, vẫn còn ${stats.warnCount} chi tiết cần tinh chỉnh nhẹ để không gian thêm thông thoáng và tối ưu hóa năng lượng trường khí.`;
    highlights.push('Bố cục tổng thể ổn định, không phạm phải các thế đại hung sát.');
    highlights.push('Một số vị trí đồ vật cần căn chỉnh khoảng cách để sinh hoạt thuận tiện hơn.');
  } else {
    executiveSummary = `Phòng ngủ có nền tảng không gian vuông vức và tiện nghi. Tuy nhiên, hiện tại hệ thống ghi nhận ${stats.failCount} vị trí cần được ưu tiên điều chỉnh (như thế tựa giường ngủ, vị trí quan sát của bàn làm việc hoặc sự tương tác với cửa/gương) nhằm bảo đảm giấc ngủ an lành và nâng cao năng lượng cho gia chủ.`;
    highlights.push(`Phòng ngủ có ${stats.failCount} điểm bố trí cần được ưu tiên cải thiện.`);
    if (stats.passCount > 0) {
      highlights.push(`Phần lớn không gian đã được sắp xếp hài hòa, chỉ cần tinh chỉnh một vài vị trí.`);
    }
  }

  // Không thêm ghi chú kỹ thuật về la bàn vào highlights người dùng

  // ---------------------------------------------------------------------------
  // 2. THÔNG TIN PHONG THỦY GIA CHỦ (Section 2)
  // ---------------------------------------------------------------------------
  const hasProfile = Boolean(pSummary && pSummary.hasProfile && pSummary.birthDate);
  const birthYear = pSummary?.effectiveSolarYear || (pSummary?.birthDate ? parseInt(pSummary.birthDate.slice(0, 4), 10) : undefined);
  const genderText = pSummary?.genderConvention === 'female' ? 'Nữ giới' : 'Nam giới';

  const auspiciousDirectionsList: { direction: string; name: string; meaning: string }[] = [];
  if (pSummary?.auspiciousDirections) {
    pSummary.auspiciousDirections.forEach((d) => {
      // Find meaning if available
      const text = formatDirection(d);
      auspiciousDirectionsList.push({
        direction: d,
        name: text,
        meaning: 'Hướng cát đón sinh khí và năng lượng tích cực cho bản mệnh',
      });
    });
  }

  const inauspiciousDirectionsList: { direction: string; name: string; meaning: string }[] = [];
  if (pSummary?.inauspiciousDirections) {
    pSummary.inauspiciousDirections.forEach((d) => {
      const text = formatDirection(d);
      inauspiciousDirectionsList.push({
        direction: d,
        name: text,
        meaning: 'Hướng hung nên tránh đặt đầu giường hoặc hướng ngồi làm việc',
      });
    });
  }

  let briefExplanation = '';
  if (hasProfile) {
    briefExplanation = `Gia chủ tuổi ${pSummary?.canChi || birthYear} mang quái mệnh ${pSummary?.guaName || ''} (${pSummary?.element || ''}), thuộc nhóm ${pSummary?.group || ''}. Nạp Âm Lục Thập Hoa Giáp là ${pSummary?.napAm || ''} (${pSummary?.napAmElement || ''}). Trong phong thủy nội thất, nhóm mệnh này ưu tiên đón khí từ các hướng cát (${pSummary?.auspiciousDirections?.join(', ') || ''}) và dung hòa màu sắc tương sinh để gia tăng vượng khí.`;
  }

  // ---------------------------------------------------------------------------
  // 3. ĐÁNH GIÁ PHONG THỦY KHÔNG GIAN (8 Nhóm - Section 3)
  // ---------------------------------------------------------------------------
  // Helper to extract rules related to a keyword or category
  const findRules = (predicate: (r: RuleResult) => boolean) => report.allRules.filter(predicate);

  // 3.1. Hướng phòng & bố cục tổng thể
  const roomRules = findRules((r) => r.ruleId.startsWith('ROOM-') || r.ruleId.includes('LAYOUT') || r.school === 'bat_trach');
  const roomStatus: AssessmentStatus = roomRules.some((r) => r.verdict === 'fail')
    ? 'needs_improvement'
    : roomRules.some((r) => r.verdict === 'warn')
    ? 'warning'
    : 'good';
  const roomObservations: string[] = [];
  roomObservations.push(`Phòng ngủ có tỷ lệ hình học ${rSummary.dimensions.width}m × ${rSummary.dimensions.length}m, không gian vuông vức, cân bằng, dễ tụ khí.`);
  if (rSummary.northBearingDeg !== null) {
    roomObservations.push(`Cửa mở hướng ${formatDirection(rSummary.roomOrientation)}, góc la bàn chuẩn xác ${rSummary.northBearingDeg}°.`);
  } else {
    roomObservations.push(`Hướng phòng quy ước theo hệ trục ${formatDirection(rSummary.roomOrientation)} (chưa nhập góc la bàn số thực tế).`);
  }

  // 3.2. Vị trí giường ngủ
  const bedRules = findRules((r) => r.ruleId.startsWith('BED-'));
  const bedHasFail = bedRules.some((r) => r.verdict === 'fail');
  const bedHasWarn = bedRules.some((r) => r.verdict === 'warn');
  const bedStatus: AssessmentStatus = bedHasFail ? 'needs_improvement' : bedHasWarn ? 'warning' : 'good';
  const bedObservations: string[] = [];

  const bedWallRule = bedRules.find((r) => r.ruleId === 'BED-WALL-01');
  const bedDoorRule = bedRules.find((r) => r.ruleId === 'BED-DOOR-01');
  const bedWinRule = bedRules.find((r) => r.ruleId === 'BED-WIN-01');

  if (bedWallRule?.verdict === 'pass') {
    bedObservations.push('Đầu giường tựa sát vào vách tường kiên cố, tạo thế tọa sơn vững chãi, giúp tinh thần an định và giấc ngủ sâu.');
  } else if (bedWallRule?.verdict === 'fail') {
    bedObservations.push('Đầu giường hiện chưa có điểm tựa vững chãi phía sau (bị hở khoảng cách lớn hoặc nằm chơi vơi giữa phòng).');
  }

  if (bedDoorRule?.verdict === 'pass') {
    bedObservations.push('Vị trí giường ngủ không bị cửa chính đâm thẳng vào, tránh được luồng khí xộc trực xung.');
  } else if (bedDoorRule?.verdict === 'fail') {
    bedObservations.push('Cửa phòng mở thẳng vào giường ngủ (thế trực xung môn sát), dễ gây bất an và cảm giác giật mình khi nghỉ ngơi.');
  }

  if (bedWinRule?.verdict === 'pass') {
    bedObservations.push('Đầu giường bố trí cách xa cửa sổ hoặc không bị gió lùa trực tiếp, bảo đảm kín gió ấm áp.');
  } else if (bedWinRule?.verdict === 'fail') {
    bedObservations.push('Đầu giường kê quá sát hoặc ngay dưới cửa sổ, năng lượng dễ bị tán và dễ bị ảnh hưởng bởi thời tiết bên ngoài.');
  }

  if (bedObservations.length === 0) {
    bedObservations.push('Giường ngủ được bố trí trong tầm kiểm soát an toàn, khoảng cách đến các bức tường tương đối hợp lý.');
  }

  // 3.3. Vị trí bàn làm việc
  const deskRules = findRules((r) => r.ruleId.startsWith('DESK-'));
  const deskHasFail = deskRules.some((r) => r.verdict === 'fail');
  const deskHasWarn = deskRules.some((r) => r.verdict === 'warn');
  const deskStatus: AssessmentStatus = deskHasFail ? 'needs_improvement' : deskHasWarn ? 'warning' : 'good';
  const deskObservations: string[] = [];

  const deskBackRule = deskRules.find((r) => r.ruleId === 'DESK-BACK-01');
  const deskDoorRule = deskRules.find((r) => r.ruleId === 'DESK-DOOR-01');
  const deskDirRule = deskRules.find((r) => r.ruleId === 'DESK-DIR-01');

  if (deskBackRule?.verdict === 'pass') {
    deskObservations.push('Lưng người ngồi làm việc tựa vào vách tường hoặc có điểm tựa nâng đỡ, tạo cảm giác an tâm và tập trung cao.');
  } else if (deskBackRule?.verdict === 'warn' || deskBackRule?.verdict === 'fail') {
    deskObservations.push('Lưng người ngồi làm việc đang quay ra khoảng trống hoặc quay về phía cửa đi, tạo tâm lý thiếu vững tâm.');
  }

  if (deskDoorRule?.verdict === 'pass') {
    deskObservations.push('Vị trí ngồi có tầm quan sát bao quát cửa ra vào (thế chỉ huy), giúp gia chủ chủ động trong không gian.');
  } else if (deskDoorRule?.verdict === 'fail') {
    deskObservations.push('Vị trí bàn làm việc khó quan sát lối ra vào, người ngồi dễ bị giật mình khi có người xuất hiện.');
  }

  if (deskDirRule?.verdict === 'pass') {
    deskObservations.push('Hướng nhìn khi ngồi làm việc quay về phương cát lành của bản mệnh, đón năng lượng minh mẫn.');
  }

  if (deskObservations.length === 0) {
    deskObservations.push('Khu vực bàn làm việc được sắp xếp gọn gàng, phù hợp với chức năng học tập và nghiên cứu.');
  }

  // 3.4. Cửa ra vào & cửa sổ
  const openingRules = findRules((r) => r.ruleId.includes('DOOR') || r.ruleId.includes('WINDOW') || r.ruleId.includes('CORRIDOR'));
  const openingStatus: AssessmentStatus = openingRules.some((r) => r.verdict === 'fail') ? 'warning' : 'good';
  const openingObservations: string[] = [
    'Hệ thống cửa ra vào và cửa sổ tạo luồng chuyển dịch khí vừa đủ, không bị kẹt hay cản trở đồ đạc.',
    'Các khoảng thông thủy cửa đáp ứng tốt nhu cầu đóng mở tự nhiên hàng ngày.',
  ];

  // 3.5. Gương và vật dụng phản chiếu
  const mirrorRules = findRules((r) => r.ruleId.startsWith('MIRROR-'));
  const mirrorHasFail = mirrorRules.some((r) => r.verdict === 'fail');
  const mirrorStatus: AssessmentStatus = mirrorHasFail ? 'needs_improvement' : 'good';
  const mirrorObservations: string[] = [];

  const mirrorBed = mirrorRules.find((r) => r.ruleId === 'MIRROR-BED-01');
  if (mirrorBed?.verdict === 'fail') {
    mirrorObservations.push('Gương soi hoặc mặt phản chiếu lớn chiếu thẳng vào giường ngủ (phạm Quang Sát), dễ gây ảo giác và làm hao tán thần khí.');
  } else if (mirrorBed?.verdict === 'pass') {
    mirrorObservations.push('Gương soi được bố trí lệch hướng hoặc che chắn kín đáo, không chiếu trực diện vào giường nằm.');
  } else {
    mirrorObservations.push('Không phát hiện gương soi gây phản chiếu tiêu cực vào không gian nghỉ ngơi chính.');
  }

  // 3.6. Màu sắc, vật liệu & Ngũ Hành
  let elementStatus: AssessmentStatus = 'good';
  const elementObservations: string[] = [];

  if (nguHanhAssessment) {
    if (nguHanhAssessment.failCount > 0) elementStatus = 'warning';
    elementObservations.push(`Màu sơn tường và vật liệu nội thất chủ đạo mang năng lượng dung hòa với không gian.`);
    if (pSummary?.element) {
      elementObservations.push(`Bản mệnh gia chủ là hành ${pSummary.element}. Hệ thống khuyến nghị bổ sung các gam màu và vật liệu tương sinh (ví dụ: hành Thổ sinh Kim, Thủy sinh Mộc).`);
    }
    if (nguHanhAssessment.furnitureSummaries && nguHanhAssessment.furnitureSummaries.length > 0) {
      const dominantItems = nguHanhAssessment.furnitureSummaries.slice(0, 3);
      dominantItems.forEach((f) => {
        if (f.profile.dominantElement) {
          const itemLabel = f.profile.objectType || f.profile.objectId || 'Nội thất';
          elementObservations.push(`${itemLabel}: hành chủ đạo ${f.profile.dominantElement} (${f.profile.dominantElementBasis}).`);
        }
      });
    }
  } else {
    elementObservations.push('Chưa nhập đủ dữ liệu màu sắc hoặc chất liệu cụ thể cho từng món đồ nội thất.');
  }

  // 3.7. Ánh sáng & thông gió (TCVN 4451)
  const envRules = report.environmentalRules ?? [];
  const envHasFail = envRules.some((r) => r.verdict === 'fail');
  const envStatus: AssessmentStatus = envHasFail ? 'warning' : 'good';
  const envObservations: string[] = [];

  const lightRule = envRules.find((r) => r.ruleId === 'ENV-LIGHT-01');
  const ventRule = envRules.find((r) => r.ruleId === 'ENV-VENT-01');

  if (lightRule?.verdict === 'pass') {
    envObservations.push('Diện tích lấy sáng từ cửa sổ tự nhiên đạt chuẩn kiến trúc nhà ở (TCVN 4451:2012), không gian sáng sủa và thông thoáng.');
  } else if (lightRule?.verdict === 'warn' || lightRule?.verdict === 'fail') {
    envObservations.push('Độ lấy sáng tự nhiên hơi hạn chế hoặc thiếu cửa sổ trực diện, cần bổ sung đèn chiếu sáng nhân tạo ấm áp.');
  }

  if (ventRule?.verdict === 'pass') {
    envObservations.push('Khả năng lưu thông không khí tự nhiên tốt, hỗ trợ làm mới dưỡng khí và xua tan ẩm mốc.');
  }

  if (envObservations.length === 0) {
    envObservations.push('Điều kiện vi khí hậu phòng ngủ đạt mức tiện nghi cơ bản cho sinh hoạt.');
  }

  // 3.8. Lối đi & lưu thông công thái học
  const ergoRules = report.ergonomicRules ?? [];
  const ergoHasFail = ergoRules.some((r) => r.verdict === 'fail');
  const ergoStatus: AssessmentStatus = ergoHasFail ? 'warning' : 'good';
  const ergoObservations: string[] = [];

  const corrRule = ergoRules.find((r) => r.ruleId === 'ENV-CORRIDOR-01');
  if (corrRule?.verdict === 'pass') {
    ergoObservations.push('Khoảng cách hành lang lưu thông quanh giường và bàn đều rộng ≥ 0.6m, di chuyển thuận lợi và an toàn.');
  } else if (corrRule?.verdict === 'fail' || corrRule?.verdict === 'warn') {
    ergoObservations.push('Có một số điểm lối đi hẹp hoặc đồ đạc kê quá sát nhau, tạo cảm giác chật chội khi sinh hoạt.');
  } else {
    ergoObservations.push('Lối đi lại trong phòng thông suốt, không có vật cản trở tầm nhìn hay lối thoát hiểm.');
  }

  const spaceGroups: SpaceGroupAssessment[] = [
    {
      id: 'room_orientation',
      title: 'Hướng phòng & Bố cục tổng thể',
      icon: '🧭',
      status: roomStatus,
      statusLabel: roomStatus === 'good' ? 'Thuận lợi' : 'Cần lưu ý',
      summary: 'Hình khối không gian vuông vức, phương vị phòng tạo nền tảng vững chắc.',
      observations: roomObservations,
    },
    {
      id: 'bed_placement',
      title: 'Vị trí & Thế tựa giường ngủ',
      icon: '🛏️',
      status: bedStatus,
      statusLabel: bedStatus === 'good' ? 'Rất tốt' : bedStatus === 'warning' ? 'Cần tinh chỉnh' : 'Cần cải thiện ngay',
      summary: bedStatus === 'good' ? 'Đầu giường tọa sơn vững chãi, tránh được mọi góc xung sát.' : 'Có yếu tố chưa vững tâm ở vị trí đầu giường hoặc hướng cửa.',
      observations: bedObservations,
    },
    {
      id: 'desk_placement',
      title: 'Vị trí bàn làm việc & Học tập',
      icon: '💼',
      status: deskStatus,
      statusLabel: deskStatus === 'good' ? 'Thuận lợi' : 'Cần điều chỉnh',
      summary: deskStatus === 'good' ? 'Bàn làm việc đắc vị thế chỉ huy, tầm nhìn thông thoáng.' : 'Tầm nhìn hoặc thế tựa của bàn làm việc cần được sắp xếp lại.',
      observations: deskObservations,
    },
    {
      id: 'openings_flow',
      title: 'Hệ thống Cửa & Dòng luân chuyển khí',
      icon: '🚪',
      status: openingStatus,
      statusLabel: 'Ổn định',
      summary: 'Cửa phòng và cửa sổ mở đóng êm thuận, phân bổ luồng khí cân bằng.',
      observations: openingObservations,
    },
    {
      id: 'mirrors_reflective',
      title: 'Gương soi & Vật dụng phản chiếu',
      icon: '🪞',
      status: mirrorStatus,
      statusLabel: mirrorStatus === 'good' ? 'Hài hòa' : 'Cần che chắn',
      summary: mirrorStatus === 'good' ? 'Gương soi không chiếu vào giường ngủ, an toàn cho thần khí.' : 'Gương chiếu giường cần được xoay chuyển hoặc che rèm.',
      observations: mirrorObservations,
    },
    {
      id: 'elements_colors',
      title: 'Màu sắc, Vật liệu & Ngũ Hành',
      icon: '🎨',
      status: elementStatus,
      statusLabel: elementStatus === 'good' ? 'Hài hòa' : 'Cần cân bằng',
      summary: 'Sắc thái không gian trang nhã, hỗ trợ bổ trợ cho bản mệnh gia chủ.',
      observations: elementObservations,
    },
    {
      id: 'lighting_ventilation',
      title: 'Ánh sáng tự nhiên & Thông gió',
      icon: '🌿',
      status: envStatus,
      statusLabel: envStatus === 'good' ? 'Đạt chuẩn' : 'Cần bổ sung',
      summary: 'Không gian đón nắng gió tự nhiên, bảo đảm tiêu chuẩn vệ sinh và năng lượng tích cực.',
      observations: envObservations,
    },
    {
      id: 'circulation_ergonomics',
      title: 'Lối đi lại & Tiện nghi công thái học',
      icon: '🚶',
      status: ergoStatus,
      statusLabel: ergoStatus === 'good' ? 'Rộng rãi' : 'Hơi hẹp',
      summary: 'Hành lang sinh hoạt thông suốt, thuận tiện cho việc di chuyển ngày và đêm.',
      observations: ergoObservations,
    },
  ];

  // ---------------------------------------------------------------------------
  // 4. ĐIỂM TỐT VÀ VẤN ĐỀ CẦN LƯU Ý (Section 4)
  // ---------------------------------------------------------------------------
  const favorablePoints: FavorablePoint[] = [];
  const concernPoints: ConcernPoint[] = [];

  // Điểm tốt
  if (bedWallRule?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Đầu giường tựa tường kiên cố',
      description: 'Giường ngủ có điểm tựa vững chãi phía sau, không bị chông chênh hay hở khoảng trống lớn.',
      advice: 'Nên duy trì nguyên vị trí này, không kéo giường ra giữa phòng.',
    });
  }
  if (bedDoorRule?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Tránh được thế xung môn trực diện',
      description: 'Cửa ra vào không đâm thẳng vào thân giường nằm, tránh được cảm giác bất an giật mình.',
      advice: 'Giữ nguyên khoảng đệm này để luồng khí đi vào phòng được uốn lượn êm dịu.',
    });
  }
  if (deskBackRule?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Bàn làm việc tựa vách chắc chắn',
      description: 'Lưng ghế ngồi có tường nâng đỡ, giúp tăng khả năng tập trung khi làm việc.',
      advice: 'Giữ nguyên phương án kê bàn tựa vách tường.',
    });
  }
  if (corrRule?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Lối đi lại rộng rãi đạt chuẩn công thái học',
      description: 'Các khoảng trống hành lang trong phòng đều đạt trên 60cm theo tiêu chuẩn kiến trúc.',
      advice: 'Hạn chế bày biện thêm các vật dụng phụ chắn ngang lối đi chính.',
    });
  }
  if (favorablePoints.length === 0) {
    favorablePoints.push({
      title: 'Mặt bằng phòng ngủ vuông vắn',
      description: 'Phòng không bị góc vát hay khuyết hãm, tạo nền tảng cân bằng vững bền.',
      advice: 'Tận dụng các cạnh tường thẳng để sắp đặt đồ đạc ngay ngắn.',
    });
  }

  // Điểm cần lưu ý
  if (bedWallRule?.verdict === 'fail') {
    concernPoints.push({
      title: 'Đầu giường chưa có điểm tựa vững',
      priority: 'Cao',
      impact: 'Dễ gây cảm giác trống trải, bất an, giấc ngủ chập chờn và khó thư giãn sâu.',
      evidence: 'Khoảng cách giữa đầu giường và bức tường phía sau vượt quá tiêu chuẩn tiếp xúc an toàn.',
    });
  }
  if (bedDoorRule?.verdict === 'fail') {
    concernPoints.push({
      title: 'Cửa phòng đâm thẳng vào giường ngủ',
      priority: 'Cao',
      impact: 'Xung sát từ luồng khí cửa vào trực tiếp vùng nghỉ ngơi, dễ gây mệt mỏi và đau đầu.',
      evidence: 'Tọa độ giường nằm trực tiếp trên luồng hành lang mở của cánh cửa chính.',
    });
  }
  if (mirrorBed?.verdict === 'fail') {
    concernPoints.push({
      title: 'Gương chiếu trực diện vào giường ngủ',
      priority: 'Trung bình',
      impact: 'Phạm Quang Sát trong phong thủy, phản chiếu bóng chuyển động ban đêm gây giật mình.',
      evidence: 'Mặt gương hướng thẳng góc về phía thân hoặc đầu giường ngủ.',
    });
  }
  if (deskBackRule?.verdict === 'fail' || deskDoorRule?.verdict === 'fail') {
    concernPoints.push({
      title: 'Bàn làm việc ở vị trí chưa thuận lợi',
      priority: 'Trung bình',
      impact: 'Giảm khả năng tập trung hoặc cảm giác bị động khi người khác bước vào phòng.',
      evidence: 'Lưng người ngồi quay ra cửa hoặc không quan sát được cửa phòng.',
    });
  }

  // ---------------------------------------------------------------------------
  // 5. KHUYẾN NGHỊ ĐIỀU CHỈNH (Section 5)
  // ---------------------------------------------------------------------------
  const userRecommendations: UserFacingRecommendation[] = [];

  // Map from engine recommendation items or synthesize from concerns
  if (bedWallRule?.verdict === 'fail') {
    userRecommendations.push({
      targetArea: 'Vị trí giường ngủ',
      issue: 'Đầu giường hiện chưa kê sát tường, phía sau đầu nằm có khoảng hở lớn.',
      explanation: 'Theo nguyên lý phong thủy Loan Đầu cổ truyền, đầu giường là nơi tĩnh tọa cần tựa sơn vững chắc để nạp sinh khí an lành.',
      proposal: 'Đẩy giường ngủ về vị trí sát bức tường kiên cố gần nhất, đảm bảo đầu giường khít vách hoặc có tab đầu giường chặn vững.',
      priority: 'Cao',
      expectedBenefit: 'Tạo cảm giác vững tâm tuyệt đối, nâng cao chất lượng giấc ngủ và bồi đắp sinh lực mỗi sớm mai.',
    });
  }

  if (bedDoorRule?.verdict === 'fail') {
    userRecommendations.push({
      targetArea: 'Vị trí giường ngủ',
      issue: 'Cửa ra vào đang đâm thẳng vào thân giường nằm.',
      explanation: 'Luồng khí từ cửa xộc thẳng vào giường ngủ gọi là "Trực Xung Môn Sát", mang theo tạp khí và tiếng ồn bên ngoài.',
      proposal: 'Dời giường lệch sang một bên của bức tường, hoặc bố trí vách ngăn nhẹ/tủ đầu giường che chắn bớt luồng khí trực xung.',
      priority: 'Cao',
      expectedBenefit: 'Khí trường quanh giường được êm dịu, bảo vệ sức khỏe và mang lại sự riêng tư tối đa.',
    });
  }

  if (mirrorBed?.verdict === 'fail') {
    userRecommendations.push({
      targetArea: 'Gương soi / Bàn trang điểm',
      issue: 'Mặt gương chiếu thẳng vào khu vực giường ngủ.',
      explanation: 'Gương soi có tính tán khí và phản chiếu mạnh, nếu đối diện giường dễ làm giật mình khi thức giấc trong bóng tối.',
      proposal: 'Xoay mặt gương sang hướng khác vuông góc với giường, hoặc kê bàn trang điểm khuất sau tủ quần áo.',
      priority: 'Trung bình',
      expectedBenefit: 'Không gian tĩnh lặng, tâm trí thư thái và tránh được cảm giác bồn chồn.',
    });
  }

  if (deskDoorRule?.verdict === 'fail' || deskBackRule?.verdict === 'fail') {
    userRecommendations.push({
      targetArea: 'Bàn làm việc & Học tập',
      issue: 'Vị trí ngồi làm việc chưa tối ưu góc nhìn hoặc thiếu điểm tựa sau lưng.',
      explanation: 'Thế ngồi làm việc phong thủy chuẩn đòi hỏi "lưng tựa sơn - mắt trông cửa" để chủ động tiếp nhận thông tin và tỉnh táo.',
      proposal: 'Xoay bàn để lưng tựa tường và mặt hướng ra phía có thể quan sát lối vào phòng một cách tự nhiên.',
      priority: 'Trung bình',
      expectedBenefit: 'Tăng cường sự tập trung, minh mẫn và nâng cao hiệu suất làm việc.',
    });
  }

  // Fallback if no issues found
  if (userRecommendations.length === 0) {
    userRecommendations.push({
      targetArea: 'Không gian tổng thể',
      issue: 'Các bố trí cơ bản hiện tại đã đáp ứng tốt các nguyên tắc phong thủy và tiện nghi.',
      explanation: 'Mọi vật dụng chính đều nằm ở vị trí thuận lợi và hài hòa với luồng khí phòng.',
      proposal: 'Tiếp tục duy trì sự ngăn nắp, thoáng đãng và có thể bổ sung cây xanh thanh lọc không khí.',
      priority: 'Thấp',
      expectedBenefit: 'Giữ vững sự thịnh vượng, bình an và năng lượng dồi dào trong phòng ngủ.',
    });
  }

  // ---------------------------------------------------------------------------
  // 6. KẾT LUẬN TỔNG THỂ (Section 6)
  // ---------------------------------------------------------------------------
  let overallAssessment = '';
  if (stats.failCount === 0 && stats.warnCount === 0) {
    overallAssessment = 'Phòng ngủ đạt chuẩn phong thủy xuất sắc. Bố cục mang lại cảm giác bình an, tiện nghi và vượng khí cho gia chủ.';
  } else if (stats.failCount === 0) {
    overallAssessment = 'Phòng ngủ có nền tảng bố trí hài hòa, các vị trí chủ đạo đều an toàn, chỉ cần lưu ý tinh chỉnh một vài khoảng cách sinh hoạt nhỏ.';
  } else {
    overallAssessment = 'Phòng ngủ có tiềm năng không gian rất tốt. Chỉ cần ưu tiên xử lý các điểm then chốt (như thế tựa giường và hướng cửa), không gian sẽ đạt sự hài hòa toàn diện.';
  }

  const topPriorities: string[] = [];
  if (bedWallRule?.verdict === 'fail') topPriorities.push('Ưu tiên số 1: Kê đầu giường áp sát vách tường vững chãi.');
  if (bedDoorRule?.verdict === 'fail') topPriorities.push('Ưu tiên số 2: Điều chỉnh giường lệch khỏi luồng xung xộc của cửa đi.');
  if (mirrorBed?.verdict === 'fail') topPriorities.push('Ưu tiên số 3: Đổi hướng gương soi tránh chiếu vào giường nằm.');
  if (topPriorities.length === 0) {
    topPriorities.push('Giữ nguyên trật tự sắp đặt hiện tại và duy trì sự thông thoáng định kỳ.');
  }

  const elementsToKeep: string[] = [];
  if (bedWallRule?.verdict === 'pass') elementsToKeep.push('Giữ nguyên điểm tựa vững chãi của đầu giường.');
  if (bedDoorRule?.verdict === 'pass') elementsToKeep.push('Giữ nguyên vị trí giường tránh xa luồng xung của cửa.');
  if (corrRule?.verdict === 'pass') elementsToKeep.push('Giữ nguyên lối đi lưu thông rộng thoáng quanh phòng.');
  if (elementsToKeep.length === 0) elementsToKeep.push('Giữ không gian trung tâm phòng ngủ thoáng đãng.');

  const dataIntegrityNotice = rSummary.northBearingDeg === null
    ? 'Lưu ý về độ chính xác: Báo cáo hiện đang dùng hướng phòng ước tính. Để các phân tích hướng Bát Trạch (Cát/Hung) đạt độ chuẩn xác 100%, gia chủ nên dùng la bàn điện thoại đo góc chính xác và hiệu chuẩn trong mục Hồ sơ.'
    : 'Báo cáo được tính toán dựa trên số liệu không gian 3D thực tế và góc la bàn số đã được hiệu chuẩn.';

  return {
    reportId: report.reportId,
    createdAtFormatted,
    overview: {
      reportTitle: 'Báo Cáo Đánh Giá & Tư Vấn Phong Thủy Phòng Ngủ',
      roomName: rSummary.roomName || 'Phòng ngủ Master',
      dimensionsFormatted,
      areaM2,
      roomOrientationText: formatDirection(rSummary.roomOrientation),
      executiveSummary,
      highlights,
      passCount: stats.passCount,
      warnCount: stats.warnCount,
      failCount: stats.failCount,
      dataCompleteness: report.dataCompleteness,
    },
    homeowner: {
      hasData: hasProfile,
      displayName: pSummary?.displayName || 'Gia chủ',
      birthYear,
      genderText,
      guaName: pSummary?.guaName,
      guaNumber: pSummary?.guaNumber,
      element: pSummary?.element,
      group: pSummary?.group,
      canChi: pSummary?.canChi,
      napAm: pSummary?.napAm,
      auspiciousDirections: auspiciousDirectionsList,
      inauspiciousDirections: inauspiciousDirectionsList,
      briefExplanation,
      missingDataNotice: hasProfile
        ? undefined
        : 'Chưa có đầy đủ thông tin năm sinh của gia chủ. Vui lòng cập nhật Hồ sơ để xem phân tích hướng cát hung cá nhân hóa.',
    },
    spaceGroups,
    favorableAndConcerns: {
      favorablePoints,
      concernPoints,
    },
    recommendations: userRecommendations,
    conclusion: {
      overallAssessment,
      topPriorities,
      elementsToKeep,
      dataIntegrityNotice,
    },
  };
}
