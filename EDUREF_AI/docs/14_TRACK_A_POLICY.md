# Policy chuẩn — Giấy xác nhận sinh viên (Quy chuẩn Phòng CTSV HUTECH)

Policy version: `STUDENT_CONFIRMATION_V2.0.0`

Đây là quy trình thẩm định học vụ theo chuẩn thực tế của Trường Đại học HUTECH. Nguồn chân lý thực thi là `backend/services/StudentConfirmationDecisionService.js`.

## 1. Dữ kiện và phạm vi 5 biểu mẫu thực tế

- **Danh tính, tiến độ và tài chính:** Lấy từ cơ sở dữ liệu theo phiên đã xác thực (Mã sinh viên, trạng thái, khóa tuyển sinh, thời khóa biểu/tín chỉ học kỳ này, nợ học phí).
- **5 Biểu mẫu học vụ chuẩn hóa:**
  1. `TAX_DEDUCTION`: Đơn xin xác nhận giảm trừ gia cảnh Thuế TNCN (Thời hạn 1 học kỳ; bắt buộc nơi nhận/cơ quan thuế).
  2. `BANK_LOAN`: Đơn xin xác nhận vay vốn Ngân hàng CSXH (Mẫu 01/TDSV theo TT 27/2019/TT-NHCS; thời hạn 1 học kỳ; bắt buộc địa chỉ thường trú 4 cấp Title Case).
  3. `MILITARY_DEFERMENT`: Đơn xin tạm hoãn Nghĩa vụ Quân sự (Hiệu lực 30 ngày / 1 tháng theo Luật NVQS; bắt buộc BCH Quân sự Xã/Phường tiếp nhận).
  4. `COURSE_DEBT`: Đơn xin xác nhận sinh viên còn nợ môn / Kéo dài tiến độ (Dành riêng cho sinh viên học quá 4 năm chuẩn; bắt buộc danh sách môn nợ và cam kết hoàn thành).
  5. `GENERAL_CONFIRMATION`: Đơn xin xác nhận sinh viên thông thường (Làm vé xe buýt, visa, bổ sung hồ sơ học tập...; thời hạn 1 học kỳ).

## 2. Điều kiện tiên quyết học vụ

- **Hoạt động học tập hiện tại:** Bắt buộc có Thời khóa biểu hoặc đã đăng ký ít nhất 1 tín chỉ trong học kỳ này (`hasSchedule === true`, `enrolledCredits > 0`). Sinh viên thôi học (`DROPPED`) hoặc đang bảo lưu (`SUSPENDED`) đều bị từ chối tự động.
- **Chính sách hỗ trợ tài chính:** Nhà trường hiện đã hỗ trợ tối đa cho sinh viên, không ràng buộc việc nợ học phí để chặn cấp giấy xác nhận; sinh viên chỉ cần đáp ứng điều kiện có hoạt động học tập / có thời khóa biểu trong học kỳ là được giải quyết.
- **Cơ chế nhận bản cứng:** Nhận bản cứng có chữ ký sống và mộc đỏ của Nhà trường tại Phòng Công tác Sinh viên (Sài Gòn Campus: A-01.01 hoặc Thủ Đức Campus: E1-01.08), lưu mã công văn `XNSV-XXXXXX` vào sổ kiểm toán SHA-256.

## 3. Bảng quyết định trọng tài

| Điều kiện | Phân loại | Hành động |
|---|---|---|
| Thiếu cơ quan tiếp nhận / thiếu môn nợ / lệch form | `UNKNOWN_FACT` | `ASK_CLARIFICATION` hướng dẫn 2 cách: điền form trái hoặc chat trực tiếp |
| Trạng thái không ACTIVE, hoặc không có TKB / 0 tín chỉ | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` theo quy chế rõ ràng |
| Sinh viên quá 4 năm xin NVQS thường quy | `ROUTINE_POLICY_DENY` | `REJECTED_POLICY` hướng dẫn chuyển sang Form nợ môn (`COURSE_DEBT`) |
| Mục đích ngoài danh mục hoặc xin cấp lần 2 cùng kỳ | `OUTSIDE_POLICY` | `ESCALATE_TO_STAFF` kèm lý do giải trình |
| Yêu cầu bỏ qua quy định / phê duyệt miệng | `BEYOND_AUTHORITY` | `ESCALATE_TO_STAFF` với cảnh báo ép quyền |
| Đủ dữ kiện, đúng biểu mẫu, đạt chuẩn học vụ | `ROUTINE` | `AUTO_APPROVED` (Cấp mã công văn `XNSV-XXXXXX`) |

## 4. Bất biến an toàn (Safety Invariants)

- Không có mục đích / cơ quan tiếp nhận hợp lệ thì không duyệt.
- Sinh viên mở form này nhưng xin giấy khác (`Cross-Form Mismatch`) phải được chặn lại hỏi làm rõ trước khi tạo đơn.
- Ca bị gắn cờ không được công bố là đã đạt.
- Hồ sơ `WAITING_STUDENT` không thể được cán bộ duyệt tắt.
- Chỉ hồ sơ `ESCALATED` mới nhận quyết định của con người.
- Quyết định cuối và audit hash của auto-approve được ghi trong cùng database transaction.
- Chứng từ mới luôn bắt đầu ở `PENDING`, không tự mang nhãn `VERIFIED`.
