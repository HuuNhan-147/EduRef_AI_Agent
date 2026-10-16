# 09. DANH MỤC API HỆ THỐNG (REST API SPECIFICATION)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Base URL:** `http://localhost:5000/api`

Đối chiếu mã nguồn nhánh hiện tại ngày **15/10/2026**. API nhận JSON (`Content-Type: application/json`); backend hiện chưa có parser multipart cho nút nộp FormData trên frontend.

Trừ các API xác thực và `GET /petitions/types`, REST bên dưới yêu cầu `Authorization: Bearer <JWT>`. Thiếu token trả 401; token sai/hết hạn hoặc không đủ quyền trả 403. Các ví dụ chỉ minh họa hợp đồng, không phải kết quả chạy live.

## Hợp đồng lỗi và giới hạn tần suất

- Lỗi nội bộ ở route trả HTTP 500: `{ "success": false, "error": "... mã tham chiếu ERR-XXXXXX ...", "errorId": "ERR-XXXXXX" }`. Chi tiết Prisma/axios/stack được ghi ở máy chủ, không trả cho client.
- Lỗi nghiệp vụ trong service có thể trả HTTP 200 với `success: false` và `error` hoặc `message`. Frontend phải kiểm tra body, không chỉ HTTP status. `POST /petitions` bọc kết quả dưới `data`; cần đọc `data.decision`, `data.status`, `data.success` nếu có.
- Khi vượt hạn mức trả 429, `{ "success": false, "message": "..." }` và header `Retry-After` theo giây.

| API | Hạn mức hiện tại | Khóa tính hạn mức |
|---|---|---|
| POST auth login/demo-login/custom-student | Chung 60 lần/phút | IP |
| POST agent/chat | 20 lần/phút | Người dùng đã xác thực |
| POST agent/verify-90s và verify-custom-prompt | Chung 6 lần/phút | Người dùng |
| POST petitions/ocr-certificate | 10 lần/phút | Người dùng |
| GET audit/verify-chain | 6 lần/phút | Người dùng |

Giới hạn lưu trong RAM một process; HTTP chat và Socket.IO chat có bucket riêng. `trust proxy` của server là 1, cần khớp số reverse proxy thật khi triển khai.

---

## 1. NHÓM XÁC THỰC (AUTHENTICATION) — `/api/auth`

### 1.1. `POST /api/auth/login`
- **Mục đích:** Cấp JWT có thời hạn 7 ngày. Đăng nhập sinh viên chỉ bằng MSSV **chỉ khả dụng ở chế độ demo**.
- **Request Body (Sinh viên):**
  ```json
  { "studentCode": "2280602154" }
  ```
- **Request Body (Cán bộ):**
  ```json
  { "username": "dean_daotao", "password": "<STAFF_PASSWORD>" }
  ```
