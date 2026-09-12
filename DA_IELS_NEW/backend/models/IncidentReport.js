import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema({
  loanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  incidentType: {
    type: String,
    enum: ['PHYSICAL_DAMAGE', 'LOST_ACCESSORY', 'LOST_EQUIPMENT', 'LIQUID_SPILL', 'OVERDUE_UNREACHABLE'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['MINOR', 'MODERATE', 'CRITICAL', 'TOTAL_LOSS'],
    default: 'MODERATE'
  },
  
  estimatedDamageFee: { type: Number, default: 0 },
  responsibleUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  explanation: { type: String, default: '' },
  
  resolutionStatus: {
    type: String,
    enum: ['OPEN', 'UNDER_INVESTIGATION', 'COMPENSATED', 'WAIVED_BY_COMPANY'],
    default: 'OPEN'
  }
}, { timestamps: true });

export default mongoose.model('IncidentReport', incidentReportSchema);
