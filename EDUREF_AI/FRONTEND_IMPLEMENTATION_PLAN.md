# EDUREF AI FRONTEND IMPLEMENTATION PLAN
## Kiến Trúc & Kế Hoạch Triển Khai Giao Diện Cổng Dịch Vụ Học Vụ Tự Hành (The Academic Escalation Referee)

> Tài liệu kế hoạch lịch sử. Frontend hiện đã nằm trong `EDUREF_AI/frontend`; Verify dùng `/verify-general`, `/verify-90s` và `/verify-custom-prompt`. Kết quả thực tế không được điền sẵn trước khi chạy.

> **Dự án:** EduRef AI — Autonomous Student Petition & Academic Escalation Referee  
> **Cuộc thi:** MLAI Hackathon 2026 — Track 2 Option A: The Escalation Referee  
> **Vai trò:** Senior Frontend Architect + Product Designer + React Engineer  
> **Nguyên tắc thiết kế tối cao:** "University Administrative Service Platform" — Chuẩn mực, chuyên nghiệp, thông tin minh bạch, không phong cách "AI futuristic" hay viễn tưởng sci-fi.

---

## 1. EXISTING FRONTEND AUDIT (KIỂM TOÁN FRONTEND HIỆN TẠI)

**Mã nguồn đối chiếu:** `d:\MLAI_HACKATHON\equipment_agent\DA_CNPM\DA_IELS_NEW\frontend`

### 1.1. Kiến trúc hiện tại
- **Công nghệ nền tảng:** React 18.3.1 + Vite 5.2.11 + TailwindCSS 3.4.3 + Lucide Icons.
- **Giao thức kết nối:** 
  - Axios client (`src/api.js`) trỏ cố định vào `http://localhost:5000/api`.
  - Socket.IO client (`socket.io-client 4.8.3`) kết nối `http://localhost:5000`.
- **Cơ chế xác thực:** Tự động đính kèm `Bearer Token` qua `localStorage.getItem('iels_token')`, hỗ trợ hàm `switchRoleAuth(role)`.

### 1.2. Thành phần TÁI SỬ DỤNG ĐƯỢC (Keep & Reuse)
| File / Module | Khả năng tái sử dụng | Kế hoạch điều chỉnh |
|---|---|---|
| `src/components/MarkdownText.jsx` | **100% Giữ nguyên** | Dùng để hiển thị văn bản trả lời của AI và lý do quy chế gãy gọn, có cấu trúc. |
| `src/webmcp/WebMCPManager.js` | **Tái sử dụng lõi** | Giữ cơ chế bắt `execute_webmcp_tool` và phản hồi `webmcp_tool_result_${id}` qua Socket.IO. Đổi danh mục tool thiết bị sang tool học vụ. |
| `src/components/Navbar.jsx` | **Tái cấu trúc (Refactor)** | Giữ logic chuyển đổi vai trò 1-Click (`RoleSwitcher`), thay đổi nhãn từ "Employee/Storekeeper" sang "Sinh viên An (2110001) / Cán bộ Nghĩa (STAFF) / Trưởng phòng Dũng (DEAN)". |
| `src/components/AuditTrailView.jsx` | **Tái cấu trúc (Refactor)** | Tái sử dụng logic hiển thị Live Terminal (filter, auto-scroll, copy), nhưng nâng cấp thành 3 view (Bảng, Timeline, Terminal) và bổ sung nút kiểm tra toàn vẹn chuỗi khối SHA-256. |

### 1.3. Thành phần CẦN LOẠI BỎ (Remove)
- Toàn bộ components quản lý mượn trả thiết bị cơ học:
  - `BorrowModal.jsx`, `EquipmentCard.jsx`, `CategoryFilter.jsx`, `InventoryManager.jsx`, `LoanListView.jsx`, `MaintenanceManager.jsx`, `StatsHeader.jsx`.

### 1.4. Thành phần CẦN THIẾT KẾ MỚI HOÀN TOÀN (New)
1. **`StudentAssistantWorkspace.jsx`**: Bố cục 3 cột (Danh mục thủ tục học vụ $\rightarrow$ Hội thoại ReAct $\rightarrow$ Bảng trạng thái & Tóm tắt quyết định).
2. **`DynamicPetitionModal.jsx`**: Form biểu mẫu động đọc trực tiếp từ `requirements` của Backend API `/api/petitions/types`.
3. **`StaffEscalationHub.jsx`**: Hàng đợi chuyển tiếp hồ sơ vượt thẩm quyền, hiển thị **Context Capsule**, nút `[Duyệt]`, `[Từ chối]` (bắt buộc lý do), và `[Hoàn tác 1-chạm]`.
4. **`VerifyHarnessView.jsx`**: Màn hình benchmark tự hành chạy 5 Test Cases thật qua Backend + khung **Custom Verify** cho phép Ban Giám Khảo nhập prompt mới kiểm thử trực tiếp.
5. **`AuditExplorerView.jsx`**: Trình khám phá chuỗi kiểm toán bất biến, xem chi tiết 5W1H (Who, What, Why, Hash, Chain link).
6. **`RollbackModal.jsx`**: Popup can thiệp dừng và ghi đè hồ sơ, có cảnh báo vô hiệu hóa mã QR và yêu cầu nhập lý do.

