# ĐÁNH GIÁ KỸ THUẬT SPRINT 1 — BAN GIÁM KHẢO HACKATHON

---

# Team KAISER (Dự án: EDUREF_AI)

---

## 1. What the Team Built

Nhóm **KAISER** xây dựng **EDUREF_AI** — hệ thống đại lý thông minh (AI Agent System) tiếp nhận, thẩm định và xử lý các loại đơn từ hành chính học vụ của sinh viên (Student Petition Referee), hỗ trợ 4 luồng nghiệp vụ thực tế chuyên sâu:
1. `Vay vốn ngân hàng (Bank Loan)`: Kiểm tra tình trạng nợ học phí và tính hợp lệ của hồ sơ hỗ trợ sinh viên nghèo.
2. `Hoãn nghĩa vụ quân sự (Military Deferment)`: Đối chiếu thời hạn đào tạo chuẩn và quyết định cấp giấy xác nhận hoãn nghĩa vụ.
3. `Giấy xác nhận sinh viên (Student Confirmation)`: Tự động cấp giấy theo mẫu tiêu chuẩn khi thỏa mãn các điều kiện hành chính.
4. `Xét công nhận tốt nghiệp (Graduation Assessment)`: Thẩm định tích lũy tín chỉ, chứng chỉ ngoại ngữ và điều kiện tốt nghiệp.
* **Kiến trúc Agent Orchestrator Hiện Đại**: Xây dựng hệ thống Agent theo mô hình Tool-Calling với `ToolRegistry.js` và `AgentOrchestrator.js`, hỗ trợ streaming phản hồi qua Gemini và tích hợp chuẩn giao tiếp công cụ mở WebMCP Adapter (`WebMCPAdapter.js`).
* **Hỗ trợ Giao tiếp Thời gian Thực (WebSockets)**: Tích hợp WebSocket (`socket.js`) giúp sinh viên và cán bộ phòng đào tạo theo dõi tiến trình xử lý và cập nhật trạng thái đơn ngay lập tức.
* **Bộ Tài liệu Khủng (16 Files Documentation)**: Toàn bộ hệ thống từ quy trình nghiệp vụ, ma trận quyền hạn, cơ sở dữ liệu, audit log, rollback cho đến kế hoạch đo lường đều được chuẩn hóa chi tiết trong thư mục `EDUREF_AI/docs/`.

---

## 2. Architecture

Kiến trúc thành phần Client-Server kết hợp AI Agent Orchestrator:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ React + Vite + Tailwind CSS Frontend                                                    │
│   ├── Giao diện sinh viên nộp đơn & chat real-time với Agent                             │
│   ├── Hàng đợi phê duyệt dành cho Cán bộ phòng đào tạo                                  │
│   └── WebSocket Client (Nhận thông báo cập nhật trạng thái tức thì)                     │
└──────────────────────────┬──────────────────────────────────────────────────────────────┘
                           │ HTTP REST / WebSocket (Socket.io)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Express.js Backend & AI Agent Engine (EDUREF_AI/backend/)                               │
