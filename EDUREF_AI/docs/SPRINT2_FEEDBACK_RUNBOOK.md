# Sprint 2: feedback, threshold và đánh giá độc lập

Trạng thái 16/10/2026 trên `fix/track-vng-compliance`: đã có luồng runtime và UI, chưa kích hoạt threshold nghiệp vụ hoặc công bố hai tỷ lệ. Chưa migrate DB chung, push, merge hay deploy. Không có xác nhận rằng nhóm nghiệp vụ đã chấp thuận quy trình/heuristic dưới đây; bản triển khai cung cấp các bước để nhóm review và ghi sự chấp thuận thật.

## 1. Cài đặt trên môi trường đã được nhóm chọn

Review/sao lưu DB trước khi triển khai. Từ `EDUREF_AI/backend`, dùng các lệnh hiện có:

```powershell
npm ci
npm run db:generate
npm run db:status
npm run db:deploy
npm test
```

Migration `20261016000200_sprint2_feedback_threshold` thêm `thresholdAssessment`, `evaluationSnapshot` vào StudentRequest và bốn bảng policy/feedback/dataset/report. Unique partial index chỉ cho một ACTIVE policy; constraint chặn threshold ngoài 0–100 và trạng thái lạ. Migration trước đó `20261016000100_track_a_compliance` thêm tám trường nhân thân Student và hai cột Verify/index StudentRequest. Chạy theo thứ tự migration hiện có; không dùng `db push` trên DB chung. Backend/frontend phải cùng phiên bản. Các lệnh trên là hướng dẫn triển khai, chưa được chạy lên DB chung trong phiên sửa mã này. Xem [runbook chung](../../RUNBOOK.md) để kiểm tra cả hai migration.

Prisma schema đã validate và client đã generate thành công sang thư mục kiểm tra cô lập. Generate mặc định trên máy hiện tại gặp EPERM do DLL engine đang được tiến trình khác giữ; dừng/restart đúng backend của nhóm rồi generate lại khi triển khai. Không tự dừng tiến trình đang dùng của người khác. Chưa có PostgreSQL disposable để kiểm chứng migration/advisory lock liên tiến trình; kiểm thử local sử dụng DB fixture.

## 2. Chốt nghiệp vụ cần thống nhất trước kích hoạt

Nhóm nghiệp vụ xác nhận phạm vi năm mẫu, cách phân loại ca khó, quy tắc nhãn, cách lấy nguồn, mức missed/false chấp nhận và trách nhiệm người đề xuất/người duyệt. Ghi biên bản gốc hoặc đường dẫn trong feedback và ghi chú phê duyệt; không viết biên bản giả để vượt chốt.

Scorer `PURPOSE_EVIDENCE_V1` là điểm bằng chứng từ khóa, **không phải xác suất hoặc confidence của LLM**: mục đích rõ 95, từ khóa rộng 55, chỉ ngữ cảnh mẫu 35; nhiều nhóm mục đích trừ 20, dấu phủ định đã định nghĩa trừ 30. Chi tiết có trong `EscalationThreshold.js`. Cần rà soát từ khóa và sai lệch ngôn ngữ với cán bộ trước vận hành thật.

Hiệu chỉnh thử các ngưỡng ở ranh giới điểm quan sát, tối ưu `10 × missed + falseEscalation`, hòa điểm chọn ngưỡng thấp hơn. Trọng số 10/1 là **đề xuất kỹ thuật đang chờ chấp thuận nghiệp vụ**; curve và số feedback bị loại được lưu, hiển thị để review. Đổi scorer/trọng số cần phiên bản code mới và holdout mới; không chỉnh trực tiếp DB.

Baseline `THRESHOLD_BASELINE_V1` có ngưỡng 0, giữ hành vi hard policy hiện tại. Threshold chỉ tác động ca đã qua mọi chốt và sắp AUTO_APPROVED: điểm thấp hơn ngưỡng sẽ chuyển STAFF với lý do/câu hỏi cụ thể. Không biến ASK, REJECT hoặc ESCALATE thành AUTO. Phiên bản/điểm được lưu cùng hồ sơ và audit. Threshold ACTIVE sai scorer sẽ dừng giao dịch, không tự hạ ngưỡng về baseline.

## 3. Thu feedback gốc và đề xuất

1. STAFF xử lý hồ sơ nghiệp vụ mới có snapshot tại quyết định. Mở chi tiết hồ sơ chuyển tiếp → “Phản hồi hiệu chỉnh”. Nhập decision/classification kỳ vọng, lý do và đường dẫn phản hồi gốc. Feedback không thay quyết định hồ sơ hoặc tự kích hoạt policy.
2. Với hồ sơ auto cần feedback, dùng `POST /api/sprint2/feedback` theo cùng hợp đồng. Một người ghi một feedback bất biến cho mỗi hồ sơ. Hồ sơ cũ chưa có snapshot bị từ chối; không lấy dữ kiện hiện tại giả làm dữ kiện cũ. Không nhận hồ sơ Verify.
3. Tại tab Sprint 2, chọn 5–200 feedback và lý do. Cần ít nhất 5 snapshot khác nhau mà hard policy hiện tại cho auto, có cả nhãn AUTO và cần chuyển tiếp. Replay theo thời điểm gốc để lọc calibration. Nhãn mâu thuẫn cần phân xử trước; hard-guard feedback được giữ nhưng không dùng để nới policy.
4. Tạo version DRAFT chứa parent, tác giả, feedback IDs/fingerprints và curve. Người đề xuất phải review trade-off; không thử threshold trên holdout rồi quay lại chỉnh theo kết quả.

