# 04. KIẾN TRÚC & NGUYÊN LÝ HOẠT ĐỘNG CỦA AI AGENT
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Module:** `backend/modules/ai-agent`

---

## 1. MÔ HÌNH VÀ THÔNG SỐ CẤU HÌNH (MODEL CONFIGURATION)

- **Mô hình chính:** Google Gemini 2.0 Flash Lite (`gemini-flash-lite-latest`), cấu hình tại [GeminiStreamClient.js:11](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/modules/ai-agent/llm/GeminiStreamClient.js#L11).
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`.
- **Cơ chế truyền tải (Streaming):** Server-Sent Events (SSE) HTTP Stream, phân tích từng chunk text theo thời gian thực và đẩy về Socket.IO client (`agent_response_chunk`).
- **Nhiệt độ (Temperature):** Cố định ở mức `0.1` để triệt tiêu tính ngẫu hứng và ảo giác của mô hình, đảm bảo tuân thủ nghiêm ngặt quy chế đào tạo.
- **Giới hạn Token:** `maxOutputTokens = 2048`.
- **Cơ chế Key Rotator:** Hỗ trợ chuỗi nhiều API Keys trong biến môi trường `GEMINI_API_KEYS=key1,key2,key3`. Tự động xoay vòng (Round-Robin) khi gặp lỗi Quota (429), lỗi mạng hoặc lỗi dịch vụ (403, 500, 503, 504).

---

## 2. VÒNG LẶP SUY LUẬN TỰ HÀNH (AUTONOMOUS REACT LOOP)

Vòng lặp ReAct (Reasoning + Acting) được điều phối tại [AgentOrchestrator.js:147-211](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/modules/ai-agent/core/AgentOrchestrator.js#L147-L211):

```
Người dùng gửi tin nhắn
        │
        ▼
[0. Giám định Vision (nếu có ảnh)] ──► Nếu mờ/bôi đen ──► Trả về ASK_CLARIFICATION ngay
        │ Đạt yêu cầu
        ▼
[0. Chuẩn hóa tiếng lóng học vụ] (ContextResolver)
        │
        ▼
[Nạp lịch sử hội thoại] (ConversationMemory - 10 lượt gần nhất)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ VÒNG LẶP REACT (Tối đa 8 vòng lặp - maxSteps = 8)           │
│                                                             │
│ 1. Gọi Gemini streamGenerateContent với Function Declarations│
│ 2. Kiểm tra xem model có trả về functionCall không?        │
│    ├── KHÔNG CÓ: Kết thúc vòng lặp, tổng hợp câu trả lời    │
│    └── CÓ functionCall (Tool Invocation):                   │
│         ├── Log sự kiện gọi tool lên Terminal Console       │
│         ├── Chuyển tiếp tới ToolResolver.resolve(name, args)│
│         ├── Thực thi mã nghiệp vụ tại backend               │
│         ├── Bổ sung kết quả tool vào mảng contents chuẩn:   │
│         │   - role: "model", parts: [{ functionCall }]      │
│         │   - role: "user", parts: [{ functionResponse }]   │
│         └── Tiếp tục bước suy luận kế tiếp (Synthesis)      │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
Lưu câu trả lời vào Bộ nhớ phiên & Cập nhật Metadata đơn gần nhất
        │
        ▼
Bắn kết quả hoàn chỉnh qua Socket.IO (agent_response_end)
```

---

## 3. DANH MỤC CÔNG CỤ NGHIỆP VỤ (TOOL REGISTRY)

Hệ thống cung cấp 11 công cụ khai báo chuẩn Function Calling:

### A. Nhóm Bối cảnh Sinh viên (Student Context)
1. `get_student_profile({ studentCode })`: Tra cứu hồ sơ chi tiết của sinh viên (trạng thái học tập, khoa, điểm GPA, nợ học phí).
2. `get_student_requests({ studentCode })`: Lấy lịch sử 10 đơn gần nhất của sinh viên để chống nộp trùng lặp hoặc lách luật.

### B. Nhóm Khởi tạo & Tra cứu Đơn (Request Context)
3. `create_request({ studentCode, requestTypeCode, purpose, inputData })`: Khởi tạo hồ sơ đơn mới ở trạng thái `PENDING` và cấp mã đơn `ST-XXXXXX`.
4. `get_request({ requestId })`: Context Aggregator - lấy toàn bộ trạng thái chi tiết của đơn (chứng từ, thông tin sinh viên, kết quả thẩm định).

### C. Nhóm Thẩm định Hồ sơ (Requirement & Policy Gate)
5. `check_requirements({ requestId })`: Kiểm tra xem đơn đã đầy đủ các thông tin và minh chứng bắt buộc chưa.
6. `evaluate_policy({ requestId })`: Thẩm định hồ sơ theo Quy chế Đào tạo cứng (sinh viên ACTIVE, nợ phí $\le$ 10 triệu, hạn chót phúc khảo 7 ngày).

### D. Nhóm Phân cấp Thẩm quyền (Authority Boundary)
7. `check_authority({ requestId, action })`: Kiểm tra xem loại đơn và hành động này có thuộc thẩm quyền tự chủ của AI (`AI_AGENT`) hay thuộc cấp Cán bộ (`STAFF`) hoặc Lãnh đạo (`DEAN`).

### E. Nhóm Hành động & HITL (Action & Decision)
8. `process_request({ requestId })`: Thực thi phê duyệt tự động đối với đơn thường quy hợp lệ. **Backend tự động re-check 3 lớp an toàn trước khi cấp mã QR**.
9. `ask_student({ requestId, question })`: Chuyển đơn sang `WAITING_STUDENT` và gửi câu hỏi cụ thể hướng dẫn sinh viên bổ sung thông tin còn thiếu.
10. `escalate_request({ requestId, reason, actionableQuestion, requiredRole })`: Chuyển tiếp đơn lên Cán bộ hoặc Lãnh đạo kèm Context Capsule và câu hỏi hành động trực diện.

### F. Nhóm Giám sát & Đổi mới (Observability & Rollback)
11. `rollback_request({ requestCode, reason })`: Can thiệp dừng khẩn cấp, thu hồi mã chứng thực số và vô hiệu hóa mã QR khi phát hiện sai phạm.
12. `run_verify_90s()`: Kích hoạt bộ chạy kiểm thử 5 Test Cases chuẩn Track 2 Option A trong 90 giây phục vụ Ban Giám Khảo.

---

## 4. BỘ NHỚ HỘI THOẠI & CHUẨN HÓA TIẾNG LÓNG

### 1. Chuẩn hóa tiếng lóng (`ContextResolver.js`):
Sinh viên thường dùng tiếng lóng hoặc từ viết tắt khi trao đổi với chatbot. Hệ thống tự động tiền xử lý tin nhắn bằng từ điển Regex:
- `xnsv`, `xác nhận sv` $\rightarrow$ `giấy xác nhận sinh viên`
- `hk`, `học kì` $\rightarrow$ `học kỳ`
- `đk`, `dkhp` $\rightarrow$ `đăng ký học phần`
- `nợ phí`, `học phí` $\rightarrow$ `nợ học phí`
- `ctđt` $\rightarrow$ `chương trình đào tạo`

### 2. Xử lý đại từ chỉ định ngữ cảnh (Anaphora Resolution):
Khi sinh viên hỏi: *"Đơn đó của em duyệt chưa?"* hoặc *"Hồ sơ này cần thêm gì?"*:
- `ConversationMemory` lưu lại `lastRequestId` và `lastRequestType` của phiên.
- Hệ thống tự động thay thế cụm "đơn đó", "hồ sơ đó" thành mã đơn cụ thể (ví dụ: `ST-340510`) trước khi đưa vào LLM suy luận.

---

## 5. BẢO VỆ CHỐNG THAO TÚNG & PROMPT INJECTION (GUARDRAILS)

1. **System Playbook bắt buộc tuân thủ thứ tự:**
   Prompt hệ thống quy định AI bắt buộc phải đi tuần tự: Tra cứu sinh viên $\rightarrow$ Khởi tạo đơn $\rightarrow$ Kiểm tra Requirement $\rightarrow$ Kiểm tra Policy $\rightarrow$ Kiểm tra Authority $\rightarrow$ rồi mới được gọi `process_request`.
2. **Triệt tiêu quyền năng tự phong:**
   Trong prompt và tool declaration, AI được huấn luyện: *"Tác tử AI không bao giờ được tự cấp quyền duyệt cho chính mình đối với các đơn vượt thẩm quyền"*.
3. **Backend re-check độc lập:**
   Dù sinh viên có dùng kỹ thuật jailbreak làm AI ảo giác gọi lệnh `process_request` cho đơn tốt nghiệp, Backend Node.js tại [AcademicWorkflowService.js:458](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/AcademicWorkflowService.js#L458) sẽ chặn lại vì `checkAuthority` trả về `allowed: false`.
