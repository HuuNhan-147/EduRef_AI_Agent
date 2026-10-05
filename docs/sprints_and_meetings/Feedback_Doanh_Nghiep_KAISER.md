# FEEDBACK TỪ DOANH NGHIỆP — SPRINT 1 (TRACK VNG)
## Đội thi: KAISER

---

### TỔNG QUAN ĐÁNH GIÁ
* **Xếp nhóm kỹ thuật**: Nhóm giữa
* **Tiềm năng thương mại thực tế**: **Khá**
* **Số kiểu dừng đạt chuẩn (Spec Stops)**: **2/3** kiểu dừng
* **Đánh giá năng lực thực thi**:
  * **Nó chạy (It runs - 40%)**: Partial Một phần
  * **Ranh giới con người (Human loop - 20%)**: Strong Tốt
  * **Khớp yêu cầu đề bài (Spec test - 20%)**: Partial Một phần
  * **Phương pháp kiểm chứng (Method - 20%)**: Partial Một phần

---

### 1. BÀI TOÁN & GIẢI PHÁP CỦA ĐỘI (WHAT THEY BUILT)
Đơn từ sinh viên thuộc bốn loại — xác nhận vay vốn ngân hàng, hoãn nghĩa vụ quân sự, giấy xác nhận sinh viên, xét tốt nghiệp — dưới dạng agent gọi công cụ trên một động cơ quy định, truyền phản hồi qua WebSocket.

---

### 2. GÓC NHÌN DOANH NGHIỆP & CHỖ ĐỨNG TRONG TỔ CHỨC THỰC TẾ
* **Định giá tiềm năng**: Mức **Khá**
* **Phân tích giá trị kinh doanh**:
Giấy xác nhận sinh viên, xác nhận vay vốn và hồ sơ hoãn nghĩa vụ được cấp liên tục và mỗi tờ tốn của chuyên viên vài phút. Nhân lên cả năm học thì số giờ là thật và dễ đếm, điều đó khiến đây là một trong những lập luận kinh doanh dễ viết nhất ở đây. Trần của bạn nằm ở người mua: bạn bán cho một ngành duy nhất, và các trường mua chậm, mua nhỏ. Bốn loại đơn là độ phủ thật. Hãy dùng nó để chứng minh khuôn mẫu khái quát hoá được, chứ không phải để khoe đã làm bốn loại.

---

### 3. ĐIỂM SÁNG NỔI BẬT (STRENGTHS)
Bộ tài liệu của bạn đầy đủ nhất cuộc thi, gồm cả chiến lược audit và rollback. Xây một agent gọi công cụ thật thay vì một prompt tĩnh là tham vọng và đã có kết quả. Bốn loại đơn thật là độ phủ thật, không phải demo.

---

### 4. MỘT RÀO CẢN BẮT BUỘC PHẢI SỬA (CRITICAL FIX)
> *Điểm nghẽn kỹ thuật/nghiệp vụ lớn nhất cần giải quyết ngay:*

Vòng lặp agent của bạn không có trần số bước. Một trọng tài biết dừng mà chính nó không dừng được là mâu thuẫn với thứ bạn đang xây, và trên một đầu vào lạ nó sẽ lặp tới khi hết hạn mức. Đặt trần cứng năm bước và báo lên khi vượt.

---

### 5. KẾ HOẠCH HÀNH ĐỘNG ƯU TIÊN CHO SPRINT 2 (ACTION ITEMS)
1. Thêm maxSteps = 5 vào orchestrator; báo lên khi vượt.
2. Dọn thư mục nháp ra khỏi cây mã chính.
3. Gom các bài kiểm thử về sau một lệnh duy nhất.
4. Đo tỷ lệ báo lên sai.

---

### 6. ĐỐI CHIẾU TIÊU CHUẨN KỸ THUẬT ĐỀ BÀI (SPEC COMPLIANCE CHECKLIST)
| Tiêu chí đối chiếu | Kết quả đánh giá |
| :--- | :--- |
| **Tài liệu quy định (Policy doc)** | Partial / Một phần |
| **Bộ dữ liệu thử nội bộ (Test set)** | Yes / Đạt |
| **Ba kiểu dừng riêng biệt (Three stops)** | Partial / Một phần |
| **Câu hỏi báo lên cụ thể (Specific question)** | Partial / Một phần |
| **Không bao giờ đoán bừa (No confident guess)** | Yes / Đạt |
| **Không báo lên thừa (No over-escalation)** | Partial / Một phần |
| **Đường dẫn chạy trực tiếp (Live URL)** | No / Chưa |
| **Lệnh chạy kiểm chứng (Verify run)** | Yes / Đạt |
| **Kho mã nguồn sạch (Repo clean)** | Yes / Đạt |

* **Ghi chú đối chiếu**: Chấm độ tin cậy là tín hiệu thật về độ không chắc chắn dữ kiện. Có kiểm tra quy định; chưa có định tuyến theo thẩm quyền.
* **Nhận xét tổng kết kỹ thuật**: Bộ tài liệu đầy đủ nhất, gồm cả chiến lược audit và rollback, trên bốn loại đơn thật với một động cơ quy định thật. Nhưng vòng lặp agent không có trần số bước — một trọng tài biết dừng mà chính nó không dừng được là mâu thuẫn với ý tưởng cốt lõi của đề bài.
