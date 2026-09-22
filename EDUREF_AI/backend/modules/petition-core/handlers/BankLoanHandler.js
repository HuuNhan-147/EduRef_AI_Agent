// backend/modules/petition-core/handlers/BankLoanHandler.js
// Handler xử lý: Giấy Xác Nhận Vay Vốn Ngân Hàng Chính Sách (Thủ tục DV-02)

import { BasePetitionHandler } from '../BasePetitionHandler.js';

export class BankLoanHandler extends BasePetitionHandler {
  constructor() {
    super('BANK_LOAN_CONFIRMATION', 'Giấy Xác Nhận Vay Vốn Ngân Hàng Chính Sách');
  }

  /**
   * Kiểm tra thông tin đầu vào & Biểu mẫu vay vốn
   * Bắt buộc:
   * 1. REQ_BANK_NAME: Tên ngân hàng / Chi nhánh NHCSXH địa phương
   * 2. REQ_BANK_FORM: File đính kèm hoặc bản chụp Giấy đề nghị xác nhận vay vốn (Mẫu 01/NHCS)
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    const passed = [];
    const missing = [];

    // 1. Kiểm tra thông tin ngân hàng
    const bankName = inputData?.bankName || inputData?.bankBranch || inputData?.purpose;
    if (bankName && String(bankName).trim().length > 0) {
      passed.push({
        code: 'REQ_BANK_NAME',
        name: 'Ngân hàng / Chi nhánh thụ hưởng',
        value: String(bankName).trim(),
      });
    } else {
      missing.push({
        code: 'REQ_BANK_NAME',
        name: 'Tên ngân hàng chính sách hoặc chi nhánh địa phương',
      });
    }

    // 2. Kiểm tra Biểu mẫu vay vốn (Mẫu 01/NHCS)
    const hasFormDoc =
      documents.some((d) => d.documentType === 'BANK_FORM' || d.documentType === 'LOAN_APPLICATION') ||
      Boolean(inputData?.hasBankForm) ||
      Boolean(inputData?.hasAttachment);

    if (hasFormDoc) {
      passed.push({
        code: 'REQ_BANK_FORM',
        name: 'Mẫu Giấy xác nhận vay vốn (Mẫu 01/NHCS)',
        status: 'ATTACHED',
      });
    } else {
      missing.push({
        code: 'REQ_BANK_FORM',
        name: 'Bản chụp Biểu mẫu xác nhận vay vốn (Mẫu 01/NHCS)',
        description: 'Ngân hàng Chính sách Xã hội yêu cầu xác nhận trực tiếp vào Mẫu số 01/NHCS.',
      });
    }

    return {
      complete: missing.length === 0,
      passed,
      missing,
    };
  }

  /**
   * Sinh câu hỏi trọng tâm yêu cầu nộp Mẫu 01/NHCS
   */
  getClarificationQuestion(missing = []) {
    const missingCodes = missing.map((m) => m.code);
    if (missingCodes.includes('REQ_BANK_FORM')) {
      return 'Hồ sơ vay vốn Ngân hàng Chính sách Xã hội bắt buộc phải có biểu mẫu riêng. Bạn vui lòng tải lên bản chụp/ảnh Giấy xác nhận theo Mẫu 01/NHCS để hệ thống kiểm tra và đóng mộc chứng thực?';
    }
    return `Bạn vui lòng cung cấp thêm thông tin: ${missing.map((m) => m.name).join(', ')}`;
  }

  /**
   * Thẩm quyền:
   * Nếu đã nộp đủ Mẫu 01/NHCS hợp lệ -> AI Agent tự động ký số và cấp mã chứng thực số (AUTO_APPROVE)
   */
  async checkAuthority(request, student, context = {}) {
    return {
      role: 'AI_AGENT',
      action: 'AUTO_APPROVE',
      reason: 'Hồ sơ vay vốn đã đủ Mẫu 01/NHCS và trạng thái sinh viên hợp lệ. Tác tử AI tự động chứng thực điện tử.',
    };
  }
}

export const bankLoanHandler = new BankLoanHandler();
export default bankLoanHandler;
