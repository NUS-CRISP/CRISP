import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  password: String,
  role: {
    type: String,
    enum: ['admin', 'Faculty member', 'Teaching assistant'],
    default: 'Teaching assistant',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

export default mongoose.model('Account', accountSchema);
