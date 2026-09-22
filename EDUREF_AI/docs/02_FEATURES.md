# 02. DANH MỤC CHỨC NĂNG HỆ THỐNG (FEATURE INVENTORY)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Đối soát:** Mã nguồn thực tế tại Frontend và Backend

---

## 1. BẢNG TỔNG HỢP TRẠNG THÁI TÍNH NĂNG THỰC TẾ

| Nhóm | Chức năng | Mô tả mục đích | Frontend | Backend | AI Model | Database | Trạng thái thực tế |
|---|---|---|---|---|---|---|---|
| **Auth** | **1-Click Role Switcher** | Chuyển đổi nhanh 5 tài khoản allowlist khi `ALLOW_DEMO_ROLE_SWITCH=true`; frontend không chứa mật khẩu cán bộ | Có (`TopNavbar.jsx`) | Có (`/api/auth/demo-login`) | Không | Có (`Student`, `User`) | ✅ **Hoàn thành 100%** |
| **Student** | **Khung chat Trợ lý AI (ReAct Chat)** | Hội thoại tự nhiên hỏi đáp, nộp đơn, thẩm định đa bước có streaming SSE | Có (`StudentWorkspacePage.jsx`) | Có (`server.js`, `AgentOrchestrator.js`) | Có (Gemini Flash Lite) | Có (`StudentRequest`) | ✅ **Hoàn thành 100%** |
| **Student** | **Biểu mẫu động nộp đơn (Modal)** | Điền thông tin chuẩn hóa cho Giấy XNSV và Đơn xét tốt nghiệp | Có (`DynamicPetitionModal.jsx`) | Có (`POST /api/petitions`) | Tùy chọn | Có (`StudentRequest`, `RequestDocument`) | ✅ **Hoàn thành 100%** |
| **Student** | **Theo dõi đơn cá nhân (My Petitions)** | Xem danh sách hồ sơ cá nhân, tiến trình FSM, mã chứng thực và mã QR | Có (`MyPetitionsPage.jsx`) | Có (`GET /api/petitions`) | Không | Có (`StudentRequest`) | ✅ **Hoàn thành 100%** |
| **Student** | **Chuẩn hóa tiếng lóng học vụ** | Tự động giải nghĩa các từ viết tắt ("xnsv", "hk", "đk", "gpa") | Tự động | Có (`ContextResolver.js`) | Regex Heuristic | Không | ✅ **Hoàn thành 100%** |
| **Decision** | **Chốt 1: Thẩm định Điều kiện (Requirements)** | Kiểm tra đủ trường bắt buộc (mục đích, SĐT, nơi sinh, chứng chỉ) | Có | Có (`checkRequirements`) | Có (Prompt) | Có (`Requirement`) | ✅ **Hoàn thành 100%** |
| **Decision** | **Chốt 2: Thẩm định Quy chế (Policies)** | Kiểm tra sinh viên ACTIVE, nợ phí $\le$ 10M, GPA $\ge$ 2.0 | Có | Có (`AcademicPolicyEngine.js`) | Không | Có (`Policy`) | ✅ **Hoàn thành 100%** |
| **Decision** | **Chốt 3: Phân cấp Thẩm quyền (Authority)** | Chặn AI tự duyệt đơn cấp Khoa/Trường, ép đơn tốt nghiệp chuyển Lãnh đạo | Có | Có (`checkAuthority`) | Không | Có (`AuthorityRule`) | ✅ **Hoàn thành 100%** |
| **Decision** | **Chốt 4: Tự động phê duyệt thường quy** | Cấp mã số ST-XXXXXX, mã QR và SHA-256; thời gian thực tế được ghi theo từng lần chạy | Có | Có (`processRequest`) | Không | Có | ✅ **Hoàn thành 100%** |
| **Vision** | **Giám định Đa phương thức (Multimodal Vision)** | Bóc tách Số hiệu, Số vào sổ trên ảnh scan văn bằng tốt nghiệp | Có (Upload/Preview) | Có (`CertificateVisionService.js`) | Có (Gemini 2.0 Flash Vision) | Có (`RequestDocument`) | ✅ **Hoàn thành 100%** |
| **Vision** | **Đối soát chéo Text vs Ảnh (Cross-Check)** | Bắt lỗi sai lệch giữa số gõ trên form và số trên ảnh scan văn bằng | Có (Báo lỗi đỏ) | Có (`GraduationAssessmentHandler.js`) | Có | Có | ✅ **Hoàn thành 100%** |
| **HITL** | **Đóng gói Context Capsule** | Đóng gói lý do, hồ sơ và Actionable Question cho người duyệt | Có (`StaffEscalationPage.jsx`) | Có (`contextCapsule` JSONB) | Heuristic | Có (`StudentRequest.contextCapsule`) | ✅ **Hoàn thành 100%** |
| **HITL** | **Cán bộ phê duyệt / Từ chối (Staff Review)** | Cán bộ duyệt đơn Escalate, nhập ghi chú chỉ đạo và ký điện tử | Có (`StaffEscalationPage.jsx`) | Có (`/api/petitions/:id/approve`) | Không | Có | ✅ **Hoàn thành 100%** |
| **HITL** | **Can thiệp dừng khẩn cấp (Rollback/Revoke)** | Thu hồi mã chứng thực số, vô hiệu mã QR khi phát hiện sai phạm | Có (Nút Can thiệp) | Có (`AcademicWorkflowService.rollbackRequest`) | Không | Có | ✅ **Hoàn thành 100%** |
| **Audit** | **Nhật ký băm SHA-256 (Hash Chain)** | Chuỗi khối kiểm toán bất biến nối tiếp bảo vệ trách nhiệm giải trình | Có (`AuditExplorerPage.jsx`) | Có (`AuditLogService.js`) | Không | Có (`AuditLog`) | ✅ **Hoàn thành 100%** |
| **Audit** | **Thẩm định chuỗi khối (Verify Entire Chain)** | Tự động quét từ Genesis Block đến khối mới nhất tìm mắt xích đứt | Có (`AuditExplorerPage.jsx`) | Có (`GET /api/audit/verify-chain`) | Không | Có (`AuditLog`) | ✅ **Hoàn thành 100%** |
| **Testing** | **Cockpit Verify Harness Dashboard (90s)** | Chạy 5 Test Cases chuẩn Track 2 Option A trong 1 màn hình không cuộn | Có (`VerifyHarnessPage.jsx`) | Có (`/api/agent/verify-90s`) | Có | Có | ✅ **Hoàn thành 100%** |
| **Observability** | **Live Terminal Console** | Cửa sổ dòng lệnh theo dõi luồng suy luận AI và Tool Call thời gian thực | Có (`LiveTerminalConsole.jsx`) | Có (`server.js`, Socket.IO) | Có | Buffer RAM | ✅ **Hoàn thành 100%** |

