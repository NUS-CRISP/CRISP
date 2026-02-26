import mongoose, { Schema, Types, Document } from 'mongoose';
import { PeerReview as SharedPeerReview } from '@shared/types/PeerReview';

export interface PeerReview
  extends Omit<SharedPeerReview, '_id' | 'courseId' | 'teamSetId'>,
    Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  teamSetId: Types.ObjectId;
  computedStatus?: 'Upcoming' | 'Active' | 'Closed';
}

const peerReviewSchema = new Schema<PeerReview>(
  {
    // Basic info
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['Upcoming', 'Active', 'Closed'],
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
    reviewerType: {
      type: String,
      enum: ['Individual', 'Team'],
      required: true,
      default: 'Individual',
    },

    teamSetId: { type: Schema.Types.ObjectId, ref: 'TeamSet', required: true },
    taAssignments: { type: Boolean, required: true, default: false },
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

peerReviewSchema.virtual('computedStatus').get(function (this: PeerReview) {
  const now = new Date();
  if (now < this.startDate) return 'Upcoming';
  if (now >= this.startDate && now <= this.endDate) return 'Active';
  return 'Closed';
});

const PeerReviewModel = mongoose.model<PeerReview>(
  'PeerReview',
  peerReviewSchema
);

export default PeerReviewModel;
