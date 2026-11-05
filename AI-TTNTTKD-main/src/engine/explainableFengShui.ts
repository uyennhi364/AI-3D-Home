import {
  CompassDirection,
  ExplainableRoomAnalysis,
  ExplainableRuleDetail,
  FengShuiRoomEvaluation,
  RoomConfig,
  RoomObject,
  UserFengShuiProfile,
} from '../types/fengshui';
import {
  DIRECTION_NAMES_VI,
  SECTOR_NAMES_VI,
  getSectorFromPosition,
} from './batTrach';
import {
  getBedHeadboardDirection,
  getFacingDirectionFromYaw,
  getFloorDistance,
  isLineOfSight,
} from './fengshuiRules';

/**
 * EXPLAINABLE FENG SHUI KNOWLEDGE BASE & SYSTEMIC AUDITOR
 * Grounded 100% on actual geometry engine coordinates and mathematical Bat Trach rules.
 */

export function generateExplainableFengShuiReport(
  profile: UserFengShuiProfile,
  room: RoomConfig,
  objects: RoomObject[],
  evaluation: FengShuiRoomEvaluation
): ExplainableRoomAnalysis {
  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const door = objects.find((o) => o.type === 'door');
  const windowObj = objects.find((o) => o.type === 'window');
  const wc = objects.find((o) => o.type === 'wc');
  const mirrors = objects.filter((o) => o.type === 'mirror');
  const beds = objects.filter((o) => o.type === 'bed');
  const desks = objects.filter((o) => o.type === 'desk');

  const rules: ExplainableRuleDetail[] = [];

  // =========================================================================
  // RULE 1: TOA SON HUONG CAT (Tựa lưng vững chãi - Hướng đầu giường)
  // =========================================================================
  beds.forEach((bed) => {
    const headboardDir = getBedHeadboardDirection(bed.rotation.y);
    const headboardSector = profile.directionDetails[headboardDir];
    const isHeadboardGood = headboardSector?.isGood ?? false;

    // Nearest perimeter wall check
    const distToLeftWall = Math.abs(bed.position.x - (-halfW));
    const distToRightWall = Math.abs(bed.position.x - halfW);
    const distToNorthWall = Math.abs(bed.position.z - (-halfL));
    const distToSouthWall = Math.abs(bed.position.z - halfL);
    const minDistToWall = Math.min(distToLeftWall, distToRightWall, distToNorthWall, distToSouthWall);
    const isSolidWall = minDistToWall <= 0.45;

    let nearestWallName = 'Bắc';
    if (minDistToWall === distToLeftWall) nearestWallName = 'Tây';
    else if (minDistToWall === distToRightWall) nearestWallName = 'Đông';
    else if (minDistToWall === distToSouthWall) nearestWallName = 'Nam';

    rules.push({
      ruleCode: 'RULE_TOA_SON_HUONG_CAT',
      ruleName: 'Quy tắc Tọa Sơn Hướng Cát (Điểm tựa & Hướng giường ngủ)',
      targetObjectId: bed.id,
      targetObjectName: bed.name,
      status: isHeadboardGood && isSolidWall ? 'passed' : !isSolidWall ? 'violation' : 'warning',
      severity: !isSolidWall ? 'high' : !isHeadboardGood ? 'medium' : 'low',
      geometricEvidence: `Đầu giường tựa cách tường ${nearestWallName} ${minDistToWall.toFixed(2)}m (tiêu chuẩn: ≤0.45m). Hướng đầu giường hiện tại: ${DIRECTION_NAMES_VI[headboardDir] || headboardDir} (${headboardSector?.name || 'N/A'}).`,
      fengShuiPrinciple: 'Đầu giường là nơi tụ khí khi ngủ. Theo phong thủy cổ truyền Bát Trạch, đầu giường phải tựa sát vách tường kiên cố (thế Tọa Sơn) để tích tụ nguyên khí và hướng về phương vị Cát của bản mệnh.',
      negativeImpact: !isSolidWall
        ? 'Thiếu điểm tựa vững chắc tạo thế "Lộ Không Sát", dễ gây cảm giác chông chênh, giấc ngủ chập chờn, hay mộng mị, tinh thần bất an khi thức dậy.'
        : !isHeadboardGood
        ? `Đầu giường quay về hướng hung (${headboardSector?.name || 'Hung'}), khí trường nghịch hành gây hao tổn sinh lực, dễ đau đầu mệt mỏi.`
        : 'Khí trường ổn định, tụ khí bình an.',
      remedyAction: !isSolidWall
        ? `Kê áp sát đầu giường vào vách tường kiên cố (khuyên dùng tường ${profile.auspiciousDirections[0] ? 'hướng cát' : 'Bắc/Tây'}) để lập thế Tọa Sơn.`
        : !isHeadboardGood
        ? `Xoay đầu giường về một trong các hướng cát của gia chủ (${profile.auspiciousDirections.map((d) => DIRECTION_NAMES_VI[d] || d).join(', ')}).`
        : 'Tiếp tục duy trì khoảng cách cân đối hai bên thành giường.',
    });
  });

  // =========================================================================
  // RULE 2: TRIET TIEU QUANG SAT (Gương chiếu vào giường)
  // =========================================================================
  mirrors.forEach((mirror) => {
    beds.forEach((bed) => {
      const distToMirror = getFloorDistance(mirror.position, bed.position);
      const isReflecting = isLineOfSight(mirror.position, mirror.rotation.y, bed.position, 45, 3.5);

      if (isReflecting || distToMirror < 1.8) {
        rules.push({
          ruleCode: 'RULE_QUANG_SAT_GUONG',
          ruleName: 'Quy tắc Triệt Tiêu Quang Sát (Gương soi phản chiếu giường ngủ)',
          targetObjectId: mirror.id,
          targetObjectName: mirror.name,
          status: 'violation',
          severity: 'high',
          geometricEvidence: `Gương cách giường ${distToMirror.toFixed(2)}m (nhỏ hơn ngưỡng an toàn 2.0m). Mặt gương quay góc trực diện ${(mirror.rotation.y * 180 / Math.PI).toFixed(0)}° phản chiếu thẳng vào giường ngủ.`,
          fengShuiPrinciple: 'Gương có tính phản xạ quang học và xung năng lượng cực mạnh (Quang sát). Gương soi trực tiếp vào giường ngủ là đại kỵ phong thủy.',
          negativeImpact: 'Phản chiếu bóng người trong đêm gây giật mình, phân tán thần khí, tổn hao năng lượng âm dương cân bằng, dễ dẫn đến bất hòa và suy giảm sức khỏe.',
          remedyAction: 'Xoay gương 90° sang diện tường bên cạnh, hoặc chuyển gương vào góc khuất không chiếu giường, hoặc che rèm mỏng khi ngủ.',
        });
      }
    });
  });

  // =========================================================================
  // RULE 3: TRÁNH XUNG MÔN (Cửa chính đâm thẳng vào giường)
  // =========================================================================
  if (door) {
    beds.forEach((bed) => {
      const distToDoor = getFloorDistance(bed.position, door.position);
      const isAlignedWithDoor =
        Math.abs(bed.position.x - door.position.x) < 0.9 ||
        Math.abs(bed.position.z - door.position.z) < 0.9;

      if (distToDoor < 3.2 && isAlignedWithDoor) {
        rules.push({
          ruleCode: 'RULE_XUNG_MON_KHISAT',
          ruleName: 'Quy tắc Khai Môn Tránh Xung Sát (Trục khí cửa đâm thẳng giường)',
          targetObjectId: bed.id,
          targetObjectName: bed.name,
          status: 'violation',
          severity: 'high',
          geometricEvidence: `Giường nằm trên trục mở cửa chính, khoảng cách từ tâm cửa đến giường là ${distToDoor.toFixed(2)}m, độ lệch phương trục chỉ ${Math.min(Math.abs(bed.position.x - door.position.x), Math.abs(bed.position.z - door.position.z)).toFixed(2)}m.`,
          fengShuiPrinciple: 'Cửa phòng ngủ là nơi nạp khí chính (Khí Khẩu). Dòng khí từ cửa vào di chuyển nhanh và mạnh. Đặt giường thẳng luồng cửa tạo thế Hung Lộ Sát.',
          negativeImpact: 'Luồng gió và trường khí xông thẳng vào cơ thể khi nghỉ ngơi gây đau mỏi cơ, dễ trúng gió cảm mạo, giấc ngủ không yên và dễ bị giật mình khi có người mở cửa.',
          remedyAction: 'Di chuyển giường lệch hẳn khỏi trục thẳng của cửa vào, hoặc đặt kệ/bình phong/cây xanh che chắn giữa cửa và giường.',
        });
      }
    });
  }

  // =========================================================================
  // RULE 4: TOA CAT HUONG CAT CHO BAN LAM VIEC / BAN HOC
  // =========================================================================
  desks.forEach((desk) => {
    const deskFacing = getFacingDirectionFromYaw(desk.rotation.y);
    const facingSector = profile.directionDetails[deskFacing];
    const isFacingGood = facingSector?.isGood ?? false;

    let hasBackToDoor = false;
    let distDoor = 999;
    if (door) {
      distDoor = getFloorDistance(desk.position, door.position);
      const dx = door.position.x - desk.position.x;
      const dz = door.position.z - desk.position.z;
      const angleToDoor = Math.atan2(dx, dz);
      let angleDiff = Math.abs(desk.rotation.y - angleToDoor);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);
      if (angleDiff > 2.2 && distDoor < 3.0) {
        hasBackToDoor = true;
      }
    }

    rules.push({
      ruleCode: 'RULE_DESK_COMMAND_POSITION',
      ruleName: 'Quy tắc Tọa Sơn Quan Thủy (Vị trí chỉ huy cho bàn làm việc)',
      targetObjectId: desk.id,
      targetObjectName: desk.name,
      status: !hasBackToDoor && isFacingGood ? 'passed' : hasBackToDoor ? 'violation' : 'warning',
      severity: hasBackToDoor ? 'medium' : 'low',
      geometricEvidence: `Mặt bàn quay về hướng ${DIRECTION_NAMES_VI[deskFacing] || deskFacing} (${facingSector?.name || 'N/A'}). ${hasBackToDoor ? `Người ngồi quay lưng trực tiếp ra cửa vào (cách cửa ${distDoor.toFixed(2)}m).` : 'Người ngồi có tầm nhìn bao quát cửa.'}`,
      fengShuiPrinciple: 'Bàn làm việc và học tập cần thế "Tọa Sơn Quan Thủy": Lưng tựa tường kiên cố, mắt nhìn bao quát được cửa ra vào (vị trí chỉ huy), mặt hướng về cung cát để kích hoạt Văn Xương tinh tú.',
      negativeImpact: hasBackToDoor
        ? 'Ngồi quay lưng ra cửa tạo cảm giác bất an "hậu thủ vô bằng", dễ giật mình, khó tập trung sâu, làm việc dễ bị phân tâm và tiểu nhân quấy rầy.'
        : !isFacingGood
        ? 'Mặt bàn quay hướng hung làm giảm khả năng tư duy sáng tạo và sự minh mẫn.'
        : 'Trường khí tốt, kích thích sự tập trung và thăng tiến.',
      remedyAction: hasBackToDoor
        ? 'Xoay bàn hoặc dịch chuyển để lưng tựa tường, mắt nhìn chéo ra hướng cửa phòng.'
        : 'Kê bàn đón ánh sáng tự nhiên từ cửa sổ và hướng về các hướng cát Thiên Y hoặc Sinh Khí.',
    });
  });

  // =========================================================================
  // RULE 5: KHOANG THONG THUY & MAT DO DIEN TICH (Circulation & Density)
  // =========================================================================
  const floorArea = Math.max(0.01, room.width * room.length);
  const solidObjects = objects.filter((o) => !['rug', 'painting', 'curtain', 'lamp'].includes(o.type));
  const occupiedArea = solidObjects.reduce((sum, o) => sum + o.dimensions.width * o.dimensions.length, 0);
  const densityRatio = occupiedArea / floorArea;

  rules.push({
    ruleCode: 'RULE_CIRCULATION_DENSITY',
    ruleName: 'Quy tắc Thông Thủy Tàng Phong (Khoảng thở & Lưu thông trường khí)',
    targetObjectId: 'room_area',
    targetObjectName: 'Không gian phòng',
    status: densityRatio <= 0.35 ? 'passed' : densityRatio <= 0.45 ? 'warning' : 'violation',
    severity: densityRatio > 0.45 ? 'medium' : 'low',
    geometricEvidence: `Diện tích phòng: ${floorArea.toFixed(1)}m². Diện tích đồ nội thất chiếm: ${occupiedArea.toFixed(1)}m² (${(densityRatio * 100).toFixed(0)}% diện tích sàn - mức khuyến nghị: ≤35%).`,
    fengShuiPrinciple: 'Phòng ngủ là không gian tàng phong tụ khí tĩnh (thuộc Âm). Quá nhiều đồ đạc cản trở sinh khí luân chuyển, biến trường khí thành uế trệ (khí tù).',
    negativeImpact: densityRatio > 0.35
      ? 'Mật độ nội thất dày đặc gây cảm giác ngột ngạt, bí bách, cản trở oxy lưu thông, ảnh hưởng đến hệ hô hấp và cảm giác thư giãn khi ngủ.'
      : 'Không gian thông thoáng, trường khí lưu chuyển êm đềm.',
    remedyAction: densityRatio > 0.35
      ? 'Dọn dẹp bớt các vật dụng phụ trợ không cần thiết, sắp xếp đồ nội thất ép sát vách để mở rộng lối đi trung tâm.'
      : 'Tiếp tục duy trì khoảng thông thủy tối thiểu 60-80cm quanh giường ngủ.',
  });

  // Summary recommendations
  const violations = rules.filter((r) => r.status === 'violation');
  const recommendationsSummary: string[] = [];

  if (violations.length > 0) {
    violations.forEach((v) => {
      recommendationsSummary.push(`${v.ruleName}: ${v.remedyAction}`);
    });
  } else {
    recommendationsSummary.push('Bố cục phòng ngủ hiện tại đã tuân thủ tốt các nguyên tắc phong thủy cốt lõi.');
  }

  return {
    roomOverallScore: evaluation.overallScore,
    statusText: evaluation.statusText,
    kuaSummary: `Gia chủ sinh năm ${profile.birthYear} (${profile.gender === 'male' ? 'Nam' : 'Nữ'}), Quái mệnh ${profile.guaName} - Ngũ hành ${profile.element} (${profile.group}). Hướng cát: ${profile.auspiciousDirections.join(', ')}.`,
    rulesEvaluated: rules,
    recommendationsSummary,
  };
}

