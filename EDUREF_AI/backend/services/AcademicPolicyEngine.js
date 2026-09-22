import prisma from '../config/prisma.js';

class AcademicPolicyEngine {
  /**
   * Thẩm định yêu cầu sinh viên qua 4 Chốt Chặn Quy Chế Cứng
   * @param {Object} params
   * @param {Object} params.student - Đối tượng sinh viên từ DB
   * @param {Object} params.requestType - Đối tượng loại thủ tục từ DB
   * @param {Object} params.inputData - Dữ liệu bóc tách từ yêu cầu (mục đích, file đính kèm, cờ ép quyền...)
   */
  static async evaluateRequest({ student, requestType, inputData = {} }) {
    const startTime = Date.now();

    // =========================================================================
    // CHỐT CHẶN 1: KIỂM TRA YÊU CẦU BẮT BUỘC (MISSING FACTUAL INFORMATION)
    // =========================================================================
    const requirements = await prisma.requirement.findMany({
      where: { requestTypeId: requestType.id, isRequired: true },
    });

    for (const req of requirements) {
      // 1.1. Kiểm tra mục đích sử dụng (Ví dụ: Giấy xác nhận SV)
      if (req.code === 'REQ_PURPOSE') {
        const purpose = inputData.purpose || inputData.targetPurpose;
        if (!purpose || String(purpose).trim().length === 0) {
          return {
            decision: 'ASK_CLARIFICATION',
            uncertaintyType: 'MISSING_FACTUAL_INFO',
            missingField: 'purpose',
            actionableQuestion:
              'Bạn cần giấy xác nhận cho mục đích nào: vay vốn ngân hàng chính sách, tạm hoãn nghĩa vụ quân sự hay làm vé xe buýt?',
            reason: `Thiếu thông tin bắt buộc [${req.name}]. Cần hỏi người dùng để hoàn thiện dữ kiện.`,
            decisionTimeMs: Date.now() - startTime,
          };
        }
      }

      // 1.2. Kiểm tra chứng từ y tế / bệnh án (Ví dụ: Đơn xin hoãn thi)
      if (req.code === 'REQ_HOSPITAL_DOC') {
        const hasDoc = inputData.hasAttachment || inputData.hospitalDocUrl || inputData.hasHospitalDoc;
        if (!hasDoc) {
          return {
            decision: 'ASK_CLARIFICATION',
            uncertaintyType: 'MISSING_FACTUAL_INFO',
            missingField: 'hospitalDoc',
            actionableQuestion:
              'Vui lòng tải lên ảnh chụp Giấy khám bệnh hoặc Giấy ra viện có dấu mộc của bệnh viện (tuyến quận/huyện trở lên) để hoàn thiện hồ sơ hoãn thi?',
            reason: `Thiếu minh chứng bắt buộc [${req.name}]. Hoãn thi không thể tự động xử lý khi thiếu giấy viện.`,
            decisionTimeMs: Date.now() - startTime,
          };
        }
      }

      // 1.3. Kiểm tra mã môn học (Ví dụ: Hoãn thi, Phúc khảo)
      if (req.code === 'REQ_COURSE_CODE') {
        const course = inputData.courseCode || inputData.subjectCode;
        if (!course) {
          return {
            decision: 'ASK_CLARIFICATION',
            uncertaintyType: 'MISSING_FACTUAL_INFO',
            missingField: 'courseCode',
            actionableQuestion: 'Vui lòng cho biết Mã môn học hoặc Tên môn học bạn muốn làm đơn?',
            reason: `Thiếu thông tin mã môn học bắt buộc.`,
            decisionTimeMs: Date.now() - startTime,
          };
        }
      }
    }

    // =========================================================================
    // CHỐT CHẶN 2: KIỂM TRA QUY CHẾ ĐÀO TẠO (OUTSIDE POLICY VIOLATION)
    // =========================================================================
    // 2.1. Kiểm tra trạng thái học tập của sinh viên
    if (student.status === 'DROPPED') {
      return {
        decision: 'OUT_OF_POLICY',
        uncertaintyType: 'OUTSIDE_POLICY',
        policyCode: 'POL_STUDENT_ACTIVE',
        reason: 'Sinh viên đã có quyết định buộc thôi học (DROPPED). Vi phạm Điều 3 Quy chế quản lý sinh viên.',
        userMessage:
          'Hệ thống từ chối xử lý: Bạn hiện không còn là sinh viên đang học (Trạng thái: Đã thôi học). Theo quy định, nhà trường chỉ cấp giấy tờ cho sinh viên đang học hợp lệ.',
        decisionTimeMs: Date.now() - startTime,
      };
    }

    if (student.status === 'SUSPENDED') {
      return {
        decision: 'OUT_OF_POLICY',
        uncertaintyType: 'OUTSIDE_POLICY',
        policyCode: 'POL_STUDENT_ACTIVE',
        reason: 'Sinh viên đang trong thời gian bị đình chỉ học tập (SUSPENDED).',
        userMessage: 'Hồ sơ bị tạm dừng: Tài khoản của bạn đang bị đình chỉ học tập theo quyết định kỷ luật.',
        decisionTimeMs: Date.now() - startTime,
      };
    }

    // 2.2. Kiểm tra quy định nợ học phí
    if (Number(student.tuitionDebt) > 10000000) {
      return {
        decision: 'OUT_OF_POLICY',
        uncertaintyType: 'OUTSIDE_POLICY',
        policyCode: 'POL_NO_TUITION_DEBT',
        reason: `Sinh viên đang nợ học phí quá hạn ${Number(student.tuitionDebt).toLocaleString('vi-VN')} đ (vượt trần 10.000.000 đ).`,
        userMessage: `Yêu cầu bị chặn: Bạn đang nợ học phí quá hạn ${Number(student.tuitionDebt).toLocaleString('vi-VN')} đ. Vui lòng hoàn thành nghĩa vụ tài chính với Phòng Kế hoạch - Tài chính trước khi xin cấp giấy tờ.`,
        decisionTimeMs: Date.now() - startTime,
      };
    }

    // 2.3. Kiểm tra hạn chót nộp đơn phúc khảo (7 ngày kể từ ngày công bố điểm)
    if (requestType.code === 'GRADE_APPEAL') {
      const daysElapsed = Number(inputData.daysAfterResult || 0);
      if (daysElapsed > 7) {
        return {
          decision: 'OUT_OF_POLICY',
          uncertaintyType: 'OUTSIDE_POLICY',
          policyCode: 'POL_APPEAL_DEADLINE_7DAYS',
          reason: `Đơn phúc khảo nộp trễ ${daysElapsed} ngày sau khi có điểm (vượt quá hạn chót 7 ngày quy định tại Điều 14).`,
          userMessage: `Từ chối tiếp nhận đơn: Thời hạn nộp đơn phúc khảo là trong vòng 7 ngày kể từ ngày công bố điểm thi. Đơn của bạn nộp sau ${daysElapsed} ngày nên không còn hiệu lực.`,
          decisionTimeMs: Date.now() - startTime,
        };
      }
    }

    // 2.4. Kiểm tra lý do hoãn thi cá nhân không hợp lệ (ví dụ: bận đi du lịch)
    if (requestType.code === 'EXAM_DEFERRAL') {
      const reasonLower = (inputData.reason || '').toLowerCase();
      if (reasonLower.includes('du lịch') || reasonLower.includes('đi chơi') || reasonLower.includes('việc cá nhân')) {
        return {
          decision: 'OUT_OF_POLICY',
          uncertaintyType: 'OUTSIDE_POLICY',
          policyCode: 'POL_DEFERRAL_REASON',
          reason: 'Lý do cá nhân / du lịch không thuộc danh mục bất khả kháng được hoãn thi.',
          userMessage: 'Từ chối đơn hoãn thi: Quy chế đào tạo chỉ cho phép hoãn thi vì lý do bất khả kháng (sức khỏe, tang gia). Lý do cá nhân/du lịch không được chấp thuận.',
          decisionTimeMs: Date.now() - startTime,
        };
      }
    }

    // =========================================================================
    // CHỐT CHẶN 3: KIỂM TRA PHÂN CẤP THẨM QUYỀN (BEYOND AUTHORITY / LÁCH QUYỀN)
    // =========================================================================
    // 3.1. Nhận diện hành vi ép quyền / tự xưng quyền ("cứ duyệt đi tôi bảo lãnh")
    if (inputData.userClaimedOverride === true || inputData.forceApprove === true) {
      return {
        decision: 'BEYOND_AUTHORITY',
        uncertaintyType: 'BEYOND_AUTHORITY',
        targetRole: 'STAFF',
        actionableQuestion: `Sinh viên tự xưng có phê duyệt miệng đặc biệt từ lãnh đạo. Cán bộ PĐT có xác minh và phê duyệt ngoại lệ không?`,
        reason: 'Tác tử phát hiện yêu cầu ép quyền/ngoại lệ. Theo quy định, tác tử AI không được tự ý cấp quyền cho chính nó.',
        contextCapsule: {
          studentCode: student.studentCode,
          studentName: student.fullName,
          claimedOverride: true,
          alertLevel: 'HIGH_RISK',
        },
        decisionTimeMs: Date.now() - startTime,
      };
    }

    // 3.2. Đơn xin hoãn thi bắt buộc phải qua Chuyên viên PĐT thẩm định giấy viện
    if (requestType.code === 'EXAM_DEFERRAL') {
      return {
        decision: 'BEYOND_AUTHORITY',
        uncertaintyType: 'BEYOND_AUTHORITY',
        targetRole: 'STAFF',
        actionableQuestion: `Sinh viên ${student.fullName} (${student.studentCode}) xin hoãn thi môn ${inputData.courseCode || 'đã chọn'} kèm minh chứng y tế. Thầy/Cô PĐT có phê duyệt không?`,
        reason: 'Đơn xin hoãn thi thuộc thẩm quyền xét duyệt của Chuyên viên Phòng Đào tạo (STAFF_REVIEW). Tác tử AI không được tự động duyệt.',
        contextCapsule: {
          studentCode: student.studentCode,
          studentName: student.fullName,
          courseCode: inputData.courseCode,
          hospitalDocProvided: true,
          gpa: student.gpa,
        },
        decisionTimeMs: Date.now() - startTime,
      };
    }

    // 3.3. Đơn cứu xét đặc biệt / Rút môn sau hạn / Chuyển ngành -> Bắt buộc DEAN duyệt
    if (requestType.code === 'SPECIAL_PETITION') {
      return {
        decision: 'BEYOND_AUTHORITY',
        uncertaintyType: 'BEYOND_AUTHORITY',
        targetRole: 'DEAN',
        actionableQuestion: `Sinh viên làm đơn cứu xét ngoại lệ: "${inputData.explanation || 'Rút môn quá hạn'}". Trưởng phòng Đào tạo có phê duyệt ca đặc biệt này không?`,
        reason: 'Đơn cứu xét đặc biệt vượt trần phân cấp của AI và Chuyên viên, bắt buộc Lãnh đạo Phòng Đào tạo (DEAN) phê duyệt.',
        contextCapsule: {
          studentCode: student.studentCode,
          studentName: student.fullName,
          explanation: inputData.explanation,
          gpa: student.gpa,
          executiveApprovalRequired: true,
        },
        decisionTimeMs: Date.now() - startTime,
      };
    }

    // =========================================================================
    // CHỐT CHẶN 4: THỎA MÃN ĐẦY ĐỦ ĐIỀU KIỆN THƯỜNG QUY (ROUTINE AUTO APPROVE)
    // =========================================================================
    // Áp dụng cho: Giấy xác nhận sinh viên (STUDENT_CONFIRMATION) và Bảng điểm (ACADEMIC_TRANSCRIPT)
    return {
      decision: 'ROUTINE_AUTO_APPROVE',
      uncertaintyType: null,
      isRoutine: true,
      reason: 'Hồ sơ đầy đủ dữ kiện, thỏa mãn 100% quy chế đào tạo, nằm trong phạm vi tự quyền của Tác tử AI.',
      decisionTimeMs: Date.now() - startTime,
    };
  }
}

export default AcademicPolicyEngine;
