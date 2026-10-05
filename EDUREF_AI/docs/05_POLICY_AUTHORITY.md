# 05. Policy Và Thẩm Quyền

> **Policy version:** `STUDENT_CONFIRMATION_V1.0.0`
> **Workflow:** `STUDENT_CONFIRMATION`

## Các lớp kiểm tra

1. **Dữ kiện:** phải có mục đích sử dụng; nếu thiếu, hỏi bổ sung.
2. **Danh tính:** hồ sơ sinh viên phải tồn tại và có trạng thái `ACTIVE`.
3. **Nghĩa vụ tài chính:** hồ sơ có nợ học phí bị từ chối theo policy hiện hành.
4. **Mục đích:** chỉ các mục đích có trong allowlist mới được tự động xử lý.
5. **Thẩm quyền:** yêu cầu ngoại lệ, bypass hoặc ngoài danh mục phải chuyển cán bộ.

## Ma trận quyết định

| Điều kiện | Classification | Decision |
|---|---|---|
| Thiếu mục đích hoặc dữ kiện bắt buộc | `UNKNOWN_FACT` | `ASK_CLARIFICATION` |
| Sinh viên không hợp lệ hoặc có nợ theo policy | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` |
| Mục đích chưa được policy bao phủ | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` |
| Có yêu cầu ép duyệt/bypass/ngoại lệ | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` |
| Đủ dữ kiện, đúng policy, trong thẩm quyền | `ROUTINE` | `AUTO_APPROVED` |

## Nguyên tắc an toàn

- LLM không được tự tạo kết quả nghiệp vụ.
- Backend luôn kiểm tra lại quyết định trước khi cấp mã xác nhận.
- `actionableQuestion` phải giúp cán bộ ra quyết định mà không cần đoán ý định của sinh viên.
- Mọi quyết định cuối phải có audit log.
