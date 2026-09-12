import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'Package' }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
