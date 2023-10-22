import mongoose, { Schema, Types } from 'mongoose';
import { Account as SharedAccount } from '@shared/types/Account';

export interface Account extends Omit<SharedAccount, 'user'> {
  user: Types.ObjectId;
}

const accountSchema = new Schema<Account>({
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
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

export default mongoose.model<Account>('Account', accountSchema);