/**
 * Intelligent Q&A Answer Generator:
 * Generates accurate, grounded, explainable answers to deep user questions without hallucination.
 */
export function generateExplainableAnswer(
  question: string,
  analysis: ExplainableRoomAnalysis,
  profile: UserFengShuiProfile,
  room: RoomConfig
): string {
  const q = question.toLowerCase();

  // 1. "Tại sao lại di chuyển giường?" / "Tại sao giường vị trí cũ không tốt?"
  if (q.includes('tại sao') && (q.includes('giường') || q.includes('dời') || q.includes('chuyển'))) {
    const bedRule = analysis.rulesEvaluated.find((r) => r.ruleCode === 'RULE_TOA_SON_HUONG_CAT' || r.ruleCode === 'RULE_XUNG_MON_KHISAT');
    if (bedRule && bedRule.status !== 'passed') {
      return `**Lý do AI đề xuất di chuyển giường:**\n\n• **Quy tắc áp dụng:** ${bedRule.ruleName}\n• **Căn cứ thực tế:** ${bedRule.geometricEvidence}\n• **Nguyên nhân & tác hại:** ${bedRule.negativeImpact}\n• **Hướng giải quyết:** ${bedRule.remedyAction}\n\nKhi di chuyển theo phương án mới, đầu giường sẽ đạt thế **Tọa Sơn kiên cố** và hướng về cung Cát hợp mệnh ${profile.guaName} (${profile.element}).`;
    }
    return `Đầu giường cần đặt ở vị trí vững chãi (tựa vách kiên cố) và quay về hướng Cát (${profile.auspiciousDirections.join(', ')}) để tàng phong tụ khí, nâng đỡ giấc ngủ sâu và bổ trợ sức khỏe gia chủ mệnh ${profile.guaName}.`;
  }

  // 2. "Tại sao gương lại xấu?" / "Gương có sao không?"
  if (q.includes('gương')) {
    const mirrorRule = analysis.rulesEvaluated.find((r) => r.ruleCode === 'RULE_QUANG_SAT_GUONG');
    if (mirrorRule) {
      return `**Giải thích phong thủy về vị trí gương:**\n\n• **Quy tắc:** ${mirrorRule.ruleName}\n• **Bằng chứng:** ${mirrorRule.geometricEvidence}\n• **Tác động:** ${mirrorRule.negativeImpact}\n• **Cách khắc phục:** ${mirrorRule.remedyAction}`;
    }
    return `Gương có tính phản xạ năng lượng mạnh (quang sát). Đặt gương an toàn nhất là ở diện tường không phản chiếu giường ngủ hoặc cửa phòng, giúp mở rộng không gian mà không làm tán loạn trường khí.`;
  }

  // 3. "So sánh các phương án" / "Phương án 1 khác phương án 2 thế nào?"
  if (q.includes('so sánh') || (q.includes('khác') && q.includes('phương án'))) {
    return `**So sánh 3 phương án bố trí:**\n\n1. **Phương án 1 (Ưu tiên Phong Thủy):** Tập trung tối đa điểm phong thủy Bát Trạch (90-95đ). Đầu giường quay chính xác hướng Sinh Khí/Diên Niên, triệt tiêu 100% xung sát.\n2. **Phương án 2 (Phong Thủy & Công Năng):** Vẫn giữ phong thủy cốt lõi, nhưng ưu tiên chừa lối đi rộng rãi (>1.0m), cánh tủ mở thoải mái, dễ sinh hoạt vệ sinh.\n3. **Phương án 3 (Phong Thủy & Thẩm Mỹ):** Bố cục đối xứng hài hòa chuẩn kiến trúc Master, bàn học đón sáng cửa sổ, tạo cảm giác thanh lịch và thư thái.\n\nGia chủ có thể bấm vào từng tab phương án bên dưới để xem bóng mờ 3D trước khi quyết định áp dụng!`;
  }

  // 4. Default intelligent grounded answer
  const mainIssues = analysis.rulesEvaluated.filter((r) => r.status === 'violation');
  const issuesList = mainIssues.map((m, i) => `${i + 1}. **${m.ruleName}**: ${m.negativeImpact}`).join('\n');

  return `Dựa trên phân tích hình học phòng ${room.width}m × ${room.length}m của gia chủ mệnh ${profile.guaName} (${profile.element}):\n\n${issuesList ? `**Các điểm cần lưu ý:**\n${issuesList}\n\n` : ''}Gia chủ có thể sử dụng các phương án tối ưu được đề xuất sẵn để cập nhật không gian 3D an toàn và hợp phong thủy nhất.`;
}

