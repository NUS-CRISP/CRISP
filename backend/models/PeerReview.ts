import mongoose, { Schema, Types, Document } from 'mongoose';
import { PeerReview as SharedPeerReview } from '@shared/types/PeerReview';

export interface PeerReview
  extends
    Omit<
      SharedPeerReview,
      '_id' | 'courseId' | 'teamSetId' | 'internalAssessmentId'
    >,
    Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  teamSetId: Types.ObjectId;
  internalAssessmentId: Types.ObjectId;

  computedStatus?: 'Upcoming' | 'Active' | 'Closed';
  computedGradingStatus?: 'NotStarted' | 'InProgress' | 'Completed';
}

const peerReviewSchema = new Schema<PeerReview>(
  {
    // Basic info
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

    // Settings
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: PeerReview, date: Date) {
          // allow past endDate for existing docs (Closed), but still enforce endDate > startDate
          if (!date || !this.startDate) return false;
          const afterStart = date > this.startDate;

          // Only enforce "must be future" if PR isn't already closed
          const now = new Date();
          const isClosed = now > date;
          if (isClosed) return afterStart;

          return date.getTime() > Date.now() && afterStart;
        },
        message: `end date must be after start date (and in the future for active/upcoming peer reviews)`,
      },
    },
    reviewerType: {
      type: String,
      enum: ['Individual', 'Team'],
      required: true,
      default: 'Individual',
    },
    
    maxReviewsPerReviewer: {
      type: Number,
      required: true,
      default: 1,
      validate: {
        validator: function (value: number) {
          return Number.isInteger(value) && value > 0;
        },
        message: 'maxReviewsPerReviewer must be >= 1',
      }
    },

    teamSetId: { type: Schema.Types.ObjectId, ref: 'TeamSet', required: true },
    taAssignments: { type: Boolean, required: true, default: false },

    // Repository configuration
    commitOrTag: { type: String, default: null },

    // Assessment-related
    internalAssessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'InternalAssessment',
      required: true,
      index: true,
    },
    gradingStartDate: { type: Date, default: null },
    gradingEndDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (this: PeerReview, date: Date | null) {
          if (!date) return true;
          if (!this.gradingStartDate) return true; // allow setting end later
          return date > this.gradingStartDate;
        },
        message: `gradingEndDate must be after gradingStartDate`,
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

// Map 'status' to 'computedStatus' for backwards compatibility
peerReviewSchema.virtual('status').get(function (this: PeerReview) {
  return this.computedStatus;
});

peerReviewSchema.virtual('computedGradingStatus').get(function (
  this: PeerReview
) {
  const now = new Date();
  const start = this.gradingStartDate ?? null;
  const end = this.gradingEndDate ?? null;

  if (!start && !end) return 'NotStarted';
  if (start && !end) return now < start ? 'NotStarted' : 'InProgress';
  if (!start && end) return now < end ? 'InProgress' : 'Completed';
  if (start && end) {
    if (now < start) return 'NotStarted';
    if (now >= start && now <= end) return 'InProgress';
    return 'Completed';
  }
});

const PeerReviewModel = mongoose.model<PeerReview>(
  'PeerReview',
  peerReviewSchema
);

export default PeerReviewModel;
