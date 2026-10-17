// Presentation only: never use translated labels as API parameters or decision inputs.
export const FORM_LABELS = Object.freeze({
  COURSE_DEBT: 'Xác nhận sinh viên nợ môn', COURSE_DEBIT: 'Xác nhận sinh viên nợ môn',
  BANK_LOAN: 'Xác nhận vay vốn ngân hàng chính sách', TAX_DEDUCTION: 'Xác nhận giảm trừ gia cảnh',
  MILITARY_DEFERMENT: 'Xác nhận tạm hoãn nghĩa vụ quân sự', GENERAL_CONFIRMATION: 'Giấy xác nhận sinh viên',
  STUDENT_CONFIRMATION: 'Giấy xác nhận sinh viên',
});
export const FIELD_LABELS = Object.freeze({
  fullName: 'Họ và tên', studentCode: 'Mã số sinh viên', birthDate: 'Ngày sinh', gender: 'Giới tính',
  studentClass: 'Lớp sinh hoạt', faculty: 'Khoa / Viện', major: 'Ngành học', phone: 'Số điện thoại',
  idCard: 'CCCD/CMND', idCardDate: 'Ngày cấp CCCD/CMND', idCardPlace: 'Nơi cấp CCCD/CMND',
  permanentAddress: 'Địa chỉ thường trú', recipientAgency: 'Nơi tiếp nhận giấy', purpose: 'Mục đích sử dụng',
  pickupCampus: 'Cơ sở nhận giấy', debtCourses: 'Các học phần còn nợ', completionDeadline: 'Thời hạn hoàn thành',
  orphanStatus: 'Tình trạng mồ côi', loanFormCount: 'Số lần trường đã cấp giấy vay vốn',
  loanGrantedCount: 'Số lần đã được giải ngân', lastLoanAmount: 'Số tiền vay lần gần nhất',
  reissueReason: 'Lý do xin cấp lại', urgentReason: 'Lý do cần gấp',
});
const labels = {
  ...FORM_LABELS, ...FIELD_LABELS,
  AUTO_APPROVED: 'Đã tự động phê duyệt', AUTO_APPROVE: 'Tự động phê duyệt', APPROVED: 'Đã phê duyệt',
  ROUTINE_AUTO_APPROVED: 'Đã tự động phê duyệt', REJECTED_POLICY: 'Từ chối theo quy định', REJECTED: 'Đã từ chối',
  AUTO_REJECT: 'Từ chối theo quy định', REJECT: 'Từ chối', ASK_CLARIFICATION: 'Cần bổ sung thông tin',
  WAITING_STUDENT: 'Chờ sinh viên bổ sung', ESCALATE_TO_STAFF: 'Chuyển cán bộ thẩm định',
  ESCALATE_TO_DEAN: 'Chuyển trưởng đơn vị thẩm định', ESCALATED: 'Chờ cán bộ thẩm định',
  ESCALATED_PENDING: 'Chờ cán bộ thẩm định', STAFF_REVIEW: 'Cần cán bộ thẩm định',
  ROUTINE: 'Trong quy định và thẩm quyền', UNKNOWN_FACT: 'Thiếu thông tin cần xác minh',
  ROUTINE_POLICY_DENY: 'Không đủ điều kiện theo quy định', OUTSIDE_POLICY: 'Cần xem xét ngoại lệ',
  BEYOND_AUTHORITY: 'Vượt thẩm quyền tự động', NEEDS_HUMAN_REVIEW: 'Cần cán bộ xem xét',
  DRAFT_READY: 'Đã chuẩn bị hồ sơ', DRAFT: 'Bản nháp', COLLECTING: 'Đang chuẩn bị hồ sơ',
  NEEDS_INPUT: 'Cần bổ sung thông tin', READY: 'Chờ xác nhận nộp', BLOCKED: 'Chưa thể tiếp tục',
  SUBMITTED: 'Đã nộp hồ sơ', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy',
  ACTIVE: 'Đang hoạt động', INACTIVE: 'Chưa hoạt động', DROPPED: 'Đã thôi học', SUSPENDED: 'Đang bảo lưu',
  GRADUATED: 'Đã tốt nghiệp', STUDENT: 'Sinh viên', STAFF: 'Cán bộ', DEAN: 'Trưởng đơn vị', ADMIN: 'Quản trị viên',
  PENDING: 'Đang chờ', PROCESSING: 'Đang xử lý', CHECKING: 'Đang kiểm tra', IDLE: 'Chưa có yêu cầu',
  PASSED: 'Đạt', PASS: 'Đạt', FAILED: 'Không đạt', FAIL: 'Không đạt', INCOMPLETE: 'Chưa đủ thông tin',
  NOT_REQUIRED: 'Không cần thực hiện', NOT_SUBMITTED: 'Chưa nộp hồ sơ', DONE: 'Đã hoàn tất',
  ERROR: 'Có lỗi xử lý', USER_ABORTED: 'Đã dừng theo yêu cầu', BOUNDED: 'Trong thẩm quyền',
  BASELINE: 'Quy định đối chiếu', FROZEN: 'Đã khóa bộ dữ liệu', PROPOSED: 'Đã đề xuất',
  SCHOOL_RECORD: 'Dữ liệu nhà trường', BACKEND_PROFILE: 'Hồ sơ sinh viên', PROFILE: 'Hồ sơ sinh viên',
  USER_INPUT: 'Sinh viên cung cấp', SAVED_REQUEST: 'Hồ sơ đã lưu',
  WORKFLOW_START: 'Bắt đầu công việc', PROFILE_LOADED: 'Đã lấy hồ sơ', DRAFT_SAVED: 'Đã lưu bản nháp',
  DRAFT_RESTORED: 'Đã khôi phục hồ sơ', REQUIREMENTS_CHECK: 'Kiểm tra thông tin', POLICY_CHECK: 'Kiểm tra quy định',
  DECISION_SAVED: 'Đã lưu quyết định', WORKFLOW_CLOSED: 'Đã kết thúc công việc', WORKFLOW_RESULT: 'Kết quả xử lý',
  WORKFLOW_ERROR: 'Lỗi xử lý', WAITING_INPUT: 'Chờ bổ sung', WAITING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMATION_CHECKED: 'Đã kiểm tra xác nhận', WORKFLOW_EXECUTION: 'Thực thi quy trình',
  TOOL_CALL: 'Gọi công cụ', TOOL_RESULT: 'Kết quả công cụ', TOOL_INVOCATION: 'Gọi công cụ',
  TOOL_OBSERVATION: 'Kết quả công cụ', START: 'Bắt đầu', COMPLETE: 'Hoàn tất', INFO: 'Thông tin',
  AUDIT: 'Kiểm toán', DECISION: 'Quyết định', REASONING: 'Phân tích yêu cầu', THOUGHT: 'Phân tích yêu cầu',
  CONTEXT_RESOLVED: 'Đã xác định ngữ cảnh', INTENT: 'Mục đích yêu cầu', DECISION_FINAL: 'Kết luận xử lý',
  process_student_confirmation: 'Chuẩn bị hồ sơ xác nhận sinh viên', create_request: 'Chuẩn bị hồ sơ',
  get_student_profile: 'Tra cứu hồ sơ sinh viên', get_student_requests: 'Tra cứu đơn của sinh viên',
  get_request: 'Tra cứu đơn', check_requirements: 'Kiểm tra thông tin bắt buộc', evaluate_policy: 'Kiểm tra quy định',
  check_authority: 'Kiểm tra thẩm quyền', process_request: 'Xử lý hồ sơ', ask_student: 'Yêu cầu bổ sung',
  escalate_request: 'Chuyển cán bộ thẩm định', get_execution_trace: 'Xem nhật ký xử lý',
  processPetitionWorkflow: 'Thực thi quy trình cấp giấy', resumePetitionWorkflow: 'Tiếp tục hồ sơ bổ sung',
  POL_OVERDUE_COHORT_REQUIRE_DEBT_FORM: 'Quy định cấp giấy cho sinh viên quá hạn đào tạo còn nợ môn',
  POL_OVERDUE_COMPLETED_BEYOND_AUTHORITY: 'Thẩm định hồ sơ đã hoàn thành chương trình quá hạn đào tạo',
  POL_SUSPENDED_STUDENT_DENY: 'Điều kiện đối với sinh viên đang bảo lưu',
  POL_DROPPED_STUDENT_DENY: 'Điều kiện đối với sinh viên đã thôi học',
  POL_NO_ACTIVE_SCHEDULE_OR_CREDITS: 'Điều kiện đăng ký học phần học kỳ hiện tại',
  UNKNOWN_ACADEMIC_RECORD: 'Cần xác minh dữ liệu học vụ', MISMATCH_FORM_GUIDANCE: 'Biểu mẫu chưa phù hợp với mục đích',
  POLICY_REISSUE_QUOTA_ESCALATE: 'Cần cán bộ xem xét cấp lại giấy trong học kỳ',
  DRAFT_CONFIRMED_AND_SUBMITTED: 'Đã xác nhận và nộp hồ sơ', DRAFT_REJECTED_POLICY: 'Đã kết thúc do không đủ điều kiện',
  POLICY_VIOLATION_REJECT: 'Từ chối theo quy định', REQUIREMENT_CHECK_INCOMPLETE: 'Yêu cầu bổ sung thông tin',
  POLICY_ASK_CLARIFICATION: 'Làm rõ điều kiện hồ sơ',
  AI_AGENT: 'Tác tử AI', SYSTEM: 'Hệ thống', ASK: 'Bổ sung thông tin', AUTO: 'Tự động duyệt',
  ESCALATE: 'Chuyển cán bộ', DEBT: 'Nợ môn', TRUE: 'Có', FALSE: 'Không',
  PARTIAL: 'Chưa đủ dữ liệu đo lường', MEASURED: 'Đã đo đầy đủ', DETERMINISTIC_REPLAY: 'Đối chiếu quy định trên dữ liệu đã khóa',
  INDEPENDENT: 'Nguồn đánh giá độc lập', SYNTHETIC_BENCHMARK: 'Dữ liệu kiểm thử mẫu',
  STORED_BUSINESS_REQUEST: 'Hồ sơ nghiệp vụ đã lưu',
  ASK_STUDENT: 'Yêu cầu sinh viên bổ sung', CHECK_REQUIREMENTS: 'Kiểm tra thông tin bắt buộc',
  CREATE_REQUEST: 'Tạo hồ sơ', ESCALATE_AUTHORITY_TRANSFER: 'Chuyển hồ sơ theo thẩm quyền',
  ESCALATE_REQUEST: 'Chuyển cán bộ thẩm định', ESCALATION_FEEDBACK_RECORDED: 'Đã lưu phản hồi nghiệp vụ',
  EVALUATE_POLICY: 'Đối chiếu quy định', EVALUATION_DATASET_FROZEN: 'Đã khóa tập đánh giá',
  EVALUATION_DATASET_IMPORTED: 'Đã nhập tập đánh giá', EVALUATION_DATASET_REVISED: 'Đã cập nhật tập đánh giá',
  HUMAN_OVERRIDE_ROLLBACK: 'Cán bộ thu hồi hồ sơ', REFRESH_ACTIVE_REQUEST_INPUT: 'Đã cập nhật thông tin hồ sơ',
  THRESHOLD_ACTIVATED: 'Đã áp dụng ngưỡng đánh giá', THRESHOLD_COMPARISON_RECORDED: 'Đã lưu kết quả so sánh',
  THRESHOLD_PROPOSED: 'Đã đề xuất ngưỡng đánh giá', VISION_SERVICE_MANUAL_REVIEW: 'Chuyển cán bộ kiểm tra minh chứng',
  WORKFLOW_AUTO_APPROVE: 'Đã tự động phê duyệt hồ sơ', CUSTOM_CASE: 'Kiểm thử tình huống',
  MULTIMODAL_VISION: 'Kiểm tra hình ảnh minh chứng', VISION_RESULT: 'Kết quả kiểm tra minh chứng',
  SYNTHESIS: 'Tổng hợp kết quả', GENESIS_HASH_EDUREF_2026: 'Khối đầu tiên của chuỗi kiểm toán',
  THRESHOLD_BASELINE_V1: 'Quy định đối chiếu ban đầu',
};
for (const [key, label] of Object.entries(FIELD_LABELS)) labels[`REQ_${key.toUpperCase()}`] = label;
Object.assign(labels, { REQ_ADDRESS: FIELD_LABELS.permanentAddress, REQ_ADDRESS_STANDARD: FIELD_LABELS.permanentAddress,
  REQ_CAMPUS: FIELD_LABELS.pickupCampus, REQ_CLASS: FIELD_LABELS.studentClass, REQ_ID_CARD: FIELD_LABELS.idCard,
  REQ_DEBT_COURSES: FIELD_LABELS.debtCourses, REQ_PHONE_NUMBER_REQUIRED: FIELD_LABELS.phone,
  REQ_REISSUE_REASON: FIELD_LABELS.reissueReason, REQ_PURPOSE: FIELD_LABELS.purpose });

