# Kiểm thử luồng automation EduRef AI — 17/10/2026

## Phạm vi và cách kiểm thử

- Bản demo: https://eduref-ai-agent.vercel.app/ và https://eduref-ai-agent-1.onrender.com.
- Kiểm thử API live khoảng **11:14–11:20 ngày 17/10/2026, giờ Việt Nam**. Timestamp trong JSON dùng UTC.
- Người dùng đã cho phép tạo hồ sơ thử bằng tài khoản demo và thử quyết định của cán bộ trên các hồ sơ đó.
- Đăng nhập demo `STUDENT_ACTIVE`, gọi HTTP và Socket.IO thật, chạy LLM thật; kết quả ghi vào DB demo thật. Quyết định cán bộ dùng `STAFF_DAOTAO`.
- Bao phủ cả 5 loại giấy, yêu cầu từ sidebar, dữ liệu biểu mẫu, bổ sung qua chat, bổ sung qua `/resume`, xác nhận NVQS, chuyển cán bộ, duyệt, từ chối, chống duyệt lặp và theo dõi sự kiện trạng thái.
- Các ca `exact-bank-modal-http` và `military-modal-socket` chạy chính callback `handleSubmitToAgent` trích từ mã frontend local để tạo message và inputData. Các ca `general-modal-http` và `bank-modal-socket` ban đầu dùng payload theo cấu hình biểu mẫu nhưng câu nhắn rút gọn; không coi hai ca đó là bản ghi thao tác UI thật.
- **Chưa kiểm thử click/nhập liệu/refresh trên trình duyệt**: công cụ không có browser khả dụng, cả `iab` và `chrome` đều trả `Browser is not available`. Các nhận xét về bố cục/form dựa trên mã frontend và kiểm thử callback, không phải quan sát UI live.
- **Không chạy integration suite với PostgreSQL local** vì workspace không có cấu hình DB thử. Bộ test backend dưới đây dùng preload cô lập, fixture trong bộ nhớ, không dùng DB demo.

## Kết quả kiểm tra nền

| Kiểm tra | Kết quả |
|---|---|
| Trang frontend live | HTTP 200 |
| Health backend live | HTTP 200, `healthy` |
| Đăng nhập và lấy thông tin phiên demo | Thành công |
| Backend `npm test`, runner chuẩn với tiến trình test cô lập | **153/153 đạt** |
| Frontend `npm test` | **19/19 đạt** |
| Frontend `npm run build` | Thành công |

Lần thử runner không cô lập ban đầu gặp giới hạn spawn và xung đột cấu hình timeout giữa file test. Kết quả chính thức ở trên đến từ runner chuẩn của dự án, đã chạy lại với quyền cho phép spawn tiến trình. Frontend dependency được cài đúng lockfile bằng `npm ci --ignore-scripts`; không sửa phiên bản package hay mã sản phẩm.

Các bộ test đang có kiểm tra tính đúng của policy, persistence, phân quyền và xử lý phản hồi. Việc chúng đạt chưa chứng minh người dùng chỉ cần ít thao tác: hiện chưa có tiêu chí kiểm thử cho số câu hỏi thừa, số lần nhập lại và một hồ sơ xuyên suốt hội thoại.

## Ma trận kết quả live

