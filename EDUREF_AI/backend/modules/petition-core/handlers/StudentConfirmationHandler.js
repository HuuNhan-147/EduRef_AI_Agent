// backend/modules/petition-core/handlers/StudentConfirmationHandler.js
// Handler xử lý: Giấy Xác Nhận Sinh Viên (Thủ tục DV-01) - Cổng AUTO

import { BasePetitionHandler } from '../BasePetitionHandler.js';
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
   * Kiểm tra thông tin đầu vào (Bám sát Mẫu Giấy Xác Nhận thực tế)
   * Bắt buộc phải có:
   * - Lý do xác nhận (REQ_PURPOSE)
   * Danh tính, trạng thái học vụ và thông tin liên hệ được lấy từ phiên đăng nhập.
   * Các trường biểu mẫu chi tiết là dữ liệu bổ sung, không phải dữ kiện quyết định.
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    const passed = [];
    const missing = [];

    // 1. Lý do xác nhận (Bắt buộc)
    const purpose = inputData?.purpose || inputData?.reason || inputData?.REQ_PURPOSE;
    if (purpose && String(purpose).trim().length > 0) {
      passed.push({
        code: 'REQ_PURPOSE',
        name: 'Lý do xác nhận',
        value: String(purpose).trim(),
      });
    } else {
      missing.push({
        code: 'REQ_PURPOSE',
        name: 'Lý do xác nhận sinh viên',
        description: 'Vui lòng cung cấp mục đích sử dụng (bổ sung hồ sơ, xin visa, học bổng, vay vốn, làm vé xe buýt...).',
      });
    }

    // 2. Số CCCD (dữ liệu bổ sung nếu nộp từ form chi tiết hoặc chat)
    const idCard = inputData?.idCard || inputData?.REQ_ID_CARD;
    if (idCard) {
      passed.push({
        code: 'REQ_ID_CARD',
        name: 'Số CMND/CCCD',
        value: String(idCard).trim(),
      });
    }

    // 3. Địa chỉ hộ khẩu thường trú (cho NVQS, Giảm thuế, Nợ môn)
    const permanentAddress = inputData?.permanentAddress || inputData?.address || inputData?.REQ_ADDRESS;
    if (permanentAddress) {
      passed.push({
        code: 'REQ_ADDRESS',
        name: 'Địa chỉ thường trú',
        value: String(permanentAddress).trim(),
      });
    }

    // 4. Môn nợ (cho biểu mẫu nợ môn)
    const debtCourses = inputData?.debtCourses || inputData?.REQ_DEBT_COURSES;
    if (debtCourses) {
      passed.push({
        code: 'REQ_DEBT_COURSES',
        name: 'Danh sách môn nợ',
        value: String(debtCourses).trim(),
      });
    }

    // 5. Số điện thoại liên hệ
    const phone = inputData?.phone || inputData?.REQ_PHONE;
    if (phone) {
      passed.push({
        code: 'REQ_PHONE',
        name: 'Số điện thoại',
        value: String(phone).trim(),
      });
    }

    // 6. Cơ sở nhận giấy (Chuẩn hóa cơ sở chính thức HUTECH)
    const campusRaw = inputData?.pickupCampus || inputData?.campus || inputData?.REQ_CAMPUS;
    let normalizedCampus = 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)';
    if (campusRaw && String(campusRaw).trim().length > 0) {
      const isThuDuc = /thủ đức|thu duc|e1/i.test(campusRaw);
      const isSaiGon = /sài gòn|sai gon|a-01|điện biên phủ|ung văn khiêm|trụ sở/i.test(campusRaw);
      normalizedCampus = isThuDuc
        ? 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)'
        : isSaiGon
        ? 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)'
        : String(campusRaw).trim();
    }
    passed.push({
      code: 'REQ_CAMPUS',
      name: 'Cơ sở nhận giấy',
      value: normalizedCampus,
    });

    return {
      complete: missing.length === 0,
      passed,
      missing,
    };
  }

  /**
   * Sinh câu hỏi khi thiếu mục đích
   */
  getClarificationQuestion(missing = []) {
    return 'Bạn cần giấy xác nhận sinh viên cho mục đích nào: làm vé tháng xe buýt, vay vốn ngân hàng chính sách, tạm hoãn nghĩa vụ quân sự, giảm thuế hay xin visa? Bạn có thể điền biểu mẫu tương ứng bên tay trái hoặc nhắn trực tiếp cho mình nhé!';
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
      evaluation.classification === TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY
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
