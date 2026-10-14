# Test UI/UX với backend thật ở local

## Trạng thái đã kiểm tra — 2026-10-14

- `feature/ui-ux-polish` dựa trên `main` ở `81f8419`. Fetch GitHub xác nhận `origin/main` chưa có commit mới tại thời điểm kiểm tra; không merge, commit hoặc push.
- Backend hiện tại là Node.js/Express + Socket.IO + Prisma 5, database là Supabase PostgreSQL. Không phải PHP/Laravel hoặc MySQL.
- Máy đã có Laragon ở `C:\laragon`, Node.js và PostgreSQL trong thư mục `bin`. Kết nối Supabase không cần bật PostgreSQL/MySQL local hay chuyển project vào `C:\laragon\www`.
- Người dùng xác nhận Supabase demo được phép test. Chat, nộp đơn và Verify có thể ghi hồ sơ/audit thật vào database đó. Không dùng database production cho quy trình này.
- Ghi chú ban đầu khi soạn hướng dẫn: chưa có `.env` backend/frontend. Người dùng sau đó đã cấu hình và chạy backend local; giữ nguyên các giá trị đang hoạt động, không ghi thông tin bí mật vào tài liệu hoặc commit.

## 1. Chuẩn bị cấu hình riêng trên máy

Xin người quản lý Supabase demo hoặc lấy từ Dashboard > **Connect**:

- Connection string **Transaction pooler** cho `DATABASE_URL`, port `6543`. Giữ `pgbouncer=true` để tương thích Prisma hiện tại.
- Connection string **Session pooler** cho `DIRECT_URL`, port `5432`.
- Database password đúng project; ký tự đặc biệt trong phần password của URL phải percent-encode.
- Gemini API key mới/hợp lệ cho chat AI. Verify Track A không cần LLM nhưng vẫn cần backend, database và tài khoản demo.

Không gửi connection string đầy đủ, password hoặc API key vào chat, ảnh chụp hay GitHub. Không dùng Supabase anon/service-role API key thay cho password PostgreSQL. Không đổi password của Supabase dùng chung chỉ để chạy local.

Trong IDE, sao chép `EDUREF_AI/backend/.env.example` thành `EDUREF_AI/backend/.env` **nếu chưa có**; nếu đã có thì giữ các giá trị đang hoạt động. Đây chỉ là cấu hình local bị Git ignore, không phải thay đổi mã backend. Điền các URL từ đúng project demo, không suy đoán host/region từ ví dụ cũ:

```dotenv
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require"
JWT_SECRET=YOUR_NEW_RANDOM_LOCAL_SECRET
GEMINI_API_KEY=YOUR_NEW_GEMINI_KEY
GEMINI_MODEL=gemini-flash-lite-latest
FRONTEND_URL=http://127.0.0.1:4173
ALLOW_DEMO_ROLE_SWITCH=true
ALLOW_DESTRUCTIVE_SEED=false
```

Thay placeholder bằng giá trị thật trên máy; giữ tên model mà nhóm đang dùng nếu khác. Không thêm `sslaccept=accept_invalid_certs` để bỏ qua xác thực chứng chỉ. Tạo JWT secret riêng cho local, không dùng chuỗi mẫu public. API key từng dán vào cuộc trò chuyện cần được thu hồi/thay mới bởi chủ sở hữu.

`FRONTEND_URL` phải khớp chính xác origin đang mở. Backend main đã đọc biến này cho cả REST và Socket.IO; preview port 4173 không nằm trong danh sách mặc định. Dùng `http://127.0.0.1:4173` nhất quán, không đổi sang `http://localhost:4173` giữa chừng. Thay origin trong `.env` cần khởi động lại backend.

## 2. Chạy backend bằng terminal Laragon

Mở Laragon > **Terminal**. Nếu terminal mặc định là CMD/Cmder, gõ `powershell` trước rồi chạy:

```powershell
Set-Location 'D:\Documents\Projects\MLAI\EduRef_AI_Agent\EDUREF_AI\backend'
node --version
npm --version
```

Nếu chưa có dependency hoặc muốn cài lại đúng lockfile, chạy `npm ci`. Lệnh này cài dependency và sinh Prisma client, không migrate/seed database. Sau đó:

```powershell
npm run db:generate
npx prisma validate
npm start
```

`db:generate` chỉ sinh client cục bộ từ schema hiện tại. Không chạy `db:deploy`, `prisma db push`, `prisma migrate reset`, `npm run seed`, hoặc bật `ALLOW_DESTRUCTIVE_SEED`. Database hiện tại phải đã tương thích với main; nếu thiếu bảng/migration/tài khoản demo, báo người quản lý backend thay vì tự sửa schema hay seed.

Giữ terminal này mở. Trong terminal PowerShell khác, kiểm tra read-only:

```powershell
Invoke-RestMethod 'http://127.0.0.1:5000/health'
Invoke-WebRequest 'http://127.0.0.1:5000/health' -Headers @{ Origin = 'http://127.0.0.1:4173' }
```

