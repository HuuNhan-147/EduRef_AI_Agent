# Verify Harness

## Route đang hoạt động

- `POST /api/agent/verify-general`: bốn ca chung ROUTINE / ASK / REJECT / ESCALATE, một lần bấm **Verify chung · 4 ca**.
- `POST /api/agent/verify-90s`: bộ Track A năm ca, mục tiêu 3 phê duyệt thường quy và 2 chuyển cán bộ. Ghi hồ sơ/audit vào DB demo, không cần Gemini sinh câu trả lời.
- `POST /api/agent/verify-custom`: chạy ca cấu trúc tùy chỉnh.
- `POST /api/agent/verify-custom-prompt`: bóc tách prompt và kiểm tra policy/workflow. Sinh viên chỉ được nhắm hồ sơ của mình hoặc benchmark được cho phép.

Hai bộ chạy từ tab Verify Đề A. Đây là hành vi trên nhánh fix local; cần triển khai bản đã duyệt trước khi dùng nút mới trên URL công khai.

## Kết quả cần kiểm tra

Mỗi ca có kỳ vọng và quyết định thực tế, thời gian xử lý, trạng thái PASS/FAIL và bằng chứng audit. PASS yêu cầu đúng quyết định **và phân loại**, trạng thái hồ sơ đã lưu, mã lần chạy, hash audit và câu hỏi cụ thể ở ca cần hỏi/chuyển tiếp. Phân bố 3/2 là yêu cầu fixture, không phải tỷ lệ chất lượng mô hình trên dữ liệu thực.

Dữ kiện benchmark được nạp từ registry/fixture. API trả `dataSource: SYNTHETIC_BENCHMARK`; hồ sơ có `verificationRunId` và `verificationCaseId`, không tính vào hạn mức hồ sơ thường. Kịch bản định sẵn dùng ngữ cảnh fixture do server tạo; client không được khai hạn mức. Ca mới dùng lịch sử nghiệp vụ hiện tại và các trường SĐT/cơ sở gửi rõ từ UI, không được backend điền ngầm. Hồ sơ ACTIVE tùy biến thiếu TKB/tín chỉ không tự động trở thành ca hợp lệ. Verify có ghi DB nên chạy trên môi trường demo chủ đích; cần migration mới trước khi chạy bản fix.

Verify gọi Core trực tiếp và không gọi LLM. Để chứng minh agent thực thi với Gemini thật, dùng [kịch bản demo](JUDGE_DEMO.md) và đối chiếu mã hồ sơ/audit.

## Kiểm tra code không dùng DB thật

```powershell
cd EDUREF_AI/backend
npm test
npm run test:security:mutation
cd ../frontend
npm run lint
npm test
npm run build
```

Test 15 ca policy và test phân bố Track A dùng fixture trong bộ nhớ. Harness lấy cảm hứng từ 100 tình huống chạy mười nhóm ví dụ, không phải 100 bản ghi độc lập. Báo cáo mutation tại [SECURITY_MUTATION_RESULTS.json](SECURITY_MUTATION_RESULTS.json) chỉ phản ánh catalogue chủ đích.

Hai tỷ lệ `missedEscalationRate` và `falseEscalationRate` chưa được đo trên tập độc lập có nhãn; API trả `null`, `measurementStatus: PARTIAL`. Xem [kế hoạch đo](15_MEASUREMENT_PLAN.md), [API](09_API.md) và [runbook](../../RUNBOOK.md).

Sprint 2 có kiểm thử `sprint2-governance.test.js`, `sprint2-http.test.js` và frontend `sprint2-feedback.test.js` cho runtime threshold, nguồn snapshot, chốt phê duyệt và PARTIAL. Dữ liệu unit test là tổng hợp, không phải xác nhận cán bộ đã thử nghiệm độc lập. Tab Sprint 2 hỗ trợ nhập bảng 100 ca như DRAFT, nhưng chưa đủ provenance để freeze/công bố; xem [quy trình bổ sung bằng chứng](SPRINT2_FEEDBACK_RUNBOOK.md).
