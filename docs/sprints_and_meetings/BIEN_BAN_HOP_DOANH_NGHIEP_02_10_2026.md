# 📝 BIÊN BẢN & ĐỊNH HƯỚNG CUỘC HỌP VỚI DOANH NGHIỆP (02/10/2026)
> **Đội thi:** KAISER — EduRef AI Agent  
> **Sự kiện:** MLAI Hackathon 2026 (Track VNG / Bảng 1 — OrganizationAI)  
> **Thời gian:** 10h00 – 11h45 | 02/10/2026  
> **Thành phần tham gia:** Cao Hữu Nhân, Trần Minh Quang, Trần Đức Tài  
> **Mục tiêu:** Đúc kết định hướng chỉ đạo trực tiếp từ Doanh nghiệp/BGK để điều chỉnh sản phẩm, kịch bản demo và bài thuyết trình Vòng Chung Kết.

---

## 📌 I. TỔNG HỢP 4 CÂU HỎI CỐT TỬ CỦA DOANH NGHIỆP & BAREM CHẤM THI

Doanh nghiệp và Ban Giám Khảo không chấm điểm theo tiêu chí "ai làm app nhanh nhất hay công nghệ phức tạp nhất", mà tập trung soi xét **4 trụ cột đánh giá**:

### 1. Agent có đủ tự chủ không? (Bounded Autonomy)
* **Yêu cầu:** Agent không phải lúc nào cũng đi hỏi người dùng những thứ ngớ ngẩn, nhưng cũng **tuyệt đối không được đoán bừa hay tự tiện phê duyệt** khi thiếu dữ kiện hoặc vượt thẩm quyền.
* **Nguyên tắc:** 
  - Hồ sơ thường quy hợp lệ $\rightarrow$ Tự động hoàn tất (Auto-approve).
  - Hồ sơ thiếu dữ kiện $\rightarrow$ Dừng lại hỏi đúng 1 câu (Ask Clarification).
  - Hồ sơ nghi vấn / ngoài danh mục / chạm trần $\rightarrow$ Chuyển tiếp Cán bộ (Escalate).
* **Khắc phục lỗi chí mạng:** Đặt trần cứng **`maxSteps = 5`** trong Orchestrator để triệt tiêu hoàn toàn nguy cơ lặp vô tận (infinite loop).

### 2. Tính minh bạch của giải pháp (Transparency & Accountability)
* **Yêu cầu:** Mọi quyết định của AI phải giải trình được: *Tại sao duyệt? Dựa trên điều khoản nào trong quy chế? Có căn cứ pháp lý không?*
* **Hiện thực hóa:** Hệ thống **Sổ cái kiểm toán bất biến (Cryptographic Audit Ledger SHA-256)** gắn liền với từng giao dịch, đảm bảo không thể sửa đổi hồi tố.

### 3. Tính trung thực & Tác động thực tế (Real-world Impact & Grounding)
* **Nguyên tắc:** **"Nhanh hơn không điểm cao — Không cần tốt nhất chỉ cần giải quyết đủ"**.
* Không dùng số liệu giả định hay số liệu ước lượng trên trời.
* Phải có **số liệu đo lường từ người dùng thật** (Cán bộ Phòng Đào tạo / Công tác Sinh viên, Sinh viên thực tế).
* **Minh chứng bắt buộc đưa vào Slide:**
  - Bảng số liệu thời gian thực tế: Thời gian thao tác (Touch Time) & Thời gian chờ (Idle Time).
  - Câu chuyện phỏng vấn trực tiếp Anh Hiếu (PĐT) và sinh viên.
  - Ảnh chụp thực tế nhóm làm việc cùng chuyên gia trước màn hình sản phẩm.

### 4. Kịch bản kiểm chứng tự phục vụ (Self-serve Test Cases & Video Demo)
* Giám khảo không có thời gian gõ prompt tự do rồi mò lỗi. Nhóm phải dọn sẵn kịch bản:
  - Cung cấp **Testcases chuẩn** và hướng dẫn rõ ràng để chính Ban Giám Khảo tự tay bấm chạy và thấy kết quả pass 100%.
  - Cần **1 Video Demo đầy đủ, sắc nét, dễ hình dung** toàn bộ luồng từ lúc sinh viên nộp đơn đến khi ra kết quả có mã QR và ghi sổ cái.

---

## 🎯 II. DANH MỤC HÀNH ĐỘNG CHI TIẾT (ACTION PLAN CHUNG KẾT)

| STT | Nhiệm vụ trọng tâm | Chi tiết kỹ thuật & Nghiệp vụ | Phụ trách chính |
| :---: | :--- | :--- | :---: |
| **1** | **Khóa trần dừng Agent (`maxSteps = 5`)** | Bổ sung biến đếm bước trong Agent loop. Nếu vượt quá 5 bước suy luận/gọi công cụ mà chưa ra kết luận $\rightarrow$ Dừng ngay và chuyển cán bộ với lý do `MAX_STEPS_EXCEEDED`. | **Cao Hữu Nhân** |
| **2** | **Chống gian lận & Lách luật (Anti-Cheat)** | Tinh chỉnh Prompt & Policy Shield để bắt các ca: cố tình viện dẫn phê duyệt miệng của Lãnh đạo, nợ học phí ngầm, dùng prompt injection ép hệ thống duyệt. | **Trần Đức Tài** |
| **3** | **Kịch bản kiểm thử cho BGK (Verify Harness)** | Đảm bảo trang Verify Harness có sẵn các nút bấm 1-Click để BGK tự kiểm thử 5 ca chuẩn mực (Auto, Ask, Deny, Escalate, Anti-bypass). Lệnh `npm test` backend pass 100%. | **Trần Minh Quang** |
| **4** | **Bảng Benchmark & Minh chứng thật cho Slide** | Đưa số liệu đo đạc Touch Time & Idle Time từ buổi làm việc với Anh Hiếu vào Slide 3. Đính kèm ảnh chụp thực tế phỏng vấn chuyên gia. | **Hữu Nhân & Trọng Trà** |
| **5** | **Sản xuất Video Demo hoàn chỉnh (2–3 phút)** | Quay video trực quan, sắc nét: (1) Nộp đơn thường quy duyệt 1s; (2) Ca thiếu thông tin AI hỏi lại; (3) Ca vượt quyền chuyển Cán bộ; (4) Khám phá Sổ cái SHA-256. | **Cả đội** |

