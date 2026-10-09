# Feature Inventory - Production Final Release

> **Nguồn chân lý:** Mã nguồn hiện tại và Policy `STUDENT_CONFIRMATION_V2.0.0`.
> Phạm vi: Quy trình Cấp Giấy Xác Nhận Sinh Viên bao hàm toàn diện 5 Biểu mẫu Học vụ Thực tế HUTECH.

## 1. Tính năng đang vận hành (Active Features)

| Nhóm | Tính năng | Chi tiết kỹ thuật & Bằng chứng trong source |
|---|---|---|
| **Form Suite** | 5 Biểu mẫu Học vụ Thực tế HUTECH | Hỗ trợ chuyên biệt `TAX_DEDUCTION`, `BANK_LOAN`, `MILITARY_DEFERMENT`, `COURSE_DEBT`, `GENERAL_CONFIRMATION` trong `StudentConfirmationDecisionService.js` |
| **Agent Guidance** | Phát hiện Lệch Form & Hướng dẫn Kép | Tự động phát hiện khi sinh viên mở form này nhưng chat xin giấy khác (`detectCrossFormMismatch`), hướng dẫn 2 cách: điền form trái hoặc chat trực tiếp (`PromptEngine.js`, `StudentConfirmationHandler.js`) |
| **Academic Guard** | Thẩm định TKB & Tiến độ 4 năm | Kiểm tra điều kiện có lịch học (`hasSchedule === true`), nợ học phí $\le 10$M, chuyển hướng sinh viên quá 4 năm sang biểu mẫu nợ môn (`evaluateStudentConfirmation`) |
| **Auth** | Phiên demo và JWT | Chuyển đổi nhanh 5 tài khoản sinh viên và 2 tài khoản cán bộ qua `authRoutes.js`, `authController.js` |
| **Verify** | Chạy 5 ca Track A & 15 test suites | Bấm 1 nút chạy 5 ca chuẩn tại `VerifyHarnessPage.jsx`, kiểm thử tự động 15 test suites pass 100% qua `cross-form-mismatch.test.js`, `trackA-policy.test.js` |
| **Custom Case** | Giám khảo nhập ca tự do | Hỗ trợ kiểm thử NLU với prompt tùy ý tại `VerifyHarnessPage.jsx`, `/api/agent/verify-custom-prompt` |
| **Workflow** | Vòng đời đơn & Mã công văn | Cấp mã công văn lưu sổ `XNSV-XXXXXX`, ghi nhận cơ sở nhận bản cứng tại CTSV A-01.01 hoặc E1-01.08 (`BasePetitionHandler.js`, `StudentConfirmationHandler.js`) |
| **HITL** | Cán bộ xem, duyệt ngoại lệ, từ chối, rollback | Giao diện hàng đợi 1-Click tại `StaffEscalationPage.jsx`, `AcademicWorkflowService.js` |
| **Audit** | Sổ cái Hash Chain SHA-256 | Chuỗi băm liên kết bất biến có Mutex chống nghẽn tại `AuditLogService.js`, `AuditExplorerPage.jsx` |
| **Realtime** | Live Terminal Console | Bắn log thời gian thực 3 chốt kiểm soát qua Socket.IO tại `LiveTerminalConsole.jsx` |

## 2. Hợp đồng quyết định (Decision Contract)

| Phân loại | Quyết định hệ thống | Hành động tương ứng |
|---|---|---|
| `ROUTINE` | `AUTO_APPROVED` | Tự động phê duyệt trong $< 1.0$s, cấp mã công văn `XNSV-XXXXXX` |
| `UNKNOWN_FACT` | `ASK_CLARIFICATION` | Dừng xử lý, hướng dẫn 2 cách: điền form bên trái hoặc chat trực tiếp |
| `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` | Từ chối theo quy chế rõ ràng (thôi học, nợ học phí, quá 4 năm chưa đổi form nợ môn) |
| `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` | Chuyển Chuyên viên PĐT/CTSV kèm Context Capsule và lý do giải trình |
| `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` | Chặn đứng hành vi ép duyệt/vượt trần, chuyển Cán bộ xác minh |

## 3. Ngoài phạm vi bản nộp

- Không dùng QR server của bên thứ ba để đảm bảo tính pháp lý (Nhà trường cấp bản cứng có chữ ký sống và mộc đỏ tại Phòng CTSV).
- Không dùng LLM để tự tiện phán quyết; Deterministic Policy Engine nắm quyền quyết định cuối cùng.
