import mongoose, { Schema } from 'mongoose';

export interface Account {
  email: string;
  password: string;
  role: string;
  isApproved: boolean;
  userId: mongoose.Types.ObjectId;
}

const accountSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  password: String,
  role: {
    type: String,
    enum: ['admin', 'Faculty member', 'Teaching assistant', 'Student'],
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

const AccountModel = mongoose.model('Account', accountSchema);

export default AccountModel;