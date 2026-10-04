# Policy chuẩn — Giấy xác nhận sinh viên

Policy version: `STUDENT_CONFIRMATION_V1.0.0`

Đây là quy trình hẹp được chọn cho Track A. Nguồn chân lý thực thi là `backend/services/StudentConfirmationDecisionService.js`.

## Dữ kiện và phạm vi

- Danh tính, trạng thái sinh viên và nợ học phí lấy từ cơ sở dữ liệu theo phiên đã xác thực.
- Người dùng bắt buộc nêu mục đích sử dụng giấy.
- Mục đích thường quy: vé xe buýt, học bổng, vay vốn, nghĩa vụ quân sự, visa và bổ sung hồ sơ học tập.
- Sinh viên phải ở trạng thái `ACTIVE` và nợ học phí không vượt 10.000.000 VNĐ.

## Bảng quyết định

| Điều kiện | Phân loại | Hành động |
|---|---|---|
| Thiếu mục đích | `UNKNOWN_FACT` | `ASK_CLARIFICATION` với câu hỏi cụ thể |
| Trạng thái không ACTIVE hoặc nợ vượt ngưỡng | `ROUTINE_POLICY_DENY` | Gắn cờ và `ESCALATE_TO_STAFF` để cán bộ quyết định |
| Mục đích không nằm trong danh mục | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` với câu hỏi hành động |
| Yêu cầu bỏ qua quy định/phê duyệt miệng | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` với câu hỏi xác minh |
| Đủ dữ kiện, đúng policy, mục đích thường quy | `ROUTINE` | `ESCALATE_TO_STAFF` kèm hồ sơ đã chuẩn bị |

`OUTSIDE_POLICY` không đồng nghĩa với vi phạm policy. Tác tử không được tự từ chối hoặc tự cho phép trường hợp policy chưa bao phủ.

## Bất biến an toàn

- Không có mục đích thì không duyệt.
- AI không tự phê duyệt hoặc từ chối hồ sơ; mọi quyết định cuối cùng thuộc về cán bộ có thẩm quyền.
- Ca bị gắn cờ không được công bố là đã đạt hoặc bị từ chối.
- Hồ sơ `WAITING_STUDENT` không thể được cán bộ duyệt tắt.
- Chỉ hồ sơ `ESCALATED` mới nhận quyết định của con người.
- Quyết định của cán bộ và audit hash được ghi trong cùng transaction.
- Chứng từ mới luôn bắt đầu ở `PENDING`, không tự mang nhãn `VERIFIED`.
