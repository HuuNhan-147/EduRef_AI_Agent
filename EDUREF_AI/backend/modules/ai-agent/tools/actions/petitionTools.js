import prisma from '../../../../config/prisma.js';
import AcademicPolicyEngine from '../../../../services/AcademicPolicyEngine.js';
import AuditLogService from '../../../../services/AuditLogService.js';

export const petitionTools = {
  /**
   * Tra cứu thông tin và tình trạng học tập của sinh viên theo MSSV
   */
  async check_student_status({ studentCode }) {
    try {
      const student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
        include: { department: true },
      });

      if (!student) {
        return {
          found: false,
          message: `Không tìm thấy sinh viên có MSSV: ${studentCode} trong hệ thống đào tạo.`,
        };
      }

      return {
        found: true,
        student: {
          id: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          email: student.email,
          department: student.department.name,
          status: student.status,
          tuitionDebt: Number(student.tuitionDebt),
          gpa: Number(student.gpa),
        },
      };
    } catch (error) {
      return { found: false, message: error.message };
    }
  },

  /**
   * Tạo đơn phiếu sinh viên và chạy qua Động cơ Quy chế để ra quyết định
   */
  async create_student_request({
    studentCode = '2110001',
    requestTypeCode = 'STUDENT_CONFIRMATION',
    purpose = null,
    courseCode = null,
    hasAttachment = false,
    reason = null,
    explanation = null,
    daysAfterResult = 0,
    userClaimedOverride = false,
  }) {
    const startTime = Date.now();
    try {
      // 1. Tìm sinh viên trong DB
      let student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
        include: { department: true },
      });

      if (!student) {
        // Fallback mặc định sinh viên mẫu nếu chưa chỉ định MSSV
        student = await prisma.student.findFirst({
          where: { status: 'ACTIVE' },
          include: { department: true },
        });
      }

      // 2. Tìm loại thủ tục
      const requestType = await prisma.requestType.findUnique({
        where: { code: requestTypeCode },
      });

      if (!requestType) {
        return {
          success: false,
          decision: 'REJECTED',
          message: `Thủ tục [${requestTypeCode}] không tồn tại trong danh mục đào tạo.`,
        };
      }

      // 3. Chuẩn bị inputData
      const inputData = {
        purpose,
        courseCode,
        hasAttachment,
        reason,
        explanation,
        daysAfterResult: Number(daysAfterResult),
        userClaimedOverride: Boolean(userClaimedOverride),
      };

      // 4. Chạy qua Động cơ Quy chế Cứng (AcademicPolicyEngine)
      const evalResult = await AcademicPolicyEngine.evaluateRequest({
        student,
        requestType,
        inputData,
      });

      const decisionTimeMs = Date.now() - startTime;

      // Xử lý theo quyết định của Policy Engine
      // Case 1: Thiếu thông tin bắt buộc -> Trả về câu hỏi, CHƯA tạo đơn
      if (evalResult.decision === 'ASK_CLARIFICATION') {
        await AuditLogService.recordLog({
          actorType: 'AI_AGENT',
          action: 'ASK_CLARIFICATION',
          decision: 'ASK_CLARIFICATION',
          reason: evalResult.reason,
          inputSnapshot: { studentCode, requestTypeCode, inputData },
          decisionTimeMs,
        });

        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          actionableQuestion: evalResult.actionableQuestion,
          missingField: evalResult.missingField,
          message: evalResult.actionableQuestion,
        };
      }

      // Case 2: Vi phạm quy chế đào tạo -> Từ chối thẳng
      if (evalResult.decision === 'OUT_OF_POLICY') {
        await AuditLogService.recordLog({
          actorType: 'AI_AGENT',
          action: 'REJECT_POLICY',
          decision: 'REJECTED',
          reason: evalResult.reason,
          inputSnapshot: { studentCode, requestTypeCode, inputData },
          decisionTimeMs,
        });

        return {
          success: false,
          decision: 'REJECTED',
          policyCode: evalResult.policyCode,
          reason: evalResult.reason,
          message: evalResult.userMessage,
        };
      }

      // Sinh mã đơn ngẫu nhiên ST-XXXXXX
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const requestCode = `ST-${randomSuffix}`;

      // Case 3: Vượt thẩm quyền / Cần Chuyên viên hoặc Lãnh đạo duyệt
      if (evalResult.decision === 'BEYOND_AUTHORITY') {
        const newRequest = await prisma.studentRequest.create({
          data: {
            requestCode,
            studentId: student.id,
            requestTypeId: requestType.id,
            status: 'ESCALATED',
            inputData,
            decision: 'ESCALATED_PENDING',
            escalationReason: evalResult.reason,
            contextCapsule: evalResult.contextCapsule,
          },
        });

        await AuditLogService.recordLog({
          requestId: newRequest.id,
          actorType: 'AI_AGENT',
          action: 'ESCALATE_REQUEST',
          decision: 'ESCALATED_PENDING',
          reason: evalResult.reason,
          inputSnapshot: inputData,
          decisionTimeMs,
        });

        return {
          success: true,
          decision: 'ESCALATED_PENDING',
          requestCode,
          targetRole: evalResult.targetRole,
          actionableQuestion: evalResult.actionableQuestion,
          contextCapsule: evalResult.contextCapsule,
          message: `Hồ sơ [${requestCode}] cần chuyển tiếp lên ${evalResult.targetRole === 'DEAN' ? 'Trưởng phòng Đào tạo' : 'Chuyên viên PĐT'}. ${evalResult.actionableQuestion}`,
        };
      }

      // Case 4: Thường quy hợp lệ -> Tự động duyệt 100% trong 0.8s
      if (evalResult.decision === 'ROUTINE_AUTO_APPROVE') {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EDUREF_VERIFIED_${requestCode}_${student.studentCode}`;

        const newRequest = await prisma.studentRequest.create({
          data: {
            requestCode,
            studentId: student.id,
            requestTypeId: requestType.id,
            status: 'APPROVED',
            inputData,
            decision: 'ROUTINE_AUTO_APPROVED',
            qrCodeUrl,
          },
        });

        const auditLog = await AuditLogService.recordLog({
          requestId: newRequest.id,
          actorType: 'AI_AGENT',
          action: 'AUTO_APPROVE_REQUEST',
          decision: 'APPROVED',
          reason: 'Hồ sơ hợp lệ thường quy, thỏa mãn 100% quy chế đào tạo.',
          inputSnapshot: inputData,
          decisionTimeMs,
        });

        // Cập nhật sha256Proof cho đơn
        if (auditLog?.sha256Hash) {
          await prisma.studentRequest.update({
            where: { id: newRequest.id },
            data: { sha256Proof: auditLog.sha256Hash },
          });
        }

        return {
          success: true,
          decision: 'AUTO_APPROVED',
          requestCode,
          studentName: student.fullName,
          studentCode: student.studentCode,
          requestTypeName: requestType.name,
          qrCodeUrl,
          sha256Proof: auditLog?.sha256Hash,
          decisionTimeMs,
          message: `Đơn [${requestCode}] đã được EduRef AI tự động thẩm định và phê duyệt thành công trong ${decisionTimeMs}ms. Mã QR chứng thực số đã sẵn sàng.`,
        };
      }

      return { success: false, message: 'Trạng thái xử lý không xác định.' };
    } catch (error) {
      console.error('❌ [create_student_request] Lỗi:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Hoàn tác 1-chạm (One-Click Rollback) khi phát hiện gian lận hoặc sai sót
   */
  async rollback_student_request({ requestCode, reason = 'Phát hiện khai báo sai lệch thông tin' }) {
    const startTime = Date.now();
    try {
      const request = await prisma.studentRequest.findUnique({
        where: { requestCode },
        include: { student: true, requestType: true },
      });

      if (!request) {
        return { success: false, message: `Không tìm thấy đơn có mã: ${requestCode}` };
      }

      const beforeState = { status: request.status, qrCodeUrl: request.qrCodeUrl };

      // Chuyển trạng thái sang CANCELLED và xóa mã QR
      const updated = await prisma.studentRequest.update({
        where: { id: request.id },
        data: {
          status: 'CANCELLED',
          qrCodeUrl: null,
          decision: 'CANCELLED_ROLLBACK',
          escalationReason: `Hoàn tác bởi Quản lý: ${reason}`,
        },
      });

      // Ghi vết kiểm toán hành động hoàn tác
      const auditLog = await AuditLogService.recordLog({
        requestId: request.id,
        actorType: 'STAFF',
        action: 'ROLLBACK_REQUEST',
        decision: 'CANCELLED',
        reason,
        inputSnapshot: { requestCode, reason },
        beforeState,
        afterState: { status: 'CANCELLED', qrCodeUrl: null },
        decisionTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        requestCode,
        previousStatus: beforeState.status,
        currentStatus: 'CANCELLED',
        sha256Proof: auditLog?.sha256Hash,
        message: `Đã hoàn tác thành công đơn [${requestCode}]. Mã chứng thực số và QR Code đã bị vô hiệu hóa hoàn toàn.`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Cán bộ / Lãnh đạo phê duyệt hoặc từ chối ca vượt thẩm quyền
   */
  async staff_confirm_request({ requestId, reviewerNote = '', approved = true }) {
    const startTime = Date.now();
    try {
      const request = await prisma.studentRequest.findUnique({
        where: { id: requestId },
        include: { student: true, requestType: true },
      });

      if (!request) return { success: false, message: 'Không tìm thấy hồ sơ.' };

      // State Guard: Chặn thao tác trên đơn đã kết thúc hoặc đơn chưa qua AI
      if (request.status === 'CANCELLED') {
        return { success: false, message: `Hồ sơ [${request.requestCode}] đã bị thu hồi/hủy bỏ, không thể phê duyệt.` };
      }
      if (approved && request.status === 'APPROVED') {
        return { success: false, message: `Hồ sơ [${request.requestCode}] đã được phê duyệt trước đó.` };
      }
      if (!approved && request.status === 'REJECTED') {
        return { success: false, message: `Hồ sơ [${request.requestCode}] đã bị từ chối trước đó.` };
      }
      if (!['ESCALATED', 'WAITING_STUDENT'].includes(request.status)) {
        return {
          success: false,
          message: `Hồ sơ [${request.requestCode}] đang ở trạng thái [${request.status}] — chưa được AI thẩm định chuyển tiếp lên thẩm quyền con người.`,
        };
      }

      const beforeState = { status: request.status, qrCodeUrl: request.qrCodeUrl };
      const newStatus = approved ? 'APPROVED' : 'REJECTED';
      const qrCodeUrl = approved
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EDUREF_STAFF_APPROVED_${request.requestCode}`
        : null;

      const updated = await prisma.studentRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          decision: approved ? 'STAFF_APPROVED_EXCEPTION' : 'STAFF_REJECTED',
          qrCodeUrl,
        },
      });

      await AuditLogService.recordLog({
        requestId: request.id,
        actorType: 'STAFF',
        action: approved ? 'STAFF_APPROVE' : 'STAFF_REJECT',
        decision: newStatus,
        reason: reviewerNote || (approved ? 'Cán bộ duyệt ngoại lệ' : 'Cán bộ bác bỏ yêu cầu'),
        inputSnapshot: { requestId, approved, reviewerNote },
        beforeState,
        afterState: { status: newStatus, qrCodeUrl },
        decisionTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        requestCode: request.requestCode,
        status: newStatus,
        message: approved
          ? `Cán bộ đã phê duyệt ngoại lệ cho hồ sơ [${request.requestCode}].`
          : `Cán bộ đã bác bỏ yêu cầu [${request.requestCode}].`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
};

export default petitionTools;
