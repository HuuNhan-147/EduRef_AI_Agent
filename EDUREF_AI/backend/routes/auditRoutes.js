import express from 'express';
import AuditLogService from '../services/AuditLogService.js';

const router = express.Router();

/**
 * GET /api/audit/logs (Lấy danh sách nhật ký kiểm toán bất biến SHA-256)
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const logs = await AuditLogService.getLogs({ limit: Number(limit), action });
    res.json({ success: true, total: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/verify-chain (Kiểm tra tính toàn vẹn của TOÀN BỘ CHUỖI BĂM từ đầu tới cuối)
 */
router.get('/verify-chain', async (req, res) => {
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
router.get('/verify/:id', async (req, res) => {
  try {
    const result = await AuditLogService.verifyLogIntegrity(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
