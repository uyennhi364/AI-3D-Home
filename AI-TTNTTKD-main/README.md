# AI Feng Shui Studio (Hệ Thống Thiết Kế & Tư Vấn Phong Thủy 3D)

[![Version](https://img.shields.io/badge/version-v1.0.0--p9.1-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](package.json)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-942%20PASS%20%7C%200%20FAIL-success.svg)]()

> **AI Feng Shui Studio** là nền tảng ứng dụng AI chuyên sâu kết hợp mô phỏng không gian 3D tương tác thời gian thực (Three.js WebGL) với các trường phái phong thủy cổ truyền chính thống (Bát Trạch Minh Kinh, Loan Đầu, Nạp Âm Lục Thập Hoa Giáp, Ngũ Hành Sinh Khắc) và tiêu chuẩn kiến trúc hiện đại (TCVN 4451:2012).

---

## 🌟 Tính Năng Nổi Bật

### 1. Mô Phỏng Không Gian Phòng Ngủ 3D (Interactive WebGL)
- Không gian 3D tương tác mượt mà: xoay, thu phóng, xem theo các góc phối cảnh tự do hoặc chiếu đứng (Top-down 2D).
- Hệ trục tọa độ và la bàn số 8 hướng phân cung chuẩn xác tới từng độ góc ($0^\circ$ Bắc, $90^\circ$ Đông, $180^\circ$ Nam, $270^\circ$ Tây).
- Đồ vật nội thất thủ tục (Procedural 3D Models): Giường ngủ, bàn làm việc, tủ quần áo, gương soi, cửa đi, cửa sổ.
- Thuật toán kiểm tra va chạm hình học chính xác cao theo hình hộp hướng tâm (OBB SAT Collision V2).

### 2. Bộ Máy Đánh Giá Phong Thủy Xác Định (Deterministic Engine)
- **Bát Trạch Lữ Tài:** Tính Quái mệnh (Khảm, Côn, Chấn, Tốn, Càn, Đoài, Cấn, Ly), phân nhóm Đông Tứ Mệnh / Tây Tứ Mệnh, 4 cung Cát (Sinh Khí, Thiên Y, Diên Niên, Phục Vị) và 4 cung Hung (Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại).
- **Loan Đầu Hình Thế:** Phát hiện xung sát thực tế (Gương chiếu giường — Quang Sát, Giường đối diện cửa — Xung Môn Sát, Đầu giường không tựa tường, Dầm ngang đè giường).
- **Ngũ Hành Bản Mệnh (P8):** Ánh xạ màu sắc, chất liệu, hình khối và phương vị đồ vật theo quy luật Tương Sinh, Tương Khắc, Tương Hòa, Tiết Khí. Phân loại 4 trạng thái dữ liệu nghiêm ngặt (`known`, `ambiguous`, `insufficient`, `unsupported`).

### 3. Trợ Lý AI Phong Thủy & Điều Khiển Không Gian 3D (Google Gemini AI)
- Giao tiếp ngôn ngữ tự nhiên thông minh: Tư vấn phong thủy, kiến trúc nội thất, giải đáp thắc mắc.
- Phân loại ý định đa tầng (Intent Guard): Nhận diện yêu cầu điều khiển 3D vs. hỏi lý thuyết, ngăn chặn thao tác nhầm lẫn.
- **Proposal & Confirm Gate 2-Turn Bắt Buộc:** Mọi đề xuất thay đổi không gian (thêm, sửa, xóa, tối ưu) đều tạo bản xem trước bóng mờ (Ghost Preview) và chỉ được áp dụng vào không gian thực tế sau khi người dùng bấm xác nhận rõ ràng.
- Chế độ Ngoại Tuyến (Offline Fallback Engine): Tự động bảo vệ và tư vấn dựa trên bộ quy tắc nội bộ khi mất kết nối mạng hoặc không có API Key.

### 4. Tiêu Chuẩn Công Thái Học & Môi Trường (TCVN 4451:2012)
- Kiểm tra tỉ lệ thông gió tự nhiên, chiếu sáng tự nhiên qua diện tích cửa sổ.
- Hành lang lưu thông tối thiểu quanh giường và lối vào phòng ngủ ($> 60\text{cm}$).

### 5. An Toàn Giao Dịch & Khả Năng Phục Hồi (Observability & Resilience)
- Hệ thống Giao dịch Nguyên tử (Atomic Transactions) kèm Undo/Redo đa tầng và tự động Rollback khi vi phạm an toàn hình học.
- Lưu trữ cục bộ có kiểm soát hạn mức (LocalStorage Quota Guard) và tự động nâng cấp phiên bản dữ liệu (v0 $\to$ v1).
- Structured JSON Logging che dấu tự động các thông tin nhạy cảm (API Keys, Authorization headers).

---

## 🛠 Công Nghệ Sử Dụng

| Tầng Kiến Trúc | Công Nghệ / Thư Viện |
|---|---|
| **Frontend UI** | React 19, TypeScript 5.8, Tailwind CSS, Lucide Icons |
| **3D Graphics Engine** | Three.js (WebGL), Canvas 2D Texture Generator |
| **AI / NLU** | Google Gen AI SDK (`@google/genai`), Local Rule-based NLU |
| **Backend Server** | Node.js 22, Express 5, Native ESM (`esbuild`), Helmet, CORS, Rate Limit |
| **Container & CI/CD** | Docker Multi-Stage (Alpine Linux), Docker Compose, GitHub Actions |
| **Testing Harness** | Node Test Runner, tsx, Playwright E2E |

---

## 🚀 Cài Đặt & Khởi Chạy Nhanh

### Yêu Cầu Môi Trường
- **Node.js:** Phiên bản `>= 22.0.0`
- **npm:** Phiên bản `>= 10.0.0`

### 1. Cài đặt Dependencies
```bash
git clone https://github.com/your-org/ai-feng-shui-studio.git
cd ai-feng-shui-studio
npm ci
```

### 2. Cấu hình Biến Môi Trường
Tạo tệp `.env.local` tại thư mục gốc:
```env
PORT=3000
NODE_ENV=development
# Tùy chọn: Nhập khóa Google Gemini API để kích hoạt AI trực tuyến
GEMINI_API_KEY=AIzaSy...your_gemini_key_here
```

### 3. Khởi Chạy Chế Độ Phát Triển (Development)
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:5173` (Frontend) và `http://localhost:3000` (Backend API).

### 4. Biên Dịch Sản Phẩm (Production Build)
```bash
npm run build
npm start
```

---

## 🐳 Triển Khai Bằng Docker

Hệ thống hỗ trợ đóng gói tối ưu với kiến trúc Docker Multi-Stage (`node:22-alpine`, non-root user `node`):

```bash
# Khởi chạy bằng Docker Compose
docker compose up -d --build

# Kiểm tra trạng thái sức khỏe
curl http://localhost:3000/health
```

Xem hướng dẫn chi tiết tại [docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md).

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng

Hệ thống sở hữu bộ kiểm thử hồi quy đồ sộ bảo vệ toàn diện kiến trúc:

```bash
# Kiểm tra kiểu TypeScript
npm run lint

# Chạy kiểm thử hồi quy cốt lõi (P0 - P7.5, Pilot-01)
npx tsx tests/p0_characterization_baseline.ts
npx tsx tests/phase_h_intent_guard.test.ts
npx tsx tests/p1_spatial_orientation.test.ts
npx tsx tests/p2_room_layout_sector.test.ts
npx tsx tests/p3_furniture_rules.test.ts

# Chạy kiểm thử Ngũ Hành (P8 Suites: 425 assertions)
npx tsx tests/p8_m0_architecture_guard.test.ts
npx tsx tests/p8_m1_element_mapping.test.ts
npx tsx tests/p8_m2_relationship_rule_engine.test.ts
npx tsx tests/p8_m3_assessment_explainer.test.ts
npx tsx tests/p8_4_ui_integration.test.ts

# Chạy kiểm thử Hardening & Resilience (P9 Suites: 75 assertions)
npx tsx tests/p9_m1_hardening.test.ts
npx tsx tests/p9_m3_observability_resilience.test.ts
```

---

## 📚 Tài Liệu Kỹ Thuật

- [Kiến Trúc Hệ Thống (Architecture)](docs/ARCHITECTURE.md)
- [Tham Chiếu API (API Reference)](docs/API_REFERENCE.md)
- [Hướng Dẫn Triển Khai Docker](docs/DOCKER_DEPLOYMENT.md)
- [Sổ Tay Vận Hành Sản Xuất (Production Runbook)](docs/PRODUCTION_RUNBOOK.md)
- [Chính Sách & Hướng Dẫn Bảo Mật (Security)](docs/SECURITY.md)
- [Hướng Dẫn Người Dùng (User Guide)](docs/USER_GUIDE.md)
- [Lịch Sử Thay Đổi (Changelog)](CHANGELOG.md)

---

## 📄 Bản Quyền & Giấy Phép

Phát hành dưới giấy phép [MIT License](LICENSE). Bản quyền thuộc về Nhóm Kỹ sư Trí tuệ Nhân tạo DeepMind AI Feng Shui Studio.
