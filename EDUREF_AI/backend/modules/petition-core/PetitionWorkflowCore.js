// backend/modules/petition-core/PetitionWorkflowCore.js
// Nhạc trưởng Trung tâm Điều phối Vòng đời Hồ sơ Đơn Phiếu Sinh Viên (FSM & Decision Dispatcher)

import prisma from '../../config/prisma.js';
import AuditLogService from '../../services/AuditLogService.js';
import { studentConfirmationHandler } from './handlers/StudentConfirmationHandler.js';
import { bankLoanHandler } from './handlers/BankLoanHandler.js';
import { militaryDefermentHandler } from './handlers/MilitaryDefermentHandler.js';
import { graduationAssessmentHandler } from './handlers/GraduationAssessmentHandler.js';

export class PetitionWorkflowCore {
  constructor() {
    this.handlers = new Map();
    this.registerHandler(studentConfirmationHandler);
    this.registerHandler(bankLoanHandler);
    this.registerHandler(militaryDefermentHandler);
    this.registerHandler(graduationAssessmentHandler);
  }

  /**
   * Đăng ký một bộ xử lý thủ tục hành chính
   */
  registerHandler(handler) {
    this.handlers.set(handler.requestCode, handler);
    console.log(`📋 [PetitionWorkflowCore] Đã nạp Handler cho thủ tục: [${handler.requestCode}] - ${handler.requestName}`);
  }

  /**
   * Lấy bộ xử lý theo mã loại đơn
   */
  getHandler(requestTypeCode) {
    const handler = this.handlers.get(requestTypeCode);
    if (!handler) {
      throw new Error(`Chưa đăng ký bộ xử lý (Handler) cho loại đơn: [${requestTypeCode}]`);
    }
    return handler;
  }

