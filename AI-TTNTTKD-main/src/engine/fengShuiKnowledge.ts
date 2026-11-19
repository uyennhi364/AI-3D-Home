// =============================================================================
// src/engine/fengShuiKnowledge.ts
// Authoritative Feng Shui & Bát Trạch Theory Knowledge Base
// Provides comprehensive, precise academic explanations for theoretical queries
// (Bát Trạch, Đông Tứ Mệnh, Tây Tứ Mệnh, Bát Cung, Loan Đầu, Ngũ Hành)
// =============================================================================

import { CompassDirection, FengShuiRoomEvaluation, RoomConfig, UserFengShuiProfile } from '../types/fengshui.js';
import { DIRECTION_NAMES_VI } from './batTrach.js';

export interface TheoryMatchResult {
  isTheoryQuery: boolean;
  topic?: 'bat_trach' | 'dong_tu_menh' | 'tay_tu_menh' | 'sinh_khi' | 'thien_y' | 'dien_nien' | 'phuc_vi' | 'hung_cung' | 'huong_gia_chu' | 'loan_dau' | 'ngu_hanh' | 'general_rules';
  answer?: string;
}

/**
 * Resolves theoretical Feng Shui questions and returns structured academic explanation.
 * Always emphasizes that 3D scene remains unchanged during knowledge inquiries.
 */
