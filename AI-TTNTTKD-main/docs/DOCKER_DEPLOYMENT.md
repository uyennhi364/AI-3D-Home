# HƯỚNG DẪN TRIỂN KHAI DOCKER & CONTAINER ORCHESTRATION
## HỆ THỐNG AI FENG SHUI STUDIO

Tài liệu này cung cấp hướng dẫn toàn diện về cách đóng gói, cấu hình và vận hành hệ thống **AI Feng Shui Studio** bằng Docker và Docker Compose trên môi trường máy chủ Production.

---

## 1. TỔNG QUAN KIẾN TRÚC CONTAINER

Container của AI Feng Shui Studio được thiết kế tuân thủ các tiêu chuẩn bảo mật và tối ưu dung lượng cao nhất:
- **Base Image:** `node:22-alpine` (hệ điều hành tối giản, bảo mật, vá lỗi CVE mới nhất).
- **Multi-Stage Build (3 giai đoạn):**
  1. `builder`: Cài đặt full dependencies và biên dịch mã nguồn (Vite client SPA và esbuild native ESM `dist/server.js`).
  2. `prod-deps`: Cài đặt riêng các dependencies chạy production (`npm ci --omit=dev --ignore-scripts`), loại bỏ toàn bộ dev tools, linters và test runners.
  3. `runner`: Image siêu nhỏ gọn chứa duy nhất build artifacts, production dependencies và Node.js runtime.
- **Bảo mật Non-Root:** Tiến trình Node.js chạy dưới quyền người dùng không đặc quyền `node` (UID=1000, GID=1000), loại bỏ nguy cơ chiếm quyền root container.
- **Healthcheck tích hợp:** Tự động kiểm tra endpoint `/health` mỗi 30 giây bằng lệnh `wget` nội bộ.
- **Dung lượng tối ưu:** Mục tiêu kích thước image < 200MB.

---

## 2. CẤU HÌNH BIẾN MÔI TRƯỜNG (ENVIRONMENT CONFIGURATION)

Trước khi khởi động, hãy tạo tệp `.env` hoặc truyền biến môi trường từ hệ thống điều phối (Kubernetes, AWS ECS, Docker Compose):

| Tên biến | Bắt buộc | Mặc định | Mô tả |
|---|:---:|:---:|---|
| `PORT` | Không | `3000` | Cổng HTTP mà server lắng nghe trong container. |
| `NODE_ENV` | Có | `production` | Chế độ chạy ứng dụng. Bắt buộc là `production` trên server thật. |
| `ALLOWED_ORIGINS` | **Bắt buộc trên Prod** | *Trống* | Danh sách URL được phép truy cập CORS, phân tách bằng dấu phẩy (ví dụ: `https://fengshui.studio,https://app.fengshui.studio`). **Cơ chế Fail-Closed: Nếu thiếu, mọi cross-origin request sẽ bị từ chối 403.** |
| `GEMINI_API_KEY` | Không | *Trống* | Khóa API Google Gemini. Nếu không cung cấp, hệ thống tự động chạy chế độ Offline Fallback an toàn 100%. |

---

## 3. KHỞI CHẠY BẰNG DOCKER COMPOSE (KHUYẾN NGHỊ)

Docker Compose là phương thức thuận tiện nhất để khởi chạy ứng dụng cục bộ hoặc trên máy chủ VPS:

### Bước 1: Tạo file cấu hình môi trường `.env`
```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
GEMINI_API_KEY=
EOF
```

### Bước 2: Build và khởi chạy container
```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái hoạt động
```bash
# Xem danh sách container và trạng thái healthcheck
docker compose ps

# Xem nhật ký logs theo thời gian thực
docker compose logs -f app
```

### Bước 4: Dừng container
```bash
docker compose down
```

---

## 4. BUILD VÀ CHẠY DOCKER THỦ CÔNG (DOCKER CLI)

Nếu không sử dụng Docker Compose, bạn có thể thực hiện trực tiếp bằng Docker CLI:

### Bước 1: Build Docker Image
```bash
docker build -t ai-feng-shui-studio:latest .
```

### Bước 2: Khởi chạy Container
```bash
docker run -d \
  --name ai_feng_shui_studio \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e ALLOWED_ORIGINS="http://localhost:3000" \
  -e GEMINI_API_KEY="AIzaSyYourApiKeyHere" \
  ai-feng-shui-studio:latest
```

### Bước 3: Kiểm chứng sức khỏe ứng dụng
```bash
# Kiểm tra endpoint /health từ bên ngoài
curl -i http://localhost:3000/health
```

Phản hồi chuẩn:
```json
{
  "status": "healthy",
  "processHealth": "HEALTHY",
  "uptime": 12.34,
  "timestamp": "2026-11-13T15:45:00.000Z",
  "version": "v1.0.0-p9.1",
  "instanceId": "inst_...",
  "memory": {
    "rssMb": 65.4,
    "heapUsedMb": 32.1
  },
  "gemini": {
    "isConfigured": true,
    "status": "CONFIGURED",
    "upstreamCheckIndependent": true
  }
}
```

---

## 5. BẢO MẬT VÀ NGUYÊN TẮC VẬN HÀNH

1. **Tuyệt đối không lưu secret trong Docker Image:**
   - Tệp `.dockerignore` đã loại trừ toàn bộ tệp `.env`, `.env.*`, `tests`, `reports` và thư mục `.git`.
   - Mọi credential phải được đưa vào thông qua biến môi trường hoặc Secret Manager (AWS Secrets Manager, HashiCorp Vault).
2. **Quyền hạn tối thiểu:**
   - Không được sửa đổi lệnh `USER node` trong Dockerfile. Tiến trình Node.js không bao giờ được phép chạy bằng tài khoản `root`.
3. **Cơ chế Fail-Closed của CORS:**
   - Trên môi trường Production (`NODE_ENV=production`), nếu quên khai báo `ALLOWED_ORIGINS`, server sẽ tự động khóa toàn bộ kết nối từ trình duyệt khác domain để chống tấn công CSRF.
4. **Giới hạn tài nguyên:**
   - Tệp `docker-compose.yml` đã được định cấu hình giới hạn RAM 512MB và 2 CPU cores, ngăn ngừa rủi ro memory leak gây ảnh hưởng đến toàn bộ máy chủ.

