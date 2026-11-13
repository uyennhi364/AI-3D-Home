# SỔ TAY VẬN HÀNH SẢN XUẤT (PRODUCTION RUNBOOK)
## AI FENG SHUI STUDIO

Tài liệu này cung cấp quy trình vận hành tiêu chuẩn (SOP), giám sát hệ thống, sao lưu dự phòng, phục hồi sau thảm họa và xử lý sự cố cho hệ thống **AI Feng Shui Studio** trong môi trường Production.

---

## 1. KHỞI CHẠY & VẬN HÀNH DỊCH VỤ

### 1.1. Vận Hành Qua Docker Compose (Khuyến nghị)
```bash
# Khởi động dịch vụ ở chế độ background
docker compose up -d

# Xem logs trực tiếp của container
docker compose logs -f app

# Kiểm tra trạng thái tiến trình và tài nguyên
docker compose ps
docker stats

# Khởi động lại dịch vụ không downtime (Zero-downtime rolling reload)
docker compose up -d --no-deps --build app

# Dừng dịch vụ an toàn
docker compose down
```

### 1.2. Vận Hành Trực Tiếp Với Node.js
```bash
# Thiết lập môi trường sản xuất
export NODE_ENV=production
export PORT=3000
export ALLOWED_ORIGINS="https://fengshui.yourdomain.com"
export GEMINI_API_KEY="AIzaSy..."

# Khởi chạy bundle ESM đã biên dịch
node dist/server.js
```

---

## 2. GIÁM SÁT HỆ THỐNG & HEALTHCHECKS

### 2.1. Điểm Cuối Giám Sát Sức Khỏe
- **Endpoint:** `GET /health`
- **Tần suất kiểm tra định kỳ (Probe Interval):** 30 giây.
- **Tiêu chuẩn bình thường:**
  - HTTP Status: `200 OK`
  - `status`: `"healthy"`
  - `processHealth`: `"HEALTHY"`
  - `memory.rssMb`: $< 300\text{MB}$
- **Cảnh báo khi:**
  - HTTP Status $\neq 200$
  - `uptime` bị reset bất thường (container bị restart ngoài ý muốn)
  - `memory.rssMb` vượt ngưỡng $450\text{MB}$ (tiệm cận giới hạn 512MB RAM)

### 2.2. Kiểm Tra Từ Dòng Lệnh
```bash
# Kiểm tra nhanh sức khỏe máy chủ
curl -I http://localhost:3000/health

# Kiểm tra log dạng JSON có lọc lỗi ERROR
docker logs ai-feng-shui-studio 2>&1 | grep '"level":"ERROR"'
```

---

## 3. QUẢN LÝ DỮ LIỆU & SAO LƯU DỰ PHÒNG (BACKUP & RESTORE)

Hệ thống AI Feng Shui Studio hoạt động theo mô hình phi trạng thái phía máy chủ (Stateless Server) với bộ nhớ đệm đề xuất tạm thời (`InMemoryProposalStore`), trong khi toàn bộ bố cục phòng người dùng được lưu trữ phía client (`localStorage`).

### 3.1. Xuất / Nhập Bố Cục Phòng (Export / Import JSON)
Người dùng và quản trị viên có thể xuất toàn bộ cấu hình phòng thành tệp JSON chuẩn:
- **Tệp xuất ra:** `bo-cuc-phong-ngu-<timestamp>.json` chứa đầy đủ `roomConfig`, danh sách `objects`, `userProfile` và `version`.
- **Phục hồi:** Kéo thả hoặc tải lên tệp JSON qua giao diện để phục hồi nguyên trạng căn phòng.

### 3.2. LocalStorage Quota & Migration
- Dữ liệu client được bảo vệ bởi `storageResilience.ts` với cấu trúc `VersionedEnvelope` (`v: 1`).
- Khi phát hiện `quota_exceeded`, hệ thống cảnh báo người dùng xuất tệp JSON dự phòng trước khi lưu tiếp.

---

## 4. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### Sự Cố 1: Lỗi "Hạn mức Gemini API tạm thời bị đầy" (HTTP 429)
- **Hiện tượng:** Người dùng hỏi AI nhận được thông báo fallback `[AI Ngoại tuyến: Hạn mức Gemini API tạm thời bị đầy]`.
- **Nguyên nhân:** Khóa API đạt rate limit từ Google Cloud / AI Studio.
- **Biện pháp xử lý:**
  1. Kiểm tra bảng điều khiển Google AI Studio xem quota của API key.
  2. Bổ sung hoặc thay thế khóa dự phòng trong biến môi trường:
     ```bash
     export GEMINI_API_KEY="AIzaSy_NEW_KEY"
     docker compose restart app
     ```
  3. Hệ thống vẫn duy trì 100% tính năng điều khiển 3D và tư vấn qua Local Rule Engine.

### Sự Cố 2: Yêu Cầu Tới Gemini API Bị Timeout (HTTP 504)
- **Hiện tượng:** Chat AI mất 25 giây sau đó tự động chuyển sang chế độ Ngoại tuyến.
- **Nguyên nhân:** Google Gemini upstream phản hồi chậm hoặc mạng máy chủ bị nghẽn.
- **Biện pháp xử lý:**
  - Kiểm tra kết nối mạng quốc tế từ máy chủ.
  - Bộ máy Timeout 25s của hệ thống đã tự động ngắt kết nối an toàn qua `AbortSignal`, không gây treo tiến trình.

### Sự Cố 3: Lỗi CORS "Origin không được phép truy cập"
- **Hiện tượng:** Trình duyệt báo lỗi `CORS error` khi gọi API từ domain mới.
- **Nguyên nhân:** Cơ chế Fail-Closed trong môi trường `NODE_ENV=production`.
- **Biện pháp xử lý:**
  - Bổ sung domain hợp lệ vào biến môi trường `ALLOWED_ORIGINS` (cách nhau bởi dấu phẩy):
    ```env
    ALLOWED_ORIGINS=https://app.example.com,https://studio.example.com
    ```
  - Khởi động lại dịch vụ.

### Sự Cố 4: Proposal Bị Từ Chối (HTTP 409 Conflict)
- **Hiện tượng:** Người dùng bấm Xác nhận áp dụng nhưng nhận thông báo: "Bố cục phòng 3D đã bị thay đổi kể từ khi tạo đề xuất."
- **Nguyên nhân:** Tính năng an toàn `sceneVersion` phát hiện đồ vật đã bị dịch chuyển bởi thao tác khác trước khi xác nhận.
- **Biện pháp xử lý:**
  - Hướng dẫn người dùng yêu cầu AI tạo phương án mới dựa trên bố cục hiện tại. Đây là hành vi an toàn bắt buộc để tránh làm xáo trộn không gian 3D.

---

## 5. THỦ TỤC CẬP NHẬN PHIÊN BẢN (DEPLOYMENT PROCEDURE)

```bash
# 1. Kéo mã nguồn mới nhất
git checkout main
git pull origin main

# 2. Chạy kiểm tra chất lượng
npm run lint
npx tsx tests/p9_m1_hardening.test.ts
npx tsx tests/p9_m3_observability_resilience.test.ts

# 3. Biên dịch và khởi chạy lại container
docker compose build app
docker compose up -d app

# 4. Xác nhận phiên bản và sức khỏe
curl -s http://localhost:3000/health | grep '"status":"healthy"'
```
