// backend/modules/petition-core/handlers/StudentConfirmationHandler.js
// Handler xử lý: Giấy Xác Nhận Sinh Viên (Thủ tục DV-01) - Cổng AUTO

import { BasePetitionHandler } from '../BasePetitionHandler.js';
import { getStudentFullProfile } from '../../../config/studentRegistry.js';
import {
  evaluateStudentConfirmation,
  TRACK_A_CLASSIFICATION,
  TRACK_A_DECISION,
} from '../../../services/StudentConfirmationDecisionService.js';

export class StudentConfirmationHandler extends BasePetitionHandler {
  constructor() {
    super('STUDENT_CONFIRMATION', 'Giấy Xác Nhận Sinh Viên');
  }

  /**
   * Kiểm tra thông tin đầu vào (Bắt buộc toàn diện - Bám sát 5 Biểu Mẫu HUTECH)
   * Toàn bộ các trường nhân thân & hành chính đều phải có đầy đủ (tự động nạp từ MSSV hoặc sinh viên điền).
   * Nếu thiếu bất kỳ trường nào, hệ thống báo lỗi chính xác để người dùng biết cách bổ sung.
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    const passed = [];
    const missing = [];

    const studentCode = inputData?.studentCode || request?.student?.studentCode || '';
    const fullProfile = getStudentFullProfile(studentCode, request?.student || inputData);
    const formCode = inputData?.formCode || 'GENERAL_CONFIRMATION';

    // 1. Nhóm nhân thân cơ bản (Bắt buộc - Tự động nạp từ MSSV Registry hoặc người dùng nhập)
    const fullName = inputData?.fullName || fullProfile.fullName;
    if (fullName && String(fullName).trim() && fullName !== 'Sinh viên') {
      passed.push({ code: 'REQ_FULLNAME', name: 'Họ và tên sinh viên', value: String(fullName).trim() });
    } else {
      missing.push({ code: 'REQ_FULLNAME', name: 'Họ và tên sinh viên', description: 'Vui lòng cung cấp họ và tên đầy đủ của sinh viên.' });
    }

    if (studentCode && String(studentCode).trim()) {
      passed.push({ code: 'REQ_STUDENT_CODE', name: 'Mã số sinh viên (MSSV)', value: String(studentCode).trim() });
    } else {
      missing.push({ code: 'REQ_STUDENT_CODE', name: 'Mã số sinh viên (MSSV)', description: 'Vui lòng cung cấp mã số sinh viên hợp lệ.' });
    }

    const birthDate = inputData?.birthDate || fullProfile.birthDate;
    if (birthDate && String(birthDate).trim()) {
      passed.push({ code: 'REQ_BIRTHDATE', name: 'Ngày tháng năm sinh', value: String(birthDate).trim() });
    } else {
      missing.push({ code: 'REQ_BIRTHDATE', name: 'Ngày tháng năm sinh', description: 'Vui lòng cung cấp ngày sinh (định dạng DD/MM/YYYY).' });
    }

    const gender = inputData?.gender || fullProfile.gender;
    if (gender && String(gender).trim()) {
      passed.push({ code: 'REQ_GENDER', name: 'Giới tính', value: String(gender).trim() });
    } else {
      missing.push({ code: 'REQ_GENDER', name: 'Giới tính', description: 'Vui lòng cung cấp giới tính (Nam / Nữ).' });
    }

    const studentClass = inputData?.studentClass || inputData?.class || fullProfile.studentClass;
    if (studentClass && String(studentClass).trim()) {
      passed.push({ code: 'REQ_CLASS', name: 'Lớp sinh hoạt', value: String(studentClass).trim() });
    } else {
      missing.push({ code: 'REQ_CLASS', name: 'Lớp sinh hoạt', description: 'Vui lòng cung cấp lớp quản lý học vụ.' });
    }

    // 2. Nhóm thông tin liên lạc & định danh công dân
    const phone = inputData?.phone || fullProfile.phone;
    if (phone && String(phone).trim()) {
      passed.push({ code: 'REQ_PHONE', name: 'Số điện thoại', value: String(phone).trim() });
    } else {
      missing.push({ code: 'REQ_PHONE', name: 'Số điện thoại', description: 'Vui lòng cung cấp số điện thoại liên lạc.' });
    }

    const idCard = inputData?.idCard || inputData?.idCardNumber || inputData?.citizenId || fullProfile.idCard;
    if (idCard && String(idCard).trim()) {
      passed.push({ code: 'REQ_ID_CARD', name: 'Số CMND/CCCD', value: String(idCard).trim() });
    } else {
      missing.push({ code: 'REQ_ID_CARD', name: 'Số CMND/CCCD', description: 'Vui lòng cung cấp số Căn cước công dân / CMND.' });
    }

    const permanentAddress = inputData?.permanentAddress || inputData?.address || fullProfile.permanentAddress;
    if (permanentAddress && String(permanentAddress).trim()) {
      passed.push({ code: 'REQ_ADDRESS', name: 'Hộ khẩu thường trú', value: String(permanentAddress).trim() });
    } else {
      missing.push({ code: 'REQ_ADDRESS', name: 'Hộ khẩu thường trú', description: 'Vui lòng cung cấp địa chỉ hộ khẩu thường trú.' });
    }

    // 3. Cơ sở nhận bản cứng có mộc đỏ P.CTSV
    const campusRaw = inputData?.pickupCampus || inputData?.campus;
    let normalizedCampus = fullProfile ? 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)' : '';
    if (campusRaw && String(campusRaw).trim().length > 0) {
      const isThuDuc = /thủ đức|thu duc|e1/i.test(campusRaw);
      const isSaiGon = /sài gòn|sai gon|a-01|điện biên phủ|ung văn khiêm|trụ sở/i.test(campusRaw);
      normalizedCampus = isThuDuc
        ? 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)'
        : isSaiGon
        ? 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)'
        : String(campusRaw).trim();
    }
    if (normalizedCampus) {
      passed.push({ code: 'REQ_CAMPUS', name: 'Cơ sở nhận giấy', value: normalizedCampus });
    } else {
      missing.push({ code: 'REQ_CAMPUS', name: 'Cơ sở nhận giấy', description: 'Vui lòng chọn cơ sở nhận giấy (Sai Gon Campus hoặc Thu Duc Campus).' });
    }

    // 4. Lý do xác nhận (Bắt buộc cho mọi biểu mẫu)
    const purpose = inputData?.purpose || inputData?.reason || inputData?.REQ_PURPOSE;
    if (purpose && String(purpose).trim().length > 0) {
      passed.push({ code: 'REQ_PURPOSE', name: 'Lý do xác nhận', value: String(purpose).trim() });
    } else {
      missing.push({
        code: 'REQ_PURPOSE',
        name: 'Mục đích sử dụng',
        description: 'Vui lòng cung cấp mục đích sử dụng (tạm hoãn NVQS, vay vốn NHCSXH, giảm trừ thuế, nợ môn, làm vé xe buýt, xin visa...).',
      });
    }

    // 5. Kiểm tra các trường đặc thù theo từng Biểu Mẫu HUTECH
    if (formCode === 'COURSE_DEBT') {
      const debtCourses = inputData?.debtCourses;
      if (debtCourses && String(debtCourses).trim().length > 0) {
        passed.push({ code: 'REQ_DEBT_COURSES', name: 'Danh sách môn nợ', value: String(debtCourses).trim() });
      } else {
        missing.push({
          code: 'REQ_DEBT_COURSES',
          name: 'Danh sách môn nợ',
          description: 'Biểu mẫu nợ môn bắt buộc phải điền danh sách môn học chưa hoàn thành để Phòng Đào tạo thẩm định.',
        });
      }
    }

    return {
      complete: missing.length === 0,
      passed,
      missing,
    };
  }

  /**
   * Sinh câu hỏi/chẩn đoán rõ ràng chỉ đích danh trường còn thiếu
   */
  getClarificationQuestion(missing = []) {
    if (!missing || missing.length === 0) {
      return 'Vui lòng kiểm tra lại thông tin hồ sơ.';
    }

    // Nếu thiếu chỉ riêng mục đích
    if (missing.length === 1 && missing[0].code === 'REQ_PURPOSE') {
      return (
        'Bạn cần giấy xác nhận sinh viên cho mục đích nào:\n' +
        '1. Tạm hoãn nghĩa vụ quân sự (MILITARY_DEFERMENT)\n' +
        '2. Vay vốn ngân hàng chính sách xã hội (BANK_LOAN)\n' +
        '3. Giảm trừ thuế thu nhập cá nhân (TAX_DEDUCTION)\n' +
        '4. Biểu mẫu nợ môn / Tiếp tục học tập (COURSE_DEBT)\n' +
        '5. Xác nhận sinh viên chung: vé xe buýt, học bổng, visa (GENERAL_CONFIRMATION)?\n\n' +
        '👉 Bạn có thể bấm chọn biểu mẫu tương ứng bên tay trái hoặc nhắn trực tiếp cho mình nhé!'
      );
    }

    // Nếu thiếu nhiều trường hoặc trường đặc thù
    const missingList = missing.map((m, idx) => `${idx + 1}. **${m.name}**: ${m.description}`).join('\n');
    return (
      '⚠️ **Hồ sơ xin cấp Giấy xác nhận sinh viên còn thiếu thông tin bắt buộc sau:**\n\n' +
      missingList +
      '\n\n👉 Bạn vui lòng bổ sung đầy đủ các thông tin trên để Nhà trường hoàn tất hồ sơ cho bạn nhé!'
    );
  }