- Cán bộ phải đang active và có mật khẩu đúng; khi tắt demo, mật khẩu mặc định seed bị từ chối. Chưa có luồng SSO/mật khẩu sinh viên production.
- **Response Success (200):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cm...",
      "studentCode": "2280602154",
      "fullName": "Cao Hữu Nhân",
      "role": "STUDENT",
      "tuitionDebt": 0,
      "gpa": 3.52,
      "department": "Khoa Công Nghệ Thông Tin"
    }
  }
  ```

### 1.2. `POST /api/auth/demo-login`

- **Mục đích:** Chuyển nhanh giữa các tài khoản allowlist phục vụ chấm hackathon mà không nhúng mật khẩu cán bộ vào frontend.
- **Điều kiện:** `ALLOW_DEMO_ROLE_SWITCH=true`; nếu không khai báo, mặc định bật ngoài production, tắt trong production.
- **Body:** `{ "accountKey": "STUDENT_ACTIVE" }`. Bảy khóa hợp lệ: `STUDENT_ACTIVE`, `STUDENT_OVERDUE_2022`, `STUDENT_DROPPED`, `STUDENT_SUSPENDED`, `STUDENT_GRADUATED`, `STAFF_DAOTAO`, `DEAN_DAOTAO`.
- Endpoint chỉ cấp JWT cho các tài khoản allowlist, không nhận username/role tùy ý từ client.

### 1.3. Các endpoint xác thực khác

| Endpoint | Hợp đồng |
|---|---|
| `GET /auth/demo-accounts` | Chỉ ở chế độ demo; danh sách sinh viên giới hạn hồ sơ benchmark, cán bộ active; không liệt kê sinh viên tùy biến |
| `POST /auth/custom-student` | Chỉ ở chế độ demo; tạo/cập nhật hồ sơ tùy biến rồi trả JWT; MSSV 7–12 chữ số, chặn mã benchmark và giới hạn độ dài trường/status |
| `GET /auth/me` | Yêu cầu Bearer JWT, trả claims đã xác minh; không phải bản hồ sơ được nạp lại từ DB |

Hồ sơ tùy biến chưa có dữ liệu TKB/tín chỉ trong schema. Trạng thái ACTIVE không bảo đảm được tự động cấp giấy nếu thiếu nguồn dữ kiện này.

---

## 2. NHÓM HỒ SƠ ĐƠN PHIẾU (PETITIONS) — `/api/petitions`

### 2.1. `GET /api/petitions`
- **Mục đích:** Lấy danh sách hồ sơ đơn sinh viên (hỗ trợ lọc theo `status`, giới hạn `limit`).
- **Query Params:** `status=ESCALATED`, `limit=50`, `page=1`, `q=XNSV-...`. Lọc trạng thái/tìm mã hồ sơ, tên hoặc MSSV trước khi phân trang; response có `page`, `hasMore`, `data` và `total` là số bản ghi trên trang trả về.
- **Response Success (200):** Trả về mảng danh sách các đối tượng `StudentRequest`.
- Sinh viên chỉ thấy hồ sơ của mình; STAFF/DEAN/ADMIN có thể xem toàn bộ. `limit` mặc định 50, tối đa 200; giá trị không hợp lệ dùng 50. `status` ngoài enum trả 400.

### 2.2. `POST /api/petitions`
- **Mục đích:** Nộp hồ sơ đơn mới trực tiếp từ biểu mẫu sinh viên.
- **Request Body:**
  ```json
  {
    "studentCode": "2380600001",
    "requestTypeCode": "STUDENT_CONFIRMATION",
    "formData": {
      "formCode": "GENERAL_CONFIRMATION",
      "purpose": "Đăng ký vé tháng xe buýt liên tuyến",
      "phone": "0901234567",
      "pickupCampus": "Trụ sở chính (A-01.01)"
    }
  }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": {
      "requestCode": "XNSV-819234",
      "status": "APPROVED",
      "decision": "AUTO_APPROVED",
      "qrCodeUrl": null,
      "sha256Proof": "<SHA-256 của bản ghi audit>"
    }
  }
  ```
- Chỉ nhận `STUDENT_CONFIRMATION`; 5 biến thể qua `formCode`: TAX_DEDUCTION, BANK_LOAN, MILITARY_DEFERMENT, COURSE_DEBT, GENERAL_CONFIRMATION.
- `formData` có thể là object/chuỗi JSON; cũng nhận `inputData`. Với STUDENT, MSSV lấy từ JWT; lịch sử/hạn ngạch lấy từ DB. Các khóa server quản lý như `submissionDate`, `referenceDate`, `existingApprovedCount`, `historyRequests`, dữ kiện tín chỉ/lịch học do client gửi bị loại.
- SĐT, địa chỉ thường trú và cơ sở nhận không tự điền từ registry ở REST. NVQS/thuế có kiểm tra địa chỉ; NVQS cần xác nhận địa chỉ; mẫu nợ môn cần danh sách môn nợ.
- Core từ chối DROPPED/SUSPENDED trước chốt thiếu dữ kiện, áp dụng cả nộp mới và resume. Các hồ sơ còn lại giữ luồng requirements → policy → authority.
- Quyết định có thể là AUTO_APPROVED, ASK_CLARIFICATION, REJECTED_POLICY hoặc ESCALATE_TO_STAFF. Mã XNSV được tạo trước khi duyệt; bản cứng do CTSV cấp, không sinh QR bên thứ ba.

### 2.3. `GET /api/petitions/:id`
- **Mục đích:** Xem chi tiết đầy đủ của một đơn (thông tin sinh viên, chứng từ đính kèm, Context Capsule, chuỗi nhật ký kiểm toán `auditLogs`).
- Không tìm thấy trả 404; sinh viên xem hồ sơ người khác trả 403.

### 2.4. `POST /api/petitions/:id/approve`
- **Mục đích:** Cán bộ PĐT / Trưởng khoa phê duyệt hồ sơ bị chuyển tiếp (`ESCALATED`).
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  { "note": "Chấp thuận cấp lại giấy xác nhận do bản trước thất lạc." }
  ```
