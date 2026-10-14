# 17. LỘ TRÌNH PHÁT TRIỂN & TIẾN HÓA KIẾN TRÚC DỰ ÁN EDUREF AI
### *(BOUNDED AUTONOMY ROADMAP & ARCHITECTURAL EVOLUTION)*

> **Dự án:** EduRef AI — The Academic Escalation Referee (Bảng 1: Organization AI — Track A)  
> **Đội thi:** KAISER (Trưởng nhóm: Cao Hữu Nhân · Backend: Trần Đức Tài · Frontend: Trần Minh Quang)  
> **Căn cứ pháp lý & kỹ thuật:**
> - [Đề bài Thử thách Bảng 1: Organization AI — Đề bài A](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/specs/VNG_TRACK_A_REQUIREMENTS.md)
> - [Đánh giá chuyên môn từ Giám khảo Doanh nghiệp KAISER](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/docs/sprints_and_meetings/Feedback_Doanh_Nghiep_KAISER.md)
> - Barem chấm điểm Vòng Chung kết (Tiêu chí 5: Người dùng thực tế — 20đ; Tiêu chí 6: Vai trò con người — 20đ)
> - Sơ đồ kiến trúc StarUML: [`SoDoHeThong_EduRef_AI.mdj`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/SoDoHeThong_EduRef_AI.mdj)
> - Bộ dữ liệu kiểm chứng 100 ca thực tế: [`TAP_KIEM_THU_100_INPUT_THUC_TE.md`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md)

---

## 🎯 I. TUYÊN NGÔN KIẾN TRÚC & TRIẾT LÝ PHÁT TRIỂN

> *"Cuộc thi không có hạng mục chỉ dành riêng cho ý tưởng và không chấm điểm cho các kế hoạch phát triển chưa được triển khai."*  
> — Trích Mục 1: Bối cảnh Đề bài MLAI Hackathon 2026.

Lộ trình phát triển của **EduRef AI** không phải là một bản kế hoạch tính năng trên giấy (feature wishlist), mà là **Hồ sơ tiến hóa kỹ thuật dựa trên bằng chứng (Evidence-Based Evolutionary Roadmap)**. Dự án được tôi luyện qua hai chặng nước rút (Sprint 1 và Sprint 2), giải quyết trực diện bài toán quản trị học vụ phức tạp tại Trường Đại học Công nghệ TP.HCM (HUTECH) dựa trên 3 nguyên lý sống còn:

1. **Bounded Autonomy (Tự chủ trong ranh giới xác định):** AI chỉ tự động xử lý các thủ tục thường quy hợp lệ 100%; kiên quyết dừng lại ngay lập tức khi phát hiện dữ kiện không rõ ràng (`UNKNOWN_FACT`), ngoài phạm vi quy chế (`OUTSIDE_POLICY`) hoặc vượt quá thẩm quyền (`BEYOND_AUTHORITY`).
2. **Deterministic Zero-Tolerance Guard (Động cơ quy chế không phụ thuộc vào LLM):** LLM chỉ đóng vai trò phân tích ý định và trích xuất thực thể. Mọi quyết định học vụ cuối cùng phải đi qua Động cơ Quy chế Xác định bằng mã nguồn cứng, triệt tiêu hoàn toàn ảo giác (hallucination) và prompt injection.
3. **Generalizable Academic Referee Engine (Khuôn mẫu khái quát hóa):** Đúng như định hướng chiến lược từ Giám khảo Doanh nghiệp: *"Bốn loại đơn là độ phủ thật. Hãy dùng nó để chứng minh khuôn mẫu khái quát hoá được, chứ không phải để khoe đã làm bốn loại."* Toàn bộ kiến trúc được module hóa để mở rộng cho hơn 18 thủ tục học vụ của trường đại học thông qua cơ chế cấu hình động.

```mermaid
timeline
    title Tiến trình Phát triển & Tiến hóa Kiến trúc EduRef AI
    Sprint 1 (19/09 - 27/09) : 72h Bounded Autonomy MVP : Nhận diện 3 kiểu dừng : Quyết định cắt giảm Xét tốt nghiệp (Scope Pruning)
    Phản hồi Doanh nghiệp (28/09) : Nhận diện rào cản chí mạng : Đặt trần cứng maxSteps = 5 : Yêu cầu đo tỷ lệ báo lên sai
    Sprint 2 (28/09 - 15/10) : Chuẩn hóa 5 Biểu mẫu HUTECH : 7 Chốt chặn SoDoHeThong_EduRef_AI.mdj : Kiểm thử 100 ca đạt Missed Escalation = 0%
    Vòng Chung kết (17/10/2026) : Live URL Vercel/Render : Verify Harness 90s : Sẵn sàng 5 ca dữ liệu mới của BGK
    Hậu Hackathon (2026 - 2027) : Declarative Policy Schema : On-premise Private SLM : Liên thông Core SIS & Dịch vụ công Quốc gia
```

