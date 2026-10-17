# Chạy và kiểm thử automation local

Frontend phục vụ bản `dist` đã build qua Vite preview. Backend chạy chế độ production bằng DB/AI trong `backend/.env`. Không cần Docker. Đây là môi trường local để thử bản sửa; chưa deploy lên demo công khai.

## Chạy lại

Terminal 1, tại `EDUREF_AI/backend`:

```powershell
npm run start:local
```

Launcher dùng cổng 5000, cho phép frontend localhost:8080 và tạo khóa ký riêng cho phiên local nếu JWT trong cấu hình đang là khóa mẫu. File `.env` không bị sửa. Khi khởi động lại, giao diện tự đăng nhập lại tài khoản demo.

Terminal 2, tại `EDUREF_AI/frontend`:

```powershell
$env:VITE_API_URL='http://localhost:5000/api'
$env:VITE_SOCKET_URL='http://localhost:5000'
npm run build
npm run preview -- --host 127.0.0.1 --port 8080 --strictPort
```

Mở **http://localhost:8080**. Health: **http://localhost:5000/health**. Dừng mỗi terminal bằng Ctrl+C. Thay đổi biến VITE cần build lại.

## Schema đã áp dụng

Đã thêm riêng bảng `PetitionDraft` và hai index theo migration `20261017000100_petition_drafts`. Migration `20261017000200_draft_resolution` thêm cột JSON nullable `resolution` để lưu lý do, hướng xử lý và thời điểm kết thúc khi không đủ điều kiện. Không reset hoặc seed lại dữ liệu.

DB được cung cấp hiện chưa có bảng lịch sử `_prisma_migrations`, dù các bảng nghiệp vụ đã tồn tại. Vì vậy, đợt local này dùng `node scripts/apply-draft-schema.mjs` để thêm đúng bảng hoặc cột mới còn thiếu; không chạy reset, seed hay tự baseline toàn bộ DB. Chạy lại script không tạo trùng bảng/cột.

Với database mới đã được quản lý bằng Prisma migrations, áp dụng migration theo quy trình triển khai của dự án. Với DB cũ chưa có lịch sử, cần chốt baseline schema trước khi đưa toàn bộ chuỗi migration vào deploy tự động.

## Các luồng nên thử

