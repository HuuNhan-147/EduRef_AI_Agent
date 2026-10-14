import express from 'express';
import AuditLogService from '../services/AuditLogService.js';
import { authenticateToken, requireStaffOrDean } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/audit/logs (Lấy danh sách nhật ký kiểm toán bất biến SHA-256 công khai minh bạch)
 */
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 50;
    // Sinh viên chỉ thấy nhật ký thuộc hồ sơ của mình; cán bộ/Trưởng phòng xem toàn bộ.
    const studentId = req.user?.role === 'STUDENT' ? req.user.id : null;
    if (req.user?.role === 'STUDENT' && !studentId) {
      return res.status(403).json({ success: false, message: 'Không xác định được danh tính sinh viên.' });
    }
    const logs = await AuditLogService.getLogs({
      limit: safeLimit,
      action: typeof action === 'string' ? action : null,
      studentId,
    });
    res.json({ success: true, total: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/verify-chain (Kiểm tra tính toàn vẹn của TOÀN BỘ CHUỖI BĂM từ đầu tới cuối)
 */
router.get('/verify-chain', authenticateToken, async (req, res) => {
  try {
    const result = await AuditLogService.verifyEntireChain();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/verify/:id (Kiểm tra tính toàn vẹn mật mã học của một bản ghi)
 */
router.get('/verify/:id', authenticateToken, requireStaffOrDean, async (req, res) => {
  try {
    const result = await AuditLogService.verifyLogIntegrity(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
