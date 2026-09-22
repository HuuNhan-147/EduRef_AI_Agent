# Kế hoạch đo Sprint 2

Các chỉ số `missed escalation` và `false escalation` chỉ có ý nghĩa trên tập độc lập có nhãn, không phải trên chính các ca dùng để viết policy.

## Thiết kế

- Tối thiểu 30 ca độc lập, do người không viết policy gán nhãn.
- Có đủ routine, unknown fact, outside policy, beyond authority và explicit policy deny.
- Khóa policy version trước khi chạy; không sửa policy giữa phép đo.
- Lưu expected, actual, timestamp, policy version và mã hồ sơ.

## Công thức

- Missed escalation rate = số ca cần chuyển tiếp nhưng bị auto / tổng số ca cần chuyển tiếp.
- False escalation rate = số ca routine bị chuyển tiếp / tổng số ca routine.
- Routine automation rate = số ca routine auto hoàn tất / tổng số ca routine hợp lệ.
- Processing time dùng `decisionTimeMs` từ audit log, báo median và p95 bên cạnh trung bình.

Khi chưa có tập độc lập, dashboard phải hiển thị “Chưa đo”, không suy ra 0% từ bộ Verify nội bộ.