1. **Thuế hoặc NVQS:** bấm “AI chuẩn bị hồ sơ”. SĐT, nhân thân và địa chỉ được lấy từ backend; chỉ chọn cơ sở nếu chưa chọn. Các lựa chọn là nút. Khi ngừng nhập/chọn, thay đổi được tự lưu và hồ sơ chuyển sang bước xác nhận.
2. **Vay vốn:** chỉ bổ sung tình trạng mồ côi, số lần giải ngân và số tiền vay gần nhất nếu chưa có. Số lần trường đã cấp giấy được tính từ lịch sử; không tự điền 0 cho dữ kiện cá nhân chưa biết.
3. **Xác nhận chung:** chọn nhanh mục đích hoặc nhập mục đích riêng. Kiểm tra bản tóm tắt rồi xác nhận nộp một lần.
4. **NVQS:** bản xem trước hiển thị địa chỉ và nội dung cam kết. Chỉ nút xác nhận cuối mới ghi nhận cam kết theo phiên bản đang xem.
5. **Phục hồi:** chuẩn bị và sửa một bản nháp, đợi trạng thái lưu xong rồi F5. Bản nháp được lấy lại từ DB. Có thể dùng “Xem / chỉnh sửa” để mở đầy đủ các trường; form mở riêng lưu khi bấm chuẩn bị bản xem trước.
6. **Chống gửi trùng:** click xác nhận lặp hoặc gửi lại cùng revision sau một lần nộp thành công: chỉ có một request ID.
7. **Hồ sơ cũ:** vào “Đơn của tôi”, chọn “Bổ sung hồ sơ” trên đơn đang chờ. Hệ thống lấy lại dữ liệu đã lưu và tiếp tục cùng mã hồ sơ.
8. **Phòng ban:** một hồ sơ cấp lại có lý do sẽ chuyển cán bộ theo policy. Duyệt không cần ghi chú; từ chối có lý do mẫu; yêu cầu bổ sung chọn trường; có nút chuyển Trưởng phòng. Bổ sung không xóa yêu cầu con người duyệt. Hồ sơ đã chuyển Trưởng phòng không được cán bộ thường duyệt thay.
9. **Realtime:** mở hai cửa sổ/phiên riêng cho sinh viên và cán bộ, xử lý một hồ sơ và kiểm tra trạng thái sinh viên tự cập nhật. Khi reconnect, UI tải lại trạng thái DB.
10. **Chat:** yêu cầu tự nhiên như “Tôi muốn xin giấy xác nhận để xin visa”. AI chuẩn bị bản nháp; không hỏi lại cả danh sách nhân thân hoặc tự cấp giấy trước khi xác nhận.
11. **Từ chối và kết thúc:** chuyển sang tài khoản Cao Hữu Nhân (khóa 2022), chọn NVQS. Kết quả trong lịch sử chat hiển thị lý do, kết luận quy trình đã kết thúc và hướng xử lý; không còn cam kết địa chỉ, ô bổ sung hoặc nút nộp. “Có” không mở lại yêu cầu đã từ chối. Chọn gợi ý “Bắt đầu Xác nhận sinh viên nợ môn” để mở công việc mới, dùng lại nhân thân. Sinh viên thôi học/bảo lưu nhận hướng liên hệ đơn vị phụ trách, không bị gợi ý sai sang mẫu nợ môn.
12. **Terminal:** chọn thủ tục từ sidebar, sửa thông tin hoặc xác nhận nộp. `Agent Execution Terminal` hiển thị các bước backend thực thi, mã quy định, ID bản nháp/hồ sơ và kết quả. Các bước là sự kiện công cụ/quy tắc thực tế; không phải nội dung suy nghĩ nội bộ của mô hình. Lịch sử HTTP được gộp với Socket để không làm mất log mới khi tải lại hoặc reconnect. Nút thùng rác chỉ ẩn log trên màn hình hiện tại.
13. **Tên hiển thị:** thông báo cấp lại, kết quả thẩm định, phân loại, danh sách đơn và nhật ký dùng tên tiếng Việt. Ví dụ mã biểu mẫu nợ môn được hiển thị “Xác nhận sinh viên nợ môn”; mã phân loại thiếu dữ kiện được hiển thị “Thiếu thông tin cần xác minh”. Giá trị API, mã hồ sơ và mã kiểm chứng giữ nguyên để đối chiếu.
14. **Gợi ý theo ngữ cảnh:** dưới câu trả lời mới nhất có 2–3 lựa chọn phù hợp khi có nội dung liên quan hệ thống. Câu hỏi gửi ngay khi bấm; thao tác xem đơn hoặc mở phần bổ sung đi trực tiếp tới nơi xử lý. Gợi ý không tự khai thông tin cá nhân, không thay nút xác nhận nộp, không tạo thủ tục ngoài danh mục. Khi lỗi cấu hình mô hình, nút “Dùng mô hình Tự động” chọn lại mô hình và gửi đúng yêu cầu trước đó.
15. **Markdown:** thử thông báo có chữ đậm, danh sách nhiều mục, xuống dòng được escape, tiêu đề, bảng và liên kết. Cùng bộ hiển thị áp dụng cho chat, kết quả hồ sơ, hướng dẫn bổ sung, cán bộ, kiểm thử và kiểm toán. Nội dung HTML không được thực thi; liên kết nguy hiểm không tạo đường dẫn bấm được.
16. **Hồ sơ hoàn tất không ghim:** sau khi xác nhận nộp hoặc kết thúc, kết quả xuất hiện một lần trong lịch sử chat. Gửi “hello” hoặc hỏi việc khác: kết quả cũ không bị chuyển lại xuống cuối; form cố định chỉ còn khi hồ sơ thực sự đang chờ thông tin/xác nhận. Hồ sơ chờ cán bộ vẫn xem trong “Đơn của tôi”; chỉ khi cán bộ yêu cầu bổ sung mới mở lại phần làm việc.

Các quyết định về học vụ, điều kiện cấp và hạn ngạch tiếp tục do policy backend. Nếu nguồn học vụ thiếu dữ liệu, hồ sơ đủ thông tin cá nhân sẽ được chuyển cán bộ xác minh sau khi người dùng xác nhận, không bắt sinh viên tự khai dữ liệu học vụ thay nhà trường.

## Kiểm chứng đã chạy

