import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';
import { respondServerError } from '../services/ErrorShield.js';
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
 * GET /api/agent/models (Lấy danh sách các mô hình AI đang được cấu hình trong .env)
 */
router.get('/models', (req, res) => {
  try {
    const rawFallbacks = process.env.GEMINI_FALLBACK_MODELS || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-flash-lite-latest';
    const modelsList = rawFallbacks.split(',').map((m) => m.trim()).filter(Boolean);

    const formatMeta = (id) => {
      if (id === 'gemini-4-argon') return { name: 'Gemini 4 Argon', shortName: '4 Argon', badge: 'Next-Gen 4.0', speed: 'Thế hệ 4' };
      if (id === 'gemini-3.8-flash') return { name: 'Gemini 3.8 Flash', shortName: '3.8 Flash', badge: 'Mới 3.8', speed: '~1.5s' };
      if (id === 'gemini-3.7-flash') return { name: 'Gemini 3.7 Flash', shortName: '3.7 Flash', badge: '3.7 Flash', speed: '~1.8s' };
      if (id === 'gemini-3.5-flash-lite') return { name: 'Gemini 3.5 Flash Lite', shortName: '3.5 Flash Lite', badge: 'Chính xác cao', speed: '~2.5s' };
      if (id === 'gemini-3.1-flash-lite') return { name: 'Gemini 3.1 Flash Lite', shortName: '3.1 Flash Lite', badge: '⚡ Siêu tốc (Khuyên dùng)', speed: '~1.0s', recommended: true };
      if (id === 'gemini-2.5-flash') return { name: 'Gemini 2.5 Flash', shortName: '2.5 Flash', badge: 'Chuẩn', speed: '~2.0s' };
      if (id === 'gemini-flash-lite-latest') return { name: 'Gemini Flash-Lite Latest', shortName: 'Flash-Lite', badge: 'Dự phòng', speed: '~2.0s' };

      const clean = id.replace(/^gemini-/, '').replace(/-/g, ' ');
      return { name: `Gemini ${clean}`, shortName: clean, badge: 'AI Model', speed: 'Tốc độ cao' };
    };

    const formatted = modelsList.map((id) => ({
      id,
      ...formatMeta(id),
    }));

    const result = [
      {
        id: 'auto',
        name: 'Tự Động (Auto Resilient)',
        shortName: 'Tự động',
        badge: '🛡️ Chống 503',
        speed: 'Thích ứng',
        description: 'Tự động kích hoạt mô hình nhanh nhất và tự đổi model nếu Google quá tải 503.',
      },
      ...formatted,
    ];

    return res.json({
      success: true,
      models: result,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    });
  } catch (error) {
    respondServerError(req, res, error);
  }
});

/**
 * POST /api/agent/chat (HTTP Fallback khi không dùng Socket.IO)
 */
router.post('/chat', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, attachments, inputData, model, requestedModel } = req.body;
    const targetModel = model || requestedModel || null;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Thiếu trường message.' });
    }
    if (String(message).length > 4000) {
      return res.status(400).json({ success: false, message: 'Tin nhắn quá dài (tối đa 4000 ký tự).' });
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
      requestedModel: targetModel,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
  }
});

/**
 * GET /api/agent/terminal-logs (Lấy lịch sử reasoning terminal logs gần nhất)
 */
router.get('/terminal-logs', authenticateToken, async (req, res) => {
  try {
    const { agentTerminalLogger } = await import('../modules/ai-agent/core/AgentTerminalLogger.js');
    const limit = Math.min(parseInt(req.query.limit, 10) || 150, 300);
    // Chỉ trả log của chính người dùng (và log hệ thống); cán bộ xem được tất cả
    const logs = agentTerminalLogger.getRecentLogs(limit, {
      key: req.user?.studentCode || req.user?.username || req.user?.id || null,
      isStaff: ['STAFF', 'DEAN', 'ADMIN'].includes(req.user?.role),
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    respondServerError(req, res, error);
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
    respondServerError(req, res, error);
  }
});

export default router;