---

## 2. BACKEND INTEGRATION MAP (ÁNH XẠ FRONTEND VỚI BACKEND API & SOCKET.IO)

| UI Màn hình / Component | API Endpoint / Socket Event | Backend Source Reference | Dữ liệu Input | Dữ liệu Output hiển thị |
|---|---|---|---|---|
| **Role Switcher Header** | `POST /api/auth/login`<br>`GET /api/auth/demo-accounts` | `authController.js:8`<br>`authController.js:103` | `{ studentCode }` hoặc `{ username, password }` | JWT Token, thông tin user (role, fullName, department) |
| **Catalog Loại Thủ Tục** | `GET /api/petitions/types` | `petitionRoutes.js:41` | None | 5 loại đơn, danh sách `requirements`, `policies`, `authorityRules` |
| **Khung Chat Sinh Viên** | Socket.IO `client_send_message`<br>Fallback: `POST /api/agent/chat` | `server.js:75`<br>`agentRoutes.js:11` | `{ message, studentCode, sessionId }` | Text streaming chunks, tool call, final reply |
| **Live Terminal Visualizer**| Socket.IO `agent_terminal_step` | `AgentTerminalLogger.js:11` | Lắng nghe event socket | `{ step, message, type, meta, timestamp }` |
| **Client WebMCP Execution** | Socket.IO `execute_webmcp_tool`<br>`webmcp_tool_result_${id}` | `WebMCPAdapter.js:49`<br>`server.js:75` | `{ executionId, toolName, args }` | Kết quả thực thi từ trình duyệt |
| **Bổ Sung Dữ Liệu (Resume)**| `POST /api/petitions/:id/resume` | `petitionRoutes.js:202`<br>`PetitionWorkflowCore.js:283` | `{ additionalData, newDocuments }` | Hồ sơ cập nhật, tự động chạy lại FSM |
| **Đính Kèm Chứng Từ** | `POST /api/petitions/:id/documents` | `petitionRoutes.js:172` | `{ documentType, fileName, fileUrl }` | Bản ghi chứng từ mới được gán vào đơn |
| **Staff Escalation Queue** | `GET /api/petitions?status=ESCALATED` | `petitionRoutes.js:9` | Query: `status=ESCALATED` | Danh sách đơn chờ duyệt kèm `contextCapsule` |
| **Cán Bộ Phê Duyệt** | `POST /api/petitions/:id/approve` | `petitionRoutes.js:102`<br>`AcademicWorkflowService.js:611` | Header: `Bearer Token`, Body: `{ note }` | Cập nhật `status: APPROVED`, mã QR cán bộ duyệt |
| **Cán Bộ Bác Bỏ** | `POST /api/petitions/:id/reject` | `petitionRoutes.js:124`<br>`AcademicWorkflowService.js:611` | Header: `Bearer Token`, Body: `{ reason }` | Cập nhật `status: REJECTED`, lý do từ chối |
| **Can Thiệp Dừng / Rollback** | `POST /api/petitions/:id/rollback` | `petitionRoutes.js:151`<br>`AcademicWorkflowService.js:677` | Header: `Bearer Token`, Body: `{ reason }` | Chuyển `CANCELLED`, thu hồi QR, hash mới |
| **Benchmark Verify 90s** | `POST /api/agent/verify-90s` | `agentRoutes.js:34`<br>`verifyTools.js:10` | None | Kết quả 5/5 Test Cases thực tế |
| **Custom Verify (Prompt Mới)**| `POST /api/agent/chat` | `agentRoutes.js:11`<br>`AgentOrchestrator.js:18` | `{ message, studentCode, sessionId }` | Trace thật, Tool thật, Quyết định thật từ Agent |
| **Khám Phá Audit Log** | `GET /api/audit/logs` | `auditRoutes.js:9`<br>`AuditLogService.js:109` | Query: `limit, action` | Danh sách bản ghi kiểm toán SHA-256 |
| **Xác Thực Chuỗi Khối** | `GET /api/audit/verify-chain` | `auditRoutes.js:22`<br>`AuditLogService.js:185` | None | `{ chainValid: true, totalBlocks, latestHash }` |

---

## 3. INFORMATION ARCHITECTURE (KIẾN TRÚC THÔNG TIN)

