> Snapshot trước đợt dọn ngày 15/10/2026. Thứ tự chốt, giao diện lỗi 3–4 và nhiều mục cleanup đã được xử lý sau khi lập báo cáo. Xem [kết quả cập nhật](KET_QUA_DON_DEP_CODEBASE.md).

# Rà soát những phần cần dọn trong codebase

Ngày rà soát: **15/10/2026**. Nhánh: `fix/security-review-2026-10-14`.

Đây là danh sách công việc sau khi kiểm tra cây làm việc hiện tại. Chưa xóa file, gỡ dependency, sửa runtime hoặc thay đổi database trong lượt rà soát này. Các bản vá thứ tự chốt, Rollback và chuyển trang sau tạo hồ sơ tùy biến đang có trong workspace được giữ nguyên.

## 1. Cách kiểm tra và kết quả tổng quát

- Phân tích cú pháp bằng Babel parser/traverse trên **72 file JS/JSX**, khoảng **18.860 dòng**, gồm source, test và script.
- Dựng đồ thị import từ frontend main/backend server, tính cả dynamic import chuỗi cố định; đối chiếu thêm các lời gọi method/tool/API bằng tìm kiếm mã nguồn.
- Kiểm tra binding/import không được tham chiếu, nhánh điều kiện hằng, dependency, file trùng hash, liên kết tài liệu, cấu hình Docker và phạm vi test.
- Thử sinh CSS bằng **Tailwind 3.4.19 đang cài tại máy**, không suy theo tài liệu phiên bản khác.
- Không chạy npm test mặc định, seed, migration deploy, Verify ghi DB hoặc Gemini thật. Không cần lặp lại mutation suite cho một lượt chỉ đọc source.

Có **75 binding import** không được tham chiếu trong 20 file; 67 thuộc mã runtime/frontend, trong đó 13 là default import React. Đây là số binding, không phải 75 file hoặc 75 dependency. Với Vite React dùng JSX runtime tự động, default React chỉ cần giữ ở nơi thực sự dùng namespace React.

Đồ thị import không tìm thấy module JS/JSX hoàn toàn tách khỏi entrypoint trong tập khảo sát. Tuy nhiên, một số module chỉ còn được giữ sống bởi **member không có caller**. Vì vậy không thể dùng kết quả “file có import” để khẳng định mọi đoạn code bên trong còn hoạt động, cũng không nên xóa nguyên file chỉ dựa trên tìm kiếm tên.

## 2. Phần có thể dọn với rủi ro thấp

### C-01. Import không dùng

**Ưu tiên: cao; rủi ro: thấp.**

Ví dụ đã xác định bằng binding analysis:

| File | Binding không dùng tiêu biểu |
|---|---|
| `EDUREF_AI/backend/services/AcademicWorkflowService.js:10` | getFormFieldsGuide |
| `EDUREF_AI/frontend/src/pages/AuditExplorerPage.jsx:4` | useRef, getSocket và nhiều icon |
| `EDUREF_AI/frontend/src/pages/StaffEscalationPage.jsx:26` | API_BASE_URL, Clock, ArrowRight |
| `EDUREF_AI/frontend/src/components/forms/DynamicPetitionModal.jsx:5` | Upload, Paperclip, Trash2, Plus và các icon từ phần chứng chỉ cũ |
| `EDUREF_AI/frontend/src/components/common/TopNavbar.jsx:4` | UserCheck, Wifi, WifiOff, School, Zap |
| `EDUREF_AI/frontend/src/pages/MyPetitionsPage.jsx:7` | CheckCircle2, AlertTriangle, Clock, XCircle, Filter, ExternalLink |
| Các test policy/architecture | HUTECH_FORMS và một số helper import không dùng |

Dọn bằng cách bỏ đúng binding; không thay đổi import có side effect như `dotenv/config` hoặc preload môi trường test. Không coi tham số abstract handler và tên biến catch chưa đọc là lý do để xóa hợp đồng phương thức.

### C-02. Dependency trực tiếp chưa thấy nơi sử dụng