export function displayLabel(value) {
  if (value == null || value === '') return 'Chưa có thông tin';
  if (Object.hasOwn(labels, value)) return labels[value];
  const approvedForm = String(value).match(/^APPROVED_(.+)$/);
  if (approvedForm && Object.hasOwn(FORM_LABELS, approvedForm[1])) return `Đủ điều kiện cấp ${FORM_LABELS[approvedForm[1]]}`;
  const numberedStep = String(value).match(/^STEP_(\d+)$/);
  if (numberedStep) return `Bước ${numberedStep[1]}`;
  if (/^(?:POL|POLICY)_/.test(value)) return 'Quy định cấp giấy xác nhận';
  if (/^REQ_/.test(value)) return 'Thông tin cần bổ sung';
  if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(value)) return 'Thông tin xử lý của hệ thống';
  return String(value);
}

export function toDisplayText(value) {
  if (value == null) return '';
  const text = String(value);
  if (Object.hasOwn(labels, text)) return labels[text];
  if (/(?:OPENAI|GEMINI|GOOGLE)_API_KEYS?[^\n]*(?:chưa|thiếu|missing|not (?:set|configured))|(?:chưa|thiếu|missing)[^\n]*(?:OPENAI|GEMINI|GOOGLE)_API_KEYS?/i.test(text)) {
    return 'Dịch vụ AI hiện chưa sẵn sàng. Bạn có thể chọn mô hình Tự động hoặc thử lại sau. Hồ sơ đã lưu vẫn xem được trong Đơn của tôi.';
  }
  // Protect URLs and real request identifiers. Labels change only at the display boundary.
  return text.replace(/https?:\/\/[^\s<>]+|\b[A-Za-z][A-Za-z0-9_]*\b/g,
    token => token.startsWith('http') ? token : Object.hasOwn(labels, token) ? labels[token] : (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(token) ? displayLabel(token) : token))
    .replace(/\[([^\]\n]+)\](?!\()/g, (whole, inner) => Object.values(FORM_LABELS).includes(inner) ? inner : whole)
    .replace(/Sai Gon Campus/g, 'Cơ sở Sài Gòn').replace(/Thu Duc Campus/g, 'Cơ sở Thủ Đức');
}

