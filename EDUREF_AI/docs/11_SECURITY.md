# Security status

## Controls đã áp dụng

- REST chat và các mutation hồ sơ yêu cầu JWT; danh tính được nạp lại từ database, không tin `currentUser` do client gửi.
- Socket.IO xác thực JWT trong handshake và dùng danh tính đã ký thay vì `studentCode`/role từ payload.
- API duyệt, từ chối và rollback yêu cầu role `STAFF`, `DEAN` hoặc `ADMIN`.
- Đăng nhập cán bộ bắt buộc có mật khẩu và không có mật khẩu “fail-safe”.
- `JWT_SECRET` là bắt buộc trong production; secret demo chỉ tồn tại ngoài production.
- CORS dùng allowlist từ localhost và `FRONTEND_URL`.
- Audit ghi tuần tự; auto-approve ghi trạng thái và hash trong cùng transaction.
- Chứng từ tải lên bắt đầu ở trạng thái `PENDING`.
- Khi vision lỗi dịch vụ, hệ thống không trả kết quả hợp lệ giả và dừng tự động hóa.

## Rủi ro còn lại trước production

- Tài khoản sinh viên demo hiện đăng nhập bằng MSSV, chưa có mật khẩu/SSO; chỉ phù hợp môi trường demo.
- In-memory audit queue chỉ đồng bộ trong một Node process. Triển khai nhiều replica cần advisory lock/row lock ở PostgreSQL.
- QR hiện dùng dịch vụ công cộng và chứa mã hồ sơ/MSSV trong payload; production nên sinh QR nội bộ với token ký, thời hạn ngắn.
- Terminal log đang broadcast cho mọi socket đã xác thực; production cần room theo tenant/user và lọc PII.
- Verify endpoint tạo dữ liệu thật trong database demo. Production cần database/scope kiểm thử riêng và chính sách dọn dữ liệu.
- Cần rate limit, security headers, secret manager, log redaction và quy trình rotation trước khi xử lý dữ liệu thật.

## Dữ liệu demo

Dữ liệu seed là dữ liệu synthetic phục vụ trình diễn. Không nạp dữ liệu sinh viên thật nếu chưa có thông báo mục đích, cơ sở pháp lý/đồng thuận, thời hạn lưu và kiểm soát truy cập phù hợp.
