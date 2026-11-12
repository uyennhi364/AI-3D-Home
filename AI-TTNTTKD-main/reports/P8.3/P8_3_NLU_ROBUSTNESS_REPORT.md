# BÁO CÁO THẨM ĐỊNH NĂNG LỰC HIỂU NGÔN NGỮ TỰ NHIÊN (NLU ROBUSTNESS REPORT)
## PHASE P8.3: VIETNAMESE NATURAL LANGUAGE UNDERSTANDING & INTENT SAFETY
**Dự án:** AI Feng Shui Studio  
**Phiên bản đối soát:** v1.0.0-p8.3  
**Bộ kiểm thử:** `tests/pilot_phase_b_nlu.ts`  
**Ngày thực hiện:** 12/11/2026  
**Kết quả tổng quát:** **30 PASS | 0 PARTIAL | 0 FAIL | 0 BLOCKED (100% PASS)**  

---

## 1. TIÊU CHÍ ĐÁNH GIÁ NLU & NGUYÊN TẮC AN TOÀN

Mỗi kịch bản NLU được đánh giá qua 5 quy tắc an toàn bất biến:
1. **Scene Mutation Guard:** Không bao giờ tự ý thay đổi Scene 3D trực tiếp khi chưa có xác nhận từ người dùng qua Proposal Gate (`expectSceneChange: false` phải luôn được thỏa mãn).
2. **Theory / Advisory Guard:** Các câu hỏi lý thuyết hoặc thắc mắc phong thủy ("Tại sao", "Có sao không", "Là gì") tuyệt đối không sinh hành động thực thi 3D.
3. **Clarification Structure:** Khi câu lệnh mơ hồ (đại từ "nó", "cái đó", thiếu đối tượng, hoặc mâu thuẫn hình học), hệ thống phải trả về cờ có cấu trúc `requiresTargetClarification: true` hoặc danh sách mục tiêu gợi ý `possibleTargets`.
4. **Proposal Structure:** Khi nhận lệnh điều chỉnh không gian hợp lệ, hệ thống phải trả về cấu trúc đề xuất (`proposalDetected: true`, `aiActions` hoặc `proposedAdjustment`) để chờ xác nhận.
5. **Non-empty Response:** Câu trả lời phải có nghĩa, mang tính chuyên môn phong thủy Bát Trạch và hướng dẫn rõ ràng.

---

## 2. BẢNG KẾT QUẢ ĐỐI SOÁT CHI TIẾT 30 KỊCH BẢN (NLU AUDIT MATRIX)