Ứng dụng sử dụng cấu trúc **Shell Workspace** với thanh điều hướng thích ứng theo vai trò (Adaptive Role Navigation):

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: EduRef AI  |  Trường ĐH Bách Khoa TP.HCM  |  1-Click Role Switcher  |  Live Status   │
├─────────────────┬───────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR         │ MAIN WORKSPACE CONTENT                                                    │
│                 │                                                                           │
│ [Sinh viên]     │ 1. Trợ lý Sinh viên (Student Assistant)                                   │
│ - Trợ lý AI     │    ├── Cột 1: Danh mục 5 thủ tục hành chính & Gợi ý AI                     │
│ - Đơn của tôi   │    ├── Cột 2: Khung hội thoại ReAct & Live Tool Execution                  │
│                 │    └── Cột 3: Trạng thái thẩm định (4 Gates) & Quyết định cuối            │
│ [Cán bộ / BGK]  │                                                                           │
│ - Escalation Hub│ 2. Escalation Hub (Hàng đợi Chuyển tiếp dành cho Cán bộ PĐT)               │
│ - Quản lý đơn   │    ├── Danh sách đơn cần duyệt                                             │
│                 │    └── Thẻ Context Capsule: Lý do vượt quyền + Nút [Duyệt] [Từ chối]       │
│ [Kiểm toán/BGK] │                                                                           │
│ - Verify 90s    │ 3. Verify Harness (Bộ chạy kiểm thử 90s & Custom Input cho Giám khảo)     │
│ - Audit Trail   │                                                                           │
│ - Terminal Live │ 4. Audit Explorer (Kiểm tra chuỗi băm SHA-256: Table / Timeline / Terminal)│
└─────────────────┴───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. USER FLOWS (7 LUỒNG NGƯỜI DÙNG CHUẨN XUYÊN SUỐT)

### Flow A: Sinh viên Chat Thường quy $\rightarrow$ `AUTO_APPROVED`
1. Sinh viên chọn hoặc gõ: *"Em xin giấy xác nhận sinh viên để làm vé tháng xe buýt"*.
2. Chat hiển thị live status: `Đang phân tích` $\rightarrow$ `Gọi get_student_profile` $\rightarrow$ `Kiểm tra requirements` $\rightarrow$ `Thẩm định policy` $\rightarrow$ `Xác nhận thẩm quyền`.
3. Decision Card bên phải chuyển xanh: **AUTO APPROVED** (Thời gian: ~250ms).
4. Khung chat render thẻ kết quả chứa **Mã đơn ST-XXXXXX**, **Mã QR chứng thực số**, và **Chữ ký SHA-256 Proof**.

### Flow B: Thiếu Dữ Kiện $\rightarrow$ `ASK` $\rightarrow$ Bổ sung $\rightarrow$ Resume $\rightarrow$ `AUTO_APPROVED`
1. Sinh viên gõ: *"Cho em xin giấy xác nhận sinh viên"*.
2. Agent phân tích $\rightarrow$ Chốt 1 phát hiện thiếu `purpose`.
3. Decision Card chuyển vàng: **WAITING STUDENT**.
4. Agent gửi câu hỏi gợi mở: *"Bạn cần giấy xác nhận cho mục đích nào (làm vé xe buýt, vay vốn ngân hàng hay nộp hồ sơ xin việc)?"*.
5. Sinh viên bấm vào nút gợi ý `[Làm vé xe buýt]` hoặc trả lời văn bản.
6. Frontend tự động gọi `POST /api/petitions/:id/resume` $\rightarrow$ Đơn kích hoạt lại FSM và chuyển thành **AUTO APPROVED**.

### Flow C: Vay Vốn NHCS $\rightarrow$ Yêu cầu Mẫu 01/NHCS $\rightarrow$ Upload $\rightarrow$ `AUTO_APPROVED`
1. Sinh viên gõ: *"Em xin xác nhận vay vốn ngân hàng chính sách"*.
2. Agent trả lời: *"Thủ tục vay vốn bắt buộc phải có Giấy xác nhận theo Mẫu 01/NHCS do Ngân hàng cấp. Vui lòng tải lên bản chụp mẫu này"*.
3. Khung chat hiển thị ô **Dropzone đính kèm Mẫu 01/NHCS**.
4. Sinh viên chọn file `Mau_01_NHCS.pdf` $\rightarrow$ Frontend gọi `POST /api/petitions/:id/documents` và `/resume`.
5. Agent tự động thẩm định và cấp mã chứng thực số.

### Flow D: Tạm Hoãn NVQS $\rightarrow$ `ESCALATE_TO_STAFF` $\rightarrow$ Cán bộ [Phê Duyệt]
1. Sinh viên nộp đơn tạm hoãn NVQS kèm ảnh Lệnh gọi quân sự địa phương.
2. Chốt 3 nhận diện: Thủ tục có giá trị pháp lý với Nhà nước $\rightarrow$ Vượt thẩm quyền AI.
3. Decision Card chuyển tím: **ESCALATED TO STAFF**.
4. Đơn xuất hiện trên **Staff Escalation Hub**.
5. Cán bộ PĐT (chuyển vai qua Role Switcher) mở đơn, xem **Context Capsule**.
6. Cán bộ bấm **`[✅ Duyệt Đơn]`** $\rightarrow$ Nhập ghi chú *"Đã đối chiếu lệnh gọi hợp lệ"* $\rightarrow$ Gọi API thật `POST /approve`.
7. Đơn chuyển `APPROVED`, sinh mã QR cán bộ duyệt; một block mới được ký băm SHA-256.