export function getFengShuiTheoryAnswer(
  prompt: string,
  userProfile?: UserFengShuiProfile,
  roomConfig?: RoomConfig | { width: number; length: number; height: number; direction: string },
  _evaluation?: FengShuiRoomEvaluation
): TheoryMatchResult {
  const p = (prompt || '').trim().toLowerCase();

  // Helper to check keywords
  const containsAny = (keywords: string[]) => keywords.some((kw) => p.includes(kw));

  // Determine active profile info if available
  const giaChuDesc = userProfile
    ? `gia chủ sinh năm **${userProfile.birthYear}** (${userProfile.gender === 'female' ? 'Nữ' : 'Nam'}, Quái **${userProfile.guaName}** · **${userProfile.element}**, thuộc **${userProfile.group}**)`
    : 'gia chủ';

  const auspiciousList = userProfile?.auspiciousDirections
    ? userProfile.auspiciousDirections.map((d) => `• **${DIRECTION_NAMES_VI[d]} (${d})**: Cung ${userProfile.directionDetails[d]?.name || 'Cát'}`).join('\n')
    : '• Đông Tứ Mệnh hợp: Bắc, Đông, Đông Nam, Nam\n• Tây Tứ Mệnh hợp: Tây, Tây Bắc, Tây Nam, Đông Bắc';

  const inauspiciousList = userProfile?.inauspiciousDirections
    ? userProfile.inauspiciousDirections.map((d) => `• **${DIRECTION_NAMES_VI[d]} (${d})**: Cung ${userProfile.directionDetails[d]?.name || 'Hung'}`).join('\n')
    : '• Cần tránh các cung Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại';

  // 1. "Bát Trạch là gì?" / "Thế nào là Bát Trạch?" / "Trường phái Bát Trạch"
  if (
    containsAny([
      'bát trạch là gì', 'bat trach la gi', 'thế nào là bát trạch', 'the nao la bat trach',
      'khái niệm bát trạch', 'nguyên lý bát trạch', 'bát trạch minh cảnh là gì',
      'nghĩa là gì bát trạch', 'tìm hiểu về bát trạch', 'giải thích bát trạch'
    ]) ||
    (p.includes('bát trạch') && (p.includes('là gì') || p.includes('thế nào') || p.includes('nghĩa gì') || p.includes('ra sao') || p.includes('như thế nào')))
  ) {
    const answer =
`### 🏛️ Khái Niệm Bát Trạch Trong Phong Thủy

**Bát Trạch** (Bát = 8, Trạch = Nhà / Phương vị cư trú, chữ Hán: 八宅) là một trong những trường phái phong thủy địa lý cổ truyền và kinh điển nhất, bắt nguồn từ cuốn cổ thư nổi tiếng *"Bát Trạch Minh Cảnh"*.

Trường phái này nghiên cứu mối quan hệ tương sinh tương khắc giữa **bản mệnh con người (Cung phi quái mệnh)** và **phương hướng không gian (Bát quái 8 hướng)** để tìm ra vị trí cát lành và hóa giải hung sát.

---

#### 1. Mối liên hệ giữa Đông Tứ Mệnh và Tây Tứ Mệnh:
Dựa vào năm sinh Âm/Dương lịch và giới tính, mỗi gia chủ sở hữu một Quái mệnh tương ứng với một trong 8 quẻ Bát Quái và được phân thành hai nhóm mệnh chính:
* **Đông Tứ Mệnh:** Gồm các quẻ **Khảm (Thủy), Chấn (Mộc), Tốn (Mộc), Ly (Hỏa)**. Gia chủ thuộc nhóm này luôn tương hợp với **4 hướng Đông Tứ Trạch**: **Bắc, Đông, Đông Nam, Nam**.
* **Tây Tứ Mệnh:** Gồm các quẻ **Càn (Kim), Khôn (Thổ), Cấn (Thổ), Đoài (Kim)**. Gia chủ thuộc nhóm này luôn tương hợp với **4 hướng Tây Tứ Trạch**: **Tây, Tây Bắc, Tây Nam, Đông Bắc**.

#### 2. Tám cung vị Cát – Hung trong Bát Trạch:
* **4 Cung Cát (Tốt lành):**
  1. **Sinh Khí (Sao Tham Lang - Mộc):** Cung tốt nhất, chủ về sinh sôi, tài lộc dồi dào, thăng tiến công danh và vượng khí.
  2. **Thiên Y (Sao Cự Môn - Thổ):** Chủ về sức khỏe trường thọ, tiêu trừ bệnh tật và được quý nhân phù trợ.
  3. **Diên Niên (Sao Vũ Khúc - Kim):** Chủ về hòa thuận gia đạo, tình duyên bền chặt và các mối quan hệ xã hội tốt đẹp.
  4. **Phục Vị (Sao Tả Phù - Mộc):** Chủ về bình yên tâm trí, củng cố nội lực, thi cử đỗ đạt và may mắn bản thân.
* **4 Cung Hung (Xấu cần tránh):**
  1. **Tuyệt Mệnh (Sao Phá Quân - Kim):** Hung hiểm nhất, chủ về suy kiệt sinh lực, tổn hao tài sản.
  2. **Ngũ Quỷ (Sao Liêm Trinh - Hỏa):** Chủ về thị phi, tranh cãi, tai bay vạ gió.
  3. **Lục Sát (Sao Văn Khúc - Thủy):** Chủ về bất hòa, trục trặc tình cảm, xáo trộn trường khí.
  4. **Họa Hại (Sao Lộc Tồn - Thổ):** Chủ về khó khăn trắc trở, hao tài tốn của.

#### 3. Ứng dụng trong bố trí phòng ngủ:
* **Nguyên tắc "Tọa hung hướng cát" / "Tọa cát hướng cát":** Đầu giường ngủ và bàn làm việc nên quay về hướng cát lành của gia chủ để tiếp nhận trường khí thuận lợi khi nghỉ ngơi.
* **Đối với ${giaChuDesc}:**
${auspiciousList}

*(Hệ thống giữ nguyên bố cục mô hình 3D hiện tại để gia chủ tìm hiểu lý thuyết phong thủy an toàn).*`;

    return { isTheoryQuery: true, topic: 'bat_trach', answer };
  }

  // 2. "Đông Tứ Mệnh là gì?" / "Đông Tứ Trạch là gì?"
  if (
    containsAny([
      'đông tứ mệnh là gì', 'dong tu menh la gi', 'đông tứ trạch là gì', 'dong tu trach la gi',
      'thế nào là đông tứ mệnh', 'thế nào là đông tứ trạch'
    ]) ||
    (p.includes('đông tứ mệnh') && (p.includes('là gì') || p.includes('thế nào') || p.includes('nghĩa gì')))
  ) {
    const answer =
`### 🧭 Khái Niệm Đông Tứ Mệnh & Đông Tứ Trạch

Trong hệ thống Bát Trạch phong thủy, **Đông Tứ Mệnh** là một trong hai nhóm quái mệnh cơ bản của con người:

* **Các quẻ thuộc Đông Tứ Mệnh:** Gồm 4 cung quẻ:
  1. **Khảm** (Hành Thủy - Số 1)
  2. **Chấn** (Hành Mộc - Số 3)
  3. **Tốn** (Hành Mộc - Số 4)
  4. **Ly** (Hành Hỏa - Số 9)

* **4 Hướng tương hợp (Đông Tứ Trạch):**
  Người thuộc Đông Tứ Mệnh có trường khí hòa hợp nhất khi quay đầu giường, đặt bàn làm việc hoặc mở cửa phòng về 4 hướng:
  • **Hướng Bắc** (Chính Bắc)
  • **Hướng Đông** (Chính Đông)
  • **Hướng Đông Nam**
  • **Hướng Nam** (Chính Nam)

* **Nguyên tắc phối hợp:** "Đông Tứ Mệnh hợp Đông Tứ Trạch; Tây Tứ Mệnh hợp Tây Tứ Trạch". Nếu người Đông Tứ Mệnh chọn hướng Tây Tứ Trạch (Tây, Tây Bắc, Tây Nam, Đông Bắc) sẽ dễ phạm vào các cung hung khí như Tuyệt Mệnh, Ngũ Quỷ.

* **Đối với phòng ngủ hiện tại:** Gia chủ hiện tại mang Quái **${userProfile?.guaName || 'Bản mệnh'}** (${userProfile?.group || 'Tây Tứ Mệnh'}).
*(Hệ thống giữ nguyên bố cục 3D để bạn tham khảo kiến thức).*`;

    return { isTheoryQuery: true, topic: 'dong_tu_menh', answer };
  }

  // 3. "Tây Tứ Mệnh là gì?" / "Tây Tứ Trạch là gì?"
  if (
    containsAny([
      'tây tứ mệnh là gì', 'tay tu menh la gi', 'tây tứ trạch là gì', 'tay tu trach la gi',
      'thế nào là tây tứ mệnh', 'thế nào là tây tứ trạch'
    ]) ||
    (p.includes('tây tứ mệnh') && (p.includes('là gì') || p.includes('thế nào') || p.includes('nghĩa gì')))
  ) {
    const answer =
`### 🧭 Khái Niệm Tây Tứ Mệnh & Tây Tứ Trạch

Trong hệ thống Bát Trạch phong thủy, **Tây Tứ Mệnh** là nhóm quái mệnh tương phối với các hướng thuộc Tây Tứ Trạch:

* **Các quẻ thuộc Tây Tứ Mệnh:** Gồm 4 cung quẻ:
  1. **Càn** (Hành Kim - Số 6)
  2. **Khôn** (Hành Thổ - Số 2)
  3. **Cấn** (Hành Thổ - Số 8)
  4. **Đoài** (Hành Kim - Số 7)

* **4 Hướng tương hợp (Tây Tứ Trạch):**
  Người thuộc Tây Tứ Mệnh có trường năng lượng tương hỗ mạnh mẽ nhất khi đầu giường, bàn làm việc quay về 4 hướng:
  • **Hướng Tây** (Chính Tây)
  • **Hướng Tây Bắc**
  • **Hướng Tây Nam**
  • **Hướng Đông Bắc**

* **Đối với ${giaChuDesc}:**
${userProfile?.group === 'Tây Tứ Mệnh' ? `Gia chủ **chính xác thuộc nhóm Tây Tứ Mệnh**, rất hợp khi kê giường quay về các hướng Tây, Tây Bắc, Tây Nam, Đông Bắc.` : `Gia chủ thuộc nhóm Đông Tứ Mệnh.`}

*(Hệ thống giữ nguyên bố cục 3D để bạn tham khảo kiến thức).*`;

    return { isTheoryQuery: true, topic: 'tay_tu_menh', answer };
  }

  // 4. "Sinh Khí là gì?" / "Cung Sinh Khí là gì?"
  if (
    containsAny([
      'sinh khí là gì', 'sinh khi la gi', 'cung sinh khí', 'hướng sinh khí',
      'thế nào là sinh khí', 'sinh khí có ý nghĩa gì'
    ])
  ) {
    const sinhKhiDir = userProfile?.auspiciousDirections.find(
      (d) => userProfile.directionDetails[d]?.type === 'SINH_KHI'
    );
    const sinhKhiVi = sinhKhiDir ? `${DIRECTION_NAMES_VI[sinhKhiDir]} (${sinhKhiDir})` : 'theo quái mệnh gia chủ';

    const answer =
`### 🌿 Cung Sinh Khí Trong Phong Thủy Bát Trạch

**Sinh Khí** (生氣) là cung vị đứng đầu trong **Tứ Cát Tinh** của trường phái Bát Trạch, được cai quản bởi sao **Tham Lang** mang ngũ hành **Mộc**.

#### 1. Ý nghĩa và giá trị phong thủy:
* **Vượng khí & Tài lộc:** Sinh Khí chủ về sự sinh sôi nảy nở, khai thông bế tắc, đem lại tài vận dồi dào và cơ hội phát triển sự nghiệp thăng tiến mạnh mẽ.
* **Sức khỏe & Tinh thần:** Mang đến nguồn năng lượng tràn trề, tinh thần minh mẫn, hoạt bát và khả năng hồi phục thể lực nhanh chóng.
* **Danh tiếng & Quý nhân:** Tăng cường uy tín cá nhân, được người khác tin tưởng và nâng đỡ.

#### 2. Ứng dụng trong bố trí phòng ngủ:
* **Vị trí đầu giường:** Kê đầu giường ngủ quay về hướng Sinh Khí giúp gia chủ có giấc ngủ sâu, tái tạo năng lượng tối đa sau ngày dài làm việc.
* **Bàn làm việc:** Ngồi nhìn về hướng Sinh Khí giúp tư duy sáng suốt, ra quyết định chuẩn xác và làm việc hiệu quả.

#### 3. Phương vị Sinh Khí của ${giaChuDesc}:
* Hướng Sinh Khí cát lợi nhất của bạn là: **${sinhKhiVi}**.

*(Hệ thống giữ nguyên bố cục 3D để bạn tham khảo kiến thức).*`;

    return { isTheoryQuery: true, topic: 'sinh_khi', answer };
  }

  // 5. "Thiên Y là gì?" / "Diên Niên là gì?" / "Phục Vị là gì?"
  if (containsAny(['thiên y là gì', 'thien y la gi', 'diên niên là gì', 'dien nien la gi', 'phục vị là gì', 'phuc vi la gi'])) {
    let starName = '';
    let starDetail = '';
    if (p.includes('thiên y')) {
      starName = 'Thiên Y (Sao Cự Môn - Thổ)';
      starDetail = 'chủ về sức khỏe, trừ bỏ tật bệnh, tâm thần an ổn, gia đạo hưng thịnh và luôn có quý nhân phò trợ.';
    } else if (p.includes('diên niên')) {
      starName = 'Diên Niên (Sao Vũ Khúc - Kim)';
      starDetail = 'chủ về hòa thuận, củng cố các mối quan hệ tình cảm, hôn nhân êm ấm, giao tiếp xã hội thuận lợi và tuổi thọ bền lâu.';
    } else {
      starName = 'Phục Vị (Sao Tả Phù - Mộc)';
      starDetail = 'chủ về bình yên nội tâm, tinh thần tĩnh tại, tăng cường nghị lực và rất có lợi cho việc học hành, thi cử, thiền định.';
    }

    const answer =
`### ✨ Cung Cát ${starName} Trong Bát Trạch

Trong hệ thống Bát Trạch, **${starName}** là một trong 4 cung Cát Tinh mang lại vượng khí cho gia chủ:
* **Ý nghĩa:** Cung này ${starDetail}
* **Ứng dụng:** Rất thích hợp để kê đầu giường ngủ hoặc đặt bàn làm việc nhằm tiếp nhận trường khí thanh tịnh, cân bằng.
* **Đối với ${giaChuDesc}:** Bạn có thể tham khảo danh sách hướng cát lành được hiển thị chi tiết trong bảng thông tin hồ sơ bên trái.

*(Hệ thống giữ nguyên bố cục 3D để bạn tham khảo kiến thức).*`;

    return { isTheoryQuery: true, topic: 'thien_y', answer };
  }

  // 6. "Hướng nào phù hợp với gia chủ?" / "Hướng tốt của tôi" / "Tôi hợp hướng nào"
  if (
    containsAny([
      'hướng nào phù hợp', 'huong nao phu hop', 'hướng tốt của gia chủ', 'hợp hướng nào',
      'hướng hợp với gia chủ', 'tôi hợp hướng nào', 'hướng cát của gia chủ',
      'hướng nào tốt', 'hướng nào xấu'
    ])
  ) {
    const answer =
`### 🧭 Phương Hướng Phong Thủy Cho ${giaChuDesc}

Dựa trên thuật toán tính cung quái Bát Trạch chính thống, dưới đây là phương vị Cát – Hung chuẩn xác dành riêng cho bản mệnh của bạn:

#### 🟢 4 Hướng Cát (Nên chọn kê đầu giường, bàn làm việc, cửa phòng):
${auspiciousList}

#### 🔴 4 Hướng Hung (Cần tránh quay đầu giường hoặc đối diện trực tiếp):
${inauspiciousList}

* **Lời khuyên bố trí:**
  1. **Đầu giường ngủ:** Nên tựa lưng vào tường đặc vững chắc (thế Huyền Vũ tọa thực) và quay đỉnh đầu về một trong 4 hướng Cát trên.
  2. **Bàn làm việc:** Đặt tại vị trí quan sát được cửa phòng (vị trí Chỉ Huy) và mặt người ngồi nhìn về hướng Cát.

*(Hệ thống giữ nguyên bố cục 3D để bạn tham khảo kiến thức).*`;

    return { isTheoryQuery: true, topic: 'huong_gia_chu', answer };
  }

  return { isTheoryQuery: false };
}
