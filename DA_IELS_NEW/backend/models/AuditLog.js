import mongoose from 'mongoose';
import crypto from 'crypto';

const auditLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now, index: true },
  
  eventType: {
    type: String,
    enum: [
      'POLICY_EVALUATION',
      'AUTHORITY_DECISION',
      'ESCALATION_TRIGGERED',
      'MANAGER_OVERRIDE',
      'CHECKOUT_VERIFIED',
      'RETURN_INSPECTED',
      'TOOL_INVOCATION',
      'LOAN_CREATED',
      'MAINTENANCE_COMPLETED'
    ],
    required: true
  },
  
  actor: {
    type: String,
    enum: ['AI_AGENT', 'MANAGER', 'STOREKEEPER', 'ADMIN', 'SYSTEM', 'EMPLOYEE'],
    required: true
  },
  actorId: { type: String, default: 'SYSTEM_AGENT' },
  
  // Quyết định phát ra
  decision: {
    type: String,
    enum: ['AUTO_APPROVED', 'ESCALATED_MANAGER', 'APPROVED', 'REJECTED', 'EXECUTED', 'PENDING', 'COMPLETED', 'CANCELLED'],
    required: true
  },
  
  // Căn cứ pháp lý / quy chế (Rule ID)
  policyRuleId: { type: String, default: '' },
  
  // Snapshot dữ kiện thực tế lúc ra quyết định (Fact-based Audit - TUYỆT ĐỐI KHÔNG LƯU CHAIN OF THOUGHT)
  factsSnapshot: {
    assetCode: { type: String },
    modelName: { type: String },
    estimatedValue: { type: Number },
    loanDays: { type: Number },
    borrowerStaffCode: { type: String },
    thresholdValueLimit: { type: Number, default: 20000000 },
    thresholdDaysLimit: { type: Number, default: 7 }
  },
  
  reason: { type: String, required: true },
  
  // Chống sửa đổi (Tamper-evident cryptographic hash)
  prevHash: { type: String, default: 'GENESIS_HASH' },
  tamperHash: { type: String, required: true }
}, { timestamps: false });

// Helper tính hash SHA-256 cho audit log
auditLogSchema.statics.generateHash = function (data, prevHash = 'GENESIS_HASH') {
  const content = `${prevHash}|${data.logId}|${data.eventType}|${data.actor}|${data.decision}|${data.policyRuleId}|${JSON.stringify(data.factsSnapshot)}|${data.reason}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

export default mongoose.model('AuditLog', auditLogSchema);
