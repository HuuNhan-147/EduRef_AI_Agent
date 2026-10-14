import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';
import { runAgent } from '../modules/ai-agent/index.js';
import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';
import petitionTools from '../modules/ai-agent/tools/actions/petitionTools.js';
import { checkCohortOverdueStatus } from '../services/StudentConfirmationDecisionService.js';
import { RESERVED_BENCHMARK_STUDENT_CODES } from '../controllers/authController.js';
import { scopeSessionId } from '../modules/ai-agent/memory/sessionScope.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();

// Mỗi lượt chat gọi Gemini (tốn tiền) nên giới hạn theo người dùng
const chatLimiter = rateLimit({ name: 'agent-chat', max: 20, windowMs: 60_000 });
// Các ca verify ghi đơn thật vào DB dùng chung
const verifyLimiter = rateLimit({ name: 'agent-verify', max: 6, windowMs: 60_000 });

/**
 * POST /api/agent/chat (HTTP Fallback khi không dùng Socket.IO)
 */
router.post('/chat', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, attachments, inputData } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Thiếu trường message.' });
    }

    // Tự động nạp ngữ cảnh người dùng thực tế từ Database
    let userContext = {};
    const explicitStudentCode = req.body?.studentCode || req.body?.currentUser?.studentCode;
    const isStaffRole = ['STAFF', 'DEAN', 'ADMIN'].includes(req.user?.role) && !explicitStudentCode;

    if (isStaffRole) {
      const staffUser = await prisma.user.findUnique({
        where: { id: req.user.id },
      });
      if (staffUser) {
        userContext = {
          username: staffUser.username,
          fullName: staffUser.fullName,
          email: staffUser.email,
          role: staffUser.role,
          type: 'STAFF',
        };
      }
    } else {
      // AN NINH (ZERO-TRUST IDENTITY): phiên STUDENT bắt buộc dùng studentCode trong JWT,
      // không nhận studentCode do client gửi (đồng bộ với nhánh Socket.IO).
      const codeToFind = req.user?.role === 'STUDENT'
        ? req.user?.studentCode
        : (explicitStudentCode || req.user?.studentCode);
      if (codeToFind) {
        const student = await prisma.student.findUnique({
          where: { studentCode: String(codeToFind).trim() },
          include: { department: true },
        });
        if (student) {
          const cohortStatus = checkCohortOverdueStatus(student);
          const hasActiveSched = student.status === 'ACTIVE';
          const credits = !hasActiveSched ? 0 : (cohortStatus.hasDebtCourses ? 3 : 15);

          let admYear = Number(student.admissionYear || 0);
          if (!admYear && student.studentCode) {
            const prefix = String(student.studentCode).trim().slice(0, 2);
            const parsedPrefix = parseInt(prefix, 10);
            if (!isNaN(parsedPrefix) && parsedPrefix >= 10 && parsedPrefix <= 99) {
              admYear = 2000 + parsedPrefix;
            } else {
              admYear = 2022;
            }
          }

          userContext = {
            studentCode: student.studentCode,
            fullName: student.fullName,
            email: student.email,
            status: student.status,
            department: student.department?.name,
            tuitionDebt: Number(student.tuitionDebt),
            gpa: Number(student.gpa),
            admissionYear: admYear,
            hasSchedule: hasActiveSched,
            enrolledCredits: credits,
            isOverdueCohort: cohortStatus.isOverdue,
            role: 'STUDENT',
            type: 'STUDENT',
          };
        }
      }
    }

    if (!userContext.role) {
      return res.status(403).json({ success: false, message: 'Không xác định được danh tính hợp lệ của phiên đăng nhập.' });
    }

    const result = await runAgent({
      message,
      currentUser: userContext,
      sessionId: scopeSessionId(userContext, sessionId),
      attachments,
      inputData,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/verify-90s (Kích hoạt bộ chạy kiểm thử 5 Test Cases 90s cho BGK)
 */
router.post('/verify-90s', authenticateToken, verifyLimiter, async (req, res) => {
  try {
    const result = await verifyTools.run_verify_90s();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * POST /api/agent/verify-custom (Kích hoạt thẩm định ca kiểm thử tùy chỉnh do BGK nhập)
 */
router.post('/verify-custom', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { studentCode, requestTypeCode, inputData, documents } = req.body;
    const result = await verifyTools.run_custom_verify({ studentCode, requestTypeCode, inputData, documents });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/verify-custom-prompt (Ca mới do giám khảo nhập bằng ngôn ngữ tự nhiên)
 */
router.post('/verify-custom-prompt', authenticateToken, verifyLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    let { studentCode } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập ca kiểm thử.' });
    }

    // Ca kiểm thử TẠO ĐƠN THẬT. Sinh viên chỉ được chạy trên hồ sơ của chính mình hoặc
    // hồ sơ benchmark của Nhà trường; nếu không có thể tạo/duyệt đơn thay sinh viên khác
    // (kể cả bằng cách gõ "mssv ..." trong prompt). Cán bộ/Trưởng phòng không bị giới hạn.
    if (req.user?.role === 'STUDENT') {
      const ownCode = String(req.user.studentCode || '').trim();
      const requested = studentCode ? String(studentCode).trim() : ownCode;
      if (!requested || (requested !== ownCode && !RESERVED_BENCHMARK_STUDENT_CODES.includes(requested))) {
        return res.status(403).json({
          success: false,
          message: 'Sinh viên chỉ được chạy ca kiểm thử trên hồ sơ của chính mình hoặc hồ sơ benchmark.',
        });
      }
      studentCode = requested;
    }

    const result = await verifyTools.run_custom_prompt({ prompt, studentCode });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/rollback (Hoàn tác 1-chạm hồ sơ khi phát hiện sai phạm)
 */
router.post('/rollback', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { requestCode, requestId, reason } = req.body;
    if (!requestCode && !requestId) {
      return res.status(400).json({ success: false, message: 'Thiếu requestCode hoặc requestId.' });
    }

    const { default: AcademicWorkflowService } = await import('../services/AcademicWorkflowService.js');
    const result = await AcademicWorkflowService.rollbackRequest({
      requestCode,
      requestId,
      reason,
      actorType: req.user?.role || 'STAFF',
      staffName: req.user?.fullName || req.user?.username || 'Cán bộ Quản lý',
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/staff-confirm (Cán bộ PĐT / BGK duyệt hoặc từ chối ca vượt thẩm quyền)
 */
router.post('/staff-confirm', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { requestId, reviewerNote, approved = true } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Thiếu requestId.' });
    }

    const result = await petitionTools.staff_confirm_request({
      requestId,
      reviewerNote,
      approved,
      // Ghi danh tính người duyệt vào nhật ký kiểm toán (trước đây luôn ghi chung 'STAFF')
      actorType: req.user?.role || 'STAFF',
      staffName: req.user?.fullName || req.user?.username || null,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agent/terminal-logs (Lấy lịch sử reasoning terminal logs gần nhất)
 */
router.get('/terminal-logs', authenticateToken, async (req, res) => {
  try {
    const { agentTerminalLogger } = await import('../modules/ai-agent/core/AgentTerminalLogger.js');
    const limit = parseInt(req.query.limit, 10) || 150;
    const logs = agentTerminalLogger.getRecentLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/terminal-logs/clear (Xóa bộ đệm log terminal)
 */
router.post('/terminal-logs/clear', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const { agentTerminalLogger } = await import('../modules/ai-agent/core/AgentTerminalLogger.js');
    agentTerminalLogger.clear();
    res.json({ success: true, message: 'Đã xóa bộ đệm terminal log.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