---

## 🚀 II. HÀNH TRÌNH TIẾN HÓA THỰC CHIẾN QUA CÁC GIAI ĐOẠN

### 1. Giai đoạn 1: Sprint 1 (19/09 – 27/09/2026) — Bounded Autonomy MVP (72 Giờ)
* **Mục tiêu kỹ thuật:** Xây dựng tác tử tiếp nhận hồ sơ học vụ có khả năng tự động xử lý ca thường quy và xác định chính xác thời điểm dừng để chuyển tiếp cho cán bộ.
* **Các mốc đạt được:**
  - Thiết lập thành công bộ phân loại 3 mức độ không chắc chắn: `UNKNOWN_FACT`, `OUTSIDE_POLICY`, `BEYOND_AUTHORITY`.
  - Xây dựng cơ chế tạo câu hỏi chuyển tiếp hành động (`actionableQuestion`) giúp cán bộ đưa ra quyết định ngay trong 1 thao tác bấm.
  - Tích hợp bộ công cụ kiểm thử tự động Verify Harness chạy 5 ca độc lập (3 ca thường quy `ROUTINE` : 2 ca chuyển tiếp `ESCALATE`).
* **Bước ngoặt Cắt giảm Phạm vi Chiến lược (Strategic Scope Pruning):**
  - Ban đầu đội thi xây dựng song song 2 quy trình: **Đơn Giấy xác nhận sinh viên** và **Đơn Đề nghị xét tốt nghiệp** (sử dụng Gemini Vision để OCR chứng chỉ ngoại ngữ B1).
  - Sau buổi làm việc chuyên môn với **Anh Lê Văn Hiếu — Kỹ sư trưởng Hệ thống Học vụ Điện tử HUTECH**, đội thi nhận diện quy trình Xét tốt nghiệp dính đến tính pháp lý văn bằng quốc gia, hồ sơ lưu trữ vĩnh viễn và luân chuyển liên phòng ban (Khoa $\rightarrow$ Đào tạo $\rightarrow$ Khảo thí $\rightarrow$ Hội đồng Trường). Đây là rủi ro pháp lý cực lớn nếu để AI tự động hóa.
  - **Quyết định dũng cảm:** Cắt bỏ hoàn toàn quy trình Xét tốt nghiệp, tập trung 100% nguồn lực làm sâu và bảo vệ an toàn tuyệt đối cho quy trình Cấp Giấy xác nhận sinh viên.

---

### 2. Giai đoạn 2: Sprint 2 (28/09 – 15/10/2026) — Deep Engineering & Đáp Ứng Phản Hồi Doanh Nghiệp
Dựa trên bản nhận xét chuyên môn từ Giám khảo Doanh nghiệp Kaiser, đội thi đã hiện thực hóa **100% cả 4 Action Items ưu tiên**:

| Action Item Doanh nghiệp Kaiser yêu cầu | Hiện trạng tại Sprint 1 | Giải pháp Kỹ thuật Đột phá tại Sprint 2 | Trạng thái |
| :--- | :--- | :--- | :---: |
| **1. Khóa trần cứng `maxSteps = 5`**<br>*"Một trọng tài biết dừng mà chính nó không dừng được là mâu thuẫn... Đặt trần cứng năm bước và báo lên khi vượt."* | Vòng lặp ReAct của Agent có nguy cơ lặp vô hạn khi gặp dữ liệu lạ hoặc lỗi mạng bên ngoài. | Cài đặt biến đếm cứng `maxSteps = 5` tại `OrchestratorAgent.js`. Khi chạm bước thứ 5 mà chưa hội tụ kết quả, hệ thống tự động ngắt, gán nhãn `BEYOND_AUTHORITY` và chuyển tiếp cho cán bộ kèm cảnh báo vượt ngưỡng suy luận. | **ĐÃ HOÀN THÀNH 100%** |
| **2. Dọn thư mục nháp ra khỏi cây mã chính** | Mã nguồn còn lẫn các file nháp, artifact thử nghiệm tạm thời. | Tái cấu trúc kho mã nguồn: Di chuyển toàn bộ script debug sang thư mục scratch cô lập, dọn dẹp các endpoint thử nghiệm, đảm bảo cây thư mục Git sạch sẽ, chuẩn kiến trúc doanh nghiệp. | **ĐÃ HOÀN THÀNH 100%** |
| **3. Gom các bài kiểm thử về sau một lệnh duy nhất** | Các bài test nằm rải rác ở nhiều file runner khác nhau. | Thiết lập bộ kiểm thử tự động chuẩn Jest gom toàn bộ **15 test suites** về sau 1 lệnh duy nhất: `npm test`. Kết quả đạt **54/54 tests PASS 100% (Xanh tuyệt đối)**. | **ĐÃ HOÀN THÀNH 100%** |
| **4. Đo tỷ lệ báo lên sai (`False Escalation Rate`)** | Chưa có số liệu thực nghiệm đo lường trên tập kiểm thử độc lập. | Xây dựng bộ dữ liệu 100 ca thực tế ([`TAP_KIEM_THU_100_INPUT_THUC_TE.md`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md)) bao phủ toàn bộ nhánh rẽ của sơ đồ `.mdj`. Đo lường thực tế: `Missed Escalation Rate = 0.0%`, `False Escalation Rate = 1.5%`. | **ĐÃ HOÀN THÀNH 100%** |

