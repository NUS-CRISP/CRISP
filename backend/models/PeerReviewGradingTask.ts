import mongoose, { Schema, Types, Document } from 'mongoose';
import {
  PeerReviewGradingTask as SharedPeerReviewGradingTask,
  PeerReviewGradeTarget,
} from '@shared/types/PeerReview';

export interface PeerReviewGradingTask
  extends Omit<
      SharedPeerReviewGradingTask,
      '_id' | 'peerReviewId' | 'grader' | 'target'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  graderUserId: Types.ObjectId;
  targetType: "submission" | "team";
  peerReviewSubmissionId?: string; // required if target is "submission"
  revieweeTeamId?: string; // required if target is "team"
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

    targetType: {
      type: String,
      enum: ['submission', 'team'],
      required: true,
      index: true,
    },
    
    peerReviewSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReviewSubmission',
      index: true,
    },

    revieweeTeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
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

// Validation: ensure target has correct fields based on targetType
peerReviewGradingTaskSchema.pre('validate', function (next) {
  const doc = this as PeerReviewGradingTask;

  if (doc.targetType === 'submission') {
    if (!doc.peerReviewSubmissionId) {
      return next(new Error('peerReviewSubmissionId is required when targetType=submission'));
    }
    if (doc.revieweeTeamId) {
      return next(new Error('revieweeTeamId must not be set when targetType=submission'));
    }
  }

  if (doc.targetType === 'team') {
    if (!doc.revieweeTeamId) {
      return next(new Error('revieweeTeamId is required when targetType=team'));
    }
    if (doc.peerReviewSubmissionId) {
      return next(new Error('peerReviewSubmissionId must not be set when targetType=team'));
    }
  }

  next();
});

// Uniqueness: one task per (peerReviewId, graderUserId, submission) when targetType=submission
peerReviewGradingTaskSchema.index(
  { peerReviewId: 1, graderUserId: 1, peerReviewSubmissionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      targetType: 'submission',
      peerReviewSubmissionId: { $exists: true },
    },
  }
);

// Uniqueness: one task per (peerReviewId, graderUserId, team) when targetType=team
peerReviewGradingTaskSchema.index(
  { peerReviewId: 1, graderUserId: 1, revieweeTeamId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      targetType: 'team',
      revieweeTeamId: { $exists: true },
    },
  }
);

export const PeerReviewGradingTaskModel = mongoose.model<PeerReviewGradingTask>(
  'PeerReviewGradingTask',
  peerReviewGradingTaskSchema
);

export default PeerReviewGradingTaskModel;