Kỳ vọng `status: healthy`, `totalStudents` có dữ liệu, HTTP 200 và `Access-Control-Allow-Origin: http://127.0.0.1:4173`. Endpoint đúng là `/health`, không phải `/api/health`. Nếu health chỉ trả được từ terminal nhưng browser lỗi, kiểm tra CORS trước khi nghĩ tới lỗi UI.

## 3. Chạy frontend từ bản build production

Mở terminal thứ hai:

```powershell
Set-Location 'D:\Documents\Projects\MLAI\EduRef_AI_Agent\EDUREF_AI\frontend'
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Nếu preview 4173 đang chạy thì không mở server thứ hai; chỉ build lại rồi reload trang. Khi cần restart, dừng đúng terminal preview bằng Ctrl+C.

Frontend hiện có fallback local đúng `http://localhost:5000/api` và `http://localhost:5000`; không bắt buộc tạo `.env` frontend. Nếu muốn cấu hình rõ, sao chép `.env.example` thành `.env` trong frontend rồi điền:

```dotenv
VITE_API_URL=http://127.0.0.1:5000/api
VITE_SOCKET_URL=http://127.0.0.1:5000
```

Sau mỗi lần đổi biến `VITE_*`, build lại vì Vite ghi chúng vào bundle lúc build. Không đặt DB password, JWT secret hoặc Gemini key trong bất kỳ biến `VITE_*` nào. `.env` bị Git ignore; không commit cấu hình bí mật. Để không tạo thêm cấu hình, ưu tiên fallback hiện có.

Mở các URL:

- Landing: `http://127.0.0.1:4173/`
- Chat chính: `http://127.0.0.1:4173/?tab=chat`
- Verify: `http://127.0.0.1:4173/?tab=verify`

Đây là cùng mã frontend production build, không phải màn hình mock riêng. URL dịch vụ, dữ liệu, font/cache, browser và môi trường deploy vẫn có thể khác; cần smoke test sau deploy, không thể bảo đảm mọi trạng thái production giống tuyệt đối chỉ bằng build local.

## 4. Kịch bản test ngắn

1. Health healthy và CORS đúng origin.
2. Reload landing: không có onboarding popup/nút tắt hiệu ứng; khung chat fade-in một lần khi mở landing. Reduced-motion của hệ điều hành vẫn được tôn trọng.
3. Chờ bootstrap tài khoản demo và Socket.IO kết nối. Nếu báo không khởi tạo phiên demo, kiểm tra `ALLOW_DEMO_ROLE_SWITCH=true` và sinh viên `2280602154` tồn tại trên database demo; không tạo/seed tự động.
4. Hỏi một câu thông tin trước; sau đó mới thử nghiệp vụ trên database demo đã được cho phép. Giữ draft/lịch sử khi chuyển sang chat chính.
5. Chạy Track A · 5 ca: xem PASS/FAIL thực, ms, actionableQuestion và phân bố 3 AUTO : 2 ESCALATE. Kết quả phải do backend trả về, không coi kỳ vọng là kết quả thật.
6. Kiểm tra sinh viên theo dõi đơn, rồi đổi vai trò demo để xem hàng đợi cán bộ trên cùng database demo. Không bấm reset/xóa dữ liệu test khi chưa xác nhận phạm vi dữ liệu.
7. Kiểm tra 1366×768 và 1920×1080, keyboard, 200% zoom và reduced-motion.

## 5. Lỗi thường gặp và giới hạn

- `EADDRINUSE`: port 5000 hoặc 4173 đã có tiến trình chạy. Dừng đúng terminal cũ; không kill hàng loạt Node.
- Prisma authentication/network error: kiểm tra DB password, URL từ đúng Connect panel, trạng thái Supabase project và kết nối mạng. Giữ TLS; không sửa backend hoặc schema để né lỗi.
- Thiếu bảng/tài khoản demo: báo backend owner. Không seed lên DB demo chung vì seed hiện tại xóa dữ liệu.
- CORS hoặc Socket CORS ở 4173: đặt `FRONTEND_URL` đúng origin, restart backend; không sửa danh sách origin trong `server.js`.
- Chat báo Gemini key/model/quota: xác nhận key và model với nhóm. Verify deterministic vẫn là luồng kiểm tra riêng, không cần giả lập câu trả lời AI.
- Upload resume thật chưa có contract đã được kiểm chứng. UI đang báo chưa khả dụng; phối hợp Tài để chốt endpoint/storage/auth/validation/response trước khi kiểm thử luồng upload hoàn chỉnh. Không tạo URL giả để làm UI trông hoàn tất.

## Nguồn tham khảo chính thức

- Laragon Quick add (Node.js/PostgreSQL): https://laragon.org/docs/quick-add
- Supabase Postgres connection modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- Hướng dẫn project: `EDUREF_AI/RUNBOOK.md`, `EDUREF_AI/backend/.env.example`, `EDUREF_AI/backend/server.js`, `EDUREF_AI/backend/prisma/schema.prisma`.

Không nâng Prisma/framework hoặc áp dụng migration theo tutorial mới trong đợt polish này.