- **Quyền:** STAFF/DEAN/ADMIN; chỉ quyết định hồ sơ `ESCALATED`, không duyệt tắt WAITING_STUDENT.
- **Response Success (200):** `{ success, requestCode, status, qrCodeUrl: null, sha256Proof, message }`. Lưu `reviewerNote`, `reviewedBy`, `reviewedAt` vào capsule và giữ lý do chuyển tiếp ban đầu. Compare-and-set trong transaction chặn hai người cùng quyết định.

### 2.5. `POST /api/petitions/:id/reject`
- **Mục đích:** Cán bộ từ chối hồ sơ kèm lý do bắt buộc.
- **Request Body:**
  ```json
  { "reason": "Chưa đủ căn cứ cấp lại giấy xác nhận." }
  ```
- Cùng quyền/trạng thái như approve; thiếu lý do trả 400, thất bại nghiệp vụ trả `success: false`.

### 2.6. `POST /api/petitions/:id/rollback`
- **Mục đích:** STAFF/DEAN/ADMIN thu hồi hồ sơ, chuyển sang `CANCELLED`, ghi audit mới; không xóa hoặc tua lại lịch sử.
- **Request Body:**
  ```json
  { "reason": "Phát hiện địa chỉ thường trú khai báo sai." }
  ```
- Lý do có giá trị mặc định khi bỏ trống; đơn CANCELLED bị chặn thu hồi lại. Lý do mới nằm trong `escalationReason`; capsule có thể vẫn giữ ghi chú duyệt cũ để lưu lịch sử. Giao diện ưu tiên lý do thu hồi khi trạng thái CANCELLED.

### 2.7. `POST /api/petitions/:id/resume`
- **Mục đích:** Sinh viên bổ sung dữ liệu/chứng từ sau khi bị hỏi làm rõ (`WAITING_STUDENT`).
- **Request Body:**
  ```json
  {
    "additionalData": { "purpose": "Vay vốn ngân hàng chính sách xã hội" },
    "newDocuments": []
  }
  ```
- Kiểm tra chủ hồ sơ và chỉ nhận WAITING_STUDENT; 404 nếu không tồn tại, 403 nếu sai chủ, 400 nếu sai trạng thái. `additionalData` được lọc khóa server rồi hợp nhất dữ liệu cũ. Tài liệu mới bắt đầu PENDING.

