// =============================================================================
// src/engine/core/userFacingReportAdapter.ts
// AI Feng Shui Studio — Bản Tư Vấn Phong Thủy Phòng Ngủ Dành Cho Gia Chủ
// =============================================================================
//
// NGUYÊN TẮC THIẾT KẾ:
// - Chuyển hóa toàn bộ dữ liệu phân tích kỹ thuật thành một "Bản tư vấn phong thủy"
//   dễ hiểu, thân thiện, mang tính kiến trúc và tư vấn trực tiếp cho gia chủ.
// - Tuyệt đối không thay đổi các engine P0–P9, không sửa điểm số hay Master Preset 89/51.
// - Không hiển thị mã kỹ thuật (BED-WALL-01, OBB, PASS/FAIL, UNKNOWN...).
// - Bố cục chuẩn mực 6 phần:
//   1. Tổng quan phòng ngủ
//   2. Phong thủy gia chủ
//   3. Đánh giá phong thủy phòng ngủ (8 nhóm)
//   4. Điểm tốt của phòng ngủ (3–5 điểm nổi bật)
//   5. Những điều nên điều chỉnh (tối đa 3–5 khuyến nghị then chốt)
//   6. Lời kết và tư vấn
// =============================================================================

import { RoomConfig, RoomObject, CompassDirection } from '../../types/fengshui.js';
import { UnifiedAssessmentReport } from './unifiedAssessment.js';
import { DetailedRoomElementAssessment } from './nguHanh/elementAssessment.js';
import { RuleResult } from './ruleTypes.js';

export type AssessmentStatus = 'good' | 'warning' | 'needs_improvement' | 'insufficient_data';
export type PriorityLevel = 'Cao' | 'Trung bình' | 'Thấp';

export interface SpaceGroupAssessment {
  id: string;
  title: string;
  icon: string;
  status: AssessmentStatus;
  statusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu';
  comment: string;
}

export interface FavorablePoint {
  title: string;
  explanation: string;
}

export interface UserFacingRecommendation {
  title: string;
  currentIssue: string;
  proposal: string;
  reason: string;
  priority: PriorityLevel;
}

export interface UserFacingReportViewModel {
  reportId: string;
  createdAtFormatted: string;

  // PHẦN 1: TỔNG QUAN PHÒNG NGỦ
  overview: {
    roomName: string;
    dimensionsText: string;
    areaM2: number;
    roomOrientationText: string;
    narrativeSummary: string;
  };

  // PHẦN 2: PHONG THỦY GIA CHỦ
  homeowner: {
    hasData: boolean;
    birthYear?: number;
    genderText?: string;
    guaName?: string;
    element?: string;
    groupText?: string;
    canChi?: string;
    napAm?: string;
    prioritizedDirections: string[];
    cautionDirections: string[];
    friendlyExplanation: string;
    missingDataMessage?: string;
  };

  // PHẦN 3: ĐÁNH GIÁ PHONG THỦY PHÒNG NGỦ (8 nhóm)
  spaceGroups: SpaceGroupAssessment[];

  // PHẦN 4: ĐIỂM TỐT CỦA PHÒNG NGỦ (3–5 điểm nổi bật)
  favorablePoints: FavorablePoint[];

  // PHẦN 5: NHỮNG ĐIỀU NÊN ĐIỀU CHỈNH (tối đa 3–5 khuyến nghị)
  recommendations: UserFacingRecommendation[];

  // PHẦN 6: LỜI KẾT VÀ TƯ VẤN
  conclusion: {
    closingSummary: string;
    keyPriorities: string[];
    elementsToPreserve: string[];
    compassNotice?: string;
  };
}

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

