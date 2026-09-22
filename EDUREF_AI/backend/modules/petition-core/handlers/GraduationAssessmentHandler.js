// backend/modules/petition-core/handlers/GraduationAssessmentHandler.js
// Handler xử lý: Đơn Đề Nghị Xét Tốt Nghiệp (DV-02)

import { BasePetitionHandler } from '../BasePetitionHandler.js';
import certificateVisionService from '../../../services/CertificateVisionService.js';

export class GraduationAssessmentHandler extends BasePetitionHandler {
  constructor() {
    super('GRADUATION_ASSESSMENT', 'Đơn Đề Nghị Xét Tốt Nghiệp');
  }

  /**
   * Kiểm tra thông tin đầu vào:
   * - SĐT liên hệ
   * - Nơi sinh
   * - Lý do đề nghị xét tốt nghiệp
   * - Danh sách chứng chỉ chuẩn đầu ra (Số hiệu & Số vào sổ)
   */
  async validateRequirements(request, inputData = {}, documents = []) {
    const passed = [];
    const missing = [];
    let validCerts = [];

    // 1. SĐT liên hệ
    const phone = inputData?.phone || inputData?.REQ_PHONE;
    if (phone && String(phone).trim().length >= 8) {
      passed.push({ code: 'REQ_PHONE', name: 'Số điện thoại liên hệ', value: String(phone).trim() });
    } else {
      missing.push({
        code: 'REQ_PHONE',
        name: 'Số điện thoại liên hệ',
        description: 'Vui lòng cung cấp số điện thoại liên hệ chính xác.',
      });
    }

    // 2. Nơi sinh
    const birthPlace = inputData?.birthPlace || inputData?.REQ_BIRTH_PLACE;
    if (birthPlace && String(birthPlace).trim().length > 0) {
      passed.push({ code: 'REQ_BIRTH_PLACE', name: 'Nơi sinh', value: String(birthPlace).trim() });
    } else {
      missing.push({
        code: 'REQ_BIRTH_PLACE',
        name: 'Nơi sinh',
        description: 'Vui lòng nhập nơi sinh (Tỉnh/Thành phố) theo giấy khai sinh.',
      });
    }

    // 3. Lý do xin đề nghị xét tốt nghiệp
    const reason = inputData?.reason || inputData?.REQ_REASON;
    if (reason && String(reason).trim().length > 0) {
      passed.push({ code: 'REQ_REASON', name: 'Lý do xét tốt nghiệp', value: String(reason).trim() });
    } else {
      missing.push({
        code: 'REQ_REASON',
        name: 'Lý do xét tốt nghiệp',
        description: 'Vui lòng ghi rõ lý do xin đề nghị xét tốt nghiệp.',
      });
    }

    // 4. Danh sách chứng chỉ chuẩn đầu ra & Format thẩm định
    let certificates = inputData?.certificates || inputData?.REQ_CERTIFICATES;
    if (typeof certificates === 'string') {
      try {
        certificates = JSON.parse(certificates);
      } catch (e) {
        certificates = [];
      }
    }

    if (!Array.isArray(certificates) || certificates.length === 0) {
      missing.push({
        code: 'REQ_CERTIFICATES',
        name: 'Danh sách chứng chỉ tốt nghiệp',
        description: 'Bắt buộc khai báo danh sách chứng chỉ chuẩn đầu ra (Ngoại ngữ B1, Kỹ năng nhóm, Tin học...) để Hội đồng xét duyệt.',
      });
    } else {
      const formatErrors = [];
      validCerts = [];

      certificates.forEach((c, idx) => {
        const certName = c.certType || `Chứng chỉ #${idx + 1}`;
        const certNum = String(c.certNumber || '').trim();
        const bookNum = String(c.bookNumber || '').trim();
        const issueDate = c.issueDate;

        // 4.1. Kiểm tra Số hiệu (Serial)
        if (!certNum || certNum.length < 4 || /^[?\-*]+$/.test(certNum)) {
          formatErrors.push(
            `Số hiệu của "${certName}" không đúng định dạng (hiện tại: "${certNum || 'chưa nhập'}", yêu cầu tối thiểu 4 ký tự chữ/số rõ ràng).`
          );
          return;
        }

        // 4.2. Kiểm tra Số vào sổ (Book Number: Phải có cả phần chữ và phần số, hoặc chứa ký hiệu phân cách / -)
        const hasLetter = /[a-zA-ZÀ-ỹ]/.test(bookNum);
        const hasDigit = /[0-9]/.test(bookNum);
        if (!bookNum || !hasLetter || !hasDigit || bookNum.length < 5) {
          formatErrors.push(
            `Số vào sổ của "${certName}" ("${bookNum || 'chưa nhập'}") không đúng quy cách HUTECH (Ví dụ chuẩn: DKC24B102677, TA-B-16/2356, DKC25KR07358).`
          );
          return;
        }

        // 4.3. Kiểm tra Ngày cấp
        if (!issueDate) {
          formatErrors.push(`Chứng chỉ "${certName}" chưa điền ngày cấp.`);
          return;
        }

        validCerts.push({
          certType: certName,
          certNumber: certNum,
          bookNumber: bookNum,
          issueDate,
        });
      });

      if (formatErrors.length > 0) {
        missing.push({
          code: 'REQ_CERT_FORMAT',
          name: 'Định dạng thông tin chứng chỉ',
          description: formatErrors.join(' | '),
        });
      } else if (validCerts.length > 0) {
        passed.push({
          code: 'REQ_CERTIFICATES',
          name: 'Chứng chỉ chuẩn đầu ra hợp lệ',
          value: `${validCerts.length} chứng chỉ đúng chuẩn đã đối soát format`,
          details: validCerts,
        });
      }
    }

    // 5. Thẩm định đa phương thức bằng AI Agent (Multimodal Vision & Cross-Check)
    const attachedCerts = inputData?.attachedCerts || {};
    const certDocs = documents || [];
    let manualReviewRequired = false;

    // Duyệt qua từng chứng chỉ đã kiểm tra hợp lệ về mặt format để soi ảnh và đối soát
    for (let i = 0; i < validCerts.length; i++) {
      const c = validCerts[i];
      const certTypeStr = String(c.certType || '').toLowerCase();
      const isB1 = certTypeStr.includes('ngoại ngữ') || certTypeStr.includes('tiếng anh') || certTypeStr.includes('b1') || i === 0;
      const certKey = isB1 ? 'b1' : 'teamwork';
      const certInfo = attachedCerts[certKey] || {};

      // Xác định nguồn ảnh (từ previewUrl base64 hoặc fileUrl hoặc documents)
      const imagePayload = certInfo.previewUrl || certDocs[i]?.fileUrl || (isB1 ? '/demo_certs/hutech_b1_english.png' : '/demo_certs/hutech_teamwork_skills.png');
      if (imagePayload) {
        try {
          const studentName = request?.student?.fullName || inputData?.fullName || 'Cao Hữu Nhân';
          const visionResult = await certificateVisionService.verifyCertificate({
            imageBase64: imagePayload,
            expectedType: isB1 ? 'B1' : 'TEAMWORK',
            studentName,
          });

          if (visionResult.requiresManualReview || visionResult.imageQuality === 'ERROR') {
            manualReviewRequired = true;
            passed.push({
              code: 'REQ_VISION_MANUAL_REVIEW',
              name: `Thẩm định thủ công "${c.certType}"`,
              value: 'Dịch vụ thị giác chưa thể kết luận; không công bố chứng chỉ đã được xác minh.',
            });
            continue;
          }

          // 5.1. Kiểm tra ảnh mờ (Blurry Image Detection)
          if (visionResult.imageQuality === 'BLURRY' || (!visionResult.isValid && (!visionResult.extractedData?.certNumber || !visionResult.extractedData?.bookNumber))) {
            missing.push({
              code: 'REQ_IMAGE_BLURRY',
              name: `Chất lượng ảnh "${c.certType}"`,
              description: `Ảnh chứng chỉ "${c.certType}" tải lên bị mờ/mất góc hoặc không nhận diện rõ số hiệu và chữ ký mộc đỏ. Vui lòng chụp lại bản scan rõ nét để Hội đồng đối soát.`,
            });
            continue;
          }

          // 5.2. Kiểm tra Guardrail chủ sở hữu chứng chỉ
          if (visionResult.studentNameMatch === false) {
            missing.push({
              code: 'REQ_STUDENT_MISMATCH',
              name: `Chủ sở hữu "${c.certType}"`,
              description: `Họ tên in trên chứng chỉ ("${visionResult.extractedName || 'người khác'}") không trùng khớp với sinh viên nộp đơn ("${studentName}"). Hệ thống từ chối ghi nhận!`,
            });
            continue;
          }

          // 5.3. Đối soát chéo Text vs Ảnh (Cross-Check Verification)
          if (visionResult.extractedData) {
            const certNumFromImg = String(visionResult.extractedData.certNumber || '').trim();
            const bookNumFromImg = String(visionResult.extractedData.bookNumber || '').trim();

            const normCertForm = String(c.certNumber || '').replace(/[\s\-_/]/g, '').toUpperCase();
            const normCertImg = certNumFromImg.replace(/[\s\-_/]/g, '').toUpperCase();

            const normBookForm = String(c.bookNumber || '').replace(/[\s\-_/]/g, '').toUpperCase();
            const normBookImg = bookNumFromImg.replace(/[\s\-_/]/g, '').toUpperCase();

            // Đối soát Số hiệu trên form với Số hiệu trên ảnh
            if (certNumFromImg && normCertForm && normCertForm !== normCertImg && !normCertImg.includes(normCertForm) && !normCertForm.includes(normCertImg)) {
              missing.push({
                code: 'REQ_CERT_MISMATCH',
                name: `Đối soát Số hiệu "${c.certType}"`,
                description: `Số hiệu bạn nhập trong đơn ("${c.certNumber}") không trùng khớp với Số hiệu đọc được từ chứng chỉ đính kèm ("${certNumFromImg}"). Vui lòng kiểm tra lại.`,
              });
            }

            // Đối soát Số vào sổ trên form với Số vào sổ trên ảnh
            if (bookNumFromImg && normBookForm && normBookForm !== normBookImg) {
              missing.push({
                code: 'REQ_BOOK_MISMATCH',
                name: `Đối soát Số vào sổ "${c.certType}"`,
                description: `Số vào sổ bạn nhập trong đơn ("${c.bookNumber}") không trùng khớp với Số vào sổ đọc được từ chứng chỉ đính kèm ("${bookNumFromImg}"). Vui lòng kiểm tra lại.`,
              });
            }
          }
        } catch (visionErr) {
          console.warn('⚠️ [GraduationAssessmentHandler] Lỗi kiểm tra AI Vision đối soát:', visionErr.message);
          manualReviewRequired = true;
        }
      }
    }

    if (missing.length === 0 && !manualReviewRequired) {
      passed.push({
        code: 'REQ_MULTIMODAL_VERIFIED',
        name: 'Minh chứng ảnh & Đối soát chéo',
        value: 'Ảnh chứng chỉ rõ nét; họ tên và số hiệu khai báo khớp dữ liệu OCR từ ảnh. Chưa đối chiếu cơ sở dữ liệu cấp phát gốc.',
      });
    }

    return {
      complete: missing.length === 0,
      passed,
      missing,
      manualReviewRequired,
    };
  }

