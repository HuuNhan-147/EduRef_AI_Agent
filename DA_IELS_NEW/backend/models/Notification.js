import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['LOAN_APPROVED', 'LOAN_ESCALATED', 'READY_FOR_PICKUP', 'RETURN_REMINDER', 'OVERDUE_ALERT', 'MAINTENANCE_NOTICE'],
    default: 'LOAN_APPROVED'
  },
  loanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
