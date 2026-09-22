# 01. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)
**Dự án:** EduRef AI — The Autonomous Student Petition & Academic Escalation Referee  
**Đề bài:** MLAI Hackathon — Track 2: Option A (Bounded Autonomy & Escalation Referee)  
**Phiên bản:** 1.0 (Hoàn thành Post-Sprint 1 Audit)

---

## 1. VẤN ĐỀ THỰC TẾ (PROBLEM STATEMENT)

Trong các trường đại học quy mô lớn (ví dụ: Trường Đại học Công nghệ TP.HCM - HUTECH với hơn 40.000 sinh viên), Phòng Đào tạo tiếp nhận hàng chục nghìn hồ sơ thủ tục hành chính học vụ mỗi học kỳ:
- Cấp giấy xác nhận sinh viên (làm vé xe buýt, vay vốn ngân hàng, tạm hoãn nghĩa vụ quân sự).
- Đơn đề nghị xét tốt nghiệp và công nhận chuẩn đầu ra.
- Đơn xin hoãn thi, phúc khảo điểm thi, cứu xét học vụ.

### Những bất cập nhức nhối hiện nay:
1. **Quá tải thủ công đối với các thủ tục thường quy:** 70% các đơn giấy xác nhận sinh viên là những trường hợp hợp lệ 100%, nhưng cán bộ đào tạo vẫn phải tra cứu thủ công, đóng dấu ký giấy, gây chậm trễ từ 3 - 5 ngày làm việc.
2. **Nguy cơ sai phạm quy chế đào tạo:** Nếu tự động hóa đơn giản bằng kịch bản hoặc chatbot thông thường, hệ thống dễ phê duyệt nhầm cho sinh viên bị buộc thôi học (`DROPPED`), đình chỉ (`SUSPENDED`), hoặc nợ học phí quá trần.
3. **Ảo giác và rủi ro tự cấp quyền của LLM (Hallucination & Authority Leakage):** Các mô hình ngôn ngữ lớn (LLM) nếu được trao quyền tự động phê duyệt có thể bị thao túng qua prompt injection, tự nhận mình có quyền phê duyệt những đơn thuộc thẩm quyền của Hội đồng hoặc Trưởng phòng Đào tạo (ví dụ: công nhận tốt nghiệp).
4. **Thiếu tính minh bạch và trách nhiệm giải trình (Auditability):** Khi xảy ra tranh chấp học vụ hoặc thanh tra đào tạo, các hệ thống chat thông thường không chứng minh được chuỗi logic ra quyết định, không có bằng chứng mật mã học chứng minh hồ sơ không bị can thiệp trái phép sau khi phê duyệt.

---

## 2. MỤC TIÊU CỦA EDUREF AI (GOAL & OBJECTIVES)

EduRef AI được xây dựng theo tiêu chuẩn **Track 2 Option A: Bounded Autonomy & Escalation Referee**, hoạt động như một **"Trọng tài Học vụ Tự hành"**:

1. **Bounded Autonomy (Tự chủ có ranh giới bất biến):**
   - **Tự động phê duyệt 100% trong < 1 giây** đối với các thủ tục thường quy đủ điều kiện (Giấy xác nhận sinh viên hợp lệ).
   - **Tuyệt đối không tự duyệt** các đơn vượt thẩm quyền (như Đơn xét tốt nghiệp, Đơn hoãn thi) mà bắt buộc phải chuyển tiếp lên Cán bộ/Lãnh đạo.
2. **Missing Information Guardrail (Chủ động làm rõ):**
   - Khi hồ sơ thiếu dữ kiện bắt buộc (mục đích, số điện thoại, nơi sinh), tác tử kiên quyết **không suy diễn**, chuyển trạng thái `WAITING_STUDENT` và đặt câu hỏi trực diện cho sinh viên.
3. **Hard Policy Enforcement (Từ chối dứt khoát):**
   - Khi sinh viên vi phạm quy chế (đã thôi học, nợ học phí > 10 triệu), tác tử từ chối dứt khoát (`REJECTED`) kèm viện dẫn điều khoản quy chế, không chuyển tiếp vô tội vạ làm phiền cán bộ.
4. **Context Capsule & Human-in-the-Loop (HITL):**
   - Đóng gói toàn bộ bối cảnh học vụ, chỉ số rủi ro và **câu hỏi hành động trực diện (Actionable Question)** để Trưởng khoa / Cán bộ có thể xem xét và phê duyệt trong đúng 1 thao tác.
