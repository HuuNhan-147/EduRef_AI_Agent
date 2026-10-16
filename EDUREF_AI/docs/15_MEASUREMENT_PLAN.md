# Phép đo Sprint 2 — protocol V2

Ngày rà soát: 16/10/2026. Bảng [100 ca trong repository](../../docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md) mới là nguồn cần xác minh: chưa có snapshot, người gán nhãn và nhãn duy nhất đầy đủ. Bản nhập [candidate JSON](../../docs/datasets/SPRINT2_100_CASES_CANDIDATE.json) giữ `origin: INTERNAL`; chưa đủ điều kiện công bố tỷ lệ. Verify 5 ca, fixture 15 ca và fixture unit test không phải bằng chứng độc lập.

## Điều kiện được công bố

- Nguồn `INDEPENDENT`, đường dẫn và SHA-256 nguồn, bản xác nhận độc lập, danh sách người viết policy/threshold. Người gán nhãn khác người viết policy và người đề xuất threshold; phải có ID, thời điểm và bằng chứng nguồn của từng nhãn.
- Ít nhất 30 ca `HOLDOUT`, ít nhất 5 routine và 5 cần chuyển tiếp; bao phủ ROUTINE, UNKNOWN_FACT, OUTSIDE_POLICY, BEYOND_AUTHORITY, ROUTINE_POLICY_DENY. Đây là mức tối thiểu của protocol triển khai, không tự khẳng định là ngưỡng chính thức của brief hoặc đủ để chứng minh tỷ lệ lỗi rất nhỏ.
- Mỗi ca có một decision/classification nhất quán, snapshot đầy đủ của sinh viên, input, chứng từ, lịch sử hồ sơ liên quan. Dữ kiện chưa biết phải ghi null; không suy diễn hoặc bổ sung dữ kiện để tạo kết quả mong muốn. Lưu trạng thái học vụ, admissionYear và enrolledCredits rõ ràng.
- Tách calibration khỏi holdout trước khi xem kết quả. Chặn snapshot trùng và trùng fingerprint với calibration của cả policy trước/sau. Không dùng hồ sơ Verify.
- DEAN/ADMIN khác người nhập kiểm tra nguồn rồi khóa dataset `FROZEN`. Hash các ca được kiểm tra lại khi replay, kích hoạt và hiển thị tỷ lệ.
- Mỗi holdout chỉ phục vụ một cặp policy trước/sau và code hash. Chạy lại đúng cặp/dữ liệu/code được phép; đổi cặp, đổi dữ liệu hoặc code sau khi đã lộ kết quả phải dùng holdout mới. Chẩn đoán PARTIAL có các hàng kết quả cũng được tính là đã lộ holdout.

Việc khai `INDEPENDENT` và kiểm tra ID chỉ là chốt kỹ thuật; người kiểm duyệt phải xác minh chứng từ gốc, danh tính, quan hệ giữa người gán nhãn và người viết policy. Sao chép ca sang dataset khác, dùng bí danh hoặc sửa câu chữ không làm dữ liệu trở nên độc lập. Không khai thông tin này khi nhóm chưa xác nhận.

## Công thức thực thi

Các tỷ lệ có đơn vị phần trăm; trả cả tử số/mẫu số, khoảng Wilson 95% cho missed/false và delta sau trừ trước theo điểm phần trăm.

| Chỉ số | Tử số | Mẫu số |
|---|---|---|
| Missed escalation | Ca nhãn cần chuyển tiếp nhưng actual không chuyển tiếp, gồm AUTO, ASK, REJECT hoặc ERROR | Ca nhãn cần chuyển tiếp |
| Unsafe auto approval | Ca nhãn cần chuyển tiếp nhưng actual AUTO_APPROVED | Ca nhãn cần chuyển tiếp |
| False escalation | Ca nhãn AUTO_APPROVED nhưng actual chuyển tiếp | Ca nhãn AUTO_APPROVED |
| Routine automation | Ca nhãn AUTO_APPROVED và actual AUTO_APPROVED | Ca nhãn AUTO_APPROVED |

Missed V2 đo toàn bộ việc không chuyển tiếp khi cần. Định nghĩa cũ chỉ đếm duyệt nhầm nay được tách thành `unsafeAutoApprovalRate`; không so sánh hai định nghĩa như cùng một chỉ số. ASK/REJECT trên ca routine không tính false escalation nhưng làm giảm routine automation; không được giấu phần giảm này khi chấp thuận trade-off. `exactMatches` kiểm tra cả decision và classification.

Không đủ nguồn/nhãn/denominator, hash sai, nhiễm calibration, code khác hoặc bất kỳ replay nào lỗi: hai tỷ lệ là `null`, trạng thái `PARTIAL`, UI “Chưa đo”. Các số đếm chẩn đoán không được dùng để suy ra tỷ lệ chính thức.

## Phạm vi replay và báo cáo

`ESCALATION_EVALUATION_V2` / `WORKFLOW_SNAPSHOT_REPLAY_V1` chạy handler requirements, hard policy và threshold thật trên cùng snapshot, lịch sử và ngày tham chiếu cố định. Không ghi hồ sơ nghiệp vụ, không gọi LLM, không đọc memory hội thoại đang sống. Lưu policy/scorer/protocol/replay versions, runtime code hash, dataset/source hash, hash report và từng kết quả trước/sau.

Đây là phép đo đường quyết định sau khi có input chuẩn hóa, chưa đánh giá khả năng LLM trích xuất ý định, OCR hay chất lượng hội thoại end-to-end. Cần bộ đo riêng cho các tầng đó. Mean `decisionTimeMs` trên audit vận hành không phải latency replay hoặc latency LLM; cần median/p95 khi đánh giá tốc độ.

Dashboard chỉ dùng báo cáo đủ điều kiện khớp code và threshold hiện hành. Số APPROVED / tổng hồ sơ được đổi tên thành `operationalApprovalShare` vì bao gồm cán bộ duyệt; loại Verify khỏi thống kê vận hành. Xem [runbook](SPRINT2_FEEDBACK_RUNBOOK.md) và [hướng dẫn nhãn](../../docs/datasets/SPRINT2_ANNOTATION_GUIDE.md).