**Ưu tiên: cao; rủi ro: thấp sau khi xác nhận build.**

- Backend `package.json`: **docx** không có import/require hoặc script sử dụng trong repository.
- Frontend `package.json`: **clsx** và **tailwind-merge** không có import/require hoặc script sử dụng.

Có thể gỡ ba khai báo trực tiếp cùng cập nhật lockfile bằng npm. Không xóa package bằng tay trong node_modules; dependency nào vẫn được package khác cần sẽ còn là dependency gián tiếp. Không gỡ Prisma, dotenv, nodemon hoặc các package build chỉ vì chúng không xuất hiện trong import của source ứng dụng.

### C-03. State, handler và request lấy danh mục không được dùng

**Ưu tiên: cao; rủi ro: thấp đến vừa.**

- `StudentWorkspacePage.jsx:249` có state `types`, nhưng không được đọc; effect khoảng dòng 310 gọi `/petitions/types` rồi chỉ setTypes. Danh mục hiển thị thực tế lấy từ CONFIRMATION_FORMS hardcode.
- Cần chọn một nguồn danh mục: dùng API thật hoặc bỏ state/effect ở frontend. Không xóa endpoint `/petitions/types` chỉ vì riêng màn hình này không dùng kết quả.
- `DynamicPetitionModal.jsx` có setFile, handleLoadSample, handleFileUpload, handleAddCertificate, handleRemoveCertificate, handleCertFieldChange không được gọi.
- `AcademicWorkflowService.js` có startTime trong fast path và biến qrCodeUrl cục bộ ở processRequest không được dùng.
- `MyPetitionsPage` nhận onSwitchTab nhưng không sử dụng.
- Seed có nhiều biến nhận kết quả create nhưng không dùng. Nếu bỏ biến thì **vẫn giữ lệnh create và await**; đây là thao tác tạo dữ liệu, không phải code chết có thể xóa cả câu lệnh.

### C-04. Tài liệu trùng và liên kết cũ

**Ưu tiên: cao; rủi ro: thấp.**

- `BUILD_LOG.md` và `EDUREF_AI/BUILD_LOG.md` có **SHA-256 giống hệt nhau**. Chọn một bản chính; thay bản còn lại bằng liên kết hoặc cập nhật các tham chiếu trước khi bỏ.
- `ROADMAP.md` và `EDUREF_AI/docs/17_ROADMAP.md` **không giống hash**, dù nội dung trùng nhiều. Phải so sánh/gộp thay vì xóa tùy ý.
- Tìm được **35 liên kết file://** đến đường dẫn máy cũ trong tập tài liệu. Đổi sang liên kết tương đối có thể dùng từ repository.
- `EDUREF_AI/docs/README.md` nhắc `18_DEFENSE_QA_PLAYBOOK.md` nhưng file không có.
- `docs/README.md` trỏ `KE_HOACH_PHONG_VAN_CAN_BO_PDT.md` nhưng file không có.
- Báo cáo Sprint 1 còn link placeholder `url` và đường dẫn team_repos/.../scratch không tồn tại. Đánh dấu tài liệu lịch sử hoặc thay bằng bằng chứng có thật.

### C-05. Cache cục bộ và Docker context

**Ưu tiên: vừa; rủi ro: thấp đối với cache, cần giữ môi trường đang dùng.**

| Thư mục cache | Dung lượng quan sát |
|---|---:|
| `.npm-cache` ở root | 544,57 MiB |
| `EDUREF_AI/backend/.npm-cache` | 12,79 MiB |
| `EDUREF_AI/frontend/.npm-cache` | 22,26 MiB |

Các cache đã được Git ignore. Không tìm thấy node_modules, dist hoặc .env thật bị tracked trong lần kiểm tra này. Vì vậy đây chủ yếu là dọn dung lượng máy/build context, không phải loại bỏ hàng trăm MB khỏi lịch sử Git.

Hai `.dockerignore` chưa loại `.npm-cache`. Cache backend có thể đi vào image qua COPY . .; cache frontend vào build context/builder, không nhất thiết nằm trong image Nginx cuối. Cache root không nằm trong hai build context hiện tại của Compose.

