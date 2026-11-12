// =============================================================================
// src/engine/core/sourceRegistry.ts
// Official Source Registry for Feng Shui & Ergonomic Standards.
// Guarantees all assertions cite verifiable classical or engineering texts.
// =============================================================================

export type VerificationStatus = 'verified' | 'unverified' | 'pending';

export interface SourceReference {
  id: string;
  code: string;
  title: string;
  originalTitle?: string;
  authorOrOrigin: string;
  category: 'classical_feng_shui' | 'architectural_standard' | 'ergonomics' | 'heuristic_experimental';
  school: 'bat_trach' | 'loan_dau' | 'huyen_khong' | 'ergonomics' | 'engineering';
  publicationEra?: string;
  description: string;
  status: VerificationStatus;
  notes?: string;
}

export const SOURCE_REGISTRY: Record<string, SourceReference> = {
  'SRC-BAT-TRACH-MINH-KINH': {
    id: 'SRC-BAT-TRACH-MINH-KINH',
    code: 'BTMK-CLASSIC',
    title: 'Bát Trạch Minh Kính',
    originalTitle: '八宅明鏡',
    authorOrOrigin: 'Dương Quân Tùng truyền bản, hiệu đính đời Thanh',
    category: 'classical_feng_shui',
    school: 'bat_trach',
    publicationEra: 'Thanh triều',
    description: 'Nền tảng kinh điển của Bát Trạch: Phối Mệnh Quái (Đông/Tây Tứ Mệnh) với 8 phương vị (4 Cát: Sinh Khí, Thiên Y, Diên Niên, Phục Vị; 4 Hung: Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại).',
    status: 'pending',
    notes: 'Đang trong quá trình thẩm định đối chiếu chi tiết từng chương/văn bản với quy tắc số hóa.',
  },
  'SRC-BAT-TRACH-TAM-YEU': {
    id: 'SRC-BAT-TRACH-TAM-YEU',
    code: 'BTTY-CLASSIC',
    title: 'Bát Trạch Tam Yếu',
    originalTitle: '八宅三要',
    authorOrOrigin: 'Triệu Cửu Phong (趙九峰)',
    category: 'classical_feng_shui',
    school: 'bat_trach',
    publicationEra: 'Càn Long năm thứ 51 (1786)',
    description: 'Quy tắc Môn - Chủ - Táo: Vị trí phòng ngủ chủ nhà, hướng cửa phòng ngủ và bếp phối hợp cung mệnh.',
    status: 'pending',
    notes: 'Đang trong quá trình thẩm định văn bản đối chiếu quy tắc phối hợp hướng phòng.',
  },
  'SRC-LOAN-DAU-HINH-THE': {
    id: 'SRC-LOAN-DAU-HINH-THE',
    code: 'LDHT-CLASSIC',
    title: 'Hoàng Đế Trạch Kinh & Thanh Nang Áo Ngữ',
    originalTitle: '黃帝宅經 / 青囊奧語',
    authorOrOrigin: 'Cổ thư Loan Đầu truyền thống',
    category: 'classical_feng_shui',
    school: 'loan_dau',
    publicationEra: 'Tùy - Đường - Tống',
    description: 'Nguyên lý Hình thế: Tọa sơn vững chãi (tựa tường đặc), tránh trực xung cửa môn (xuyên tâm sát), tránh dầm xà đè đỉnh (áp đỉnh sát), tránh gương phản chiếu linh hồn (quang sát).',
    status: 'pending',
    notes: 'Các nguyên tắc hình thế đã được ghi nhận; đang số hóa các ngưỡng khoảng cách hình học tương ứng.',
  },
  'SRC-TCVN-4451-2012': {
    id: 'SRC-TCVN-4451-2012',
    code: 'TCVN-4451',
    title: 'TCVN 4451:2012 — Nhà ở căn hộ — Tiêu chuẩn thiết kế',
    authorOrOrigin: 'Bộ Khoa học và Công nghệ Việt Nam',
    category: 'architectural_standard',
    school: 'ergonomics',
    publicationEra: '2012',
    description: 'Quy chuẩn chiều rộng thông thủy hành lang, lối mở cửa tối thiểu (0.8m - 0.9m), diện tích phòng ngủ tối thiểu và khoảng sáng tự nhiên.',
    status: 'verified',
  },
  'SRC-NEUFERT-ERGONOMICS': {
    id: 'SRC-NEUFERT-ERGONOMICS',
    code: 'NEUFERT-4TH',
    title: "Neufert Architects' Data (Dữ liệu Kiến trúc sư Neufert)",
    authorOrOrigin: 'Ernst Neufert / Wiley-Blackwell',
    category: 'ergonomics',
    school: 'ergonomics',
    publicationEra: 'Tái bản lần 4',
    description: 'Tiêu chuẩn nhân trắc học không gian ngủ: Khoảng trống cạnh giường tối thiểu 0.6m để bước xuống và dọn giường; khoảng cách trước tủ quần áo cánh mở 0.75m - 0.9m.',
    status: 'verified',
  },
  'SRC-HEURISTIC-STUDIO-V1': {
    id: 'SRC-HEURISTIC-STUDIO-V1',
    code: 'STUDIO-HEURISTIC-V1',
    title: 'Quy chuẩn Heuristic Thử nghiệm Studio v1',
    authorOrOrigin: 'Nhóm phát triển AI Feng Shui Studio',
    category: 'heuristic_experimental',
    school: 'engineering',
    publicationEra: '2026',
    description: 'Các tham số kỹ thuật ước lượng trong mô hình 3D: Dung sai góc 2°, khoảng cách an toàn biên tường 0.1m, vùng trung cung tỷ lệ 0.15 đường chéo phòng.',
    status: 'pending',
    notes: 'Đây là các tham số kỹ thuật tạm thời phục vụ mô phỏng hình học, không phải tiêu chuẩn phong thủy cổ truyền chính thức.',
  },
  'SRC-60-HOA-GIAP-NAP-AM': {
    id: 'SRC-60-HOA-GIAP-NAP-AM',
    code: 'LUC-THAP-HOA-GIAP',
    title: 'Bảng Lục Thập Hoa Giáp & Nạp Âm Ngũ Hành',
    authorOrOrigin: 'Cổ thư Lý học phương Đông (Quỷ Cốc Tử / Tam Mệnh Thông Hội)',
    category: 'classical_feng_shui',
    school: 'bat_trach',
    publicationEra: 'Tiền Tần - Tống - Minh',
    description: 'Bảng phối hợp 10 Thiên Can và 12 Địa Chi thành chu kỳ 60 Hoa Giáp, mỗi cặp Can Chi quy nạp một Nạp Âm Ngũ Hành (30 nạp âm từ Hải Trung Kim đến Đại Hải Thủy).',
    status: 'verified',
    notes: 'Bảng 60 Can Chi và 30 Nạp Âm đã được đối chiếu và xác minh tính nhất quán giữa các tài liệu lý học cổ truyền.',
  },
  'SRC-LICH-TIET-KHI-LAP-XUAN': {
    id: 'SRC-LICH-TIET-KHI-LAP-XUAN',
    code: 'TIET-KHI-LAP-XUAN',
    title: 'Quy chuẩn Tiết khí Lập Xuân & Lịch Can Chi',
    authorOrOrigin: 'Thiên văn Lịch pháp cổ truyền & Lịch Vạn Niên',
    category: 'classical_feng_shui',
    school: 'bat_trach',
    publicationEra: 'Truyền thống lịch pháp',
    description: 'Nguyên tắc xác định ranh giới năm Can Chi và Quái mệnh Bát Trạch tại điểm Lập Xuân (mặt trời đạt kinh độ hoàng đạo 315°, thường vào ngày 3-5 tháng 2 Dương lịch).',
    status: 'pending',
    notes: 'Thời điểm Lập Xuân chính xác phụ thuộc kinh độ thiên văn và múi giờ; nếu thiếu giờ sinh vào các ngày giáp ranh thì đánh dấu trạng thái không chắc chắn.',
  },
  'SRC-QCVN-06-2022': {
    id: 'SRC-QCVN-06-2022',
    code: 'QCVN-06-2022',
    title: 'QCVN 06:2022/BXD — Quy chuẩn kỹ thuật an toàn cháy cho nhà và công trình',
    authorOrOrigin: 'Bộ Xây dựng Việt Nam',
    category: 'architectural_standard',
    school: 'ergonomics',
    publicationEra: '2022',
    description: 'Quy định về chiều rộng hành lang thoát hiểm, lối đi, và khoảng thông thủy tối thiểu trong nhà ở và công trình xây dựng.',
    status: 'pending',
    notes: 'Nội dung liên quan đến thông gió và lối đi đang chờ đối chiếu khoản cụ thể trong văn bản chính thức.',
  },
  'SRC-ENV-ERGONOMICS-P6': {
    id: 'SRC-ENV-ERGONOMICS-P6',
    code: 'P6-HEURISTIC',
    title: 'Quy chuẩn Heuristic Môi trường & Công thái học Studio P6',
    authorOrOrigin: 'Nhóm phát triển AI Feng Shui Studio',
    category: 'heuristic_experimental',
    school: 'ergonomics',
    publicationEra: '2026',
    description: 'Các ngưỡng heuristic tạm thời cho đánh giá chiếu sáng, thông gió và lưu thông không gian. Chỉ dùng khi không có tiêu chuẩn chính thức áp dụng được.',
    status: 'pending',
    notes: 'Đây là các tham số kỹ thuật tạm thời phục vụ đánh giá môi trường P6, không phải tiêu chuẩn chính thức.',
  },
};

export function getSourceInfo(sourceId: string): SourceReference | null {
  return SOURCE_REGISTRY[sourceId] || null;
}

export function getAllSources(): SourceReference[] {
  return Object.values(SOURCE_REGISTRY);
}

