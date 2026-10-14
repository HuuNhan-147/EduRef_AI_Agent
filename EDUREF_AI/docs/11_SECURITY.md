# Security status

Đối chiếu mã nguồn nhánh hiện tại ngày **15/10/2026**. Đây là mô tả các kiểm soát đã triển khai và giới hạn còn lại, không phải chứng nhận hệ thống production hoặc kết quả một cuộc kiểm toán bảo mật toàn diện.

## Kiểm soát đã triển khai

### Danh tính và quyền truy cập

- REST yêu cầu JWT cho chat, hồ sơ, audit và các thao tác nghiệp vụ. Chat HTTP/Socket nạp danh tính từ DB; STUDENT khóa MSSV theo token thay vì tin currentUser/studentCode trong payload.
- Socket.IO xác thực handshake JWT, tham gia phòng chủ thể và phòng staff. Session memory có tiền tố chủ thể, tránh dùng chung lịch sử khi hai người gửi cùng sessionId.
- API duyệt/từ chối/thu hồi yêu cầu STAFF/DEAN/ADMIN. REST xem/sửa hồ sơ và ToolResolver với các tool gắn requestId kiểm tra quyền sở hữu của sinh viên.
- Verify custom prompt chỉ cho sinh viên dùng chính MSSV của mình hoặc hồ sơ benchmark. Bỏ studentCode thì khóa về MSSV phiên; cán bộ có thể chọn hồ sơ khác.
- Đăng nhập cán bộ dùng bcrypt, kiểm tra active và mật khẩu; khi tắt demo, từ chối mật khẩu seed đã công khai. Frontend không chứa mật khẩu cán bộ.
- Demo-login dùng bảy accountKey allowlist. Đăng nhập chỉ bằng MSSV, tạo hồ sơ tùy biến, liệt kê tài khoản demo và reset-test bị chặn khi tắt demo. Mã benchmark không được ghi đè qua custom-student.
- Production yêu cầu JWT_SECRET; Compose không có secret mặc định. Có cảnh báo khóa yếu/mẫu công khai nhưng cảnh báo này chưa chặn mọi trường hợp khởi động với khóa yếu.

### Dữ liệu và vòng đời hồ sơ

- `ClientInputGuard` loại ngày xét duyệt, hạn ngạch/lịch sử và các dữ kiện tín chỉ/lịch học do client hoặc LLM tự gán. REST nạp lịch sử cấp giấy từ DB; sinh viên không ghi đè được MSSV phiên trong inputData của POST petitions.
- REST nộp đơn không điền SĐT/địa chỉ thường trú từ registry. Các tool nhỏ cũ và Verify vẫn có fallback khác; chưa thể tuyên bố toàn bộ đường vào đều không gán mặc định.
- Core ưu tiên từ chối DROPPED/SUSPENDED trước việc hỏi dữ kiện còn thiếu, áp dụng cả submit/resume. Sinh viên ACTIVE thiếu dữ kiện vẫn được hỏi bổ sung.
- Cán bộ chỉ quyết định ESCALATED. Compare-and-set trong transaction ở staffDecision/staff_confirm_request chặn hai người cùng quyết định một hồ sơ. Ask/escalate không kéo đơn APPROVED/REJECTED/CANCELLED về trạng thái chờ.
- Các quyết định chính của Core, cán bộ duyệt và thu hồi ghi mutation cùng audit trong transaction. Audit queue serialize việc ghi trong một process.
- Document metadata bắt đầu PENDING. URL chỉ nhận http(s)/đường dẫn nội bộ; javascript/data/file/ftp/protocol-relative bị thay bằng URL mặc định, tên file được encode. Đây không phải kiểm tra nội dung file hoặc kho lưu trữ thật.
- QR của luồng cấp giấy hiện là null; không gọi dịch vụ QR công cộng. SHA-256 là hash chain, không phải chữ ký số của nhà trường.

### Chống lạm dụng, giới hạn thời gian và riêng tư

- Có rate limit auth 60/phút/IP, HTTP chat 20/phút, Socket chat 20/phút, OCR 10/phút, Verify 6/phút, verify-chain 6/phút. Tool Verify qua LLM giới hạn 3 lần/10 phút. REST vượt hạn mức trả 429 + Retry-After.
- Tin nhắn chat HTTP/Socket tối đa 4.000 ký tự. Vòng lặp Agent tối đa 5 lượt gọi LLM.
- Gemini stream có timeout chờ phản hồi HTTP 60 giây, idle 30 giây và tổng stream 120 giây mặc định; idle/tổng có thể cấu hình bằng GEMINI_STREAM_IDLE_TIMEOUT_MS/GEMINI_STREAM_MAX_DURATION_MS. Nhận close sớm cũng kết thúc lỗi thay vì treo. Có AbortSignal hỗ trợ dừng; timeout tính theo từng lần thử, không phải deadline chung cho toàn Agent.
- Vision lỗi/rỗng yêu cầu thẩm định thủ công; không tạo kết quả xác minh hợp lệ giả.
- Terminal log gắn chủ thể chỉ phát tới chủ + staff; endpoint lịch sử lọc tương ứng. Log hệ thống/Verify không gắn chủ vẫn phát chung.
- ConversationMemory tối đa 200 tin/phiên, TTL 2 giờ, có dọn định kỳ và timer unref; chưa có giới hạn tổng số phiên.
- ErrorShield che lỗi Prisma/axios/lỗi lập trình ở service và trả mã ERR-XXXXXX; route catch 500 luôn trả thông báo chung/errorId. Thông báo nghiệp vụ và lỗi stream được đánh dấu expose vẫn có thể hiển thị. Chi tiết lỗi vẫn được ghi ở log máy chủ.
- CORS kiểm tra origin localhost, FRONTEND_URL và các origin Vercel được cấu hình/khớp regex. CORS không thay thế JWT/authorization.