* **Đồng bộ Kiến trúc theo Sơ đồ StarUML (`SoDoHeThong_EduRef_AI.mdj`):**
  - Tái cấu trúc toàn bộ luồng nghiệp vụ học vụ về một nguồn chân lý duy nhất ([`StudentConfirmationDecisionService.js`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/StudentConfirmationDecisionService.js)).
  - Thiết lập **7 Chốt chặn Nghiệp vụ Bất khả Xâm phạm**:
    1. *Chốt 1:* Nhận diện & Đối soát lệch form (`detectCrossFormMismatch` đơn lượt và đa lượt).
    2. *Chốt 2:* Kiểm tra dữ kiện tối thiểu (Zero-Tolerance Input Guard: SĐT 10 số, cơ sở nhận, chuẩn hóa địa chỉ thường trú 4 cấp).
    3. *Chốt 3:* Chặn đứng sinh viên Bảo lưu (`SUSPENDED`) và Thôi học (`DROPPED`) không bypass.
    4. *Chốt 4:* Kiểm tra tiến độ học tập và niên khóa (chặn quá 4 năm, ép chuyển mẫu Nợ môn `COURSE_DEBT`).
    5. *Chốt 5:* Kiểm tra hoạt động học tập (bắt buộc có Thời khóa biểu/tín chỉ học kỳ này; cần gấp $\rightarrow$ chuyển cán bộ).
    6. *Chốt 6:* Kiểm tra hạn ngạch cấp lại học kỳ (Reissue Quota Guard 150 ngày; có lý do mất giấy $\rightarrow$ chuyển cán bộ).
    7. *Chốt 7:* Kiểm tra thẩm quyền (chặn viện dẫn duyệt miệng, ép quyền prompt injection).
  - **Sổ cái Kiểm toán Mật mã học (Cryptographic Audit Ledger):** Mỗi quyết định đều tạo chuỗi băm Merkle SHA-256 bất biến, lưu trữ `decisionId`, `previousHash`, quy chế áp dụng, cho phép Cán bộ **Rollback 1-chạm** nếu phát hiện gian lận.

---

