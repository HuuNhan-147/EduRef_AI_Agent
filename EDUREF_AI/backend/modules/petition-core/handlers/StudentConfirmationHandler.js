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

    // 2. Số CCCD (dữ liệu bổ sung nếu nộp từ form chi tiết)
    const idCard = inputData?.idCard || inputData?.REQ_ID_CARD;
    if (idCard) {
      passed.push({
        code: 'REQ_ID_CARD',
        name: 'Số CMND/CCCD',
        value: String(idCard).trim(),
      });
    }

    // 3. Cơ sở nhận giấy
    const campus = inputData?.pickupCampus || inputData?.campus || inputData?.REQ_CAMPUS || 'Trụ sở chính: phòng Công tác sinh viên (A-01,01)';
    passed.push({
      code: 'REQ_CAMPUS',
      name: 'Cơ sở nhận giấy',
      value: String(campus).trim(),
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
    return 'Bạn cần giấy xác nhận sinh viên cho mục đích nào: làm vé tháng xe buýt, vay vốn, học bổng, tạm hoãn nghĩa vụ quân sự hay xin visa?';
  }

  async evaluatePolicies(student, request) {
    const evaluation = evaluateStudentConfirmation({ student, inputData: request.inputData || {} });
    if (evaluation.decision === TRACK_A_DECISION.AUTO_REJECT) {
      return {
        passed: false,
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
