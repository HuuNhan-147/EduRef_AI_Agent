import prisma from '../config/prisma.js';
import AuditLogService from './AuditLogService.js';
import {
  evaluateStudentConfirmation,
  TRACK_A_DECISION,
} from './StudentConfirmationDecisionService.js';

class AcademicWorkflowService {
  // =========================================================================
  // NHÓM A: STUDENT CONTEXT
  // =========================================================================

  /**
   * 1. get_student_profile: Lấy hồ sơ học vụ chi tiết của sinh viên
   */
  static async getStudentProfile(studentCode) {
    try {
      const student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
        include: { department: true },
      });

      if (!student) {
        return {
          found: false,
          message: `Không tìm thấy sinh viên với MSSV: ${studentCode}`,
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
          departmentCode: student.department.code,
          status: student.status, // ACTIVE, DROPPED, SUSPENDED, GRADUATED
          tuitionDebt: Number(student.tuitionDebt),
          gpa: Number(student.gpa),
        },
      };
    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  /**
   * 2. get_student_requests: Lấy lịch sử nộp đơn của sinh viên (chống duplicate/lách luật)
   */
  static async getStudentRequests(studentCode) {
    try {
      const student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
        select: { id: true },
      });

      if (!student) return { requests: [] };

      const requests = await prisma.studentRequest.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          requestType: { select: { code: true, name: true } },
        },
      });

      return {
        requests: requests.map((r) => ({
          id: r.id,
          requestCode: r.requestCode,
          type: r.requestType.code,
          typeName: r.requestType.name,
          status: r.status,
          decision: r.decision,
          createdAt: r.createdAt,
        })),
      };
    } catch (error) {
      return { requests: [], error: error.message };
    }
  }

  // =========================================================================
  // NHÓM B: REQUEST CONTEXT
  // =========================================================================

  /**
   * 3. create_request: Khởi tạo đơn ở trạng thái PENDING
   */
  static async createRequest({ studentCode, requestTypeCode, purpose = null, inputData = {} }) {
    try {
      // Tìm sinh viên
      const student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
      });
      if (!student) throw new Error(`Sinh viên [${studentCode}] không tồn tại.`);

      // Tìm loại thủ tục
      const requestType = await prisma.requestType.findUnique({
        where: { code: requestTypeCode },
      });
      if (!requestType) throw new Error(`Loại thủ tục [${requestTypeCode}] không hợp lệ.`);

      const finalInputData = {
        ...inputData,
        purpose: purpose || inputData.purpose || null,
      };

      // Duplicate Guard: Chặn tạo đơn mới nếu đã có đơn đang xử lý cùng loại
      const existingRequest = await prisma.studentRequest.findFirst({
        where: {
          studentId: student.id,
          requestTypeId: requestType.id,
          status: { in: ['PENDING', 'PROCESSING', 'WAITING_STUDENT', 'ESCALATED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existingRequest) {
        const refreshedRequest = await prisma.studentRequest.update({
          where: { id: existingRequest.id },
          data: {
            inputData: finalInputData,
            status: 'PENDING',
            decision: 'PENDING_EVALUATION',
            escalationReason: null,
          },
        });

        await AuditLogService.recordLog({
          requestId: existingRequest.id,
          actorType: 'AI_AGENT',
          action: 'REFRESH_ACTIVE_REQUEST_INPUT',
          decision: 'PENDING',
          reason: 'Cập nhật dữ liệu mới nhất vào hồ sơ đang xử lý thay vì dùng lại đầu vào cũ',
          inputSnapshot: finalInputData,
        });

        return {
          success: true,
          requestId: refreshedRequest.id,
          requestCode: refreshedRequest.requestCode,
          requestType: requestType.code,
          requestTypeName: requestType.name,
          status: refreshedRequest.status,
          isDuplicate: true,
          message: `Đã cập nhật dữ liệu mới nhất và tiếp tục xử lý đơn [${refreshedRequest.requestCode}].`,
        };
      }

      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const requestCode = `ST-${randomSuffix}`;

      const newRequest = await prisma.studentRequest.create({
        data: {
          requestCode,
          studentId: student.id,
          requestTypeId: requestType.id,
          status: 'PENDING',
          inputData: finalInputData,
          decision: 'PENDING_EVALUATION',
        },
        include: {
          student: true,
          requestType: true,
        },
      });

      // Tự động ghi vết Audit
      await AuditLogService.recordLog({
        requestId: newRequest.id,
        actorType: 'AI_AGENT',
        action: 'CREATE_REQUEST',
        decision: 'PENDING',
        reason: 'Tác tử khởi tạo hồ sơ đơn mới',
        inputSnapshot: finalInputData,
      });

      return {
        success: true,
        requestId: newRequest.id,
        requestCode: newRequest.requestCode,
        requestType: requestType.code,
        requestTypeName: requestType.name,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        status: newRequest.status,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 4. get_request: Context Aggregator - Trả về bức tranh hoàn chỉnh của đơn
   */
  static async getRequest(requestId) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: {
          OR: [{ id: requestId }, { requestCode: requestId }],
        },
        include: {
          student: { include: { department: true } },
          requestType: {
            include: {
              requirements: true,
              policies: true,
              authorityRules: true,
            },
          },
          documents: true,
          assignedStaff: { select: { fullName: true, role: true } },
        },
      });

      if (!request) return { found: false, message: 'Không tìm thấy hồ sơ đơn.' };

      return {
        found: true,
        request: {
          id: request.id,
          requestCode: request.requestCode,
          status: request.status,
          decision: request.decision,
          escalationReason: request.escalationReason,
          contextCapsule: request.contextCapsule,
          qrCodeUrl: request.qrCodeUrl,
          sha256Proof: request.sha256Proof,
          student: {
            studentCode: request.student.studentCode,
            fullName: request.student.fullName,
            department: request.student.department.name,
            status: request.student.status,
            tuitionDebt: Number(request.student.tuitionDebt),
            gpa: Number(request.student.gpa),
          },
          requestType: {
            code: request.requestType.code,
            name: request.requestType.name,
          },
          inputData: request.inputData,
          documents: request.documents.map((d) => ({
            type: d.documentType,
            fileName: d.fileName,
            verificationStatus: d.verificationStatus,
          })),
        },
      };
    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  // =========================================================================
  // NHÓM C: DOCUMENT & REQUIREMENT
  // =========================================================================

  /**
   * 5. check_requirements: Kiểm tra xem hồ sơ đã đủ điều kiện đầu vào chưa
   */
  static async checkRequirements(requestId) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: {
          requestType: { include: { requirements: true } },
          documents: true,
        },
      });

      if (!request) return { complete: false, error: 'Không tìm thấy đơn.' };

      const inputData = request.inputData || {};
      const requirements = request.requestType.requirements;
      const passed = [];
      const missing = [];

      for (const req of requirements) {
        if (!req.isRequired) {
          passed.push({ code: req.code, name: req.name, status: 'OPTIONAL' });
          continue;
        }

        let isSatisfied = false;

        if (req.code === 'REQ_PURPOSE') {
          isSatisfied = Boolean(inputData.purpose && String(inputData.purpose).trim().length > 0);
        } else if (req.code === 'REQ_COURSE_CODE') {
          isSatisfied = Boolean(inputData.courseCode && String(inputData.courseCode).trim().length > 0);
        } else if (req.code === 'REQ_HOSPITAL_DOC') {
          const hasDoc = request.documents.some((d) => d.documentType === 'HOSPITAL_CERT') || Boolean(inputData.hasAttachment);
          isSatisfied = hasDoc;
        } else if (req.code === 'REQ_EXPLANATION') {
          isSatisfied = Boolean(inputData.explanation && String(inputData.explanation).trim().length > 0);
        } else {
          isSatisfied = true; // Các requirement tùy chọn khác
        }

        if (isSatisfied) {
          passed.push({ code: req.code, name: req.name, status: 'PASSED' });
        } else {
          missing.push({
            code: req.code,
            name: req.name,
            status: 'MISSING',
            description: req.description,
          });
        }
      }

      const complete = missing.length === 0;

      // Ghi log Audit
      await AuditLogService.recordLog({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'CHECK_REQUIREMENTS',
        decision: complete ? 'REQUIREMENTS_PASSED' : 'MISSING_REQUIREMENTS',
        reason: complete ? 'Tất cả các trường bắt buộc đã được cung cấp' : `Còn thiếu ${missing.length} thông tin bắt buộc`,
        inputSnapshot: { complete, missing: missing.map((m) => m.code) },
      });

      return {
        complete,
        passed,
        missing,
        message: complete
          ? 'Hồ sơ đã đầy đủ tất cả thông tin và chứng từ bắt buộc.'
          : `Hồ sơ còn thiếu: ${missing.map((m) => m.name).join(', ')}.`,
      };
    } catch (error) {
      return { complete: false, error: error.message };
    }
  }

  // =========================================================================
  // NHÓM D: POLICY & AUTHORITY
  // =========================================================================

  /**
   * 6. evaluate_policy: Thẩm định theo quy chế đào tạo (Academic Policies)
   */
  static async evaluatePolicy(requestId) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: {
          student: true,
          requestType: { include: { policies: true } },
        },
      });

      if (!request) return { decision: 'FAIL', error: 'Không tìm thấy đơn.' };

      const student = request.student;
      const inputData = request.inputData || {};

      if (request.requestType.code === 'STUDENT_CONFIRMATION') {
        const policyResult = evaluateStudentConfirmation({ student, inputData });
        const decision = policyResult.decision === TRACK_A_DECISION.ASK_CLARIFICATION
          ? 'NEEDS_INFO'
          : 'ESCALATE';

        await AuditLogService.recordLog({
          requestId: request.id,
          actorType: 'AI_AGENT',
          action: 'EVALUATE_POLICY',
          decision,
          reason: policyResult.reason,
          inputSnapshot: policyResult,
        });

        return {
          ...policyResult,
          policyDecision: policyResult.decision,
          decision,
          requiredRole: policyResult.targetRole || null,
          violations: decision === 'FAIL' ? [{ rule: policyResult.rule, reason: policyResult.reason }] : [],
          matchedRules: decision === 'PASS' ? [policyResult.rule] : [],
          message: policyResult.reason,
        };
      }

      const violations = [];
      const matchedRules = [];

      // Policy 1: Sinh viên phải có trạng thái ACTIVE
      if (student.status !== 'ACTIVE') {
        violations.push({
          rule: 'POL_STUDENT_ACTIVE',
          reason: `Sinh viên có trạng thái [${student.status}], không hợp lệ để cấp giấy tờ đào tạo.`,
        });
      } else {
        matchedRules.push('POL_STUDENT_ACTIVE');
      }

      // Policy 2: Không nợ học phí quá 10 triệu
      if (Number(student.tuitionDebt) > 10000000) {
        violations.push({
          rule: 'POL_NO_TUITION_DEBT',
          reason: `Sinh viên đang nợ học phí ${Number(student.tuitionDebt).toLocaleString('vi-VN')} đ (vượt trần 10.000.000 đ).`,
        });
      } else {
        matchedRules.push('POL_NO_TUITION_DEBT');
      }

      // Policy 3: Hạn chót phúc khảo 7 ngày
      if (request.requestType.code === 'GRADE_APPEAL') {
        const days = Number(inputData.daysAfterResult || 0);
        if (days > 7) {
          violations.push({
            rule: 'POL_APPEAL_DEADLINE_7DAYS',
            reason: `Đơn phúc khảo nộp trễ ${days} ngày sau khi có điểm (vượt quá 7 ngày quy định).`,
          });
        } else {
          matchedRules.push('POL_APPEAL_DEADLINE_7DAYS');
        }
      }

      const decision = violations.length === 0 ? 'PASS' : 'FAIL';

      // Ghi log Audit
      await AuditLogService.recordLog({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'EVALUATE_POLICY',
        decision,
        reason: decision === 'PASS' ? 'Thỏa mãn toàn bộ quy chế đào tạo' : `Vi phạm ${violations.length} quy định`,
        inputSnapshot: { decision, violations, matchedRules },
      });

      return {
        decision,
        violations,
        matchedRules,
        message:
          decision === 'PASS'
            ? 'Thẩm định quy chế thành công: Đạt chuẩn 100% quy định đào tạo.'
            : `Từ chối do vi phạm quy chế: ${violations.map((v) => v.reason).join(' ')}`,
      };
    } catch (error) {
      return { decision: 'FAIL', error: error.message };
    }
  }

  /**
   * 7. check_authority: Kiểm tra quyền hạn của Tác tử AI (Bounded Autonomy)
   */
  static async checkAuthority({ requestId, actor = 'AI_AGENT', action = 'ROUTE_TO_HUMAN' }) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: {
          requestType: { include: { authorityRules: true } },
          student: true,
        },
      });

      if (!request) return { allowed: false, error: 'Không tìm thấy đơn.' };

      const inputData = request.inputData || {};

      if (request.requestType.code === 'STUDENT_CONFIRMATION') {
        const policyResult = evaluateStudentConfirmation({ student: request.student, inputData });
        return {
          allowed: false,
          action: policyResult.decision === TRACK_A_DECISION.ASK_CLARIFICATION ? 'ASK_CLARIFICATION' : 'STAFF_REVIEW',
          requiredRole: 'STAFF',
          classification: policyResult.classification,
          reason: policyResult.reason,
          actionableQuestion: policyResult.actionableQuestion || 'Cán bộ Phòng Đào tạo kiểm tra hồ sơ và đưa ra quyết định cuối cùng?',
        };
      }

      // Chốt chặn chống ép quyền: Nếu user tự nhận có quyền, AI từ chối tự duyệt
      if (inputData.userClaimedOverride === true) {
        return {
          allowed: false,
          action: 'ESCALATE',
          requiredRole: 'STAFF',
          reason: 'BEYOND_AUTHORITY: Phát hiện yêu cầu can thiệp ngoại lệ. Tác tử AI không có quyền tự cấp phép cho các yêu cầu ép quyền.',
        };
      }

      // Tra cứu authority_rules để định tuyến đúng cấp con người.
      const rules = request.requestType.authorityRules;
      const deanRule = rules.find((rule) => rule.role === 'DEAN' && rule.active);
      const requiredRole = deanRule ? 'DEAN' : 'STAFF';
      return {
        allowed: false,
        action: requiredRole === 'DEAN' ? 'DEAN_APPROVAL' : 'STAFF_REVIEW',
        requiredRole,
        reason: `HUMAN_DECISION_REQUIRED: AI chỉ chuẩn bị và định tuyến hồ sơ [${request.requestType.name}]; cấp [${requiredRole}] quyết định.`,
      };
    } catch (error) {
      return { allowed: false, error: error.message };
    }
  }

  // =========================================================================
  // NHÓM E: ACTION / HUMAN-IN-THE-LOOP (HITL)
  // =========================================================================

  /** 8. process_request: Kiểm tra lại và chuyển hồ sơ cho con người quyết định. */
  static async processRequest(requestId) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: { student: true, requestType: true },
      });

      if (!request) throw new Error('Không tìm thấy hồ sơ đơn.');

      // State Guard: Chặn phê duyệt lại đơn đã xử lý xong
      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
        throw new Error(`Hồ sơ [${request.requestCode}] đã ở trạng thái [${request.status}], không thể xử lý lại.`);
      }

      const reqCheck = await this.checkRequirements(request.id);
      if (!reqCheck.complete) {
        return await this.askStudent({
          requestId: request.id,
          question: `Vui lòng bổ sung: ${reqCheck.missing.map((item) => item.name).join(', ')}.`,
        });
      }

      const policyCheck = await this.evaluatePolicy(request.id);
      const authCheck = await this.checkAuthority({ requestId: request.id });
      const requiredRole = authCheck.requiredRole === 'DEAN' ? 'DEAN' : 'STAFF';
      const policyFlag = policyCheck.decision === 'FAIL';
      const reason = policyFlag
        ? `AI phát hiện điều kiện cần cán bộ xem xét: ${policyCheck.message || 'Kết quả đối chiếu quy định chưa đạt.'}`
        : authCheck.reason || 'AI đã chuẩn bị đủ thông tin để cán bộ xem xét.';

      return await this.escalateRequest({
        requestId: request.id,
        reason,
        actionableQuestion: policyFlag
          ? 'Cán bộ xác nhận hướng xử lý cho điều kiện được AI gắn cờ?'
          : 'Cán bộ kiểm tra thông tin đã chuẩn bị và đưa ra quyết định cuối cùng?',
        requiredRole,
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 9. ask_student: Đổi trạng thái sang WAITING_STUDENT và gửi câu hỏi cụ thể
   */
  static async askStudent({ requestId, question }) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
      });

      if (!request) return { success: false, error: 'Không tìm thấy đơn.' };

      await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'ASK_STUDENT',
        decision: 'ASK_CLARIFICATION',
        reason: question,
        inputSnapshot: { question },
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
        status: 'WAITING_STUDENT',
        decision: 'ASK_CLARIFICATION',
        question,
        message: question,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 10. escalate_request: Chuyển tiếp hồ sơ lên Cán bộ PĐT / Lãnh đạo kèm Context Capsule
   */
  static async escalateRequest({ requestId, reason, actionableQuestion, requiredRole = 'STAFF' }) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: { student: true, requestType: true },
      });

      if (!request) return { success: false, error: 'Không tìm thấy đơn.' };

      const contextCapsule = {
        requestCode: request.requestCode,
        studentCode: request.student.studentCode,
        studentName: request.student.fullName,
        requestTypeName: request.requestType.name,
        reason,
        actionableQuestion,
        requiredRole,
        targetUnit: 'ACADEMIC_AFFAIRS',
        aiRecommendation: 'READY_FOR_HUMAN_REVIEW',
        escalatedAt: new Date().toISOString(),
      };

      const escalationDecision = requiredRole === 'DEAN' ? 'ESCALATE_TO_DEAN' : 'ESCALATE_TO_STAFF';

      await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'ESCALATE_REQUEST',
        decision: escalationDecision,
        reason,
        inputSnapshot: contextCapsule,
      }, async (tx) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'ESCALATED',
            decision: escalationDecision,
            escalationReason: reason,
            contextCapsule,
          },
        });
      });

      return {
        success: true,
        status: 'ESCALATED',
        decision: escalationDecision,
        requestCode: request.requestCode,
        requiredRole,
        actionableQuestion,
        contextCapsule,
        message: `Hồ sơ [${request.requestCode}] đã được chuyển tiếp lên ${requiredRole === 'DEAN' ? 'Trưởng phòng Đào tạo' : 'Chuyên viên PĐT'}. ${actionableQuestion}`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 11. staff_decision: Thao tác của con người (Cán bộ / Giám khảo duyệt hoặc từ chối đơn)
   */
  static async staffDecision({
    requestId,
    decision = 'APPROVE',
    reviewerNote = '',
    actorType = 'STAFF',
    actorId = null,
    staffName = 'Chuyên viên PĐT',
  }) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: { student: true },
      });

      if (!request) return { success: false, error: 'Không tìm thấy đơn.' };

      const approved = decision === 'APPROVE';
      const capsule = (typeof request.contextCapsule === 'object' && request.contextCapsule !== null)
        ? request.contextCapsule
        : {};
      const requiredRole = capsule.requiredRole || (request.decision === 'ESCALATE_TO_DEAN' ? 'DEAN' : 'STAFF');

      if (requiredRole === 'DEAN' && !['DEAN', 'ADMIN'].includes(actorType)) {
        return { success: false, error: 'Hồ sơ này yêu cầu quyền Trưởng Phòng Đào tạo. Chuyên viên không được phép quyết định.' };
      }
      if (actorId && !request.assignedStaffId) {
        return { success: false, error: 'Vui lòng nhận xử lý hồ sơ trước khi đưa ra quyết định.' };
      }
      if (request.assignedStaffId && actorId && request.assignedStaffId !== actorId && actorType !== 'ADMIN') {
        return { success: false, error: 'Hồ sơ đang được một cán bộ khác xử lý. Vui lòng làm mới hàng đợi.' };
      }

      // State Guard: Chặn thao tác trùng lặp hoặc trên đơn đã hủy
      if (request.status === 'CANCELLED') {
        return { success: false, error: `Hồ sơ [${request.requestCode}] đã bị thu hồi/hủy bỏ, không thể phê duyệt.` };
      }
      if (approved && request.status === 'APPROVED') {
        return { success: false, error: `Hồ sơ [${request.requestCode}] đã được phê duyệt trước đó.` };
      }
      if (!approved && request.status === 'REJECTED') {
        return { success: false, error: `Hồ sơ [${request.requestCode}] đã bị từ chối trước đó.` };
      }

      // State Guard: Cán bộ chỉ được quyết định hồ sơ đã được AI chuyển tiếp.
      // WAITING_STUDENT chưa đủ dữ kiện nên tuyệt đối không được duyệt tắt.
      if (request.status !== 'ESCALATED') {
        return {
          success: false,
          error: `Hồ sơ [${request.requestCode}] đang ở trạng thái [${request.status}] — chưa được AI thẩm định chuyển tiếp lên thẩm quyền con người.`,
        };
      }

      const newStatus = approved ? 'APPROVED' : 'REJECTED';
      const qrCodeUrl = approved
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EDUREF_STAFF_APPROVED_${request.requestCode}`
        : null;

      const beforeState = { status: request.status, qrCodeUrl: request.qrCodeUrl };

      // Cập nhật contextCapsule với ghi chú phê duyệt của Cán bộ / Trưởng khoa
      const existingCapsule = capsule;

      const finalReviewerNote = reviewerNote?.trim() || (approved ? 'Hồ sơ hợp lệ, đồng ý phê duyệt.' : 'Từ chối tiếp nhận hồ sơ.');
      const updatedCapsule = {
        ...existingCapsule,
        reviewerNote: finalReviewerNote,
        reviewedBy: staffName,
        reviewedAt: new Date().toISOString(),
      };

      // Bảo toàn lý do vượt quyền ban đầu của AI (AI Escalation Reason)
      const preservedEscalationReason = existingCapsule.reason || request.escalationReason || 'Thủ tục thuộc thẩm quyền phê duyệt của Cán bộ / Trưởng khoa';

      const auditLog = await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType,
        action: approved ? 'STAFF_APPROVE_REQUEST' : 'STAFF_REJECT_REQUEST',
        decision: newStatus,
        reason: reviewerNote || (approved ? `Cán bộ ${staffName} phê duyệt hồ sơ` : `Cán bộ ${staffName} từ chối hồ sơ`),
        inputSnapshot: { requestId, decision, reviewerNote, staffName },
        beforeState,
        afterState: { status: newStatus, qrCodeUrl },
      }, async (tx, log) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: newStatus,
            decision: approved ? 'STAFF_MANUAL_APPROVED' : 'STAFF_MANUAL_REJECTED',
            qrCodeUrl,
            sha256Proof: log.sha256Hash,
            assignedStaffId: actorId || request.assignedStaffId,
            escalationReason: preservedEscalationReason,
            contextCapsule: updatedCapsule,
          },
        });
      });

      return {
        success: true,
        requestId: request.id,
        requestCode: request.requestCode,
        studentId: request.studentId,
        studentCode: request.student?.studentCode,
        status: newStatus,
        qrCodeUrl,
        sha256Proof: auditLog?.sha256Hash,
        message: approved
          ? `Cán bộ [${staffName}] đã phê duyệt thành công đơn [${request.requestCode}].`
          : `Cán bộ [${staffName}] đã từ chối đơn [${request.requestCode}]. Lý do: ${reviewerNote}`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // NHÓM F: OBSERVABILITY & HUMAN OVERRIDE (HOÀN TÁC / CAN THIỆP GHI ĐÈ)
  // =========================================================================

  /**
   * 12. rollback_request: Con người can thiệp dừng hoặc ghi đè (Human Override / Stop & Rollback)
   */
  static async rollbackRequest({
    requestId,
    requestCode,
    reason = 'Can thiệp dừng và ghi đè bởi Quản trị viên',
    actorType = 'STAFF',
    actorId = null,
    staffName = 'Giám khảo / Cán bộ Quản lý',
  }) {
    try {
      const searchTarget = requestId || requestCode;
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: searchTarget }, { requestCode: searchTarget }] },
      });

      if (!request) return { success: false, message: `Không tìm thấy hồ sơ đơn: ${searchTarget}` };

      const capsule = request.contextCapsule && typeof request.contextCapsule === 'object'
        ? request.contextCapsule
        : {};
      const requiredRole = capsule.requiredRole || (request.decision === 'ESCALATE_TO_DEAN' ? 'DEAN' : 'STAFF');
      if (actorType === 'STAFF' && requiredRole === 'DEAN') {
        return { success: false, error: 'Hồ sơ này thuộc thẩm quyền Trưởng Phòng Đào tạo. Chuyên viên không thể thu hồi.' };
      }
      if (actorType === 'STAFF' && (!actorId || request.assignedStaffId !== actorId)) {
        return { success: false, error: 'Chuyên viên chỉ có thể thu hồi hồ sơ do chính mình phụ trách.' };
      }

      // State Guard: Chặn hoàn tác lại đơn đã bị hủy từ trước
      if (request.status === 'CANCELLED') {
        return { success: false, message: `Hồ sơ [${request.requestCode}] vốn đã ở trạng thái thu hồi / hủy bỏ từ trước.` };
      }

      const beforeState = { status: request.status, qrCodeUrl: request.qrCodeUrl };

      const auditLog = await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType,
        action: 'HUMAN_OVERRIDE_ROLLBACK',
        decision: 'CANCELLED',
        reason,
        inputSnapshot: { searchTarget, reason, staffName },
        beforeState,
        afterState: { status: 'CANCELLED', qrCodeUrl: null },
      }, async (tx, log) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'CANCELLED',
            decision: 'HUMAN_OVERRIDE_CANCELLED',
            qrCodeUrl: null,
            sha256Proof: log.sha256Hash,
            escalationReason: `Hoàn tác / Can thiệp ghi đè bởi [${staffName}]: ${reason}`,
          },
        });
      });

      return {
        success: true,
        requestId: request.id,
        requestCode: request.requestCode,
        studentId: request.studentId,
        previousStatus: beforeState.status,
        currentStatus: 'CANCELLED',
        sha256Proof: auditLog?.sha256Hash,
        message: `Đã hoàn tác / thu hồi thành công đơn [${request.requestCode}]. Mã chứng thực số và QR Code đã bị vô hiệu hóa hoàn toàn.`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 13. get_execution_trace: Lấy chuỗi lịch sử thực thi của đơn phục vụ Live Terminal
   */
  static async getExecutionTrace(requestId) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          OR: [{ requestId }, { request: { requestCode: requestId } }],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          action: true,
          decision: true,
          reason: true,
          actorType: true,
          createdAt: true,
        },
      });

      return {
        trace: logs.map((l, index) => ({
          step: `[0${index + 1}]`,
          action: l.action,
          decision: l.decision,
          reason: l.reason,
          actor: l.actorType,
          timestamp: l.createdAt,
        })),
      };
    } catch (error) {
      return { trace: [], error: error.message };
    }
  }
}

export default AcademicWorkflowService;