| Ca | Kết quả quan sát | Đánh giá theo mục tiêu mới |
|---|---|---|
| Chào hỏi | Trả lời, không gọi tool và không tạo đơn | Đúng ranh giới giữa tư vấn và thực thi |
| Bấm yêu cầu nhanh giấy thuế | `XNSV-116258` chờ SĐT, địa chỉ, cơ sở nhận; payload `currentUser` đã có SĐT và địa chỉ | Dữ liệu hồ sơ chưa được dùng lại. Cơ sở nhận chưa chọn là thông tin thực sự còn thiếu |
| Bổ sung cho đơn thuế bằng chat, cùng session | Tạo và duyệt `XNSV-539313`, khác `XNSV-116258` | **Sai tính liên tục của hồ sơ**; đơn cũ vẫn chờ |
| Đơn chung có dữ liệu đầy đủ qua AI/HTTP | `XNSV-931374` được duyệt ngay; không có `draft` hay `actions` | Chưa có bước xác nhận cuối riêng theo lựa chọn người dùng |
| Vay vốn qua Socket, payload biểu mẫu nhưng câu nhắn rút gọn | `XNSV-896825` thiếu đúng 4 trường vay vốn; lời AI còn yêu cầu SĐT và cơ sở nhận dù backend không đánh dấu thiếu | Lời AI có thể mở rộng danh sách cần nhập ngoài kết quả kiểm tra |
| Bổ sung 4 trường vay vốn bằng `/resume` | Chính `XNSV-896825` được duyệt; giữ nguyên ID | Cơ chế tiếp tục có cấu trúc đang hoạt động tốt |
| Chạy chính callback gửi form vay vốn local rồi gửi live | `XNSV-344072` vẫn thiếu 4 trường vay vốn; AI hướng dẫn quay lại “Điền đơn” | Form ban đầu chưa cung cấp các trường cần thiết, tạo vòng quay lại form |
| Nợ môn, nộp trực tiếp đầy đủ | `XNSV-457576` tự duyệt | Core có khả năng xử lý thường quy tự động |
| NVQS với message và payload từ callback form thật | `XNSV-714436` chờ xác nhận địa chỉ | Điểm dừng cần thiết, nhưng chưa có action có cấu trúc |
| Trả lời “Có” cho câu hỏi NVQS, cùng session | Tạo `XNSV-432466`, hỏi lại đúng nội dung và yêu cầu gõ “Xác nhận đúng” | **Không chấp nhận thao tác xác nhận tự nhiên; tiếp tục tạo đơn mới** |
| Xác nhận `isAddressConfirmed: true` qua `/resume` | Chính `XNSV-714436` được duyệt, không nhập lại SĐT/địa chỉ/cơ sở | Có thể dùng nền tảng này để nối nút xác nhận |
| Xin cấp lại đơn chung có lý do | `XNSV-315639` chuyển `ESCALATED` | Giữ đúng phạm vi tự động hóa và thẩm quyền |
| Cán bộ duyệt không nhập ghi chú | `XNSV-315639` được duyệt, có audit `STAFF_APPROVE_REQUEST` | Backend đã hỗ trợ quyết định không cần nhập text |
| Cán bộ duyệt lại cùng hồ sơ | Bị từ chối với `success: false`, không duyệt hai lần | Guard hoạt động; frontend cần đọc business success, không chỉ HTTP 200 |
| Cán bộ từ chối không có lý do | HTTP 400 | Cần nút chọn lý do có sẵn để giảm gõ, vẫn giữ lý do trong audit |
| Cán bộ từ chối với lý do mẫu | `XNSV-887907` chuyển `REJECTED` | API hỗ trợ cách triển khai bằng lựa chọn có cấu trúc |
| Sinh viên theo dõi quyết định cán bộ bằng Socket | DB đã `APPROVED`; không nhận `petition_status_updated` hoặc `petition_escalated` trong cửa sổ quan sát | Chưa khép kín bước tự cập nhật kết quả. Giới hạn phép đo: quan sát từ trước khi duyệt đến sau khi đọc detail và thêm 1.500 ms |

## Những phần cần sửa, theo ưu tiên

### P0 — Tiếp tục đúng hồ sơ, không tạo đơn mới cho một câu trả lời

**Bằng chứng live:** thuế `116258 → 539313`; NVQS `714436 → 432466`.

`AcademicWorkflowService.processStudentConfirmation()` luôn truyền `forceNewRequest: true`. Trong khi đó, `/petitions/:id/resume` đã hợp nhất dữ liệu và tiếp tục đúng request ID.

**Đề xuất:** trạng thái công việc lưu ở backend, có `draftId/requestId`, loại đơn, dữ liệu, trường thiếu và hành động đang chờ. Khi đang chờ người dùng, cả chat và nút bấm phải cập nhật/tiếp tục hồ sơ đó. Chỉ tạo công việc mới khi người dùng chủ động chọn làm đơn khác. Thêm khóa chống gửi lặp để bấm hai lần hoặc retry mạng không tạo hai đơn.

