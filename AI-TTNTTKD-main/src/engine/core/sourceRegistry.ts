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
};

export function getSourceInfo(sourceId: string): SourceReference | null {
  return SOURCE_REGISTRY[sourceId] || null;
}

export function getAllSources(): SourceReference[] {
  return Object.values(SOURCE_REGISTRY);
}

