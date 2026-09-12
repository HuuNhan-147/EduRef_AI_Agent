import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentModel', required: true },
  assetCode: { type: String, required: true, unique: true, uppercase: true, trim: true }, // Mã tài sản: EQ-LAP-001
  serialNumber: { type: String, required: true, unique: true, trim: true },
  qrCode: { type: String, unique: true, sparse: true },
  
  // Tình trạng vật lý
  condition: {
    type: String,
    enum: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
    default: 'GOOD'
  },
  
  // Trạng thái vận hành trong kho
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'BORROWED', 'UNDER_MAINTENANCE', 'DISPOSED'],
    default: 'AVAILABLE'
  },
  
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  purchaseDate: { type: Date, default: Date.now },
  warrantyExpiry: { type: Date },
  actualValue: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Equipment', equipmentSchema);
