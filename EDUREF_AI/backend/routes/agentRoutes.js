import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';
import { runAgent } from '../modules/ai-agent/index.js';
import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';
import petitionTools from '../modules/ai-agent/tools/actions/petitionTools.js';

const router = express.Router();

/**
 * POST /api/agent/chat (HTTP Fallback khi không dùng Socket.IO)
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, sessionId, attachments, inputData } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Thiếu trường message.' });
    }

    // Tự động nạp ngữ cảnh người dùng thực tế từ Database
    let userContext = {};
    const codeToFind = req.user?.studentCode;

    if (['STAFF', 'DEAN', 'ADMIN'].includes(req.user?.role)) {
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
    } else if (req.user?.role === 'STUDENT' && codeToFind) {
      const student = await prisma.student.findUnique({
        where: { studentCode: String(codeToFind).trim() },
        include: { department: true },
      });
      if (student) {
        userContext = {
          studentCode: student.studentCode,
          fullName: student.fullName,
          email: student.email,
          status: student.status,
          department: student.department?.name,
          tuitionDebt: Number(student.tuitionDebt),
          gpa: Number(student.gpa),
          role: 'STUDENT',
          type: 'STUDENT',
        };
      }
    }

    if (!userContext.role) {
      return res.status(403).json({ success: false, message: 'Không xác định được danh tính hợp lệ của phiên đăng nhập.' });
    }

    const result = await runAgent({
      message,
      currentUser: userContext,
      sessionId,
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
router.post('/verify-90s', authenticateToken, async (req, res) => {
  try {
    const result = await verifyTools.run_verify_90s();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/verify-general (Bộ Verify tổng quát 4 ca theo đề bài)
 */
router.post('/verify-general', authenticateToken, async (req, res) => {
  try {
    const result = await verifyTools.run_general_verify();
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
router.post('/verify-custom-prompt', authenticateToken, async (req, res) => {
  try {
    const { prompt, studentCode } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập ca kiểm thử.' });
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
    const { requestCode, reason } = req.body;
    if (!requestCode) {
      return res.status(400).json({ success: false, message: 'Thiếu requestCode.' });
    }

    const result = await petitionTools.rollback_student_request({ requestCode, reason });
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

    const result = await petitionTools.staff_confirm_request({ requestId, reviewerNote, approved });
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
