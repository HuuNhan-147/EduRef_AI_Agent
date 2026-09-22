# 11. BÁO CÁO AN TOÀN & BẢO MẬT HỆ THỐNG (SECURITY AUDIT & MITIGATION)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Thời điểm đánh giá:** Post-Sprint 1 Technical Audit

---

## 1. PHÂN LOẠI & ĐÁNH GIÁ MỨC ĐỘ RỦI RO (RISK CLASSIFICATION)

| STT | Lỗ hổng / Rủi ro an ninh | Mức độ nghiêm trọng (Severity) | Phạm vi ảnh hưởng | Vị trí trong Code | Trạng thái |
|---|---|---|---|---|---|
| 1 | **Bypass Authentication qua Demo Fallback** | 🔴 **CRITICAL** | Cho phép kẻ xấu chiếm quyền DEAN/STAFF duyệt đơn mà không cần mật khẩu | [authMiddleware.js:32-41](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/middlewares/authMiddleware.js#L32-L41) | ⚠️ Cần gỡ bỏ ngay trước Sprint 2 |
| 2 | **Route Rollback không có middleware xác thực** | 🔴 **CRITICAL** | Cho phép bất kỳ ai gửi mã đơn để thu hồi/hủy đơn của sinh viên khác | [agentRoutes.js:86](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/routes/agentRoutes.js#L86) | ⚠️ Cần gắn authMiddleware |
| 3 | **Race Condition đứt chuỗi băm AuditLog** | 🟠 **HIGH** | Hai request ghi log đồng thời đọc cùng 1 `previousHash` làm hỏng Verify Chain | [AuditLogService.js:58-78](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/AuditLogService.js#L58-L78) | ⚠️ Cần bọc Transaction / Mutex |
| 4 | **Fallback Mock trong Gemini Vision** | 🟠 **HIGH** | Khi API Gemini lỗi, hệ thống tự động trả về kết quả "HỢP LỆ" cho Cao Hữu Nhân | [CertificateVisionService.js:158](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/CertificateVisionService.js#L158) | ⚠️ Cần sửa thành báo lỗi / Escalate |
| 5 | **CORS cho phép tất cả các nguồn (`callback(null, true)`)** | 🟡 **MEDIUM** | Nguy cơ tấn công Cross-Site Request Forgery (CSRF) | [server.js:54](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/server.js#L54) | ⚠️ Cần siết chặt whitelist origin |
| 6 | **Lộ PII qua URL máy chủ QR công cộng** | 🔵 **LOW** | MSSV và mã đơn truyền qua query param lên `api.qrserver.com` | `AcademicWorkflowService.js:464` | 💡 Thay bằng thư viện tạo QR nội bộ |

---

## 2. CHI TIẾT CÁC LỖ HỔNG & GIẢI PHÁP KHẮC PHỤC (MITIGATION)

### 2.1. Lỗ hổng Bypass Authentication (BUG-01)
- **Mã nguồn hiện tại:**
  ```javascript
  // authMiddleware.js:32
  const demoRole = req.body?.actorType || req.query?.actorType;
  if (demoRole) {
    req.user = { id: 'demo_user', role: demoRole, fullName: 'Cán bộ PĐT (Demo Mode)' };
    return next();
  }
  ```
- **Rủi ro:** Kẻ tấn công chỉ cần gửi `POST /api/petitions/:id/approve?actorType=DEAN` là vượt qua chốt kiểm tra `requireStaffOrDean`.
- **Giải pháp cho Sprint 2:** Loại bỏ hoàn toàn fallback này trên các API quản trị; bắt buộc phải đăng nhập qua `POST /api/auth/login` để lấy JWT Bearer Token có chữ ký của máy chủ.

### 2.2. Race Condition chuỗi băm AuditLog (BUG-03)
- **Mã nguồn hiện tại:** Đọc `lastLog` từ DB, sau đó tính hash ở Node.js, rồi `prisma.auditLog.create()`. Không có Database Transaction hay Row Lock.
- **Rủi ro:** Khi nhận tải đồng thời (ví dụ 10 sinh viên nộp đơn cùng 1 giây), hai tiến trình đọc cùng `previousHash` $\rightarrow$ sinh ra 2 khối có cùng `previousHash` $\rightarrow$ chuỗi băm bị phân nhánh (forked), làm `verifyEntireChain` báo lỗi đứt gãy.
- **Giải pháp cho Sprint 2:**
  - Áp dụng `prisma.$transaction` kết hợp câu lệnh `SELECT FOR UPDATE` trên bảng ghi log cuối cùng.
  - Sử dụng hàng đợi tuần tự (In-memory Mutex Queue) để các thao tác ghi log được thực thi tuần tự lần lượt.

### 2.3. Fallback Mock trong Gemini Vision (BUG-04)
- **Rủi ro:** Nếu ngắt mạng internet của máy chủ, khi sinh viên tải lên một ảnh bất kỳ (kể cả ảnh trắng hoặc văn bằng giả mạo), hàm `getFallbackVerification()` tự động trả về kết quả đạt 100% với tên Cao Hữu Nhân.
- **Giải pháp cho Sprint 2:**
  - Khi Gemini Vision gặp lỗi mạng hoặc quota: Trả về trạng thái `imageQuality: 'ERROR'` và thông báo: *"Dịch vụ giám định thị giác đang tạm gián đoạn. Hồ sơ của bạn đã được chuyển tiếp lên Cán bộ PĐT để thẩm định thủ công."* Chuyển trạng thái đơn sang `ESCALATED`.
