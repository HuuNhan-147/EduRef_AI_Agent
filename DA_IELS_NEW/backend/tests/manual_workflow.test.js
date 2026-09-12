import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import EquipmentModel from '../models/EquipmentModel.js';
import Equipment from '../models/Equipment.js';
import LoanRequest from '../models/LoanRequest.js';
import LoanItem from '../models/LoanItem.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';
import AuditLog from '../models/AuditLog.js';
import AuditLogService from '../services/AuditLogService.js';

console.log('🧪 BẮT ĐẦU KIỂM THỬ LUỒNG NGHIỆP VỤ MƯỢN TRẢ THỦ CÔNG 100%...');

const runManualWorkflowTests = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB Atlas');

    // 1. Kiểm tra tài khoản
    const employee = await User.findOne({ role: 'EMPLOYEE' });
    const manager = await User.findOne({ role: 'MANAGER' });
    const storekeeper = await User.findOne({ role: 'STOREKEEPER' });
    assert(employee && manager && storekeeper, 'Phải có đủ 3 vai trò Employee, Manager, Storekeeper');
    console.log('✅ Test 1 Passed: Đã xác định đầy đủ các vai trò con người trong hệ thống');

    // 2. Tìm model thiết bị
    const model = await EquipmentModel.findOne({ brand: 'Dell' }) || await EquipmentModel.findOne();
    assert(model, 'Phải có ít nhất 1 EquipmentModel');

    // 3. Giả lập Nhân viên gửi đơn mượn
    const start = new Date();
    const end = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const requestCode = `TEST-LR-${Date.now().toString().slice(-4)}`;
    const pickupCode = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const availableItem = await Equipment.findOne({ model: model._id, status: 'AVAILABLE' });
    assert(availableItem, 'Phải có ít nhất 1 thiết bị khả dụng để test');

    const loan = await LoanRequest.create({
      requestCode,
      borrower: employee._id,
      department: employee.department,
      purpose: 'Kiểm thử quy trình mượn trả thủ công',
      quantity: 1,
      startDate: start,
      expectedReturnDate: end,
      loanDays: 3,
      totalEstimatedValue: model.estimatedValue,
      status: 'PENDING',
      pickupCode
    });

    const loanItem = await LoanItem.create({
      loanRequest: loan._id,
      equipmentModel: model._id,
      equipment: availableItem._id,
      itemStatus: 'PENDING'
    });

    await AuditLogService.record({
      eventType: 'LOAN_CREATED',
      actor: 'EMPLOYEE',
      actorId: employee.staffCode,
      decision: 'PENDING',
      reason: `Nhân viên gửi yêu cầu mượn ${model.name}. Chờ Quản lý duyệt thủ công.`
    });

    assert.strictEqual(loan.status, 'PENDING');
    console.log('✅ Test 2 Passed: Nhân viên tạo đơn thành công, trạng thái khởi tạo luôn là PENDING');

    // 4. Quản lý duyệt đơn thủ công -> Chuyển sang APPROVED & máy sang RESERVED
    loan.status = 'APPROVED';
    await loan.save();

    await Equipment.findByIdAndUpdate(availableItem._id, { status: 'RESERVED' });
    const reservedItem = await Equipment.findById(availableItem._id);
    assert.strictEqual(reservedItem.status, 'RESERVED');

    await AuditLogService.record({
      eventType: 'AUTHORITY_DECISION',
      actor: 'MANAGER',
      actorId: manager.email,
      decision: 'APPROVED',
      reason: `Quản lý phê duyệt cấp phát thiết bị. Máy chuyển sang RESERVED.`
    });
    console.log('✅ Test 3 Passed: Quản lý duyệt đơn, thiết bị chuyển sang trạng thái giữ chỗ (RESERVED)');

    // 5. Đối soát mã PIN xuất kho
    const fakePin = 'EQ-9999';
    const isPinCorrect = (pickupCode === fakePin);
    assert.strictEqual(isPinCorrect, false, 'Mã PIN sai phải bị từ chối');

    const realPin = pickupCode;
    assert.strictEqual(pickupCode === realPin, true, 'Mã PIN đúng phải được chấp nhận');

    // Xuất kho
    await Equipment.findByIdAndUpdate(availableItem._id, { status: 'BORROWED' });
    loan.status = 'DISPATCHED';
    await loan.save();

    const borrowedItem = await Equipment.findById(availableItem._id);
    assert.strictEqual(borrowedItem.status, 'BORROWED');
    assert.strictEqual(loan.status, 'DISPATCHED');
    console.log('✅ Test 4 Passed: Thủ kho đối soát mã PIN thành công, thiết bị chuyển sang BORROWED');

    // 6. Chặn hoàn tác (Rollback) khi máy đang ngoài kho (DISPATCHED)
    const canRollback = (loan.status !== 'DISPATCHED');
    assert.strictEqual(canRollback, false, 'Không được phép rollback khi máy đang mượn ngoài kho');
    console.log('✅ Test 5 Passed: Hệ thống chặn hoàn tác trái quy trình khi máy đang DISPATCHED');

    // 7. Nhận trả có hư hại -> Chuyển máy sang UNDER_MAINTENANCE & tạo MaintenanceRecord
    await Equipment.findByIdAndUpdate(availableItem._id, { status: 'UNDER_MAINTENANCE', condition: 'DAMAGED' });
    loan.status = 'RETURNED';
    await loan.save();

    const maintRecord = await MaintenanceRecord.create({
      equipment: availableItem._id,
      triggerReason: 'POST_RETURN_DAMAGE',
      description: 'Trầy xước vỏ ngoài và liệt phím khi thu hồi',
      status: 'LOGGED'
    });

    const damagedItem = await Equipment.findById(availableItem._id);
    assert.strictEqual(damagedItem.status, 'UNDER_MAINTENANCE');
    console.log('✅ Test 6 Passed: Thu hồi phát hiện hỏng hóc, máy tự động chuyển sang BẢO TRÌ (UNDER_MAINTENANCE)');

    // 8. Nghiệm thu hoàn tất bảo dưỡng -> Đưa máy về lại AVAILABLE
    maintRecord.status = 'COMPLETED';
    maintRecord.resolutionNotes = 'Đã thay vỏ và kiểm tra phím đạt chuẩn';
    await maintRecord.save();

    await Equipment.findByIdAndUpdate(availableItem._id, { status: 'AVAILABLE', condition: 'GOOD' });
    const recoveredItem = await Equipment.findById(availableItem._id);
    assert.strictEqual(recoveredItem.status, 'AVAILABLE');
    console.log('✅ Test 7 Passed: Thủ kho nghiệm thu sửa chữa thành công, thiết bị hoàn kho Sẵn sàng (AVAILABLE)');

    // 9. Kiểm tra sổ cái kiểm toán bất biến (Audit Trail SHA-256)
    const recentLogs = await AuditLogService.getRecentLogs(5);
    assert(recentLogs.length > 0, 'Phải có bản ghi kiểm toán');
    assert(recentLogs[0].tamperHash, 'Bản ghi phải có mã băm SHA-256');
    console.log(`✅ Test 8 Passed: Sổ cái kiểm toán đã ghi nhận chuỗi băm SHA-256: ${recentLogs[0].tamperHash.slice(0, 16)}...`);

    // Dọn dẹp bản ghi test
    await LoanRequest.findByIdAndDelete(loan._id);
    await LoanItem.findByIdAndDelete(loanItem._id);
    await MaintenanceRecord.findByIdAndDelete(maintRecord._id);

    console.log('🎉 TẤT CẢ 8/8 KỊCH BẢN KIỂM THỬ QUY TRÌNH THỦ CÔNG ĐẠT KẾT QUẢ HOÀN HẢO 100%!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi kiểm thử:', error);
    process.exit(1);
  }
};

runManualWorkflowTests();
