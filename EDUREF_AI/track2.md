# 🏆 ĐỀ BÀI THỬ THÁCH — BẢNG 1: ORGANIZATION AI
### **MLAI Hackathon 2026**
> **Đơn vị tổ chức:** Mạng lưới AI khu vực phía Nam (Mạng lưới AI) · HCMUT × HUTECH  
> **Thời gian:** 19/09/2026 – 17/10/2026  
> **Quy mô đội thi:** 1 – 4 sinh viên  

---

## 1. BỐI CẢNH

> *“Xây dựng hệ thống AI thực hiện công việc thực tế và đảm bảo trách nhiệm giải trình.”*

Nghiên cứu về ứng dụng AI trong tổ chức chỉ ra rằng: AI đang định hình lại cách thức các tổ chức được xây dựng, vận hành và mở rộng quy mô. AI không thay thế con người mà tiếp nhận một phần các công việc đang được xử lý thủ công — bao gồm việc đôn đốc tiến độ, điều phối quy trình, kiểm tra dữ liệu và liên tục đánh giá để phân loại các trường hợp cần con người xử lý trực tiếp.

Các nghiên cứu trên cũng khẳng định sự chuyển dịch này chỉ thành công khi thỏa mãn **ba điều kiện cốt lõi**. Nếu thiếu bất kỳ điều kiện nào, sản phẩm sẽ chỉ dừng lại ở mức mô hình thử nghiệm mà không thể đưa vào sử dụng thực tế trong tổ chức. Ba điều kiện này là yêu cầu phát triển trọng tâm của cuộc thi và là căn cứ chấm điểm tại [Mục 4](#4-tiêu-chí-chấm-điểm):

1. **Đủ tính tự chủ để xử lý công việc thực tế:**  
   Các mô hình tác tử (agent) hiện nay chủ yếu dừng lại ở việc trả lời câu hỏi; trong khi đó, các tổ chức cần những hệ thống có khả năng tự đảm nhiệm trọn vẹn quy trình. Điều này đòi hỏi hệ thống phải thực thi liên tiếp nhiều bước phụ thuộc mà không cần nhắc lệnh lại, xử lý thỏa đáng khi gặp lỗi thay vì tiếp tục suy đoán sai lệch, và xác định chính xác các trường hợp không được tự ý xử lý đơn lẻ. Một tác tử chuyển tiếp mọi trường hợp cho con người sẽ không có tính tự chủ; ngược lại, tác tử không chuyển tiếp bất kỳ trường hợp nào cũng không đáp ứng yêu cầu.
2. **Đủ tính minh bạch để con người duy trì trách nhiệm giải trình:**  
   Nhân sự quản lý cần chịu trách nhiệm về các hành động của hệ thống. Điều này chỉ khả thi khi người dùng có thể tra cứu hệ thống đã thực hiện thao tác gì, vào thời điểm nào, dựa trên dữ liệu đầu vào nào và lý do tương ứng; có quyền dừng hoặc hoàn tác hành động; đồng thời nhận được giải thích có thể ứng dụng vào thực tế thay vì chỉ là điểm số độ tin cậy. Đây là yếu tố phân biệt giữa một công cụ có thể đưa vào vận hành thực tế và một công cụ bị bộ phận pháp chế từ chối.
3. **Đánh giá khách quan tác động đến người sử dụng:**  
   Đây là điều kiện thường bị bỏ qua nhiều nhất, nhưng lại là điểm được các nghiên cứu nhấn mạnh rõ nét nhất. AI không làm giảm khối lượng công việc tổng thể mà có xu hướng dồn nhiều công việc hơn vào cùng một khoảng thời gian — gia tăng cường độ làm việc. Mọi công cụ mới đều đòi hỏi chi phí thời gian làm quen ban đầu trước khi mang lại hiệu quả thực tế. Người dùng có nguy cơ rơi vào sự ỷ lại về mặt nhận thức, tức chấp nhận kết quả từ hệ thống mà thiếu phản biện. Đồng thời có thể hình thành sự suy giảm tương tác phối hợp, khi công cụ dần làm giảm các trao đổi trực tiếp cần thiết giữa các đồng nghiệp. Bài thi chỉ khẳng định việc tăng tốc độ xử lý đơn thuần sẽ không được đánh giá cao; bài thi nhận diện được các tác động thực tế này thông qua kiểm thử người dùng và báo cáo minh bạch sẽ đạt điểm tối ưu.

Ba đề bài kỹ thuật tại [Mục 2](#2-thử-thách) giải quyết vấn đề từ ba góc độ khác nhau:
- **A — Tác tử xử lý công việc thường quy và xác định chính xác thời điểm dừng để chuyển tiếp cho con người.**
- **B — Tái cấu trúc toàn bộ quy trình thay vì chỉ tăng tốc độ một bước đơn lẻ.**
- **C — Nâng cao chất lượng ra quyết định nhóm thông qua việc làm rõ các bất đồng thực chất.**  
*(Đội thi chọn đúng một đề bài).*

> **Yêu cầu cốt lõi duy nhất:** Phần mềm phải vận hành thực tế. Cuộc thi không có hạng mục chỉ dành riêng cho ý tưởng và không chấm điểm cho các kế hoạch phát triển chưa được triển khai.

---

## 2. THỬ THÁCH

> *“Xây dựng hệ thống AI thực thi công việc thực tế trong tổ chức, đảm bảo con người có thể theo dõi tiến trình xử lý, điều chỉnh và can thiệp dừng hệ thống khi cần thiết.”*

- **Lĩnh vực trọng tâm:** Quy trình làm việc, điều phối công việc, hỗ trợ ra quyết định, tính tự chủ.
- **Cấu trúc mỗi đề bài:**
  - **Yêu cầu tối thiểu (Sprint 1):** Các tính năng bắt buộc phải vận hành trong vòng 72 giờ để đủ điều kiện xét duyệt.
  - **Yêu cầu nâng cao (Sprint 2):** Dành cho các đội vào Chung kết, yêu cầu triển khai thử nghiệm với người dùng thực tế và đo lường kết quả trước/sau.
  - **Phương thức đánh giá của Ban giám khảo:** Quy trình kiểm thử trực tiếp mà Ban giám khảo sẽ thực hiện trên sản phẩm.
- **Về dữ liệu:** Các đội thi tự chuẩn bị dữ liệu. Dữ liệu tổng hợp hoặc tự sinh được chấp nhận và khuyến khích, với điều kiện đội thi phải công bố rõ phần nào là dữ liệu thực tế và phần nào là dữ liệu giả lập (thể hiện trực tiếp tại Slide 4 của bài nộp). **Hệ thống phải có khả năng tiếp nhận dữ liệu đầu vào mới.** Bài thi chỉ hoạt động trên bộ dữ liệu cố định (hard-coded) sẽ bị trừ điểm ở tiêu chí Khả năng vận hành.
- **Lưu ý về thời lượng đánh giá 8 phút:** Tại vòng Sơ loại, mỗi giám khảo có 8 phút để đánh giá một bài thi. Giám khảo sẽ không cài đặt phần mềm và không đọc mã nguồn trực tiếp. Hai sản phẩm bắt buộc phục vụ mục đích này là: **Đường dẫn trực tuyến (Live URL)** và **Bộ công cụ kiểm thử tự động (Verify harness)**.

---

### A. BỘ ĐIỀU PHỐI CHUYỂN TIẾP (The Escalation Referee)
> *Tác tử có năng lực xác định chính xác thời điểm cần dừng tự động hóa để xin ý kiến con người.*

#### 📌 Yêu cầu tối thiểu (Sprint 1)
- Chọn **một quy trình thường quy cụ thể** (thanh toán hoàn ứng, phê duyệt nghỉ phép, phân loại yêu cầu hỗ trợ, cấp giấy xác nhận...) và xây dựng tài liệu quy định rõ ràng cho quy trình đó. Tự động xử lý các trường hợp thường quy.
- Xây dựng bộ dữ liệu kiểm thử tối thiểu **15 trường hợp**, bao gồm các trường hợp không rõ ràng, trường hợp ngoài quy định và trường hợp vượt thẩm quyền xử lý.
- Phân loại mức độ không chắc chắn thành **3 nhóm**:
  1. Chưa xác định được thông tin thực tế (`UNKNOWN_FACT`).
  2. Nằm ngoài phạm vi quy định (`OUTSIDE_POLICY`).
  3. Vượt thẩm quyền cần con người phê duyệt (`BEYOND_AUTHORITY`).
- Khi chuyển tiếp, tạo **câu hỏi cụ thể, rõ ràng** (`actionableQuestion`) để người xử lý có thể trả lời trực tiếp — không dùng các yêu cầu chung chung như yêu cầu xem xét lại.
- **Không chuyển tiếp quá mức:** Các trường hợp thường quy phải được xử lý tự động hoàn toàn.
- **Tuyệt đối không đưa ra kết quả khẳng định** đối với dữ liệu đầu vào đã bị gắn cờ nghi vấn.
- Cung cấp **5 trường hợp kiểm thử chuyển tiếp** — gồm **3 trường hợp thường quy** và **2 trường hợp cần chuyển tiếp** — có thể chạy trực tiếp từ bộ công cụ Verify bằng một thao tác.

#### 🚀 Yêu cầu nâng cao (Sprint 2)
- Tự động điều chỉnh ngưỡng chuyển tiếp dựa trên phản hồi của người dùng trong quá trình vận hành.
- Báo cáo độ chính xác bằng số liệu cụ thể trên tập kiểm thử độc lập:
  - Tỷ lệ trường hợp cần chuyển tiếp nhưng bị bỏ sót (**Missed Escalation Rate**).
  - Tỷ lệ trường hợp đơn giản bị chuyển tiếp không cần thiết (**False Escalation Rate**).
- Thử nghiệm với **ít nhất 3 nhân sự trực tiếp xử lý** loại quy trình này trong thực tế, đồng thời chỉ ra **ít nhất một điểm cải tiến** trong hệ thống xuất phát từ phản hồi của họ.

#### ⚖️ Phương thức đánh giá của Ban giám khảo
- **Vòng Sơ loại — Kiểm tra nhanh 90 giây:**  
  Giám khảo chọn `Verify → Escalation`. Bộ công cụ kiểm thử tự động thực thi 5 trường hợp và hiển thị bảng kết quả. Sau đó, giám khảo nhập một trường hợp không rõ ràng mới dựa trên tài liệu quy định của đội thi.
  - **ĐẠT:** 2 trường hợp được chuyển tiếp, 3 trường hợp được xử lý tự động, và trường hợp mới được xử lý hợp lý.
  - **KHÔNG ĐẠT:** Hệ thống chuyển tiếp tất cả hoặc không chuyển tiếp trường hợp nào.
- **Vòng Chung kết — Kiểm thử toàn diện (20 điểm):**  
  Ban giám khảo đưa ra 5 trường hợp mới dựa trên tài liệu quy định của đội thi, trong đó có khoảng 2 trường hợp cần chuyển tiếp.

| Bài kiểm tra | Thao tác của Giám khảo và Thang điểm | Điểm |
| :--- | :--- | :---: |
| **Phát hiện đúng trường hợp cần chuyển tiếp** | Giám khảo thực thi 5 trường hợp riêng.<br>• **8 điểm:** Chuyển tiếp đúng cả 2 trường hợp và phân loại chính xác.<br>• **4 điểm:** Phát hiện đúng 1 trong 2 trường hợp.<br>• **0 điểm:** Không phát hiện được trường hợp nào. | **8** |
| **Không can thiệp các trường hợp đơn giản** | 3 trường hợp thường quy phải được xử lý tự động hoàn toàn.<br>• **6 điểm:** Không có trường hợp chuyển tiếp sai.<br>• **3 điểm:** Có 1 trường hợp chuyển tiếp sai.<br>• **0 điểm:** Từ 2 trường hợp chuyển tiếp sai trở lên. | **6** |
| **Chất lượng câu hỏi chuyển tiếp** | Giám khảo đánh giá nội dung câu hỏi do hệ thống tạo ra.<br>• **6 điểm:** Câu hỏi cụ thể, người xử lý có thể quyết định ngay trong một câu trả lời mà không cần tra cứu lại hồ sơ gốc.<br>• **3 điểm:** Câu hỏi cụ thể nhưng vẫn cần tra cứu thêm.<br>• **0 điểm:** Câu hỏi chung chung, dạng yêu cầu xem xét lại. | **6** |

> **Ví dụ minh họa:** Tác tử hỗ trợ thủ quỹ câu lạc bộ xử lý hồ sơ hoàn ứng. Phần lớn hồ sơ hợp lệ được xử lý tự động. Khi hóa đơn bị mờ, tác tử hỏi rõ: *"Số tiền là 450.000₫ hay 480.000₫?"*. Với hóa đơn chi tiền đồ uống có cồn, tác tử thông báo: *"Khoản chi này có thể ngoài quy định của câu lạc bộ, bạn có xác nhận phê duyệt không?"*. Với hóa đơn trên năm triệu đồng, tác tử nêu rõ: *"Khoản này cần chữ ký của Chủ tịch câu lạc bộ phê duyệt"*. Ba yêu cầu xử lý, ba phương thức chuyển tiếp khác nhau.

---

### B. TÁI CẤU TRÚC TOÀN BỘ QUY TRÌNH (The Whole Workflow)
> *Lựa chọn một quy trình làm việc hoàn chỉnh tại trường đại học, tổ chức sinh viên hoặc doanh nghiệp nhỏ và tái thiết kế toàn bộ quy trình.*

#### 📌 Yêu cầu tối thiểu (Sprint 1)
- Chọn một quy trình hoàn chỉnh từ đầu đến cuối (gợi ý: đặt phòng, hoàn ứng, đăng ký sự kiện, mượn trả thiết bị, cấp giấy xác nhận...).
- Lập **sơ đồ quy trình hiện tại** kèm số liệu đo lường thời gian thực tế (thời gian chờ, đôn đốc, bàn giao). Sơ đồ đối chiếu trước và sau cải tiến là bắt buộc.
- Xây dựng bản thử nghiệm vận hành quy trình tái cấu trúc — thay đổi cấu trúc luồng công việc thay vì chỉ chèn AI vào một bước hiện có.
- Thể hiện rõ điểm con người đưa ra quyết định nằm ở đâu trong quy trình mới.
- Cung cấp ít nhất hai trường hợp thực tế để giám khảo thực thi (bao gồm một trường hợp ngoại lệ).

#### 🚀 Yêu cầu nâng cao (Sprint 2)
- Thử nghiệm với ít nhất 3 nhân sự thực tế, ghi nhận trung thực ý kiến phản hồi.
- Báo cáo cả các yếu tố tối ưu và các bất cập mới phát sinh.
- Chỉ ra một thay đổi cụ thể trong sản phẩm bắt nguồn từ phản hồi của người dùng.

#### ⚖️ Thang điểm đánh giá (Chung kết: 20 điểm)

| Bài kiểm tra | Thao tác của Giám khảo và Thang điểm | Điểm |
| :--- | :--- | :---: |
| **Đối chiếu trước và sau cải tiến** | So sánh hai sơ đồ quy trình.<br>• **7 điểm:** Sơ đồ hiện trạng có số liệu đo lường thời gian thực tế, sơ đồ mới thay đổi trình tự hoặc loại bỏ/thêm bước.<br>• **4 điểm:** Xử lý nhanh hơn nhưng chuỗi quy trình giữ nguyên.<br>• **0 điểm:** Không có sơ đồ hiện trạng hoặc số liệu cảm tính. | **7** |
| **Thực thi một trường hợp hoàn chỉnh** | • **7 điểm:** Hoàn thành quy trình từ đầu đến cuối, bao gồm điểm quyết định của con người và nhánh ngoại lệ.<br>• **3 điểm:** Hoàn thành nhưng cần can thiệp thủ công hỗ trợ.<br>• **0 điểm:** Chỉ vận hành được từng bước rời rạc. | **7** |
| **Phân tích các điểm bất cập phát sinh** | Phỏng vấn về các vấn đề hoặc gánh nặng mới phát sinh khi áp dụng hệ thống.<br>• **6 điểm:** Câu trả lời cụ thể từ người dùng thực tế (khối lượng việc mới, kỹ năng mai một, tương tác giảm).<br>• **3 điểm:** Nêu lo ngại chung chung.<br>• **0 điểm:** Trả lời không có bất cập nào. | **6** |

---

### C. LỚP ĐIỀU PHỐI CỘNG TÁC (The Coordination Layer)
> *Nâng cao hiệu quả phối hợp làm việc nhóm giữa các nhân sự thay vì thay thế vị trí của họ.*

#### 📌 Yêu cầu tối thiểu (Sprint 1)
- Giải quyết vấn đề tắc nghẽn phối hợp thực tế (cô lập thông tin, quyết định đình trệ, bất đồng ngầm).
- Xây dựng bộ dữ liệu hội thoại mô phỏng có cài cắm điểm bất đồng ngầm làm chuẩn đối chiếu (ground truth).
- Phân biệt rõ giữa bất đồng quan điểm thực chất và sự khác biệt về thuật ngữ diễn đạt.
- Cung cấp giao diện dán văn bản trực tiếp (paste-in) trên đường dẫn trực tuyến.
- Hoạt động mà không đòi hỏi mọi người phải thay đổi thói quen làm việc (đọc từ kênh có sẵn).

#### 🚀 Yêu cầu nâng cao (Sprint 2)
- Vận hành trên chuỗi hội thoại thực tế (đã ẩn danh) và nhận được xác nhận từ người tham gia.
- Cung cấp bằng chứng thực tế hệ thống không làm suy giảm trao đổi trực tiếp cần thiết.

#### ⚖️ Thang điểm đánh giá (Chung kết: 20 điểm)

| Bài kiểm tra | Thao tác của Giám khảo và Thang điểm | Điểm |
| :--- | :--- | :---: |
| **Kiểm thử trực tiếp trên dữ liệu mới** | • **7 điểm:** Phân biệt chính xác bất đồng thực chất với trường hợp chỉ khác biệt về từ ngữ diễn đạt.<br>• **3 điểm:** Tóm tắt chính xác nhưng không phân tích được cấu trúc mâu thuẫn.<br>• **0 điểm:** Thiên vị một phía hoặc chỉ thuật lại nguyên văn. | **7** |
| **Xác nhận từ người dùng thực tế** | • **8 điểm:** Tối thiểu một đại diện từ mỗi bên xác nhận bằng đánh giá riêng.<br>• **4 điểm:** Chỉ có một bên xác nhận.<br>• **0 điểm:** Không có xác nhận từ người dùng. | **8** |
| **Mức độ không làm gián đoạn thói quen** | • **5 điểm:** Không thay đổi thói quen, tiếp nhận trực tiếp nội dung trên nền tảng sẵn có.<br>• **0 điểm:** Bắt buộc mọi người phải chuyển sang công cụ mới. | **5** |

---

## 3. SẢN PHẨM NỘP (6 HẠNG MỤC BẮT BUỘC)
*Hạn chốt nộp: **15/10/2026**.*

| STT | Hạng mục | Chi tiết yêu cầu |
| :---: | :--- | :--- |
| **a** | **Đường dẫn trực tuyến (Live URL)** | Đã triển khai vận hành, truy cập công khai, không cần tài khoản, không cần cài đặt. Trên trang chủ có một dòng hướng dẫn ngắn gọn về thao tác chính cần thử nghiệm đầu tiên. |
| **b** | **Bộ công cụ kiểm thử tự động (Verify harness)** | Một lệnh hoặc nút bấm duy nhất chạy tuần tự 4-5 trường hợp kiểm thử, xuất bảng kết quả Pass/Fail kèm timestamp. Đính kèm tài liệu hướng dẫn vận hành (`RUNBOOK.md`). |
| **c** | **Kho mã nguồn công khai (Public Repo)** | Lưu trữ đầy đủ lịch sử commit trong suốt thời gian diễn ra sprint (nghiêm cấm squash hoặc force-push). |
| **d** | **Video demo** | Thời lượng **dưới 3 phút**, quay màn hình thực tế vận hành sản phẩm (khuyến khích video mộc). |
| **e** | **Bộ 5 slide thuyết trình** | Theo đúng cấu trúc cố định 5 slide (không bổ sung thêm slide). |
| **f** | **Nhật ký phát triển (Build log)** | Độ dài 1 trang: nêu công cụ AI đã dùng, tính hiệu quả, điểm gây tốn thời gian, và tính năng lớn nhất đã quyết định cắt giảm. |

### 📑 Cấu trúc Cố định của 5 Slide Thuyết trình:
- **Slide 1:** Vấn đề hiện trạng — quy trình làm việc hoặc khoảng trống tồn tại trong thực tế.
- **Slide 2:** Đầu vào $\rightarrow$ Xử lý $\rightarrow$ Đầu ra — và làm rõ vị trí con người giữ vai trò đưa ra quyết định.
- **Slide 3:** Tác động thực tế: Đối chiếu trước và sau triển khai — cùng phương pháp đo lường cụ thể *(Trọng số lớn)*.
- **Slide 4:** Kiến trúc hệ thống — mô hình triển khai; phân định rõ thành phần thực tế và thành phần giả lập.
- **Slide 5:** Giới hạn và rủi ro — các trường hợp hệ thống gặp lỗi, hạn chế tồn tại và định hướng xử lý tiếp theo *(Trọng số lớn)*.

---

## 4. TIÊU CHÍ CHẤM ĐIỂM (THANG ĐIỂM 100)

| STT | Tiêu chí | Điểm tối đa | Yêu cầu để đạt điểm cao |
| :---: | :--- | :---: | :--- |
| **1** | **Khả năng vận hành — Đường dẫn trực tuyến** | **10 điểm** | Truy cập URL và thực hiện thao tác chính theo hướng dẫn. Hoạt động tốt, không tài khoản, không cài đặt = **10đ**. Thao tác chưa rõ ràng = **6đ**. Liên kết lỗi = **0đ**. |
| **2** | **Khả năng vận hành — Chạy kiểm thử Verify** | **12 điểm** | Một thao tác bấm chạy toàn bộ 4 trường hợp và in bảng kết quả. Đạt cả 4 ca = **12đ**. Đạt 3 ca = **8đ**. Đạt 2 ca = **4đ**. Dưới 2 ca / chạy thủ công = **0đ**. |
| **3** | **Khả năng vận hành — Dữ liệu đầu vào mới của Giám khảo** | **8 điểm** | Hai dữ liệu đầu vào mới do Giám khảo đưa ra. Xử lý hoặc từ chối hợp lý cả 2 = **8đ**. Đúng 1 = **4đ**. Không xử lý được / sai nhưng khẳng định đúng = **0đ**. |
| **4** | **Khả năng vận hành — 5 Slide thuyết trình & Video demo** | **10 điểm** | Đầy đủ 5 slide chuẩn cấu trúc, video dưới 3 phút, nêu rõ giới hạn hệ thống. Thiếu Slide 3 hoặc Slide 5 bị trừ 50% số điểm mục này. |
| **5** | **Người dùng thực tế và Tổ chức thực tế** | **20 điểm** | • **3 nhân sự cụ thể** kèm chức danh thực tế đang phụ trách (6đ)<br>• **Trích dẫn nguyên văn phản hồi** của họ (4đ)<br>• **1 thay đổi cụ thể trong code** bắt nguồn từ góp ý người dùng (6đ)<br>• **1 tác động tiêu cực / bất cập phát sinh** được chỉ ra cụ thể (4đ). |
| **6** | **Vai trò con người (HITL) & Nhật ký kiểm toán** | **20 điểm** | • Điểm phân định quyền quyết định khớp với Slide 2 (6đ)<br>• Nhật ký kiểm toán truy xuất rõ Ai làm, Lúc nào, Dữ liệu gì, Lý do (6đ)<br>• Tính năng can thiệp dừng và ghi đè hoạt động hiệu quả (4đ)<br>• Giải thích quyết định cho người không chuyên hiểu (4đ). |
| **7** | **Kiểm thử xác thực theo Đề bài đã chọn** | **20 điểm** | Chấm dựa trên bài kiểm tra nhanh 90 giây (Vòng Sơ loại) hoặc kiểm thử toàn diện 3 phần (Vòng Chung kết) theo đề bài đã đăng ký. |
| | **TỔNG CỘNG** | **100 điểm** | **Khả năng vận hành (40đ) + Người dùng thực tế (20đ) + Vai trò con người (20đ) + Xác thực đề bài (20đ)** |

---

### ⏱️ QUY TRÌNH ĐÁNH GIÁ 8 PHÚT (VÒNG SƠ LOẠI)
*Hai giám khảo chấm độc lập, bất đồng bộ (không họp trực tuyến).*

```text
[0:00 - 1:00] Truy cập Live URL và làm theo hướng dẫn 1 dòng trên trang chủ
      │
[1:00 - 3:00] Bấm nút Verify -> Xem bảng kết quả kiểm thử tự động
      │
[3:00 - 5:00] Nhập 2 dữ liệu test case lạ của Giám khảo
      │
[5:00 - 6:30] Thực hiện bài kiểm tra nhanh 90 giây theo đề bài (20 / 10 / 0 điểm)
      │
[6:30 - 7:30] Tra cứu Nhật ký kiểm toán (Audit Log) & thử nút Dừng/Ghi đè
      │
[7:30 - 8:00] Chấm điểm theo barem chuẩn
```

---

## 5. HÌNH THỨC & LỊCH TRÌNH

| Giai đoạn | Thời gian | Nội dung công việc |
| :--- | :---: | :--- |
| **Khởi động & Hội thảo** | **19/09** | Công bố 3 đề bài. Hướng dẫn công cụ và cách làm Verify Harness. |
| **Sprint 1 — Phát triển vòng loại** | **19/09 → 22/09** *(72 giờ)* | Hoàn thiện Live URL, bộ Verify và các ca kiểm thử. Khóa mã nguồn (hash commit). |
| **Vòng Sơ loại** | **23/09 → 27/09** | Kiểm tra tuân thủ và 2 giám khảo chấm độc lập 8 phút. Công bố danh sách Chung kết. |
| **Sprint 2 — Phát triển chuyên sâu** | **28/09 → 15/10** | Dành cho các đội vào Chung kết. Thử nghiệm với người dùng thực tế, tối ưu hóa hệ thống. |
| **Khóa bài nộp** | **15/10** | Chốt repo cuối cùng, 5 slide, video demo và build log. |
| **Demo Day (Chung kết)** | **17/10** | Trình diễn trực tiếp sản phẩm, phản biện trước Hội đồng giám khảo và trao giải. |

---

## 6. QUY ĐỊNH CUỘC THI

- **Đối tượng:** Sinh viên các trường thành viên thuộc Mạng lưới AI (Đội 1–4 thành viên).
- **Công cụ cho phép:** Mọi trợ lý lập trình AI, LLM, framework, thư viện mã nguồn mở. Đội vào Chung kết được cấp quyền OpenAI Codex.
- **Yêu cầu bắt buộc:** Toàn bộ công việc phát triển cốt lõi phải diễn ra trong khung thời gian của sprint. Lịch sử commit phải minh bạch.
- **Điều cấm:** Nhân sự ngoài sinh viên viết code; bài làm từ trước; làm giả dữ liệu hoặc người dùng ảo (sẽ bị **truất quyền thi đấu trực tiếp**).
- **Quyền sở hữu:** Đội thi giữ toàn quyền sở hữu trí tuệ đối với sản phẩm của mình.

---

## 7. CƠ CẤU GIẢI THƯỞNG
- **Giải thưởng chính:** 1 Giải Quán quân OrganizationAI + 2 Giải Khuyến khích (Honorable Mentions).
- **Giải thưởng phụ chuyên đề (Tối đa 2 giải / đội):**
  - 🥇 *Cleanest Verify Harness:* Bộ công cụ kiểm thử tối ưu, nhanh và tiện lợi nhất.
  - ⚡ *Rapid Engineering Award:* Đội thi ứng dụng AI hỗ trợ lập trình hiệu quả nhất.
  - 👤 *Solo Builder Award:* Dự án xuất sắc nhất do 1 cá nhân phát triển.
  - 🤝 *Human-in-the-Loop Award:* Thiết kế phân định ranh giới người - máy tối ưu nhất.
  - 📊 *Honest Measurement Award:* Phương pháp đo lường tác động trung thực và chặt chẽ nhất.
  - 🎨 *Best Design:* Thiết kế sản phẩm và trải nghiệm người dùng xuất sắc nhất.
  - 🌐 *Cross-Discipline Award:* Dự án liên ngành xuất sắc nhất.

---

## 8. HỖ TRỢ & TÀI NGUYÊN
- **Thông tin liên hệ BTC:**
  - Ban tổ chức: `qttho@hcmut.edu.vn`
  - Ban tổ chức đăng cai: `vd.bay@hutech.edu.vn`
- **Đơn vị chủ trì:** Trường Đại học Bách khoa — ĐHQG-HCM (HCMUT).  
- **Đơn vị đồng tổ chức:** Trường Đại học Công nghệ TP.HCM (HUTECH).
