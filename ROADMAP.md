# Lộ trình EduRef AI

Cập nhật 15/10/2026. Phạm vi runtime: giấy xác nhận sinh viên, năm biểu mẫu. [Roadmap thiết kế trước đây](EDUREF_AI/docs/17_ROADMAP.md) giữ làm lịch sử; các số liệu cũ không phải kết quả đo hiện hành.

## Đã triển khai

- Policy xác định, hỏi bổ sung, chuyển cán bộ, audit hash và hoàn tác.
- Bản vá thứ tự chốt thôi học/bảo lưu, phân quyền hồ sơ, khóa dữ kiện máy chủ, CAS và che lỗi nội bộ.
- Test mặc định cô lập; test ghi DB có opt-in riêng. Mutation catalogue 39 ca cho 52 security test.
- Dọn code chết, metadata form dùng chung, cán bộ quyết định qua service chung, bổ sung hồ sơ bằng JSON.

## Công việc tiếp theo

1. Đồng bộ migration với schema nhân thân trên DB thử nghiệm; xác minh upgrade DB có dữ liệu.
2. Bổ sung nguồn học vụ có thẩm quyền cho TKB/tín chỉ, giải quyết hồ sơ tùy biến ACTIVE thiếu dữ kiện; bỏ lời hứa duyệt ngầm.
3. Hợp nhất context HTTP/Socket và các tool nhỏ về workflow contract chung, có test đối chiếu hành vi.
4. Kiểm thử trình duyệt: bổ sung WAITING_STUDENT, dừng stream, timeout, đổi vai trò và trang cán bộ.
5. Đo missed/false escalation trên dataset độc lập có nhãn, không lấy tỷ lệ fixture làm số liệu đánh giá mô hình.
6. Nâng toolchain Tailwind/dependency có advisory theo một thay đổi riêng, kiểm chứng tương thích CSS.

Chi tiết phần đã dọn và phần giữ lại: [báo cáo cleanup](docs/KET_QUA_DON_DEP_CODEBASE.md).
