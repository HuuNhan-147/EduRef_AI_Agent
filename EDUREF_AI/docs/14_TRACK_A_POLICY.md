# Policy thực thi — Giấy xác nhận sinh viên

Phiên bản runtime: `HUTECH_CTSV_5FORMS_V2.0.0`. Đây là mô tả code hiện tại, không phải văn bản quy chế được nhà trường xác nhận. Nguồn thực thi: [StudentConfirmationDecisionService](../backend/services/StudentConfirmationDecisionService.js), [handler](../backend/modules/petition-core/handlers/StudentConfirmationHandler.js) và [Core](../backend/modules/petition-core/PetitionWorkflowCore.js).

## Phạm vi và dữ kiện

Workflow `STUDENT_CONFIRMATION` có năm mẫu: `TAX_DEDUCTION`, `BANK_LOAN`, `MILITARY_DEFERMENT`, `COURSE_DEBT`, `GENERAL_CONFIRMATION`. Metadata `requiredFields` của danh mục chưa dẫn dắt một validator chung cho mọi đường vào; validator thực tế ở handler và fast path.

Danh tính/quyền lấy từ phiên đã xác thực. Trạng thái sinh viên và lịch sử cấp giấy lấy từ DB; ngày nộp/hạn mức do máy chủ tính. TKB/tín chỉ và một phần nhân thân còn dùng registry benchmark, chưa có nguồn DB học vụ đầy đủ cho hồ sơ tùy biến. Không dùng dữ kiện client để tự xác nhận học lực hoặc hạn mức.

Handler yêu cầu họ tên, MSSV, ngày sinh, giới tính, lớp, CCCD, số điện thoại, cơ sở nhận và mục đích. Địa chỉ được kiểm tra chặt cho NVQS/thuế; mẫu nợ môn cần danh sách học phần. NVQS có bước xác nhận địa chỉ. Cơ quan tiếp nhận có trong metadata/UI nhưng chưa được kiểm tra bắt buộc thống nhất ở mọi đường vào.

## Thứ tự và quyết định

| Điều kiện | Hành vi hiện tại |
|---|---|
| Thôi học `DROPPED` / bảo lưu `SUSPENDED` | Core submit/resume từ chối trước khi hỏi dữ kiện thiếu |
| Thiếu dữ kiện hoặc lệch mẫu | `ASK_CLARIFICATION`, hồ sơ `WAITING_STUDENT` |
| Không có TKB/tín chỉ kỳ hiện tại, không có lý do cần gấp | `REJECTED_POLICY` |
| Không có TKB nhưng cần gấp | `BEYOND_AUTHORITY`, chuyển cán bộ |
| Quá hạn đào tạo chuẩn, còn nợ môn, đang dùng mẫu khác | Hỏi làm rõ/chuyển sang `COURSE_DEBT` |
| Quá hạn và đủ khối lượng tốt nghiệp | Chuyển cán bộ, AI không tự quyết định |
| Cấp lại cùng mẫu trong kỳ, chưa có lý do | Hỏi lý do |
| Cấp lại có lý do / mục đích ngoài policy | Chuyển cán bộ |
| Yêu cầu vượt quyền hoặc bỏ quy định | Chuyển cán bộ |
| Đủ điều kiện thường quy | `AUTO_APPROVED`, trạng thái DB `APPROVED` |

Policy dùng quy ước đào tạo bốn năm và mốc 150 tín chỉ trong code; cần cấu hình theo chương trình khi dùng thực tế. Hạn mức hiện xét lịch sử cùng mẫu trong cửa sổ học kỳ do code tính. Nợ học phí không phải ngưỡng chặn cấp giấy trong policy xác nhận hiện tại.

## Cán bộ, bản cứng và kiểm toán

Cán bộ chỉ quyết định hồ sơ `ESCALATED`; CAS trong transaction ngăn quyết định lặp. Hai endpoint cán bộ dùng chung `AcademicWorkflowService.staffDecision`, lưu reviewerNote/reviewedBy/reviewedAt và hash. Rollback lưu lý do hoàn tác, trạng thái `CANCELLED`.

Hồ sơ hiện nhận giấy bản cứng; luồng chính không tạo QR mới. Code chọn Sài Gòn A-01.01 hoặc Thủ Đức E1-01.05; thông tin phòng/lịch hẹn cần CTSV xác nhận trước vận hành thật. Không suy hiệu lực pháp lý hoặc thời hạn giấy từ mô tả demo.

Tham khảo [API](09_API.md), [bảo mật và kiểm chứng](11_SECURITY.md), [kế hoạch đo lường](15_MEASUREMENT_PLAN.md).
