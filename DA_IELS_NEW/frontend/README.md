# EquipAgent AI — Frontend Single Page Application
> **Module:** `frontend`  
> **Công nghệ:** React 18 · Vite · TailwindCSS · Socket.IO Client · Lucide Icons · WebMCP Runtime  
> **Mục tiêu:** Giao diện điều khiển tương tác trực tiếp cho Ban Giám Khảo và Người dùng tại Vòng Chung Kết MLAI Hackathon 2026.

---

## 1. CẤU TRÚC THƯ MỤC CHI TIẾT (`frontend/`)

```
frontend/
├── index.html                  # Khung HTML gốc của ứng dụng
├── package.json                # Phụ thuộc thư viện (React, Vite, Socket.IO Client, TailwindCSS)
├── vite.config.js              # Cấu hình Vite build tool & proxy
├── tailwind.config.js          # Cấu hình bảng màu giao diện & animation
├── postcss.config.js           # Cấu hình tiền xử lý CSS
│
└── src/                        # MÃ NGUỒN CHÍNH CỦA ỨNG DỤNG
    ├── main.jsx                # Khởi động React DOM root
    ├── App.jsx                 # Điều hướng chính giữa các tab: ARENA, LOANS, INVENTORY, AUDIT
    ├── api.js                  # Cấu hình Axios instance giao tiếp backend REST API
    ├── index.css               # Định nghĩa kiểu toàn cục và thanh cuộn tùy chỉnh
    │
    ├── components/             # CÁC THÀNH PHẦN GIAO DIỆN CHỨC NĂNG
    │   ├── AIAgentArena.jsx    # Đấu trường AI: Khung Chat Streaming & Verify Harness Panel 90s
    │   ├── AuditTrailView.jsx  # Trình xem nhật ký kiểm toán SHA-256 bất biến & bộ lọc sự kiện
    │   ├── InventoryManager.jsx# Quản lý kho thiết bị, phân loại và tình trạng tồn kho
    │   ├── LoanListView.jsx    # Danh sách phiếu mượn thời gian thực, mã QR & nút thu hồi
    │   ├── MaintenanceManager.jsx # Quản lý thiết bị hư hỏng và lịch sử bảo trì
    │   ├── Navbar.jsx          # Thanh điều hướng trên cùng, chuyển tab & chuyển vai trò
    │   ├── StatsHeader.jsx     # Thẻ thống kê tổng quan số liệu kho ở đầu trang
    │   ├── BorrowModal.jsx     # Modal tạo phiếu mượn thủ công truyền thống
    │   ├── CategoryFilter.jsx  # Thanh lọc thiết bị theo từng danh mục
    │   ├── EquipmentCard.jsx   # Thẻ hiển thị hình ảnh, giá trị và tồn kho của thiết bị
    │   └── MarkdownText.jsx    # Component hiển thị nội dung Markdown định dạng đẹp mắt
    │
    └── webmcp/                 # TẦNG GIAO TIẾP WEBMCP PHÍA TRÌNH DUYỆT (CLIENT RUNTIME)
        ├── index.js            # Khởi tạo và xuất bản window.webMcp
        ├── WebMCPManager.js    # Quản lý document.modelContext và hứng RPC từ server
        └── tools/
            └── equipmentMcpTools.js # Công cụ WebMCP thao tác trực tiếp trên React State
```

---

## 2. CÁC MÀN HÌNH CHÍNH (KEY SCREENS & VIEWS)

### 2.1. Đấu Trường AI (`AIAgentArena.jsx`) — Trọng tâm trình diễn Hackathon
Màn hình chia làm 2 cột tối ưu cho trải nghiệm của Ban Giám Khảo:
* **Cột trái — Khung Chat ReAct Co-pilot:**
  - Nhập câu hỏi tự nhiên bằng tiếng Việt (hỗ trợ từ lóng, viết tắt).
  - Phản hồi dạng **Streaming từng ký tự (Token Streaming)** mượt mà qua Socket.IO.
  - Hiển thị trực quan thẻ quyết định tự động (`Loan Card`) với mã nhận đồ `pickupCode` màu xanh lá cây.
  - Hiển thị thẻ cảnh báo chuyển tiếp thẩm quyền (`Escalation Card`) màu vàng khi mượn tài sản lớn.
  - Hàng nút bấm gợi ý nhanh (**Quick Prompts**):
    - *Bộ đàm Motorola* (Thường quy $\le 20\text{M}$)
    - *Bàn phím DareU* (Thường quy $\le 20\text{M}$)
    - *Màn hình Dell 4K* (Thường quy $\le 20\text{M}$)
    - *Máy chiếu Panasonic* (Mờ thông tin để thử thách AI)
    - *MacBook Pro M3 Max* (Vượt thẩm quyền $> 20\text{M}$)
