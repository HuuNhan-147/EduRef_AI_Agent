export const TRACK_A_CLASSIFICATION = Object.freeze({
  ROUTINE: 'ROUTINE',
  ROUTINE_POLICY_DENY: 'ROUTINE_POLICY_DENY',
  UNKNOWN_FACT: 'UNKNOWN_FACT',
  OUTSIDE_POLICY: 'OUTSIDE_POLICY',
  BEYOND_AUTHORITY: 'BEYOND_AUTHORITY',
});

export const TRACK_A_DECISION = Object.freeze({
  AUTO_APPROVE: 'AUTO_APPROVED',
  AUTO_REJECT: 'REJECTED_POLICY',
  ASK_CLARIFICATION: 'ASK_CLARIFICATION',
  ESCALATE_STAFF: 'ESCALATE_TO_STAFF',
});

export const STUDENT_CONFIRMATION_POLICY_VERSION = 'STUDENT_CONFIRMATION_V1.0.0';

const ROUTINE_PURPOSE_RULES = Object.freeze([
  { code: 'BUS_PASS', keywords: ['xe buýt', 'xe buyt', 'vé tháng', 've thang'] },
  { code: 'SCHOLARSHIP', keywords: ['học bổng', 'hoc bong'] },
  { code: 'BANK_LOAN', keywords: ['vay vốn', 'vay von', 'ngân hàng', 'ngan hang'] },
  { code: 'MILITARY_SERVICE', keywords: ['nghĩa vụ quân sự', 'nghia vu quan su', 'nvqs'] },
  { code: 'VISA', keywords: ['visa', 'thị thực', 'thi thuc'] },
  { code: 'ACADEMIC_RECORD', keywords: ['hồ sơ học tập', 'ho so hoc tap', 'bổ sung hồ sơ', 'bo sung ho so'] },
  { code: 'TAX_DEDUCTION', keywords: ['thuế', 'thue', 'thuế thu nhập', 'thue thu nhap', 'giảm trừ gia cảnh', 'giam tru gia canh', 'thuế tncn', 'tncn'] },
]);

export const CTSV_OFFLINE_FORMS = Object.freeze([
  { keywords: ['thuê nhà trọ', 'thue nha tro', 'nhà trọ', 'nha tro', 'ký túc xá', 'ky tuc xa', 'ktx'], name: 'Đăng ký thuê nhà trọ / ký túc xá' },
  { keywords: ['miễn giảm học phí', 'mien giam hoc phi', 'cấp bù', 'cap bu'], name: 'Cấp bù tiền miễn, giảm học phí' },
  { keywords: ['thời gian học tập', 'thoi gian hoc tap'], name: 'Xác nhận thời gian học tập' },
]);

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function matchRoutinePurpose(purpose = '') {
  const normalized = normalizeText(purpose);
  return ROUTINE_PURPOSE_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword))) || null;
}