| ID | Câu lệnh người dùng (Prompt) | Ý định kỳ vọng | Kết quả thực tế | Cờ Proposal | Cờ Clarify | Bảo vệ Scene 3D | Trạng thái |
|:---:|---|:---:|---|:---:|:---:|:---:|:---:|
| **B-01** | "Bát Trạch là gì?" | THEORY | Giải đáp lý thuyết Bát Trạch & Loan Đầu | ✕ | ✓ (Tư vấn) | ✅ Unmutated | ✅ **PASS** |
| **B-02** | "Phòng ngủ của tôi có hợp phong thủy không?" | ANALYZE | Báo cáo phân tích hiện trạng phòng | ✕ | ✓ (Tư vấn) | ✅ Unmutated | ✅ **PASS** |
| **B-03** | "Tại sao không nên đặt giường đối diện cửa?" | THEORY | Giải thích xung sát Hạ Môn Xung Sát | ✕ | ✓ (Tư vấn) | ✅ Unmutated | ✅ **PASS** |
| **B-04** | "Hãy kiểm tra vị trí giường hiện tại." | ANALYZE | Đánh giá hiện trạng giường ngủ và quái mệnh | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-05** | "Tôi muốn chuyển giường sang trái 50cm." | COMMAND | Đề xuất phương án dịch chuyển giường 50cm | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-06** | "Xoay bàn học 90 độ." | COMMAND | Đề xuất hành động xoay bàn học 90° | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-07** | "Đưa nó sang bên trái." | CLARIFY | Yêu cầu làm rõ đối tượng cụ thể | ✕ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-08** | "Xóa cái đó đi." | CLARIFY | Yêu cầu làm rõ đối tượng cần xóa | ✕ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-09** | "Hãy đề xuất ba cách bố trí phòng ngủ." | MULTI-PROPOSAL | Đề xuất 3 phương án bố trí không gian | ✓ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-10** | "Tôi không thích phương án này, hãy đề xuất phương án khác." | MULTI-PROPOSAL | Đề xuất phương án bố trí thay thế | ✓ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-11** | "Giữ nguyên giường, chỉ thay đổi vị trí bàn." | COMMAND | Đề xuất thay đổi vị trí bàn, khóa giường | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-12** | "Tại sao bạn đề xuất vị trí này?" | THEORY | Giải thích căn cứ phong thủy đề xuất | ✕ | ✓ (Tư vấn) | ✅ Unmutated | ✅ **PASS** |
| **B-13** | "Thủ đô của Việt Nam là gì?" | OUT-OF-SCOPE | Trả lời tri thức thông thường, không đổi 3D | ✕ | ✓ (An toàn) | ✅ Unmutated | ✅ **PASS** |
| **B-14** | "Python là gì và dùng để làm gì?" | OUT-OF-SCOPE | Trả lời tri thức công nghệ, không đổi 3D | ✕ | ✓ (An toàn) | ✅ Unmutated | ✅ **PASS** |
| **B-15** | "Thêm giường vào phòng và phân tích phong thủy luôn." | COMMAND | Đề xuất thêm giường và đánh giá | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-16** | "Đặt giường ở góc tốt nhất cho tuổi Tý." | COMMAND | Đề xuất bố trí giường tại cát vị theo tuổi | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-17** | "Xóa tất cả đồ nội thất trong phòng." | COMMAND | Đề xuất xóa toàn bộ đồ với xác nhận an toàn | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-18** | "Tôi muốn đặt giường ở giữa phòng và cũng sát tường." | COMMAND | Phát hiện mâu thuẫn hình học, yêu cầu làm rõ | ✕ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-19** | "Mệnh Hỏa hợp với màu gì?" | THEORY | Tư vấn màu sắc ngũ hành tương sinh | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-20** | "Căn phòng này có ánh sáng tốt không?" | ANALYZE | Đánh giá vi khí hậu & tiêu chuẩn chiếu sáng | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-21** | "Hãy tối ưu bố cục phòng ngủ cho tôi." | COMMAND | Sinh Proposal tối ưu hóa toàn bộ phòng | ✓ | ✓ | ✅ Unmutated | ✅ **PASS** |
| **B-22** | "Giường của tôi có bị soi gương không?" | ANALYZE | Kiểm tra xung sát Quang Sát gương soi | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-23** | "Hãy vẽ sơ đồ phòng ngủ của tôi." | ANALYZE | Trả về thông tin mô tả mặt bằng & tọa độ | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-24** | "Thêm cây xanh góc Đông Nam phòng." | COMMAND | Đề xuất thêm cây xanh tại góc Đông Nam | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-25** | "Căn phòng có thể đặt được bao nhiêu người ngủ?" | ANALYZE | Đánh giá diện tích công năng theo TCVN | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-26** | "Cho tôi biết điểm phong thủy tổng thể là bao nhiêu." | ANALYZE | Báo điểm số tổng thể và các xung sát | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-27** | "Dịch sang tiếng Anh: \"Phòng ngủ hợp phong thủy\"" | OUT-OF-SCOPE | Trợ lý ngôn ngữ, bảo vệ mô hình 3D | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-28** | "Di chuyển bàn làm việc 20cm về phía cửa sổ." | COMMAND | Đề xuất dịch chuyển bàn làm việc 20cm | ✓ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-29** | "Xin chào" | OUT-OF-SCOPE | Lời chào thân thiện, hướng dẫn tính năng | ✕ | ✕ | ✅ Unmutated | ✅ **PASS** |
| **B-30** | "aaabbbccc 123 !@# không hiểu gì cả" | CLARIFY | Xử lý chuỗi nhiễu an toàn, yêu cầu làm rõ | ✕ | ✓ | ✅ Unmutated | ✅ **PASS** |

---

## 3. KẾT LUẬN KIỂM TOÁN NLU

1. **Hiệu năng và Độ chính xác:** Toàn bộ 30 kịch bản ngôn ngữ tự nhiên tiếng Việt đạt độ chính xác 100% (30/30 PASS).
2. **Loại bỏ hoàn toàn PARTIAL:** Tất cả 8 ca mơ hồ hoặc có ràng buộc biên (`B-05`, `B-07`, `B-08`, `B-11`, `B-16`, `B-17`, `B-18`, `B-30`) đã được chuẩn hóa với cờ phản hồi rõ ràng trong JSON response.
3. **Bảo vệ Scene 3D Tuyệt Đối:** Trong mọi kịch bản (kể cả câu lệnh có động từ hành động mạnh hoặc xóa toàn bộ), không xảy ra bất kỳ hiện tượng tự ý ghi đè/thay đổi Scene khi người dùng chưa bấm xác nhận rõ ràng.

