# Runbook trình diễn Track A

## Chuẩn bị

1. Tạo project Supabase và cấu hình `DATABASE_URL` (Transaction pooler), `DIRECT_URL` (Session pooler), `JWT_SECRET`, `FRONTEND_URL` và khóa Gemini nếu dùng chat/vision.
2. Chạy `npm install` rồi `npm run db:deploy` trong `backend`. Seed demo sẽ xóa dữ liệu hiện có; chỉ trên project Supabase disposable, đặt `ALLOW_DESTRUCTIVE_SEED=true` rồi chạy `npm run seed`.
3. Chạy backend bằng `npm start`, frontend bằng `npm run dev` hoặc deploy bản `npm run build`.
4. Xác nhận `/health` trả `healthy`.

## Kịch bản 90 giây

1. Mở **Verify Harness**. Chỉ ra trạng thái **Chưa thực thi**.
2. Chọn **Track A · 5 ca**, bấm **Chạy 5 ca**.
3. Xác nhận kết quả đúng `5/5`, `AUTO=3`, `ESCALATE=2`, có timestamp từng ca.
4. Mở A-04 và A-05 để chỉ ra hai phân loại khác nhau và câu hỏi hành động gửi cán bộ.
5. Nhập một ca mới vào sandbox, ví dụ: “Em cần giấy xác nhận để bảo lãnh hợp đồng thuê nhà”.
6. Chạy **General · 4 ca** để chứng minh Verify tổng quát riêng biệt.

## Kiểm tra trước demo

```bash
cd backend
npm test
npx prisma validate

cd ../frontend
npm run build
```

Không dùng ảnh chụp kết quả cũ thay cho chạy trực tiếp. Nếu database hoặc dịch vụ phụ trợ lỗi, báo lỗi thật; không công bố PASS hoặc tự xác minh chứng từ.