export function evaluateStudentConfirmation({ student, inputData = {} }) {
  const purpose = inputData.purpose || inputData.reason || inputData.REQ_PURPOSE || '';
  const trimmedPurpose = String(purpose).trim();

  if (!trimmedPurpose) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'REQ_PURPOSE',
      reason: 'Thiếu dữ kiện thực tế bắt buộc: mục đích sử dụng giấy xác nhận sinh viên.',
      actionableQuestion:
        'Bạn cần giấy xác nhận sinh viên cho mục đích nào: làm vé tháng xe buýt, vay vốn, học bổng, tạm hoãn nghĩa vụ quân sự hay xin visa?',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 1. Kiểm tra trạng thái học vụ theo quy chế đào tạo HUTECH
  if (!student) {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_NOT_FOUND',
      reason: 'Không tìm thấy hồ sơ sinh viên trong cơ sở dữ liệu đào tạo.',
      userMessage: 'Yêu cầu bị từ chối do không tìm thấy hồ sơ sinh viên hợp lệ trong hệ thống đào tạo.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (student.status === 'DROPPED') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_DROPPED',
      reason: 'Sinh viên đã có quyết định thôi học hoặc bị xóa tên khỏi danh sách theo quy chế đào tạo HUTECH.',
      userMessage: 'Theo quy định của HUTECH, sinh viên đã thôi học hoặc có quyết định xóa tên không thuộc diện được cấp Giấy xác nhận sinh viên đang theo học tại trường.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (student.status === 'SUSPENDED') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_SUSPENDED',
      reason: 'Sinh viên đang trong thời gian bảo lưu kết quả học tập hoặc tạm đình chỉ học tập.',
      userMessage: 'Theo quy định HUTECH, sinh viên đang trong thời gian bảo lưu kết quả học tập không được cấp Giấy xác nhận sinh viên đang học tập tại trường. Bạn vui lòng liên hệ trực tiếp Phòng Công tác Sinh viên (Sai Gon Campus: A-01.01 hoặc Thu Duc Campus: E1-01.08) để được hướng dẫn giải quyết theo trường hợp đặc thù.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (student.status === 'GRADUATED') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_GRADUATED',
      reason: 'Sinh viên đã nhận quyết định tốt nghiệp hoặc đã hoàn thành xong chương trình đào tạo.',
      userMessage: 'Theo quy định HUTECH, sinh viên đã tốt nghiệp / hoàn thành chương trình không cấp Giấy xác nhận sinh viên đang học. Nếu cần giấy xác nhận hoàn thành khóa học hoặc bản sao văn bằng, bạn vui lòng liên hệ Phòng Đào tạo (Phòng A-01.03) để được hỗ trợ.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (student.status !== 'ACTIVE') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_ACTIVE',
      reason: `Policy quy định rõ chỉ sinh viên ACTIVE được cấp giấy; trạng thái hiện tại là [${student.status}].`,
      userMessage: 'Yêu cầu bị từ chối tự động vì người nộp không có trạng thái sinh viên đang học hợp lệ.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 2. Kiểm tra nghĩa vụ học phí: Theo quy chế HUTECH, sinh viên nợ học phí dù 1 đồng cũng bị báo trạng thái Không hợp lệ
  const debt = Number(student.tuitionDebt || 0);
  if (debt > 0) {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_TUITION_DEBT_ZERO_TOLERANCE',
      reason: `Policy HUTECH quy định sinh viên phải hoàn thành 100% nghĩa vụ học phí (nợ 0 VNĐ); hồ sơ hiện tại còn nợ ${debt.toLocaleString('vi-VN')} VNĐ.`,
      userMessage: `Yêu cầu cấp giấy xác nhận sinh viên bị báo trạng thái "Không hợp lệ" do tài khoản của bạn còn nợ học phí (${debt.toLocaleString('vi-VN')} VNĐ). Theo quy định tài chính của Nhà trường, sinh viên phải hoàn tất nghĩa vụ học phí mới đủ điều kiện giải quyết hồ sơ trực tuyến. Vui lòng thanh toán qua Cổng thanh toán trực tuyến HUTECH hoặc liên hệ Phòng Tài chính (A-01.02) để được hỗ trợ mở khóa.`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (inputData.userClaimedOverride === true || inputData.forceApprove === true) {
    return {
      classification: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
      uncertaintyType: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'AUTH_NO_SELF_OVERRIDE',
      targetRole: 'STAFF',
      reason: 'Yêu cầu ngoại lệ hoặc phê duyệt miệng vượt thẩm quyền tự động của tác tử.',
      actionableQuestion:
        `Sinh viên ${student.fullName} (${student.studentCode}) khai đã được lãnh đạo đồng ý ngoại lệ cho mục đích "${trimmedPurpose}". Cán bộ PĐT có xác minh và phê duyệt ngoại lệ này không?`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  const normalizedPurpose = normalizeText(trimmedPurpose);
  const offlineMatch = CTSV_OFFLINE_FORMS.find((rule) => rule.keywords.some((keyword) => normalizedPurpose.includes(keyword)));
  if (offlineMatch) {
    return {
      classification: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      uncertaintyType: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'CTSV_OFFLINE_FORM_DIRECT',
      targetRole: 'STAFF',
      reason: `Biểu mẫu "${offlineMatch.name}" thuộc danh mục tiếp nhận trực tiếp tại Phòng Công tác Sinh viên (CTSV), không hỗ trợ cấp online.`,
      actionableQuestion: `Biểu mẫu "${offlineMatch.name}" cần thực hiện trực tiếp tại Phòng CTSV. Cán bộ PĐT/CTSV có hướng dẫn sinh viên đến phòng A-01.01 (Sai Gon) hoặc E1-01.08 (Thu Duc) để hoàn tất thủ tục không?`,
      userMessage: `Biểu mẫu "${offlineMatch.name}" nhà trường yêu cầu thực hiện trực tiếp. Bạn vui lòng liên hệ Phòng Công tác Sinh viên tại Sai Gon Campus (Phòng A-01.01 - SĐT: (028) 3512 0785) hoặc Thu Duc Campus (Phòng E1-01.08 - SĐT: (028) 6686 8876) để được hướng dẫn thực hiện.`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  const routinePurpose = matchRoutinePurpose(trimmedPurpose);
  if (!routinePurpose) {
    return {
      classification: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      uncertaintyType: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'POLICY_SCOPE_PURPOSE_ALLOWLIST',
      targetRole: 'STAFF',
      reason: `Mục đích "${trimmedPurpose}" chưa được policy ${STUDENT_CONFIRMATION_POLICY_VERSION} bao phủ; tác tử không được tự suy diễn cho phép hay từ chối.`,
      actionableQuestion:
        `Policy hiện chưa quy định mục đích "${trimmedPurpose}". Cán bộ PĐT có chấp thuận cấp giấy xác nhận cho mục đích này không?`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  return {
    classification: TRACK_A_CLASSIFICATION.ROUTINE,
    uncertaintyType: null,
    decision: TRACK_A_DECISION.AUTO_APPROVE,
    rule: `PURPOSE_${routinePurpose.code}`,
    purposeCode: routinePurpose.code,
    reason: `Mục đích thuộc danh mục thường quy [${routinePurpose.code}], hồ sơ đủ dữ kiện và nằm trong thẩm quyền tự động.`,
    policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
  };
}

export function inferStudentConfirmationInput(prompt = '') {
  const normalized = normalizeText(prompt);
  const overridePatterns = ['cứ duyệt', 'duyệt luôn', 'đồng ý miệng', 'lãnh đạo đã đồng ý', 'bỏ qua quy định', 'tôi có quyền'];
  const purposeRules = [
    ...ROUTINE_PURPOSE_RULES,
    ...CTSV_OFFLINE_FORMS,
    { code: 'UNLISTED', keywords: ['mua nhà', 'xin việc', 'bảo lãnh', 'định cư', 'hồ sơ khác'] },
  ];
  const match = purposeRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  const freeFormPurpose = String(prompt).match(/\b(?:để|nhằm|phục vụ)\s+(.+?)(?:[.!?]|$)/i)?.[1]?.trim() || null;

  return {
    purpose: match || freeFormPurpose ? prompt.trim() : null,
    userClaimedOverride: overridePatterns.some((pattern) => normalized.includes(pattern)),
  };
}

export default {
  evaluateStudentConfirmation,
  inferStudentConfirmationInput,
  matchRoutinePurpose,
};
