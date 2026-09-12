import mongoose from 'mongoose';

const approvalActionSchema = new mongoose.Schema({
  loanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  actionType: {
    type: String,
    enum: ['AUTO_APPROVE', 'ESCALATE', 'APPROVE', 'REJECT'],
    required: true
  },
  actorType: {
    type: String,
    enum: ['AI_AGENT', 'MANAGER', 'ADMIN'],
    required: true
  },
  actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Null nếu do AI_AGENT
  
  decisionReason: { type: String, required: true },
  policyRule: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model('ApprovalAction', approvalActionSchema);
