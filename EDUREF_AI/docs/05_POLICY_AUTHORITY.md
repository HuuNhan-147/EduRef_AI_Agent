# 05. Policy Và Ranh Giới Thẩm Quyền (Authority Boundary)

> **Policy version:** `STUDENT_CONFIRMATION_V2.0.0`
> **Workflow:** `STUDENT_CONFIRMATION` (Hỗ trợ 5 biểu mẫu học vụ thực tế HUTECH)

## 1. Các lớp kiểm soát quy chế (Multi-Layer Verification)

1. **Chốt ý định & Khớp biểu mẫu:** Nhận diện đúng biểu mẫu (`formCode`), đối soát chéo để phát hiện lệch biểu mẫu giữa form đang mở và nội dung yêu cầu (`detectCrossFormMismatch`).
2. **Chốt dữ kiện pháp lý:** Kiểm tra đầy đủ cơ quan tiếp nhận (`recipientAgency`), địa chỉ thường trú 4 cấp Title Case (`permanentAddress`), danh sách môn nợ (`debtCourses` với Form nợ môn).
3. **Chốt trạng thái học vụ đặc biệt (Bảo lưu & Thôi học):** Sinh viên thôi học (`DROPPED`) hoặc đang bảo lưu (`SUSPENDED`) bị **từ chối ngay lập tức** (`REJECTED_POLICY`), tuyệt đối không bypass vì bất kỳ lý do nào và không chuyển sang biểu mẫu nợ môn; hướng dẫn gặp trực tiếp CTSV.
4. **Chốt thời hạn đào tạo & Tiến độ (Chuẩn 150 tín chỉ):**
   - Sinh viên trong thời hạn 4 năm chuẩn: Áp dụng quy chế thông thường.
   - Sinh viên quá 4 năm VÀ còn nợ môn (< 150 tín chỉ): Ép chuyển sang Biểu mẫu Nợ môn (`COURSE_DEBT`) kèm danh sách môn nợ.
   - Sinh viên quá 4 năm NHƯNG đã hoàn thành đủ khối lượng ($\ge 150$ tín chỉ hoặc tốt nghiệp): **Vượt thẩm quyền AI** (`BEYOND_AUTHORITY`), đóng gói Context Capsule chuyển tiếp lên Cán bộ CTSV xem xét (`ESCALATE_TO_STAFF`).
5. **Chốt hoạt động học tập kỳ hiện tại:**
   - Có TKB / đăng ký môn kỳ này (`hasSchedule === true`, `enrolledCredits > 0`): Đạt chuẩn.
   - Chưa có TKB kỳ này: Nếu có lý do giải trình cần gấp $\rightarrow$ Chuyển tiếp Cán bộ (`ESCALATE_TO_STAFF`); nếu không $\rightarrow$ Từ chối quy chế (`REJECTED_POLICY`).
6. **Chính sách tài chính:** Nhà trường hỗ trợ tối đa, không ràng buộc nợ học phí để chặn cấp giấy xác nhận (chỉ cần điều kiện có môn học / thời khóa biểu).
7. **Chốt hạn ngạch & Trùng lặp:** Tối đa 1 bản/kỳ cho mỗi biểu mẫu (NVQS hiệu lực 30 ngày); nếu xin cấp lại lần 2 trong cùng kỳ:
   - Chưa có lý do giải trình $\rightarrow$ Hỏi lại (`ASK_CLARIFICATION`).
   - Có lý do chính đáng $\rightarrow$ Đóng gói chuyển tiếp Cán bộ CTSV (`ESCALATE_TO_STAFF`).
8. **Chốt thẩm quyền:** Nghiêm cấm AI tự duyệt các ca xin duyệt miệng, ép quyền hoặc mục đích ngoài danh mục.

## 2. Ma trận quyết định

| Điều kiện | Phân loại | Quyết định hệ thống |
|---|---|---|
| Thiếu trường bắt buộc hoặc phát hiện lệch biểu mẫu / Cấp lần 2 chưa có lý do | `UNKNOWN_FACT` | `ASK_CLARIFICATION` |
| Sinh viên bảo lưu (`SUSPENDED`) hoặc thôi học (`DROPPED`) | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` (Chặn đứng lập tức, không bypass) |
| Không có TKB kỳ này (không có lý do cần gấp) | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` |
| Sinh viên quá 4 năm xin Giấy NVQS/XNSV thông thường | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` (Hướng dẫn chuyển Form Nợ môn) |
| Chưa có TKB kỳ này nhưng có lý do cần gấp | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` |
| Mục đích ngoài danh mục hoặc xin cấp lại lần 2 cùng kỳ có lý do chính đáng | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` |
| Sinh viên quá 4 năm đã hoàn thành $\ge 150$ tín chỉ tốt nghiệp | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` |
| Viện dẫn lãnh đạo duyệt miệng hoặc cố tình ép duyệt | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` |
| Đạt 100% điều kiện thường quy và khớp biểu mẫu | `ROUTINE` | `AUTO_APPROVED` |

## 3. Nguyên tắc an toàn bất biến

- LLM không nắm quyền ra quyết định học vụ; Deterministic Policy Engine là thẩm quyền tối cao.
- Không có cơ quan tiếp nhận / thiếu môn nợ bắt buộc thì không bao giờ duyệt.
- Mọi quyết định tự động hay chuyển tiếp đều ghi nhận chuỗi băm SHA-256 trong cùng giao dịch cơ sở dữ liệu.
