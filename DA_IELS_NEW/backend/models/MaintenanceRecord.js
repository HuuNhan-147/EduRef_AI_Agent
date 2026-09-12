import mongoose from 'mongoose';

const maintenanceRecordSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  triggerReason: {
    type: String,
    enum: ['SCHEDULED_SERVICE', 'POST_RETURN_DAMAGE', 'REPORTED_FAULT', 'CALIBRATION'],
    default: 'POST_RETURN_DAMAGE'
  },
  description: { type: String, required: true },
  serviceProvider: { type: String, default: 'Trung tâm Bảo hành Chính hãng' },
  cost: { type: Number, default: 0 },
  sentDate: { type: Date, default: Date.now },
  expectedCompletionDate: { type: Date },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['LOGGED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'SCRAPPED'],
    default: 'LOGGED'
  },
  resolutionNotes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
