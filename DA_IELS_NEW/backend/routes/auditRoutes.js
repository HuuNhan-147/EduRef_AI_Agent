import express from 'express';
import AuditLogService from '../services/AuditLogService.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/audit?limit=6 (Công khai phục vụ Arena Dashboard)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const logs = await AuditLogService.getRecentLogs(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trail', verifyToken, async (req, res) => {
  try {
    const logs = await AuditLogService.getRecentLogs(100);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
