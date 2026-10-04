import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';
import AuditLogService from '../services/AuditLogService.js';

const router = express.Router();

function requiredRoleOf(petition) {
  if (petition?.contextCapsule && typeof petition.contextCapsule === 'object' && petition.contextCapsule.requiredRole) {
    return petition.contextCapsule.requiredRole;
  }
  return petition?.decision === 'ESCALATE_TO_DEAN' ? 'DEAN' : 'STAFF';
}

function canStaffAccess(petition, user) {
  if (['DEAN', 'ADMIN'].includes(user?.role)) return true;
  if (user?.role !== 'STAFF') return false;
  return requiredRoleOf(petition) === 'STAFF' || petition.assignedStaffId === user.id;
}

function notifyRole(req, role, event, payload) {
  req.app.get('io')?.to(`role:${role}`).emit(event, payload);
}

function notifyStudent(req, studentId, event, payload) {
  if (studentId) req.app.get('io')?.to(`student:${studentId}`).emit(event, payload);
}

/**
 * GET /api/petitions (Lấy danh sách đơn phiếu sinh viên)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (req.user?.role === 'STUDENT') where.studentId = req.user.id;
    if (req.user?.role === 'STAFF') {
      where.OR = [
        { decision: 'ESCALATE_TO_STAFF' },
        { assignedStaffId: req.user.id },
      ];
    }

    const petitions = await prisma.studentRequest.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { studentCode: true, fullName: true, email: true, department: true, tuitionDebt: true, status: true, gpa: true },
        },
        requestType: {
          select: { code: true, name: true },
        },
        assignedStaff: {
          select: { id: true, fullName: true, role: true },
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

    if (!requestCode && req.body.type) {
      requestCode = req.body.type;
    }

    // Nếu không truyền requestCode, suy luận loại form
    if (!requestCode) {
      if (inputData.certificates) requestCode = 'GRADUATION_ASSESSMENT';
      else requestCode = 'STUDENT_CONFIRMATION';
    }

    if (req.user?.role === 'STUDENT' && requestCode !== 'STUDENT_CONFIRMATION') {
      return res.status(403).json({ success: false, message: 'Không hỗ trợ gửi loại hồ sơ này trong Sprint 2.' });
    }
    if (requestCode === 'STUDENT_CONFIRMATION') {
      const { validateIntakeFields } = await import('../modules/ai-agent/studentIntakeFields.js');
      const validation = validateIntakeFields(inputData);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: Object.values(validation.errors)[0], errors: validation.errors });
      }
      inputData = { ...inputData, ...validation.fields };
    }

    // Xử lý danh sách documents đính kèm từ form (bản scan/ảnh chụp minh chứng)
    const documents = [];
    const certs = inputData.attachedCerts || inputData.uploadedCerts;
    if (certs) {
      if (certs.b1?.previewUrl || certs.b1?.attached || certs.b1?.isValid) {
        documents.push({
          documentType: 'B1_ENGLISH_CERT',
          fileName: certs.b1.fileName || 'HUTECH_Chung_Chi_Tieng_Anh_B1.png',
          fileUrl: certs.b1.previewUrl || '/public/demo_certs/hutech_b1_english.png',
          verificationStatus: 'PENDING',
          extractedData: certs.b1.extractedData || null,
        });
      }
      if (certs.teamwork?.previewUrl || certs.teamwork?.attached || certs.teamwork?.isValid) {
        documents.push({
          documentType: 'TEAMWORK_CERT',
          fileName: certs.teamwork.fileName || 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png',
          fileUrl: certs.teamwork.previewUrl || '/public/demo_certs/hutech_teamwork_skills.png',
          verificationStatus: 'PENDING',
          extractedData: certs.teamwork.extractedData || null,
        });
      }
    }

    const { default: petitionWorkflowCore } = await import('../modules/petition-core/PetitionWorkflowCore.js');

    const result = await petitionWorkflowCore.processPetitionWorkflow({
      studentCode: studentCode || '2280602154',
      requestTypeCode: requestCode,
      inputData,
      documents,
      actorType: 'STUDENT',
    });

    if (!result?.success) {
      return res.status(result?.decision === 'DUPLICATE_ACTIVE' ? 409 : 400).json({
        success: false,
        message: result?.message || 'Không thể gửi hồ sơ.',
        data: result,
      });
    }

    if (result?.status === 'ESCALATED') {
      const targetRole = result.requiredRole === 'DEAN' ? 'DEAN' : 'STAFF';
      notifyRole(req, targetRole, 'petition_escalated', {
        requestId: result.requestId,
        requestCode: result.requestCode,
        requiredRole: targetRole,
      });
      if (targetRole === 'STAFF') notifyRole(req, 'DEAN', 'petition_escalated', { requestId: result.requestId, requestCode: result.requestCode, requiredRole: targetRole });
    }

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
      where: { active: true },
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
 * GET /api/petitions/:id (Lấy chi tiết một đơn phiếu)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const petition = await prisma.studentRequest.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { department: true } },
        requestType: true,
        assignedStaff: { select: { id: true, fullName: true, role: true } },
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
    if (['STAFF'].includes(req.user?.role) && !canStaffAccess(petition, req.user)) {
      return res.status(403).json({ success: false, message: 'Hồ sơ này thuộc cấp thẩm quyền cao hơn.' });
    }

    res.json({ success: true, data: petition });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /api/petitions/:id/claim (Nhận xử lý để tránh hai cán bộ thao tác trùng) */
