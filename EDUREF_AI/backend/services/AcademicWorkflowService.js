import prisma from '../config/prisma.js';
import AuditLogService from './AuditLogService.js';
import { getStudentFullProfile } from '../config/studentRegistry.js';
import {
  evaluateStudentConfirmation,
  detectFormIntent,
  detectCrossFormMismatch,
  validatePermanentAddress,
  getFormFieldsGuide,
  TRACK_A_DECISION,
} from './StudentConfirmationDecisionService.js';

class AcademicWorkflowService {
  /**
   * ⚡ FAST-PATH MASTER TOOL: Xử lý trọn gói quy trình Cấp Giấy Xác Nhận Sinh Viên trong 1 bước duy nhất (5 Biểu Mẫu Chuẩn HUTECH)
   */
  static async processStudentConfirmation({
    studentCode,
    formCode = null,
    purpose = '',
    pickupCampus = '',
    permanentAddress = null,
    debtCourses = null,
    phone = null,
    idCard = null,
    studentClass = null,
    reissueReason = null,
    existingApprovedCount = null,
    inputData = {},
    conversationHistory = [],
    sessionId = null,
  }) {
    const startTime = Date.now();
    try {
      const finalPurpose = String(purpose || inputData?.purpose || inputData?.reason || '').trim();
      const detectedForm = detectFormIntent(finalPurpose);
      const activeFormCode = formCode || inputData?.formCode || (detectedForm ? detectedForm.code : 'GENERAL_CONFIRMATION');

      // 0. NẠP HỒ SƠ SINH VIÊN TỪ DATABASE NGAY TỪ ĐẦU (SINGLE SOURCE OF TRUTH)
      let studentRec = null;
      try {
        studentRec = await prisma.student.findUnique({
          where: { studentCode: String(studentCode).trim() },
          include: { department: true },
        });
      } catch (_e) {
        // Fallback cho môi trường test memory
        studentRec = inputData?.student || null;
      }

      // 0.1. CHỐT CHẶN BẢO LƯU / THÔI HỌC (SƠ ĐỒ .MDJ: REJECT NGAY LẬP TỨC - KHÔNG BYPASS BẤT KỲ LÝ DO NÀO)
      if (studentRec?.status === 'SUSPENDED') {
        return {
          success: true,
          decision: TRACK_A_DECISION.AUTO_REJECT,
          status: 'REJECTED',
          classification: 'ROUTINE_POLICY_DENY',
          formCode: activeFormCode,
          rule: 'POL_SUSPENDED_STUDENT_DENY',
          message: 'Theo quy chế đào tạo của Nhà trường, sinh viên đang trong thời gian bảo lưu kết quả học tập không đủ điều kiện cấp Giấy xác nhận sinh viên hay Biểu mẫu nợ môn. Yêu cầu bị từ chối và không được bypass vì bất kỳ lý do nào. Vui lòng gặp trực tiếp Phòng Công tác Sinh viên (A-01.01) để được hướng dẫn thêm.',
          actionableQuestion: 'Theo quy chế đào tạo, sinh viên đang trong thời gian bảo lưu kết quả học tập không đủ điều kiện cấp giấy xác nhận. Vui lòng liên hệ trực tiếp Phòng Công tác Sinh viên (A-01.01).',
        };
      }

      if (studentRec?.status === 'DROPPED') {
        return {
          success: true,
          decision: TRACK_A_DECISION.AUTO_REJECT,
          status: 'REJECTED',
          classification: 'ROUTINE_POLICY_DENY',
          formCode: activeFormCode,
          rule: 'POL_DROPPED_STUDENT_DENY',
          message: 'Theo quy chế đào tạo của Nhà trường, sinh viên đã thôi học / xóa tên không thuộc diện cấp Giấy xác nhận sinh viên. Yêu cầu bị từ chối và không được bypass vì bất kỳ lý do nào.',
          actionableQuestion: 'Theo quy chế đào tạo, sinh viên đã thôi học không thuộc diện cấp giấy xác nhận.',
        };
      }

      // 1. Kiểm tra bắt buộc: Mục đích sử dụng giấy xác nhận
      if (!finalPurpose) {
        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          status: 'WAITING_STUDENT',
          classification: 'UNKNOWN_FACT',
          uncertaintyType: 'UNKNOWN_FACT',
          actionableQuestion:
            'Bạn cần cấp giấy xác nhận sinh viên cho mục đích nào:\n' +
            '1. Tạm hoãn nghĩa vụ quân sự (MILITARY_DEFERMENT)\n' +
            '2. Vay vốn ngân hàng chính sách xã hội (BANK_LOAN)\n' +
            '3. Giảm trừ thuế thu nhập cá nhân (TAX_DEDUCTION)\n' +
            '4. Biểu mẫu nợ môn / Tiếp tục học tập (COURSE_DEBT)\n' +
            '5. Xác nhận sinh viên chung: vé xe buýt, học bổng, visa (GENERAL_CONFIRMATION)?\n\n' +
            '👉 Bạn có thể bấm chọn mục tương ứng ở danh mục bên tay trái hoặc nhắn trực tiếp cho mình nhé!',
          message: 'Vui lòng cung cấp mục đích sử dụng Giấy xác nhận sinh viên.',
        };
      }

      // 1.1. CHỐT CHẶN PHÁT HIỆN LỆCH BIỂU MẪU (CROSS-FORM MISMATCH CẢ ĐƠN LƯỢT VÀ ĐA LƯỢT HỘI THOẠI)
      // Truyền đúng hồ sơ studentRec để không nhầm sinh viên bảo lưu/thôi học sang nợ môn
      const mismatch = detectCrossFormMismatch({
        currentFormCode: activeFormCode,
        text: finalPurpose,
        student: studentRec || { studentCode: String(studentCode).trim() },
        inputData: { ...inputData, purpose: finalPurpose, formCode: activeFormCode },
        conversationHistory,
        sessionId,
      });

      if (mismatch.isMismatch) {
        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          status: 'WAITING_STUDENT',
          classification: 'UNKNOWN_FACT',
          uncertaintyType: 'UNKNOWN_FACT',
          actionableQuestion: mismatch.guidanceMessage,
          message: mismatch.reason,
          formCode: activeFormCode,
        };
      }

