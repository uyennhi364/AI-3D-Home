# TÀI LIỆU THAM CHIẾU API (API REFERENCE)
## AI FENG SHUI STUDIO

Tài liệu này cung cấp chi tiết tất cả các điểm cuối HTTP API của máy chủ backend AI Feng Shui Studio, bao gồm định dạng dữ liệu đầu vào, đầu ra, mã trạng thái HTTP, cơ chế bảo mật và xử lý lỗi.

---

## 1. THÔNG TIN CHUNG (OVERVIEW)

- **Base URL:** `http://localhost:3000` (hoặc domain triển khai)
- **Content-Type:** `application/json; charset=utf-8`
- **Tối đa kích thước gói tin:** `2MB` (DoS mitigation)
- **Hệ thống Header bắt buộc / khuyến nghị:**
  - `X-Request-ID`: Mã định danh tương quan request (máy chủ tự sinh nếu client không truyền).
  - `x-gemini-api-key`: Khóa Google Gemini API tùy chọn từ phía client (nếu không dùng biến môi trường phía server).

---

## 2. DANH SÁCH ENDPOINTS

### 2.1. `GET /health` hoặc `GET /ready`
Kiểm tra trạng thái sức khỏe của tiến trình máy chủ (Healthcheck endpoint). Độc lập hoàn toàn với trạng thái kết nối Google Gemini upstream.

#### Request
```http
GET /health HTTP/1.1
Host: localhost:3000
```

#### Response (200 OK)
```json
{
  "status": "healthy",
  "processHealth": "HEALTHY",
  "uptime": 142.53,
  "timestamp": "2026-11-13T16:20:00.000Z",
  "version": "v1.0.0-p9.1",
  "systemVersion": "v1.0.0-p9.1",
  "instanceId": "inst_1234_abcde",
  "memory": {
    "rssMb": 85.24,
    "heapUsedMb": 42.15
  },
  "gemini": {
    "isConfigured": true,
    "status": "CONFIGURED",
    "upstreamCheckIndependent": true
  }
}
```

---

### 2.2. `GET /api/gemini/status`
Kiểm tra khả năng sẵn sàng của dịch vụ AI Google Gemini (trực tuyến hay ngoại tuyến).

#### Request
```http
GET /api/gemini/status HTTP/1.1
Host: localhost:3000
x-gemini-api-key: AIzaSy... (tùy chọn)
```

#### Response (200 OK)
```json
{
  "hasServerKey": true,
  "isOnline": true
}
```

---

### 2.3. `POST /api/chat` hoặc `POST /api/gemini/chat`
Điểm cuối đàm thoại ngôn ngữ tự nhiên chính với Thầy Phong Thủy AI và tiếp nhận lệnh điều khiển 3D.
- **Rate Limit:** 30 requests / phút / IP.
- **Timeout bảo vệ:** 25 giây (kèm real `AbortSignal`).

#### Request Body
```json
{
  "intent": "MOVE_OBJECT",
  "messages": [
    { "role": "user", "content": "Di chuyển giường ngủ sang bên trái 50cm" }
  ],
  "userProfile": {
    "birthYear": 1985,
    "gender": "male",
    "guaName": "Càn",
    "element": "Kim",
    "group": "Tây Tứ Mệnh",
    "auspiciousDirections": ["W", "NE", "SW", "NW"],
    "inauspiciousDirections": ["S", "SE", "E", "N"]
  },
  "roomConfig": {
    "width": 5.0,
    "length": 5.2,
    "height": 2.8,
    "direction": "S"
  },
  "objects": [
    {
      "id": "bed_master",
      "type": "bed",
      "name": "Giường ngủ",
      "position": { "x": 1.2, "y": 0, "z": -1.5 },
      "dimensions": { "width": 1.6, "length": 2.0, "height": 0.95 },
      "rotation": { "x": 0, "y": 0, "z": 0 }
    }
  ],
  "ruleEngineResult": {
    "overallScore": 51,
    "statusText": "Cần Điều Chỉnh Ngay",
    "keyIssues": ["Gương soi chiếu thẳng vào giường ngủ (Quang Sát)"]
  },
  "selectedObjectId": "bed_master"
}
```