* **Cột phải — Bảng Kiểm Thử Tự Hành 90 Giây (Verify Harness Panel):**
  - Nút bấm: **`[⚡ Chạy Kiểm Thử 90 Giây]`** — Kích hoạt chạy 5 Test Cases thực tế liên tiếp.
  - Thanh tiến trình trực quan theo phần trăm hoàn thành ($0\% \rightarrow 100\%$).
  - Bảng kết quả từng Test Case hiển thị:
    - Câu tin nhắn test thực tế gửi vào agent (`inputPrompt`).
    - Phản hồi thực tế của AI (`aiReply`).
    - Thời gian phản hồi thực tế tính theo mili-giây (`decisionTimeMs`).
    - Trạng thái kiểm thử (`PASSED` / `FAILED`).
  - **Tương tác Ban Giám Khảo cho TC-05 (MacBook Pro):**
    - Hiển thị thông báo: *"⚖️ BGK XÁC NHẬN THẨM QUYỀN"*.
    - **2 nút bấm hành động:** **`[BGK Duyệt Thẩm Quyền]`** và **`[BGK Bác Bỏ]`** để kiểm tra tính năng Human-in-the-loop cấp cao nhất.

### 2.2. Bảng Nhật Ký Kiểm Toán (`AuditTrailView.jsx`)
* Đáp ứng trọn vẹn tiêu chí **Minh bạch & Trách nhiệm giải trình (Accountability)** của cuộc thi:
  - Hiển thị toàn bộ lịch sử can thiệp của AI Agent và con người.
  - **Bộ lọc danh mục:** Tất cả · Tự động duyệt · Chuyển tiếp · BGK can thiệp · Hỏi làm rõ.
  - **Thẻ kiểm toán chi tiết:**
    - Tác nhân thực thi (`AI_AGENT`, `LAB_MANAGER`, `BGK_JUDGE`).
    - Hành động nghiệp vụ (`AUTO_APPROVE_LOAN`, `ESCALATE_LOAN`, `BGK_CONFIRM`, `ROLLBACK_LOAN`).
    - Câu hỏi gốc của người dùng và câu trả lời đầy đủ của AI.
    - Thời gian xử lý chính xác đến mili-giây.
    - Căn cứ quy chế đối chiếu (`policyRuleMatched`).
    - **Nút xem mã băm SHA-256:** Mở modal kiểm tra chuỗi mã băm bất biến và mã liên kết khối trước (`previousHash`).

### 2.3. Quản Lý Phiếu Mượn (`LoanListView.jsx`)
* Hiển thị toàn bộ danh sách phiếu mượn thời gian thực được lấy từ API `/api/loans/public-list`.
* Tự động làm mới (Auto Refresh) ngay khi AI Agent duyệt xong một phiếu mượn mới.
* Hiển thị mã nhận đồ tại tủ (`pickupCode`), thời gian mượn, người mượn và giá trị tài sản.
* Cung cấp nút **`[Hoàn tác / Hủy phiếu]`** để người quản lý thử nghiệm tính năng Rollback 1-chạm.

### 2.4. Quản Lý Kho Thiết Bị (`InventoryManager.jsx`)
* Danh mục 7 thiết bị thực tế trong kho:
  1. Bàn phím cơ DareU EK87 (`850.000 đ`)
  2. Màn hình Dell UltraSharp 27" 4K (`12.500.000 đ`)
  3. Máy chiếu Panasonic PT-VX430 (`18.000.000 đ`)
  4. Bộ đàm Motorola CP1300 (`2.500.000 đ`)
  5. Micro thu âm Rode Wireless GO II (`7.500.000 đ`)
  6. MacBook Pro 16" M3 Max (`45.000.000 đ` — Tài sản lớn)
  7. Máy quay chuyên dụng Sony FX3 (`85.000.000 đ` — Tài sản lớn)
* Hiển thị số lượng khả dụng (`availableStock`) tự động giảm đi khi AI duyệt phiếu mượn.

---

## 3. KIẾN TRÚC GIAO THỨC WEBMCP PHÍA TRÌNH DUYỆT

Thư mục `src/webmcp/` hiện thực hóa chuẩn **Web Model Context Protocol (WebMCP)**:
* `WebMCPManager.js`:
  - Khởi tạo đối tượng `window.document.modelContext`.
  - Đăng ký danh sách các công cụ phía client (`client tools`).
  - Lắng nghe sự kiện RPC từ máy chủ qua Socket.IO: Khi máy chủ gửi yêu cầu thực thi công cụ qua `webmcp_execute_tool`, trình duyệt sẽ gọi trực tiếp mã JavaScript phía client để cập nhật giao diện mà không cần gọi thêm API HTTP nào khác.
* `tools/equipmentMcpTools.js`:
  - Cung cấp công cụ cập nhật danh sách thiết bị và phiếu mượn trực tiếp vào React State.

---

## 4. HƯỚNG DẪN KHỞI CHẠY FRONTEND

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển Vite
npm run dev
```

Ứng dụng sẽ sẵn sàng tại: `http://localhost:5173`.
Frontend đã được cấu hình tự động kết nối đến Backend tại `http://localhost:5000` thông qua Socket.IO và Axios.
