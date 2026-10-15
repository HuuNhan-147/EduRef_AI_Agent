# 🛠️ NHẬT KÝ PHÁT TRIỂN (BUILD LOG) — DỰ ÁN EDUREF AI
### **MLAI Hackathon 2026 — Bảng 1: OrganizationAI (Track VNG — The Escalation Referee)**
> **Đội thi:** KAISER · **Thành viên:** Cao Hữu Nhân (Lead), Trần Đức Tài, Hoàng Trọng Trà, Trần Minh Quang  
> **Thời gian thực hiện:** 19/09/2026 – 15/10/2026 · **Đơn vị chủ quản:** Trường Đại học Bách khoa (HCMUT) × Trường Đại học Công nghệ TP.HCM (HUTECH)

---

## 1. CÔNG CỤ AI ĐÃ SỬ DỤNG (AI TOOLCHAIN)

Dự án áp dụng mô hình phân tách chuyên biệt giữa **Bộ công cụ AI phát triển (Engineering Multi-AI Toolchain)** và **AI vận hành sản phẩm (Product Runtime AI)**:

1. **AI Hỗ trợ Phát triển Hệ thống (Engineering Pair-Programming theo chuyên môn thành viên):**
   - **Google DeepMind Antigravity IDE (Gemini 3.8 / Gemini Ecosystem):** Sử dụng bởi **Cao Hữu Nhân (Team Leader)** & **Trần Đức Tài (Backend & Audit Ledger Engineer)**. Đảm nhiệm vai trò kiến trúc sư trưởng, quản trị không gian làm việc toàn cục (Full-Workspace Context), xây dựng lõi ReAct Orchestrator, 7 chốt chặn quy chế xác định (Deterministic Guards), sổ cái kiểm toán Merkle SHA-256 bất biến và phát triển bộ kiểm thử tự động toàn diện đạt 71/71 tests PASS.
   - **Claude Fable 5 (Anthropic Claude):** Sử dụng bởi **Hoàng Trọng Trà**. Đảm nhiệm tối ưu hóa prompt phân loại ý định, tinh chỉnh độ nhạy ngôn ngữ học vụ sinh viên, rà soát tính chặt chẽ của các văn bản quy chế đào tạo HUTECH và soạn thảo các kịch bản kiểm thử hành chính.
   - **OpenAI Codex Astra 6:** Sử dụng bởi **Trần Minh Quang (Frontend UI/UX & Realtime Integration)**. Đảm nhiệm tăng tốc phát triển giao diện React 18 / TailwindCSS, xây dựng trang Verify Harness 90s, bảng điều khiển Audit Explorer, Live Terminal Console và tích hợp Server-Sent Events (SSE Streaming) / WebSocket.
2. **AI Vận hành Thực tế trong Sản phẩm (Product Runtime AI):**
   - **Google Gemini 2.0 Flash Lite (`gemini-flash-lite-latest`):** Tích hợp qua API với cơ chế truyền phát mã thông báo Server-Sent Events (SSE Streaming) và Function Calling đa bước (Multi-step Tool Calling), đóng vai trò Cổng nhận thức ngôn ngữ tự nhiên (Cognitive Ingestion Gateway).

---

## 2. TÍNH HIỆU QUẢ CỦA CÔNG CỤ AI

Sự kết hợp đa công cụ AI chuyên biệt mang lại bước nhảy vọt về hiệu suất phát triển thực chiến:
- **Tốc độ tái cấu trúc an toàn (Safe Refactor Velocity):** Antigravity (Gemini 3.8) hỗ trợ tái cấu trúc thành công toàn bộ hệ thống từ mô hình phân mảnh sang kiến trúc **Unified Pipeline (7 chốt chặn, 4 trạng thái kết thúc)** bám sát 100% sơ đồ StarUML [`SoDoHeThong_EduRef_AI.mdj`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/SoDoHeThong_EduRef_AI.mdj).
- **Bảo chứng Kiểm thử Tự động (Zero-Regression Testing):** Đạt **71/71 bài kiểm thử vượt qua tuyệt đối (100% PASS)** trên toàn bộ các tầng: Logic quy chế HUTECH, An ninh ranh giới JWT, Sổ cái Merkle SHA-256 và Bounded Autonomy.
- **Tối ưu hóa Giao diện & Băng thông:** Claude Fable 5 và Codex Astra 6 giúp hoàn thiện giao diện người dùng mượt mà, trực quan hóa tiến trình suy luận và giảm 35% lượng token tiêu thụ trên mỗi phiên hội thoại của sinh viên.