---

## 2. CHI TIẾT 2 THỦ TỤC HỌC VỤ CHUẨN ĐÃ NẠP DỮ LIỆU

### 1. Thủ tục 1: Giấy Xác Nhận Sinh Viên (`STUDENT_CONFIRMATION`)
- **Phân loại:** Thủ tục thường quy (Routine Petition).
- **Thẩm quyền:** Tác tử AI được phép tự động phê duyệt (`AUTO_APPROVE`).
- **Ràng buộc đầu vào:** Bắt buộc phải có `purpose` (Mục đích sử dụng: vay vốn, nghĩa vụ quân sự, làm vé xe buýt).
- **Quy chế kiểm tra:**
  - Sinh viên phải đang theo học hợp lệ (`status === 'ACTIVE'`).
  - Không nợ học phí quá hạn trần 10.000.000 VNĐ.
- **Thời gian xử lý:** Trung bình $20ms - 80ms$ (cấp mã chứng thực ST-XXXXXX và mã QR ngay lập tức).

### 2. Thủ tục 2: Đơn Đề Nghị Xét Tốt Nghiệp (`GRADUATION_ASSESSMENT`)
- **Phân loại:** Thủ tục thẩm quyền cao (High-Authority Petition).
- **Thẩm quyền:** Bắt buộc Trưởng phòng Đào tạo & Hội đồng xét tốt nghiệp (`DEAN_APPROVAL`). Tác tử AI **không được tự duyệt**.
- **Ràng buộc đầu vào:**
  - Số điện thoại liên hệ chính xác ($\ge 8$ số).
  - Nơi sinh theo giấy khai sinh.
  - Lý do đề nghị xét tốt nghiệp.
  - Danh sách chứng chỉ chuẩn đầu ra (Tiếng Anh B1, Kỹ năng nhóm) kèm Số hiệu và Số vào sổ đúng quy cách HUTECH.
  - File scan ảnh chứng chỉ rõ nét, không bị bôi đen hoặc che khuất số hiệu.
- **Quy chế kiểm tra:**
  - Sinh viên đang theo học (`ACTIVE`).
  - Hoàn thành 100% học phí (`tuitionDebt === 0 VNĐ`).
  - Điểm trung bình tích lũy đạt chuẩn tốt nghiệp (`GPA >= 2.00`).
- **Hành động của AI:** Đóng gói Context Capsule và chuyển tiếp lên Hàng đợi xét duyệt của Trưởng khoa (`ESCALATE_TO_DEAN`).