### 2.8. `GET /api/petitions/stats/metrics`
- **Mục đích:** Lấy số đếm nghiệp vụ và phép đo độc lập khớp code/threshold hiện hành. Hồ sơ Verify bị loại khỏi số đếm và mean latency.
- **Auth:** JWT role STAFF/DEAN/ADMIN.
- `metrics.missedEscalationRate`, `falseEscalationRate`, `routineAutomationRate`: phần trăm số, hoặc `null` với `measurementStatus: PARTIAL` khi chưa có báo cáo đủ điều kiện. Không suy 0% từ số đếm vận hành. Khi MEASURED có counts, Wilson 95%, reportId/datasetId/thresholdVersion và mode DETERMINISTIC_REPLAY.
- `operationalApprovalShare`: chuỗi phần trăm APPROVED / tổng hồ sơ nghiệp vụ, hoặc null khi chưa có hồ sơ; có thể bao gồm cán bộ duyệt. Đây không phải routine automation trên tập có nhãn.
- `avgProcessingTimeMs`: mean `decisionTimeMs` đã ghi trên audit nghiệp vụ; null khi chưa có. Không coi là latency end-to-end của LLM.

### 2.9. Endpoint phụ trợ

| Endpoint | Quyền / hành vi |
|---|---|
| `GET /petitions/types` | Công khai; danh mục active chỉ gồm STUDENT_CONFIRMATION |
| `GET /petitions/students` | STAFF/DEAN/ADMIN; dữ liệu sinh viên phục vụ test |
| `POST /petitions/:id/documents` | JWT và kiểm tra chủ hồ sơ; metadata gồm documentType/fileName/fileUrl; trạng thái PENDING, URL chỉ nhận http(s) hoặc đường dẫn nội bộ |
| `POST /petitions/ocr-certificate` | JWT; body imageBase64/expectedType/studentName; Gemini Vision không kết luận được thì yêu cầu thẩm định thủ công |
| `POST /petitions/reset-test` | JWT + chế độ demo + chủ hồ sơ hoặc cán bộ; xóa hồ sơ/tài liệu, giữ AuditLog |

API documents nhận metadata URL, không upload nhị phân lên kho lưu trữ. OCR phân tích ảnh không đồng nghĩa xác minh chứng chỉ tại đơn vị cấp.

---

## 3. NHÓM TÁC TỬ & KIỂM THỬ (AGENT & VERIFY) — `/api/agent`

### 3.1. `POST /api/agent/chat`
- **Mục đích:** Gọi AI Agent dạng HTTP REST (Fallback khi không dùng Socket.IO).
- **Auth:** Bearer JWT bắt buộc. Danh tính lấy từ token/database; `studentCode` hoặc role do client tự khai không được tin cậy.
- **Request Body:**
  ```json
  {
    "message": "Cho em xin giấy xác nhận sinh viên để làm vé xe buýt",
    "sessionId": "sess_12345"
  }
  ```
- Tin nhắn tối đa 4.000 ký tự. STUDENT khóa MSSV theo JWT; `sessionId` được scope theo chủ thể trước khi dùng memory. Response `{ success: true, data: { reply, toolResult, decision, sessionId, totalDuration } }`; lỗi agent có thể nằm trong `data.error`.

### 3.2. `POST /api/agent/verify-90s`
- **Mục đích:** Chạy 5 ca Track A với phân bố bắt buộc 3 AUTO + 2 ESCALATE.

### 3.3. `POST /api/agent/verify-custom`
- **Quyền:** STAFF/DEAN/ADMIN. Body studentCode/requestTypeCode/inputData/documents, chạy trực tiếp Core.
- `POST /api/agent/verify-general`: JWT và cùng rate limit Verify; chạy bốn ca ROUTINE / ASK / REJECT / ESCALATE. Cả bộ chung và A trả mã lần chạy, `dataSource: SYNTHETIC_BENCHMARK`; PASS kiểm tra quyết định, phân loại, persistence, audit và câu hỏi.

