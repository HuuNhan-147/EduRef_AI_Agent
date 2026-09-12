import mongoose from 'mongoose';

const loanRequestSchema = new mongoose.Schema({
  requestCode: { type: String, required: true, unique: true, uppercase: true, trim: true }, // LR-202609-001
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  
  purpose: { type: String, required: true, trim: true },
  purposeCategory: {
    type: String,
    enum: ['PROJECT_TASK', 'TEACHING_STUDY', 'EVENT_CONFERENCE', 'PERSONAL_OTHER'],
    default: 'PROJECT_TASK'
  },
  project: { type: String, default: '' },
  locationOfUse: { type: String, default: 'Phòng họp / Văn phòng công ty' },
  
  quantity: { type: Number, default: 1, min: 1 },
  startDate: { type: Date, required: true },
  pickupTime: { type: String, default: '08:30' },
  expectedReturnDate: { type: Date, required: true },
  returnTime: { type: String, default: '17:30' },
  loanDays: { type: Number, required: true, min: 1 },
  
  // Vị trí tủ thông minh nhận đồ và mã QR
  pickupLockerSlot: { type: String, default: 'Tủ Smart Locker Tầng 1 - Ngăn A01' },
  qrCode: { type: String, default: '' },
  
  // Đánh giá thẩm quyền theo chính sách
  totalEstimatedValue: { type: Number, default: 0 },
  maxItemValue: { type: Number, default: 0 },
  
  status: {
    type: String,
    enum: [
      'PENDING',            // Đang chờ xử lý
      'AUTO_APPROVED',      // AI tự động duyệt (<= 20M và <= 7 ngày)
      'ESCALATED_MANAGER',  // Chuyển cấp Quản lý (> 20M hoặc > 7 ngày)
      'APPROVED',           // Quản lý đã duyệt
      'REJECTED',           // Từ chối
      'DISPATCHED',         // Đã nhận đồ / xuất kho
      'RETURNED',           // Đã trả đồ hoàn tất
      'OVERDUE',            // Quá hạn
      'CANCELLED'           // Đã hủy
    ],
    default: 'PENDING'
  },
  
  escalationReason: { type: String, default: '' },
  policyRuleApplied: { type: String, default: '' }, // POL-VAL-001 hoặc POL-DUR-001
  
  pickupCode: { type: String, default: '' }, // Mã PIN lấy đồ (ví dụ: EQ-8752)
  pickupDeadline: { type: Date },
  actualReturnDate: { type: Date },
  
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('LoanRequest', loanRequestSchema);
