# EquipAgent AI — Backend Service Architecture
> **Module:** `backend`  
> **Nền tảng:** Node.js (ES Module) · Express.js · Socket.IO · MongoDB / Mongoose  
> **Mục tiêu:** Cung cấp API quản lý thiết bị, điều phối phiếu mượn, cổng giao tiếp thời gian thực (Streaming Socket) và dịch vụ AI Agent tự hành ("The Escalation Referee").

---

## 1. CẤU TRÚC THƯ MỤC CHI TIẾT (`backend/`)

```
backend/
├── .env                        # Biến môi trường hệ thống
├── package.json                # Định nghĩa thư viện & scripts
├── server.js                   # Entry point: HTTP & Socket.IO server
│
├── config/                     # Cấu hình kết nối & từ điển
│   ├── db.js                   # Kết nối cơ sở dữ liệu MongoDB qua Mongoose
│   └── slangDictionary.json    # Từ điển tiếng Việt chuẩn hóa viết tắt & từ lóng
│
├── controllers/                # Logic điều khiển nghiệp vụ HTTP API
│   ├── authController.js       # Xác thực, đăng ký, đăng nhập & cấp phát JWT
│   ├── equipmentController.js  # CRUD thiết bị, thống kê kho & danh mục
│   └── loanController.js       # Quản trị vòng đời phiếu mượn (duyệt, trả, gia hạn)
│
├── middlewares/                # Middleware kiểm soát & bảo vệ
│   └── authMiddleware.js       # Xác thực JWT Token & phân quyền theo Role
│
├── models/                     # 15 Mongoose Schemas mô hình hóa dữ liệu
│   ├── ApprovalAction.js       # Lịch sử thao tác duyệt/từ chối của con người
│   ├── AuditLog.js             # Nhật ký kiểm toán bất biến với chuỗi băm SHA-256
│   ├── Category.js             # Danh mục chủng loại thiết bị
│   ├── Department.js           # Khoa / Viện / Phòng ban
│   ├── Equipment.js            # Thiết bị vật lý thực tế trong kho (Cá thể hóa theo Serial/AssetCode)
│   ├── EquipmentModel.js       # Kiểu mẫu thiết bị, đơn giá thị trường, thông số kỹ thuật
│   ├── HandoverRecord.js       # Biên bản bàn giao nhận thiết bị vật lý
│   ├── IncidentReport.js       # Báo cáo sự cố, hỏng hóc, đền bù tài sản
│   ├── LoanItem.js             # Chi tiết món đồ mượn trong phiếu
│   ├── LoanRequest.js          # Phiếu mượn thiết bị tổng hợp & trạng thái phê duyệt
│   ├── Location.js             # Vị trí tủ đồ, phòng kho lưu trữ
│   ├── MaintenanceRecord.js    # Nhật ký bảo dưỡng, kiểm định định kỳ
│   ├── Notification.js         # Thông báo gửi người dùng trong hệ thống
│   ├── SystemPolicy.js         # Cấu hình chính sách ngưỡng mượn (20M / 7 ngày)
│   └── User.js                 # Tài khoản người dùng (Sinh viên, Giảng viên, Thủ kho, Quản lý)
│
├── modules/ai-agent/           # Phân hệ AI Agent Tự Hành (The Escalation Referee)
│   └── (Xem chi tiết tại modules/ai-agent/README.md)
│
├── routes/                     # Định tuyến các endpoints API
│   ├── agentRoutes.js          # Routes cho AI Agent (/chat, /verify-90s, /rollback, /bgk-confirm)
│   ├── auditRoutes.js          # Routes cho Nhật ký kiểm toán & xác minh Hash
│   ├── authRoutes.js           # Routes cho Đăng nhập / Đăng ký / Thông tin cá nhân
│   ├── equipmentRoutes.js      # Routes tra cứu thiết bị & danh mục
│   └── loanRoutes.js           # Routes quản lý phiếu mượn & public-list cho BGK
│
├── services/                   # Dịch vụ nghiệp vụ độc lập
│   ├── AuditLogService.js      # Dịch vụ ghi vết kiểm toán & băm mật mã SHA-256
│   └── AuthorityEngine.js      # Dịch vụ thẩm định thẩm quyền phân ngưỡng mượn
│
└── scripts/                    # Kịch bản thực thi tiện ích
    └── seedDatabase.js         # Khởi tạo dữ liệu mẫu chuẩn (7 thiết bị, người dùng, policy)
```

---

## 2. BIẾN MÔI TRƯỜNG (`.env`)