### P1 — Tự lấy dữ liệu đã có và phân biệt rõ nguồn dữ liệu

**Bằng chứng live:** yêu cầu nhanh giấy thuế có SĐT/địa chỉ trong `currentUser` nhưng bị hỏi lại. Phản hồi đăng nhập và `/auth/me` cũng chưa trả đầy đủ các trường hồ sơ mà giao diện đang hiển thị từ danh mục demo.

**Đối chiếu mã:** nhánh HTTP và Socket dựng `userContext` riêng, chỉ nạp một phần hồ sơ. Agent chưa đưa `inputData` vào ngữ cảnh trước lần chọn công cụ đầu tiên. Một số guard đang cấm dùng lại SĐT/địa chỉ từ hồ sơ.

**Đề xuất:** một hàm backend tổng hợp hồ sơ dùng chung cho HTTP/Socket/form; dữ liệu nhân thân và học vụ lấy theo danh tính xác thực; dữ liệu cho đơn lấy từ bản nháp hiện tại và hồ sơ đã lưu. Lưu nguồn cho từng trường. Người dùng được xem/chỉnh sửa thông tin cá nhân cho đơn, còn danh tính, học vụ, hạn ngạch và thẩm quyền vẫn do server xác lập.

Hàm `buildConfirmationInput()` hiện tự điền SĐT, địa chỉ và cơ sở mẫu khi để trống. Cần tách chế độ demo khỏi dữ liệu dùng cho hồ sơ thật; không thể coi mọi giá trị đang hiển thị là thông tin đã được sinh viên cung cấp.

### P1 — Biểu mẫu ban đầu và biểu mẫu bổ sung dùng chung định nghĩa trường

**Bằng chứng live:** kể cả message và payload sinh từ callback form vay vốn, backend vẫn thiếu `orphanStatus`, `loanFormCount`, `loanGrantedCount`, `lastLoanAmount`.

**Đề xuất:** biểu mẫu biết đầy đủ các trường theo từng thủ tục trước khi gửi. Tình trạng mồ côi dùng lựa chọn; số lần/tiền dùng ô số; không mặc định 0 khi chưa có căn cứ. Số lần trường đã cấp giấy nên lấy từ lịch sử hợp lệ nếu dữ liệu đủ tin cậy. Thông tin giải ngân cần nguồn tương ứng hoặc hỏi sinh viên khi chưa có.

Form bổ sung hiện nhận `requestId`, `question`, `onSubmitted`, khởi tạo toàn bộ ô trống và hiển thị danh sách trường cố định. Cần truyền `missingFields`, `invalidFields`, giá trị hiện có và cấu hình kiểu nhập. Chỉ hiện đúng phần cần người dùng cung cấp. Gom các trường thiếu có thể xác định cùng lúc thành một lượt.

### P1 — Hành động và xác nhận là dữ liệu có cấu trúc

**Bằng chứng live:** “Có” không xác nhận được NVQS, trong khi một payload boolean qua `/resume` hoàn tất đúng đơn. Tất cả kết quả AI được đo đều không có `actions` hoặc `draft`.

**Đề xuất:** backend trả hành động theo loại, ví dụ `CONFIRM_ADDRESS`, `SELECT_CAMPUS`, `SUBMIT_DRAFT`, `SWITCH_FORM`. UI dựng nút từ hành động được phép. Không để LLM tự quyết định ý nghĩa của một câu “Có”.

Mỗi hành động gắn request/draft ID và phiên bản dữ liệu. Xác nhận địa chỉ phải gắn đúng địa chỉ đã hiển thị; sửa địa chỉ làm mất hiệu lực xác nhận trước. LLM không được tự xác nhận thay người dùng.

### P1 — Một lần xác nhận cuối cho toàn bộ hồ sơ

**Bằng chứng live:** hồ sơ đủ dữ liệu hiện được duyệt ngay trong lời gọi xử lý, không trả bản nháp để duyệt lại.