### Flow E: Hoãn Thi Y Tế $\rightarrow$ `ESCALATE_TO_STAFF` $\rightarrow$ Cán bộ [Từ Chối Đơn]
1. Sinh viên xin hoãn thi môn Giải tích 1 nhưng lý do ghi: *"Bận việc gia đình đi du lịch"*.
2. Hoặc sinh viên nộp đơn và cán bộ kiểm tra bệnh án không đạt chuẩn.
3. Cán bộ bấm **`[❌ Từ Chối Đơn]`** $\rightarrow$ Hệ thống mở Modal **bắt buộc nhập lý do từ chối**.
4. Cán bộ nhập lý do $\rightarrow$ Gọi API `POST /reject`.
5. Đơn chuyển `REJECTED`, xóa mã QR, ghi audit log `STAFF_REJECT_REQUEST`.

### Flow F: Can Thiệp Dừng Khẩn Cấp (Human Override / Rollback)
1. Giám khảo / Cán bộ kiểm tra phát hiện một đơn đã duyệt có dấu hiệu gian lận.
2. Bấm nút **`[↩ Hoàn Tác / Can Thiệp Ghi Đè]`** trên đơn.
3. Màn hình hiển thị Modal xác nhận: Nêu rõ hậu quả (vô hiệu hóa mã QR, hủy chứng nhận số, giữ nguyên vết lịch sử cũ, ghi block mới).
4. Cán bộ nhập lý do và bấm xác nhận $\rightarrow$ Gọi API `POST /rollback`.
5. Trạng thái đơn chuyển ngay thành `CANCELLED`, mã QR bị xóa; chuỗi băm bảo toàn 100% tính toàn vẹn.

### Flow G: Ban Giám Khảo Test Live (Verify 90s & Custom Input)
1. Giám khảo bấm vào Tab **Verify Harness**.
2. **Kịch bản G1 (5 Test Cases có sẵn):** Bấm `[⚡ Chạy Toàn Bộ 5 Ca Kiểm Thử]` $\rightarrow$ Frontend gọi `POST /api/agent/verify-90s` $\rightarrow$ Render kết quả từng ca với raw latency, expected decision, actual decision (5/5 PASS trong ~300ms).
3. **Kịch bản G2 (Nhập Input Mới Bất Kỳ):** Giám khảo nhập câu bất kỳ vào ô *"Nhập yêu cầu kiểm thử mới..."* (ví dụ: *"Tôi là sinh viên 2110003 nợ học phí xin cấp bảng điểm"*).
4. Bấm `[Chạy Tác Tử]` $\rightarrow$ Frontend gọi Agent thật $\rightarrow$ Hiển thị luồng ReAct thật, trích xuất thực thể, gọi tool thật và ra quyết định chính xác (`REJECTED_POLICY` do nợ học phí).

---

## 5. SCREEN INVENTORY (DANH MỤC MÀN HÌNH CHI TIẾT)

```text
src/
├── pages/
│   ├── StudentWorkspacePage.jsx    // Không gian làm việc nộp đơn của Sinh viên
│   ├── StaffEscalationPage.jsx     // Hàng đợi chuyển tiếp và thẩm định của Cán bộ
│   ├── MyPetitionsPage.jsx         // Danh sách hồ sơ cá nhân của sinh viên
│   ├── VerifyHarnessPage.jsx       // Bộ kiểm thử tự hành 90s & Custom Input cho BGK
│   └── AuditExplorerPage.jsx       // Trình khám phá chuỗi băm SHA-256 & Live Terminal
```

---

## 6. COMPONENT HIERARCHY (CÂY PHÂN CẤP COMPONENT)

