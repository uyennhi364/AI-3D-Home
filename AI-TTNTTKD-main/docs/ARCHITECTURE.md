# KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)
## AI FENG SHUI STUDIO

Tài liệu này mô tả chi tiết kiến trúc tổng thể, ranh giới module (module boundaries), luồng dữ liệu (data flow) và các nguyên tắc bất biến của hệ thống **AI Feng Shui Studio**.

---

## 1. TỔNG QUAN KIẾN TRÚC PHÂN TẦNG (LAYERED ARCHITECTURE)

Hệ thống được thiết kế theo mô hình phân tầng nghiêm ngặt (Strict Layered Architecture), đảm bảo tính tách biệt trách nhiệm và tính độc lập của các thuật toán phong thủy xác định đối với AI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER (UI & 3D)                          │
│   React 19 Components | Three.js WebGL Scene | Top-down 2D Canvas           │
│   Unified Assessment Modal | Object Properties | Ngũ Hành Badges/Cards      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                  NLU, AGENT & SAFETY GATE LAYER (P7, Phase H)               │
│   Intent Guard (Theory vs 3D Command) | Proposal Manager (TTL, Hash)        │
│   Confirm Gate (2-turn confirmation) | Transaction Manager (Undo/Redo)      │
└──────────────────┬───────────────────────────────────────┬──────────────────┘
                   │                                       │
┌──────────────────▼──────────────────┐ ┌──────────────────▼──────────────────┐
│      GEMINI AI COPILOT (NLU)        │ │    OFFLINE / LOCAL AI FALLBACK      │
│   Google Gen AI SDK (@google/genai) │ │   Rule-based intent parser &        │
│   25s AbortSignal Timeout & Retry   │ │   Local natural language generator  │
└──────────────────┬──────────────────┘ └──────────────────┬──────────────────┘
                   │                                       │
┌──────────────────▼───────────────────────────────────────▼──────────────────┐
│                    DETERMINISTIC ENGINE CORE (P0 - P8)                      │
│  ┌────────────────────────┐ ┌───────────────────────┐ ┌──────────────────┐  │
│  │    Bát Trạch Engine    │ │  Loan Đầu / OBB SAT   │ │ TCVN 4451:2012   │  │
│  │ (Quái, 60 Can Chi Nạp Âm)│ (Va chạm hình học 3D) │ │ (Môi trường, Eg) │  │
│  └────────────────────────┘ └───────────────────────┘ └──────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │            Ngũ Hành Sinh Khắc Engine (P8 Additive Module)              │ │
│  │  Color/Material/Shape Mapping | 7 Rules | Explainer Generator          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    DATA PERSISTENCE & SYSTEM SERVICES                       │
│   Proposal Store (InMemory Adapter) | Storage Resilience (Quota & Versioning)│
│   Structured JSON Logger (Redaction) | Native ESM Express API               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NGUYÊN TẮC THIẾT KẾ & RANH GIỚI BẤT BIẾN (INVARIANTS)

1. **Frozen Architecture (P0–P7.5):** Ranh giới các module lõi từ P0 đến P7.5 đã đóng băng. Các module mới (P8 Ngũ Hành, P9 Hardening/Resilience) chỉ được tích hợp theo hình thức **Bổ sung (Additive-only)**, tuyệt đối không sửa đổi hay tái cấu trúc các interface đã ổn định.
2. **Zero Reverse Imports:** Module Ngũ Hành (`src/engine/core/nguHanh/`) được phép import từ các kiểu dữ liệu chung (`types/fengshui.ts`), nhưng các engine cổ điển (P0–P7.5) tuyệt đối **không được import ngược** từ `nguHanh/`.
3. **Thuật Toán Phong Thủy Xác Định:** Toàn bộ công thức tính Quái số, Bát Trạch, 60 Hoa Giáp, Nạp Âm, quy tắc khoảng cách hình học OBB SAT đều là các hàm thuần túy (pure functions), cho kết quả xác định $100\%$, không dựa vào tính ngẫu nhiên của LLM.
4. **Bảo Vệ Scene 3D Tuyệt Đối (Proposal Confirm Gate):**
   - Đề xuất thay đổi (Proposal) và Xem trước bóng mờ (Ghost Preview) hoàn toàn tách biệt với Scene thực tế.
   - Không có bất kỳ đường dẫn nào cho phép AI hoặc client ghi trực tiếp vào Scene 3D mà không qua bước xác nhận người dùng (`confirmProposal`).
   - Mọi Proposal đều bị ràng buộc bởi:
     - `ttlMs`: Thời gian sống tối đa 5 phút.
     - `sceneVersion`: Hash toàn vẹn bố cục phòng. Nếu phòng bị thay đổi trước khi confirm, proposal tự động bị hủy (`409 Conflict`).
     - `argsHash`: Mã băm tham số thực thi, chống can thiệp tham số giữa chừng.
     - `sessionId`: Khóa gắn kết với phiên làm việc của người dùng.
