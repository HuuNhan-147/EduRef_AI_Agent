import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';
import { stripServerAuthoritativeFields } from '../services/ClientInputGuard.js';
import { isDemoRoleSwitchEnabled } from '../controllers/authController.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();

// Mỗi lần OCR gọi Gemini Vision với ảnh lớn nên giới hạn theo người dùng
const ocrLimiter = rateLimit({ name: 'ocr', max: 10, windowMs: 60_000 });

// Giới hạn số bản ghi trả về để tránh quét toàn bộ bảng / giá trị NaN làm Prisma lỗi
const clampLimit = (value, fallback = 50, max = 200) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

/**
 * GET /api/petitions (Lấy danh sách đơn phiếu sinh viên)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const where = {};
    if (status && typeof status === 'string') where.status = status;
    if (req.user?.role === 'STUDENT') where.studentId = req.user.id;

    const petitions = await prisma.studentRequest.findMany({
      where,
      take: clampLimit(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            studentCode: true,
            fullName: true,
            email: true,
            department: true,
            tuitionDebt: true,
            status: true,
            gpa: true,
            birthDate: true,
            gender: true,
            studentClass: true,
            major: true,
            phone: true,
            idCard: true,
            idCardDate: true,
            idCardPlace: true,
            permanentAddress: true,
          },
        },
        requestType: {
          select: { code: true, name: true },
        },
        assignedStaff: {
          select: { fullName: true, role: true },
        },
        documents: true,
      },
    });

    res.json({ success: true, total: petitions.length, data: petitions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions (Nộp hồ sơ đơn mới trực tiếp từ biểu mẫu sinh viên)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    let studentCode = req.user?.role === 'STUDENT' ? req.user.studentCode : req.body.studentCode;
    let requestCode = req.body.requestCode || req.body.requestTypeCode;
    let inputData = {};

    // Xử lý cả JSON body lẫn FormData
    if (typeof req.body.formData === 'string') {
      try {
        inputData = JSON.parse(req.body.formData);
      } catch (e) {
        inputData = {};
      }
    } else if (typeof req.body.formData === 'object' && req.body.formData !== null) {
      inputData = req.body.formData;
    } else if (req.body.inputData) {
      inputData = req.body.inputData;
    }

    // inputData từ client là dữ liệu không tin cậy: bỏ các khóa do máy chủ tự tính
    // (hạn ngạch cấp lại, ngày xét duyệt...) để sinh viên không tự khai né quy chế.
    inputData = stripServerAuthoritativeFields(inputData);

    if (!requestCode && req.body.type) {
      requestCode = req.body.type;
    }

    // Bản chung kết chỉ nhận một workflow duy nhất.
    if (!requestCode) {
      requestCode = 'STUDENT_CONFIRMATION';
    }
    if (requestCode !== 'STUDENT_CONFIRMATION') {
      return res.status(400).json({
        success: false,
        message: 'Bản chung kết chỉ hỗ trợ thủ tục Giấy Xác Nhận Sinh Viên.',
      });
    }

    if (!studentCode) {
      return res.status(400).json({
        success: false,
        message: 'Không xác định được mã số sinh viên. Vui lòng đăng nhập hoặc cung cấp studentCode hợp lệ.',
      });
    }

    // 5 biểu mẫu Giấy xác nhận sinh viên HUTECH là biểu mẫu thông tin thuần túy, không yêu cầu upload tài liệu minh chứng
    const documents = [];

    const { getStudentFullProfile } = await import('../config/studentRegistry.js');
    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');
    const fullProfile = getStudentFullProfile(studentCode, req.user);

    // Hạn ngạch cấp lại luôn được tính từ lịch sử trong DB, không tin dữ liệu client.
    const historyRequests = await AcademicWorkflowService.loadApprovalHistory({ studentCode });

    // SĐT và địa chỉ thường trú BẮT BUỘC do sinh viên tự khai (Zero-Tolerance Guard):
    // không điền mặc định từ registry, nếu không guard thiếu dữ kiện sẽ bị vô hiệu và
    // giấy có thể in ra số điện thoại/địa chỉ của người khác.
    const enrichedInputData = {
      fullName: inputData?.fullName || fullProfile.fullName,
      birthDate: inputData?.birthDate || fullProfile.birthDate,
      gender: inputData?.gender || fullProfile.gender,
      studentClass: inputData?.studentClass || fullProfile.studentClass,
      faculty: inputData?.faculty || fullProfile.faculty,
      major: inputData?.major || fullProfile.major,
      idCard: inputData?.idCard || fullProfile.idCard,
      idCardDate: inputData?.idCardDate || fullProfile.idCardDate,
      idCardPlace: inputData?.idCardPlace || fullProfile.idCardPlace,
      pickupCampus: inputData?.pickupCampus || null,
      ...inputData,
      // Đặt sau ...inputData để client không ghi đè danh tính / lịch sử do máy chủ xác lập
      studentCode: String(studentCode || fullProfile.studentCode).trim(),
      historyRequests,
    };

    const { default: petitionWorkflowCore } = await import('../modules/petition-core/PetitionWorkflowCore.js');

    const result = await petitionWorkflowCore.processPetitionWorkflow({
      studentCode,
      requestTypeCode: requestCode,
      inputData: enrichedInputData,
      documents,
      actorType: 'STUDENT',
    });

    res.json({ success: true, data: result.request || result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/petitions/types (Lấy danh mục 5 thủ tục hành chính)
 */
