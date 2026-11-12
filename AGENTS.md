# AGENTS.md — AI FENG SHUI STUDIO
## CÁC QUY TẮC BẤT BIẾN & TOKEN-EFFICIENT WORKFLOW

### 1. NGUYÊN TẮC BẤT BIẾN (NON-NEGOTIABLE ARCHITECTURE)
1. **Frozen Architecture:** Toàn bộ kiến trúc P0–P7.5 đã đóng băng. Không tự ý tái cấu trúc hoặc thay đổi ranh giới module.
2. **Thuật toán Phong Thủy Bất Biến:** Tuyệt đối không thay đổi công thức Bát Trạch Lữ Tài, Cung phi quái mệnh, Nạp Âm Lục Thập Hoa Giáp.
3. **Điểm chuẩn Master Preset:** Giá trị Master Preset $89/51$ là chuẩn nghiệm thu bất biến trong mọi bài kiểm thử.
4. **Bảo vệ Scene 3D:** Đề xuất (Proposal) và Xem trước bóng mờ (Ghost Preview) phải tách biệt hoàn toàn với Scene thực tế.
5. **Proposal Confirm Gate:** Tuyệt đối KHÔNG tự ý Apply Proposal vào Scene khi người dùng chưa bấm xác nhận rõ ràng.
6. **Bảo vệ Regression Test:** Không xóa bỏ các bài test cũ; không sửa expected values để biến FAIL thành PASS.
7. **Bảo đảm Chất lượng:** Mọi sửa đổi mã nguồn bắt buộc phải có regression test bảo vệ.
8. **An toàn Môi trường:** Không tự ý triển khai Production trừ khi có lệnh phê duyệt rõ ràng từ người dùng.

---

### 2. QUY TẮC TỐI ƯU HÓA TOKEN (TOKEN-EFFICIENCY)
- **Targeted Reading:** Đọc tệp tin có mục tiêu (khoảng dòng cụ thể), không đọc tràn lan toàn bộ repository.
- **Không Lặp Dữ Liệu:** Không in lại toàn bộ source code, không lặp lại nội dung tài liệu đã đọc trong câu trả lời.
- **Targeted Testing:** Chạy unit/integration test mục tiêu cho module vừa sửa. Chỉ chạy full regression (14 Suites) tại checkpoint cuối Phase.
- **Báo Cáo Súc Tích:** Trả lời người dùng ngắn gọn, tập trung vào summary, findings và bằng chứng kiểm thử thực tế.

---

### 3. QUY TRÌNH THỰC THI TỰ ĐỘNG (AUTONOMOUS EXECUTION)
- Tự động đọc `reports/PROGRESS.md` và tài liệu Phase liên quan để nắm ngữ cảnh.
- Tự chia task và thực thi tuần tự từ đầu đến cuối; không dừng lại chỉ để trình bày kế hoạch suông.
- Không hỏi lại thông tin đã có sẵn trong tài liệu.
- Chỉ dừng yêu cầu xác nhận khi có hành vi phá hủy dữ liệu, thay đổi kiến trúc lớn hoặc triển khai production.

