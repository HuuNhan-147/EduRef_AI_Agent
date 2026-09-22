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
import LoanRequest from '../models/LoanRequest.js';
import LoanItem from '../models/LoanItem.js';

const router = express.Router();

/**
 * GET /api/loans/public-list
 * Danh sách tất cả phiếu mượn — Không cần auth (phục vụ demo BGK & Arena)
 */
router.get('/public-list', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const status = req.query.status;
    const query = status && status !== 'ALL' ? { status } : {};
    const loans = await LoanRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('borrower', 'fullName email staffCode')
      .lean();

    // Gắn items cho từng phiếu
    const loansWithItems = await Promise.all(loans.map(async (loan) => {
      const items = await LoanItem.find({ loanRequest: loan._id })
        .populate({ path: 'equipmentModel', select: 'name modelCode estimatedValue brand imageUrl' })
        .populate({ path: 'equipment', select: 'assetCode status' })
        .lean();
      return { ...loan, items };
    }));

    res.json({ success: true, count: loansWithItems.length, data: loansWithItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

