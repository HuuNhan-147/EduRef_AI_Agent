# Chuyển database sang Supabase

Backend vẫn dùng Prisma; Supabase cung cấp PostgreSQL được quản lý nên frontend không cần chứa database password hoặc Supabase service-role key.

## 1. Lấy hai connection string

Trong Supabase Dashboard, mở project rồi chọn **Connect**:

- `DATABASE_URL`: chọn **Transaction pooler**, port `6543`. Thêm `pgbouncer=true`, `connection_limit=1`, `sslmode=require` và `sslaccept=accept_invalid_certs`.
- `DIRECT_URL`: chọn **Session pooler**, port `5432`, thêm `sslmode=require&sslaccept=accept_invalid_certs`. Session pooler phù hợp cho Prisma migration và hoạt động trên mạng IPv4.

Ví dụ hình dạng biến môi trường:

```dotenv
DATABASE_URL="postgresql://postgres.kzukklgnmdhirjjkngps:YOUR_PERCENT_ENCODED_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require&sslaccept=accept_invalid_certs"
DIRECT_URL="postgresql://postgres.kzukklgnmdhirjjkngps:YOUR_PERCENT_ENCODED_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs"
```

Không tự ghép `POOLER_HOST`; sao chép nguyên chuỗi Supabase cung cấp. Nếu password có `@`, `:`, `/`, `?`, `#`, `&` hoặc khoảng trắng, phải percent-encode password.

## 2. Khởi tạo schema

```bash
cd EDUREF_AI/backend
npm install
npm run db:deploy
npm run db:status
```

Migration ban đầu nằm tại `prisma/migrations/20260922000100_init_supabase/migration.sql`. Prisma Client dùng pooled `DATABASE_URL`; Prisma Migrate tự dùng `DIRECT_URL` được khai báo bằng `directUrl` trong `prisma/schema.prisma`.

Migration bật Row Level Security cho toàn bộ bảng trong `public` nhưng không tạo policy cho `anon`/`authenticated`. Vì vậy Supabase Data API không thể đọc dữ liệu; chỉ backend Prisma kết nối bằng database credentials mới truy cập được.

## 3. Nạp dữ liệu demo

Seed hiện là thao tác reset toàn bộ dữ liệu EduRef. Chỉ chạy trên project Supabase mới hoặc disposable:

```dotenv
ALLOW_DESTRUCTIVE_SEED=true
```

```bash
npm run seed
```

Sau khi seed xong nên đặt lại `ALLOW_DESTRUCTIVE_SEED=false` hoặc xóa biến này trên nền tảng deploy.

## 4. Biến môi trường backend khi deploy

Tối thiểu:

- `DATABASE_URL`
- `DIRECT_URL` — chỉ cần ở build/release job chạy migration
- `JWT_SECRET` — chuỗi ngẫu nhiên dài, không dùng giá trị demo
- `FRONTEND_URL` — origin frontend chính xác, không có dấu `/` cuối
- `ALLOW_DEMO_ROLE_SWITCH=true` — chỉ cho bản hackathon demo dùng dữ liệu synthetic; đặt `false` cho hệ thống thật
- `GEMINI_API_KEY` và `GEMINI_MODEL` nếu dùng chat/vision
- `NODE_ENV=production`

Build command đề xuất: `npm ci && npm run db:deploy`. Start command: `npm start`.

## 5. Kiểm tra

```bash
npm test
npx prisma validate
npm run db:status
```

Sau khi backend chạy, gọi `/health`; response phải ghi `Supabase PostgreSQL (Prisma)` và trả được số sinh viên. Nếu gặp lỗi prepared statement, kiểm tra `pgbouncer=true` trên URL transaction pooler. Nếu không kết nối được direct host do IPv4, dùng Session pooler cho `DIRECT_URL`.

## 6. Nguyên tắc bảo mật

- Chỉ backend được biết database URLs.
- Không dùng Supabase `anon` hoặc `service_role` key vì backend này kết nối PostgreSQL trực tiếp qua Prisma.
- Không commit `.env`; chỉ commit `.env.example`.
- Bật network restrictions/SSL phù hợp với nền tảng deploy.
- Supabase backup không thay thế việc kiểm thử restore và chính sách lưu trữ dữ liệu sinh viên.
