import express from 'express';
import {
  getEquipmentStats,
  getEquipmentCatalog,
  getPhysicalItemsByModel,
  getMasterData,
  createEquipmentModel,
  updateEquipmentModel,
  deleteEquipmentModel
} from '../controllers/equipmentController.js';
import { verifyToken, requireRoles } from '../middlewares/authMiddleware.js';
import { searchEquipment } from '../modules/ai-agent/tools/actions/equipmentTools.js';

const router = express.Router();

// 🔍 Tra cứu thiết bị cho AI Agent, WebMCP & Client (Công khai không chặn Token)
router.get(['/', '/search'], async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice, isHighValue, limit } = req.query;
    console.log(`📡 [API GET /api/equipment] Query params:`, req.query);
    const result = await searchEquipment({
      keyword: keyword || '',
      category: category || '',
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 0,
      isHighValue: isHighValue === 'true' ? true : isHighValue === 'false' ? false : null,
      limit: limit || 10
    });
    console.log(`📦 [API GET /api/equipment] Trả về: ${result.count || 0} thiết bị`);
    res.json(result);
  } catch (err) {
    console.error('❌ Error in /api/equipment:', err);
    res.status(500).json({ success: false, error: err.message, equipments: [], data: [] });
  }
});

// Xem catalog & master data (Yêu cầu đăng nhập)
router.get('/stats', verifyToken, getEquipmentStats);
router.get('/catalog', verifyToken, getEquipmentCatalog);
router.get('/master', verifyToken, getMasterData);
router.get('/model/:modelId/items', verifyToken, getPhysicalItemsByModel);

// CRUD quản lý kho (Chỉ Admin & Storekeeper)
router.post('/model', verifyToken, requireRoles('ADMIN', 'STOREKEEPER'), createEquipmentModel);
router.put('/model/:id', verifyToken, requireRoles('ADMIN', 'STOREKEEPER'), updateEquipmentModel);
router.delete('/model/:id', verifyToken, requireRoles('ADMIN'), deleteEquipmentModel);

export default router;