5. **Giao Dịch Nguyên Tử & Khả Năng Phục Hồi (Atomic Transactions & Rollback):**
   - Mọi hành động áp dụng vào Scene được thực thi như một giao dịch đơn nhất.
   - Nếu phát hiện vi phạm hậu điều kiện (va chạm đồ vật OBB, vượt ra ngoài tường, chắn cửa), hệ thống tự động Rollback về trạng thái cũ và trả về lỗi 422.
   - Hỗ trợ lịch sử Undo / Redo đa tầng độc lập theo từng phiên.

---

## 3. CÁC MODULE CHÍNH CỦA HỆ THỐNG

### 3.1. Frontend & 3D Visualization (`src/`)
- `App.tsx`: Trình điều phối giao diện chính, kết nối State phòng, Scene 3D và Chat Copilot.
- `src/components/BedroomCanvas.tsx`: Render WebGL Three.js, hiển thị mô hình phòng, đồ vật thực tế và bóng mờ đề xuất (ghost preview).
- `src/components/UnifiedAssessmentReportModal.tsx`: Hộp thoại báo cáo phong thủy toàn diện, tích hợp tab Ngũ Hành.
- `src/components/ObjectPropertiesPanel.tsx`: Bảng thuộc tính chi tiết của đồ vật đang chọn (tọa độ, kích thước, màu sắc, vật liệu, cung vị).
- `src/components/NguHanhAssessmentPanel.tsx` & Badges: Hiển thị ma trận Ngũ Hành sinh khắc của đồ vật và toàn phòng.

### 3.2. Engine Phong Thủy & Hình Học (`src/engine/`)
- `core/batTrachEngine.ts` & `core/guaEngine.ts`: Tính Quái mệnh và ma trận 64 hướng Bát Trạch.
- `core/lapXuanCalendar.ts`: Xác định năm tiết khí Lập Xuân chính xác cho người sinh tháng 1 và ngày 4-5/2.
- `core/napAmEngine.ts`: Tra cứu Can Chi và Ngũ Hành Nạp Âm 60 Hoa Giáp.
- `core/furnitureRuleEngine.ts`: Bộ quy tắc Loan Đầu hình thế (giường, bàn, tủ, gương).
- `core/sectorEngine.ts`: Phân chia 8 cung Bát Trạch và Trung Cung theo tọa độ 3D.
- `geometryEngine.ts`: Tính toán OBB SAT Collision V2, tìm vị trí an toàn thông minh (Smart Placement).
- `layoutOptimizer.ts`: Bộ tối ưu hóa bố cục phòng ngủ tự động, tôn trọng đồ vật bị khóa (Pinned Objects).

