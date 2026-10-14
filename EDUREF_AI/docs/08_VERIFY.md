# Verify Harness

## Route đang hoạt động

- `POST /api/agent/verify-90s`: bộ Track A năm ca, mục tiêu 3 phê duyệt thường quy và 2 chuyển cán bộ. Ghi hồ sơ/audit vào DB demo, không cần Gemini sinh câu trả lời.
- `POST /api/agent/verify-custom`: chạy ca cấu trúc tùy chỉnh.
- `POST /api/agent/verify-custom-prompt`: bóc tách prompt và kiểm tra policy/workflow. Sinh viên chỉ được nhắm hồ sơ của mình hoặc benchmark được cho phép.

General Verify bốn ca trong đặc tả cũ chưa có route runtime. Không đưa nó vào kịch bản demo.

## Kết quả cần kiểm tra

Mỗi ca có kỳ vọng và quyết định thực tế, thời gian xử lý, trạng thái PASS/FAIL và bằng chứng audit khi ghi quyết định. Ca chuyển cán bộ phải có câu hỏi hành động. Phân bố 3/2 là yêu cầu fixture, không phải tỷ lệ chất lượng mô hình trên dữ liệu thực.

Dữ kiện benchmark được nạp từ registry/fixture. Hồ sơ ACTIVE tùy biến thiếu TKB/tín chỉ không tự động trở thành ca hợp lệ. Verify có ghi DB nên chạy trên môi trường demo chủ đích; các bộ test cô lập không thay thế Verify trực tiếp.

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

Hai tỷ lệ `missedEscalationRate` và `falseEscalationRate` chưa được đo trên tập độc lập có nhãn; API trả `null`, `measurementStatus: PARTIAL`. Xem [kế hoạch đo](15_MEASUREMENT_PLAN.md), [API](09_API.md) và [runbook](../RUNBOOK.md).
