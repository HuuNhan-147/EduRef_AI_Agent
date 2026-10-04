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
    forceNewRequest = false,
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
      if (request) {
        request = await prisma.studentRequest.update({
          where: { id: request.id },
          data: {
            inputData: { ...(request.inputData || {}), ...(inputData || {}) },
            status: 'PROCESSING',
            decision: null,
            escalationReason: null,
            contextCapsule: undefined,
          },
          include: { documents: true, student: true, requestType: true },
        });
      }
    }

    if (!request) {
      // Duplicate Guard: Chặn tạo trùng đơn đang xử lý
      const existingActive = forceNewRequest
        ? null
        : await prisma.studentRequest.findFirst({
            where: {
              studentId: student.id,
              requestTypeId: requestType.id,
              status: { in: ['PENDING', 'PROCESSING', 'WAITING_STUDENT', 'ESCALATED'] },
            },
            orderBy: { createdAt: 'desc' },
            include: { documents: true, student: true, requestType: true },
          });

      if (existingActive) {
        return {
          success: false,
          decision: 'DUPLICATE_ACTIVE',
          status: existingActive.status,
          requestId: existingActive.id,
          requestCode: existingActive.requestCode,
          message: `Bạn đang có hồ sơ [${existingActive.requestCode}] trong quá trình xử lý. Hãy theo dõi hoặc bổ sung hồ sơ đó trước khi gửi yêu cầu mới.`,
        };
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

      await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType,
        action: 'REQUIREMENT_CHECK_INCOMPLETE',
        decision: 'ASK_CLARIFICATION',
        reason: `Thiếu ${reqResult.missing.length} điều kiện bắt buộc: ${reqResult.missing.map((m) => m.name).join(', ')}`,
        inputSnapshot: { inputData, missing: reqResult.missing },
        decisionTimeMs: Date.now() - startTime,
      }, async (tx) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'WAITING_STUDENT',
            decision: 'ASK_CLARIFICATION',
            escalationReason: question,
          },
        });
      });

      return {
        success: true,
        decision: 'ASK_CLARIFICATION',
        classification: 'UNKNOWN_FACT',
        uncertaintyType: 'UNKNOWN_FACT',
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
      const flaggedAuthority = await handler.checkAuthority(request, student, { inputData, documents: allDocs });
      const requiredRole = flaggedAuthority.role === 'DEAN' ? 'DEAN' : 'STAFF';
      const decision = requiredRole === 'DEAN' ? 'ESCALATE_TO_DEAN' : 'ESCALATE_TO_STAFF';
      const actionableQuestion = policyResult.actionableQuestion || 'Cán bộ có thẩm quyền xác nhận hướng xử lý cho điều kiện được AI gắn cờ?';
      const contextCapsule = handler.buildContextCapsule(request, student, policyResult.reason, actionableQuestion);
      contextCapsule.requiredRole = requiredRole;
      contextCapsule.targetUnit = 'ACADEMIC_AFFAIRS';
      contextCapsule.classification = policyResult.classification || 'POLICY_REVIEW_REQUIRED';
      contextCapsule.policyVersion = policyResult.policyVersion || null;
      contextCapsule.aiRecommendation = 'REVIEW_POLICY_FLAG';

      console.log(`  🟠 [Core Chốt 2] AI gắn cờ quy chế -> Chuyển ${requiredRole} quyết định. Lý do: ${policyResult.reason}`);

      await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType,
        action: 'POLICY_FLAG_ROUTE_TO_HUMAN',
        decision,
        reason: policyResult.reason,
        inputSnapshot: { studentCode, violatedPolicy: policyResult.violatedPolicy, requiredRole },
        decisionTimeMs: Date.now() - startTime,
      }, async (tx) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'ESCALATED',
            decision,
            escalationReason: policyResult.reason,
            contextCapsule,
          },
        });
      });

      return {
        success: true,
        decision,
        classification: policyResult.classification || 'ROUTINE_POLICY_DENY',
        uncertaintyType: policyResult.uncertaintyType || null,
        status: 'ESCALATED',
        requestId: request.id,
        requestCode: request.requestCode,
        requiredRole,
        reason: policyResult.reason,
        contextCapsule,
        message: `AI đã gắn cờ một điều kiện cần xem xét và chuyển hồ sơ [${request.requestCode}] tới cán bộ có thẩm quyền. AI không tự từ chối hồ sơ.`,
      };
    }

    // =========================================================================
    // CHỐT 3: CHECK AUTHORITY BOUNDARY (Kiểm tra Phân cấp Thẩm quyền)
    // =========================================================================
    console.log(`  🔒 [Core Chốt 3] Kiểm tra Thẩm quyền xử lý (Authority)...`);
    const authResult = await handler.checkAuthority(request, student, { inputData, documents: allDocs });

    const requiredRole = authResult.role === 'DEAN' ? 'DEAN' : 'STAFF';
    const roleDisplayName = requiredRole === 'DEAN' ? 'Trưởng Phòng Đào tạo' : 'Chuyên viên Phòng Đào tạo';
    const reason = authResult.reason || 'AI đã hoàn tất bước chuẩn bị và chuyển con người quyết định.';
    const actionableQuestion = authResult.actionableQuestion || `${roleDisplayName} kiểm tra hồ sơ và đưa ra quyết định cuối cùng?`;
    const contextCapsule = handler.buildContextCapsule(request, student, reason, actionableQuestion);
    contextCapsule.requiredRole = requiredRole;
    contextCapsule.targetUnit = 'ACADEMIC_AFFAIRS';
    contextCapsule.classification = authResult.classification || authResult.uncertaintyType || 'ROUTINE';
    contextCapsule.uncertaintyType = authResult.uncertaintyType || null;
    contextCapsule.policyVersion = authResult.policyVersion || null;
    contextCapsule.manualReviewRequired = true;
    contextCapsule.aiRecommendation = 'READY_FOR_HUMAN_REVIEW';

    const escalateDecision = requiredRole === 'DEAN' ? 'ESCALATE_TO_DEAN' : 'ESCALATE_TO_STAFF';
    await AuditLogService.recordLogWithMutation({
      requestId: request.id,
      actorType,
      action: 'ROUTE_TO_HUMAN_REVIEW',
      decision: escalateDecision,
      reason,
      inputSnapshot: { requiredRole, contextCapsule },
      decisionTimeMs: Date.now() - startTime,
    }, async (tx) => {
      await tx.studentRequest.update({
        where: { id: request.id },
        data: {
          status: 'ESCALATED',
          decision: escalateDecision,
          escalationReason: reason,
          contextCapsule,
          qrCodeUrl: null,
          sha256Proof: null,
        },
      });
    });

    return {
      success: true,
      decision: escalateDecision,
      classification: contextCapsule.classification,
      uncertaintyType: contextCapsule.uncertaintyType,
      status: 'ESCALATED',
      requestId: request.id,
      requestCode: request.requestCode,
      requiredRole,
      reason,
      contextCapsule,
      totalDuration: Date.now() - startTime,
      message: `Yêu cầu đã được tiếp nhận và chuyển tới ${roleDisplayName} để quyết định. Mã hồ sơ: [${request.requestCode}].`,
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
            verificationStatus: 'PENDING',
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