#### Response (200 OK — Khi AI tạo Đề xuất Thay đổi 3D)
```json
{
  "success": true,
  "message": "Tôi đã tạo đề xuất dịch chuyển giường ngủ sang bên trái 50cm. Bạn có thể xem trước bóng mờ 3D trên màn hình và bấm xác nhận để áp dụng.",
  "isGeminiOnline": true,
  "aiActions": [
    {
      "actionType": "MOVE_OBJECT",
      "objectId": "bed_master",
      "targetPosition": { "x": 0.7, "y": 0, "z": -1.5 },
      "status": "PROPOSED",
      "requiresConfirmation": true,
      "proposalId": "prop_1794586800_abc123"
    }
  ],
  "proposedAdjustment": {
    "proposalId": "prop_1794586800_abc123",
    "actionType": "MOVE_OBJECT",
    "targetId": "bed_master",
    "newPosition": { "x": 0.7, "y": 0, "z": -1.5 },
    "requiresConfirmation": true
  }
}
```

#### Response (200 OK — Khi AI ở Chế độ Ngoại Tuyến / Fallback)
```json
{
  "success": true,
  "message": "[AI Ngoại tuyến: Hạn mức Gemini API tạm thời bị đầy (Quota / Rate Limit)] Tôi đã phân tích theo bộ quy tắc xác định Bát Trạch...",
  "isGeminiOnline": false,
  "fallbackReason": "quota",
  "warningMessage": "[AI Ngoại tuyến: Hạn mức Gemini API tạm thời bị đầy (Quota / Rate Limit)]"
}
```

---

### 2.4. `POST /api/chat/confirm`
Xác nhận và áp dụng một Đề xuất (Proposal) vào không gian phòng 3D thực tế.
- **Rate Limit:** 60 requests / phút / IP.

#### Request Body
```json
{
  "proposalId": "prop_1794586800_abc123",
  "sceneVersion": "sv_168368932",
  "sessionId": "default_session",
  "fnName": "move_furniture",
  "args": {
    "objectId": "bed_master",
    "targetPosition": { "x": 0.7, "y": 0, "z": -1.5 }
  }
}
```

#### Response (200 OK — Thành công)
```json
{
  "success": true,
  "proposalId": "prop_1794586800_abc123"
}
```

#### Response (409 Conflict — Lỗi Xung đột)
Xảy ra khi `sceneVersion` không khớp (phòng đã bị thay đổi), đề xuất đã hết hạn (TTL 5 phút) hoặc đề xuất đang được xử lý trong một giao dịch khác:
```json
{
  "success": false,
  "error": "Bố cục phòng 3D đã bị thay đổi kể từ khi tạo đề xuất. Đề xuất cũ không còn an toàn để áp dụng."
}
```

#### Response (400 Bad Request — Lỗi Tham số)
```json
{
  "success": false,
  "error": "proposalId is required."
}
```

---

### 2.5. `POST /api/gemini/analyze`
Tạo báo cáo phân tích phong thủy chuyên sâu toàn diện từ Gemini AI.

#### Request Body
Tương tự cấu trúc của `/api/chat` kèm thông tin gia chủ, cấu hình phòng, danh sách đồ vật và kết quả tính toán từ bộ máy luật xác định.

#### Response (200 OK)
Trả về chuỗi văn bản phân tích chuyên sâu được định dạng Markdown rõ ràng theo từng cung vị và phương án khắc phục xung sát.

---

## 3. MÃ LỖI HTTP CHUẨN HÓA

| Mã HTTP | Tên Lỗi | Nguyên Nhân Phổ Biến |
|---|---|---|
| **400** | Bad Request | Thiếu `proposalId`, dữ liệu JSON sai cú pháp hoặc tham số không hợp lệ. |
| **403** | Forbidden | Xác nhận đề xuất sai phiên làm việc (`sessionId` không khớp). |
| **404** | Not Found | Đề xuất không tồn tại hoặc đã bị hủy. |
| **409** | Conflict | Xung đột `sceneVersion` (phòng đã đổi), tranh chấp đồng thời (`claiming`), hoặc replay proposal đã thực thi. |
| **410** | Gone | Đề xuất đã hết hạn thời gian hiệu lực ($> 5$ phút). |
| **422** | Unprocessable Entity | Vi phạm an toàn hình học (va chạm đồ vật OBB, vượt ra ngoài phòng) khi thực thi giao dịch. |
| **429** | Too Many Requests | Vượt quá giới hạn Rate Limit (120 req/min global, 30 req/min chat) hoặc Gemini Quota. |
| **500** | Internal Server Error | Lỗi nội bộ không xác định phía máy chủ. |
| **502** | Bad Gateway | Lỗi upstream từ máy chủ Google Gemini. |
| **503** | Service Unavailable | Lỗi mạng kết nối tới Google Gemini upstream. |
| **504** | Gateway Timeout | Quá thời gian phản hồi từ Google Gemini ($> 25$ giây). |