Cần bổ sung ignore cache/log/scratch và cân nhắc testSupport/scripts thử nghiệm cho image production. Không xóa .env, node_modules đang chạy hoặc dữ liệu volume PostgreSQL trong một đợt dọn source.

## 3. Mã cũ cần gỡ có kiểm soát

### C-06. Nhánh xét tốt nghiệp bị tắt trong modal

**Ưu tiên: cao; rủi ro: vừa.**

`DynamicPetitionModal.jsx:50` đặt `isGraduationForm = false`. Babel xác định hai nhánh ở khoảng dòng 339 và 390 luôn không chạy.

Phần có thể tách/gỡ khỏi modal cấp giấy:

- gradData, bảng chứng chỉ, attachedCerts và dữ liệu chứng chỉ mẫu;
- các handler thêm/xóa/sửa/upload chứng chỉ không có caller;
- hai nhánh tạo payload GRADUATION_ASSESSMENT;
- file state không bao giờ được set; previewModalImg không có đường mở ảnh được gọi trong modal hiện tại.

Không xóa toàn bộ CertificateVisionService hoặc ảnh demo chỉ theo kết luận này: OCR vẫn có endpoint và AgentOrchestrator còn xử lý attachments; người dùng đã kiểm chứng OCR ở lượt trước. Muốn loại bỏ Vision khỏi sản phẩm cần chốt lại phạm vi API riêng.

### C-07. petitionTools còn ba member không có caller

**Ưu tiên: cao; rủi ro: vừa.**

Trong `modules/ai-agent/tools/actions/petitionTools.js`, chưa tìm thấy caller của:

- check_student_status;
- create_student_request;
- rollback_student_request.

Riêng **staff_confirm_request vẫn đang được `/api/agent/staff-confirm` gọi và có test**. Không được xóa nguyên petitionTools.js.

AcademicPolicyEngine.js chỉ được create_student_request gọi trong mã hiện tại. Sau khi xác nhận/gỡ member cũ này, module AcademicPolicyEngine mới trở thành ứng viên gỡ tiếp; nó còn chứa logic thủ tục ngoài phạm vi như EXAM_DEFERRAL/GRADE_APPEAL/SPECIAL_PETITION.

### C-08. Tool thừa hoặc thiếu khai báo

**Ưu tiên: vừa; rủi ro: vừa.**

- workflowTools.rollback_request không có nhánh trong ToolResolver và không được ToolRegistry khai báo; endpoint rollback hiện gọi service trực tiếp. Đây là wrapper không thấy caller.
- get_execution_trace có nhánh resolver/wrapper nhưng không được khai báo cho LLM trong ToolRegistry. Cần chọn đưa nó vào danh mục tool hoặc loại bỏ đường dispatch nếu không có nhu cầu; không gọi đây là toàn bộ tính năng execution trace đã chết.
- AuditLogService.reconcileChain không thấy caller/API. Nên gỡ khỏi service runtime hoặc chuyển thành công cụ bảo trì có kiểm soát, thay vì để chức năng tính lại audit hash lẫn trong service đọc/ghi bình thường. Không chạy hàm này khi dọn.

### C-09. QR và renderer thủ tục cũ

**Ưu tiên: vừa; rủi ro: vừa đến cao nếu có dữ liệu lịch sử.**

Luồng chính trả qrCodeUrl null nhưng MyPetitions/StaffEscalation còn QR modal, nút và thông báo “vô hiệu hóa QR”. StaffEscalation còn renderer GRADUATION_ASSESSMENT và fallback ảnh chứng chỉ khi documents trống.

Cần tách:

1. Text sai với sản phẩm hiện tại: sửa về mã hồ sơ, trạng thái thu hồi và bản cứng.
2. Renderer hồ sơ lịch sử: giữ rõ dưới một phần legacy hoặc bỏ sau khi xác nhận DB không còn cần đọc chúng.
3. Cột qrCodeUrl/schema: là thay đổi dữ liệu, không nằm trong batch dọn code đơn giản.

