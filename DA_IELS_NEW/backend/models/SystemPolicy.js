import mongoose from 'mongoose';

const systemPolicySchema = new mongoose.Schema({
  ruleId: { type: String, required: true, unique: true, uppercase: true }, // POL-VAL-001, POL-DUR-001
  name: { type: String, required: true },
  category: { type: String, enum: ['VALUE_LIMIT', 'DURATION_LIMIT', 'DEPARTMENT_RESTRICTION', 'BLACK_LIST'], default: 'VALUE_LIMIT' },
  parameters: {
    maxValue: { type: Number, default: 20000000 }, // Ngưỡng 20M
    maxDays: { type: Number, default: 7 }          // Ngưỡng 7 ngày
  },
  description: { type: String, required: true },
  actionOnBreach: { type: String, enum: ['ESCALATE_MANAGER', 'AUTO_REJECT'], default: 'ESCALATE_MANAGER' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('SystemPolicy', systemPolicySchema);