```text
App
├── TopNavbar
│   ├── SystemBrand (Logo EduRef AI & Tên trường)
│   ├── RoleSwitcherDropdown (1-Click Switch: 3 Sinh viên, 2 Cán bộ)
│   └── SocketStatusIndicator (Chấm xanh/đỏ báo trạng thái kết nối realtime)
│
├── AppSidebar
│   ├── NavigationItems (Thay đổi mục theo vai trò Sinh viên hoặc Cán bộ)
│   └── QuickMetricsWidget (Số đơn chờ duyệt, tỷ lệ tự động hóa)
│
└── MainContentArea
    │
    ├── [Khi ở StudentWorkspacePage]
    │   ├── RequestCatalogSidebar (Danh mục 5 loại thủ tục, bấm mở form hoặc chat)
    │   ├── ChatContainer
    │   │   ├── MessageList
    │   │   │   ├── UserMessageBubble
    │   │   │   └── AgentMessageBubble
    │   │   │       ├── MarkdownRenderer (MarkdownText.jsx)
    │   │   │       ├── ToolExecutionBadge (Hiện tên tool, input, output khi gọi)
    │   │   │       └── PetitionResultCard (ST-XXXXXX, QR Code, SHA256 Proof)
    │   │   ├── InlineDropzone (Upload Mẫu 01/NHCS hoặc Lệnh gọi NVQS khi có yêu cầu)
    │   │   └── ChatInputBar (Textarea tự co giãn, nút gửi, phím tắt Enter)
    │   │
    │   └── DecisionSummarySidebar
    │       ├── GateCheckList (4 Chốt chặn: Requirements, Policies, Authority, Decision)
    │       ├── ActiveStudentMiniProfile (MSSV, Họ tên, Khoa, Trạng thái, Nợ phí)
    │       └── QuickActionButtons (Nút bấm nhanh các câu lệnh mẫu cho sinh viên)
    │
    ├── [Khi ở StaffEscalationPage]
    │   ├── EscalationFilterTabs (Chờ duyệt, Đã duyệt, Đã từ chối, Đã hoàn tác)
    │   ├── EscalationList (Danh sách các thẻ đơn cần duyệt)
    │   └── ContextCapsuleDetailPanel
    │       ├── StudentSummaryBox (GPA, trạng thái, nợ học phí)
    │       ├── EscalationReasonBox (Lý do vượt quyền, điều khoản quy định)
    │       ├── ActionableQuestionBox (Câu hỏi hành động trực diện cho cán bộ)
    │       ├── AttachedEvidenceViewer (Xem ảnh/file Mẫu 01 hoặc Lệnh gọi NVQS)
    │       └── StaffActionButtonsGroup
    │           ├── ApproveButton (Mở popup duyệt)
    │           ├── RejectButton (Mở modal bắt buộc nhập lý do)
    │           └── RollbackButton (Can thiệp dừng khẩn cấp)
    │
    ├── [Khi ở VerifyHarnessPage]
    │   ├── VerifyControlBar (Nút chạy 5 test cases, đồng hồ đếm ms, thanh tiến độ)
    │   ├── PredefinedTestCardsGrid (5 thẻ TC-01 đến TC-05 với trạng thái PASS/FAIL)
    │   │   └── TestDetailDrawer (Xem payload chi tiết: Prompt, Tool calls, Latency)
    │   └── CustomVerifySandbox (Ô nhập prompt tự do cho Ban Giám Khảo test live)
    │
    └── [Khi ở AuditExplorerPage]
        ├── AuditViewModeSelector (Tabs: [Bảng Dữ Liệu] [Dòng Thời Gian] [Live Terminal])
        ├── IntegrityBanner (Nút [⚡ Kiểm tra Chuỗi Khối SHA-256], kết quả toàn vẹn)
        ├── AuditFilterBar (Lọc theo Actor, Action, Decision, RequestCode)
        ├── AuditDataTable (Bảng các khối băm, có nút sao chép mã hash)
        ├── AuditDetailDrawer (Chi tiết 5W1H, Before/After Snapshot, Previous/Current Hash)
        └── LiveTerminalConsole (Giao diện console realtime bắt sự kiện từ Socket.IO)
```

---

## 7. STATE ARCHITECTURE (KIẾN TRÚC QUẢN LÝ TRẠNG THÁI)

Tách biệt thành các Custom Hooks chuyên trách, không dùng một Global Store cồng kềnh:

1. **`useAuth`**: Quản lý `currentUser`, `activeRole`, `jwtToken`, hàm `switchRole(role)`.
2. **`useChatAgent`**: Quản lý `messages`, `sessionId`, `isLoading`, `onSendMessage`, `onStreamChunk`.
3. **`usePetitions`**: Quản lý danh sách đơn cá nhân, đơn Escalated, hàm `fetchPetitions()`, `approvePetition()`, `rejectPetition()`, `rollbackPetition()`.
4. **`useVerifyHarness`**: Quản lý kết quả chạy 5 test cases `verifyResults`, `isRunning`, `customPrompt`, `customResult`.
5. **`useAuditLogs`**: Quản lý `logs`, `chainIntegrityStatus`, `fetchLogs()`, `verifyChain()`.
6. **`useTerminalTrace`**: Quản lý mảng logs streaming từ Socket.IO `agent_terminal_step`, filter theo bước.

---

## 8. REALTIME EVENT ARCHITECTURE (KIẾN TRÚC SỰ KIỆN THỜI GIAN THỰC)

```text
BACKEND (Port 5001)                                FRONTEND (Vite React)
────────────────────                               ──────────────────────
io.on('connection')                                 socket = io('http://localhost:5001')
socket.on('client_send_message')  ◄───────────────  socket.emit('client_send_message', payload)
socket.emit('agent_response_chunk') ─────────────►  setMessages(append chunk to last agent bubble)
socket.emit('agent_terminal_step')  ─────────────►  setTerminalLogs(prepend/append to live console)
socket.emit('agent_response_end')   ─────────────►  setMessages(finalize bubble with QR & Proof)
socket.emit('execute_webmcp_tool')  ─────────────►  webMcpManager.executeTool(toolName, args)
socket.on(`webmcp_tool_result_${id}`) ◄──────────  socket.emit(`webmcp_tool_result_${id}`, res)
```

---

## 9. TAILWIND DESIGN SYSTEM (HỆ THỐNG GIAO DIỆN HÀNH CHÍNH ĐẠI HỌC)

> **Tuyệt đối loại bỏ:** Neon, viền phát sáng (glow), cyberpunk, sci-fi robot, gradient chói lọi.  
> **Áp dụng:** Phông chữ chuẩn mực sư phạm, viền mỏng tinh tế, màu sắc chức năng rõ ràng.

