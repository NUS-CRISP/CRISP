import mongoose, { Schema, Types } from 'mongoose';
import { PeerReview as SharedPeerReview } from '@shared/types/PeerReview';

export interface PeerReview
  extends Omit<
      SharedPeerReview,
      '_id' | 'courseId' | 'peerReviewSettingsId' | 'peerReviewAssignmentIds'
    >,
    Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  peerReviewSettingsId: Types.ObjectId;
  peerReviewAssignmentIds: Types.ObjectId[];
  computedStatus?: 'Upcoming' | 'Ongoing' | 'Completed';
}

const peerReviewSchema = new Schema<PeerReview>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now, required: true },
  peerReviewSettingsId: {
    type: Schema.Types.ObjectId,
    ref: 'PeerReviewSettings',
  },
  peerReviewAssignmentIds: [
    { type: Schema.Types.ObjectId, ref: 'PeerReviewAssignment' },
  ],
  startDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (this: PeerReview, date: Date) {
        return date.getTime() >= Date.now();
      },
      message: `start date cannot be in the past`,
    },
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (this: PeerReview, date: Date) {
        return date.getTime() > Date.now() && date > this.startDate;
      },
      message: `end date must be in the future and after start date`,
    },
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed'],
    required: true,
    default: 'Upcoming',
  },
});

peerReviewSchema.virtual('computedStatus').get(function (this: PeerReview) {
  const now = new Date();
  if (now < this.startDate) return 'Upcoming';
  if (now >= this.startDate && now <= this.endDate) return 'Ongoing';
  return 'Completed';
});

peerReviewSchema.set('toObject', { virtuals: true });
peerReviewSchema.set('toJSON', { virtuals: true });

const PeerReviewModel = mongoose.model<PeerReview>(
  'PeerReview',
  peerReviewSchema
);

export default PeerReviewModel;
