import LoanRequest from '../models/LoanRequest.js';
import LoanItem from '../models/LoanItem.js';
import EquipmentModel from '../models/EquipmentModel.js';
import Equipment from '../models/Equipment.js';
import HandoverRecord from '../models/HandoverRecord.js';
import ApprovalAction from '../models/ApprovalAction.js';
import IncidentReport from '../models/IncidentReport.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import AuditLogService from '../services/AuditLogService.js';

// Helper tạo mã PIN nhận đồ 6 ký tự ngẫu nhiên
const generatePickupCode = () => `EQ-${Math.floor(1000 + Math.random() * 9000)}`;

// 1. [BƯỚC 1]: Tạo phiếu mượn thủ công (Có kiểm tra trùng lịch mượn)
export const createLoanRequest = async (req, res) => {
  try {
    const {
      modelId,
      startDate,
      expectedReturnDate,
      pickupTime = '08:30',
      returnTime = '17:30',
      purpose,
      purposeCategory = 'PROJECT_TASK',
      locationOfUse = 'Phòng họp / Văn phòng công ty',
      project,
      quantity = 1,
      borrowerEmail
    } = req.body;

    if (!modelId || !startDate || !expectedReturnDate || !purpose) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin mượn thiết bị' });
    }

    // Xác định người mượn: ưu tiên qua Token xác thực
    let borrower = null;
    if (req.user?.userId) {
      borrower = await User.findById(req.user.userId);
    } else if (borrowerEmail) {
      borrower = await User.findOne({ email: borrowerEmail });
    }
    if (!borrower) {
      borrower = await User.findOne({ role: 'EMPLOYEE' });
    }

    // Ràng buộc 1: Kiểm tra xem nhân viên có đang nợ đồ quá hạn (OVERDUE) không
    const hasOverdue = await LoanRequest.exists({ borrower: borrower._id, status: 'OVERDUE' });
    if (hasOverdue) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn đang có thiết bị quá hạn chưa hoàn trả kho. Bạn không được tạo thêm phiếu mới!'
      });
    }

    const model = await EquipmentModel.findById(modelId);
    if (!model) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết bị' });
    }

    const reqQty = Math.max(1, Number(quantity) || 1);
    const start = new Date(startDate);
    const end = new Date(expectedReturnDate);

    if (end < start) {
      return res.status(400).json({ success: false, message: 'Ngày trả dự kiến không thể trước ngày nhận thiết bị!' });
    }

    // [RÀNG BUỘC CHỐNG TRÙNG LỊCH]: Kiểm tra số lượng máy khả dụng trong khoảng thời gian [start, end]
    // 1. Tổng số máy của model trong kho (loại trừ máy đã thanh lý DISPOSED)
    const totalPhysicalItems = await Equipment.find({ model: modelId, status: { $ne: 'DISPOSED' } });
    const totalCount = totalPhysicalItems.length;

    // 2. Số máy đang bị hỏng/bảo trì
    const maintenanceItems = await Equipment.find({ model: modelId, status: 'UNDER_MAINTENANCE' });
    const maintenanceIds = new Set(maintenanceItems.map(m => m._id.toString()));

    // 3. Tìm các đơn mượn đang chiếm máy trùng khoảng thời gian [start, end] (đơn APPROVED hoặc DISPATCHED)
    const overlappingLoans = await LoanRequest.find({
      status: { $in: ['APPROVED', 'DISPATCHED'] },
      startDate: { $lte: end },
      expectedReturnDate: { $gte: start }
    }).select('_id');

    const overlappingLoanIds = overlappingLoans.map(l => l._id);
    const occupiedItems = await LoanItem.find({
      loanRequest: { $in: overlappingLoanIds },
      equipmentModel: modelId,
      itemStatus: { $in: ['PENDING', 'ASSIGNED', 'CHECKED_OUT'] }
    }).select('equipment');

    const occupiedEquipmentIds = new Set(occupiedItems.map(it => it.equipment?.toString()).filter(Boolean));

    // 4. Lọc ra các máy thực sự rảnh trong khung giờ này
    const availableItems = totalPhysicalItems.filter(eq => 
      !maintenanceIds.has(eq._id.toString()) && 
      !occupiedEquipmentIds.has(eq._id.toString())
    );

    if (availableItems.length < reqQty) {
      return res.status(400).json({
        success: false,
        message: `Rất tiếc, trong khoảng thời gian từ ${start.toLocaleDateString('vi-VN')} đến ${end.toLocaleDateString('vi-VN')}, chỉ còn ${availableItems.length} thiết bị khả dụng (không đủ số lượng yêu cầu ${reqQty})!`
      });
    }

    // Chọn các máy cá thể gán tạm thời cho đơn mượn
    const selectedEquipments = availableItems.slice(0, reqQty);

    // Tính số ngày mượn
    const diffTime = Math.abs(end - start);
    const loanDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const requestCode = `LR-${Date.now().toString().slice(-6)}`;
    const pickupCode = generatePickupCode();

    // Vị trí tủ nhận đồ
    const primaryItem = selectedEquipments[0];
    const lockerSlot = primaryItem?.location
      ? `${primaryItem.location.name || 'Kho'} - ${primaryItem.location.shelfSlot || 'Ngăn Tủ A01'}`
      : 'Tủ Smart Locker Tầng 1 - Ngăn A01';

    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pickupCode}&color=2563eb`;

    // Tạo phiếu mượn ở trạng thái PENDING (Chờ Quản lý duyệt thủ công 100%)
    const loan = await LoanRequest.create({
      requestCode,
      borrower: borrower._id,
      department: borrower.department,
      purpose,
      purposeCategory,
      project: project || 'Nhiệm vụ nội bộ',
      locationOfUse,
      quantity: reqQty,
      startDate: start,
      pickupTime,
      expectedReturnDate: end,
      returnTime,
      loanDays,
      totalEstimatedValue: model.estimatedValue * reqQty,
      maxItemValue: model.estimatedValue,
      status: 'PENDING',
      pickupCode,
      pickupLockerSlot: lockerSlot,
      qrCode,
      pickupDeadline: new Date(Date.now() + 48 * 3600 * 1000)
    });

    // Tạo món chi tiết cho từng máy cá thể
    for (const eqItem of selectedEquipments) {
      await LoanItem.create({
        loanRequest: loan._id,
        equipmentModel: model._id,
        equipment: eqItem._id,
        estimatedValueSnapshot: model.estimatedValue,
        itemStatus: 'PENDING'
      });
    }

    // Ghi sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'LOAN_CREATED',
      actor: req.user?.role || 'EMPLOYEE',
      actorId: borrower.staffCode || borrower.email,
      decision: 'PENDING',
      policyRuleId: 'MANUAL_LENDING_POLICY',
      factsSnapshot: {
        assetCode: primaryItem?.assetCode,
        modelName: model.name,
        estimatedValue: model.estimatedValue,
        loanDays,
        borrowerStaffCode: borrower.staffCode
      },
      reason: `Nhân viên ${borrower.fullName} gửi yêu cầu mượn ${reqQty} thiết bị ${model.name} (${loanDays} ngày). Phiếu đang chờ Quản lý duyệt.`
    });

    res.status(201).json({
      success: true,
      data: loan,
      message: `Đã gửi phiếu mượn ${requestCode} thành công! Phiếu đang chờ Quản lý phê duyệt.`
    });
  } catch (error) {
    console.error('Error creating loan request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. [BƯỚC 2 DÀNH CHO QUẢN LÝ]: Phê duyệt hoặc từ chối phiếu mượn thủ công
export const managerReviewLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { decision, reviewReason } = req.body; // 'APPROVE' hoặc 'REJECT'

    const loan = await LoanRequest.findById(loanId).populate('borrower');
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu mượn' });
    }

    if (loan.status !== 'PENDING' && loan.status !== 'ESCALATED_MANAGER') {
      return res.status(400).json({ success: false, message: 'Phiếu này không ở trạng thái chờ Quản lý duyệt' });
    }

    // [RÀNG BUỘC CHỐNG TỰ DUYỆT]: Quản lý không được duyệt phiếu của chính mình
    if (req.user?.userId && loan.borrower._id.toString() === req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không được phép tự phê duyệt phiếu mượn của chính mình!' });
    }

    if (decision === 'APPROVE') {
      loan.status = 'APPROVED';
      if (!loan.pickupCode) loan.pickupCode = generatePickupCode();
      loan.pickupDeadline = new Date(Date.now() + 48 * 3600 * 1000);

      // Cập nhật các máy cá thể sang trạng thái RESERVED để giữ chỗ
      const loanItems = await LoanItem.find({ loanRequest: loan._id });
      for (const it of loanItems) {
        if (it.equipment) {
          await Equipment.findByIdAndUpdate(it.equipment, { status: 'RESERVED' });
        }
        it.itemStatus = 'ASSIGNED';
        await it.save();
      }
    } else {
      if (!reviewReason || !reviewReason.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do khi từ chối phiếu mượn!' });
      }
      loan.status = 'REJECTED';
    }

    loan.notes = reviewReason || '';
    await loan.save();

    // Ghi nhận Approval Action
    await ApprovalAction.create({
      loanRequest: loan._id,
      actionType: decision === 'APPROVE' ? 'APPROVE' : 'REJECT',
      actorType: 'MANAGER',
      actorUser: req.user?.userId || null,
      decisionReason: reviewReason || (decision === 'APPROVE' ? 'Quản lý phê duyệt cấp phát thiết bị' : 'Quản lý từ chối yêu cầu'),
      policyRule: 'MANUAL_MANAGER_DISCRETION'
    });

    // Ghi nhận sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'AUTHORITY_DECISION',
      actor: req.user?.role || 'MANAGER',
      actorId: req.user?.email || 'MANAGER',
      decision: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      policyRuleId: 'MANUAL_MANAGER_REVIEW',
      factsSnapshot: {
        estimatedValue: loan.totalEstimatedValue,
        loanDays: loan.loanDays,
        borrowerStaffCode: loan.borrower.staffCode
      },
      reason: decision === 'APPROVE'
        ? `Quản lý đã phê duyệt cấp phát phiếu ${loan.requestCode}. Mã nhận đồ: ${loan.pickupCode}. Thiết bị đã được chuyển sang trạng thái RESERVED.`
        : `Quản lý đã từ chối phiếu ${loan.requestCode}. Lý do: ${reviewReason}`
    });

    res.json({
      success: true,
      data: loan,
      message: decision === 'APPROVE'
        ? `Quản lý đã phê duyệt phiếu mượn thành công. Mã nhận đồ: ${loan.pickupCode}`
        : 'Quản lý đã từ chối phiếu mượn'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. [BƯỚC 3 THỦ KHO CHECK-OUT]: Thủ kho xác nhận xuất kho bàn giao (Có đối soát mã PIN)
export const checkoutLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { verificationCode } = req.body;

    const loan = await LoanRequest.findById(loanId).populate('borrower');
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu mượn' });
    }

    if (loan.status !== 'APPROVED' && loan.status !== 'AUTO_APPROVED') {
      return res.status(400).json({ success: false, message: 'Phiếu mượn chưa được phê duyệt nên không thể xuất kho!' });
    }

    // [RÀNG BUỘC ĐỐI SOÁT MÃ PIN]: Bắt buộc nhập đúng mã PIN nhận đồ của nhân viên
    if (!verificationCode || verificationCode.trim().toUpperCase() !== loan.pickupCode.trim().toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Mã PIN nhận đồ không chính xác! Vui lòng kiểm tra và đối soát lại với người nhận.'
      });
    }

    // Lấy danh sách máy cá thể trong đơn
    const loanItems = await LoanItem.find({ loanRequest: loan._id }).populate('equipment');
    if (!loanItems.length) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy thiết bị gán cho phiếu mượn' });
    }

    // Cập nhật trạng thái từng máy cá thể sang BORROWED
    for (const item of loanItems) {
      if (item.equipment) {
        await Equipment.findByIdAndUpdate(item.equipment._id, { status: 'BORROWED' });
        item.itemStatus = 'CHECKED_OUT';
        await item.save();

        // Tạo biên bản xuất kho HandoverRecord cho từng máy
        await HandoverRecord.create({
          loanRequest: loan._id,
          equipment: item.equipment._id,
          handoverType: 'CHECK_OUT',
          storekeeper: req.user?.userId || loan.borrower._id,
          borrower: loan.borrower._id,
          verificationCodeUsed: verificationCode.trim().toUpperCase(),
          conditionAtHandover: item.equipment.condition || 'GOOD',
          accessoriesIncluded: ['Dây nguồn', 'Cáp kết nối', 'Túi đựng tiêu chuẩn']
        });
      }
    }

    loan.status = 'DISPATCHED';
    await loan.save();

    // Ghi nhận sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'CHECKOUT_VERIFIED',
      actor: req.user?.role || 'STOREKEEPER',
      actorId: req.user?.email || 'STOREKEEPER',
      decision: 'EXECUTED',
      policyRuleId: 'HANDOVER_PIN_VERIFICATION',
      factsSnapshot: {
        loanDays: loan.loanDays,
        borrowerStaffCode: loan.borrower.staffCode
      },
      reason: `Thủ kho đã đối soát thành công mã PIN [${verificationCode}] và bàn giao ${loanItems.length} thiết bị cho nhân viên ${loan.borrower.fullName}. Đơn chuyển sang DISPATCHED.`
    });

    res.json({
      success: true,
      message: `Thủ kho đã đối soát mã PIN và bàn giao thiết bị thành công cho nhân viên ${loan.borrower.fullName}!`,
      data: { loan }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. [BƯỚC 4 THỦ KHO CHECK-IN]: Thu hồi thiết bị, kiểm định ngoại quan và hoàn kho
export const checkinLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { condition, hasDamage, damageNotes, estimatedDamageFee } = req.body;

    const loan = await LoanRequest.findById(loanId).populate('borrower');
    if (!loan || loan.status !== 'DISPATCHED') {
      return res.status(400).json({ success: false, message: 'Phiếu mượn không ở trạng thái đang mượn (DISPATCHED)' });
    }

    const loanItems = await LoanItem.find({ loanRequest: loan._id }).populate('equipment');

    for (const loanItem of loanItems) {
      const equipment = await Equipment.findById(loanItem.equipment?._id || loanItem.equipment);
      if (!equipment) continue;

      if (hasDamage) {
        equipment.status = 'UNDER_MAINTENANCE';
        equipment.condition = condition || 'DAMAGED';
        await equipment.save();

        // Tạo biên bản sự cố
        await IncidentReport.create({
          loanRequest: loan._id,
          equipment: equipment._id,
          reporter: req.user?.userId || loan.borrower._id,
          incidentType: 'PHYSICAL_DAMAGE',
          severity: 'MODERATE',
          estimatedDamageFee: Number(estimatedDamageFee) || 500000,
          responsibleUser: loan.borrower._id,
          explanation: damageNotes || 'Phát hiện trầy xước/hư hỏng khi thu hồi thiết bị'
        });

        // Tạo lệnh bảo trì
        await MaintenanceRecord.create({
          equipment: equipment._id,
          triggerReason: 'POST_RETURN_DAMAGE',
          description: `Bảo dưỡng sau thu hồi phiếu ${loan.requestCode}: ${damageNotes || 'Hư hỏng vật lý'}`,
          status: 'LOGGED'
        });
      } else {
        equipment.status = 'AVAILABLE';
        equipment.condition = condition || 'GOOD';
        await equipment.save();
      }

      loanItem.itemStatus = hasDamage ? 'DAMAGED' : 'RETURNED';
      loanItem.returnedCondition = condition || 'GOOD';
      await loanItem.save();

      // Tạo biên bản thu hồi HandoverRecord
      await HandoverRecord.create({
        loanRequest: loan._id,
        equipment: equipment._id,
        handoverType: 'CHECK_IN',
        storekeeper: req.user?.userId || loan.borrower._id,
        borrower: loan.borrower._id,
        conditionAtHandover: condition || 'GOOD',
        inspectionNotes: damageNotes || 'Thiết bị hoạt động bình thường, nguyên vẹn'
      });
    }

    loan.status = 'RETURNED';
    loan.actualReturnDate = new Date();
    await loan.save();

    // Ghi nhận sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'RETURN_INSPECTED',
      actor: req.user?.role || 'STOREKEEPER',
      actorId: req.user?.email || 'STOREKEEPER',
      decision: 'EXECUTED',
      policyRuleId: 'RETURN_INSPECTION_POLICY',
      factsSnapshot: {
        borrowerStaffCode: loan.borrower.staffCode
      },
      reason: hasDamage
        ? `Đã thu hồi thiết bị từ ${loan.borrower.fullName}. Phát hiện hư hại (${damageNotes || 'Hư hỏng'}), thiết bị đã chuyển sang chế độ Bảo Trì.`
        : `Đã thu hồi thiết bị từ ${loan.borrower.fullName} an toàn, nguyên vẹn. Tồn kho khả dụng đã được khôi phục.`
    });

    res.json({
      success: true,
      message: hasDamage
        ? `Đã thu hồi thiết bị. Phát hiện hư hại, thiết bị đã được chuyển sang chế độ Bảo Trì!`
        : `Đã thu hồi thiết bị thành công. Tồn kho khả dụng đã được khôi phục hoàn toàn!`,
      data: { loan }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Lấy danh sách phiếu mượn
export const getLoanRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== 'ALL') query.status = status;

    const loans = await LoanRequest.find(query)
      .populate('borrower', 'staffCode fullName email phone')
      .populate({
        path: 'department',
        select: 'name code'
      })
      .sort({ createdAt: -1 })
      .lean();

    // Nạp thêm chi tiết item
    const fullLoans = await Promise.all(
      loans.map(async (l) => {
        const item = await LoanItem.findOne({ loanRequest: l._id })
          .populate('equipmentModel')
          .populate('equipment');
        return { ...l, item };
      })
    );

    res.json({ success: true, count: fullLoans.length, data: fullLoans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. [MỤC 6.2]: Hoàn tác / Can thiệp dừng phiếu mượn (Có ràng buộc an toàn)
export const rollbackLoanRequest = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { rollbackReason } = req.body;

    const loan = await LoanRequest.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu mượn' });
    }

    // [RÀNG BUỘC AN TOÀN]: Cấm hoàn tác khi thiết bị đang ở ngoài kho (DISPATCHED)
    if (loan.status === 'DISPATCHED') {
      return res.status(400).json({
        success: false,
        message: 'Phiếu mượn đã xuất kho bàn giao (thiết bị đang ở ngoài kho), không thể hoàn tác! Vui lòng thực hiện quy trình thu hồi hoàn kho tại quầy Thủ kho.'
      });
    }

    if (loan.status === 'RETURNED' || loan.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Phiếu mượn đã kết thúc hoặc đã bị hủy, không thể hoàn tác!' });
    }

    // Nếu phiếu đã được duyệt (APPROVED) và máy đang giữ chỗ (RESERVED): giải phóng về AVAILABLE
    const items = await LoanItem.find({ loanRequest: loan._id });
    for (const it of items) {
      if (it.equipment) {
        await Equipment.findByIdAndUpdate(it.equipment, { status: 'AVAILABLE' });
      }
      it.itemStatus = 'CANCELLED';
      await it.save();
    }

    const oldStatus = loan.status;
    loan.status = 'CANCELLED';
    loan.pickupCode = ''; // Thu hồi mã nhận đồ
    loan.notes = `[HOÀN TÁC ROLLBACK] ${rollbackReason || 'Quản lý hủy bỏ cấp phát'}. (Trạng thái trước: ${oldStatus})`;
    await loan.save();

    // Ghi nhận Approval Action
    await ApprovalAction.create({
      loanRequest: loan._id,
      actionType: 'REJECT',
      actorType: req.user?.role || 'MANAGER',
      actorUser: req.user?.userId || null,
      decisionReason: rollbackReason || 'Quyền can thiệp dừng & hoàn tác khẩn cấp',
      policyRule: 'HUMAN_ROLLBACK_OVERRIDE'
    });

    // Ghi nhận sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'MANAGER_OVERRIDE',
      actor: req.user?.role || 'MANAGER',
      actorId: req.user?.email || 'MANAGER',
      decision: 'CANCELLED',
      policyRuleId: 'HUMAN_ROLLBACK_OVERRIDE',
      factsSnapshot: {
        loanDays: loan.loanDays
      },
      reason: `Hoàn tác/Hủy phiếu ${loan.requestCode}: ${rollbackReason || 'Quản lý can thiệp dừng'}. Khôi phục trạng thái máy về AVAILABLE.`
    });

    res.json({
      success: true,
      message: `Đã thực hiện hoàn tác phiếu mượn ${loan.requestCode}. Thu hồi mã nhận đồ và khôi phục tồn kho thành công!`,
      data: loan
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. [BẢO TRÌ]: Lấy danh sách máy đang bảo dưỡng / sửa chữa
export const getMaintenanceRecords = async (req, res) => {
  try {
    const records = await MaintenanceRecord.find()
      .populate({
        path: 'equipment',
        populate: { path: 'model' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. [BẢO TRÌ]: Thủ kho / Kỹ thuật viên nghiệm thu hoàn tất bảo trì, đưa máy về kho AVAILABLE
export const completeMaintenance = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { resolutionNotes, actualCost } = req.body;

    const record = await MaintenanceRecord.findById(recordId).populate('equipment');
    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu bảo trì' });
    }

    if (record.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Phiếu bảo trì này đã được nghiệm thu hoàn tất trước đó!' });
    }

    record.status = 'COMPLETED';
    record.completedDate = new Date();
    record.resolutionNotes = resolutionNotes || 'Thiết bị đã được sửa chữa, căn chỉnh và kiểm tra ngoại quan đạt chuẩn xuất kho';
    if (actualCost) record.cost = Number(actualCost);
    await record.save();

    // Khôi phục máy về trạng thái AVAILABLE
    if (record.equipment) {
      await Equipment.findByIdAndUpdate(record.equipment._id, {
        status: 'AVAILABLE',
        condition: 'GOOD'
      });
    }

    // Ghi nhận sổ cái kiểm toán bất biến (Audit Trail)
    await AuditLogService.record({
      eventType: 'MAINTENANCE_COMPLETED',
      actor: req.user?.role || 'STOREKEEPER',
      actorId: req.user?.email || 'STOREKEEPER',
      decision: 'COMPLETED',
      policyRuleId: 'MAINTENANCE_RECOVERY_POLICY',
      factsSnapshot: {
        assetCode: record.equipment?.assetCode
      },
      reason: `Nghiệm thu bảo trì thành công cho thiết bị ${record.equipment?.assetCode || ''}. Máy đã được đưa trở lại kho ở trạng thái AVAILABLE.`
    });

    res.json({
      success: true,
      message: `Đã nghiệm thu thiết bị thành công! Máy đã được chuyển về trạng thái Sẵn sàng (AVAILABLE).`,
      data: record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