const detailKeys = { draftId: 'Mã bản nháp', revision: 'Phiên bản', state: 'Trạng thái', rule: 'Quy định áp dụng',
  requestId: 'Mã định danh hồ sơ', requestCode: 'Mã hồ sơ', status: 'Trạng thái', decision: 'Quyết định',
  reason: 'Lý do', source: 'Nguồn dữ liệu', availableFields: 'Thông tin có sẵn', updatedFields: 'Thông tin cập nhật',
  missingFields: 'Thông tin còn thiếu', formCode: 'Loại giấy', tool: 'Công cụ thực thi', addressConsent: 'Xác nhận địa chỉ',
  fullName: FIELD_LABELS.fullName, studentCode: FIELD_LABELS.studentCode, inputData: 'Thông tin hồ sơ',
  student: 'Sinh viên', request: 'Hồ sơ', currentUser: 'Người dùng', passed: 'Đạt yêu cầu', success: 'Thành công',
  error: 'Thông báo lỗi', message: 'Nội dung', classification: 'Phân loại', uncertaintyType: 'Thông tin cần xác minh',
  targetRole: 'Đơn vị thẩm định', requiredRole: 'Thẩm quyền xử lý', policyVersion: 'Phiên bản quy định',
  thresholdVersion: 'Phiên bản ngưỡng đánh giá', minEvidenceScore: 'Ngưỡng điểm bằng chứng',
  evidenceScore: 'Điểm bằng chứng', calibrationReport: 'Báo cáo hiệu chỉnh', comparison: 'Kết quả so sánh',
  before: 'Trước thay đổi', after: 'Sau thay đổi', mode: 'Chế độ đánh giá', issues: 'Vấn đề cần xử lý',
  counts: 'Số lượng', routine: 'Hồ sơ thường quy', escalationRequired: 'Hồ sơ cần chuyển cán bộ',
  errors: 'Lỗi xử lý', missedEscalationRate: 'Tỷ lệ bỏ sót chuyển cán bộ', falseEscalationRate: 'Tỷ lệ chuyển cán bộ không cần thiết',
  routineAutomationRate: 'Tỷ lệ tự động hóa hồ sơ thường quy', expectedDecision: 'Quyết định kỳ vọng',
  actualDecision: 'Quyết định thực tế', expectedClassification: 'Phân loại kỳ vọng', actualClassification: 'Phân loại thực tế',
  decisionMatched: 'Quyết định khớp kỳ vọng', classificationMatched: 'Phân loại khớp kỳ vọng',
  evaluationSnapshot: 'Dữ liệu tại thời điểm thẩm định', hasSchedule: 'Có đăng ký học phần', enrolledCredits: 'Tín chỉ học kỳ hiện tại',
  completedCredits: 'Tín chỉ đã hoàn thành', admissionYear: 'Năm nhập học', historyRequests: 'Lịch sử cấp giấy',
  actionableQuestion: 'Câu hỏi xử lý tiếp', missing: 'Thông tin còn thiếu', description: 'Hướng dẫn',
  durationMs: 'Thời gian xử lý (ms)', decisionTimeMs: 'Thời gian quyết định (ms)',
  title: 'Nội dung', category: 'Nhóm nghiệp vụ', id: 'Mã định danh', label: 'Tên hiển thị',
  sourceRef: 'Nguồn dữ liệu', dataSource: 'Loại nguồn', createdAt: 'Thời điểm tạo', updatedAt: 'Thời điểm cập nhật' };
export function displayDetails(value) {
  if (Array.isArray(value)) return value.map(displayDetails);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [Object.hasOwn(detailKeys, key) ? detailKeys[key] : displayLabel(key), displayDetails(item)]));
  return typeof value === 'string' ? toDisplayText(value) : value;
}
