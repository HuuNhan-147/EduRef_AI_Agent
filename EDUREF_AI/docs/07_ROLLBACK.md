# 07. CƠ CHẾ CAN THIỆP DỪNG & THU HỒI CHỨNG THỰC (HUMAN OVERRIDE & REVOCATION)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Module:** `AcademicWorkflowService.rollbackRequest`, `agentRoutes.js`

---

## 1. BẢN CHẤT NGHIỆP VỤ: ROLLBACK HAY REVOKE?

Trong yêu cầu của Track 2 Option A có đề cập đến cơ chế **"Human Override / Rollback"**. Tuy nhiên, sau khi kiểm toán mã nguồn thực tế:

> **Kết luận kiểm toán:**  
> Hệ thống **KHÔNG PHẢI LÀ STATE REWIND** (không quay ngược trạng thái về PENDING như chưa từng xảy ra).  
> Bản chất thực tế của chức năng này là: **REVOCATION & CANCELLATION (Can thiệp dừng khẩn cấp & Thu hồi chứng thực số)**.

### Lý do về mặt pháp lý học vụ:
Trong quản lý đào tạo đại học, một khi quyết định đã được ký ban hành và cấp mã QR xuất trình cho cơ quan bên ngoài, **tuyệt đối không được phép âm thầm "tua lại" như chưa từng có gì xảy ra**. Việc thu hồi bắt buộc phải:
1. Đổi trạng thái đơn sang ĐÃ HỦY / ĐÃ THU HỒI (`CANCELLED`).
2. Vô hiệu hóa ngay lập tức mã QR và chữ ký điện tử (`qrCodeUrl = null`).
3. Ghi nhận rõ ràng ai là người can thiệp, vào thời điểm nào và lý do thu hồi là gì vào Nhật ký kiểm toán SHA-256.

---

## 2. QUY TRÌNH THỰC THI CAN THIỆP DỪNG (WORKFLOW)

Mã nguồn thực tế tại [AcademicWorkflowService.js:693-743](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/AcademicWorkflowService.js#L693-L743):

```
Cán bộ PĐT / Giám khảo nhấn "Can thiệp Dừng Khẩn Cấp (Rollback)"
                           │
                           ▼
Nhập lý do bắt buộc (Ví dụ: "Phát hiện chứng chỉ giả mạo")
                           │
                           ▼
        Gọi POST /api/petitions/:id/rollback
                           │
                           ▼
  1. Đọc trạng thái hiện tại: beforeState = { status, qrCodeUrl }
  2. Cập nhật Database:
     - status = 'CANCELLED'
     - decision = 'HUMAN_OVERRIDE_CANCELLED'
     - qrCodeUrl = null (Xóa mã QR)
     - escalationReason = "Hoàn tác / Can thiệp ghi đè bởi [Cán bộ]: ..."
  3. Ghi vết kiểm toán bất biến:
     - action = 'HUMAN_OVERRIDE_ROLLBACK'
     - decision = 'CANCELLED'
     - beforeState & afterState lưu snapshot đối soát
     - Sinh mã băm SHA-256 mới nối tiếp chuỗi
                           │
                           ▼
   Trả về thông báo: Đã thu hồi và vô hiệu hóa mã QR thành công
```

---

## 3. KHẢ NĂNG BỀN VỮNG KHI SERVER RESTART

- **Lưu trữ:** Toàn bộ trạng thái của đơn và lịch sử trước/sau đều được lưu trữ trực tiếp trong cơ sở dữ liệu **PostgreSQL** (bảng `StudentRequest` và `AuditLog`).
- **Khả năng chịu lỗi:** Kể cả khi backend Node.js bị tắt, khởi động lại hoặc crash tiến trình, trạng thái `CANCELLED` và việc vô hiệu hóa mã QR vẫn tồn tại vĩnh viễn trong Database.

---

## 4. CÁC HẠN CHẾ & KHOẢNG TRỐNG KỸ THUẬT (LIMITATIONS)

Dựa trên kết quả kiểm toán mã nguồn, phát hiện 2 điểm cần cải tiến trước Sprint 2:
1. **Thiếu Idempotency Check:** Hiện tại, nếu người dùng gọi lệnh Rollback trên một đơn vốn đã bị `CANCELLED` từ trước, hệ thống vẫn cho phép update lại và tạo thêm một bản ghi AuditLog trùng lặp.
   - *Khắc phục:* Bổ sung kiểm tra `if (request.status === 'CANCELLED') throw new Error('Đơn đã ở trạng thái thu hồi.')`.
2. **Thiếu Authorization trên endpoint `/api/agent/rollback`:** Cần gắn middleware `requireStaffOrDean` để chỉ có Cán bộ hoặc Quản trị viên mới được phép thực hiện thao tác thu hồi.
