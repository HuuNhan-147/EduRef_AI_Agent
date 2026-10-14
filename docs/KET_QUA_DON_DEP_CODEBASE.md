# Kết quả dọn dẹp codebase

Ngày 15/10/2026, nhánh `fix/security-review-2026-10-14`. Thực hiện trên cây làm việc đang có bản vá; chưa commit/push hoặc triển khai. Đối chiếu với [danh sách rà soát trước cleanup](RA_SOAT_DON_DEP_CODEBASE.md).

## Đã xử lý

- Bỏ 75 binding import được xác định ở lần rà soát, cùng import/state phát sinh không còn dùng sau refactor. Giữ các import có side effect, hợp đồng handler và lệnh seed có tác dụng ghi dữ liệu.
- Gỡ dependency trực tiếp `docx`, `clsx`, `tailwind-merge`; cập nhật package/lockfile bằng npm.
- Gỡ nhánh xét tốt nghiệp bị tắt, handler chứng chỉ/preview và state chết trong modal cấp giấy. Giữ OCR/Vision và renderer hồ sơ lịch sử còn có thể được dùng.
- Gom metadata năm biểu mẫu frontend vào `frontend/src/config/confirmationForms.js`; bỏ request `/petitions/types` không có consumer trên trang sinh viên. Endpoint danh mục vẫn được giữ.
- Modal nộp trực tiếp bằng JSON đúng hợp đồng Express; dùng chung helper dựng input cho nộp trực tiếp và chat.
- Thay phần upload bổ sung giả bằng `PetitionSupplementForm`: gửi trường người dùng thực sự nhập vào `/petitions/:id/resume`, không tạo URL giả, không tự gán cả chứng từ ngân hàng/NVQS và không đổi mục đích sang vay vốn. Ô trống giữ dữ kiện đã nộp; xác nhận địa chỉ cần thao tác rõ ràng. Hiển thị lỗi trả về và quyết định thực tế; không mặc định mọi kết quả thành APPROVED.
- Gỡ ba member không có caller của `petitionTools`, rồi gỡ `AcademicPolicyEngine` chỉ được member cũ dùng. Giữ adapter `/agent/staff-confirm`, chuyển về `AcademicWorkflowService.staffDecision` để dùng chung CAS, transaction, reviewer capsule và audit. Shape phản hồi tương thích được giữ; mã audit của endpoint cũ nay thống nhất `STAFF_APPROVE_REQUEST` / `STAFF_REJECT_REQUEST`.
- Gỡ wrapper rollback không có dispatcher và hàm bảo trì `reconcileChain` không có caller. Giữ tính năng trace, bổ sung declaration `get_execution_trace` khớp resolver và guard sở hữu hồ sơ đã có test.
- Chỉnh mô tả tool về phạm vi giấy xác nhận; bỏ hướng dẫn nợ phí dưới 10 triệu, phúc khảo, bệnh án và cấp QR không phù hợp. Thông báo hoàn tác không còn hứa vô hiệu hóa QR của luồng hiện tại.
- Seed bỏ biến kết quả không dùng, đánh dấu SĐT/cơ sở nhận bắt buộc và bỏ metadata chính sách nợ học phí bằng 0 không phù hợp policy hiện tại. **Chỉ sửa source seed, không chạy seed hoặc cập nhật DB đang dùng.**
- Tách hai file có đường ghi DB sang `backend/test/integration`. `npm test` mặc định chỉ chạy test cô lập, preload DB blackhole/Gemini giả và không nạp `.env` ứng dụng. Integration có lệnh riêng, yêu cầu opt-in cùng URL PostgreSQL local với tên DB `*_test`.
- Thêm lint cú pháp/import không dùng bằng Babel, khai báo parser/traverse trực tiếp ở devDependencies. Lint không phải cấu hình ESLint/no-unused-vars toàn diện.
- Định nghĩa shadow-xs/shadow-2xs, backdrop-blur-xs, ring-1.5, z-60 và animation trong Tailwind 3; đổi class spacing/outline/animation không được hỗ trợ. Có test sinh CSS cho token tùy chỉnh và tôn trọng reduced motion. Bỏ nhóm CSS primitive chưa có nơi dùng.
- Docker dùng `npm ci`, ignore cache/log/scratch/test phụ trợ; Compose truyền URL backend khi build frontend và mặc định tắt seed phá dữ liệu.
- Gom BUILD_LOG trùng về bản root; README/ROADMAP hiện hành được viết lại theo runtime, bản roadmap chi tiết cũ giữ nhãn lịch sử. Sửa liên kết máy cũ, bỏ liên kết đến file không tồn tại và nhãn General Verify chưa triển khai. Đồng bộ runbook, API, security, Verify và policy; các specs/sprint/snapshot được đánh dấu phạm vi thời điểm.
- Sửa mô tả test: harness là mười nhóm ví dụ policy, không thực thi 100 record độc lập; test theo thiết kế không parse/bao phủ toàn bộ sơ đồ `.mdj`.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Backend `npm test` | **115/115 PASS**; gồm test mới chặn cấu hình integration nguy hiểm |
| Security mutation | **39/39 KILLED bằng assertion**, baseline trước/sau **52/52 PASS** |
| Frontend `npm test` | **4/4 PASS**: input biểu mẫu, dữ kiện bổ sung, quyết định và CSS token |
| Frontend `npm run lint` | **80 file**, không lỗi cú pháp/import không dùng |
| Frontend `npm run build` | Đạt |
| `npm audit --omit=dev` backend/frontend | 0 advisory trong dependency production tại thời điểm chạy |
| Integration không cấu hình opt-in/DB test | Bị guard chặn trước khi chạy nghiệp vụ, đúng kỳ vọng; đây không phải kết quả chạy integration thành công |
| Liên kết Markdown cục bộ | Kiểm tra file đích trong repository; không xác nhận URL Internet hoặc anchor dòng cũ |