### C-10. Upload/resume minh chứng còn dùng dữ liệu giả định

**Ưu tiên: cao; rủi ro: vừa, có liên quan nghiệp vụ.**

`StudentWorkspacePage.jsx:595` vẫn có luồng bổ sung mẫu ngân hàng/lệnh NVQS; payload gán cả hasBankForm/hasMilitaryCallDoc, luôn đặt purpose “Vay vốn NHCSXH” và ghép URL storage từ tên file.

Đây không phải upload file thật và có thể làm đổi mục đích hồ sơ. Cần thiết kế lại việc bổ sung trường còn thiếu theo formCode hoặc bỏ phần UI minh chứng ngoài phạm vi 5 mẫu. Không xóa API resume: nó vẫn cần cho WAITING_STUDENT và vừa có test thứ tự chốt.

## 4. Các phần trùng lặp nên hợp nhất từng bước

### C-11. Nhiều đường xử lý workflow còn hoạt động

**Ưu tiên: cao; rủi ro: cao nếu refactor đồng loạt.**

- REST → PetitionWorkflowCore.
- Master tool → AcademicWorkflowService.processStudentConfirmation → Core.
- Tool nhỏ → createRequest/checkRequirements/evaluatePolicy/checkAuthority/processRequest và các mutation riêng.
- Legacy create_student_request → AcademicPolicyEngine (chưa thấy caller).

Core và fast path lặp kiểm tra mục đích, SĐT, cơ sở nhận, địa chỉ, lệch mẫu và hạn ngạch. Các tool nhỏ còn default/fallback khác. Đây là nợ kiến trúc có ảnh hưởng hành vi, không chỉ là vài đoạn code giống nhau.

Hướng dọn: giữ nguyên tool/API ngoài, chuyển dần implementation về một workflow/policy contract; dùng test đối chiếu đầu vào/đầu ra giữa REST, master tool, tool nhỏ và resume. Không xóa các tool nhỏ đang được LLM khai báo khi chưa có bước chuyển tương thích.

### C-12. Hai implementation cán bộ quyết định

**Ưu tiên: cao; rủi ro: vừa.**

`AcademicWorkflowService.staffDecision` và `petitionTools.staff_confirm_request` đều kiểm tra trạng thái, CAS, ghi audit và cập nhật hồ sơ; nhưng cập nhật capsule và mã decision khác nhau.

Nên giữ hai endpoint nếu có client đang dùng, còn wrapper staff_confirm_request gọi chung service quyết định. Giữ nguyên các kiểm tra quyền ở route và CAS/audit transaction. Bộ 52 test hiện có bảo vệ các đường này, nhưng thay wrapper cũng cần kiểm tra tương thích shape message/error.

### C-13. Danh mục và dữ liệu demo lặp ở nhiều nơi

**Ưu tiên: cao; rủi ro: vừa.**

- Năm biểu mẫu lặp ở backend HUTECH_FORMS, frontend CONFIRMATION_FORMS, modal HUTECH_FORMS, prompt và phần renderer.
- Campus, số phòng, thời gian nhận và tên cơ sở lặp trong nhiều file.
- Tài khoản benchmark/hồ sơ lặp ở seed, studentRegistry, authController và frontend DEMO_ACCOUNTS.
- Chuỗi status/decision và cách đổi thành badge lặp trên nhiều màn hình.

Cần tách metadata UI/contract dùng chung với dữ liệu học vụ có thẩm quyền. Frontend có thể dùng chung danh mục mẫu; không dùng dữ liệu demo/frontend làm nguồn xác thực trạng thái/TKB khi production. HUTECH_FORMS.requiredFields hiện chưa dẫn dắt validator thống nhất, nên không được xóa các validator tay chỉ vì đã có danh mục này.

### C-14. HTTP và Socket nạp context khác nhau

**Ưu tiên: vừa; rủi ro: vừa đến cao.**

