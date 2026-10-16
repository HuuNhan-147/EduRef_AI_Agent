# Hướng dẫn xác minh và gán nhãn Sprint 2

`TAP_KIEM_THU_100_INPUT_THUC_TE.md` được xem là **nguồn ứng viên chờ xác minh**. Chưa rõ người gán nhãn độc lập, thời điểm, snapshot và nguồn feedback gốc; không nâng thành tập độc lập chỉ vì tên tệp có “thực tế”. [JSON ứng viên](SPRINT2_100_CASES_CANDIDATE.json) giữ 100 hàng và nguồn gốc, origin INTERNAL, các trường chưa biết null. Không dùng kết quả Verify hoặc fixture unit test để điền các khoảng trống này.

## Bổ sung từ bằng chứng thật

1. Xác định ai thu thập dữ liệu, ai viết policy, ai gán nhãn, ai kiểm duyệt. Ghi ID nhất quán với tài khoản/biên bản và nguồn gốc; người gán nhãn không viết policy hoặc threshold đang đo. Không tự điền tên cán bộ khi chưa có xác nhận.
2. Giữ bản nguồn bất biến, tính SHA-256 của đúng tệp nguồn, tạo version mới. Nêu rõ mẫu lấy từ đâu, tiêu chí chọn/loại và khoảng thời gian. Chia calibration/holdout trước khi xem kết quả; không chọn ca để đạt tỷ lệ mong muốn.
3. Chốt một decision/classification cho từng ca bằng phân xử độc lập. TC-077 và TC-100 đang có nhiều kỳ vọng; cần đọc tình huống cụ thể và chốt nhãn bằng người có thẩm quyền. Không tự chọn phương án thuận lợi cho AI.
4. Bổ sung snapshot tại thời điểm ca xảy ra: sinh viên, trạng thái/học vụ, input, chứng từ, lịch sử cấp cùng mẫu và mốc tham chiếu. Với ca nhiều lượt, lưu nội dung liên quan và xác nhận địa chỉ thật; không giả consent. Dữ kiện chưa biết là null. `historyRequests: []` chỉ khi nguồn xác nhận không có lịch sử liên quan; không dùng mảng rỗng để che quota.
5. Nhãn phải có `labeledBy`, `labeledAt` ISO, `sourceRef` tới phản hồi/biên bản. Đối chiếu nguyên bản được phép truy cập; không đưa thông tin cá nhân không cần thiết vào repository công khai. Nếu khử định danh, thực hiện nhất quán và lưu nguồn đối chiếu theo quyền của nhóm.

Các ca đầu bảng về chào hỏi/hướng dẫn điều hướng không mặc nhiên là hồ sơ routine AUTO_APPROVED. Chỉ đưa ca thuộc đường quyết định `STUDENT_CONFIRMATION` vào bộ đo này; nêu tiêu chí loại và tổng số còn lại. Đánh giá chat/navigation cần protocol khác. Không tạo student/snapshot giả để ép các ca đó vào denominator.

## Cấu trúc một ca

Đây là khung cần điền bằng chứng, **không phải ca hợp lệ để công bố**. Các null/placeholder phải được xử lý bằng nguồn thật; dữ kiện nghiệp vụ chưa biết vẫn giữ null và gán nhãn tương ứng.

```json
{
  "id": "ID_FROM_SOURCE",
  "split": null,
  "expectedDecision": null,
  "expectedClassification": null,
  "label": { "labeledBy": null, "labeledAt": null, "sourceRef": null },
  "snapshot": {
    "student": {
      "studentCode": null, "fullName": null, "status": null,
      "admissionYear": null, "enrolledCredits": null, "hasSchedule": null
    },
    "inputData": {},
    "documents": [],
    "historyRequests": [],
    "referenceDate": null,
    "dataSource": "PENDING_SOURCE_VERIFICATION"
  }
}
```

Dataset cần `name`, `version`, `sourceRef`, `sourceSha256`, `origin`, `referenceDate`, `policyAuthorIds`, `independenceDeclaration`, `cases`. API dùng ngày tham chiếu dataset chung cho replay holdout; chọn các snapshot phù hợp mốc đó, không đổi ngày để tránh quy định học kỳ/hạn đào tạo. Calibration feedback dùng thời điểm gốc riêng của snapshot.

Mỗi history record gồm `createdAt`, `status` APPROVED/COMPLETED/ESCALATED và `inputData.formCode`; thêm dữ kiện gốc có liên quan. Documents dùng cấu trúc metadata của workflow thật. Student snapshot cần cả trường nhân thân mà handler yêu cầu, không chỉ các khóa trong khung. Nguồn unknown không được thay bằng registry mẫu để pass.

Nhãn nhất quán: AUTO_APPROVED/ROUTINE; ASK_CLARIFICATION/UNKNOWN_FACT; REJECTED_POLICY/ROUTINE_POLICY_DENY; ESCALATE_TO_STAFF với OUTSIDE_POLICY, BEYOND_AUTHORITY hoặc UNKNOWN_FACT. Chọn HOLDOUT hoặc CALIBRATION; holdout không trùng calibration, ít nhất 30 ca, 5 routine/5 cần chuyển và đủ năm classification. Nếu bảng 100 ca sau xác minh không đáp ứng, phải thu thêm dữ liệu độc lập; không “hoàn thiện” bằng dữ liệu bịa.

STAFF nhập DRAFT, xem danh sách lỗi; DEAN/ADMIN khác người nhập kiểm tra nguồn rồi freeze. Giữ rates null/PARTIAL tới khi đủ điều kiện. Các kiểm tra kỹ thuật không thay thế xác minh độc lập của con người. Xem [runbook](../../EDUREF_AI/docs/SPRINT2_FEEDBACK_RUNBOOK.md) và [công thức đo](../../EDUREF_AI/docs/15_MEASUREMENT_PLAN.md).
