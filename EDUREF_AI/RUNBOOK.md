# Runbook tái lập và trình diễn Track A

Runbook này đi từ repository sạch đến Verify Harness hoạt động. Không dùng ảnh chụp kết quả cũ thay cho chạy trực tiếp.

## 1. Yêu cầu

- Git và Node.js 20.
- Một project Supabase PostgreSQL.
- Hai terminal riêng cho backend và frontend.
- Gemini API key chỉ bắt buộc khi trình diễn chat AI; Verify Harness không phụ thuộc câu trả lời sinh bởi LLM.

## 2. Clone đúng phiên bản

```bash
git clone https://github.com/HuuNhan-147/EduRef_AI_Agent.git
cd EduRef_AI_Agent
# Chọn nhánh/commit cần chạy; không mặc định một nhánh demo cũ.
```

Dùng nhánh hiện tại nếu đang kiểm tra bản vá chưa merge.

## 3. Cấu hình và khởi tạo backend

```bash
cd EDUREF_AI/backend
npm ci
cp .env.example .env
```

Trên PowerShell, thay lệnh `cp` bằng:

```powershell
Copy-Item .env.example .env
```

Điền vào `.env`:

- `DATABASE_URL`: Supabase Transaction pooler, cổng `6543`.
- `DIRECT_URL`: Supabase Session pooler, cổng `5432`.
- `JWT_SECRET`: chuỗi ngẫu nhiên đủ mạnh và khác giá trị mẫu.
- `FRONTEND_URL`: origin frontend, không kèm `/api`.
- `GEMINI_API_KEY`: khóa thật nếu trình diễn chat AI.
- `ALLOW_DEMO_ROLE_SWITCH=true`: chỉ dành cho bản hackathon demo công khai. Đặt `false` ngoài môi trường demo.

Đối chiếu schema trước khi áp dụng migration: migration hiện hữu chưa bao phủ toàn bộ cột nhân thân mới của Student. Cần bổ sung/kiểm chứng migration trên DB thử nghiệm trước khi khởi tạo DB mới; không dùng db push để vá DB đang phục vụ. Các lệnh bên dưới không tự khắc phục khoảng trống này.

```bash
npx prisma validate
npm run db:status
npm run db:deploy
```

Chỉ khi Supabase project là database demo mới/trống, nạp dữ liệu mẫu:

```powershell
$env:ALLOW_DESTRUCTIVE_SEED='true'
npm run seed
$env:ALLOW_DESTRUCTIVE_SEED='false'
```

Seed sẽ xóa dữ liệu nghiệp vụ hiện có; không chạy trên database có dữ liệu cần giữ.

Khởi động backend:

```bash
npm start
```

Xác nhận `http://localhost:5000/health` trả `status: healthy` và `database: Supabase PostgreSQL (Prisma)`.

## 4. Cấu hình và khởi động frontend

Trong terminal thứ hai:

```bash
cd EDUREF_AI/frontend
npm ci
cp .env.example .env
npm run dev
```

Trên PowerShell dùng `Copy-Item .env.example .env`. Khi chạy local, giữ:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Mở `http://localhost:5173`. Trang phải tự khởi tạo phiên sinh viên demo, hiển thị Socket.IO đang kết nối và có tab **Verify Track A** trên thanh điều hướng.

## 5. Kịch bản chấm nhanh 90 giây

1. Chọn **Verify Track A**; trạng thái ban đầu phải là **Chưa thực thi**.
2. Chọn **Track A · 5 ca**, bấm **Chạy 5 ca**.
3. Xác nhận `5/5 PASS`, `AUTO=3`, `ESCALATE=2` và timestamp thật.
4. Mở A-04 và A-05; xác nhận hai phân loại khác nhau và đều có câu hỏi hành động cụ thể.
5. Nhập ca mới: “Em cần giấy xác nhận để bảo lãnh hợp đồng thuê nhà”. Kỳ vọng `OUTSIDE_POLICY`, `ESCALATE_TO_STAFF` và một câu hỏi cán bộ có thể trả lời trực tiếp.
6. Dùng role switch chuyển sang cán bộ để kiểm tra hàng đợi escalation và quyết định HITL.

## 6. Kiểm tra regression trước khi nộp

```bash
cd EDUREF_AI/backend
npm test
npx prisma validate
npm run db:status
npm audit --omit=dev

cd ../frontend
npm run build
npm audit --omit=dev
```

## 7. Biến môi trường khi deploy

Backend:

- `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`.
- `ALLOW_DEMO_ROLE_SWITCH=true` cho đúng bản demo chấm thi; không dùng cờ này cho hệ thống thật.
- `GEMINI_API_KEY`, `GEMINI_MODEL` nếu bật chat/vision.
- Build command: `npm ci && npm run db:deploy`.
- Start command: `npm start`.

Frontend:

- `VITE_API_URL=https://BACKEND_PUBLIC_URL/api`
- `VITE_SOCKET_URL=https://BACKEND_PUBLIC_URL`
- Build command: `npm ci && npm run build`.
- Publish directory: `dist`.

Sau deploy, cập nhật README bằng URL frontend công khai và kiểm tra lại toàn bộ kịch bản 90 giây trên chính URL đó.

## 8. Quy tắc báo cáo

- Dữ liệu seed là synthetic demo data.
- Verify tạo hồ sơ và audit log thật trong database demo.
- Không công bố missed/false escalation bằng `0%` khi chưa đo trên tập độc lập có nhãn.
- Nếu database, Gemini hoặc dịch vụ ngoài lỗi, hiển thị lỗi thật; không tự tạo kết quả PASS hoặc chứng từ hợp lệ giả.

## Test integration tách riêng

`npm test` chỉ chạy test cô lập, nạp môi trường khóa DB về loopback cổng 1 và dùng khóa Gemini giả; không nạp .env ứng dụng. Test ghi DB nằm trong `backend/test/integration`. Chỉ chạy với PostgreSQL local disposable có tên kết thúc bằng `_test`, đã có schema và dữ liệu benchmark cần thiết:

```powershell
$env:ALLOW_INTEGRATION_TESTS='true'
$env:DATABASE_URL='postgresql://LOCAL_TEST_USER:LOCAL_TEST_PASSWORD@127.0.0.1:5432/eduref_test'
$env:DIRECT_URL=$env:DATABASE_URL
npm run test:integration
Remove-Item Env:ALLOW_INTEGRATION_TESTS, Env:DATABASE_URL, Env:DIRECT_URL
```

Guard từ chối host ngoài localhost/loopback, tên DB không có hậu tố _test hoặc thiếu opt-in. Tên và host chỉ là chốt tránh nhầm; người chạy vẫn cần bảo đảm DB đó dành riêng cho test. Runner không tự reset/migrate/seed DB. Các test tích hợp này vẫn cần kiểm chứng lại trên DB disposable; không có cam kết suite xanh từ kết quả unit.

Frontend có thêm `npm run lint` (cú pháp/import không dùng toàn source JS/JSX) và `npm test` (payload biểu mẫu, bổ sung và CSS token).

Compose truyền URL frontend lúc build và mặc định tắt seed phá dữ liệu. Compose không tự migrate/seed; dùng hostname truy cập phù hợp khi chạy từ máy khác.