## Kiểm chứng hồi quy

```powershell
cd EDUREF_AI/backend
npm run test:security
npm run test:security:mutation
node --test test/policy-precedence.test.js
```

Bộ security hiện có **52 test** ở bốn file security-*.test.js. Từng file nạp `testSupport/securityTestEnv.js` trước module ứng dụng: DB khóa về loopback cổng 1, Gemini dùng khóa giả, Prisma/HTTP bên ngoài được stub. HTTP test dựng Express cục bộ; không dùng database demo hoặc Gemini thật.

Mutation runner tạo bản sao code trong thư mục tạm, thay từng kiểm soát bằng hành vi sai, rồi chạy lại toàn bộ 52 test. Source trong workspace không bị mutation; node_modules chỉ được tham chiếu. Runner kiểm tra cú pháp mutant, yêu cầu baseline trước/sau đều đạt 52 test, chỉ tính KILLED khi có assertion thất bại. Timeout/lỗi runner được báo riêng, không tự tính là đã bắt lỗi.

Kết quả tái lập lưu ở [SECURITY_MUTATION_RESULTS.json](SECURITY_MUTATION_RESULTS.json), gồm từng mutation và test thất bại. Đây là tập mutation có chủ đích trên các bản vá, không phải điểm mutation toàn repository. Năm test policy-precedence riêng xác minh submit/resume từ chối thôi học/bảo lưu trước thiếu dữ kiện và vẫn hỏi sinh viên ACTIVE.

Kết quả ngày 15/10/2026: **39/39 mutation KILLED bằng assertion**, baseline trước/sau **52/52 PASS**. Đã bổ sung assertion cho truy vấn allowlist của demo-accounts để mutation bị bắt bởi điều kiện kiểm tra rõ ràng, thay vì test văng TypeError. Bộ hồi quy cô lập gồm các test còn lại và 5 ca thứ tự chốt đạt **115/115 PASS**; frontend build đạt. Hai file workflow-unification/master-flow-matrix đã chuyển sang test/integration, yêu cầu opt-in và DB local *_test; chưa chạy với DB thật; chưa kiểm tra lại giao diện trong trình duyệt ở đợt vá code này.

Các test cô lập không xác nhận cấu hình deployment, hành vi Gemini thật, giao diện trình duyệt hoặc tính nguyên tử của PostgreSQL thật. Fake transaction chỉ kiểm tra đường gọi/điều kiện; cần DB thử nghiệm riêng để xác minh rollback/concurrency thực tế.

## Giới hạn còn lại

- Chưa có SSO/mật khẩu sinh viên production. Khi demo bật, người truy cập có thể nhận quyền tài khoản allowlist gồm STAFF/DEAN; chỉ dùng dữ liệu thử nghiệm riêng.
- Schema chưa có nguồn TKB/tín chỉ thật, migration chưa theo kịp các cột nhân thân; hồ sơ tùy biến ACTIVE có thể bị từ chối vì thiếu lịch học. Không gán TKB từ client để chữa lỗi này.
- Một số đường ghi vẫn chưa thống nhất giữa Core, fast path và tool nhỏ; chưa có idempotency/khóa quota theo sinh viên + biểu mẫu + học kỳ trong database.
- Nhánh chạm trần Agent/Vision có thể chỉ trả thông báo chuyển tiếp và ghi audit, chưa bảo đảm hồ sơ vào hàng đợi cán bộ. Xác nhận địa chỉ NVQS qua regex hội thoại còn có thể nhận nhầm cụm “giấy xác nhận”.
- Hash không bao phủ mọi cột; người có toàn quyền DB có thể tính lại chuỗi. Mutex, rate limit, memory và controller dừng chỉ nằm trong một process; nhiều replica cần cơ chế phối hợp ở DB/shared store.
- Log hệ thống/Verify phát chung có thể chứa thông tin hồ sơ benchmark hoặc ca mới; log máy chủ còn có dữ kiện cá nhân. Cần rà soát nội dung/retention/redaction và giới hạn truy cập log.
- Verify có thể tạo dữ liệu thật trên DB cấu hình. Documents chỉ nhận metadata; luồng upload/scan file, kiểm tra nguồn chứng chỉ và lưu trữ riêng tư chưa hoàn chỉnh.
- Cần bổ sung security headers, quản lý/rotation secret, cấu hình proxy chính xác và kiểm chứng CORS/deployment. Bộ 52 test không bao phủ mọi guard, mọi route hoặc toàn bộ Socket server.

## Dữ liệu demo

Seed là thao tác xóa và nạp dữ liệu synthetic; chỉ chạy khi ALLOW_DESTRUCTIVE_SEED=true trên DB disposable. Các phép kiểm tra nêu trên không chạy seed, migrate deploy, reset hoặc ghi hồ sơ vào database thật.

Cleanup 15/10/2026: npm test mặc định preload môi trường cô lập và chặn nạp .env. Guard integration được unit test với URL thiếu opt-in, remote và DB local dùng chung. Hai endpoint cán bộ gọi service chung để cùng lưu capsule/CAS/audit; 52 security test được giữ nguyên số lượng. Frontend có bốn test payload và CSS token; lint chỉ kiểm tra cú pháp/import không dùng.

Dependency audit tại thời điểm cleanup: npm audit --omit=dev của backend/frontend không có advisory; audit đầy đủ frontend còn 8 advisory trong toolchain dev (Tailwind/PostCSS và dependency liên quan). Chưa nâng major/ép override trong đợt này.
