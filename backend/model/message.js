import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'file', 'audio'], default: 'text' },
  fileId: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