Mutation report: [SECURITY_MUTATION_RESULTS.json](../EDUREF_AI/docs/SECURITY_MUTATION_RESULTS.json). Catalogue có chủ đích, không đại diện mutation score toàn codebase.

Không chạy trình duyệt, Gemini thật, DB integration, seed/migrate/reset, build Docker hoặc deploy. Test unit với transaction stub không chứng minh concurrency/rollback của PostgreSQL thật.

## Phần giữ lại và việc tiếp theo

| Mục rà soát | Tình trạng sau cleanup |
|---|---|
| C-01–04 | Import/dependency/state chính đã dọn; docs hiện hành và lịch sử được phân biệt |
| C-05 | Docker context đã exclude cache; cache cục bộ chưa xóa |
| C-06–08 | Nhánh modal/member cũ đã gỡ; trace được khai báo; bảo trì tính lại audit đã gỡ |
| C-09 | Lời dẫn luồng hiện tại đã sửa; giữ QR/renderer legacy để đọc hồ sơ lịch sử |
| C-10 | Bổ sung chuyển sang dữ kiện JSON thực; lưu trữ/upload file thật vẫn là việc riêng |
| C-11 | Gỡ đường legacy không dùng; Core/fast path/tool nhỏ còn các kiểm tra trùng cần hợp nhất có test đối chiếu |
| C-12 | Hai endpoint cán bộ dùng chung service quyết định |
| C-13 | Metadata năm mẫu frontend đã gom; campus/benchmark/status còn phân tán |
| C-14 | Nạp context HTTP/Socket chưa hợp nhất; cần chốt nguồn học vụ trước |
| C-15 | Modal đã giảm code chết; chưa tách toàn bộ trang lớn/auth state thành hook/provider |
| C-16–17 | Test DB được tách và chặn cấu hình nguy hiểm, tên/mô tả kiểm chứng đã làm rõ; dataset 100 ca chưa thành 100 test độc lập |
| C-18 | Token CSS đã cấu hình/đổi và có probe tự động; chưa QA hình ảnh trình duyệt |
| C-19 | Docker/Compose/lint đã chỉnh; migration nhân thân còn thiếu, chưa kiểm chứng image thực |
| C-20 | Tool/seed source/tài liệu sống đã chỉnh; dữ liệu seed hiện có trong DB không tự thay đổi |

Ưu tiên tiếp: đồng bộ migration trên DB disposable; có nguồn TKB/tín chỉ thật cho hồ sơ tùy biến ACTIVE; thống nhất context/workflow; QA trình duyệt cho bổ sung, đổi vai trò và stream. Không dùng TKB/tín chỉ do client tự khai để ép duyệt.

Audit đầy đủ frontend còn 8 advisory ở toolchain dev (2 moderate, 6 high), tập trung dependency Tailwind 3/PostCSS. Chưa nâng major Tailwind hoặc ép override transitive trong đợt cleanup vì cần đánh giá tương thích CSS riêng. Kết quả audit production bằng 0 không có nghĩa toàn bộ toolchain không còn advisory.

Lệnh xóa ba cache npm cục bộ bị cơ chế xét duyệt tự động chặn với thông báo `blocked by policy`, không nêu lý do cụ thể. Cache được giữ nguyên; `.env`, node_modules và dữ liệu PostgreSQL cũng được giữ.