### 3.4. `POST /api/agent/verify-custom-prompt`
- **Mục đích:** Chạy ca mới do giám khảo nhập qua cùng policy engine.
- **Body:** `{ "prompt": "...", "studentCode": "...", "inputData": { "phone": "...", "pickupCampus": "..." } }`; `studentCode` là tùy chọn trong môi trường demo.
- Sinh viên chỉ chạy trên chính mình hoặc MSSV benchmark; nhắm sinh viên khác trả 403. Khi bỏ studentCode, route khóa vào MSSV phiên sinh viên, không dùng MSSV gõ trong prompt. Cán bộ có thể chọn hồ sơ khác.
- Verify ghi hồ sơ/audit trong DB cấu hình, có `verificationRunId`/`verificationCaseId` và không tính vào hạn mức thường. Custom prompt không tự điền SĐT/cơ sở nhận; trường mẫu được hiển thị và gửi rõ từ UI. Verify không gọi LLM.

### 3.5. `GET /api/agent/terminal-logs`
- **Mục đích:** Lấy lịch sử dòng lệnh suy luận gần nhất của AI Agent (dùng cho Live Terminal Console).
- Sinh viên thấy log của mình và log hệ thống; cán bộ thấy toàn bộ. `limit` mặc định 150, trần 300.

### 3.6. Can thiệp và quản lý terminal

| Endpoint | Quyền / body |
|---|---|
| `POST /agent/rollback` | STAFF/DEAN/ADMIN; requestId hoặc requestCode và reason; gọi dịch vụ thu hồi |
| `POST /agent/staff-confirm` | STAFF/DEAN/ADMIN; requestId/reviewerNote/approved (mặc định true); chỉ ESCALATED, có compare-and-set; dùng chung staffDecision với endpoint petitions approve, ghi capsule reviewer và audit STAFF_APPROVE_REQUEST/STAFF_REJECT_REQUEST |
| `POST /agent/terminal-logs/clear` | STAFF/DEAN/ADMIN; xóa bộ đệm terminal RAM, không xóa audit DB |

Tool `run_verify_90s` qua LLM còn có hạn mức 3 lần/10 phút cho mỗi người dùng, trả lỗi `RATE_LIMITED` trong kết quả tool.

---

## 4. NHÓM KIỂM TOÁN MẬT MÃ HỌC (AUDIT) — `/api/audit`

### 4.1. `GET /api/audit/logs`
- **Mục đích:** Lấy danh sách các bản ghi nhật ký kiểm toán kèm mã băm `sha256Hash` và `previousHash`.
- JWT; sinh viên chỉ thấy log của hồ sơ mình, cán bộ thấy tất cả. `limit` mặc định 50/trần 200; `action` chỉ nhận chuỗi.

### 4.2. `GET /api/audit/verify-chain`
- **Mục đích:** Quét và kiểm tra tính toàn vẹn mật mã học của toàn bộ chuỗi băm từ Genesis Block đến hiện tại.
- JWT, hạn mức 6 lần/phút. Xác minh hash chain không phải xác minh chữ ký số hoặc mọi cột dữ liệu nghiệp vụ.
- **Response Success (200):**
  ```json
  {
    "chainValid": true,
    "totalBlocks": 124,
    "genesisHash": "GENESIS_HASH_EDUREF_2026",
    "latestHash": "4a7f921...c890",
    "message": "Toàn bộ 124 khối trong chuỗi kiểm toán SHA-256 hoàn toàn bất biến, toàn vẹn 100%.",
    "verifiedAt": "2026-09-21T14:15:30.123Z"
  }
  ```

### 4.3. `GET /api/audit/verify/:id`

STAFF/DEAN/ADMIN kiểm tra hash của một bản ghi audit, trả `isValid`, expectedHash/recalculatedHash và message.

## 5. Socket.IO và health

- Handshake bắt buộc JWT trong `auth.token`; lỗi thiếu/sai token là AUTH_REQUIRED/AUTH_INVALID. Socket tham gia phòng `user:<owner>` và phòng `staff` theo vai trò.
- `client_send_message`: message/sessionId/inputData/attachments; tối đa 4.000 ký tự và 20 lượt/phút/người dùng. Danh tính nạp từ token/DB. Server trả `agent_response_chunk`, `agent_response_end` hoặc `agent_error`.
- `client_stop_generation`: sessionId; chỉ hủy controller thuộc socket đang gọi. `agent_stopped` báo đã nhận lệnh dừng; không thu hồi hồ sơ đã commit.
- `agent_terminal_log`: log có chủ chỉ tới chủ + staff; log hệ thống không gắn chủ phát chung.
- `GET /health` ngoài `/api`, không yêu cầu JWT; DB truy vấn được trả healthy và số sinh viên, lỗi DB trả 500 với `{ "status": "unhealthy" }`.