router.get('/types', async (req, res) => {
  try {
    const types = await prisma.requestType.findMany({
      where: { active: true, code: 'STUDENT_CONFIRMATION' },
      include: {
        requirements: true,
        policies: true,
        authorityRules: true,
      },
    });

    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/petitions/students (Lấy danh sách sinh viên phục vụ test)
 */
router.get('/students', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { department: true },
      orderBy: { studentCode: 'asc' },
    });

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/petitions/stats/metrics (Bộ chỉ số định lượng phục vụ Sprint 2 Dashboard)
 * Keep this static path before /:id so Express cannot interpret "stats" as an id.
 */
router.get('/stats/metrics', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const totalRequests = await prisma.studentRequest.count();
    const approvedRequests = await prisma.studentRequest.count({ where: { status: 'APPROVED' } });
    const escalatedRequests = await prisma.studentRequest.count({ where: { status: 'ESCALATED' } });
    const waitingRequests = await prisma.studentRequest.count({ where: { status: 'WAITING_STUDENT' } });
    const rejectedRequests = await prisma.studentRequest.count({ where: { status: 'REJECTED' } });
    const cancelledRequests = await prisma.studentRequest.count({ where: { status: 'CANCELLED' } });

    const automationRate = totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : null;
    const processingTime = await prisma.auditLog.aggregate({
      where: { decisionTimeMs: { not: null } },
      _avg: { decisionTimeMs: true },
    });

    res.json({
      success: true,
      data: {
        total: totalRequests,
        approved: approvedRequests,
        escalated: escalatedRequests,
        waitingStudent: waitingRequests,
        rejected: rejectedRequests,
        cancelled: cancelledRequests,
        metrics: {
          routineAutomationRate: automationRate === null ? null : `${automationRate}%`,
          missedEscalationRate: null,
          falseEscalationRate: null,
          avgProcessingTimeMs: processingTime._avg.decisionTimeMs,
          measurementStatus: 'PARTIAL',
          note: 'Missed/false escalation cần tập dữ liệu độc lập có nhãn; hệ thống không công bố số giả khi chưa đo.',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/petitions/:id (Lấy chi tiết một đơn phiếu)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const petition = await prisma.studentRequest.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { department: true } },
        requestType: true,
        documents: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!petition) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });
    }
    if (req.user?.role === 'STUDENT' && petition.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hồ sơ của sinh viên khác.' });
    }

    res.json({ success: true, data: petition });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/:id/approve (Cán bộ PĐT / Trưởng phòng duyệt đơn Escalate)
 */
router.post('/:id/approve', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { note } = req.body;
    const actorType = req.user?.role || 'STAFF';
    const staffName = req.user?.fullName || req.body?.staffName || 'Chuyên viên PĐT';
    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.staffDecision({
      requestId: req.params.id,
      decision: 'APPROVE',
      reviewerNote: note,
      actorType,
      staffName,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/:id/reject (Cán bộ PĐT từ chối đơn)
 */
router.post('/:id/reject', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { reason } = req.body;
    const actorType = req.user?.role || 'STAFF';
    const staffName = req.user?.fullName || req.body?.staffName || 'Chuyên viên PĐT';

    if (!reason || String(reason).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Bắt buộc phải cung cấp lý do từ chối đơn.' });
    }

    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.staffDecision({
      requestId: req.params.id,
      decision: 'REJECT',
      reviewerNote: reason,
      actorType,
      staffName,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/:id/rollback (Con người can thiệp dừng và ghi đè / Human Override Rollback)
 */
router.post('/:id/rollback', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { reason = 'Can thiệp dừng và ghi đè bởi Quản trị viên' } = req.body;
    const actorType = req.user?.role || 'STAFF';
    const staffName = req.user?.fullName || req.body?.staffName || 'Giám khảo / Cán bộ Quản lý';
    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.rollbackRequest({
      requestId: req.params.id,
      reason,
      actorType,
      staffName,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/:id/documents (Đính kèm tài liệu vào đơn)
 */
router.post('/:id/documents', authenticateToken, async (req, res) => {
  try {
    const { documentType = 'ATTACHMENT', fileName = 'document.pdf', fileUrl = '' } = req.body;
    const petition = await prisma.studentRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!petition) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });
    }
    if (req.user?.role === 'STUDENT' && petition.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật hồ sơ của sinh viên khác.' });
    }

    const doc = await prisma.requestDocument.create({
      data: {
        requestId: petition.id,
        documentType,
        fileName,
        fileUrl: fileUrl || `https://storage.eduref.edu.vn/${fileName}`,
        verificationStatus: 'PENDING',
      },
    });

    res.json({ success: true, message: 'Đã đính kèm chứng từ thành công.', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/ocr-certificate (Giám định và bóc tách chứng chỉ tốt nghiệp bằng Gemini Vision)
 */
router.post('/ocr-certificate', authenticateToken, ocrLimiter, async (req, res) => {
  try {
    const { imageBase64, expectedType = 'B1', studentName = 'Cao Hữu Nhân' } = req.body;
    const { default: certificateVisionService } = await import('../services/CertificateVisionService.js');

    const result = await certificateVisionService.verifyCertificate({
      imageBase64,
      expectedType,
      studentName,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/:id/resume (Tiếp tục xử lý sau khi sinh viên bổ sung)
 */
router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const { newDocuments = [] } = req.body;
    const additionalData = stripServerAuthoritativeFields(req.body.additionalData);
    const ownedRequest = await prisma.studentRequest.findUnique({
      where: { id: req.params.id },
      include: { student: true },
    });
    if (!ownedRequest) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });

    if (req.user?.role === 'STUDENT' && ownedRequest.studentId !== req.user.id && ownedRequest.student?.studentCode !== req.user?.studentCode) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tiếp tục hồ sơ của sinh viên khác.' });
    }

    if (ownedRequest.status !== 'WAITING_STUDENT') {
      return res.status(400).json({
        success: false,
        message: `Hồ sơ [${ownedRequest.requestCode}] đang ở trạng thái [${ownedRequest.status}], không thể bổ sung thông tin. Chỉ có thể bổ sung khi hồ sơ ở trạng thái WAITING_STUDENT.`,
      });
    }
    const { default: petitionWorkflowCore } = await import('../modules/petition-core/PetitionWorkflowCore.js');

    const result = await petitionWorkflowCore.resumePetitionWorkflow({
      requestId: req.params.id,
      additionalData,
      newDocuments,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/petitions/reset-test (Xóa sạch các đơn thử nghiệm của sinh viên để test lại từ đầu)
 */
router.post('/reset-test', authenticateToken, async (req, res) => {
  try {
    // Xóa đơn cũng xóa luôn hạn ngạch "1 bản/kỳ", nên chỉ cho phép ở chế độ demo.
    if (!isDemoRoleSwitchEnabled()) {
      return res.status(403).json({ success: false, message: 'Chức năng dọn dữ liệu thử nghiệm chỉ khả dụng ở chế độ demo.' });
    }
    const studentCode = req.body?.studentCode || req.user?.studentCode;
    if (!studentCode) {
      return res.status(400).json({ success: false, message: 'Thiếu studentCode để làm sạch dữ liệu test.' });
    }

    const isStaff = ['STAFF', 'DEAN', 'ADMIN'].includes(req.user?.role);
    const isOwner = req.user?.studentCode && String(req.user.studentCode).trim() === String(studentCode).trim();
    if (!isStaff && !isOwner) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền dọn dẹp dữ liệu của sinh viên khác.' });
    }

    const student = await prisma.student.findUnique({
      where: { studentCode: String(studentCode).trim() },
      select: { id: true, studentCode: true, fullName: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: `Không tìm thấy sinh viên [${studentCode}] trong hệ thống.` });
    }

    // 1. Tìm tất cả đơn của sinh viên này
    const studentRequests = await prisma.studentRequest.findMany({
      where: { studentId: student.id },
      select: { id: true },
    });
    const requestIds = studentRequests.map((r) => r.id);

    let deletedCount = 0;
    if (requestIds.length > 0) {
      // 2. Xóa các RequestDocument nếu có
      await prisma.requestDocument.deleteMany({
        where: { requestId: { in: requestIds } },
      });

      // 3. Xóa các đơn StudentRequest (Không xóa AuditLog để bảo toàn chuỗi băm SHA-256 bất biến)
      const deleteResult = await prisma.studentRequest.deleteMany({
        where: { id: { in: requestIds } },
      });
      deletedCount = deleteResult.count;
    }

    res.json({
      success: true,
      deletedCount,
      message: `Đã xóa sạch ${deletedCount} đơn thử nghiệm của sinh viên ${student.fullName} (${student.studentCode}). Bạn có thể bắt đầu nộp đơn test lại từ đầu!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
