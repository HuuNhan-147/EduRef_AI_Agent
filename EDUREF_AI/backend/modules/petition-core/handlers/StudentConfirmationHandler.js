// backend/modules/petition-core/handlers/StudentConfirmationHandler.js
// Handler xử lý: Giấy Xác Nhận Sinh Viên (Thủ tục DV-01) - Cổng AUTO

import { BasePetitionHandler } from '../BasePetitionHandler.js';

export class StudentConfirmationHandler extends BasePetitionHandler {
  constructor() {
    super('STUDENT_CONFIRMATION', 'Giấy Xác Nhận Sinh Viên');
  }

  /**
   * Kiểm tra thông tin đầu vào (Bám sát Mẫu Giấy Xác Nhận thực tế)
   * Bắt buộc phải có:
   * - Lý do xác nhận (REQ_PURPOSE)
   * - Thông tin CCCD & Cơ sở nhận (nếu nộp từ form)
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

    // 2. Số CCCD (Nếu nộp từ form chi tiết)
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
    return 'Bạn vui lòng cho biết lý do xin cấp Giấy xác nhận sinh viên (ví dụ: bổ sung hồ sơ học tập, xin visa, học bổng, làm vé tháng xe buýt...)?';
  }

  /**
   * Phân cấp thẩm quyền:
   * Thủ tục thường quy -> Tác tử AI được toàn quyền tự động duyệt (AUTO_APPROVE)
   */
  async checkAuthority(request, student, context = {}) {
    return {
      role: 'AI_AGENT',
      action: 'AUTO_APPROVE',
      reason: 'ROUTINE_AUTO: Cấp giấy xác nhận sinh viên thường quy thuộc thẩm quyền phê duyệt tự động của Tác tử AI.',
    };
  }
}

export const studentConfirmationHandler = new StudentConfirmationHandler();
export default studentConfirmationHandler;
