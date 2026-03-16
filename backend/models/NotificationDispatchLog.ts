import mongoose, { Document, Schema, Types } from 'mongoose';

export interface NotificationDispatchLog extends Document {
  eventType: string;
  peerReviewId: Types.ObjectId;
  accountId: Types.ObjectId;
  channel: 'email' | 'telegram';
  windowKey: string;
  sentAt: Date;
}

const notificationDispatchLogSchema = new Schema<NotificationDispatchLog>(
  {
    eventType: { type: String, required: true, index: true },
    peerReviewId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReview',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'telegram'],
      required: true,
      index: true,
    },
    windowKey: { type: String, required: true, index: true },
    sentAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

notificationDispatchLogSchema.index(
  {
    eventType: 1,
    peerReviewId: 1,
    accountId: 1,
    channel: 1,
    windowKey: 1,
  },
  { unique: true }
);

const NotificationDispatchLogModel = mongoose.model<NotificationDispatchLog>(
  'NotificationDispatchLog',
  notificationDispatchLogSchema
);

export default NotificationDispatchLogModel;
