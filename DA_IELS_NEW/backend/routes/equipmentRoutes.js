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

const router = express.Router();

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