router.post('/:id/claim', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const petition = await prisma.studentRequest.findUnique({ where: { id: req.params.id } });
    if (!petition) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });
    if (!canStaffAccess(petition, req.user)) {
      return res.status(403).json({ success: false, message: 'Hồ sơ này vượt thẩm quyền của tài khoản hiện tại.' });
    }
    if (petition.status !== 'ESCALATED') {
      return res.status(409).json({ success: false, message: 'Hồ sơ không còn ở hàng đợi xử lý.' });
    }
    if (petition.assignedStaffId && petition.assignedStaffId !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Hồ sơ đã được một cán bộ khác nhận xử lý.' });
    }

    await AuditLogService.recordLogWithMutation({
      requestId: petition.id,
      actorType: req.user.role,
      actorId: req.user.id,
      userId: req.user.id,
      action: 'CLAIM_REQUEST',
      decision: 'ASSIGNED',
      reason: `${req.user.fullName || req.user.username} nhận xử lý hồ sơ.`,
      beforeState: { assignedStaffId: petition.assignedStaffId },
      afterState: { assignedStaffId: req.user.id },
    }, async (tx) => tx.studentRequest.update({
      where: { id: petition.id },
      data: { assignedStaffId: req.user.id },
      include: { assignedStaff: { select: { id: true, fullName: true, role: true } } },
    }));

    const updated = await prisma.studentRequest.findUnique({
      where: { id: petition.id },
      include: { assignedStaff: { select: { id: true, fullName: true, role: true } } },
    });
    res.json({ success: true, data: updated, message: 'Bạn đã nhận xử lý hồ sơ.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /api/petitions/:id/escalate-to-dean (Chuyên viên chuyển cấp có thẩm quyền cao hơn) */
router.post('/:id/escalate-to-dean', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    if (req.user?.role !== 'STAFF') {
      return res.status(403).json({ success: false, message: 'Chỉ chuyên viên đang xử lý mới cần dùng thao tác chuyển cấp.' });
    }
    const petition = await prisma.studentRequest.findUnique({ where: { id: req.params.id } });
    if (!petition) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });
    if (!canStaffAccess(petition, req.user)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chuyển hồ sơ này.' });
    }
    if (petition.assignedStaffId && petition.assignedStaffId !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Hồ sơ đang được một cán bộ khác xử lý.' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 10) return res.status(400).json({ success: false, message: 'Vui lòng nêu căn cứ chuyển cấp ít nhất 10 ký tự.' });

    const currentCapsule = petition.contextCapsule && typeof petition.contextCapsule === 'object' ? petition.contextCapsule : {};
    const contextCapsule = {
      ...currentCapsule,
      requiredRole: 'DEAN',
      escalatedBy: req.user.fullName || req.user.username,
      escalatedByStaffAt: new Date().toISOString(),
      escalationToDeanReason: reason,
      actionableQuestion: 'Trưởng Phòng Đào tạo xem xét trường hợp được chuyên viên chuyển cấp và đưa ra quyết định cuối cùng?',
    };

    await AuditLogService.recordLogWithMutation({
      requestId: petition.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      userId: req.user.id,
      action: 'ESCALATE_TO_DEAN',
      decision: 'ESCALATE_TO_DEAN',
      reason,
      beforeState: { decision: petition.decision, assignedStaffId: petition.assignedStaffId },
      afterState: { decision: 'ESCALATE_TO_DEAN', assignedStaffId: null },
    }, async (tx) => tx.studentRequest.update({
      where: { id: petition.id },
      data: {
        status: 'ESCALATED',
        decision: 'ESCALATE_TO_DEAN',
        escalationReason: reason,
        contextCapsule,
        assignedStaffId: null,
      },
    }));

    notifyRole(req, 'DEAN', 'petition_escalated', { requestId: petition.id, requestCode: petition.requestCode, requiredRole: 'DEAN' });
    notifyStudent(req, petition.studentId, 'petition_status_updated', {
      requestId: petition.id,
      requestCode: petition.requestCode,
      status: 'ESCALATED',
      requiredRole: 'DEAN',
    });
    res.json({ success: true, message: 'Hồ sơ đã được chuyển lên Trưởng Phòng Đào tạo.' });
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
    if (String(note || '').trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Vui lòng ghi căn cứ phê duyệt ít nhất 10 ký tự.' });
    }
    const actorType = req.user?.role || 'STAFF';
    const staffName = req.user?.fullName || req.body?.staffName || 'Chuyên viên PĐT';
    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.staffDecision({
      requestId: req.params.id,
      decision: 'APPROVE',
      reviewerNote: note,
      actorType,
      actorId: req.user?.id,
      staffName,
    });

    if (!result.success) return res.status(result.error?.includes('quyền') ? 403 : 409).json(result);
    notifyRole(req, 'STAFF', 'petition_status_updated', result);
    notifyRole(req, 'DEAN', 'petition_status_updated', result);
    notifyStudent(req, result.studentId, 'petition_status_updated', result);
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

    if (String(reason || '').trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Vui lòng ghi căn cứ từ chối ít nhất 10 ký tự.' });
    }

    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.staffDecision({
      requestId: req.params.id,
      decision: 'REJECT',
      reviewerNote: reason,
      actorType,
      actorId: req.user?.id,
      staffName,
    });

    if (!result.success) return res.status(result.error?.includes('quyền') ? 403 : 409).json(result);
    notifyRole(req, 'STAFF', 'petition_status_updated', result);
    notifyRole(req, 'DEAN', 'petition_status_updated', result);
    notifyStudent(req, result.studentId, 'petition_status_updated', result);
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
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 10) {
      return res.status(400).json({ success: false, message: 'Vui lòng ghi rõ lý do hủy hồ sơ ít nhất 10 ký tự.' });
    }
    const actorType = req.user?.role || 'STAFF';
    const staffName = req.user?.fullName || req.body?.staffName || 'Giám khảo / Cán bộ Quản lý';
    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');

    const result = await AcademicWorkflowService.rollbackRequest({
      requestId: req.params.id,
      reason,
      actorType,
      actorId: req.user?.id,
      staffName,
    });

    if (!result.success) return res.status(result.error?.includes('thẩm quyền') ? 403 : 409).json(result);
    notifyRole(req, 'STAFF', 'petition_status_updated', result);
    notifyRole(req, 'DEAN', 'petition_status_updated', result);
    notifyStudent(req, result.studentId, 'petition_status_updated', { ...result, status: 'CANCELLED' });
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
    if (req.user?.role === 'STAFF' && !canStaffAccess(petition, req.user)) {
      return res.status(403).json({ success: false, message: 'Tài liệu này thuộc hồ sơ vượt thẩm quyền của bạn.' });
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
router.post('/ocr-certificate', authenticateToken, async (req, res) => {
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
    const { additionalData = {}, newDocuments = [] } = req.body;
    const ownedRequest = await prisma.studentRequest.findUnique({ where: { id: req.params.id } });
    if (!ownedRequest) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đơn.' });
    if (req.user?.role === 'STUDENT' && ownedRequest.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tiếp tục hồ sơ của sinh viên khác.' });
    }
    if (req.user?.role === 'STAFF' && !canStaffAccess(ownedRequest, req.user)) {
      return res.status(403).json({ success: false, message: 'Hồ sơ này thuộc cấp thẩm quyền cao hơn.' });
    }
    if (ownedRequest.status !== 'WAITING_STUDENT') {
      return res.status(409).json({ success: false, message: 'Chỉ hồ sơ đang chờ bổ sung mới có thể tiếp tục.' });
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
 * GET /api/petitions/stats/metrics (Bộ chỉ số định lượng phục vụ Sprint 2 Dashboard)
 */
router.get('/stats/metrics', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const totalRequests = await prisma.studentRequest.count();
    const approvedRequests = await prisma.studentRequest.count({ where: { status: 'APPROVED' } });
    const escalatedRequests = await prisma.studentRequest.count({ where: { status: 'ESCALATED' } });
    const waitingRequests = await prisma.studentRequest.count({ where: { status: 'WAITING_STUDENT' } });
    const rejectedRequests = await prisma.studentRequest.count({ where: { status: 'REJECTED' } });
    const cancelledRequests = await prisma.studentRequest.count({ where: { status: 'CANCELLED' } });

    const humanResolvedRate = totalRequests > 0
      ? (((approvedRequests + rejectedRequests) / totalRequests) * 100).toFixed(1)
      : null;
    const awaitingHumanReviewRate = totalRequests > 0
      ? ((escalatedRequests / totalRequests) * 100).toFixed(1)
      : null;
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
          humanResolvedRate: humanResolvedRate === null ? null : `${humanResolvedRate}%`,
          awaitingHumanReviewRate: awaitingHumanReviewRate === null ? null : `${awaitingHumanReviewRate}%`,
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

export default router;