### 3.3. Module Ngũ Hành Bổ Sung (`src/engine/core/nguHanh/`)
- `elementMapping.ts`: Ánh xạ Hex màu sắc, tên vật liệu, hình khối đồ vật và phương vị thành Ngũ Hành. Chuẩn hóa 4 trạng thái dữ liệu (`known`, `ambiguous`, `insufficient`, `unsupported`).
- `elementRelationship.ts`: Vòng tròn tương sinh tương khắc 5 hành (Sinh, Khắc, Tỷ Hòa, Tiết Khí).
- `elementRuleEngine.ts`: 7 quy tắc Ngũ Hành phong thủy nội thất.
- `elementExplainer.ts`: Bộ máy diễn giải tự nhiên 9 trường thông tin bắt buộc.

### 3.4. AI Copilot & An Toàn (`src/services/` & `src/engine/agent/`)
- `intentGuard.ts`: Phân loại câu lệnh người dùng (Hỏi lý thuyết vs. Thao tác 3D).
- `serverGuard.ts`: Bộ lọc rủi ro phía máy chủ, xác thực Proposal và Scene Version.
- `proposalManager.ts` & `proposalStore.ts`: Quản lý vòng đời đề xuất, tách biệt adapter lưu trữ.
- `transactionManager.ts`: Quản lý thực thi giao dịch, kiểm tra hậu điều kiện và Undo/Redo.
- `logger.ts`: Structured JSON Logging, tự động che dấu credential và request tracing.
- `storageResilience.ts`: LocalStorage Quota Guard, VersionedEnvelope v1 và migrator tự động.

---

## 4. LUỒNG DỮ LIỆU ĐIỀU KHIỂN (CONTROL DATA FLOW)

### Luồng 1: Người Dùng Ra Lệnh Bằng Ngôn Ngữ Tự Nhiên
```
User Prompt ("Di chuyển giường sang trái 50cm")
  │
  ▼
[Intent Guard] ──(Hỏi lý thuyết)──► Trả lời tư vấn (Không tạo 3D Proposal)
  │ (Phát hiện lệnh 3D)
  ▼
[Gemini AI / Local NLU] ──► Gọi Tool tương ứng (move_furniture)
  │
  ▼
[Server Guard & Proposal Manager]
  ├── Tính toán vị trí mới an toàn (Smart Placement)
  ├── Tính argsHash & sceneVersion
  ├── Sinh proposalId (TTL 5 phút)
  └── Trả về Ghost Preview (bóng mờ) cho Client
  │
  ▼
[Client UI] ──► Hiển thị bóng mờ vị trí mới & Nút [Xác nhận áp dụng]
  │
  ▼
[User Clicks Confirm] ──► POST /api/chat/confirm
  │
  ▼
[Proposal Manager: atomicClaimProposal]
  ├── Kiểm tra TTL (chưa hết hạn)
  ├── Kiểm tra sceneVersion (bố cục chưa bị thay đổi)
  ├── Kiểm tra anti-replay (chưa từng thực thi)
  └── Chuyển trạng thái: 'claiming'
  │
  ▼
[Transaction Manager: executeProposalTransaction]
  ├── Cập nhật tọa độ đồ vật
  ├── Kiểm tra OBB SAT Collision (không va chạm)
  ├── Kiểm tra Boundary Room (nằm hoàn toàn trong phòng)
  └── Ghi nhận lịch sử Past Stack (sẵn sàng Undo)
  │
  ▼
[Scene 3D Updated] ──► Render đồ vật tại vị trí mới, hoàn tất giao dịch.
```

---

## 5. CƠ CHẾ NÂNG CẤP & MỞ RỘNG (EXTENSIBILITY)

- **Proposal Store:** Hiện tại triển khai `InMemoryProposalStore` phù hợp mô hình đơn máy chủ. Khi mở rộng multi-instance / cluster, chỉ cần tạo `RedisProposalStore` thực thi interface `IProposalStore` mà không cần sửa đổi bất kỳ dòng mã nào trong `ProposalManager`.
- **Client Storage Migration:** Khi cấu trúc dữ liệu lưu trữ phía client thay đổi, chỉ cần đăng ký hàm nâng cấp vào `registerMigrator` (ví dụ `v1 -> v2`), hệ thống sẽ tự động chuyển đổi dữ liệu khi người dùng mở ứng dụng.