  async evaluatePolicies(student, request) {
    const evaluation = evaluateStudentConfirmation({ student, inputData: request.inputData || {} });
    
    // Nếu phát hiện sai lệch biểu mẫu hoặc thiếu trường bắt buộc -> Dừng lại hỏi làm rõ (ASK_CLARIFICATION)
    if (evaluation.decision === TRACK_A_DECISION.ASK_CLARIFICATION) {
      return {
        passed: false,
        decision: 'ASK_CLARIFICATION',
        classification: evaluation.classification || TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        uncertaintyType: evaluation.uncertaintyType || TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        reason: evaluation.reason,
        actionableQuestion: evaluation.actionableQuestion,
        policyVersion: evaluation.policyVersion,
      };
    }

    if (evaluation.decision === TRACK_A_DECISION.AUTO_REJECT) {
      return {
        passed: false,
        decision: 'REJECTED_POLICY',
        classification: evaluation.classification,
        uncertaintyType: evaluation.uncertaintyType,
        violatedPolicy: { code: 'STUDENT_CONFIRMATION_EXPLICIT_DENY', name: 'Điều kiện cấp giấy xác nhận' },
        reason: evaluation.reason,
        userMessage: evaluation.userMessage,
        policyVersion: evaluation.policyVersion,
      };
    }

    return {
      passed: true,
      decision: evaluation.decision,
      classification: evaluation.classification,
      uncertaintyType: evaluation.uncertaintyType,
      reason: evaluation.reason,
      policyVersion: evaluation.policyVersion,
    };
  }

