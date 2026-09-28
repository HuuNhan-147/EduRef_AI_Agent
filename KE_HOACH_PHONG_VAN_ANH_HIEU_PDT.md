# 📋 KỊCH BẢN PHỎNG VẤN CHUYÊN SÂU — ANH HIẾU (HỌC VỤ ĐIỆN TỬ HUTECH)
> **Mục tiêu:** Đối chiếu và tinh chỉnh luồng xử lý của EduRef AI mô phỏng chính xác nghiệp vụ thực tế của Nhà trường.  
> **Thời gian:** 09h00 — Sáng mai (29/09/2026) | **Địa điểm:** VP Khoa CNTT, Thủ Đức Campus  

---

## 1. TỪ LÚC SINH VIÊN TẠO ĐƠN
- Trong thực tế, sinh viên muốn xin Giấy Xác nhận sinh viên thì cần cung cấp những thông tin nào là bắt buộc?
- Thông tin nào hệ thống tự lấy được từ cơ sở dữ liệu?
- Thông tin nào sinh viên phải tự khai báo?
- Sinh viên có cần upload giấy tờ / minh chứng gì không?
  - Nếu có thì từng loại giấy tờ dùng để kiểm tra điều kiện gì?
  - Có trường hợp nào thiếu giấy tờ nhưng cán bộ vẫn linh động xử lý được không?
- Có những loại mục đích xin xác nhận nào thường gặp nhất trong trường?
  - *(Ví dụ: Tạm hoãn NVQS, Vay vốn sinh viên, Thực tập tốt nghiệp, Xin việc làm, Làm visa, Làm vé xe buýt...)*
- Mục đích sử dụng có ảnh hưởng đến **mẫu giấy** hoặc **điều kiện xét cấp** không?

---

## 2. CÁN BỘ THỰC TẾ KIỂM TRA NHỮNG GÌ?
- Khi nhận một đơn XNSV, cán bộ thực tế sẽ kiểm tra những thông tin nào trước tiên?
- Những điều kiện nào có thể kiểm tra hoàn toàn tự động bằng dữ liệu trên hệ thống?
- Có điều kiện nào mà hệ thống không đủ dữ liệu để tự kết luận và bắt buộc cán bộ phải xem xét thủ công không?
- Nếu thông tin sinh viên tự khai trên đơn khác với dữ liệu đang lưu trên hệ thống thì cán bộ xử lý như thế nào?
- Có trường hợp nào sinh viên vẫn được cấp giấy dù **không thỏa một điều kiện thông thường** không?
  - Nếu có thì ai có quyền quyết định ngoại lệ này?
  - Cán bộ dựa vào căn cứ / văn bản nào để ra quyết định?

---

## 3. QUAN TRỌNG NHẤT: XÁC ĐỊNH RANH GIỚI AI ↔ CON NGƯỜI (HITL)
- Trong toàn bộ quy trình này, những trường hợp nào anh cho rằng hệ thống **có thể tự động duyệt hoàn toàn (AUTO-APPROVE)**?
- Những trường hợp nào anh muốn hệ thống **tuyệt đối không tự duyệt** mà bắt buộc phải chuyển tiếp cho cán bộ (ESCALATE)?
- Khi chuyển một đơn cho cán bộ, cán bộ cần nhìn thấy những thông tin tóm tắt nào trên màn hình để có thể ra quyết định nhanh nhất (trong 5 giây)?
- Nếu AI không chắc chắn về một thông tin hoặc gặp trường hợp chưa có trong quy định thì thực tế cán bộ sẽ làm gì?  
  *(👉 Trọng tâm để thiết kế cơ chế ASK CLARIFICATION vs ESCALATE)*
- Có trường hợp nào hệ thống **nên hỏi lại sinh viên trước**, thay vì chuyển thẳng cho cán bộ không?  
  *(👉 Ví dụ: thiếu mục đích, thiếu thông tin, thiếu minh chứng đính kèm)*

---

## 4. ĐỐI CHIẾU VỚI EDUREF HIỆN TẠI
*(Mở sản phẩm EduRef AI trên laptop cho anh Hiếu xem từng bước rồi phỏng vấn trực tiếp)*

- Với luồng EduRef hiện tại, bước nào đang khác với cách các anh/chị xử lý thực tế hàng ngày?
- Ở bước kiểm tra điều kiện này, EduRef đang kiểm tra như vậy đã đúng nghiệp vụ chưa? Có điều kiện nào đang thiếu hoặc đang kiểm tra thừa không?
- Ở trường hợp này EduRef đang để **AUTO**. Theo nghiệp vụ thực tế, trường hợp này có được tự động duyệt không hay bắt buộc cán bộ phải xem? Vì sao?
- Ở trường hợp này EduRef đang để **ESCALATE**. Thực tế cán bộ có cần can thiệp không, hay có thể tự động xử lý luôn?
- **Nếu chỉ được sửa 1–2 điểm trong luồng hiện tại để anh có thể tin tưởng sử dụng, anh sẽ muốn nhóm sửa điểm nào nhất?**

---

## 5. CHỐT ĐỂ THIẾT KẾ POLICY + HUMAN-IN-THE-LOOP (HITL)
- Nếu phải mô tả quy trình XNSV thành các bước:  
  **`Kiểm tra A → Kiểm tra B → Kiểm tra C → Quyết định`**, anh sẽ mô tả như thế nào?
- Đâu là điều kiện mà **chỉ cần không đạt là chắc chắn từ chối**, không cần xét tiếp?
- Đâu là điều kiện nếu **không đủ thông tin thì phải hỏi lại sinh viên**?
- Đâu là trường hợp **phải chuyển cán bộ quyết định**?
- Đâu là trường hợp **cán bộ có quyền cho phép ngoại lệ** mà AI không được phép tự quyết?
- Sau khi cấp giấy rồi, có trường hợp nào cần **thu hồi / hủy giấy** không? Nếu có thì quy trình thực tế diễn ra như thế nào?

---

## 🌟 CÂU HỎI QUAN TRỌNG NHẤT CUỐI BUỔI
> *"Nếu nhóm em muốn EduRef mô phỏng đúng nhất cách Phòng Đào tạo / Nhà trường đang xử lý đơn Xác nhận sinh viên, **anh thấy trong luồng hiện tại nhóm em đang hiểu sai hoặc còn thiếu nghiệp vụ nào không ạ?**"*

---

## 📝 THÔNG TIN MINH CHỨNG NGƯỜI DÙNG THỰC TẾ
- **Họ và tên chuyên gia:** ..........................................................................................
- **Chức danh / Vị trí công tác:** ..............................................................................
- **Đơn vị / Phòng ban:** ..........................................................................................
- *(Chụp 1 tấm ảnh kỷ niệm cùng anh Hiếu và Thầy trước màn hình laptop đang chạy EduRef AI)*
