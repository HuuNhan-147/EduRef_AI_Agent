# 09. DANH MỤC API HỆ THỐNG (REST API SPECIFICATION)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Base URL:** `http://localhost:5000/api`

---

## 1. NHÓM XÁC THỰC (AUTHENTICATION) — `/api/auth`

### 1.1. `POST /api/auth/login`
- **Mục đích:** Đăng nhập thông thường và cấp JWT cho sinh viên hoặc cán bộ.
- **Request Body (Sinh viên):**
  ```json
  { "studentCode": "2280602154" }
  ```
- **Request Body (Cán bộ):**
  ```json
  { "username": "dean_daotao", "password": "<STAFF_PASSWORD>" }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cm...",
      "studentCode": "2280602154",
      "fullName": "Cao Hữu Nhân",
      "role": "STUDENT",
      "tuitionDebt": 0,
      "gpa": 3.52,
      "department": "Khoa Công Nghệ Thông Tin"
    }
  }
  ```

### 1.2. `POST /api/auth/demo-login`

- **Mục đích:** Chuyển nhanh giữa các tài khoản allowlist phục vụ chấm hackathon mà không nhúng mật khẩu cán bộ vào frontend.
- **Điều kiện:** Chỉ hoạt động khi `ALLOW_DEMO_ROLE_SWITCH=true`; production thông thường phải để `false`.
- **Body:** `{ "accountKey": "STUDENT_ACTIVE" }`. Các khóa hợp lệ: `STUDENT_ACTIVE`, `STUDENT_DROPPED`, `STUDENT_DEBT`, `STAFF_DAOTAO`, `DEAN_DAOTAO`.
- Endpoint chỉ cấp JWT cho đúng năm tài khoản demo cố định, không nhận username/role tùy ý từ client.

---

## 2. NHÓM HỒ SƠ ĐƠN PHIẾU (PETITIONS) — `/api/petitions`

### 2.1. `GET /api/petitions`
- **Mục đích:** Lấy danh sách hồ sơ đơn sinh viên (hỗ trợ lọc theo `status`, giới hạn `limit`).
- **Query Params:** `status=ESCALATED`, `limit=50`.
- **Response Success (200):** Trả về mảng danh sách các đối tượng `StudentRequest`.

### 2.2. `POST /api/petitions`
- **Mục đích:** Nộp hồ sơ đơn mới trực tiếp từ biểu mẫu sinh viên.
- **Request Body:**
  ```json
  {
    "studentCode": "2280602154",
    "requestTypeCode": "STUDENT_CONFIRMATION",
    "formData": {
      "purpose": "Đăng ký vé tháng xe buýt liên tuyến",
      "pickupCampus": "Trụ sở chính (A-01.01)"
    }
  }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": {
      "requestCode": "ST-819234",
      "status": "APPROVED",
      "decision": "AUTO_APPROVED",
      "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/...",
      "sha256Proof": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  }
  ```

### 2.3. `GET /api/petitions/:id`
- **Mục đích:** Xem chi tiết đầy đủ của một đơn (thông tin sinh viên, chứng từ đính kèm, Context Capsule, chuỗi nhật ký kiểm toán `auditLogs`).

### 2.4. `POST /api/petitions/:id/approve`
- **Mục đích:** Cán bộ PĐT / Trưởng khoa phê duyệt hồ sơ bị chuyển tiếp (`ESCALATED`).
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  { "note": "Hồ sơ hợp lệ, đủ điều kiện xét tốt nghiệp." }
  ```
- **Response Success (200):** Cấp mã QR chứng thực của Cán bộ và lưu `reviewerNote` vào `contextCapsule`.

### 2.5. `POST /api/petitions/:id/reject`
- **Mục đích:** Cán bộ từ chối hồ sơ kèm lý do bắt buộc.
- **Request Body:**
  ```json
  { "reason": "Chứng chỉ tiếng Anh hết thời hạn hiệu lực." }
  ```

### 2.6. `POST /api/petitions/:id/rollback`
- **Mục đích:** Con người can thiệp dừng khẩn cấp (Human Override), vô hiệu hóa mã QR và chuyển trạng thái sang `CANCELLED`.
- **Request Body:**
  ```json
  { "reason": "Phát hiện khai báo sai lệch số hiệu văn bằng gốc." }
  ```

### 2.7. `POST /api/petitions/:id/resume`
- **Mục đích:** Sinh viên bổ sung dữ liệu/chứng từ sau khi bị hỏi làm rõ (`WAITING_STUDENT`).
- **Request Body:**
  ```json
  {
    "additionalData": { "purpose": "Vay vốn ngân hàng chính sách xã hội" },
    "newDocuments": []
  }
  ```

### 2.8. `GET /api/petitions/stats/metrics`
- **Mục đích:** Lấy số đếm, automation rate và latency đã quan sát. Hai tỷ lệ missed/false escalation trả `null` cho đến khi có tập độc lập có nhãn.
- **Auth:** JWT role STAFF/DEAN/ADMIN.

---

## 3. NHÓM TÁC TỬ & KIỂM THỬ (AGENT & VERIFY) — `/api/agent`

### 3.1. `POST /api/agent/chat`
- **Mục đích:** Gọi AI Agent dạng HTTP REST (Fallback khi không dùng Socket.IO).
- **Auth:** Bearer JWT bắt buộc. Danh tính lấy từ token/database; `studentCode` hoặc role do client tự khai không được tin cậy.
- **Request Body:**
  ```json
  {
    "message": "Cho em xin giấy xác nhận sinh viên để làm vé xe buýt",
    "sessionId": "sess_12345"
  }
  ```

### 3.2. `POST /api/agent/verify-90s`
- **Mục đích:** Chạy 5 ca Track A với phân bố bắt buộc 3 AUTO + 2 ESCALATE.

### 3.3. `POST /api/agent/verify-general`
- **Mục đích:** Chạy bộ Verify tổng quát 4 ca, trả PASS/FAIL và timestamp.

### 3.4. `POST /api/agent/verify-custom-prompt`
- **Mục đích:** Chạy ca mới do giám khảo nhập qua cùng policy engine.
- **Body:** `{ "prompt": "...", "studentCode": "..." }`; `studentCode` là tùy chọn trong môi trường demo.

### 3.5. `GET /api/agent/terminal-logs`
- **Mục đích:** Lấy lịch sử dòng lệnh suy luận gần nhất của AI Agent (dùng cho Live Terminal Console).

---

## 4. NHÓM KIỂM TOÁN MẬT MÃ HỌC (AUDIT) — `/api/audit`

### 4.1. `GET /api/audit/logs`
- **Mục đích:** Lấy danh sách các bản ghi nhật ký kiểm toán kèm mã băm `sha256Hash` và `previousHash`.

### 4.2. `GET /api/audit/verify-chain`
- **Mục đích:** Quét và kiểm tra tính toàn vẹn mật mã học của toàn bộ chuỗi băm từ Genesis Block đến hiện tại.
- **Response Success (200):**
  ```json
  {
    "chainValid": true,
    "totalBlocks": 124,
    "genesisHash": "GENESIS_HASH_EDUREF_2026",
    "latestHash": "4a7f921...c890",
    "message": "Toàn bộ 124 khối trong chuỗi kiểm toán SHA-256 hoàn toàn bất biến, toàn vẹn 100%.",
    "verifiedAt": "2026-09-21T14:15:30.123Z"
  }
  ```