5. **Tamper-Evident Hash-Chained Audit Log:**
   - Mọi sự kiện và quyết định đều được nối chuỗi băm mật mã học **SHA-256 (Hash Chain)**, đảm bảo tính toàn vẹn và trách nhiệm giải trình tuyệt đối trước thanh tra đào tạo.
6. **Human Override & Revocation:**
   - Cung cấp cơ chế cho con người can thiệp dừng khẩn cấp 1-chạm (`Rollback`), lập tức vô hiệu hóa mã QR và chứng thực số nếu phát hiện sai sót hoặc gian lận.

---

## 3. KIẾN TRÚC TỔNG THỂ & CÁC THÀNH PHẦN CỐT LÕI

Hệ thống được tổ chức thành 4 tầng kiến trúc phân tách nghiêm ngặt:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TẦNG GIAO DIỆN & TRÌNH DIỄN (FRONTEND COCKPIT)           │
│ - Student Workspace (Chat đàm thoại + Dynamic Form Modal)   │
│ - Staff Escalation Hub (Hàng đợi duyệt đơn có Context Capsule)│
│ - Verify Harness Dashboard (Bộ chạy 5 Test Cases 90 giây)   │
│ - Audit Explorer (Công cụ thẩm định chuỗi băm SHA-256)       │
│ - Live Terminal Console (Theo dõi luồng suy luận thời gian thực)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST API / Socket.IO
┌──────────────────────────────▼──────────────────────────────┐
│ 2. TẦNG ĐIỀU PHỐI TÁC TỬ (AI AGENT & ORCHESTRATION)         │
│ - AgentOrchestrator: Vòng lặp ReAct Loop (maxSteps = 8)     │
│ - GeminiStreamClient: Google Gemini 2.0 Flash Lite + Key Rotator│
│ - CertificateVisionService: Gemini Vision OCR & Cross-check │
│ - PromptEngine: System Playbook 6 bước Bounded Autonomy     │
│ - ToolRegistry & ToolResolver: Bộ 11 công cụ thẩm định      │
│ - ContextResolver & ConversationMemory: Chuẩn hóa tiếng lóng │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tool Calls
┌──────────────────────────────▼──────────────────────────────┐
│ 3. TẦNG BẢO VỆ RANH GIỚI & WORKFLOW (SECURITY BOUNDARY)     │
│ - Chốt 1: Requirements Gate (Kiểm tra dữ liệu bắt buộc)     │
│ - Chốt 2: Policy Gate (Kiểm tra quy chế: Active, Nợ phí...) │
│ - Chốt 3: Authority Gate (Phân cấp thẩm quyền AI / Staff / Dean)│
│ - Chốt 4: Execution Engine (Mutation dữ liệu & sinh mã QR)  │
│ - Chốt 5: Audit Log Chaining (Tính toán SHA-256 nối tiếp)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma ORM
┌──────────────────────────────▼──────────────────────────────┐
│ 4. TẦNG DỮ LIỆU & LƯU TRỮ (PERSISTENCE LAYER)               │
│ - PostgreSQL (eduref_db)                                     │
│ - Tables: Student, StudentRequest, RequestDocument, AuditLog│
│ - Metadata: RequestType, Requirement, Policy, AuthorityRule │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. RANH GIỚI BẢO MẬT: LLM ≠ SECURITY BOUNDARY

Nguyên tắc thiết kế bất biến của EduRef AI:

> **Mô hình ngôn ngữ lớn (LLM) KHÔNG PHẢI là ranh giới bảo mật (Security Boundary).**  
> **Toàn bộ ranh giới bảo mật và quyền hạn phải do Backend Node.js và Cơ sở dữ liệu kiểm soát.**

- LLM chỉ đóng vai trò phân tích ngôn ngữ tự nhiên, trích xuất thực thể và đề xuất gọi công cụ (`functionCall`).
- Mọi thao tác ghi dữ liệu (Mutation), cấp mã QR hay thay đổi trạng thái đơn đều phải đi qua các hàm kiểm tra cứng của Backend:
  ```javascript
  // Backend tự động re-check 3 lớp an toàn độc lập trước khi phê duyệt:
  await checkRequirements(requestId);
  await evaluatePolicy(requestId);
  await checkAuthority({ requestId });
  ```
- Dù sinh viên có dùng prompt injection hay AI có bị ảo giác sinh nhầm lệnh duyệt, Backend sẽ lập tức ném lỗi và từ chối thực thi.