  /**
   * Pipeline điều phối và thẩm định đơn từ đầu tới cuối (5 Chốt chặn cố định)
   */
  async processPetitionWorkflow({
    studentCode,
    requestTypeCode,
    inputData = {},
    documents = [],
    existingRequestId = null,
    actorType = 'AI_AGENT',
  }) {
    const startTime = Date.now();
    console.log(`\n🚀 [PetitionWorkflowCore] Bắt đầu xử lý đơn: Code=[${requestTypeCode}], MSSV=[${studentCode}]`);

    // 1. Lấy thông tin sinh viên từ Database
    const student = await prisma.student.findUnique({
      where: { studentCode },
      include: { department: true },
    });

    if (!student) {
      return {
        success: false,
        decision: 'STUDENT_NOT_FOUND',
        message: `Không tìm thấy sinh viên có mã số [${studentCode}] trong cơ sở dữ liệu nhà trường.`,
      };
    }

    // 2. Lấy định nghĩa loại đơn từ Database
    const requestType = await prisma.requestType.findUnique({
      where: { code: requestTypeCode },
    });

    if (!requestType) {
      return {
        success: false,
        decision: 'REQUEST_TYPE_NOT_FOUND',
        message: `Không tìm thấy loại thủ tục hành chính có mã [${requestTypeCode}].`,
      };
    }

    // 3. Lấy Handler chuyên biệt của loại đơn này
    const handler = this.getHandler(requestTypeCode);

    // 4. Khởi tạo hoặc nạp hồ sơ đơn (StudentRequest)
    let request = null;
    if (existingRequestId) {
      request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: existingRequestId }, { requestCode: existingRequestId }] },
        include: { documents: true, student: true, requestType: true },
      });
    }

    if (!request) {
      // Duplicate Guard: Chặn tạo trùng đơn đang xử lý
      const existingActive = await prisma.studentRequest.findFirst({
        where: {
          studentId: student.id,
          requestTypeId: requestType.id,
          status: { in: ['PENDING', 'PROCESSING', 'WAITING_STUDENT', 'ESCALATED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { documents: true, student: true, requestType: true },
      });

      if (existingActive) {
        console.log(`  ♻️ [Core] Tái sử dụng đơn đang xử lý: [${existingActive.requestCode}] (${existingActive.status})`);
        request = existingActive;
      } else {
        const requestCode = `ST-${Math.floor(100000 + Math.random() * 900000)}`;
        request = await prisma.studentRequest.create({
          data: {
            requestCode,
            studentId: student.id,
            requestTypeId: requestType.id,
            status: 'PROCESSING',
            inputData: inputData || {},
          },
          include: { documents: true, student: true, requestType: true },
        });
        console.log(`  📄 [Core] Đã tạo mã hồ sơ mới: [${request.requestCode}]`);
      }
    }

    // Kết hợp chứng từ hiện có trong database và chứng từ mới truyền vào
    const allDocs = [...(request.documents || []), ...documents];

    // =========================================================================
    // CHỐT 1: VALIDATE REQUIREMENTS (Kiểm tra dữ kiện & chứng từ bắt buộc)
    // =========================================================================
    console.log(`  🔍 [Core Chốt 1] Kiểm tra điều kiện đầu vào (Requirements)...`);
    const reqResult = await handler.validateRequirements(request, inputData, allDocs);

    if (!reqResult.complete) {
      const question = handler.getClarificationQuestion(reqResult.missing);
      console.log(`  🟡 [Core Chốt 1] Thiếu dữ kiện -> Chuyển WAITING_STUDENT. Câu hỏi: "${question}"`);

      await prisma.studentRequest.update({
        where: { id: request.id },
        data: {
          status: 'WAITING_STUDENT',
          decision: 'ASK_CLARIFICATION',
          escalationReason: question,
        },
      });

      await AuditLogService.recordLog({
        requestId: request.id,
        actorType,
        action: 'REQUIREMENT_CHECK_INCOMPLETE',
        decision: 'ASK_CLARIFICATION',
        reason: `Thiếu ${reqResult.missing.length} điều kiện bắt buộc: ${reqResult.missing.map((m) => m.name).join(', ')}`,
        inputSnapshot: { inputData, missing: reqResult.missing },
        decisionTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        decision: 'ASK_CLARIFICATION',
        status: 'WAITING_STUDENT',
        requestId: request.id,
        requestCode: request.requestCode,
        missing: reqResult.missing,
        question,
        message: question,
      };
    }

    // =========================================================================
    // CHỐT 2: EVALUATE POLICIES (Kiểm tra Quy chế Đào tạo)
    // =========================================================================
    console.log(`  ⚖️  [Core Chốt 2] Kiểm tra Quy chế Đào tạo (Policies)...`);
    const policyResult = await handler.evaluatePolicies(student, request);

    if (!policyResult.passed) {
      console.log(`  🚨 [Core Chốt 2] Vi phạm quy chế -> Chuyển REJECTED. Lý do: ${policyResult.reason}`);

      await prisma.studentRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          decision: 'REJECTED_POLICY',
          escalationReason: policyResult.reason,
        },
      });

      await AuditLogService.recordLog({
        requestId: request.id,
        actorType,
        action: 'POLICY_VIOLATION_REJECT',
        decision: 'REJECTED',
        reason: policyResult.reason,
        inputSnapshot: { studentCode, violatedPolicy: policyResult.violatedPolicy },
        decisionTimeMs: Date.now() - startTime,
      });

      return {
        success: false,
        decision: 'REJECTED_POLICY',
        status: 'REJECTED',
        requestId: request.id,
        requestCode: request.requestCode,
        reason: policyResult.reason,
        message: `Từ chối cấp đơn: ${policyResult.reason}`,
      };
    }

    // =========================================================================
    // CHỐT 3: CHECK AUTHORITY BOUNDARY (Kiểm tra Phân cấp Thẩm quyền)
    // =========================================================================
    console.log(`  🔒 [Core Chốt 3] Kiểm tra Thẩm quyền xử lý (Authority)...`);
    const authResult = await handler.checkAuthority(request, student, { inputData, documents: allDocs });

    // Nếu vượt thẩm quyền của AI -> Chuyển tiếp (Escalate) có kiểm soát
    if (authResult.action !== 'AUTO_APPROVE') {
      console.log(`  🔴 [Core Chốt 3] Vượt thẩm quyền AI -> Chuyển ESCALATED lên [${authResult.role}]`);

      const contextCapsule = handler.buildContextCapsule(
        request,
        student,
        authResult.reason,
        authResult.actionableQuestion
      );

      const escalateDecision = authResult.role === 'DEAN' ? 'ESCALATE_TO_DEAN' : 'ESCALATE_TO_STAFF';
      const roleDisplayName =
        authResult.role === 'DEAN'
          ? 'Trưởng Phòng Đào Tạo & Hội đồng xét tốt nghiệp'
          : 'Chuyên viên Phòng Đào tạo';

      await prisma.studentRequest.update({
        where: { id: request.id },
        data: {
          status: 'ESCALATED',
          decision: escalateDecision,
          escalationReason: authResult.reason,
          contextCapsule,
        },
      });

      await AuditLogService.recordLog({
        requestId: request.id,
        actorType,
        action: 'ESCALATE_AUTHORITY_TRANSFER',
        decision: 'ESCALATED',
        reason: authResult.reason,
        inputSnapshot: { requiredRole: authResult.role, contextCapsule },
        decisionTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        decision: escalateDecision,
        status: 'ESCALATED',
        requestId: request.id,
        requestCode: request.requestCode,
        requiredRole: authResult.role,
        reason: authResult.reason,
        contextCapsule,
        message: `Yêu cầu của bạn đã được tiếp nhận và đóng gói chuyển tiếp lên ${roleDisplayName} thẩm định theo thẩm quyền. Mã hồ sơ: [${request.requestCode}].`,
      };
    }

    // =========================================================================
    // CHỐT 4 & 5: EXECUTION (Phê duyệt tự động & Ký chuỗi băm SHA-256)
    // =========================================================================
    console.log(`  🟢 [Core Chốt 4 & 5] Đơn hợp lệ & trong thẩm quyền -> Tự động phê duyệt (AUTO_APPROVE)...`);
    const approvalResult = await handler.onApproved(request);

    const updatedRequest = await prisma.studentRequest.update({
      where: { id: request.id },
      data: {
        status: 'APPROVED',
        decision: 'ROUTINE_AUTO_APPROVED',
        qrCodeUrl: approvalResult.qrCodeUrl,
      },
    });

    const auditLog = await AuditLogService.recordLog({
      requestId: request.id,
      actorType,
      action: 'WORKFLOW_AUTO_APPROVE',
      decision: 'APPROVED',
      reason: 'Đơn đáp ứng toàn bộ điều kiện đầu vào, quy chế đào tạo và nằm trong thẩm quyền tự chủ của Tác tử AI.',
      inputSnapshot: { inputData, requestCode: request.requestCode },
      afterState: { status: 'APPROVED', qrCodeUrl: approvalResult.qrCodeUrl },
      decisionTimeMs: Date.now() - startTime,
    });

    const totalDuration = Date.now() - startTime;
    console.log(`  🎉 [Core] Hoàn tất tự động duyệt đơn [${request.requestCode}] trong ${totalDuration}ms!\n`);

    return {
      success: true,
      decision: 'AUTO_APPROVED',
      status: 'APPROVED',
      requestId: request.id,
      requestCode: request.requestCode,
      qrCodeUrl: approvalResult.qrCodeUrl,
      sha256Proof: auditLog?.sha256Hash,
      totalDuration,
      message: `Đơn [${request.requestCode}] đã được EduRef AI tự động phê duyệt thành công trong ${totalDuration}ms. Mã QR chứng thực số đã sẵn sàng.`,
    };
  }

  /**
   * Luồng RESUME: Tiếp tục thẩm định đơn sau khi sinh viên bổ sung thông tin/chứng từ
   */
  async resumePetitionWorkflow({ requestId, additionalData = {}, newDocuments = [], actorType = 'STUDENT' }) {
    console.log(`🔄 [PetitionWorkflowCore] Kích hoạt luồng Resume cho đơn: [${requestId}]`);

    const request = await prisma.studentRequest.findFirst({
      where: { OR: [{ id: requestId }, { requestCode: requestId }] },
      include: { student: true, requestType: true, documents: true },
    });

    if (!request) {
      return { success: false, message: 'Không tìm thấy hồ sơ đơn cần bổ sung.' };
    }

    // 1. Lưu các chứng từ mới nếu có vào DB
    if (newDocuments.length > 0) {
      for (const doc of newDocuments) {
        await prisma.requestDocument.create({
          data: {
            requestId: request.id,
            documentType: doc.documentType || 'ATTACHMENT',
            fileName: doc.fileName || 'document.pdf',
            fileUrl: doc.fileUrl || `https://storage.eduref.edu.vn/${doc.fileName || 'document.pdf'}`,
            verificationStatus: 'VERIFIED',
          },
        });
      }
    }

    // 2. Hợp nhất dữ liệu đầu vào
    const mergedInputData = {
      ...(request.inputData || {}),
      ...additionalData,
    };

    // 3. Cập nhật lại request
    await prisma.studentRequest.update({
      where: { id: request.id },
      data: {
        inputData: mergedInputData,
        status: 'PROCESSING',
      },
    });

    // 4. Chạy lại quy trình điều phối tự động từ Core
    return await this.processPetitionWorkflow({
      studentCode: request.student.studentCode,
      requestTypeCode: request.requestType.code,
      inputData: mergedInputData,
      documents: newDocuments,
      existingRequestId: request.id,
      actorType,
    });
  }
}

export const petitionWorkflowCore = new PetitionWorkflowCore();
export default petitionWorkflowCore;
