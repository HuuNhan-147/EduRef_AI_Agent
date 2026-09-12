import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  budgetRiskLimit: { type: Number, default: 50000000 } // 50 triệu VNĐ
}, { timestamps: true });

export default mongoose.model('Department', departmentSchema);