server.js và routes/agentRoutes.js lặp logic xác định student/staff, nạp hồ sơ và gọi Agent. HTTP còn suy lịch học/tín chỉ mẫu, Socket không có cùng khối bổ sung.

Nên có một service nạp context dùng chung cho hai transport; lớp transport chỉ xử lý auth, rate limit, streaming và hủy. Không đưa các fallback tín chỉ demo vào service production mới khi chưa chốt nguồn dữ kiện thật.

### C-15. Các file lớn và state phân tán

**Ưu tiên: vừa; rủi ro: vừa.**

| File | Số dòng quan sát | Hướng tách hợp lý |
|---|---:|---|
| StudentWorkspacePage.jsx | 1.468 | Hook chat/session, adapter kết quả, danh mục mẫu, pane quyết định |
| StaffEscalationPage.jsx | 1.398 | Hàng đợi, capsule, renderer từng mẫu, modal quyết định |
| AcademicWorkflowService.js | 1.295 | Tra cứu, adapter tool, xử lý cán bộ và thu hồi |
| StudentConfirmationDecisionService.js | 1.091 | Metadata mẫu, address/campus/cohort helper, bảng quyết định |
| DynamicPetitionModal.jsx | 921 | Trước hết gỡ nhánh tốt nghiệp chết; sau đó tách field group theo mẫu |

Auth state/JWT/profile/tab đang được phối hợp bằng App, localStorage, CustomProfileModal và api/socket service. Có thể gom dần vào provider/hook, nhưng phải giữ cơ chế chống request đổi vai trò cũ ghi đè request mới đang có trong api.js.

Khi tách file, giữ adapter status/decision rõ ràng: hiện frontend có nơi coi tool.success là APPROVED hoặc suy kết quả PASSED. Đây là hợp đồng nghiệp vụ cần sửa có test, không chỉ đổi tên biến.

## 5. Kiểm thử, cấu hình và tài liệu cần chỉnh

### C-16. Tách test mặc định khỏi test ghi DB

**Ưu tiên: rất cao; rủi ro triển khai dọn: vừa.**

`backend/package.json` đang dùng `node --test --test-concurrency=1` cho npm test, nên tự lấy cả:

- workflow-unification.test.js;
- master-flow-matrix.test.js.

Hai file trên import service truy cập DB và không preload testSupport/securityTestEnv.js. Import Gemini client có thể nạp .env. Một số ca có thể tạo hồ sơ thật. Không coi việc đặt NODE_ENV=test đơn thuần là cách ly DB.

Hướng dọn: đặt test unit/security cô lập là mặc định; test integration có lệnh riêng, DB disposable và kiểm tra chặn URL DB thật. Giữ 52 security test và các fixture/environment guard vừa viết. Không xóa test cũ để làm suite xanh; chuyển đúng tầng và sửa mô tả.

### C-17. Tên test và cách báo số liệu vượt quá điều đang kiểm tra

**Ưu tiên: cao; rủi ro: thấp nếu chỉ đổi mô tả, vừa nếu cấu trúc lại dataset.**

- harness-100-cases.test.js chạy 10 nhóm subtest, kiểm tra một số ví dụ trong mỗi nhóm; không nạp và chạy 100 record độc lập từ tài liệu như tên/comment có thể gây hiểu nhầm.
- Test “Zero-Tool Intent Gate” ở đó gọi hàm policy với isInquiry=true; không đếm tool call của Agent.
- system-architecture-mdj/master-flow-matrix đặt tên theo sơ đồ nhưng không parse trực tiếp file .mdj. Nên ghi rõ test kịch bản diễn giải từ sơ đồ.
- trackA-policy test dùng defaultStudent và fixture khác việc nạp student từ DB.
- Mutation runner có 39 thay thế chuỗi chủ đích và yêu cầu đúng 52 security test. Khi refactor tên/format hoặc tăng test, phải cập nhật catalogue/count một cách có kiểm soát; báo cáo này không phải mutation score toàn repository.
- Nên để báo cáo chạy máy vào test-reports hoặc snapshots có nhãn thời điểm, kèm lệnh tạo; tránh trộn với tài liệu hướng dẫn sống.

