import express from 'express';
import {
  createLoanRequest,
  managerReviewLoan,
  checkoutLoan,
  checkinLoan,
  getLoanRequests,
  rollbackLoanRequest,
  getMaintenanceRecords,
  completeMaintenance
} from '../controllers/loanController.js';
import { verifyToken, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. Tạo và xem danh sách phiếu mượn (Bắt buộc đăng nhập)
router.post('/request', verifyToken, createLoanRequest);
router.get('/list', verifyToken, getLoanRequests);

// 2. Quản lý phê duyệt / từ chối phiếu mượn (Chỉ Manager hoặc Admin)
router.put('/:loanId/review', verifyToken, requireRoles('MANAGER', 'ADMIN'), managerReviewLoan);

// 3. Quyền can thiệp dừng & hoàn tác (Manager hoặc Admin)
router.put('/:loanId/rollback', verifyToken, requireRoles('MANAGER', 'ADMIN'), rollbackLoanRequest);

// 4. Thủ kho Check-out bàn giao xuất kho & Check-in thu hồi (Chỉ Storekeeper hoặc Admin)
router.put('/:loanId/checkout', verifyToken, requireRoles('STOREKEEPER', 'ADMIN'), checkoutLoan);
router.put('/:loanId/checkin', verifyToken, requireRoles('STOREKEEPER', 'ADMIN'), checkinLoan);

// 5. Quản lý Bảo trì thiết bị (Storekeeper, Manager, Admin)
router.get('/maintenance/list', verifyToken, requireRoles('STOREKEEPER', 'MANAGER', 'ADMIN'), getMaintenanceRecords);
router.put('/maintenance/:recordId/complete', verifyToken, requireRoles('STOREKEEPER', 'ADMIN'), completeMaintenance);

export default router;