---

## 3. ĐIỂM GÂY TỐN THỜI GIAN NHẤT (THE HARDEST BOTTLENECK)

Điểm nghẽn kỹ thuật tốn nhiều công sức và thời gian nhất khi phối hợp với AI là: **Trị dứt điểm "Ảo tưởng suy diễn ngầm" (Implicit Fallback Hallucination).**
- *Hiện tượng:* Khi cơ sở dữ liệu bị thiếu trường (ví dụ sinh viên chưa có dữ liệu tín chỉ hoặc chưa chọn cơ sở nhận), mô hình AI có xu hướng "tự suy đoán có thiện chí" (như tự gán 15 tín chỉ hoặc tự điền cơ sở nhận là Trụ sở chính 475A Điện Biên Phủ để hoàn tất đơn).
- *Hậu quả thực tế:* Sai lệch nghiêm trọng quy chế của Trường, dẫn đến việc sinh viên học tại cơ sở Khu Công nghệ cao phải di chuyển nhầm nơi nhận giấy.
- *Giải pháp khắc phục:* Đội thi đã mất 3 ngày rà soát mã nguồn để thiết lập nguyên lý **Zero-Tolerance Input Boundary & Hardened Identity Lockdown**:
  1. Cưỡng chế danh tính MSSV từ JWT token đã xác thực, phớt lờ mọi tham số do sinh viên hoặc LLM tự truyền trong công cụ gọi hàm (Tool Calling).
  2. Bắt buộc mô hình dừng lại hỏi làm rõ (`ASK_CLARIFICATION`) khi thiếu bất kỳ trường pháp lý nào, tuyệt đối không cho phép fallback ngầm.

---

## 4. TÍNH NĂNG LỚN NHẤT ĐÃ QUYẾT ĐỊNH CẮT GIẢM (THE BIGGEST SCOPE PRUNING)

Tính năng lớn nhất mà đội thi đã dũng cảm cắt bỏ hoàn toàn là: **Quy trình Đề nghị Xét tốt nghiệp Chuẩn đầu ra (Bao gồm hệ thống Multimodal Vision OCR kiểm định chứng chỉ Ngoại ngữ B1 và Kỹ năng mềm).**

* **Căn cứ cắt giảm thực tế:**  
  Sau buổi làm việc chuyên sâu cùng **Thầy Lê Trung Hiếu — Trợ lý Trưởng phòng Phòng Đào tạo HUTECH, Phụ trách Quản lý Hệ thống Học vụ Điện tử**, nhóm nhận thức rõ:
  1. Trong 18 thủ tục học vụ của trường, thủ tục "Đề nghị xét tốt nghiệp" thuộc nhóm *ngoài phạm vi siêu khó và cực kỳ nhạy cảm*. Đơn phải luân chuyển qua 4 cấp thẩm định (Khoa $\rightarrow$ Phòng Quản lý Đào tạo $\rightarrow$ Phòng Khảo thí $\rightarrow$ Hội đồng Xét tốt nghiệp Nhà trường) và liên quan trực tiếp đến **tính pháp lý văn bằng quốc gia**.
  2. Việc cố tình đưa AI tự động hóa vào quy trình này trong phạm vi Hackathon là thiếu trách nhiệm giải trình và không khả thi trong thực tế vận hành tổ chức.
* **Quyết định kỹ thuật chiến lược:**  
  Cắt bỏ toàn bộ quy trình Xét tốt nghiệp, dồn 100% nguồn lực hoàn thiện dứt điểm quy trình **Cấp Giấy xác nhận sinh viên** — thủ tục chiếm lưu lượng đơn từ lớn nhất (chính xác **36.994 biểu mẫu được sinh viên submit trong 1 năm học** theo kết quả truy vấn cơ sở dữ liệu thực tế do Cán bộ Tiếp nhận & Xử lý Hồ sơ cung cấp), giải quyết trọn vẹn cả 5 biểu mẫu thực tế của Phòng Công tác Sinh viên (CTSV) với độ tin cậy và minh bạch tuyệt đối.