### C-18. Class CSS không được sinh bởi cấu hình hiện tại

**Ưu tiên: cao; rủi ro: thấp đến vừa, cần kiểm tra giao diện sau sửa.**

Probe với Tailwind **3.4.19**, theme extend hiện không định nghĩa các token này:

| Class đang dùng | Kết quả probe | Hướng thay/cấu hình |
|---|---|---|
| shadow-xs, shadow-2xs | Không sinh rule | Chọn shadow-sm hoặc định nghĩa shadow có chủ đích |
| backdrop-blur-xs | Không sinh rule | Chọn backdrop-blur-sm hoặc thêm giá trị blur |
| focus:ring-1.5 | Giá trị ring-1.5 không có rule | Dùng ring-1/ring-2 hoặc giá trị arbitrary |
| z-60 | Không sinh rule | z-[60] hoặc extend zIndex |
| animate-fade-in, animate-slide-in | Không sinh rule | Định nghĩa keyframes/animation hoặc bỏ class |

Các class đối chứng shadow-sm, ring-2, backdrop-blur-sm, z-[60] có rule. Việc build thành công không bảo đảm từng class tồn tại. Đặc biệt z-60 ảnh hưởng thứ tự lớp lightbox, nên không chỉ là thẩm mỹ.

Các CSS primitive hutech-card/hutech-badge-*/hutech-btn-* trong index.css chưa có nơi dùng trong JSX. Chọn dùng chúng thật hoặc bỏ; hiện các màn hình tự lặp nhiều class. Không nâng toàn bộ Tailwind chỉ để hợp thức hóa vài token trong một batch cleanup nhỏ.

### C-19. Cấu hình build/deploy và lint

**Ưu tiên: vừa; rủi ro: vừa.**

- Hai Dockerfile dùng npm install dù có lockfile; cân nhắc npm ci để tái lập, kiểm tra Prisma postinstall và thứ tự COPY trước khi đổi.
- Backend image chưa có bước migrate/seed ở startup; Compose chỉ start server. Cần hướng dẫn khởi tạo DB rõ ràng, không tự thêm seed phá dữ liệu để “docker compose chạy được”.
- Compose không truyền build args VITE_API_URL/VITE_SOCKET_URL vào frontend dù Dockerfile hỗ trợ. Truy cập localhost hiện có fallback local; dùng hostname khác có thể rơi về URL Render hardcode. Cần thống nhất cấu hình theo môi trường.
- Schema Student có các cột nhân thân chưa có trong migration duy nhất. Đây là việc đồng bộ schema cần migration mới, không xóa migration cũ đã deploy.
- Chưa có lint/format script/config thống nhất. Nên thêm lint no-unused-vars/imports trước, xử lý cảnh báo rõ ràng rồi cân nhắc format. Tránh format hàng loạt chen vào bản vá nghiệp vụ hiện tại.
- .dockerignore chưa bao phủ cache/scratch; .gitignore đã chặn các thư mục này ở Git. Cần phân biệt hai loại ignore.

### C-20. Tool description, policy seed và tài liệu sống còn lệch

**Ưu tiên: cao; rủi ro: vừa đối với prompt/tool, thấp đối với doc.**