Tài khoản demo chia sẻ chỉ minh họa role/luồng; không chứng minh nhiều cán bộ độc lập đã dùng thử hay phê duyệt. Khi dùng thật, mỗi người cần tài khoản riêng, nguồn phản hồi gốc và xác nhận thẩm quyền của đơn vị.

## 4. Chuẩn bị dataset và đo trước/sau

Nguồn hiện có: [100 ca Markdown](../../docs/datasets/TAP_KIEM_THU_100_INPUT_THUC_TE.md). Chạy bộ chuyển đổi khi cần tái tạo candidate:

```powershell
node scripts/import-evaluation-markdown.mjs
```

Chạy từ backend. Công cụ giữ 100 hàng gốc, source SHA-256, các kỳ vọng chưa chốt, không sinh snapshot hoặc người gán nhãn. [Candidate JSON](../../docs/datasets/SPRINT2_100_CASES_CANDIDATE.json) nhập được như DRAFT để xem các lỗi cần bổ sung. Nguồn này chưa đủ căn cứ đổi thành INDEPENDENT; nếu xác minh được, tạo **version mới** với nguồn/khai báo được xác nhận vì origin và source của version đã nhập không sửa được.

Theo [hướng dẫn gán nhãn](../../docs/datasets/SPRINT2_ANNOTATION_GUIDE.md), bổ sung dữ liệu gốc và chốt split trước khi chạy. STAFF nhập JSON hoặc sửa DRAFT kèm lý do. DEAN/ADMIN khác người nhập kiểm tra và khóa; dataset đã khóa không sửa được. Tối thiểu 30 holdout, 5 routine/5 escalation và đủ năm classification theo [protocol](15_MEASUREMENT_PLAN.md).

Chọn candidate DRAFT → chọn dataset đã khóa → chạy so sánh. “Trước” là threshold ACTIVE tại thời điểm chạy, “sau” là candidate; cả hai dùng cùng hard policy/code/snapshot/ngày tham chiếu. Xem cả missed, false, routine automation, counts, hash và từng ca; không chỉ xem một con số đẹp. Holdout đã lộ kết quả không dùng cho cặp khác, kể cả lần trước là PARTIAL có hàng kết quả. Chạy lại đúng cặp được phép để kiểm tra tái lập.

Lưu `reportId` cùng bằng chứng nguồn. `MEASURED` chỉ xác nhận chốt protocol kỹ thuật; người duyệt vẫn phải kiểm tra độc lập thực tế. DRAFT hoặc thiếu nhãn/snapshot luôn `PARTIAL`, rates null. Unit test dùng dữ liệu tổng hợp chỉ chứng minh code, không công bố các con số trong test làm chất lượng dự án.

## 5. Phê duyệt, áp dụng và rollback

DEAN/ADMIN **khác người đề xuất** đọc báo cáo trước/sau và ghi lý do chấp thuận trade-off, liên kết biên bản nghiệp vụ trong ghi chú. Server yêu cầu report đủ điều kiện, đúng hash/version/code/current policy, dataset còn nguyên, không replay lỗi, missed không tăng và vẫn có routine auto. Phương án đẩy toàn bộ routine sang cán bộ bị chặn.

Kích hoạt và audit cùng transaction, retire version cũ; lỗi audit rollback toàn bộ. Hồ sơ mới đủ điều kiện sẽ đọc version ACTIVE từ DB; không sửa kết quả hồ sơ đã quyết định. Review cần được thực hiện thật, không tự kích hoạt vì test pass.

Rollback chọn version RETIRED hoặc `BASELINE`, đo lại so với version hiện hành trên **holdout mới** rồi phê duyệt theo cùng luồng. Không bỏ kiểm tra missed khi rollback; nếu version cũ không đạt, giữ xử lý cán bộ và điều tra thay vì hạ policy. Đổi code làm báo cáo cũ không còn được công bố cho code mới.

## 6. Giới hạn và kiểm chứng

Replay đo handler/policy/threshold sau chuẩn hóa input; không gọi LLM/OCR, không thay hồ sơ nghiệp vụ. Không suy chất lượng hội thoại hoặc latency model từ kết quả này. Overview có giới hạn 30 datasets/30 policies/20 reports/200 feedback; dữ liệu lớn cần pagination và tối ưu payload trước vận hành mở rộng. Không tự động xác minh danh tính người gán nhãn, chứng từ gốc hoặc các bản sao ca đã bị sửa câu chữ.

Kiểm thử gồm hard guards, Core dùng ACTIVE, snapshot gốc, isolation/denominator, nguồn 100 ca vẫn PARTIAL, quyền HTTP, phê duyệt khác tác giả, audit rollback, holdout dùng lại/đồng thời và UI giữ input khi lỗi. Xem [kết quả kiểm chứng local](../../docs/reviews/SPRINT2_2026_10_16/README.md) và [kịch bản model thật](08_VERIFY.md). Nhóm đã submit ngày 15/10/2026 theo xác nhận của Trà; tài liệu này hướng dẫn vận hành bản sửa kỹ thuật, không thêm yêu cầu chuẩn bị hồ sơ nộp.
