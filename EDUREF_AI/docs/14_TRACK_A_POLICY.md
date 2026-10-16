# Policy thực thi — Giấy xác nhận sinh viên

Phiên bản runtime: `HUTECH_CTSV_5FORMS_V2.0.0`. Đây là mô tả code hiện tại, không phải văn bản quy chế được nhà trường xác nhận. Nguồn thực thi: [StudentConfirmationDecisionService](../backend/services/StudentConfirmationDecisionService.js), [handler](../backend/modules/petition-core/handlers/StudentConfirmationHandler.js) và [Core](../backend/modules/petition-core/PetitionWorkflowCore.js).

## Phạm vi và dữ kiện

Workflow `STUDENT_CONFIRMATION` có năm mẫu: `TAX_DEDUCTION`, `BANK_LOAN`, `MILITARY_DEFERMENT`, `COURSE_DEBT`, `GENERAL_CONFIRMATION`. Form, chat và công cụ xử lý nhanh dùng chung Core/handler. Handler kiểm tra `requiredFields` của danh mục sau các kiểm tra định dạng; trường số vay vốn nhận giá trị 0, từ chối số âm/không hợp lệ.

Danh tính/quyền lấy từ phiên đã xác thực. Trạng thái sinh viên và lịch sử cấp giấy lấy từ DB; ngày nộp/hạn mức do máy chủ tính. TKB/tín chỉ và một phần nhân thân còn dùng registry benchmark, chưa có nguồn DB học vụ đầy đủ cho hồ sơ tùy biến. Không dùng dữ kiện client để tự xác nhận học lực hoặc hạn mức.

Handler yêu cầu họ tên, MSSV, ngày sinh, giới tính, lớp, CCCD, số điện thoại, cơ sở nhận và mục đích. Địa chỉ được kiểm tra chặt cho NVQS/thuế; mẫu nợ môn cần danh sách học phần. Cơ quan tiếp nhận và các trường riêng được kiểm tra theo metadata. NVQS có bước xác nhận địa chỉ gắn đúng địa chỉ đang chờ; câu có chữ “xác nhận” ở lịch sử hoặc boolean do LLM tự đưa không phải đồng ý của người dùng. Đổi địa chỉ phải xác nhận lại. Hồ sơ ngoài registry có trường chưa biết ở null, không dùng nhân thân giả.

## Thứ tự và quyết định

| Điều kiện | Hành vi hiện tại |
|---|---|
| Thôi học `DROPPED` / bảo lưu `SUSPENDED` | Core submit/resume từ chối trước khi hỏi dữ kiện thiếu |
| Thiếu dữ kiện hoặc lệch mẫu | `ASK_CLARIFICATION`, hồ sơ `WAITING_STUDENT` |
| Cả TKB và tín chỉ học kỳ chưa biết | `ASK_CLARIFICATION` / `UNKNOWN_FACT`; không suy thành không có TKB hoặc tự đủ điều kiện |
| Không có TKB/tín chỉ kỳ hiện tại, không có lý do cần gấp | `REJECTED_POLICY` |
| Không có TKB nhưng cần gấp | `BEYOND_AUTHORITY`, chuyển cán bộ |
| Quá hạn đào tạo chuẩn, còn nợ môn, đang dùng mẫu khác | Hỏi làm rõ/chuyển sang `COURSE_DEBT` |
| Quá hạn và đủ khối lượng tốt nghiệp | Chuyển cán bộ, AI không tự quyết định |
| Cấp lại cùng mẫu trong kỳ, chưa có lý do | Hỏi lý do |
| Cấp lại có lý do / mục đích ngoài policy | Chuyển cán bộ |
| Yêu cầu vượt quyền hoặc bỏ quy định | Chuyển cán bộ |
| Đủ điều kiện thường quy | `AUTO_APPROVED`, trạng thái DB `APPROVED` |

Policy dùng quy ước đào tạo bốn năm và mốc 150 tín chỉ trong code; cần cấu hình theo chương trình khi dùng thực tế. Hạn mức hiện xét lịch sử cùng mẫu trong cửa sổ học kỳ do code tính. Nợ học phí không phải ngưỡng chặn cấp giấy trong policy xác nhận hiện tại.

Submit/resume đọc lại lịch sử dưới cùng transaction với quyết định và audit, có PostgreSQL advisory lock dùng chung để tránh cấp trùng khi nhiều tiến trình. Khóa hiện bao phủ toàn workflow/audit nên tuần tự hóa các quyết định; cần đo tải trước khi mở rộng. Kiểm thử fixture xác nhận logic đồng thời trong một tiến trình; khóa liên tiến trình cần kiểm chứng thêm trên PostgreSQL disposable. Hồ sơ Verify có dấu lần chạy bị loại khỏi hạn mức thường. Hồ sơ đã ESCALATED hoặc kết thúc không được sinh viên đưa lại vào đường tự động duyệt.

## Cán bộ, bản cứng và kiểm toán

### Threshold runtime từ feedback (bản vá 16/10/2026)

Sau khi hard guards cho AUTO_APPROVED, Core đọc threshold ACTIVE có version và scorer từ DB. Điểm bằng chứng mục đích thấp hơn ngưỡng sẽ chuyển STAFF, ghi điểm/tín hiệu/version/câu hỏi vào hồ sơ và audit. Điểm từ khóa là heuristic, không phải confidence LLM. Baseline ngưỡng 0 giữ hành vi hiện tại; không nới ASK, REJECT hoặc ESCALATE thành AUTO. ACTIVE sai scorer sẽ dừng giao dịch, không tự fallback.

Feedback gắn snapshot tại quyết định gốc, không tái dựng bằng sinh viên hoặc lịch sử đã thay đổi. Hiệu chỉnh chỉ tạo DRAFT. Kích hoạt cần người duyệt khác người đề xuất, báo cáo trước/sau đủ điều kiện trên holdout độc lập đã khóa, khớp code/hash, missed không tăng và còn routine auto. Trọng số hiệu chỉnh 10/1 đang là đề xuất kỹ thuật chờ nhóm nghiệp vụ review. Chưa có threshold được phê duyệt thực tế hoặc phép đo độc lập từ bảng 100 ca; rates giữ null/PARTIAL. Xem [runbook Sprint 2](SPRINT2_FEEDBACK_RUNBOOK.md).

Cán bộ chỉ quyết định hồ sơ `ESCALATED`; CAS trong transaction ngăn quyết định lặp. Hai endpoint cán bộ dùng chung `AcademicWorkflowService.staffDecision`, lưu reviewerNote/reviewedBy/reviewedAt và hash. Rollback lưu lý do hoàn tác, trạng thái `CANCELLED`.

Hồ sơ hiện nhận giấy bản cứng; luồng chính không tạo QR mới. Code chọn Sài Gòn A-01.01 hoặc Thủ Đức E1-01.05; thông tin phòng/lịch hẹn cần CTSV xác nhận trước vận hành thật. Không suy hiệu lực pháp lý hoặc thời hạn giấy từ mô tả demo.

Tham khảo [API](09_API.md), [bảo mật và kiểm chứng](11_SECURITY.md), [kế hoạch đo lường](15_MEASUREMENT_PLAN.md).
