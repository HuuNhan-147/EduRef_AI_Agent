# 🛠️ NHẬT KÝ PHÁT TRIỂN (BUILD LOG) — DỰ ÁN EDUREF AI
### **MLAI Hackathon 2026 — Bảng 1: OrganizationAI (Track VNG — The Escalation Referee)**
> **Đội thi:** KAISER · **Thành viên:** Cao Hữu Nhân (Lead), Trần Đức Tài, Trần Minh Quang  
> **Thời gian thực hiện:** 19/09/2026 – 15/10/2026 · **Đơn vị chủ quản:** Trường Đại học Bách khoa (HCMUT) × Trường Đại học Công nghệ TP.HCM (HUTECH)

---

## 1. CÔNG CỤ AI ĐÃ SỬ DỤNG (AI TOOLCHAIN)

Dự án áp dụng mô hình phân tách rõ ràng giữa **AI Trợ lý Kỹ thuật (Engineering AI)** và **AI Vận hành Sản phẩm (Runtime AI)**:

1. **AI Hỗ trợ Phát triển Hệ thống (Engineering Pair-Programming):**
   - **Google DeepMind Antigravity IDE (Agentic Engine powered by Gemini 3.8):** Mặc dù Ban tổ chức đã cấp quyền truy cập OpenAI Codex, đội thi đã đưa ra quyết định độc lập: **Chọn Google DeepMind Antigravity IDE làm nền tảng phát triển duy nhất xuyên suốt toàn bộ vòng đời dự án.**
   - *Lý do lựa chọn:* Năng lực thấu hiểu toàn cảnh không gian làm việc (Full-Workspace Context Awareness), khả năng suy luận kiến trúc đa tệp phức tạp, thực thi terminal tự trị, và cơ chế bảo chứng chất lượng mã nguồn nghiêm ngặt (Zero-Regression Enforcement).
2. **AI Vận hành Thực tế trong Sản phẩm (Product Runtime AI):**
   - **Google Gemini 2.0 Flash Lite (`gemini-flash-lite-latest`):** Tích hợp qua API với cơ chế truyền phát mã thông báo Server-Sent Events (SSE Streaming) và Function Calling đa bước (Multi-step Tool Calling), đóng vai trò Cổng nhận thức ngôn ngữ tự nhiên (Cognitive Ingestion Gateway).

---

## 2. TÍNH HIỆU QUẢ CỦA CÔNG CỤ AI

Sự kết hợp giữa tư duy kiến trúc của nhóm và năng lực thực thi của **Antigravity (Gemini 3.8)** mang lại bước nhảy vọt về hiệu suất:
- **Tốc độ tái cấu trúc an toàn (Safe Refactor Velocity):** Tái cấu trúc thành công toàn bộ hệ thống từ mô hình phân mảnh sang kiến trúc **Unified Pipeline (5 chốt chặn, 4 trạng thái kết thúc)** bám sát 100% sơ đồ StarUML [`SoDoHeThong_EduRef_AI.mdj`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/SoDoHeThong_EduRef_AI.mdj).
- **Bảo chứng Kiểm thử Tự động (Zero-Regression Testing):** Antigravity hỗ trợ thiết kế và thực thi toàn diện bộ kiểm thử hồi quy khắt khe, đạt **54/54 bài kiểm thử vượt qua tuyệt đối (100% PASS)** trên toàn bộ các tầng: Logic quy chế HUTECH, An ninh ranh giới JWT, Sổ cái Merkle SHA-256 và Bounded Autonomy.
- **Tối ưu hóa Băng thông & Chi phí:** Tinh chỉnh prompt có cấu trúc và thiết lập trần an toàn giúp giảm 35% lượng token tiêu thụ trên mỗi phiên hội thoại của sinh viên.

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
  Sau buổi làm việc chuyên sâu cùng **Anh Hiếu — Kỹ sư trưởng phụ trách Hệ thống Học vụ Điện tử Trường Đại học HUTECH**, nhóm nhận thức rõ:
  1. Trong 18 thủ tục học vụ của trường, thủ tục "Đề nghị xét tốt nghiệp" thuộc nhóm *ngoài phạm vi siêu khó và cực kỳ nhạy cảm*. Đơn phải luân chuyển qua 4 cấp thẩm định (Khoa $\rightarrow$ Phòng Quản lý Đào tạo $\rightarrow$ Phòng Khảo thí $\rightarrow$ Hội đồng Xét tốt nghiệp Nhà trường) và liên quan trực tiếp đến **tính pháp lý văn bằng quốc gia**.
  2. Việc cố tình đưa AI tự động hóa vào quy trình này trong phạm vi Hackathon là thiếu trách nhiệm giải trình và không khả thi trong thực tế vận hành tổ chức.
* **Quyết định kỹ thuật chiến lược:**  
  Cắt bỏ toàn bộ quy trình Xét tốt nghiệp, dồn 100% nguồn lực hoàn thiện dứt điểm quy trình **Cấp Giấy xác nhận sinh viên** — thủ tục chiếm tới **70% tổng lưu lượng đơn từ** (hơn 50.000 lượt/năm), giải quyết trọn vẹn cả 5 biểu mẫu thực tế của Phòng Công tác Sinh viên (CTSV) với độ tin cậy và minh bạch tuyệt đối.