---

## 💬 III. NGUYÊN VĂN GHI CHÉP BUỔI HỌP NỘI BỘ (RAW LOGS)

> *Dưới đây là biên bản tin nhắn trao đổi thời gian thực giữa các thành viên đội thi KAISER ngày 02/10/2026:*

\`\`\`text
[02/10/2026 10:06:51] Hữu Nhân: cap slide nha ae
[02/10/2026 10:10:04] Hữu Nhân: đặt vị trí bên trong tổ chức
[02/10/2026 10:10:52] Hữu Nhân: =>>>> đặt vị trí bên trong trường học
[02/10/2026 10:11:54] Hữu Nhân: =>>>> cần tìm hiểu luồng giấy xnsv cán bộ PĐT
[02/10/2026 10:12:53] Hữu Nhân: bugggg lớn của hệ thống hiện tại AI Agent biết khi nào ngừng lại nhưng chính nó k ngừng lại được
[02/10/2026 10:14:06] Hữu Nhân: làm gi khi nào trên dữ nào tại sao người đó phải dừng được nó
[02/10/2026 10:14:28] Hữu Nhân: ====>>> cần phỏng vấn Cán bộ PĐT
[02/10/2026 10:14:48] Hữu Nhân: nhanh hơn không điểm cao
[02/10/2026 10:15:00] Hữu Nhân: =>>>> cần deloy cho sinh viên dùng thử và đánh giá
[02/10/2026 10:15:40] Hữu Nhân: không đơ giãn là hệ thống chạy được là ok
[02/10/2026 10:15:51] Hữu Nhân: mà phải có số liệu có đánh giá từ người thật
[02/10/2026 10:18:18] Hữu Nhân: minh bạch như nào
[02/10/2026 10:18:25] Hữu Nhân: =>>>> audit log
[02/10/2026 10:18:33] Hữu Nhân: trung thực trên sản phẩn hiện tại
[02/10/2026 10:19:03] Hữu Nhân: =>>>> kể chuyện phỏng vấn trực tiếp từ phỏng vấn sinh viên , cán bộ phòng đào tạo
[02/10/2026 10:19:22] Hữu Nhân: có ảnh chụp trực tiếp =>>>> đưa vào slide
[02/10/2026 10:25:55] Tài: chống lách luật các case ai phải nhận ra các nội dung ẩn để ko cho pass
[02/10/2026 10:28:48] Trần Minh Quang: Mục tiêu ai là người dùng
Agent có đủ tự chủ ko -> Agent ko phải lúc nào cũng hỏi và cũng ko bao h hỏi
Cần chạy thực tiễn
Cho testcase và hướng dẫn chạy -> cần kịch bản test
feedback giúp improve sản phẩm như thế nào

1. Agent tự chủ không
2. Tính minh bạch của giải pháp
3. Trung thực tác dọng của agent
4. kịch bản cách chạy như thế nào

AI có thể nhận ra được lỗi, cheat từ người dùng?
[02/10/2026 10:45:26] Hữu Nhân: ----> video deex hình dung
[02/10/2026 10:45:46] Hữu Nhân: đưa test case làm sao ban giám khảo chạy được test case đó
[02/10/2026 11:41:15] Trần Minh Quang: Mục tiêu ai là người dùng
Agent có đủ tự chủ ko -> Agent ko phải lúc nào cũng hỏi và cũng ko bao h hỏi
Cần chạy thực tiễn
Cho testcase và hướng dẫn chạy -> cần kịch bản test
feedback giúp improve sản phẩm như thế nào

1. Agent tự chủ không
2. Tính minh bạch của giải pháp
3. Trung thực tác dọng của agent
4. kịch bản cách chạy như thế nào

AI có thể nhận ra được lỗi, cheat từ người dùng?
không cần tốt nhất chỉ cần giải quyết đủ
Cần 1 video test đầy đủ
buổi chung kết có thể hỏi đáp được về pitching và các phần liên quan
\`\`\`

---

## 🏆 IV. THÔNG ĐIỆP BẢN LĨNH CHO BUỔI PITCHING CHUNG KẾT
> *"EduRef AI không cố gắng trở thành một mô hình AI biết trả lời mọi câu hỏi của vũ trụ. Chúng tôi giải quyết đúng và trọn vẹn một bài toán thực tế: **Trở thành Trọng tài số đáng tin cậy trong quy trình Cấp Giấy Xác Nhận Sinh Viên** — tự động hóa 80% thủ tục thường quy, phát hiện chuẩn xác 100% gian lận lách luật, và dừng lại đúng lúc để trao quyền quyết định cho Cán bộ Đào tạo với Sổ cái kiểm toán minh bạch."*
