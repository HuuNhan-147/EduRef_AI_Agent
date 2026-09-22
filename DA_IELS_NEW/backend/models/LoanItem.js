import mongoose from 'mongoose';

const loanItemSchema = new mongoose.Schema({
  loanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  equipmentModel: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentModel', required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }, // Thiết bị cá thể được gán khi xuất kho
  
  requestedQuantity: { type: Number, default: 1 },
  estimatedValueSnapshot: { type: Number, default: 0 },
  
  initialCondition: { type: String, default: 'GOOD' },
  returnedCondition: { type: String },
  itemStatus: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'CHECKED_OUT', 'RETURNED', 'DAMAGED', 'LOST', 'CANCELLED'],
    default: 'PENDING'
  }
}, { timestamps: true });

export default mongoose.model('LoanItem', loanItemSchema);
