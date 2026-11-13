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
  school: 'bat_trach' | 'loan_dau' | 'huyen_khong' | 'ergonomics' | 'engineering' | 'ngu_hanh' | 'general';
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
  'SRC-NGU-HANH-DAI-NGHIA': {
    id: 'SRC-NGU-HANH-DAI-NGHIA',
    code: 'NHDN-CLASSIC',
    title: 'Ngũ Hành Đại Nghĩa',
    originalTitle: '五行大義',
    authorOrOrigin: 'Tiêu Cát (蕭吉) — Thời Tùy',
    category: 'classical_feng_shui',
    school: 'ngu_hanh',
    publicationEra: 'Tùy triều (khoảng 581–604 SCN)',
    description: 'Bộ sách hệ thống hóa lý thuyết Ngũ Hành: Quyển 2 thiên 4 (Luận Tương Sinh), Quyển 2 thiên 6 (Tạp Phối Phương Vị), Quyển 2 thiên 10 (Luận Tương Khắc), Quyển 3 thiên 14 (Tạp Phối bao gồm Ngũ Sắc).',
    status: 'pending',
    notes: 'Chương mục và thiên đối chiếu chính xác theo bản Tứ Khố Toàn Thư. Đang chờ nghiệm thu văn bản chi tiết.',
  },
  'SRC-HOANG-DE-NOI-KINH': {
    id: 'SRC-HOANG-DE-NOI-KINH',
    code: 'HDNK-SO-VAN',
    title: 'Hoàng Đế Nội Kinh — Tố Vấn',
    originalTitle: '黃帝內經·素問',
    authorOrOrigin: 'Y gia cổ đại Trung Hoa tổng hợp',
    category: 'classical_feng_shui',
    school: 'general',
    publicationEra: 'Tiền Hán — Hậu Hán',
    description: 'Thiên 5 (Âm Dương Ứng Tượng Đại Luận), Thiên 67 (Ngũ Vận Hưng Suy Đại Luận): Ngũ Sắc tương ứng Ngũ Hành và tác động khí trường cư trú.',
    status: 'pending',
    notes: 'Bổ trợ nền tảng y lý và triết học ngũ hành khí trường; đang thẩm định đối soát.',
  },
  'SRC-BAT-TRACH-MINH-KINH-NGUHANH': {
    id: 'SRC-BAT-TRACH-MINH-KINH-NGUHANH',
    code: 'BTMK-NGUHANH',
    title: 'Bát Trạch Minh Kính — Ngũ Hành Bát Quái Khí Cục',
    originalTitle: '八宅明鏡',
    authorOrOrigin: 'Khuyết danh (khắc bản đời Thanh, thác danh Dương Quân Tùng truyền bản)',
    category: 'classical_feng_shui',
    school: 'bat_trach',
    publicationEra: 'Thanh triều',
    description: 'Quyển Thượng và Quyển Hạ: Bát Quái Cung Vị Ngũ Hành sở thuộc và phối mệnh biện hướng định khí cục.',
    status: 'pending',
    notes: 'Attribution status: Thác danh truyền bản, tác quyền thư mục thực tế đời Thanh đang trong quá trình thẩm định. Chưa khẳng định tác giả lịch sử.',
  },
  'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI': {
    id: 'SRC-PHONG-THUY-NOI-THAT-HIEN-DAI',
    code: 'INTERNAL/APPLIED PROVISIONAL',
    title: 'Quy ước Ngũ Hành Nội Thất Hiện Đại (Provisional Applied Specification)',
    authorOrOrigin: 'Quy ước thực hành phong thủy kiến trúc đương đại (chưa xác minh thư mục học thuật)',
    category: 'heuristic_experimental',
    school: 'ngu_hanh',
    publicationEra: 'Hiện đại',
    description: 'Quy ước màu sắc mở rộng và vật liệu công nghiệp (MDF, kính, đá nhân tạo, vải tổng hợp) trong không gian nội thất đương đại.',
    status: 'unverified',
    notes: 'INTERNAL/APPLIED PROVISIONAL: Không coi là nguồn học thuật cổ điển đã xác minh. Dùng tạm thời cho phân loại vật liệu/màu sắc mở rộng.',
  },
  'SRC-HEURISTIC-HARMONY-SCORE': {
    id: 'SRC-HEURISTIC-HARMONY-SCORE',
    code: 'HEURISTIC-SCORE-V1',
    title: 'Quy ước Thang điểm Hoà Hợp Ngũ Hành Nội Bộ (Studio Harmony Score)',
    authorOrOrigin: 'Nhóm phát triển AI Feng Shui Studio',
    category: 'heuristic_experimental',
    school: 'engineering',
    publicationEra: '2026',
    description: 'Trọng số định lượng 0.0–1.0 cho 6 loại quan hệ Ngũ Hành: SAME=0.90, GENERATES=0.85, GENERATED_BY=0.75, OVERCOME_BY=0.25, OVERCOMES=0.20, UNKNOWN=0.50.',
    status: 'pending',
    notes: 'Chỉ số heuristic quy ước nội bộ, phục vụ sắp xếp thứ tự khuyến nghị giao diện; tuyệt đối không đưa vào overallScore P5.',
  },
  'SRC-HEURISTIC-SHAPE-DIMENSIONS': {
    id: 'SRC-HEURISTIC-SHAPE-DIMENSIONS',
    code: 'HEURISTIC-SHAPE-V1',
    title: 'Quy tắc Heuristic Phân Loại Hình Dạng Ngũ Hành từ Kích Thước 3D (OBB)',
    authorOrOrigin: 'Nhóm phát triển AI Feng Shui Studio',
    category: 'heuristic_experimental',
    school: 'engineering',
    publicationEra: '2026',
    description: 'Tỉ lệ số học chiều kích OBB: height / max(w, l) > 2.0 (Mộc), < 0.3 (Thổ), vuông cân (Kim).',
    status: 'pending',
    notes: 'Quy tắc xấp xỉ hình học heuristic của hệ thống; không phải nguyên lý cổ thư có số đo cố định.',
  },
};

export function getSourceInfo(sourceId: string): SourceReference | null {
  return SOURCE_REGISTRY[sourceId] || null;
}

export function getAllSources(): SourceReference[] {
  return Object.values(SOURCE_REGISTRY);
}