- ToolRegistry còn mô tả nợ phí dưới 10M, phúc khảo 7 ngày, chứng từ bệnh viện và cấp QR; chúng không đúng phạm vi workflow chính hiện tại. Description được gửi cho LLM nên có thể tác động hành vi, không chỉ là comment thừa.
- Seed còn POL_NO_TUITION_DEBT yêu cầu nợ bằng 0 và đánh dấu một số trường optional, trong khi validator hiện khác. Metadata trả từ /types có thể gây hiểu nhầm. Chỉnh seed không đồng nghĩa đã cập nhật DB đang chạy.
- README, RUNBOOK, 08_VERIFY và docs index còn mô tả General Verify chưa có route. 09_API và 11_SECURITY đã được cập nhật ở lượt vá trước, nên cần đồng bộ các tài liệu còn lại theo chúng và source.
- README/ROADMAP còn ghi 54/54, Jest, 15 suites và benchmark 0%/1,5% như kết quả đã đo. Runtime dùng node:test; API metrics vẫn PARTIAL/null cho hai tỷ lệ chưa đo độc lập.
- Báo cáo PHAN_TICH_DU_AN_VA_NGHIEP_VU.md là snapshot trước bản vá mới, còn ghi Core hỏi dữ kiện trước khi từ chối. Cần thêm nhãn snapshot hoặc cập nhật mục này; không báo lại lỗi 2, 3, 4 đã vá như vẫn chưa xử lý.
- Lịch sử specs/sprint giữ để truy vết, nhưng nên gom vào archive hoặc gắn trạng thái lịch sử và chỉ rõ tài liệu hiện hành.

## 6. Trình tự dọn đề xuất

### Đợt 1 — dọn ít ảnh hưởng hành vi

1. Import/binding không dùng; bỏ request lấy types không có consumer sau khi chọn nguồn danh mục.
2. Gỡ docx/clsx/tailwind-merge cùng lockfile.
3. Gom BUILD_LOG trùng, sửa link hỏng và đánh dấu tài liệu lịch sử/snapshot.
4. Bổ sung dockerignore cache/log/scratch; không đụng dữ liệu DB.
5. Thêm lint cơ bản; kiểm tra build và test cô lập.

### Đợt 2 — gỡ di sản và thống nhất giao diện

1. Gỡ nhánh tốt nghiệp bị tắt trong modal và các handler/state đi kèm.
2. Gỡ ba member petitionTools không có caller, rồi xét AcademicPolicyEngine.
3. Chọn xử lý tool wrapper không có danh mục và reconcileChain bảo trì.
4. Sửa class Tailwind không có rule; kiểm tra lightbox/modal và responsive.
5. Thống nhất lời dẫn QR/bản cứng và metadata mẫu; giữ renderer dữ liệu lịch sử nếu cần.

### Đợt 3 — sửa nền tảng có test bảo vệ

1. Tách test integration khỏi npm test mặc định và dùng DB disposable.
2. Hợp nhất cán bộ quyết định qua một service, giữ endpoint tương thích.
3. Hợp nhất context HTTP/Socket, validation và workflow từng bước.
4. Thiết kế lại resume theo trường thiếu, thống nhất JSON/multipart giữa UI và backend.
5. Đồng bộ migration, nguồn lịch học/tín chỉ và seed bằng công việc nghiệp vụ riêng.

Không nên gộp ba đợt vào một refactor lớn khi nhánh còn nhiều thay đổi chưa commit. Sau mỗi đợt, kiểm tra diff, test đúng phạm vi và build; chỉ chạy lại mutation catalogue khi thay đổi các kiểm soát nó bảo vệ hoặc thay cấu trúc khiến catalogue phải cập nhật.

## 7. Các phần cần giữ

- Các bản vá thứ tự chốt, CAS, ErrorShield, phân quyền và room log hiện có.
- 52 security test, testSupport và 5 test policy-precedence; mutation runner/báo cáo vẫn là bằng chứng hữu ích, cần tổ chức chứ không xóa vì untracked.
- API resume, staff-confirm và OCR đang có caller hoặc đã được dùng kiểm thử.
- Ảnh chứng chỉ demo còn được Vision/renderer tham chiếu; không kết luận chúng mồ côi chỉ vì modal cũ bị tắt.
- Tham số interface của BasePetitionHandler và các lệnh seed có side effect.
- .env cục bộ, lockfile, Prisma migration đã áp dụng, node_modules đang chạy và volume DB.

Kết quả kiểm chứng gần nhất trước lượt rà soát: 114/114 test cô lập đạt, 39/39 mutation chủ đích bị phát hiện, frontend build đạt. Lượt này bổ sung phân tích tĩnh và probe CSS; chưa chạy trình duyệt, Docker hoặc test ghi database.