### 9.1. Bảng màu Nhận diện (Institutional Palette)
- **Nền trang (Background):** `bg-slate-50` (Tone sáng công sở, thân thiện) kết hợp `bg-white` cho thẻ/bảng.
- **Màu thương hiệu (Primary / Institutional Blue):**
  - `bg-slate-900` / `text-slate-900`: Thanh Topbar và thanh Sidebar uy nghiêm, chuẩn mực.
  - `bg-blue-700` / `hover:bg-blue-800` / `text-blue-700`: Màu hành động chính (Primary Buttons, Links).
- **Màu Trạng thái Quyết định (Decision Tokens):**
  - 🟢 **AUTO / APPROVED (Thường quy / Hợp lệ):** `bg-emerald-50`, `text-emerald-700`, `border-emerald-200`, badge `bg-emerald-100`.
  - 🟡 **ASK / WAITING_STUDENT (Thiếu thông tin):** `bg-amber-50`, `text-amber-700`, `border-amber-200`, badge `bg-amber-100`.
  - 🟣 **ESCALATE / HIGH AUTHORITY (Chuyển tiếp):** `bg-indigo-50`, `text-indigo-700`, `border-indigo-200`, badge `bg-indigo-100`.
  - 🔴 **REJECT / OUT_OF_POLICY (Từ chối quy chế):** `bg-rose-50`, `text-rose-700`, `border-rose-200`, badge `bg-rose-100`.
  - ⚫ **CANCELLED / ROLLBACK (Đã hoàn tác / Thu hồi):** `bg-slate-100`, `text-slate-600`, `border-slate-300`.

### 9.2. Typography & Khoảng cách
- Font: Inter / Roboto / System Font.
- Tiêu đề: `text-sm font-semibold text-slate-900 tracking-tight`.
- Nội dung: `text-sm text-slate-700 leading-relaxed`.
- Bảng & Terminal: `font-mono text-xs`.

---

## 10. KẾ HOẠCH THỰC HIỆN TỪNG BƯỚC (PHASE-BY-PHASE IMPLEMENTATION PLAN)

Kế hoạch được chia thành **7 Phases độc lập**, triển khai tuần tự theo đúng quy trình kiểm soát rủi ro:

---

### PHASE 0: Khởi Tạo Dự Án & Cấu Trúc Nền Tảng (Scaffolding & Infrastructure)
- **Mục tiêu:** Khởi tạo `EDUREF_AI/frontend` độc lập, cấu hình Vite, TailwindCSS, Axios interceptor trỏ tới Backend port `5001`.
- **Files liên quan:**
  - `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`.
  - `src/main.jsx`, `src/index.css`.
  - `src/services/api.js` (Cấu hình baseURL: `http://localhost:5001/api`, Bearer interceptor).
  - `src/services/socket.js` (Kết nối `http://localhost:5001`).
- **Acceptance Criteria:**
  - `npm run dev` khởi chạy thành công tại port `5173`.
  - Gọi test `/health` của Backend port `5001` thành công 200 OK.
  - Kết nối Socket.IO thành công và log chấm xanh.

---

### PHASE 1: Shell Ứng Dụng & Bộ Chuyển Vai Trò 1-Chạm (Application Shell & Role Switcher)
- **Mục tiêu:** Xây dựng Topbar, Sidebar hành chính và thanh chuyển đổi vai trò (`1-Click Role Switcher`).
- **Files liên quan:**
  - `src/layouts/AppShell.jsx`
  - `src/components/common/TopNavbar.jsx`
  - `src/components/common/AppSidebar.jsx`
  - `src/hooks/useAuth.js`
- **Acceptance Criteria:**
  - Bấm chọn đổi vai giữa 3 Sinh viên (`2110001`, `2110002`, `2110003`) và 2 Cán bộ (`staff_daotao`, `dean_daotao`) tự động lấy JWT Token tương ứng.
  - Sidebar đổi mục điều hướng tương ứng khi chuyển từ Sinh viên sang Cán bộ.

---

### PHASE 2: Màn Hình Trợ Lý Sinh Viên (Student Assistant Workspace)
- **Mục tiêu:** Xây dựng giao diện chat ReAct 3 cột, hiển thị streaming text, tool badge và Decision Summary.
- **Files liên quan:**
  - `src/pages/StudentWorkspacePage.jsx`
  - `src/components/chat/ChatContainer.jsx`
  - `src/components/chat/MessageBubble.jsx`
  - `src/components/chat/DecisionSummaryCard.jsx`
  - `src/components/chat/ToolCallBadge.jsx`
  - `src/components/common/MarkdownRenderer.jsx`
- **Acceptance Criteria:**
  - Sinh viên gửi tin nhắn $\rightarrow$ nhận streaming chunk mượt mà không giật lag.
  - Khi Agent gọi Tool $\rightarrow$ hiển thị thẻ tên Tool + tham số bóc tách.
  - Sau khi duyệt $\rightarrow$ hiển thị mã đơn `ST-XXXXXX`, mã QR chứng thực và chữ ký SHA-256.

---

