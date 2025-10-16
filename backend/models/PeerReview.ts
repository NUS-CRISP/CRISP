import mongoose, { Schema, Types } from 'mongoose';
import { PeerReview as SharedPeerReview } from '@shared/types/PeerReview';

export interface PeerReview
  extends Omit<
      SharedPeerReview,
      | '_id'
      | 'courseId'
      | 'peerReviewSettingsId'
      | 'peerReviewAssignmentIds'
      | 'teamSetId'
    >,
    Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  peerReviewSettingsId: Types.ObjectId;
  peerReviewAssignmentIds: Types.ObjectId[];
  teamSetId: Types.ObjectId;
  computedStatus?: 'Upcoming' | 'Ongoing' | 'Completed';
}

const peerReviewSchema = new Schema<PeerReview>({
  // Basic info
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed'],
    required: true,
    default: 'Upcoming',
  },
  
  // Settings
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
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
  teamSetId: { type: Schema.Types.ObjectId, ref: 'TeamSet', required: true },
  TaAssignments: { type: Boolean, required: true, default: false },
  reviewerType: {
    type: String,
    enum: ['Individual', 'Team'],
    required: true,
    default: 'Individual',
  },
  minReviewsPerReviewer: { type: Number, required: true, min: 0 },
  maxReviewsPerReviewer: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: function (this: PeerReview, v: number) {
        return v >= this.minReviewsPerReviewer;
      },
      message: `maxReviewsPerReviewer must be greater than or equal to minReviewsPerReviewer`,
    },
  },
  
  // Assignments
  peerReviewAssignmentIds: [
    { type: Schema.Types.ObjectId, ref: 'PeerReviewAssignment' },
  ],
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
