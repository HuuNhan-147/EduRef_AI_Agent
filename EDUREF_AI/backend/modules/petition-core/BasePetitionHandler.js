// backend/modules/petition-core/BasePetitionHandler.js
// Lớp cơ sở định nghĩa Interface chuẩn cho mọi loại thủ tục hành chính sinh viên

export class BasePetitionHandler {
  constructor(requestCode, requestName) {
    this.requestCode = requestCode;
    this.requestName = requestName;
  }

  /**
   * Kiểm tra xem hồ sơ đã đáp ứng đủ các trường thông tin & chứng từ bắt buộc chưa
   * @param {Object} request - Bản ghi StudentRequest trong DB
   * @param {Object} inputData - Dữ liệu đầu vào sinh viên cung cấp
   * @param {Array} documents - Danh sách chứng từ đính kèm
   * @returns {Promise<{ complete: boolean, passed: Array, missing: Array }>}
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    throw new Error(`[${this.requestCode}] Phương thức validateRequirements chưa được triển khai.`);
  }

  /**
   * Sinh câu hỏi trọng tâm (Actionable Clarification Question) khi thiếu thông tin
   * @param {Array} missing - Danh sách các trường/tài liệu bị thiếu
   * @returns {string} Câu hỏi ngắn gọn, trực diện
   */
  getClarificationQuestion(missing = []) {
    return `Vui lòng cung cấp thêm các thông tin còn thiếu: ${missing.map((m) => m.name || m.code).join(', ')}`;
  }

  /**
   * Đánh giá các quy chế đào tạo riêng biệt cho loại đơn này
   * @param {Object} student - Thông tin sinh viên (status, tuitionDebt, gpa...)
   * @param {Object} request - Thông tin đơn
   * @returns {Promise<{ passed: boolean, violatedPolicy: Object|null, reason: string }>}
   */
  async evaluatePolicies(student, request) {
    // Mặc định kiểm tra 2 điều kiện cơ bản: Đang học (ACTIVE) và không nợ học phí quá hạn
    if (student.status !== 'ACTIVE') {
      return {
        passed: false,
        violatedPolicy: { code: 'POL_STUDENT_ACTIVE', name: 'Trạng thái sinh viên hợp lệ' },
        reason: `Sinh viên có trạng thái [${student.status}], không đủ điều kiện làm thủ tục theo Điều 3 Quy chế đào tạo.`,
      };
    }

    if (Number(student.tuitionDebt || 0) > 10000000) {
      return {
        passed: false,
        violatedPolicy: { code: 'POL_TUITION_DEBT', name: 'Nợ học phí' },
        reason: `Sinh viên còn nợ học phí ${Number(student.tuitionDebt).toLocaleString('vi-VN')} VNĐ (vượt trần 10.000.000 VNĐ), vui lòng hoàn thành nghĩa vụ tài chính trước.`,
      };
    }

    return { passed: true, violatedPolicy: null, reason: 'Đáp ứng đầy đủ quy chế đào tạo.' };
  }

  /**
   * Xác định thẩm quyền phê duyệt đối với loại đơn này
   * @param {Object} request - Hồ sơ đơn
   * @param {Object} student - Sinh viên
   * @param {Object} context - Ngữ cảnh bổ sung
   * @returns {Promise<{ role: 'AI_AGENT'|'STAFF'|'DEAN', action: 'AUTO_APPROVE'|'STAFF_REVIEW'|'DEAN_APPROVAL', reason: string }>}
   */
  async checkAuthority(request, student, context = {}) {
    // Mặc định cho phép AI tự động xử lý nếu là tác vụ thường quy
    return {
      role: 'AI_AGENT',
      action: 'AUTO_APPROVE',
      reason: 'Đơn thường quy thuộc thẩm quyền phê duyệt tự động của Tác tử AI.',
    };
  }

  /**
   * Đóng gói Context Capsule khi đơn cần chuyển tiếp (Escalate) lên Cán bộ PĐT / Trưởng phòng
   * @param {Object} request - Hồ sơ đơn
   * @param {Object} student - Sinh viên
   * @param {string} reason - Lý do chuyển tiếp
   * @param {string} actionableQuestion - Câu hỏi hành động cho người duyệt
   * @returns {Object} Context Capsule có cấu trúc
   */
  buildContextCapsule(request, student, reason, actionableQuestion) {
    return {
      requestCode: request.requestCode,
      studentCode: student.studentCode,
      studentName: student.fullName,
      department: student.department?.name || 'Chưa xác định',
      requestTypeName: this.requestName,
      reason,
      actionableQuestion,
      escalatedAt: new Date().toISOString(),
      studentSummary: {
        gpa: Number(student.gpa || 0),
        status: student.status,
        tuitionDebt: Number(student.tuitionDebt || 0),
      },
    };
  }

  /**
   * Hook thực thi sau khi đơn được phê duyệt thành công
   * @param {Object} request - Hồ sơ đơn
   * @returns {Promise<Object>}
   */
  async onApproved(request) {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EDUREF_VERIFIED_${request.requestCode}_${request.student?.studentCode || 'STUDENT'}`;
    return { qrCodeUrl };
  }
}

export default BasePetitionHandler;
