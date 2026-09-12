/**
 * AuthorityEngine.js - Trọng tài Phán quyết Thẩm quyền AI (The Escalation Referee)
 * Core Hackathon Bảng 1 - Đề A: Organization AI
 *
 * Nguyên tắc vàng:
 * 1. Giá trị <= 20.000.000 VNĐ VÀ Số ngày <= 7 ngày -> AUTO_APPROVED (Cấp mã PIN ngay).
 * 2. Giá trị > 20.000.000 VNĐ HOẶC Số ngày > 7 ngày -> ESCALATED_MANAGER (Chuyển cấp Quản lý trực tiếp).
 * 3. Tuyệt đối không Over-escalation đối với các ca thường quy.
 */

export class AuthorityEngine {
  constructor(options = {}) {
    this.thresholdValue = options.thresholdValue || 20000000; // 20 triệu VNĐ
    this.maxLoanDays = options.maxLoanDays || 7;              // 7 ngày
  }

  /**
   * Đánh giá thẩm quyền phê duyệt phiếu mượn
   * @param {Object} params
   * @param {number} params.estimatedValue - Giá trị thiết bị
   * @param {number} params.loanDays - Số ngày mượn
   * @param {string} params.assetCode - Mã tài sản
   * @param {string} params.modelName - Tên thiết bị
   * @returns {Object} Phán quyết thẩm quyền
   */
  evaluate({ estimatedValue, loanDays, assetCode = '', modelName = '' }) {
    const breaches = [];

    // Kiểm tra quy chế 1: Giá trị tài sản
    if (estimatedValue > this.thresholdValue) {
      breaches.push({
        ruleId: 'POL-VAL-001',
        name: 'Hạn mức giá trị tự động phê duyệt',
        message: `Thiết bị có giá trị thẩm định ${estimatedValue.toLocaleString('vi-VN')} đ vượt ngưỡng quy định (${this.thresholdValue.toLocaleString('vi-VN')} đ).`,
        field: 'estimatedValue',
        value: estimatedValue,
        limit: this.thresholdValue
      });
    }

    // Kiểm tra quy chế 2: Thời hạn mượn
    if (loanDays > this.maxLoanDays) {
      breaches.push({
        ruleId: 'POL-DUR-001',
        name: 'Hạn mức thời gian mượn tối đa',
        message: `Thời gian mượn ${loanDays} ngày vượt hạn mức quy định (${this.maxLoanDays} ngày).`,
        field: 'loanDays',
        value: loanDays,
        limit: this.maxLoanDays
      });
    }

    // Nếu vi phạm ít nhất 1 quy chế -> BẮT BUỘC CHUYỂN CẤP QUẢN LÝ
    if (breaches.length > 0) {
      const primaryBreach = breaches[0];
      return {
        decision: 'ESCALATED_MANAGER',
        autoApproved: false,
        requiresManagerReview: true,
        reason: breaches.map(b => b.message).join(' | '),
        primaryRuleId: primaryBreach.ruleId,
        breaches,
        factsSnapshot: {
          assetCode,
          modelName,
          estimatedValue,
          loanDays,
          thresholdValueLimit: this.thresholdValue,
          thresholdDaysLimit: this.maxLoanDays
        }
      };
    }

    // Ca thường quy -> TỰ ĐỘNG PHÊ DUYỆT 100%
    return {
      decision: 'AUTO_APPROVED',
      autoApproved: true,
      requiresManagerReview: false,
      reason: `Thiết bị có giá trị (${estimatedValue.toLocaleString('vi-VN')} đ <= 20M) và thời gian (${loanDays} ngày <= 7d) hoàn toàn nằm trong thẩm quyền tự động phê duyệt của AI Agent.`,
      primaryRuleId: 'POL-AUTO-ELIGIBLE',
      breaches: [],
      factsSnapshot: {
        assetCode,
        modelName,
        estimatedValue,
        loanDays,
        thresholdValueLimit: this.thresholdValue,
        thresholdDaysLimit: this.maxLoanDays
      }
    };
  }
}

export default new AuthorityEngine();
