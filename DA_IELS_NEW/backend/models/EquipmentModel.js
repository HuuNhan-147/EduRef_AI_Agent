import mongoose from 'mongoose';

const equipmentModelSchema = new mongoose.Schema({
  modelCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  imageUrl: { type: String, default: '' },
  // Giá trị định giá thẩm định mốc thẩm quyền 20.000.000 VNĐ
  estimatedValue: { type: Number, required: true, min: 0 },
  maxLoanDaysDefault: { type: Number, default: 7 },
  description: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('EquipmentModel', equipmentModelSchema);
