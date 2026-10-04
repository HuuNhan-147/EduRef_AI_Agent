# 03. Quy Trình Bản Chung Kết

> Phạm vi duy nhất: `STUDENT_CONFIRMATION` - Cấp Giấy Xác Nhận Sinh Viên.

## Luồng chính

```text
Sinh viên nhập yêu cầu
        |
        v
Chuẩn hóa mục đích và cơ sở nhận giấy
        |
        +--> Thiếu dữ kiện ------> ASK_CLARIFICATION
        |
        v
Đọc hồ sơ sinh viên
        |
        v
StudentConfirmationDecisionService
        |
        +--> Vi phạm policy -----> REJECTED_POLICY
        +--> Ngoài danh mục ------> ESCALATE_TO_STAFF
        +--> Vượt thẩm quyền -----> ESCALATE_TO_STAFF
        +--> Đủ điều kiện --------> AUTO_APPROVED
        |
        v
Audit log SHA-256 + mã hồ sơ/QR nếu được duyệt
```

## Điểm con người

- Sinh viên chịu trách nhiệm cung cấp mục đích và cơ sở nhận giấy.
- AI chỉ tự động xử lý ca thường quy đã được policy cho phép.
- Cán bộ là người quyết định các ca ngoài policy hoặc vượt thẩm quyền.
- Rollback tạo một audit event mới, không sửa lịch sử cũ.

## Verify Harness

`POST /api/agent/verify-90s` gọi trực tiếp policy/workflow backend, không phụ thuộc việc LLM có sinh đúng câu trả lời hay không. UI hiển thị 5 ca, expected/actual decision, thời gian và bằng chứng audit trong cùng một màn hình.