### PHASE 3: Biểu Mẫu Động & Bổ Sung Chứng Từ (Dynamic Form & Resume Upload)
- **Mục tiêu:** Cho phép sinh viên xem danh mục biểu mẫu, mở form nộp đơn theo `requirements` và tải lên chứng từ bổ sung (Mẫu 01/NHCS, Lệnh gọi NVQS).
- **Files liên quan:**
  - `src/components/forms/RequestCatalogModal.jsx`
  - `src/components/forms/DynamicPetitionForm.jsx`
  - `src/components/forms/DocumentDropzone.jsx`
- **Acceptance Criteria:**
  - Lấy danh mục 5 thủ tục từ `GET /api/petitions/types` và sinh các trường tương ứng.
  - Cho phép đính kèm file và gửi `POST /api/petitions/:id/resume` khi Agent yêu cầu làm rõ.

---

### PHASE 4: Hàng Đợi Chuyển Tiếp Cán Bộ (Staff Escalation Hub & HITL)
- **Mục tiêu:** Xây dựng giao diện cho Cán bộ PĐT duyệt ca vượt thẩm quyền (`MILITARY_DEFERMENT`), xem Context Capsule, bấm Duyệt / Từ chối / Hoàn tác.
- **Files liên quan:**
  - `src/pages/StaffEscalationPage.jsx`
  - `src/components/staff/EscalationCard.jsx`
  - `src/components/staff/ContextCapsuleViewer.jsx`
  - `src/components/staff/RejectReasonModal.jsx`
  - `src/components/staff/RollbackModal.jsx`
- **Acceptance Criteria:**
  - Đơn `ESCALATED` hiển thị đầy đủ thẻ Context Capsule (GPA, nợ phí, lý do, câu hỏi hành động).
  - Nút `[Duyệt]` gọi API `POST /approve` với token Cán bộ thành công.
  - Nút `[Từ chối]` bắt buộc nhập lý do, gọi API `POST /reject`.
  - Nút `[Hoàn tác]` hiển thị cảnh báo và gọi API `POST /rollback` thu hồi mã QR thành công.

---

### PHASE 5: Bộ Chạy Kiểm Thử Tự Hành 90s & Sandbox Cho Ban Giám Khảo (Verify Harness)
- **Mục tiêu:** Màn hình trực quan chứng minh hệ thống thực thi thật 100% cho Ban Giám Khảo.
- **Files liên quan:**
  - `src/pages/VerifyHarnessPage.jsx`
  - `src/components/verify/VerifyTestCard.jsx`
  - `src/components/verify/CustomVerifyBox.jsx`
- **Acceptance Criteria:**
  - Bấm `[Chạy Toàn Bộ 5 Ca Kiểm Thử]` $\rightarrow$ gọi API `POST /api/agent/verify-90s` thật $\rightarrow$ render kết quả 5/5 ĐẠT với latency thật.
  - Cho phép Giám khảo nhập text tự do vào ô Custom Verify $\rightarrow$ gọi Agent thật $\rightarrow$ render luồng xử lý thật.

---

### PHASE 6: Trình Khám Phá Chuỗi Kiểm Toán (Cryptographic Audit Explorer & Live Terminal)
- **Mục tiêu:** Màn hình chứng minh trách nhiệm giải trình và tính toàn vẹn mật mã học.
- **Files liên quan:**
  - `src/pages/AuditExplorerPage.jsx`
  - `src/components/audit/AuditTable.jsx`
  - `src/components/audit/AuditTimeline.jsx`
  - `src/components/audit/AuditTerminalView.jsx`
  - `src/components/audit/ChainIntegrityModal.jsx`
- **Acceptance Criteria:**
  - Chuyển đổi linh hoạt giữa 3 chế độ xem: Bảng, Dòng thời gian, và Live Terminal.
  - Nút `[⚡ Kiểm Tra Toàn Vẹn Chuỗi Băm]` gọi API `/api/audit/verify-chain` hiển thị thông điệp xác thực 100% toàn vẹn.
  - Bấm vào 1 dòng xem được chi tiết Before/After state, previousHash và sha256Hash.

---

### PHASE 7: WebMCP Client Integration, Responsive & Polish
- **Mục tiêu:** Nối Socket.IO WebMCP client, hoàn thiện empty state, loading state và tối ưu hiển thị demo.
- **Files liên quan:**
  - `src/services/webmcp/studentMcpTools.js`
  - `src/components/common/LoadingSpinner.jsx`
  - `src/components/common/EmptyState.jsx`
- **Acceptance Criteria:**
  - Xử lý mượt mà khi mất mạng hoặc backend khởi động lại (Reconnecting indicator).
  - Giao diện đáp ứng tốt trên các độ phân giải màn hình laptop thuyết trình (1280px - 1440px - 1920px).

---

## 11. DEMO JOURNEY (KỊCH BẢN THUYẾT TRÌNH 3 PHÚT TRƯỚC BAN GIÁM KHẢO)