  /**
   * Phân cấp thẩm quyền:
   * Thủ tục thường quy -> Tác tử AI được toàn quyền tự động duyệt (AUTO_APPROVE)
   */
  async checkAuthority(request, student, context = {}) {
    const evaluation = evaluateStudentConfirmation({
      student,
      inputData: context.inputData || request.inputData || {},
    });

    if (
      evaluation.classification === TRACK_A_CLASSIFICATION.OUTSIDE_POLICY ||
      evaluation.classification === TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY ||
      evaluation.decision === TRACK_A_DECISION.ESCALATE_STAFF
    ) {
      return {
        role: 'STAFF',
        action: 'STAFF_REVIEW',
        classification: evaluation.classification,
        uncertaintyType: evaluation.uncertaintyType,
        reason: evaluation.reason,
        actionableQuestion: evaluation.actionableQuestion,
        policyVersion: evaluation.policyVersion,
      };
    }

    return {
      role: 'AI_AGENT',
      action: 'AUTO_APPROVE',
      classification: TRACK_A_CLASSIFICATION.ROUTINE,
      uncertaintyType: null,
      reason: evaluation.reason,
      policyVersion: evaluation.policyVersion,
    };
  }
}

export const studentConfirmationHandler = new StudentConfirmationHandler();
export default studentConfirmationHandler;