**Đề xuất:** tách chuẩn bị/kiểm tra bản nháp khỏi nộp chính thức. Luồng mong muốn: chọn thủ tục → tự nạp dữ liệu → kiểm tra → chỉ bổ sung nếu thiếu → xem tóm tắt → **Xác nhận và nộp** → tự chạy đến kết quả/chuyển cán bộ. Với NVQS, gộp địa chỉ và cam kết vào bản xác nhận cuối. Không thêm các bước xác nhận rời cho từng thao tác nội bộ.

### P1 — Tự cập nhật kết quả sau khi cán bộ xử lý

**Bằng chứng live:** trạng thái DB và audit cập nhật đúng nhưng không có hai sự kiện trạng thái mà frontend đang lắng nghe trong cửa sổ đo.

**Đối chiếu mã:** App đăng ký hai sự kiện, nhưng chưa thấy nơi phát chúng ở các nhánh mutation được kiểm tra. MyPetitions tải khi mount/đổi tài khoản hoặc bấm làm mới; StudentWorkspace chưa có luồng đồng bộ quyết định cán bộ vào công việc đang hiển thị.

**Đề xuất:** phát sự kiện sau khi transaction commit, gửi đúng sinh viên/phòng ban được phép, cập nhật đơn đang mở, danh sách đơn và hàng đợi. Khi reconnect, đồng bộ lại từ backend để bù sự kiện bị lỡ. Nếu chưa dùng được realtime, polling có giới hạn chỉ cho hồ sơ đang chờ xử lý.

### P2 — Lời hiển thị chỉ yêu cầu đúng phần backend xác định

Trong ca Socket vay vốn có câu nhắn rút gọn, backend chỉ thiếu 4 trường vay vốn nhưng lời AI thêm yêu cầu SĐT/cơ sở nhận. Trong ca gửi đúng callback form, AI không thêm hai mục đó, nhưng hướng dẫn quay lại form ban đầu vốn chưa có 4 trường cần bổ sung.

**Đề xuất:** danh sách thiếu và thao tác xử lý render trực tiếp từ kết quả có cấu trúc. AI có thể giải thích ngắn, không được mở rộng danh sách bắt buộc hoặc điều hướng đến một biểu mẫu không giải quyết được phần thiếu.

### P2 — Giảm số lần gọi LLM trong thủ tục đã được chọn

Các mẫu đo đơn lẻ, không phải benchmark tải hay so sánh cùng điều kiện:

| Lời gọi | Tổng thời gian client đo | Thời gian tool nếu có |
|---|---:|---:|
| Đơn chung qua AI/HTTP | 13.855 ms | 108 ms |
| Vay vốn qua AI/Socket, câu nhắn rút gọn | 15.287 ms | 66 ms |
| NVQS qua AI/Socket, callback form | 18.185 ms | 116 ms |
| Vay vốn qua AI/HTTP, callback form | 11.558 ms | 72 ms |
| Bổ sung vay vốn `/resume` | 379 ms | — |
| Xác nhận NVQS `/resume` | 329 ms | — |
| Nợ môn nộp trực tiếp | 255 ms | — |

**Đề xuất:** khi loại thủ tục và payload đã rõ, gọi workflow chuẩn trực tiếp, dùng UI tiến trình và kết quả có cấu trúc. Chỉ gọi LLM khi cần hiểu ngôn ngữ tự do hoặc giải thích trường hợp khó. Giữ nguyên kiểm tra policy và phạm vi tự duyệt.

### Cần kiểm chứng thêm bằng trình duyệt sau khi có công cụ

- F5/đóng mở tab có tiếp tục đúng bản nháp không. Mã hiện tạo `sessionId` mới theo thời gian, trong khi tin nhắn cũ được lưu riêng ở sessionStorage; đây mới là phát hiện từ mã, chưa phải lỗi đã tái hiện trên UI live.
- Bản nháp chưa gửi có giữ lại khi đóng/mở modal, chuyển thủ tục hoặc đổi tab không.
- Đếm click/keystroke thực tế trên desktop và mobile; kiểm tra focus, trạng thái nút sau khi bấm, chống gửi lặp và khả năng sửa đúng trường.
- Giao diện hàng đợi cán bộ, bảng tóm tắt ngoại lệ và việc cập nhật hai màn hình cùng lúc.