Tạo file `.env` tại thư mục `backend/`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/iels
JWT_SECRET=mlai_hackathon_2026_super_secret_jwt_key
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
```

---

## 3. CÁC API ENDPOINTS CHÍNH

### 3.1. AI Agent & Điều phối Thẩm quyền (`/api/agent`)
* `POST /api/agent/chat`: Chat trực tiếp với AI qua HTTP Fallback (nhận `{ message, sessionId, userId }`).
* `POST /api/agent/verify-90s`: Chạy tự động bộ kiểm thử 90 giây (5 Test Cases).
* `POST /api/agent/rollback`: Hoàn tác phiếu mượn AI đã duyệt, khôi phục tồn kho.
* `POST /api/agent/bgk-confirm`: Ban Giám Khảo bấm nút trực tiếp phê duyệt ca Escalation.
* `POST /api/agent/bgk-reject`: Ban Giám Khảo bấm nút trực tiếp từ chối ca Escalation.

### 3.2. Phiếu Mượn Thiết Bị (`/api/loans`)
* `GET /api/loans/public-list`: Endpoint công khai cho Ban Giám Khảo quan sát danh sách phiếu mượn không cần đăng nhập.
* `GET /api/loans/my-loans`: Lấy danh sách phiếu mượn của tài khoản hiện tại (JWT).
* `GET /api/loans/all`: Quản trị viên lấy danh sách toàn bộ phiếu mượn có phân trang.
* `POST /api/loans/create`: Tạo phiếu mượn mới.
* `POST /api/loans/:id/approve`: Quản lý duyệt phiếu mượn thủ công.
* `POST /api/loans/:id/reject`: Quản lý từ chối phiếu mượn.
* `POST /api/loans/:id/return`: Thủ kho xác nhận người mượn đã hoàn trả thiết bị.

### 3.3. Thiết Bị & Kho Hàng (`/api/equipments`)
* `GET /api/equipments`: Tra cứu thiết bị trong kho (hỗ trợ tìm kiếm, lọc danh mục, trạng thái).
* `GET /api/equipments/stats`: Thống kê tổng số thiết bị, số lượng sẵn sàng, đang mượn, bảo trì.
* `GET /api/equipments/categories`: Danh sách các danh mục thiết bị có sẵn.
* `GET /api/equipments/:id`: Chi tiết một thiết bị kèm thông số và số lượng tồn kho.

### 3.4. Nhật Ký Kiểm Toán Bất Biến (`/api/audit`)
* `GET /api/audit/logs`: Lấy danh sách vết kiểm toán kèm mã băm SHA-256, chuỗi băm trước (`previousHash`), câu prompt của người dùng và phản hồi của AI.
* `GET /api/audit/verify-hash`: Kiểm tra tính toàn vẹn của mã băm của một bản ghi cụ thể.

---

## 4. GIAO THỨC SOCKET.IO THỜI GIAN THỰC

Backend khởi chạy Socket.IO tại cùng cổng HTTP (`port 5000`) để hỗ trợ phản hồi luồng (Streaming):
* **Sự kiện nhận (`socket.on`):**
  - `client_send_message`: Dữ liệu nhận gồm `{ message, sessionId, userId, token, hasWebMCP }`.
* **Sự kiện phát (`socket.emit`):**
  - `agent_response_chunk`: Phát từng đoạn text (Token Chunk) về client ngay khi Gemini sinh ra.
  - `agent_response_end`: Phát kết quả hoàn chỉnh kèm payload (thông tin phiếu mượn, mã QR `pickupCode`, escalation info).
  - `agent_response_error`: Báo lỗi nếu gặp sự cố xử lý.

---

## 5. DỊCH VỤ CỐT LÕI (SERVICES)

### 5.1. `AuditLogService.js` (Bảo Chứng Trách Nhiệm Giải Trình)
* Tự động sinh chuỗi mã băm SHA-256 cho mỗi hành động tự duyệt (`AUTO_APPROVE_LOAN`), chuyển tiếp (`ESCALATE_LOAN`), hoàn tác (`ROLLBACK_LOAN`) hoặc can thiệp của Ban Giám Khảo (`BGK_CONFIRM`).
* Dữ liệu băm bao gồm: `action`, `actorType`, `actorId`, `targetResource`, `targetResourceId`, `factsSnapshot` (input prompt, ai reply, policy rule), `timestamp`, và mã `previousHash` của bản ghi liền trước tạo thành chuỗi liên kết không thể sửa đổi (Blockchain-like Hash Chaining).

### 5.2. `AuthorityEngine.js` (Bộ Quy Chế Phân Ngưỡng)
* Kiểm tra yêu cầu mượn dựa trên 2 tiêu chí bất biến của Đề A:
  1. **Định giá tài sản:** Ngưỡng tối đa tự duyệt là $\le 20.000.000\text{ VNĐ}$. Vượt ngưỡng $\rightarrow$ Chuyển cấp có thẩm quyền (Escalation).
  2. **Thời hạn mượn:** Ngưỡng tối đa tự duyệt là $\le 7\text{ ngày}$. Vượt ngưỡng $\rightarrow$ Chuyển cấp có thẩm quyền (Escalation).
  3. **Tính đầy đủ thông tin:** Nếu thiếu thời gian trả hoặc mục đích sử dụng $\rightarrow$ Yêu cầu AI hỏi làm rõ (`ASK_CLARIFICATION`), không được đoán mò.

---

## 6. HƯỚNG DẪN VẬN HÀNH

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Nạp dữ liệu mẫu chuẩn (7 thiết bị, người dùng, policy)
npm run seed

# 3. Khởi chạy server ở chế độ phát triển (auto reload qua nodemon)
npm start
```
Server sẽ lắng nghe tại: `http://localhost:5000`.