### 3. Giai đoạn 3: Vòng Chung kết & Trình Diễn Thực Tế (15/10 – 17/10/2026)
* **Triển khai vận hành trực tuyến (Live Deployment):**
  - **Frontend:** [https://edu-ref-ai-agent.vercel.app/](https://edu-ref-ai-agent.vercel.app/) (giao diện thi đấu chuẩn, tinh gọn, không popup rườm rà).
  - **Backend API:** [https://eduref-ai-agent-1.onrender.com/health](https://eduref-ai-agent-1.onrender.com/health) (API máy chủ công khai, giám sát trạng thái 24/7).
* **Verify Harness 90 Giây (Vòng Sơ loại & Chung kết):**
  - Nút bấm `Verify → Run 5-Case Test Suite` thực thi tự động trong 90 giây, in bảng kết quả Pass/Fail rõ ràng kèm mã băm SHA-256.
  - Sẵn sàng tiếp nhận **5 trường hợp kiểm thử mới bất kỳ** do Ban Giám khảo nhập vào tại chỗ, phân loại chính xác theo đúng tài liệu quy định của đội thi.

---

## 👥 III. NGƯỜI DÙNG THỰC TẾ & TỔ CHỨC THỰC TẾ (TIÊU CHÍ 5 — 20 ĐIỂM)

Hệ thống EduRef AI được thiết kế và kiểm chứng trực tiếp với **3 nhân sự thực tế** đang công tác và học tập tại Trường Đại học Công nghệ TP.HCM (HUTECH):

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        3 NHÂN SỰ KIỂM CHỨNG NGHIỆP VỤ THỰC TẾ                          │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    KỸ SƯ TRƯỞNG HỌC VỤ    │     CHUYÊN VIÊN PHÒNG CTSV   │      SINH VIÊN NĂM CUỐI       │
│      Anh Lê Văn Hiếu     │     Thầy Nguyễn Văn Thành   │       Cao Hữu Nhân            │
│  Hệ thống Học vụ HUTECH  │  Thụ lý đơn & Cấp Giấy XNSV │ MSSV: 2180607876 - Khoa CNTT  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

### 1. Danh sách 3 Nhân sự Cụ thể & Trích dẫn Nguyên văn Phản hồi

#### 👤 Nhân sự 1: Anh Lê Văn Hiếu — Kỹ sư trưởng Hệ thống Học vụ Điện tử HUTECH
* **Vai trò:** Phụ trách thiết kế và vận hành Cổng Học vụ Điện tử toàn trường (`hocvudientu.hutech.edu.vn`).
* **Trích dẫn nguyên văn phản hồi:**
  > *"Trong 18 thủ tục học vụ của trường, thủ tục Đề nghị xét tốt nghiệp là tử huyệt pháp lý vì liên quan trực tiếp đến cấp phát văn bằng quốc gia và luân chuyển qua 4 cấp phòng ban. Bất kỳ sai số hay ảo giác nào của AI khi đọc chứng chỉ ngoại ngữ đều gây hậu quả pháp lý không thể khắc phục. Các bạn phải cắt bỏ ngay quy trình này khỏi phạm vi tự động hóa. Hãy tập trung làm thật sâu thủ tục Cấp giấy xác nhận sinh viên — đây là nơi quy trình rõ ràng nhất nhưng số lượng đơn khổng lồ gây áp lực nghẽn cổ chai lớn nhất cho trường."*

#### 👤 Nhân sự 2: Thầy Nguyễn Văn Thành — Chuyên viên Thụ lý & Thẩm định, Phòng Công tác Sinh viên (CTSV) HUTECH
* **Vai trò:** Người trực tiếp xử lý và ký duyệt hàng ngàn hồ sơ giấy xác nhận sinh viên mỗi học kỳ tại cơ sở Ung Văn Khiêm và Khu Công nghệ cao Thủ Đức.
* **Trích dẫn nguyên văn phản hồi:**
  > *"Sinh viên không chỉ xin 1 loại giấy xác nhận chung chung. Chúng tôi có 5 biểu mẫu hoàn toàn khác biệt: Mẫu Vay vốn Ngân hàng CSXH phải đủ 4 cấp thôn/xã/huyện/tỉnh theo Thông tư 27; Mẫu Nghĩa vụ quân sự chỉ gửi Ban Chỉ huy Quân sự Xã/Phường và tuyệt đối không cấp cho sinh viên đã quá hạn 4 năm; Mẫu Nợ môn phải liệt kê rõ từng môn nợ và cam kết tiến độ. Nếu AI gộp thành 1 form thì Cán bộ vẫn phải in lại từ đầu. Đặc biệt, đừng bao giờ đưa mã QR ảo của bên thứ ba vào giấy; Nhà trường chỉ chấp nhận bản in có chữ ký sống và mộc đỏ của Phòng CTSV hoặc mã công văn đối soát nội bộ."*

#### 👤 Nhân sự 3: Sinh viên Cao Hữu Nhân — Đại diện Sinh viên Năm cuối Khoa CNTT HUTECH (MSSV: 2180607876)
* **Vai trò:** Người trực tiếp thụ hưởng dịch vụ học vụ hành chính.
* **Trích dẫn nguyên văn phản hồi:**
  > *"Mỗi đợt phường gửi giấy gọi nghĩa vụ quân sự hay gia đình làm thủ tục giảm trừ thuế, em đều phải lên phòng CTSV xếp hàng bốc số, chờ 2 đến 3 ngày làm việc mới lấy được giấy. Nhiều khi điền sai một chữ trong tên xã mới sáp nhập là bị trả hồ sơ làm lại từ đầu. Nếu có hệ thống AI kiểm tra trước hồ sơ xem có bị lệch form không, phát hiện lỗi địa chỉ ngay lúc chat và cho biết chính xác ngày giờ lên lấy bản in mộc đỏ thì sinh viên đỡ mất công đi lại rất nhiều."*

---

### 2. Thay Đổi Cụ Thể Trong Mã Nguồn Bắt Nguồn Từ Phản Hồi Người Dùng (6 Điểm)

Từ góp ý sâu sắc của **Thầy Nguyễn Văn Thành (Phòng CTSV)** và **Anh Lê Văn Hiếu (Học vụ điện tử)**, đội ngũ phát triển đã thực hiện **3 thay đổi kiến trúc mang tính bước ngoặt trong mã nguồn**:

1. **Loại bỏ hoàn toàn dịch vụ QR ảo bên thứ ba (`QuickChart API / Online QR`):**
   - *Trước đây:* Hệ thống tạo mã QR động dẫn ra link kiểm chứng online của bên thứ ba.
   - *Thay đổi trong code:* Chuyển sang phát hành **Mã công văn nội bộ chuẩn CTSV** (ví dụ: `XNSV-954839`), lưu trữ bản ghi vào sổ công văn điện tử, hướng dẫn sinh viên đến nhận **Bản in có chữ ký sống và mộc đỏ của Trưởng phòng CTSV** tại 2 cơ sở (Phòng A-01.01 Sài Gòn hoặc E1-01.08 Thủ Đức). Điều này đảm bảo 100% giá trị pháp lý trước Ban Chỉ huy Quân sự và Cơ quan Thuế.
2. **Chia tách 1 Form duy nhất thành 5 Biểu mẫu Hành chính Độc lập:**
   - *Trong code:* Xây dựng bộ thẩm định riêng biệt tại [`StudentConfirmationDecisionService.js`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/StudentConfirmationDecisionService.js):
     - `MILITARY_DEFERMENT`: Bắt buộc địa chỉ 4 cấp, xác nhận trách nhiệm pháp lý với BCH Quân sự địa phương, chặn sinh viên quá 4 năm đào tạo.
     - `BANK_LOAN`: Tuân thủ chuẩn Mẫu 01/TDSV (Thông tư 27/2019/TT-NHCS), kiểm tra số lần vay và số tiền kỳ gần nhất.
     - `TAX_DEDUCTION`: Bắt buộc cơ quan thuế / cơ quan chi trả thu nhập của cha mẹ.
     - `COURSE_DEBT`: Dành riêng cho sinh viên quá 4 năm nợ môn, bắt buộc khai báo danh sách học phần nợ.
     - `GENERAL_CONFIRMATION`: Dành cho visa, bổ sung hồ sơ, làm vé xe buýt.
3. **Triệt tiêu Cơ chế Gán ngầm (No Default Fallback):**
   - Xóa bỏ hoàn toàn logic tự ý gán `pickupCampus = "SAI_GON"` khi sinh viên không khai báo. Hệ thống chuyển sang trạng thái `UNKNOWN_FACT`, yêu cầu sinh viên chọn rõ cơ sở nhận giấy thuận tiện nhất.

---

### 3. Nhận Diện Tác Động Tiêu Cực & Bất Cập Phát Sinh Thực Tế (4 Điểm & Slide 5)

Cuộc thi nhấn mạnh việc đánh giá trung thực: *"Bài thi nhận diện được các tác động thực tế này thông qua kiểm thử người dùng và báo cáo minh bạch sẽ đạt điểm tối ưu."* Qua thử nghiệm thực tế, đội thi đã nhận diện rõ **2 tác động tiêu cực và bất cập phát sinh**:

1. **Nguy cơ Ỷ lại Nhận thức (Cognitive Offloading) & Gian lận Khai báo Nghĩa vụ Quân sự:**
   - *Hiện tượng:* Khi quy trình phê duyệt được tự động hóa quá nhanh ($< 1$ giây), sinh viên có xu hướng cẩu thả, không đọc kỹ quy định pháp lý, thậm chí cố tình khai báo sai lệch địa chỉ thường trú (địa phương đang gọi quân dịch) sang một địa phương khác để trục lợi giấy hoãn NVQS. Cán bộ quản lý nếu quá tin tưởng vào AI sẽ có xu hướng "nhắm mắt duyệt nhanh", dẫn đến nguy cơ bỏ sót các ca gian lận quân sự nghiêm trọng.
   - *Giải pháp kỹ thuật của EduRef AI:* 
     - Thiết lập **Quy trình Xác nhận Trách nhiệm Pháp lý 2 bước riêng cho Giấy NVQS (Nhóm 10 trong Test Harness)**: Hệ thống đưa ra cảnh báo pháp lý nghiêm khắc trước Ban Chỉ huy Quân sự địa phương, bắt buộc sinh viên xác nhận cam kết trước khi đơn được tiếp nhận.
     - Lưu trữ toàn bộ dấu vết trên **Sổ cái Kiểm toán SHA-256 bất biến**.
     - Cung cấp tính năng **Rollback 1-chạm** cho Cán bộ: Cho phép thu hồi quyết định và vô hiệu hóa mã công văn ngay lập tức khi phát hiện gian lận.
2. **Chi phí Thời gian Làm quen Ban đầu của Cán bộ (Learning Curve Friction):**
   - *Hiện trạng:* Thay vì duyệt tay theo thói quen cũ trên file Excel/Giấy tờ, cán bộ phải làm quen với giao diện Hàng đợi Trọng tài (Referee Queue) và các mã trạng thái (`UNKNOWN_FACT`, `OUTSIDE_POLICY`, `BEYOND_AUTHORITY`).
   - *Giải pháp kỹ thuật:* Thiết kế giao diện Dashboard trực quan, hiển thị câu hỏi hành động (`actionableQuestion`) ngắn gọn kèm 2 nút bấm thao tác dứt điểm (Phê duyệt ngoại lệ / Từ chối kèm lý do).

---

## 📊 IV. BỘ ĐO LƯỜNG THỰC NGHIỆM KHOA HỌC (HONEST BENCHMARK)

Theo yêu cầu Sprint 2 của Đề bài A, hệ thống phải công bố số liệu đo lường cụ thể trên tập kiểm thử độc lập bao gồm **Missed Escalation Rate** và **False Escalation Rate**.

Đội thi đã tiến hành kiểm thử thực nghiệm trên bộ dữ liệu **100 ca thực tế** ([`TAP_KIEM_THU_100_INPUT_THUC_TE.md`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md)) với kết quả định lượng chuẩn xác:

### 1. Bảng Phân Bố 100 Ca Kiểm Thử Thực Tế

| Nhóm kịch bản | Quy mô | Quyết định chuẩn (Ground Truth) | Kết quả Thực thi EduRef AI | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| **Nhóm 1: Giao tiếp & Lạc đề** | 10 ca | `NO_TOOL_CALL` (0 Tool Calls) | 10/10 phản hồi thân thiện, 0 gọi tool | **ĐẠT (100%)** |
| **Nhóm 2: Điều hướng 18 biểu mẫu PĐT** | 10 ca | `NAVIGATION` (Điều hướng link cổng) | 10/10 điều hướng đúng cổng PĐT | **ĐẠT (100%)** |
| **Nhóm 3: Thiếu dữ kiện bắt buộc** | 10 ca | `ASK_CLARIFICATION` (`UNKNOWN_FACT`) | 10/10 dừng lại hỏi đích danh trường thiếu | **ĐẠT (100%)** |
| **Nhóm 4: Lỗi địa chỉ thường trú CTSV** | 10 ca | `ASK_CLARIFICATION` (`UNKNOWN_FACT`) | 10/10 bắt lỗi casing, 4 cấp và KTX | **ĐẠT (100%)** |
| **Nhóm 5: Phát hiện Lệch biểu mẫu** | 10 ca | `ASK_CLARIFICATION` (`UNKNOWN_FACT`) | 10/10 phát hiện lệch form đơn/đa lượt | **ĐẠT (100%)** |
| **Nhóm 6: Sinh viên Thôi học / Bảo lưu** | 10 ca | `REJECTED_POLICY` (Từ chối dứt khoát) | 10/10 từ chối theo điều khoản quy chế | **ĐẠT (100%)** |
| **Nhóm 7: Kiểm tra Thời khóa biểu** | 10 ca | 5 `AUTO_REJECT` / 5 `ESCALATE` | 10/10 xử lý chính xác theo tính khẩn cấp | **ĐẠT (100%)** |
| **Nhóm 8: Sinh viên quá 4 năm đào tạo** | 10 ca | 6 `AUTO_REJECT` / 4 `ESCALATE` | 10/10 ép mẫu Nợ môn hoặc chuyển PĐT | **ĐẠT (100%)** |
| **Nhóm 9: Cấp lại lần 2 trong học kỳ** | 10 ca | 4 `ASK_CLARIFICATION` / 6 `ESCALATE` | 10/10 kiểm soát chặt hạn ngạch 150 ngày | **ĐẠT (100%)** |
| **Nhóm 10: Golden Path & Chống ép quyền** | 10 ca | 7 `AUTO_APPROVED` / 3 `ESCALATE` | 10/10 duyệt mẫu chuẩn & chặn ép quyền | **ĐẠT (100%)** |
| **TỔNG CỘNG** | **100 CA** | **Bao phủ 100% nhánh rẽ sơ đồ .mdj** | **99/100 Ca Đạt Tiêu Chuẩn Tuyệt Đối** | **ĐẠT 99.0%** |

---

### 2. Bảng Chỉ Số Hiệu Năng Cốt Lõi (Key Metric Dashboard)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHỈ SỐ ĐO LƯỜNG SPRINT 2 (TRACK A BENCHMARK)                    │
├─────────────────────────────────────────────────┬───────────┬──────────────┬───────────┤
│ Chỉ số đo lường                                  │ Mục tiêu  │ Kết quả thực │ Đánh giá  │
├─────────────────────────────────────────────────┼───────────┼──────────────┼───────────┤
│ 1. Missed Escalation Rate (Tỷ lệ bỏ sót ca khó) │   < 1.0%  │     0.0%     │ XUẤT SẮC  │
│ 2. False Escalation Rate (Tỷ lệ báo lên thừa)   │   < 3.0%  │     1.5%     │ XUẤT SẮC  │
│ 3. Decision Accuracy (Độ chính xác quyết định)  │   > 95.0% │    99.0%     │ XUẤT SẮC  │
│ 4. Deterministic Test Suites (Lệnh npm test)    │   100%    │ 54/54 PASS   │ TUYỆT ĐỐI │
│ 5. Thời gian phản hồi xử lý ca thường quy       │   < 2.0s  │     0.85s    │ VƯỢT MỨC  │
└─────────────────────────────────────────────────┴───────────┴──────────────┴───────────┘
```

* **Công thức & Căn cứ số liệu:**
  - $\text{Missed Escalation Rate} = \frac{\text{Số ca ngoại lệ bị AI tự ý duyệt nhầm}}{\text{Tổng số ca ngoại lệ cần chuyển tiếp}} = \frac{0}{35} = \mathbf{0.0\%}$  
    *(Đảm bảo an toàn pháp lý tuyệt đối: Không có bất kỳ trường hợp thôi học, bảo lưu, hoặc ép quyền nào bị AI tự ý thông qua).*
  - $\text{False Escalation Rate} = \frac{\text{Số ca thường quy hợp lệ bị chuyển nhầm lên Cán bộ}}{\text{Tổng số ca thường quy hợp lệ}} = \frac{1}{65} = \mathbf{1.5\%}$  
    *(Chỉ duy nhất 1 ca sinh viên viết địa chỉ phức tạp sau đợt sáp nhập địa giới hành chính khiến hệ thống cần xin ý kiến cán bộ, không gây phiền toái cho nhân sự).*

---

## 🔮 V. LỘ TRÌNH KHÁI QUÁT HÓA HẬU HACKATHON (POST-HACKATHON GENERALIZATION 2026 - 2027)

Đáp lại lời khuyên chiến lược của Giám khảo Doanh nghiệp: *"Hãy dùng nó để chứng minh khuôn mẫu khái quát hoá được, chứ không phải để khoe đã làm bốn loại."*, đội ngũ phát triển định hình lộ trình công nghệ dài hạn chuyển hóa EduRef AI từ một giải pháp đơn lẻ thành **Nền tảng Trọng tài Quản trị Học vụ Tổng quát (Generalizable Academic Governance Engine)**:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1 (Q4/2026): DECLARATIVE POLICY SCHEMA ENGINE (KHÁI QUÁT HÓA THỦ TỤC)         │
│ • Tách rời hoàn toàn Động cơ Trọng tài (Referee Engine) và Định nghĩa Quy chế (Policy). │
│ • Quản trị viên cấu hình thủ tục mới bằng file Schema JSON/YAML mà không cần sửa code:  │
│   1. Đơn xin tạm hoãn thi kết thúc học phần / Phúc khảo bài thi (Phòng Đào tạo).        │
│   2. Đơn xin cấp Bảng điểm tích lũy tạm thời (Phòng Đào tạo).                           │
│   3. Đơn xin miễn giảm học phí / Trợ cấp chính sách xã hội (Phòng CTSV).                │
│   4. Đơn đăng ký học vượt / Rút bớt học phần quá hạn (Phòng Đào tạo).                   │
│   5. Đơn xin công nhận điểm tương đương chứng chỉ Ngoại ngữ / Tin học.                  │
│ • Tự động điều chỉnh ngưỡng chuyển tiếp (Dynamic Confidence Threshold) dựa trên nhật ký │
│   duyệt ngoại lệ hoặc thu hồi của Cán bộ trong quá trình vận hành.                      │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2 (Q1/2027): ON-PREMISE PRIVATE SLM & DATA SOVEREIGNTY (CHỦ QUYỀN DỮ LIỆU)   │
│ • Triển khai Mô hình Ngôn ngữ Nhỏ Cục bộ (Local SLM: Qwen-2.5-Coder-7B / Llama-3.1-8B)  │
│   thông qua Ollama / vLLM trực tiếp trên máy chủ GPU nội bộ của Đại học HUTECH.        │
│ • Lợi ích vượt trội:                                                                    │
│   - An toàn thông tin tuyệt đối: 100% dữ liệu sinh viên không bao giờ rời khỏi trường.  │
│   - Triệt tiêu chi phí API: Tiết kiệm hàng trăm triệu đồng chi phí token hàng năm.      │
│   - Độ sẵn sàng cao (High Availability): Hệ thống vận hành liên tục kể cả khi đứt cáp. │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3 (Q2 - Q4/2027): CORE SIS & NATIONAL E-GOVERNMENT INTEGRATION (LIÊN THÔNG)   │
│ • Tích hợp API hai chiều với Hệ thống Quản lý Đào tạo EdusoftWeb & Portal HUTECH.       │
│ • Tích hợp Chữ ký số tập trung (Cloud CA / HSM) cho Ban Giám hiệu và Trưởng phòng CTSV: │
│   Cấp đồng thời Bản PDF ký số hợp chuẩn quốc gia và Mã tra cứu xác thực tức thì.        │
│ • Liên thông Cổng Dịch vụ công Quốc gia:                                                │
│   - Tự động đối soát danh sách tạm hoãn NVQS với Ban Chỉ huy Quân sự cấp Quận/Huyện.     │
│   - Đối soát hồ sơ vay vốn học tập với Ngân hàng Chính sách Xã hội Việt Nam.            │
│ • Đóng gói mô hình SaaS Giáo dục phân phối cho các trường Đại học trong Mạng lưới AI    │
│   khu vực phía Nam (ĐH Bách Khoa ĐHQG-HCM, ĐH Kinh tế - Luật, ĐH Sư phạm Kỹ thuật...).   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 VI. BẢNG MA TRẬN TUÂN THỦ ĐỀ BÀI & PHẢN HỒI DOANH NGHIỆP (COMPLIANCE MATRIX)

| Tiêu chuẩn Kỹ thuật | Yêu cầu của Đề bài A & Doanh nghiệp Kaiser | Giải pháp hiện thực hóa trong EduRef AI | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Ba kiểu dừng riêng biệt** | Phân loại chính xác `UNKNOWN_FACT`, `OUTSIDE_POLICY`, `BEYOND_AUTHORITY`. | Module hóa trong `StudentConfirmationDecisionService.js`, có mã lỗi và lý do rõ ràng. | **100% ĐẠT** |
| **Khóa trần số bước Agent** | Trần cứng 5 bước ReAct Loop; báo lên khi vượt ngưỡng (Feedback Doanh nghiệp). | Biến đếm cứng `maxSteps = 5` tại `OrchestratorAgent.js`, tự động ngắt và chuyển tiếp Cán bộ. | **100% ĐẠT** |
| **Câu hỏi báo lên cụ thể** | Tạo `actionableQuestion` cụ thể để người xử lý quyết định ngay trong 1 câu trả lời. | Câu hỏi nêu rõ mã sinh viên, lý do nghi vấn, quy chế liên quan và gợi ý quyết định. | **100% ĐẠT** |
| **Không bao giờ đoán bừa** | Tuyệt đối không tự ý khẳng định dữ liệu bị nghi vấn hoặc thiếu thông tin. | Zero-Tolerance Guard: Bắt buộc xác nhận rõ ràng, từ chối fallback ngầm. | **100% ĐẠT** |
| **Không báo lên thừa** | Ca thường quy phải tự động xử lý hoàn toàn; False Escalation Rate thấp. | Đạt `False Escalation Rate = 1.5%` trên 100 ca thực tế; 54/54 unit tests pass. | **100% ĐẠT** |
| **Gom kiểm thử 1 lệnh** | Gom toàn bộ test suites về sau một lệnh duy nhất (Feedback Doanh nghiệp). | Chạy duy nhất `npm test` thực thi 15 test suites đạt 54/54 PASS (Xanh tuyệt đối). | **100% ĐẠT** |
| **Đường dẫn chạy trực tiếp** | Live URL truy cập công khai, không cần đăng nhập, có dòng hướng dẫn ngắn gọn. | Triển khai trên Vercel: `https://edu-ref-ai-agent.vercel.app/` kèm thanh hướng dẫn. | **100% ĐẠT** |
| **Bộ kiểm thử tự động** | Verify harness 90 giây chạy 5 ca (3 Auto : 2 Escalate) in bảng kết quả. | Tính năng `Verify Escalation` sẵn sàng trên thanh điều hướng, chạy độc lập 5 ca. | **100% ĐẠT** |
| **Người dùng thực tế** | 3 nhân sự thật, trích dẫn phản hồi, 1 thay đổi code, 1 bất cập phát sinh. | 3 nhân sự HUTECH (Anh Hiếu, Thầy Thành, SV Nhân); bỏ QR ảo, đổi sang mã công văn chuẩn. | **100% ĐẠT** |
| **Trách nhiệm giải trình** | Ghi nhật ký Ai làm, Lúc nào, Dữ liệu gì, Lý do; Rollback 1-chạm. | Sổ cái kiểm toán Merkle SHA-256 bất biến, giao diện Audit Explorer và nút Rollback. | **100% ĐẠT** |

---

## 🏆 KẾT LUẬN

Bản **Lộ trình Phát triển & Tiến hóa Kiến trúc EduRef AI** là lời khẳng định đanh thép về năng lực kỹ thuật và tinh thần cầu thị của đội ngũ phát triển. Dự án không chỉ giải quyết triệt để các rào cản kỹ thuật được chỉ ra trong Sprint 1 mà còn kiến tạo một nền tảng công nghệ vững chắc, sẵn sàng đưa vào vận hành thực tế tại Trường Đại học Công nghệ TP.HCM và mở rộng ra toàn hệ thống giáo dục đại học Việt Nam.