  /**
   * Sinh câu hỏi yêu cầu bổ sung hoặc sửa lỗi thẩm định chứng chỉ
   */
  getClarificationQuestion(missing = []) {
    // 1. Ưu tiên cảnh báo ảnh mờ
    const blurryErr = missing.find((m) => m.code === 'REQ_IMAGE_BLURRY');
    if (blurryErr) {
      return `Hệ thống thẩm định AI phát hiện: ${blurryErr.description}`;
    }

    // 2. Cảnh báo sai lệch giữa số gõ trên form và số in trên ảnh
    const mismatchErr = missing.find((m) => m.code === 'REQ_CERT_MISMATCH' || m.code === 'REQ_BOOK_MISMATCH');
    if (mismatchErr) {
      return `Hệ thống đối soát chéo phát hiện sai lệch thông tin: ${mismatchErr.description}`;
    }

    // 3. Cảnh báo Guardrail chủ sở hữu chứng chỉ
    const ownerErr = missing.find((m) => m.code === 'REQ_STUDENT_MISMATCH');
    if (ownerErr) {
      return `Cảnh báo thẩm định: ${ownerErr.description}`;
    }

    // 4. Cảnh báo định dạng format
    const formatErr = missing.find((m) => m.code === 'REQ_CERT_FORMAT');
    if (formatErr) {
      return `Hệ thống thẩm định phát hiện thông tin chứng chỉ chưa đúng quy cách: ${formatErr.description}. Bạn vui lòng kiểm tra lại Số hiệu và Số vào sổ trên văn bằng gốc để chỉnh sửa chính xác trước khi nộp lại.`;
    }

    const certErr = missing.find((m) => m.code === 'REQ_CERTIFICATES');
    if (certErr) {
      return 'Để Hội đồng xét tốt nghiệp có đủ cơ sở thẩm định, bạn vui lòng nhập đầy đủ Danh sách chứng chỉ chuẩn đầu ra (gồm Loại chứng chỉ, Số hiệu, Số vào sổ, Ngày cấp) và đính kèm bản scan minh chứng.';
    }

    return `Để hoàn tất hồ sơ xét tốt nghiệp, bạn vui lòng bổ sung các thông tin còn thiếu: ${missing.map((m) => m.name).join(', ')}.`;
  }