      // 1.2. CHỐT CHẶN HẠN NGẠCH CẤP GIẤY & KẾ THỪA THÔNG MINH (SMART PREFILL) KHI CẤP LẦN 2
      let historyRequests = [];
      if (studentRec?.id) {
        try {
          historyRequests = await prisma.studentRequest.findMany({
            where: {
              studentId: studentRec.id,
              requestType: { code: 'STUDENT_CONFIRMATION' },
              status: { in: ['APPROVED', 'COMPLETED', 'ESCALATED'] },
            },
            select: { id: true, requestCode: true, status: true, inputData: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          });
        } catch (_e) {
          historyRequests = inputData?.historyRequests || [];
        }
      } else {
        historyRequests = inputData?.historyRequests || [];
      }

      // Tìm đơn đã duyệt gần nhất của cùng biểu mẫu này để kế thừa dữ liệu
      // Tìm đơn đã duyệt gần nhất của cùng biểu mẫu này để kiểm tra hạn ngạch cấp lại
      const previousApproved = historyRequests.find(
        (r) => ['APPROVED', 'COMPLETED'].includes(r.status) &&
               (r.inputData?.formCode || 'GENERAL_CONFIRMATION') === activeFormCode
      );

      // 2. Kiểm tra cơ sở nhận giấy (ZERO-TOLERANCE GUARD - CẤM KẾ THỪA TỪ ĐƠN CŨ, CẤM DEFAULT)
      const campusRaw = String(
        pickupCampus || inputData?.pickupCampus || inputData?.campus || ''
      ).trim();

      const isThuDuc = /thủ đức|thu duc|e1/i.test(campusRaw);
      const isSaiGon = /sài gòn|sai gon|a-01|điện biên phủ|ung văn khiêm|trụ sở/i.test(campusRaw);

      if (!campusRaw || (!isThuDuc && !isSaiGon)) {
        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          status: 'WAITING_STUDENT',
          classification: 'UNKNOWN_FACT',
          uncertaintyType: 'UNKNOWN_FACT',
          actionableQuestion:
            'Để Nhà trường chuẩn bị bản cứng có chữ ký sống và mộc đỏ của Phòng CTSV, bạn vui lòng chọn 1 trong 2 cơ sở sau để nhận giấy nhé:\n' +
            '1. 🏢 Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)\n' +
            '2. 🏢 Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)',
          message: 'Dạ, hệ thống đã tiếp nhận yêu cầu xin cấp Giấy xác nhận sinh viên của bạn. Vui lòng chọn cơ sở nhận giấy bản cứng.',
        };
      }

