import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['SMART_LOCKER', 'WAREHOUSE', 'LAB', 'OFFICE'],
    default: 'WAREHOUSE'
  },
  building: { type: String, default: 'Tòa nhà Trung tâm' },
  floor: { type: String, default: 'Tầng 1' },
  shelfSlot: { type: String, default: '' },
  keeper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Location', locationSchema);
