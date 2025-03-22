import mongoose, { Schema, Types } from 'mongoose';
import { Account as SharedAccount } from '@shared/types/Account';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

export interface Account extends Omit<SharedAccount, 'user'>, Document {
  user: Types.ObjectId;
}

const CourseRoleTupleSchema = new mongoose.Schema(
  {
    course: { type: String, required: true },
    courseRole: {
      type: String,
      enum: Object.values(CourseRole),
      default: CourseRole.TA,
    },
  },
  { _id: false }
);

const accountSchema = new Schema<Account>({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: true,
  },
  emailNotificationType: {
    type: String,
    required: false,
  },
  emailNotificationHour: {
    type: Number,
    required: false,
  },
  emailNotificationWeekday: {
    type: Number,
    required: false,
  },
  telegramChatId: {
    type: Number,
    required: false,
  },
  telegramNotificationType: {
    type: String,
    required: false,
  },
  telegramNotificationHour: {
    type: Number,
    required: false,
  },
  telegramNotificationWeekday: {
    type: Number,
    required: false,
  },
  password: { type: String },
  role: {
    type: String,
    required: false,
  },
  crispRole: {
    type: String,
    enum: CrispRole,
    default: CrispRole.Normal,
  },
  courseRoles: [CourseRoleTupleSchema],
  isApproved: {
    type: Boolean,
    default: false,
  },
  wantsEmailNotifications: {
    type: Boolean,
    default: false,
  },
  wantsTelegramNotifications: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

const AccountModel = mongoose.model<Account>('Account', accountSchema);

export default AccountModel;