Frontend gửi POST /petitions và POST /petitions/:id/resume bằng JSON. Form bổ sung chỉ gửi trường có nhập, không gán mục đích vay vốn hoặc tạo URL file giả; backend vẫn quyết định trạng thái sau mỗi lần bổ sung.

## 6. Sprint 2 — `/api/sprint2`

JWT STAFF/DEAN/ADMIN, response `{ success: true, data }`; validation trả 400 với `{ success: false, message }`. POST/PATCH phải là JSON object. Writes tối đa 20/phút, compare 4/phút theo middleware rate limit hiện có. Sinh viên không được đọc dữ liệu feedback/dataset/report.

| Method / path | Body / hành vi |
|---|---|
| GET `/overview` | Active threshold, current measurement, tối đa 30 policies/30 datasets/200 feedback/20 reports. Dataset kèm issues; báo cáo có kết quả từng ca. |
| POST `/feedback` | `requestId, expectedDecision, expectedClassification, reason, evidenceRef`. Chỉ STUDENT_CONFIRMATION nghiệp vụ có evaluationSnapshot gốc, không Verify; một người/một hồ sơ, bất biến. Không tự đổi quyết định hoặc threshold. |
| POST `/policies/propose` | `feedbackIds` (5–200), `reason`. Replay hard policy để lọc calibration, đề xuất version DRAFT; không kích hoạt. Cần ≥5 snapshot đủ điều kiện AUTO, có cả nhãn AUTO và chuyển tiếp. |
| POST `/datasets` | `name, version, origin` INTERNAL/INDEPENDENT, `sourceRef, sourceSha256, referenceDate, policyAuthorIds, independenceDeclaration, cases` (1–500). Luôn tạo DRAFT; thiếu provenance vẫn nhập được để bổ sung, chưa đủ điều kiện đo. |
| PATCH `/datasets/:id` | `cases, reason`; tùy chọn `referenceDate, policyAuthorIds, independenceDeclaration`. Chỉ DRAFT; không sửa origin/source/version, cần version mới nếu đổi nguồn. |
| POST `/datasets/:id/freeze` | DEAN/ADMIN, `note`; khác người nhập, tất cả chốt protocol đạt; lưu hash và thời điểm khóa. |
| POST `/datasets/:id/compare` | `candidatePolicyId` (hoặc BASELINE). So ACTIVE hiện tại với candidate trên cùng holdout. Lưu report bất biến, hash/code versions, before/after/counts/rows/delta. Không ghi hồ sơ nghiệp vụ, không gọi LLM. Ineligible vẫn trả report PARTIAL, hai tỷ lệ null. |
| POST `/policies/:id/activate` | DEAN/ADMIN, `reportId, note`; khác người đề xuất. Report hợp lệ/đúng code và version hiện hành, dataset nguyên vẹn, không lỗi/missed tăng hoặc routine auto bằng 0. Retire version cũ và audit cùng transaction. RETIRED/BASELINE rollback qua cùng luồng với holdout mới. |

Core lưu `thresholdAssessment` và `evaluationSnapshot` tại mỗi lần quyết định. Threshold chỉ thêm STAFF review sau hard guards, không tự nới policy. Xem [quy trình nhóm cần review](SPRINT2_FEEDBACK_RUNBOOK.md), [schema ca và provenance](../../docs/datasets/SPRINT2_ANNOTATION_GUIDE.md), [định nghĩa tỷ lệ V2](15_MEASUREMENT_PLAN.md).