```text
⏱️ 0:00 - 0:30 | GIỚI THIỆU TỔNG QUAN & TỰ ĐỘNG HÓA THƯỜNG QUY (AUTO)
- Giới thiệu EduRef AI: Tác tử tự hành phân xử và điều phối học vụ đại học (Track 2 Option A).
- Vai trò hiện tại: Sinh viên Nguyễn Văn An (2110001).
- Thao tác: Bấm câu mẫu "Em xin giấy xác nhận sinh viên để làm vé tháng xe buýt".
- Điểm nhấn: Agent streaming lời giải thích, tự động qua 5 chốt chặn, cấp mã ST-XXXXXX và mã QR trong 0.8 giây.

⏱️ 0:31 - 1:15 | KHẢ NĂNG HỎI LÀM RÕ & BỔ SUNG BIỂU MẪU (ASK -> RESUME)
- Thao tác: Gõ câu lệnh thiếu dữ kiện "Em xin xác nhận vay vốn ngân hàng chính sách".
- Điểm nhấn: Agent nhận diện thiếu Mẫu 01/NHCS -> Chuyển WAITING_STUDENT -> Đưa ra câu hỏi và ô Upload.
- Thao tác: Bấm nút nộp bổ sung Mẫu 01 -> Agent tự động kích hoạt luồng Resume và phê duyệt.

⏱️ 1:16 - 2:00 | GIỚI HẠN THẨM QUYỀN & HUMAN-IN-THE-LOOP (ESCALATE -> APPROVE)
- Thao tác: Nộp đơn "Tạm hoãn nghĩa vụ quân sự kèm lệnh gọi NVQS Quận 10".
- Điểm nhấn: Agent từ chối tự duyệt vì đây là thủ tục pháp lý bắt buộc với Quân đội -> Chuyển ESCALATED.
- Thao tác: 1-Click Role Switcher chuyển sang Thầy Nghĩa (Chuyên viên PĐT).
- Mở Staff Escalation Hub -> Đọc Context Capsule (GPA, nợ phí, lý do) -> Bấm [✅ Duyệt Đơn].
- Chứng minh: Cán bộ duyệt tạo mã QR mới có chữ ký cán bộ; chuỗi băm SHA-256 ghi nhận block mới.

⏱️ 2:01 - 2:30 | HUMAN OVERRIDE (DỪNG KHẨN CẤP / HOÀN TÁC 1-CHẠM)
- Thao tác: Bấm nút [Hoàn Tác / Ghi Đè] trên hồ sơ vừa duyệt với lý do "Phát hiện sai lệch địa phương".
- Điểm nhấn: Hồ sơ chuyển CANCELLED, mã QR bị vô hiệu hóa ngay lập tức.
- Chuyển sang Tab Audit Explorer: Chứng minh block cũ KHÔNG bị xóa, block mới nối tiếp vào chuỗi.

⏱️ 2:31 - 3:00 | BẰNG CHỨNG THỰC THI & VERIFY HARNESS
- Mở Tab Verify Harness: Bấm [⚡ Chạy 5 Test Cases 90s] -> 5/5 Ca kiểm thử chạy thật qua Backend FSM ĐẠT trong 300ms.
- Mời Giám khảo: "Thầy/Cô có thể nhập bất kỳ yêu cầu mới nào vào ô Custom Verify này để quan sát Agent phản ứng tức thì."
- Bấm [Kiểm tra Chuỗi Khối] -> 100% Blocks toàn vẹn mật mã học SHA-256.
```

---

## 12. BACKEND GAPS (KIỂM KÊ CÁC ĐIỂM CẦN ĐỒNG BỘ Ở BACKEND)

Sau khi rà soát chéo giữa yêu cầu Frontend và mã nguồn Backend hiện tại, ghi nhận **chính xác 2 điểm nhỏ cần đồng bộ**:

1. **Endpoint Static Document Download / Preview:**
   - Hiện tại `POST /api/petitions/:id/documents` đang tạo bản ghi với `fileUrl = https://storage.eduref.edu.vn/...` (URL tượng trưng).
   - *Giải pháp Frontend:* Tạo trình xem trước biểu mẫu mẫu (PDF viewer placeholder hoặc preview ảnh chứng từ mẫu có sẵn trong thư mục assets) để BGK nhìn thấy được ảnh Lệnh gọi NVQS và Mẫu 01/NHCS khi mở Context Capsule.
2. **Event Realtime cho Staff Decision:**
   - Khi Cán bộ bấm duyệt đơn tại route `POST /api/petitions/:id/approve`, Backend hiện đang xử lý qua HTTP Request mà chưa phát tán Socket.IO broadcast `staff_decision_made` tới các client khác.
   - *Giải pháp:* Frontend sau khi bấm Duyệt thành công sẽ tự động cập nhật local state và gọi lại `fetchPetitions()` để đồng bộ tức thì, không phụ thuộc vào WebSocket broadcast.

---

## KẾT LUẬN

Kế hoạch này đảm bảo xây dựng một giao diện **đúng chuẩn sản phẩm hành chính đại học thực tế**, loại bỏ hoàn toàn các yếu tố viễn tưởng "AI futuristic", bám sát 100% API backend thật và phục vụ tối đa cho bài thi thuyết trình 90 giây trước Ban Giám Khảo.