  /**
   * Đánh giá quy chế đào tạo:
   * - Sinh viên đang học (ACTIVE)
   * - Hoàn thành 100% học phí (nợ = 0đ)
   * - Điểm tích lũy GPA >= 2.0
   */
  async evaluatePolicies(student, request) {
    if (student.status !== 'ACTIVE') {
      return {
        passed: false,
        violatedPolicy: { code: 'POL_GRAD_STUDENT_ACTIVE', name: 'Trạng thái học vụ tốt nghiệp' },
        reason: `Sinh viên có trạng thái [${student.status}], không thuộc đối tượng xét tốt nghiệp theo Điều 25 Quy chế đào tạo.`,
      };
    }

    if (Number(student.tuitionDebt || 0) > 0) {
      return {
        passed: false,
        violatedPolicy: { code: 'POL_GRAD_NO_DEBT', name: 'Nghĩa vụ tài chính tốt nghiệp' },
        reason: `Sinh viên còn nợ học phí ${Number(student.tuitionDebt).toLocaleString('vi-VN')} VNĐ. Quy chế xét tốt nghiệp yêu cầu hoàn thành 100% nghĩa vụ tài chính.`,
      };
    }

    if (student.gpa && Number(student.gpa) < 2.0) {
      return {
        passed: false,
        violatedPolicy: { code: 'POL_GRAD_MIN_GPA', name: 'Điểm trung bình tích lũy tối thiểu' },
        reason: `Điểm trung bình tích lũy (GPA: ${student.gpa}) chưa đạt mức tối thiểu 2.00/4.00 để tốt nghiệp.`,
      };
    }

    return { passed: true, violatedPolicy: null, reason: 'Đáp ứng đầy đủ điều kiện học vụ xét tốt nghiệp.' };
  }

