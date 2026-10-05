# Đặc tả tác tử EduRef AI

## Phạm vi MVP

MVP Track A chỉ lấy `STUDENT_CONFIRMATION` — cấp giấy xác nhận sinh viên — làm quy trình chuẩn để chứng minh bounded autonomy. Các thủ tục khác là phần mở rộng, không được dùng để thay thế bộ Verify bắt buộc.

## Phân công giữa LLM và policy engine

- LLM hiểu câu chữ, trích xuất mục đích và điều phối tool.
- Database cung cấp trạng thái sinh viên và nợ học phí.
- `StudentConfirmationDecisionService` là nguồn chân lý quyết định.
- `PetitionWorkflowCore` thực thi state transition, audit và escalation.
- LLM không được tự công bố approved/escalated nếu tool backend chưa trả quyết định đó.

## Contract quyết định

| Classification | Decision | Ý nghĩa |
|---|---|---|
| `ROUTINE` | `AUTO_APPROVED` | Policy cho phép và đủ dữ kiện |
| `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` | Policy có điều cấm/điều kiện rõ ràng |
| `UNKNOWN_FACT` | `ASK_CLARIFICATION` | Thiếu mục đích; hỏi người dùng |
| `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` | Policy chưa bao phủ; không tự cho phép/từ chối |
| `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` | Cần con người xác minh ngoại lệ/quyền hạn |

Mọi escalation phải có `actionableQuestion` có thể trả lời trực tiếp.

## Bộ dữ liệu 15 ca

Tập thực thi nằm tại `backend/fixtures/trackAVerifyCases.js` và bao phủ:

- routine: vé xe buýt, học bổng, vay vốn, nghĩa vụ quân sự, visa, hồ sơ học tập;
- unknown fact: thiếu/rỗng mục đích;
- explicit deny: thôi học, đình chỉ, nợ vượt 10 triệu;
- outside policy: mục đích chưa nằm trong danh mục;
- beyond authority: yêu cầu `forceApprove` hoặc phê duyệt miệng.

Tập 15 ca là regression suite. Chỉ số Sprint 2 phải đo trên một tập độc lập có nhãn; không dùng chính regression suite để tuyên bố độ chính xác ngoài mẫu.

## Verify

- `POST /api/agent/verify-general`: 4 ca tổng quát.
- `POST /api/agent/verify-90s`: 5 ca Track A, đúng 3 auto và 2 escalation.
- `POST /api/agent/verify-custom-prompt`: ca mới do giám khảo nhập.

Giao diện chỉ hiển thị actual result, timestamp và SHA sau khi backend thực thi.

## Bất biến

1. Không purpose → không auto-approve.
2. Outside policy → không tự reject.
3. Ca bị gắn cờ → không khẳng định kết quả đã đạt.
4. `WAITING_STUDENT` → cán bộ không thể duyệt.
5. Chứng từ mới → `PENDING` cho đến khi có kiểm chứng.
6. Audit lỗi → quyết định cuối không được công bố thành công.
7. Danh tính REST/Socket lấy từ JWT và database, không tin payload của client.

Chi tiết policy: `docs/14_TRACK_A_POLICY.md`. Kịch bản demo: `RUNBOOK.md`.
