# Feature Inventory - Final Sprint 2

> **Nguồn chân lý:** source hiện tại và policy `STUDENT_CONFIRMATION_V1.0.0`.
> Phạm vi bản chung kết chỉ gồm quy trình Cấp Giấy Xác Nhận Sinh Viên.

## Tính năng đang vận hành

| Nhóm | Tính năng | Bằng chứng trong source |
|---|---|---|
| Auth | Phiên demo và JWT | `authRoutes.js`, `authController.js` |
| Verify | Chạy 5 ca Track A bằng một nút | `VerifyHarnessPage.jsx`, `/api/agent/verify-90s` |
| Custom case | BGK nhập ca mới bằng ngôn ngữ tự nhiên | `VerifyHarnessPage.jsx`, `/api/agent/verify-custom-prompt` |
| Policy | Routine, unknown fact, policy deny, outside policy, beyond authority | `StudentConfirmationDecisionService.js` |
| Workflow | Kiểm tra hồ sơ, cấp mã, hỏi bổ sung, escalation | `PetitionWorkflowCore.js`, `StudentConfirmationHandler.js` |
| HITL | Cán bộ xem, duyệt, từ chối, rollback | `StaffEscalationPage.jsx`, `AcademicWorkflowService.js` |
| Audit | Hash chain SHA-256 và kiểm tra toàn vẹn | `AuditLogService.js`, `AuditExplorerPage.jsx` |
| Realtime | Console theo dõi tiến trình xử lý | `Socket.IO`, `LiveTerminalConsole.jsx` |

## Hợp đồng quyết định

| Phân loại | Kết quả |
|---|---|
| `ROUTINE` | `AUTO_APPROVED` |
| `UNKNOWN_FACT` | `ASK_CLARIFICATION` với một câu hỏi cụ thể |
| `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` và lý do |
| `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` |
| `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF`, không bypass |

## Ngoài phạm vi bản nộp

- Không có workflow độc lập cho xét tốt nghiệp, vay vốn hoặc hoãn nghĩa vụ.
- Không có RAG, VectorDB, embedding hoặc Redis runtime.
- Không dùng LLM để quyết định phê duyệt; policy backend là lớp quyết định cuối.
- Các tài liệu lịch sử có mô tả handler cũ chỉ dùng để tham khảo, không đại diện cho sản phẩm Sprint 2.
