# 05. Policy Và Ranh Giới Thẩm Quyền (Authority Boundary)

> **Policy version:** `STUDENT_CONFIRMATION_V2.0.0`
> **Workflow:** `STUDENT_CONFIRMATION` (Hỗ trợ 5 biểu mẫu học vụ thực tế HUTECH)

## 1. Các lớp kiểm soát quy chế (Multi-Layer Verification)

1. **Chốt ý định & Khớp biểu mẫu:** Nhận diện đúng biểu mẫu (`formCode`), đối soát chéo để phát hiện lệch biểu mẫu giữa form đang mở và nội dung yêu cầu (`detectCrossFormMismatch`).
2. **Chốt dữ kiện pháp lý:** Kiểm tra đầy đủ cơ quan tiếp nhận (`recipientAgency`), địa chỉ thường trú 4 cấp Title Case (`permanentAddress`), danh sách môn nợ (`debtCourses` với Form nợ môn).
3. **Chốt học vụ hiện tại:** Bắt buộc có Thời khóa biểu hoặc tín chỉ đăng ký học kỳ này (`hasSchedule === true`, `enrolledCredits > 0`). Sinh viên thôi học (`DROPPED`) hoặc bảo lưu (`SUSPENDED`) bị từ chối tự động.
4. **Chốt thời hạn đào tạo:** Sinh viên quá 4 năm chuẩn không được cấp Giấy NVQS thường, ép chuyển sang Biểu mẫu Nợ môn (`COURSE_DEBT`).
5. **Chính sách tài chính:** Nhà trường hỗ trợ tối đa, không ràng buộc nợ học phí để chặn cấp giấy xác nhận (chỉ cần điều kiện có môn học / thời khóa biểu).
6. **Chốt hạn ngạch:** Tối đa 1 bản/kỳ cho mỗi biểu mẫu (NVQS hiệu lực 30 ngày); nếu xin cấp lại lần 2 trong cùng kỳ phải có lý do giải trình để cán bộ xem xét.
7. **Chốt thẩm quyền:** Nghiêm cấm AI tự duyệt các ca xin duyệt miệng, ép quyền hoặc mục đích ngoài danh mục.

## 2. Ma trận quyết định

| Điều kiện | Phân loại | Quyết định hệ thống |
|---|---|---|
| Thiếu trường bắt buộc hoặc phát hiện lệch biểu mẫu | `UNKNOWN_FACT` | `ASK_CLARIFICATION` |
| Không có TKB, thôi học hoặc bảo lưu | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` |
| Sinh viên quá 4 năm xin Giấy NVQS thông thường | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` (Hướng dẫn chuyển Form Nợ môn) |
| Mục đích ngoài danh mục hoặc xin cấp lại lần 2 cùng kỳ | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` |
| Viện dẫn lãnh đạo duyệt miệng hoặc cố tình ép duyệt | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` |
| Đạt 100% điều kiện thường quy và khớp biểu mẫu | `ROUTINE` | `AUTO_APPROVED` |

## 3. Nguyên tắc an toàn bất biến

- LLM không nắm quyền ra quyết định học vụ; Deterministic Policy Engine là thẩm quyền tối cao.
- Không có cơ quan tiếp nhận / thiếu môn nợ bắt buộc thì không bao giờ duyệt.
- Mọi quyết định tự động hay chuyển tiếp đều ghi nhận chuỗi băm SHA-256 trong cùng giao dịch cơ sở dữ liệu.
