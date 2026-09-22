// backend/modules/petition-core/handlers/MilitaryDefermentHandler.js
// Handler xử lý: Giấy Chứng Nhận Đăng Ký Tạm Hoãn Nghĩa Vụ Quân Sự (Thủ tục DV-03)

import { BasePetitionHandler } from '../BasePetitionHandler.js';

export class MilitaryDefermentHandler extends BasePetitionHandler {
  constructor() {
    super('MILITARY_DEFERMENT', 'Giấy Chứng Nhận Tạm Hoãn Nghĩa Vụ Quân Sự');
  }

  /**
   * Kiểm tra thông tin đầu vào & Chứng từ Ban chỉ huy quân sự
   * Bắt buộc:
   * 1. REQ_LOCAL_MILITARY_UNIT: Ban chỉ huy Quân sự Quận/Huyện/Thị xã nơi cư trú
   * 2. REQ_MILITARY_CALL_DOC: Lệnh gọi khám sức khỏe nghĩa vụ quân sự hoặc Giấy triệu tập
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    const passed = [];
    const missing = [];

    // 1. Kiểm tra đơn vị BCH Quân sự địa phương
    const unit = inputData?.militaryUnit || inputData?.locality || inputData?.purpose;
    if (unit && String(unit).trim().length > 0) {
      passed.push({
        code: 'REQ_LOCAL_MILITARY_UNIT',
        name: 'Ban Chỉ huy Quân sự địa phương',
        value: String(unit).trim(),
      });
    } else {
      missing.push({
        code: 'REQ_LOCAL_MILITARY_UNIT',
        name: 'Tên Quận/Huyện nơi Ban Chỉ huy Quân sự gửi giấy gọi',
      });
    }

    // 2. Kiểm tra chứng từ Lệnh gọi khám / nhập ngũ
    const hasCallDoc =
      documents.some(
        (d) =>
          d.documentType === 'MILITARY_CALL_DOC' ||
          d.documentType === 'GOVERNMENT_NOTICE' ||
          d.documentType === 'HOSPITAL_CERT'
      ) ||
      Boolean(inputData?.hasMilitaryCallDoc) ||
      Boolean(inputData?.hasAttachment);

    if (hasCallDoc) {
      passed.push({
        code: 'REQ_MILITARY_CALL_DOC',
        name: 'Lệnh gọi khám sức khỏe NVQS của BCH Quân sự',
        status: 'ATTACHED',
      });
    } else {
      missing.push({
        code: 'REQ_MILITARY_CALL_DOC',
        name: 'Ảnh chụp Lệnh gọi khám sức khỏe NVQS / Giấy báo của BCH Quân sự',
        description: 'Nhà trường chỉ cấp giấy hoãn NVQS khi có Lệnh gọi chính thức từ Ban Chỉ huy Quân sự địa phương.',
      });
    }

    return {
      complete: missing.length === 0,
      passed,
      missing,
    };
  }

  /**
   * Sinh câu hỏi yêu cầu bổ sung Lệnh gọi NVQS
   */
  getClarificationQuestion(missing = []) {
    const missingCodes = missing.map((m) => m.code);
    if (missingCodes.includes('REQ_MILITARY_CALL_DOC')) {
      return 'Theo quy định của Ban Chỉ huy Quân sự, để được cấp Giấy tạm hoãn NVQS, bạn vui lòng chụp ảnh Lệnh gọi khám sức khỏe NVQS hoặc Giấy triệu tập đính kèm vào đây?';
    }
    return `Bạn vui lòng cung cấp thêm: ${missing.map((m) => m.name).join(', ')}`;
  }

  /**
   * PHÂN CẤP THẨM QUYỀN (AUTHORITY BOUNDARY):
   * Do thủ tục Tạm hoãn nghĩa vụ quân sự có giá trị pháp lý bắt buộc với Cơ quan Nhà nước (Ban Chỉ huy Quân sự),
   * Tác tử AI KHÔNG ĐƯỢC PHÉP TỰ DUYỆT (AUTO_APPROVE), mà bắt buộc phải chuyển tiếp lên Chuyên viên PĐT duyệt (STAFF_REVIEW).
   */
  async checkAuthority(request, student, context = {}) {
    return {
      role: 'STAFF',
      action: 'STAFF_REVIEW',
      reason:
        'HIGH_AUTHORITY_REQUIRED: Thủ tục Tạm hoãn Nghĩa vụ Quân sự có trách nhiệm pháp lý với Ban Chỉ huy Quân sự Nhà nước. Yêu cầu Chuyên viên Phòng Đào tạo thẩm định và ký duyệt.',
    };
  }

  /**
   * Đóng gói Context Capsule đặc thù cho Cán bộ PĐT
   */
  buildContextCapsule(request, student, reason, actionableQuestion) {
    const inputData = request.inputData || {};
    const unit = inputData.militaryUnit || inputData.purpose || 'Địa phương chưa nêu rõ';

    return {
      requestCode: request.requestCode,
      studentCode: student.studentCode,
      studentName: student.fullName,
      department: student.department?.name || 'Khoa KH&KT Máy tính',
      requestTypeName: this.requestName,
      reason,
      actionableQuestion:
        actionableQuestion ||
        `Thầy/Cô có phê duyệt Giấy chứng nhận tạm hoãn Nghĩa vụ quân sự cho sinh viên ${student.fullName} (MSSV: ${student.studentCode}) gửi Ban Chỉ huy Quân sự [${unit}] không?`,
      escalatedAt: new Date().toISOString(),
      studentSummary: {
        gpa: Number(student.gpa || 0),
        status: student.status,
        tuitionDebt: Number(student.tuitionDebt || 0),
      },
      documents: (request.documents || []).map((d) => ({
        type: d.documentType,
        name: d.fileName,
        url: d.fileUrl,
      })),
      actionableButtons: [
        { label: 'Duyệt Hoãn NVQS', action: 'APPROVE', color: 'green' },
        { label: 'Từ Chối Đơn', action: 'REJECT', color: 'red' },
      ],
    };
  }
}

export const militaryDefermentHandler = new MilitaryDefermentHandler();
export default militaryDefermentHandler;