## Tiêu chí nghiệm thu cho lần sửa automation

1. Đủ dữ liệu: chọn thủ tục và xác nhận nộp; không bắt gõ lại thông tin đã có.
2. Thiếu dữ liệu: một form chỉ có các trường thực sự thiếu/không hợp lệ, kèm giá trị hiện có để sửa nếu cần.
3. Mọi lần bổ sung/xác nhận giữ nguyên request/draft ID; retry không tạo hồ sơ trùng.
4. Nút xác nhận gửi hành động có cấu trúc, gắn đúng hồ sơ và phiên bản nội dung; thay đổi dữ liệu cần xác nhận lại phần bị ảnh hưởng.
5. Chỉ một lần xác nhận cuối; NVQS gộp cam kết địa chỉ tại đây.
6. Cán bộ duyệt bằng nút; từ chối/yêu cầu bổ sung dùng lựa chọn lý do, chỉ gõ khi có nội dung riêng.
7. Sinh viên và cán bộ thấy trạng thái mới tự động, kể cả sau reconnect.
8. HTTP và Socket dùng chung dữ liệu, validation và workflow; policy, phân quyền và audit tiếp tục đạt các kiểm thử hiện có.

## Hồ sơ QA và dọn dữ liệu sau thử nghiệm

Đã tạo **10 hồ sơ QA**, sau đó dùng chức năng rollback trên **đúng 10 ID có dấu QA** để chuyển sang `CANCELLED`. Audit và bằng chứng trước/sau được giữ lại. Hồ sơ hủy không được `loadApprovalHistory()` tính vào hạn ngạch hiện tại.

Hai hồ sơ có sẵn trước đợt thử, `XNSV-999755` và `XNSV-893877`, vẫn ở trạng thái `WAITING_STUDENT`; harness không gửi mutation cho hai hồ sơ này. Không dùng seed/reset/xóa dữ liệu.

## Bằng chứng và cách chạy lại

- `backend-tests.log`: kết quả 153 ca.
- `frontend-tests.log`: kết quả 19 ca.
- `QA_AUTOMATION_...-inventory.json`: baseline, health và metadata phiên.
- `QA_AUTOMATION_...-probe.json`: chào hỏi và yêu cầu nhanh giấy thuế.
- `QA_AUTOMATION_...-forms.json`: HTTP/Socket, bổ sung vay vốn, nợ môn.
- `QA_AUTOMATION_...-continuations.json`: sai khác mã hồ sơ khi chat, xác nhận NVQS.
- `QA_AUTOMATION_...-staff.json`: quyết định cán bộ và sự kiện trạng thái.
- `QA_AUTOMATION_...-exact-bank-modal.json`: callback form vay vốn local gửi tới API live.
- `QA_AUTOMATION_...-cleanup.json`: 10 kết quả rollback và trạng thái cuối.

Harness: `backend/scripts/qa-automation-audit.mjs`. JWT chỉ giữ trong bộ nhớ, không ghi vào báo cáo.

Từ thư mục backend, chạy lần lượt khi được phép ghi vào demo:

```text
node scripts/qa-automation-audit.mjs inventory
node scripts/qa-automation-audit.mjs probe
node scripts/qa-automation-audit.mjs forms
node scripts/qa-automation-audit.mjs continuations
node scripts/qa-automation-audit.mjs staff
node scripts/qa-automation-audit.mjs exact-bank-modal
node scripts/qa-automation-audit.mjs cleanup
```

`inventory` chỉ đăng nhập và đọc. Các mode còn lại có thể ghi DB demo/call LLM; cần chạy tuần tự và đọc kết quả. `cleanup` chỉ rollback ID đã ghi nhận qua kết quả QA và được kiểm tra dấu QA ở backend; không xóa audit. Lịch sử demo có thể làm thay đổi nhánh hạn ngạch khi chạy lại; đây không phải fixture tách biệt hoàn toàn khỏi dữ liệu nghiệp vụ.

Lượt làm việc này chỉ thêm harness, log và báo cáo; **chưa triển khai thay đổi automation vào mã sản phẩm hoặc deploy**.