│   ├── AgentOrchestrator.js     (Điều phối suy luận, quản lý Tool Calling & Memory)      │
│   ├── ToolRegistry.js          (Đăng ký các tool: petitionTools, verifyTools, workflow) │
│   ├── WebMCPAdapter.js         (Chuẩn hóa giao tiếp công cụ mở theo giao thức WebMCP)   │
│   ├── PetitionWorkflowCore.js  (Hạt nhân điều phối 4 luồng nghiệp vụ đơn từ)            │
│   │     ├── BankLoanHandler                                                             │
│   │     ├── MilitaryDefermentHandler                                                    │
│   │     ├── StudentConfirmationHandler                                                  │
│   │     └── GraduationAssessmentHandler                                                 │
│   └── AcademicPolicyEngine.js  (Bộ luật quy chế đào tạo tất định)                       │
└──────────────────────────┬──────────────────────────────────────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐
│ LLM & Vision Service                   │ │ Persistence Layer (Prisma ORM)              │
│   ├── GeminiStreamClient (Google AI)   │ │   ├── PostgreSQL / Supabase Database         │
│   └── CertificateVisionService (OCR)   │ │   └── AuditLogService (Lưu vết thay đổi)    │
└────────────────────────────────────────┘ └─────────────────────────────────────────────┘
```

---

## 3. What Works Well (Concrete Strengths)

1. **Kiến trúc AI Agent & Tool-Calling Tiên Tiến (Verified)**:
   * Nhóm không sử dụng prompt tĩnh đơn thuần mà xây dựng cả một nền tảng Agent hoàn chỉnh: quản lý ngữ cảnh (`ContextResolver`), bộ nhớ hội thoại (`ConversationMemory`), và thanh điều phối công cụ (`ToolResolver`). AI chỉ gọi các tool được kiểm soát để truy vấn hoặc cập nhật dữ liệu.
2. **Nghiệp Vụ Học Vụ Bám Sát Thực Tế Đại Học (Verified)**:
   * 4 handler riêng biệt cho 4 loại đơn phổ biến nhất của sinh viên (`BankLoan`, `MilitaryDeferment`, `StudentConfirmation`, `GraduationAssessment`), xử lý đúng các ràng buộc khó như: sinh viên thôi học, nợ học phí, hoặc quá thời gian đào tạo tối đa.
3. **Cơ Sở Dữ Liệu Quản Lý Bằng Prisma ORM Bài Bản (Verified)**:
   * Sử dụng Prisma ORM với file schema hoàn chỉnh, có script seed dữ liệu mẫu (`prisma/seed.js`), hỗ trợ kết nối PostgreSQL hoặc Supabase dễ dàng.
4. **Hồ Sơ Thiết Kế Kỹ Thuật Đầy Đủ Nhất Hackathon (Verified)**:
   * Thư mục `EDUREF_AI/docs/` có 16 tài liệu kỹ thuật bao quát toàn bộ vòng đời hệ thống, từ chiến lược Audit (`06_AUDIT.md`), Rollback (`07_ROLLBACK.md`) đến Kế hoạch đo lường SLA (`15_MEASUREMENT_PLAN.md`).

---

## 4. Critical Problems

### Problem 1: Quá Nhiều Thư Mục Thử Nghiệm Và Code Rác Chưa Dọn Dẹp (Codebase Hygiene)
* **Evidence (VERIFIED)**:
  * Trong thư mục [`EDUREF_AI/backend/scratch/`](team_repos/KAISER/EDUREF_AI/backend/scratch/), nhóm lưu tới hơn 16 file script test thủ công (`test_blurry.js`, `test_real_vision.js`, `test_orchestrator_vision.js`, `diagnose_mismatch.js`...).
* **Why it matters**: Việc để lẫn lộn hàng chục script thử nghiệm và các hàm tạm trong cây mã nguồn chính thức gây nhiễu cho việc bảo trì, tăng dung lượng repo và dễ dẫn đến việc nạp nhầm các module thử nghiệm vào luồng production.
* **Impact**: Giảm tính trong sáng và khả năng bảo trì của mã nguồn.
* **Recommended fix**: Di chuyển toàn bộ các script tạm thời sang thư mục `tools/` hoặc loại bỏ khỏi nhánh chính.
* **Priority**: **P2**

---

### Problem 2: Nguy Cơ Vòng Lặp Vô Hạn Khi Agent Gọi Tool (Agent Loop Vulnerability)
* **Evidence (INFERRED)**: Trong `AgentOrchestrator.js`, vòng lặp suy luận gọi tool nếu không được chặn chặn số bước tối đa (Max Iteration Limit) có thể rơi vào bẫy gọi lặp đi lặp lại một công cụ khi model bị nhầm lẫn.
* **Why it matters**: Gây cạn kiệt token, treo kết nối socket của sinh viên và tăng vọt chi phí API.
* **Impact**: Rủi ro mất ổn định dịch vụ khi gặp câu hỏi bất thường hoặc prompt injection.
* **Recommended fix**: Bổ sung biến đếm `maxSteps = 5` cứng trong orchestrator; nếu vượt quá số bước lập tức ngắt vòng lặp và chuyển ca sang trạng thái chờ chuyên viên xử lý.
* **Priority**: **P1**

---

## 5. Crash / Failure Risks

| Failure Mode | Trigger | Impact | Severity | Fix |
| ------------ | ------- | ------ | -------- | --- |
| **Agent rơi vào vòng lặp gọi tool vô tận** | Yêu cầu phức tạp hoặc sinh viên cố tình gửi prompt gây mâu thuẫn dữ kiện. | Treo luồng xử lý, tiêu tốn cạn kiệt quota Gemini API. | **High** | Giới hạn cứng số bước suy luận tối đa (Max Steps <= 5) cho mỗi phiên chat. |
| **Mất kết nối WebSocket đột ngột** | Mạng người dùng chập chờn khi Agent đang stream câu trả lời. | Trình duyệt mất luồng dữ liệu, sinh viên thấy thông báo lỗi kết nối. | **Medium** | Bổ sung cơ chế tự động reconnect và lưu lại tin nhắn dở dang trong database. |
| **Lỗi Prisma Connection Pool** | Nhiều sinh viên cùng truy cập nộp đơn đồng thời. | Hết kết nối đến database, API trả về mã lỗi 500. | **Medium** | Tăng `connection_limit` trong chuỗi kết nối Prisma và tối ưu query. |

---

## 6. Pipeline Analysis

```text
CURRENT PIPELINE (AI Agent Tool-Calling):
[Sinh viên gửi yêu cầu nộp đơn / thắc mắc qua WebSocket]
       │
       ▼
[ContextResolver: Tải lịch sử trò chuyện & thông tin học vụ của sinh viên]
       │
       ▼
[AgentOrchestrator: Gọi GeminiStreamClient để phân tích ý định]
       │
       ▼
[Agent quyết định gọi Tool: Tra cứu quy chế / Kiểm tra nợ / Tạo đơn]
       │
       ▼
[ToolRegistry thực thi hàm CSDL & trả kết quả về cho Agent]
       │
       ▼