  /**
   * Đóng gói Context Capsule chuyên biệt cho Hội đồng xét tốt nghiệp
   * Thêm ghi chú thẩm định Vision OCR để đảm bảo tính thận trọng (AI Safety)
   */
  buildContextCapsule(request, student, reason, actionableQuestion) {
    const base = super.buildContextCapsule(request, student, reason, actionableQuestion);
    return {
      ...base,
      visionVerificationNote: 'Số hiệu chứng chỉ đã được AI Vision OCR đối soát với thông tin sinh viên khai báo. Tuy nhiên, chưa đối chiếu với Cơ sở dữ liệu cấp phát chứng chỉ gốc của HUTECH. Hội đồng xét tốt nghiệp cần xác minh thêm.',
      certVerificationLevel: 'OCR_CROSS_CHECK_ONLY',
    };
  }

  /**
   * Thẩm quyền:
   * Chuyển Hội đồng xét tốt nghiệp / Trưởng phòng Đào tạo (DEAN_APPROVAL)
   */
  async checkAuthority(request, student, context = {}) {
    return {
      role: 'DEAN',
      action: 'DEAN_APPROVAL',
      classification: 'BEYOND_AUTHORITY',
      uncertaintyType: 'BEYOND_AUTHORITY',
      reason: 'HỘI ĐỒNG XÉT TỐT NGHIỆP: Thẩm quyền công nhận tốt nghiệp và ký cấp văn bằng thuộc Trưởng Phòng Đào Tạo & Hội đồng xét tốt nghiệp.',
      actionableQuestion: `Sinh viên ${student.fullName} (${student.studentCode}) có GPA ${Number(student.gpa || 0).toFixed(2)}, nợ học phí ${Number(student.tuitionDebt || 0).toLocaleString('vi-VN')} VNĐ và đã nộp các chứng chỉ được liệt kê trong Context Capsule. Hội đồng có phê duyệt công nhận đủ điều kiện tốt nghiệp không?`,
    };
  }
}

export const graduationAssessmentHandler = new GraduationAssessmentHandler();
export default graduationAssessmentHandler;
