import mongoose, { Schema, Types, Document } from 'mongoose';
import { PeerReviewGradingTask as SharedPeerReviewGradingTask } from '@shared/types/PeerReview';

export interface PeerReviewGradingTask
  extends Omit<
      SharedPeerReviewGradingTask,
      '_id' | 'peerReviewId' | 'peerReviewSubmissionId' | 'grader'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  peerReviewSubmissionId?: Types.ObjectId;
  graderUserId: Types.ObjectId;
}

const peerReviewGradingTaskSchema = new Schema<PeerReviewGradingTask>(
  {
    peerReviewId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReview',
      required: true,
      index: true,
    },

    graderUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    peerReviewSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReviewSubmission',
      index: true,
    },

    status: {
      type: String,
      enum: ['Assigned', 'InProgress', 'Completed'],
      required: true,
      default: 'Assigned',
      index: true,
    },

    // Grading fields
    score: { type: Number },
    feedback: { type: String },
    gradedAt: { type: Date },

    // Link to Assessment
    assessmentSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Uniqueness: one task per (peerReviewId, graderUserId, submission) when targetType=submission
peerReviewGradingTaskSchema.index(
  { peerReviewId: 1, peerReviewSubmissionId: 1, graderUserId: 1 },
  { unique: true }
);

export const PeerReviewGradingTaskModel = mongoose.model<PeerReviewGradingTask>(
  'PeerReviewGradingTask',
  peerReviewGradingTaskSchema
);

export default PeerReviewGradingTaskModel;