      const normalizedCampus = isThuDuc
        ? 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)'
        : 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)';

      // 1.3. SINGLE SOURCE OF TRUTH: Chỉ lấy thông tin định danh tĩnh (MSSV, Họ tên, Ngày sinh, Khoa, Ngành)
      const fullProfile = getStudentFullProfile(studentCode, studentRec || inputData);

      // CÁC TRƯỜNG DỮ LIỆU ĐƠN: TUYỆT ĐỐI KHÔNG KẾ THỪA TỪ ĐƠN CŨ, KHÔNG FALLBACK TỪ FULLPROFILE
      const resolvedAddress = permanentAddress || inputData?.permanentAddress || inputData?.address || null;
      const resolvedRecipientAgency = inputData?.recipientAgency || null;
      const resolvedDebtCourses = debtCourses || inputData?.debtCourses || null;
      const resolvedPhone = phone || inputData?.phone || null;
      const resolvedIdCard = idCard || inputData?.idCard || fullProfile.idCard;
      const resolvedStudentClass = studentClass || inputData?.studentClass || inputData?.class || fullProfile.studentClass;

      // 2.1. Kiểm tra bắt buộc: Số điện thoại liên lạc hợp lệ (10 số)
      const phoneClean = String(resolvedPhone || '').replace(/[\s\.\-\+]/g, '');
      const isValidPhone = /^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phoneClean);
      if (!isValidPhone) {
        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          status: 'WAITING_STUDENT',
          classification: 'UNKNOWN_FACT',
          uncertaintyType: 'UNKNOWN_FACT',
          actionableQuestion: 'Để Nhà trường có thể liên hệ thông báo khi bản cứng được ký mộc, bạn vui lòng cung cấp số điện thoại di động chính xác (10 chữ số, ví dụ: 0901234567) nhé!',
          message: resolvedPhone ? 'Số điện thoại không đúng chuẩn di động Việt Nam (10 chữ số).' : 'Vui lòng cung cấp số điện thoại liên lạc.',
        };
      }

      // 2.2. Kiểm tra bắt buộc: Địa chỉ thường trú 4 cấp Title Case cho Biểu mẫu NVQS & Giảm thuế
      if (['MILITARY_DEFERMENT', 'TAX_DEDUCTION'].includes(activeFormCode)) {
        if (!resolvedAddress) {
          return {
            success: true,
            decision: 'ASK_CLARIFICATION',
            status: 'WAITING_STUDENT',
            classification: 'UNKNOWN_FACT',
            uncertaintyType: 'UNKNOWN_FACT',
            actionableQuestion: 'Dạ Thầy cô Phòng CTSV lưu ý biểu mẫu này bắt buộc phải có địa chỉ thường trú đầy đủ 4 cấp hành chính (Số nhà/đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố) và viết hoa đúng chuẩn (Ví dụ: "Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu"). Bạn vui lòng cung cấp địa chỉ hộ khẩu thường trú nhé!',
            message: 'Thiếu thông tin địa chỉ hộ khẩu thường trú bắt buộc.',
          };
        }

        const addressCheck = validatePermanentAddress(resolvedAddress);
        if (!addressCheck.isValid) {
          return {
            success: true,
            decision: 'ASK_CLARIFICATION',
            status: 'WAITING_STUDENT',
            classification: 'UNKNOWN_FACT',
            uncertaintyType: 'UNKNOWN_FACT',
            actionableQuestion: `Dạ Thầy cô Phòng CTSV lưu ý: ${addressCheck.reason}\n\nBạn vui lòng điều chỉnh lại địa chỉ ghi rõ đủ 4 cấp hành chính và viết hoa chữ cái đầu (Ví dụ: "Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu") để được cấp giấy hợp lệ nhé!`,
            message: addressCheck.reason,
          };
        }
      }

      // 1.2. CHỐT CHẶN HẠN NGẠCH CẤP GIẤY LẦN 2 (REISSUE GUARD)
      const effectiveApprovedCount = existingApprovedCount !== null && existingApprovedCount !== undefined
        ? Number(existingApprovedCount)
        : (inputData?.existingApprovedCount !== undefined
            ? Number(inputData.existingApprovedCount)
            : historyRequests.filter(
                (r) => ['APPROVED', 'COMPLETED', 'ESCALATED'].includes(r.status) &&
                       (r.inputData?.formCode || 'GENERAL_CONFIRMATION') === activeFormCode
              ).length);

      const isReissueCase = effectiveApprovedCount >= 1;
      const finalReissueReason = String(reissueReason || inputData?.reissueReason || inputData?.repeatReason || inputData?.explanation || '').trim();

      if (isReissueCase && !finalReissueReason) {
        return {
          success: true,
          decision: 'ASK_CLARIFICATION',
          status: 'WAITING_STUDENT',
          classification: 'UNKNOWN_FACT',
          uncertaintyType: 'UNKNOWN_FACT',
          actionableQuestion:
            `Dạ hệ thống ghi nhận bạn đã được cấp Giấy xác nhận cho biểu mẫu này trong học kỳ này rồi. Theo quy chế của Phòng CTSV, mỗi học kỳ sinh viên chỉ được cấp 1 bản cho mỗi biểu mẫu. Để xin cấp lại lần 2, bạn vui lòng cung cấp lý do chính đáng (ví dụ: bị mất giấy, bị rách, nộp bổ sung cho cơ quan thứ 2...) để Cán bộ Phòng CTSV/PĐT xem xét nhé!`,
          message: 'Xin cấp lại lần 2 bắt buộc phải giải trình lý do chính đáng.',
          formCode: activeFormCode,
        };
      }

      const payload = {
        // Hồ sơ nhân thân chuẩn hóa cố định (Single Source of Truth)
        fullName: inputData?.fullName || fullProfile.fullName,
        studentCode: String(studentCode || fullProfile.studentCode).trim(),
        birthDate: inputData?.birthDate || fullProfile.birthDate,
        gender: inputData?.gender || fullProfile.gender,
        studentClass: resolvedStudentClass,
        faculty: inputData?.faculty || fullProfile.faculty,
        major: inputData?.major || fullProfile.major,
        phone: resolvedPhone,
        idCard: resolvedIdCard,
        idCardDate: inputData?.idCardDate || fullProfile.idCardDate,
        idCardPlace: inputData?.idCardPlace || fullProfile.idCardPlace,
        permanentAddress: resolvedAddress,
        recipientAgency: resolvedRecipientAgency,
        pickupCampus: normalizedCampus,
        debtCourses: resolvedDebtCourses,
        ...inputData,
        formCode: activeFormCode,
        purpose: finalPurpose,
        historyRequests,
        existingApprovedCount: effectiveApprovedCount,
        isReissue: isReissueCase,
        reissueReason: finalReissueReason,
        originalRequestId: previousApproved?.id || null,
        originalRequestCode: previousApproved?.requestCode || null,
        originalApprovedAt: previousApproved?.createdAt || null,
        conversationHistory,
        sessionId,
      };

      // ⚡ GỌI TRỰC TIẾP QUA PETITION WORKFLOW CORE DUY NHẤT (SINGLE SOURCE OF TRUTH)
      const { default: petitionWorkflowCore } = await import('../modules/petition-core/PetitionWorkflowCore.js');
      const coreResult = await petitionWorkflowCore.processPetitionWorkflow({
        studentCode: String(studentCode).trim(),
        requestTypeCode: 'STUDENT_CONFIRMATION',
        inputData: payload,
        forceNewRequest: true,
        actorType: 'AI_AGENT',
      });

      return {
        ...coreResult,
        formCode: activeFormCode,
        actionableQuestion: coreResult.question || coreResult.actionableQuestion || coreResult.contextCapsule?.actionableQuestion,
      };
    } catch (err) {
      console.error('❌ [processStudentConfirmation] Lỗi:', err);
      return { success: false, error: err.message };
    }
  }

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

      const fullProfile = getStudentFullProfile(studentCode, student);
      const finalInputData = {
        fullName: inputData?.fullName || fullProfile.fullName,
        studentCode: String(studentCode || fullProfile.studentCode).trim(),
        birthDate: inputData?.birthDate || fullProfile.birthDate,
        gender: inputData?.gender || fullProfile.gender,
        studentClass: inputData?.studentClass || fullProfile.studentClass,
        faculty: inputData?.faculty || fullProfile.faculty,
        major: inputData?.major || fullProfile.major,
        phone: inputData?.phone || fullProfile.phone,
        idCard: inputData?.idCard || fullProfile.idCard,
        idCardDate: inputData?.idCardDate || fullProfile.idCardDate,
        idCardPlace: inputData?.idCardPlace || fullProfile.idCardPlace,
        permanentAddress: inputData?.permanentAddress || fullProfile.permanentAddress,
        pickupCampus: inputData?.pickupCampus || 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
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
      const requestCode = `XNSV-${randomSuffix}`;

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
        const decision = policyResult.decision === TRACK_A_DECISION.AUTO_APPROVE
          ? 'PASS'
          : policyResult.decision === TRACK_A_DECISION.AUTO_REJECT
            ? 'FAIL'
            : policyResult.decision === TRACK_A_DECISION.ASK_CLARIFICATION
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
  static async checkAuthority({ requestId, actor = 'AI_AGENT', action = 'AUTO_APPROVE' }) {
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
        if (policyResult.decision === TRACK_A_DECISION.AUTO_APPROVE) {
          return {
            allowed: true,
            action: 'AUTO_APPROVE',
            requiredRole: 'AI_AGENT',
            classification: policyResult.classification,
            reason: policyResult.reason,
          };
        }

        return {
          allowed: false,
          action: policyResult.decision === TRACK_A_DECISION.ASK_CLARIFICATION ? 'ASK_CLARIFICATION' : 'ESCALATE',
          requiredRole: policyResult.requiredRole || 'STAFF',
          classification: policyResult.classification,
          reason: policyResult.reason,
          actionableQuestion: policyResult.actionableQuestion,
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

      // Tra cứu authority_rules trong DB cho requestType này
      const rules = request.requestType.authorityRules;
      const agentRule = rules.find((r) => r.role === 'AI_AGENT' && r.active);

      // Nếu loại đơn chỉ cho phép STAFF hoặc DEAN
      if (!agentRule || agentRule.action !== 'AUTO_APPROVE') {
        const staffRule = rules.find((r) => r.role === 'STAFF');
        const deanRule = rules.find((r) => r.role === 'DEAN');
        const requiredRole = deanRule ? 'DEAN' : staffRule ? 'STAFF' : 'STAFF';

        return {
          allowed: false,
          action: 'ESCALATE',
          requiredRole,
          reason: `HIGH_AUTHORITY_REQUIRED: Loại thủ tục [${request.requestType.name}] thuộc thẩm quyền phê duyệt của [${requiredRole}]. Tác tử AI không được tự động duyệt.`,
        };
      }

      // Nếu agent có quyền tự duyệt
      return {
        allowed: true,
        action: 'AUTO_APPROVE',
        requiredRole: 'AI_AGENT',
        reason: 'ROUTINE_AUTO: Đơn thuộc thẩm quyền tự xử lý của Tác tử AI.',
      };
    } catch (error) {
      return { allowed: false, error: error.message };
    }
  }

  // =========================================================================
  // NHÓM E: ACTION / HUMAN-IN-THE-LOOP (HITL)
  // =========================================================================

  /**
   * 8. process_request: Thực thi duyệt tự động (Backend Security Re-check)
   */
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

      const beforeState = { status: request.status, qrCodeUrl: request.qrCodeUrl };

      // Backend an toàn tự động re-check trước khi mutation
      const reqCheck = await this.checkRequirements(request.id);
      if (!reqCheck.complete) {
        throw new Error(`Không thể duyệt đơn: Còn thiếu thông tin [${reqCheck.missing.map((m) => m.name).join(', ')}]`);
      }

      const policyCheck = await this.evaluatePolicy(request.id);
      if (policyCheck.decision !== 'PASS') {
        throw new Error(`Không thể duyệt đơn: Vi phạm quy chế đào tạo`);
      }

      const authCheck = await this.checkAuthority({ requestId: request.id });
      if (!authCheck.allowed) {
        throw new Error(`Không thể duyệt đơn: Vượt thẩm quyền của Tác tử AI`);
      }

      // Tạo mã QR chứng thực số
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EDUREF_VERIFIED_${request.requestCode}_${request.student.studentCode}`;

      // Ghi log Audit với chữ ký SHA-256
      const auditLog = await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'PROCESS_REQUEST_AUTO_APPROVE',
        decision: 'APPROVED',
        reason: 'Tác tử tự động phê duyệt thành công sau khi vượt qua tất cả các chốt chặn',
        inputSnapshot: request.inputData,
        beforeState,
        afterState: { status: 'APPROVED', qrCodeUrl },
      }, async (tx, log) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'APPROVED',
            decision: 'ROUTINE_AUTO_APPROVED',
            qrCodeUrl,
            sha256Proof: log.sha256Hash,
          },
        });
      });

      return {
        success: true,
        status: 'APPROVED',
        decision: 'AUTO_APPROVED',
        requestCode: request.requestCode,
        studentName: request.student.fullName,
        studentCode: request.student.studentCode,
        requestTypeName: request.requestType.name,
        qrCodeUrl,
        sha256Proof: auditLog?.sha256Hash,
        message: `Đơn [${request.requestCode}] đã được EduRef AI tự động phê duyệt thành công. Mã QR chứng thực số đã sẵn sàng.`,
      };
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
        escalatedAt: new Date().toISOString(),
      };

      await AuditLogService.recordLogWithMutation({
        requestId: request.id,
        actorType: 'AI_AGENT',
        action: 'ESCALATE_REQUEST',
        decision: 'ESCALATED_PENDING',
        reason,
        inputSnapshot: contextCapsule,
      }, async (tx) => {
        await tx.studentRequest.update({
          where: { id: request.id },
          data: {
            status: 'ESCALATED',
            decision: 'ESCALATED_PENDING',
            escalationReason: reason,
            contextCapsule,
          },
        });
      });

      return {
        success: true,
        status: 'ESCALATED',
        decision: 'ESCALATED_PENDING',
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
    staffName = 'Chuyên viên PĐT',
  }) {
    try {
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: requestId }, { requestCode: requestId }] },
        include: { student: true },
      });

      if (!request) return { success: false, error: 'Không tìm thấy đơn.' };

      const approved = decision === 'APPROVE';

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
      const existingCapsule = (typeof request.contextCapsule === 'object' && request.contextCapsule !== null)
        ? request.contextCapsule
        : {};

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
            escalationReason: preservedEscalationReason,
            contextCapsule: updatedCapsule,
          },
        });
      });

      return {
        success: true,
        requestCode: request.requestCode,
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
    staffName = 'Giám khảo / Cán bộ Quản lý',
  }) {
    try {
      const searchTarget = requestId || requestCode;
      const request = await prisma.studentRequest.findFirst({
        where: { OR: [{ id: searchTarget }, { requestCode: searchTarget }] },
      });

      if (!request) return { success: false, message: `Không tìm thấy hồ sơ đơn: ${searchTarget}` };

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
        requestCode: request.requestCode,
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