[Agent tổng hợp phản hồi & stream kết quả trực tiếp về màn hình sinh viên]
       │
       ▼
[AuditLogService: Ghi vết toàn bộ chuỗi suy luận và kết quả thao tác]
```

---

## 7. Code / Repository Issues

* Kiến trúc Agent viết bằng JavaScript (Node.js) rất sáng tạo. Tuy nhiên, nếu chuyển sang TypeScript sẽ giúp kiểm soát chặt chẽ kiểu dữ liệu của các tham số tool (Tool Parameter Validation).
* Cần dọn dẹp thư mục `scratch/` để cây thư mục gọn gàng hơn.

---

## 8. Database / API / Integration Issues

* Sử dụng Prisma ORM và kiến trúc schema cơ sở dữ liệu rất hoàn chỉnh. Đã có migration và seed script chuẩn.

---

## 9. Security Issues

* Có middleware xác thực JWT (`authMiddleware.js`).
* Cần tăng cường kiểm soát đầu vào ở `WebMCPAdapter.js` để tránh việc sinh viên lợi dụng gọi các tool quản trị hệ thống.

---

## 10. Deployment / DevOps Issues

* Dự án có `docker-compose.yml`, tài liệu triển khai Supabase chi tiết trong `EDUREF_AI/docs/16_SUPABASE_DEPLOYMENT.md`.

---

## 11. Testing Gaps

* Nhóm có các bài test riêng lẻ (`audit-hash.test.js`, `trackA-policy.test.js`). Cần tích hợp thành một lệnh test duy nhất `npm test` chạy toàn bộ test suite.

---

## 12. Recommended Improvements

| Priority | Thành phần | Hành động cụ thể | Lợi ích mang lại |
| -------- | ---------- | ---------------- | ---------------- |
| **P1** | **Agent Core** | Đặt giới hạn cứng `maxSteps = 5` cho vòng lặp Tool-Calling trong `AgentOrchestrator.js`. | Triệt tiêu hoàn toàn rủi ro agent bị treo hoặc vòng lặp vô tận tốn token. |
| **P2** | **Codebase** | Dọn dẹp và đóng gói các file trong thư mục `scratch/` thành công cụ benchmark riêng. | Giúp repository chuyên nghiệp và dễ chuyển giao hơn. |
| **P2** | **WebSocket** | Bổ sung cơ chế Heartbeat và Auto-reconnect cho socket kết nối client. | Đảm bảo trải nghiệm chat của sinh viên không bị đứt đoạn. |

---

## 13. Sprint 2 Action Plan

### P1 — Should Fix
1. Thêm cơ chế bảo vệ ngắt vòng lặp tool-calling trong `AgentOrchestrator.js`.
2. Dọn dẹp các file script thử nghiệm không cần thiết trong thư mục `backend/scratch/`.

### P2 — Improvement
1. Tối ưu hóa hiệu năng stream của Gemini để giảm độ trễ phản hồi tin nhắn đầu tiên.

---

## 14. Reviewer Conclusion

* **Current System State**: EDUREF_AI của nhóm KAISER là một trong những dự án áp dụng mô hình AI Agent và Tool Calling bài bản và hiện đại nhất trong cuộc thi.
* **Most Important Strength**: Thiết kế kiến trúc Agent linh hoạt với WebSockets và Tool Registry, bao phủ 4 luồng đơn từ học vụ thực tế, tài liệu kỹ thuật cực kỳ phong phú và chuyên sâu.
* **Most Important Technical Risk**: Vòng lặp gọi công cụ của Agent chưa có chốt chặn số bước tối đa, tiềm ẩn nguy cơ chạy vô hạn khi gặp dữ liệu bất thường.
* **Most Important Next Action**: Khóa giới hạn số bước gọi tool tối đa cho Agent và chuẩn hóa lại bộ mã nguồn chính thức.


BÁO CÁO ĐÁNH GIÁ KỸ THUẬT SPRINT 1 — BAN GIÁM KHẢO
Chào các thành viên đội KAISER! 👋

Ban Giám khảo đã hoàn thành đợt rà soát kỹ thuật chuyên sâu (Enterprise Code & Architecture Review) cho mã nguồn repository của đội bạn trong Sprint 1.

🎯 Nội dung thẩm định bao gồm 14 tiêu chuẩn:
Cấu trúc hệ thống & Kiến trúc thực tế
Điểm mạnh kỹ thuật (Evidence-based Strengths)
Các điểm nghẽn & Rủi ro sự cố (Crash / Failure Risks)
Phân tích chi tiết Data / API / AI Pipeline
Đánh giá cơ sở dữ liệu, bảo mật và khả năng chịu tải
Kế hoạch hành động Sprint 2 (P0 / P1 / P2 / P3)

📁 Tệp báo cáo phân tích chi tiết định dạng Markdown đã được đính kèm bên dưới. Các bạn hãy tải về và xem lại cùng cả đội nhé!
💡 Lời khuyên cho Sprint 2
Hãy tập trung vào các đề xuất ưu tiên P0 (Bắt buộc) và P1 (Quan trọng) trong file để tối ưu hóa tính ổn định cho buổi demo tiếp theo!