- Kết quả mới nhất: **170/170 test backend**, **64/64 test frontend**, lint và production build đều đạt. Bằng chứng đợt tên hiển thị, Markdown, gợi ý và lịch sử: `qa/automation-audit-2026-10-17/backend-presentation-tests.log`, `frontend-presentation-tests.log`.
- Unit/backend: bộ cũ và các ca bản nháp, quyền sở hữu, xác nhận theo revision, idempotency, hồ sơ cũ và dữ liệu học vụ thiếu.
- Frontend: callback hiện có, render phần thiếu/xác nhận cuối, không chèn thông tin cá nhân mẫu, phân biệt bản nháp với kết quả đã duyệt.
- `scripts/qa-local-workflows.mjs`: chạy API local với DB thật cho 5 biểu mẫu, gửi đồng thời hai xác nhận cùng revision, phục hồi bản nháp, yêu cầu bổ sung/chuyển cấp/phê duyệt và nhận sự kiện Socket; gọi AI thật để chuẩn bị bản nháp.
- Bằng chứng lần chạy local: `qa/automation-audit-2026-10-17/local-workflows.json`. Sáu hồ sơ QA tạo trong lần chạy đã được thu hồi riêng, audit giữ lại; các bản nháp QA được đóng.
- `scripts/qa-local-policy-terminal.mjs`: kiểm thử HTTP và Socket có xác thực với DB thật; NVQS quá hạn bị từ chối, quyết định bền vững, chặn sửa/nộp lại, “Có” kết thúc không gọi LLM, mở hồ sơ nợ môn riêng, từ chối sinh viên thôi học và cách ly log giữa hai tài khoản. Bằng chứng: `qa/automation-audit-2026-10-17/local-policy-terminal.json`. Không tạo hồ sơ nghiệp vụ; bản nháp nợ môn QA được hủy. Kết luận từ chối và audit được giữ để kiểm tra.
- Readiness mới nhất: `qa/automation-audit-2026-10-17/local-policy-readiness.json` (frontend, JS asset và backend DB health đều HTTP 200). Bài gọi AI thật bổ sung cho lần sửa từ chối/terminal chưa chạy: bộ duyệt tự động chặn do khả năng gửi dữ liệu cá nhân sinh viên ra nhà cung cấp AI. Bộ QA mới sử dụng API/Socket local và nhánh kết thúc không gọi LLM.
- Chưa tự động click trên trình duyệt vì công cụ browser của phiên làm việc không khả dụng. Các ca render là kiểm thử component, không phải kiểm thử hình ảnh hoặc thao tác UI thật. Người dùng có thể thử giao diện tại URL local trên.
- Đợt giao diện: render toàn bộ trang sinh viên với transport giả lập offline để xác nhận kết quả hoàn tất chỉ nằm trong lịch sử, trong khi form của hồ sơ đang mở vẫn có nút xác nhận. Bài `frontend/scripts/check-local-presentation.mjs` đọc API local bằng hai tài khoản demo và kiểm tra asset production, trạng thái, gợi ý và vị trí lịch sử với dữ liệu đã lưu. Không tạo hồ sơ hoặc gọi dịch vụ AI; bằng chứng: `qa/automation-audit-2026-10-17/local-presentation-readiness.json`.
- BrowserAct CLI đã được chuẩn bị ngoài repo trong `.qa-tools`; chưa tạo môi trường trình duyệt hoặc nhập hồ sơ Chrome. Công cụ không có trình duyệt cấu hình sẵn nên chưa có xác minh bằng thao tác click/screenshot trực tiếp cho đợt giao diện này.

## Thay đổi chính

- Bản nháp bền vững tách khỏi hồ sơ chính thức và hạn ngạch.
- Dữ liệu trường và dữ liệu người dùng có nguồn rõ ràng; chỉnh sửa cho đơn không tự ghi đè hồ sơ gốc.
- Nút/hành động gắn với chủ sở hữu, ID và revision; LLM không tự xác nhận thay người dùng.
- Các đường vào sidebar, biểu mẫu, chat, HTTP và Socket cùng chuẩn bị bản nháp.
- Tiếp tục `/resume` dùng đúng hồ sơ; dữ liệu từ bản nháp được kiểm tra lại trước khi nộp.
- Thông báo trạng thái chỉ phát sau commit, đúng phòng người dùng và cán bộ; UI đồng bộ lại khi reconnect.
- Quyết định từ chối là trạng thái cuối, có snapshot lý do/hướng xử lý. Với hồ sơ cũ đang chờ bổ sung nhưng đã đủ căn cứ từ chối, đóng cả bản nháp và hồ sơ cùng ID, không tiếp tục thu thập dữ liệu cá nhân.
- Log terminal được nối tại lớp workflow dùng chung cho sidebar và công cụ chat. Bộ đệm terminal giữ tối đa 300 sự kiện trong tiến trình backend; khởi động lại backend sẽ xóa bộ đệm này. Quyết định và bằng chứng kiểm toán vẫn lưu trong DB.
- Bộ nhãn tiếng Việt và bộ render Markdown dùng chung chỉ đổi cách hiển thị; các trường/giá trị gửi API, quy tắc duyệt và dữ liệu gốc không bị dịch hoặc thay đổi.
- Kết quả công việc được đối chiếu theo ID vào đúng tin nhắn lịch sử, không tạo lại khi poll. Nếu trạng thái đổi trong lúc AI đang stream câu trả lời khác, giữ nguyên tin đang stream để không ghép nhầm nội dung.
