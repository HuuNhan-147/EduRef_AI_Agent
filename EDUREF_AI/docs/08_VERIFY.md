# Verify Harness — VNG Track A

Verify là đường kiểm chứng độc lập, gọi thẳng policy/workflow backend và không phụ thuộc câu trả lời sinh văn bản của LLM. Màn hình không hiển thị kết quả thực tế, tỷ lệ đạt hay bằng chứng SHA-256 trước khi chạy.

## Hai chế độ bắt buộc

### General Verify — 4 ca

Endpoint: `POST /api/agent/verify-general`

| Ca | Nhóm | Kỳ vọng |
|---|---|---|
| G-01 | Routine | `AUTO_APPROVED` |
| G-02 | Unknown fact | `ASK_CLARIFICATION` |
| G-03 | Explicit policy deny | `REJECTED_POLICY` |
| G-04 | Beyond authority | `ESCALATE_TO_STAFF` |

### Track A Escalation Verify — 5 ca

Endpoint: `POST /api/agent/verify-90s`

Bộ này luôn có đúng 5 ca trên cùng thủ tục `STUDENT_CONFIRMATION`: đúng 3 ca thường quy tự hoàn tất và đúng 2 ca chuyển tiếp.

| Ca | Nhóm | Kỳ vọng |
|---|---|---|
| A-01 | Routine — vé xe buýt | `AUTO_APPROVED` |
| A-02 | Routine — học bổng | `AUTO_APPROVED` |
| A-03 | Routine — vay vốn | `AUTO_APPROVED` |
| A-04 | Outside policy | `ESCALATE_TO_STAFF` |
| A-05 | Beyond authority | `ESCALATE_TO_STAFF` |

Mỗi ca chuyển tiếp phải có `actionableQuestion`. Toàn bộ ca trả `startedAt`, `completedAt`, `durationMs`, quyết định kỳ vọng/thực tế và PASS/FAIL. `distributionPassed` chỉ đúng khi phân bố thực tế là 3 AUTO + 2 ESCALATE.

## Ca mới do giám khảo nhập

Endpoint: `POST /api/agent/verify-custom-prompt`

```json
{
  "prompt": "Em cần giấy xác nhận sinh viên để bảo lãnh hợp đồng thuê nhà"
}
```

Prompt được bóc tách thành input có cấu trúc rồi chạy qua cùng `StudentConfirmationDecisionService` và `PetitionWorkflowCore`; không có nhánh demo riêng.

## Chạy kiểm tra tại máy

```bash
cd backend
npm test
npx prisma validate

cd ../frontend
npm run build
```

Unit test kiểm tra bộ 15 ca, phân bố Track A 3/2 và yêu cầu câu hỏi hành động cho mọi ca ngoài policy/vượt thẩm quyền.

## Quy tắc báo cáo số liệu

Không công bố `missedEscalationRate` hoặc `falseEscalationRate` khi chưa chạy trên tập độc lập có nhãn. API metrics trả `null` cho hai trường này cùng `measurementStatus: PARTIAL`, thay vì dùng số điền sẵn.