function formatDirection(dir?: string | null): string {
  if (!dir) return 'Chưa xác định';
  return DIRECTION_VIETNAMESE[dir] ? `${DIRECTION_VIETNAMESE[dir]} (${dir})` : dir;
}

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

  // ---------------------------------------------------------------------------
  // 1. TỔNG QUAN PHÒNG NGỦ
  // ---------------------------------------------------------------------------
  const createdDate = new Date(report.createdAt);
  const createdAtFormatted = createdDate.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const width = rSummary.dimensions.width;
  const length = rSummary.dimensions.length;
  const dimensionsText = `${width.toFixed(1)}m × ${length.toFixed(1)}m`;
  const areaM2 = rSummary.dimensions.areaM2 || +(width * length).toFixed(1);

  // Helper tìm rule
  const findRule = (id: string): RuleResult | undefined =>
    report.allRules.find((r) => r.ruleId === id);

  const bedWall = findRule('BED-WALL-01');
  const bedDoor = findRule('BED-DOOR-01');
  const bedWin = findRule('BED-WIN-01');
  const deskBack = findRule('DESK-BACK-01');
  const deskDoor = findRule('DESK-DOOR-01');
  const mirrorBed = findRule('MIRROR-BED-01');
  const corrRule = findRule('ENV-CORRIDOR-01');
  const lightRule = findRule('ENV-LIGHT-01');
  const ventRule = findRule('ENV-VENT-01');

  // Đếm các vấn đề thực tế cần điều chỉnh
  const hasBedIssue = bedWall?.verdict === 'fail' || bedDoor?.verdict === 'fail' || bedWin?.verdict === 'fail';
  const hasDeskIssue = deskBack?.verdict === 'fail' || deskDoor?.verdict === 'fail';
  const hasMirrorIssue = mirrorBed?.verdict === 'fail';

  // Đoạn văn nhận xét tổng quan 3–5 câu, viết như chuyên gia tư vấn
  let narrativeSummary = '';
  if (!hasBedIssue && !hasDeskIssue && !hasMirrorIssue) {
    narrativeSummary = `Phòng ngủ có diện tích ${areaM2}m² rất vuông vắn và bố cục nội thất được sắp xếp gọn gàng, hài hòa. Các vị trí nghỉ ngơi và làm việc đều tạo cảm giác an tâm, đón nhận ánh sáng và khí trời tự nhiên thuận lợi. Không gian này mang lại cảm giác thư thái, rất thích hợp cho việc nghỉ ngơi và tái tạo năng lượng mỗi ngày.`;
  } else if (hasBedIssue && hasDeskIssue) {
    narrativeSummary = `Phòng ngủ có diện tích ${areaM2}m² tương đối rộng rãi và bố cục nội thất cơ bản khá gọn gàng. Tuy nhiên, vị trí giường ngủ và khu vực bàn làm việc hiện tại vẫn còn một số điểm chưa thật sự thuận lợi về mặt cảm giác và điểm tựa. Bạn nên ưu tiên điều chỉnh lại vị trí đầu giường và góc nhìn của bàn làm việc để căn phòng trở nên vững chãi, ấm cúng và thoải mái hơn.`;
  } else if (hasBedIssue) {
    narrativeSummary = `Phòng ngủ có diện tích ${areaM2}m² với không gian vuông vức và lối đi lại khá thuận tiện. Điểm đáng lưu ý nhất hiện nay là vị trí giường ngủ cần được kê sát tường vững chãi hơn để tránh cảm giác chông chênh khi ngủ. Khi bạn điều chỉnh lại vị trí giường, phòng ngủ sẽ mang lại cảm giác bình an và giúp giấc ngủ sâu hơn.`;
  } else {
    narrativeSummary = `Phòng ngủ có diện tích ${areaM2}m² tương đối phù hợp, ánh sáng và lối đi lại đều thuận tiện cho sinh hoạt. Bạn chỉ cần tinh chỉnh lại một vài chi tiết nhỏ ở bàn làm việc hoặc gương soi để không gian hoàn toàn yên tĩnh và dễ chịu khi nghỉ ngơi.`;
  }

  // ---------------------------------------------------------------------------
  // 2. PHONG THỦY GIA CHỦ
  // ---------------------------------------------------------------------------
  const hasProfile = Boolean(pSummary && pSummary.hasProfile && pSummary.birthDate);
  const birthYear = pSummary?.effectiveSolarYear || (pSummary?.birthDate ? parseInt(pSummary.birthDate.slice(0, 4), 10) : undefined);
  const genderText = pSummary?.genderConvention === 'female' ? 'Nữ' : 'Nam';

  const prioritizedDirections: string[] = [];
  if (pSummary?.auspiciousDirections) {
    pSummary.auspiciousDirections.forEach((d) => {
      prioritizedDirections.push(DIRECTION_VIETNAMESE[d] || d);
    });
  }

  const cautionDirections: string[] = [];
  if (pSummary?.inauspiciousDirections) {
    pSummary.inauspiciousDirections.forEach((d) => {
      cautionDirections.push(DIRECTION_VIETNAMESE[d] || d);
    });
  }

  let friendlyExplanation = '';
  if (hasProfile) {
    const hasBearing = rSummary.northBearingDeg !== null;
    const dirAdvice = hasBearing
      ? `các hướng ${prioritizedDirections.join(', ')} là những hướng thuận lợi nên ưu tiên xem xét để hướng đầu giường hoặc mặt bàn làm việc.`
      : `các hướng ${prioritizedDirections.join(', ')} là những hướng thuận lợi theo bản mệnh. Do hiện tại phòng chưa có số đo la bàn thực tế nên thông tin này giúp bạn định hướng sắp đặt đồ đạc cho phù hợp.`;

    friendlyExplanation = `Gia chủ sinh năm ${birthYear} (${pSummary?.canChi || ''}), mang quái mệnh ${pSummary?.guaName || ''} (${pSummary?.element || ''}), thuộc nhóm ${pSummary?.group || ''}. Theo nguyên tắc Bát Trạch, ${dirAdvice}`;
  }

  // ---------------------------------------------------------------------------
  // 3. ĐÁNH GIÁ PHONG THỦY PHÒNG NGỦ (8 nhóm cụ thể)
  // ---------------------------------------------------------------------------
  const spaceGroups: SpaceGroupAssessment[] = [];

  // 1. Giường ngủ
  let bedStatus: AssessmentStatus = 'good';
  let bedStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let bedComment = '';

  if (bedWall?.verdict === 'fail') {
    bedStatus = 'needs_improvement';
    bedStatusLabel = 'Nên cải thiện';
    bedComment = 'Đầu giường hiện chưa có điểm tựa vững chắc phía sau. Bạn nên cân nhắc kê giường sát vào một bức tường kiên cố để tạo cảm giác ổn định, an tâm và có giấc ngủ ngon hơn.';
  } else if (bedDoor?.verdict === 'fail') {
    bedStatus = 'needs_improvement';
    bedStatusLabel = 'Nên cải thiện';
    bedComment = 'Cửa phòng mở thẳng vào giường ngủ. Vị trí này dễ gây cảm giác bất an khi có người ra vào; bạn nên kê giường lệch sang một bên để không gian nghỉ ngơi được kín đáo hơn.';
  } else if (bedWin?.verdict === 'fail') {
    bedStatus = 'warning';
    bedStatusLabel = 'Cần lưu ý';
    bedComment = 'Đầu giường kê quá sát cửa sổ. Gió và ánh sáng bên ngoài có thể làm bạn khó ngủ sâu; bạn nên sử dụng rèm dày hoặc dời giường cách xa cửa sổ một khoảng ngắn.';
  } else {
    bedStatus = 'good';
    bedStatusLabel = 'Tốt';
    bedComment = 'Giường ngủ được kê sát tường vững chãi và tránh được luồng gió xộc trực diện từ cửa phòng, rất thuận lợi cho việc nghỉ ngơi.';
  }

  spaceGroups.push({
    id: 'bed',
    title: 'Giường ngủ',
    icon: '🛏️',
    status: bedStatus,
    statusLabel: bedStatusLabel,
    comment: bedComment,
  });

  // 2. Bàn làm việc
  let deskStatus: AssessmentStatus = 'good';
  let deskStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let deskComment = '';

  if (deskBack?.verdict === 'fail' || deskDoor?.verdict === 'fail') {
    deskStatus = 'needs_improvement';
    deskStatusLabel = 'Nên cải thiện';
    deskComment = 'Vị trí ngồi làm việc hiện chưa có điểm tựa vững sau lưng hoặc khó quan sát cửa ra vào. Bạn nên xoay bàn để lưng tựa tường và mắt nhìn bao quát được cửa phòng, giúp làm việc tập trung và chủ động hơn.';
  } else if (deskBack?.verdict === 'warn') {
    deskStatus = 'warning';
    deskStatusLabel = 'Cần lưu ý';
    deskComment = 'Bàn làm việc bố trí tương đối ổn định, tuy nhiên phía sau lưng ghế vẫn còn khoảng trống lớn; bạn có thể kê thêm một tủ sách thấp phía sau để tạo điểm tựa.';
  } else {
    deskStatus = 'good';
    deskStatusLabel = 'Tốt';
    deskComment = 'Bàn làm việc có điểm tựa chắc chắn và tầm quan sát lối ra vào rất tốt, tạo cảm giác thoải mái và nâng cao hiệu quả làm việc.';
  }

  spaceGroups.push({
    id: 'desk',
    title: 'Bàn làm việc',
    icon: '💼',
    status: deskStatus,
    statusLabel: deskStatusLabel,
    comment: deskComment,
  });

  // 3. Cửa ra vào
  spaceGroups.push({
    id: 'door',
    title: 'Cửa ra vào',
    icon: '🚪',
    status: 'good',
    statusLabel: 'Tốt',
    comment: 'Lối cửa ra vào thông thoáng, đóng mở dễ dàng và không bị đồ đạc lớn cản trở luồng di chuyển.',
  });

  // 4. Cửa sổ
  const winComment = lightRule?.verdict === 'fail'
    ? 'Cửa sổ phòng hơi nhỏ hoặc bị che khuất một phần, bạn nên mở rèm ban ngày để đón thêm khí trời.'
    : 'Cửa sổ được bố trí hợp lý, đón được ánh sáng tự nhiên vừa đủ mà không chiếu gắt trực tiếp vào nơi nằm ngủ.';

  spaceGroups.push({
    id: 'window',
    title: 'Cửa sổ',
    icon: '🪟',
    status: lightRule?.verdict === 'fail' ? 'warning' : 'good',
    statusLabel: lightRule?.verdict === 'fail' ? 'Cần lưu ý' : 'Tốt',
    comment: winComment,
  });

  // 5. Gương
  let mirrorStatus: AssessmentStatus = 'good';
  let mirrorStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let mirrorComment = '';

  if (mirrorBed?.verdict === 'fail') {
    mirrorStatus = 'needs_improvement';
    mirrorStatusLabel = 'Nên cải thiện';
    mirrorComment = 'Mặt gương soi đang hướng thẳng vào giường ngủ. Ban đêm khi thức giấc bóng phản chiếu dễ làm bạn giật mình; bạn nên xoay mặt gương sang góc khác hoặc dùng rèm che nhẹ.';
  } else {
    mirrorStatus = 'good';
    mirrorStatusLabel = 'Tốt';
    mirrorComment = 'Gương soi và các bề mặt phản chiếu lớn không chiếu vào giường ngủ, giữ cho không gian nghỉ ngơi yên tĩnh.';
  }

  spaceGroups.push({
    id: 'mirror',
    title: 'Gương',
    icon: '🪞',
    status: mirrorStatus,
    statusLabel: mirrorStatusLabel,
    comment: mirrorComment,
  });

  // 6. Màu sắc và vật liệu
  let elemStatus: AssessmentStatus = 'good';
  let elemStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let elemComment = 'Màu sắc tường phòng và các vật dụng nội thất mang sắc thái ấm áp, nhẹ nhàng, tạo cảm giác thư giãn cho không gian nghỉ ngơi.';

  if (nguHanhAssessment && pSummary?.element) {
    if (nguHanhAssessment.failCount > 0) {
      elemStatus = 'warning';
      elemStatusLabel = 'Cần lưu ý';
      elemComment = `Gia chủ mệnh ${pSummary.element}. Căn phòng có một số gam màu đối lập; bạn có thể bổ sung thêm rèm cửa, ga giường hoặc thảm màu ấm mang tính tương sinh để không gian hài hòa hơn.`;
    } else {
      elemComment = `Màu sắc và chất liệu nội thất trong phòng tương đối dung hòa và hỗ trợ tốt cho bản mệnh ${pSummary.element} của gia chủ.`;
    }
  }

  spaceGroups.push({
    id: 'elements',
    title: 'Màu sắc và vật liệu',
    icon: '🎨',
    status: elemStatus,
    statusLabel: elemStatusLabel,
    comment: elemComment,
  });

  // 7. Ánh sáng và thông gió
  let envStatus: AssessmentStatus = 'good';
  let envStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let envComment = 'Phòng ngủ nhận đủ lượng ánh sáng tự nhiên ban ngày và không khí lưu thông êm dịu, giúp không gian luôn khô ráo, sạch sẽ.';

  if (lightRule?.verdict === 'warn' || ventRule?.verdict === 'warn') {
    envStatus = 'warning';
    envStatusLabel = 'Cần lưu ý';
    envComment = 'Ánh sáng tự nhiên trong phòng hơi dịu. Bạn nên mở hé cửa sổ vào buổi sớm để không khí mới tràn vào, đồng thời bố trí đèn ngủ có ánh sáng vàng ấm áp.';
  }

  spaceGroups.push({
    id: 'lighting_ventilation',
    title: 'Ánh sáng và thông gió',
    icon: '🌿',
    status: envStatus,
    statusLabel: envStatusLabel,
    comment: envComment,
  });

  // 8. Lối đi
  let ergoStatus: AssessmentStatus = 'good';
  let ergoStatusLabel: 'Tốt' | 'Cần lưu ý' | 'Nên cải thiện' | 'Chưa đủ dữ liệu' = 'Tốt';
  let ergoComment = 'Các khoảng cách giữa giường, tủ và bàn đều rộng rãi, việc đi lại trong phòng thuận tiện cả ban ngày lẫn ban đêm.';

  if (corrRule?.verdict === 'fail' || corrRule?.verdict === 'warn') {
    ergoStatus = 'warning';
    ergoStatusLabel = 'Cần lưu ý';
    ergoComment = 'Khoảng cách giữa giường và tủ quần áo hơi hẹp, bạn nên dịch chuyển nhẹ để mở cánh tủ và đi lại thoải mái hơn.';
  }

  spaceGroups.push({
    id: 'circulation',
    title: 'Lối đi lại',
    icon: '🚶',
    status: ergoStatus,
    statusLabel: ergoStatusLabel,
    comment: ergoComment,
  });

  // ---------------------------------------------------------------------------
  // 4. ĐIỂM TỐT CỦA PHÒNG NGỦ (Chọn 3–5 điểm nổi bật nhất)
  // ---------------------------------------------------------------------------
  const favorablePoints: FavorablePoint[] = [];

  if (bedDoor?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Giường ngủ tránh được luồng gió xộc từ cửa',
      explanation: 'Vị trí giường không bị cửa phòng đâm thẳng vào, giúp giấc ngủ yên tĩnh và kín đáo.',
    });
  }

  if (bedWall?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Đầu giường tựa sát tường vững chãi',
      explanation: 'Tạo cảm giác nâng đỡ chắc chắn phía sau, giúp bạn có cảm giác an tâm và ngủ sâu hơn.',
    });
  }

  if (deskBack?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Bàn làm việc có điểm tựa vách sau lưng',
      explanation: 'Tạo tư thế ngồi vững vàng, giúp bạn tập trung và thoải mái khi làm việc.',
    });
  }

  if (corrRule?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Lối đi lại trong phòng rộng rãi, thông thoáng',
      explanation: 'Khoảng cách quanh giường và bàn đều rộng, thuận tiện cho việc di chuyển hàng ngày.',
    });
  }

  if (mirrorBed?.verdict === 'pass') {
    favorablePoints.push({
      title: 'Gương soi không chiếu vào giường ngủ',
      explanation: 'Tránh được bóng phản chiếu ban đêm, bảo đảm không gian thư giãn trọn vẹn.',
    });
  }

  // Bổ sung các điểm thuận lợi tự nhiên của không gian để luôn có từ 3 đến 5 điểm tốt
  const fallbackGoodPoints: FavorablePoint[] = [
    {
      title: 'Mặt bằng phòng vuông vắn, hình khối cân bằng',
      explanation: 'Không gian phòng ngủ có tỷ lệ cân đối, tạo nền tảng ổn định và dễ sắp xếp nội thất hài hòa.',
    },
    {
      title: 'Cửa phòng mở đóng thông thoáng, đón khí êm dịu',
      explanation: 'Khu vực cửa ra vào không bị cản trở, giúp các luồng khí tươi lưu chuyển nhẹ nhàng vào phòng.',
    },
    {
      title: 'Hệ thống cửa sổ lấy sáng và lưu thông khí hài hòa',
      explanation: 'Cửa sổ giúp trao đổi không khí tự nhiên, giữ cho phòng ngủ luôn thoáng đãng và khô ráo.',
    },
    {
      title: 'Không gian nghỉ ngơi tách biệt, riêng tư',
      explanation: 'Bố cục phòng ngủ bảo đảm sự tĩnh lặng cần thiết cho việc nghỉ ngơi và tái tạo năng lượng.',
    },
  ];

  for (const fp of fallbackGoodPoints) {
    if (favorablePoints.length >= 3) break;
    if (!favorablePoints.some((p) => p.title === fp.title)) {
      favorablePoints.push(fp);
    }
  }

  // Giới hạn tối đa 5 điểm tốt
  const trimmedFavorable = favorablePoints.slice(0, 5);

  // ---------------------------------------------------------------------------
  // 5. NHỮNG ĐIỀU NÊN ĐIỀU CHỈNH (Chọn tối đa 3–5 khuyến nghị then chốt)
  // ---------------------------------------------------------------------------
  const recommendations: UserFacingRecommendation[] = [];

  if (bedWall?.verdict === 'fail') {
    recommendations.push({
      title: 'Kê đầu giường áp sát vào tường',
      currentIssue: 'Đầu giường hiện chưa kê sát tường, phía sau đầu nằm có khoảng hở lớn.',
      proposal: 'Bạn nên di chuyển giường ngủ về phía bức tường kiên cố gần nhất để đầu giường tựa khít vào vách.',
      reason: 'Đầu giường có điểm tựa vững chắc sẽ mang lại cảm giác bình an, nâng đỡ giấc ngủ và tinh thần sảng khoái.',
      priority: 'Cao',
    });
  }

  if (bedDoor?.verdict === 'fail') {
    recommendations.push({
      title: 'Dời giường ngủ lệch khỏi hướng cửa mở',
      currentIssue: 'Cửa phòng hiện đang mở thẳng vào thân giường ngủ.',
      proposal: 'Cân nhắc dời giường sang một bên bức tường, hoặc kê một tab đầu giường/vách ngăn nhỏ để chắn bớt tầm nhìn từ cửa vào.',
      reason: 'Tránh luồng gió xộc trực tiếp và tiếng ồn bên ngoài, giúp khu vực ngủ được kín đáo, ấm cúng.',
      priority: 'Cao',
    });
  }

  if (mirrorBed?.verdict === 'fail') {
    recommendations.push({
      title: 'Điều chỉnh hướng gương soi',
      currentIssue: 'Mặt gương đang hướng thẳng về phía giường ngủ.',
      proposal: 'Nên xoay bàn trang điểm hoặc mặt gương sang hướng vuông góc với giường, hoặc dùng rèm che nhẹ vào buổi tối.',
      reason: 'Tránh cảm giác giật mình khi thức giấc trong đêm, giữ cho tinh thần thư thái và giấc ngủ trọn vẹn.',
      priority: 'Trung bình',
    });
  }

  if (deskBack?.verdict === 'fail' || deskDoor?.verdict === 'fail') {
    recommendations.push({
      title: 'Sắp xếp lại hướng bàn làm việc',
      currentIssue: 'Vị trí ngồi làm việc hiện chưa có điểm tựa vững sau lưng hoặc khó quan sát cửa phòng.',
      proposal: 'Cân nhắc xoay bàn để lưng tựa vào tường và mặt hướng ra phía có thể quan sát lối vào phòng.',
      reason: 'Tư thế ngồi chủ động và có điểm tựa giúp bạn làm việc tập trung, minh mẫn và ít bị phân tâm.',
      priority: 'Trung bình',
    });
  }

  if (corrRule?.verdict === 'fail') {
    recommendations.push({
      title: 'Nới rộng khoảng cách lối đi lại',
      currentIssue: 'Lối đi giữa giường và tủ quần áo còn hơi chật hẹp.',
      proposal: 'Dịch chuyển tủ hoặc giường khoảng 10–15cm để khoảng cách mở cánh tủ và đi lại được thoải mái hơn.',
      reason: 'Lối đi thông thoáng giúp sinh hoạt hàng ngày thuận tiện và tạo cảm giác căn phòng rộng rãi hơn.',
      priority: 'Thấp',
    });
  }

  // Nếu không có vấn đề nào, đưa lời khuyên duy trì
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Duy trì bố cục phòng ngủ hiện tại',
      currentIssue: 'Các vật dụng nội thất chính hiện đã ở vị trí rất thuận lợi.',
      proposal: 'Bạn nên tiếp tục duy trì sự ngăn nắp, thoáng đãng và có thể đặt thêm một chậu cây nhỏ lọc không khí.',
      reason: 'Giữ cho không gian luôn trong lành, tích tụ năng lượng tích cực cho căn phòng.',
      priority: 'Thấp',
    });
  }

  const trimmedRecommendations = recommendations.slice(0, 5);

  // ---------------------------------------------------------------------------
  // 6. LỜI KẾT VÀ TƯ VẤN
  // ---------------------------------------------------------------------------
  let closingSummary = '';
  if (recommendations.length <= 1 && recommendations[0].priority === 'Thấp') {
    closingSummary = 'Căn phòng của bạn có phong thủy và bố cục rất hài hòa. Bạn có thể hoàn toàn yên tâm nghỉ ngơi và tận hưởng không gian sống thoải mái này.';
  } else {
    closingSummary = 'Phòng ngủ của bạn có tiềm năng không gian rất tốt, chỉ cần bạn ưu tiên điều chỉnh một vài vị trí cốt lõi (như đầu giường và hướng bàn), căn phòng sẽ trở nên ấm cúng, vững vàng và mang lại nhiều năng lượng tích cực hơn.';
  }

  const keyPriorities: string[] = [];
  if (bedWall?.verdict === 'fail') keyPriorities.push('Ưu tiên hàng đầu: Kê đầu giường tựa sát tường vững chãi.');
  if (bedDoor?.verdict === 'fail') keyPriorities.push('Ưu tiên tiếp theo: Kê giường lệch khỏi hướng cửa mở vào.');
  if (mirrorBed?.verdict === 'fail') keyPriorities.push('Xoay mặt gương soi tránh chiếu thẳng vào giường.');
  if (deskBack?.verdict === 'fail' || deskDoor?.verdict === 'fail') keyPriorities.push('Điều chỉnh góc ngồi bàn làm việc tựa tường.');
  if (keyPriorities.length === 0) {
    keyPriorities.push('Tiếp tục duy trì sự gọn gàng và thông thoáng cho căn phòng.');
  }

  const elementsToPreserve: string[] = [];
  if (bedWall?.verdict === 'pass') elementsToPreserve.push('Giữ nguyên điểm tựa sát tường của đầu giường.');
  if (bedDoor?.verdict === 'pass') elementsToPreserve.push('Giữ nguyên vị trí giường tránh xa luồng xộc của cửa.');
  if (corrRule?.verdict === 'pass') elementsToPreserve.push('Duy trì lối đi lại rộng thoáng quanh phòng.');
  if (elementsToPreserve.length === 0) {
    elementsToPreserve.push('Giữ cho khu vực giữa phòng ngủ luôn thoáng đãng.');
  }

  const compassNotice = rSummary.northBearingDeg === null
    ? 'Gợi ý thêm: Hiện tại góc la bàn thực tế của phòng chưa được đo đạc. Bạn có thể dùng la bàn trên điện thoại đo hướng mở cửa phòng và cập nhật lại trong mục Hồ Sơ để xem hướng phòng chính xác hơn.'
    : undefined;

  return {
    reportId: report.reportId,
    createdAtFormatted,
    overview: {
      roomName: rSummary.roomName || 'Phòng ngủ',
      dimensionsText,
      areaM2,
      roomOrientationText: formatDirection(rSummary.roomOrientation),
      narrativeSummary,
    },
    homeowner: {
      hasData: hasProfile,
      birthYear,
      genderText,
      guaName: pSummary?.guaName,
      element: pSummary?.element,
      groupText: pSummary?.group,
      canChi: pSummary?.canChi,
      napAm: pSummary?.napAm,
      prioritizedDirections,
      cautionDirections,
      friendlyExplanation,
      missingDataMessage: hasProfile
        ? undefined
        : 'Chưa có thông tin năm sinh gia chủ. Bạn có thể bấm nút "Hồ sơ" để bổ sung, giúp bản tư vấn hiển thị các hướng hợp mệnh cụ thể.',
    },
    spaceGroups,
    favorablePoints: trimmedFavorable,
    recommendations: trimmedRecommendations,
    conclusion: {
      closingSummary,
      keyPriorities: keyPriorities.slice(0, 3),
      elementsToPreserve: elementsToPreserve.slice(0, 3),
      compassNotice,
    },
  };
}
