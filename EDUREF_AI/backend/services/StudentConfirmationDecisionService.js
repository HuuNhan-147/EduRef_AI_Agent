export const TRACK_A_CLASSIFICATION = Object.freeze({
  ROUTINE: 'ROUTINE',
  ROUTINE_POLICY_DENY: 'ROUTINE_POLICY_DENY',
  UNKNOWN_FACT: 'UNKNOWN_FACT',
  OUTSIDE_POLICY: 'OUTSIDE_POLICY',
  BEYOND_AUTHORITY: 'BEYOND_AUTHORITY',
});

export const TRACK_A_DECISION = Object.freeze({
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

  if (!student || student.status !== 'ACTIVE') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'POL_STUDENT_ACTIVE',
      targetRole: 'STAFF',
      reason: `Policy quy định rõ chỉ sinh viên ACTIVE được cấp giấy; trạng thái hiện tại là [${student?.status || 'UNKNOWN'}].`,
      userMessage: 'AI đã gắn cờ điều kiện chưa đạt và chuyển cán bộ xem xét; AI không tự từ chối hồ sơ.',
      actionableQuestion: 'Cán bộ Phòng Đào tạo xác nhận hướng xử lý phù hợp cho hồ sơ có trạng thái học tập này?',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (Number(student.tuitionDebt || 0) > 10000000) {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'POL_TUITION_DEBT_MAX_10M',
      targetRole: 'STAFF',
      reason: `Policy quy định rõ ngưỡng nợ học phí tối đa là 10.000.000 VNĐ; hồ sơ hiện tại là ${Number(student.tuitionDebt).toLocaleString('vi-VN')} VNĐ.`,
      userMessage: 'AI đã gắn cờ nghĩa vụ tài chính và chuyển cán bộ xem xét; AI không tự từ chối hồ sơ.',
      actionableQuestion: 'Cán bộ Phòng Đào tạo xác nhận hồ sơ cần bổ sung nghĩa vụ tài chính hay có hướng xử lý khác?',
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
    decision: TRACK_A_DECISION.ESCALATE_STAFF,
    rule: `PURPOSE_${routinePurpose.code}`,
    purposeCode: routinePurpose.code,
    targetRole: 'STAFF',
    reason: `Mục đích thuộc danh mục thường quy [${routinePurpose.code}] và hồ sơ đã đủ dữ kiện để cán bộ xem xét.`,
    actionableQuestion: 'Cán bộ Phòng Đào tạo kiểm tra thông tin đã được AI chuẩn bị và đưa ra quyết định cuối cùng?',
    policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
  };
}

export function inferStudentConfirmationInput(prompt = '') {
  const normalized = normalizeText(prompt);
  const overridePatterns = ['cứ duyệt', 'duyệt luôn', 'đồng ý miệng', 'lãnh đạo đã đồng ý', 'bỏ qua quy định', 'tôi có quyền'];
  const purposeRules = [
    ...ROUTINE_PURPOSE_RULES,
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
