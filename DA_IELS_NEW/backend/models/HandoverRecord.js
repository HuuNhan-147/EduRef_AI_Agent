import mongoose from 'mongoose';

const handoverRecordSchema = new mongoose.Schema({
  loanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  
  handoverType: {
    type: String,
    enum: ['CHECK_OUT', 'CHECK_IN'], // CHECK_OUT: giao đồ; CHECK_IN: nhận trả
    required: true
  },
  
  storekeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  verificationCodeUsed: { type: String, default: '' },
  conditionAtHandover: {
    type: String,
    enum: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
    default: 'GOOD'
  },
  
  accessoriesIncluded: [{ type: String }], // Dây nguồn, sạc, túi chống sốc, cáp HDMI...
  inspectionNotes: { type: String, default: '' },
  evidencePhotoUrl: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('HandoverRecord', handoverRecordSchema);
