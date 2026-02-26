import mongoose, { Schema, Types, Document } from 'mongoose';
import { PeerReviewSubmission as SharedPeerReviewSubmission } from '@shared/types/PeerReview';

export interface PeerReviewSubmission
  extends Omit<
      SharedPeerReviewSubmission,
      '_id' | 'peerReviewId' | 'peerReviewAssignmentId' | 'reviewerId'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  peerReviewAssignmentId: Types.ObjectId;
  reviewerId?: Types.ObjectId;
}

const peerReviewSubmissionSchema = new Schema<PeerReviewSubmission>(
  {
    peerReviewId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReview',
      required: true,
      index: true,
    },

    peerReviewAssignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReviewAssignment',
      required: true,
      index: true,
    },

    reviewerKind: {
      type: String,
      enum: ['Student', 'Team', 'TA'],
      required: true,
      index: true,
    },

    reviewerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },

    reviewerTeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
      index: true,
    },

    status: {
      type: String,
      enum: ['NotStarted', 'Draft', 'Submitted'],
      required: true,
      default: 'NotStarted',
      index: true,
    },

    startedAt: { type: Date },
    lastEditedAt: { type: Date },
    submittedAt: { type: Date },
    overallComment: { type: String, default: '' },

    scores: {
      type: Schema.Types.Mixed,
      default: {},
    },

    totalScore: { type: Number },
    feedback: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Only either reviewerUserId or reviewerTeamId is set
peerReviewSubmissionSchema.pre('validate', function (next) {
  const doc = this as PeerReviewSubmission;

  const hasUser = Boolean(doc.reviewerUserId);
  const hasTeam = Boolean(doc.reviewerTeamId);

  if (hasUser && hasTeam) {
    return next(
      new Error('Only either reviewerUserId or reviewerTeamId may be set.')
    );
  }

  if (doc.reviewerKind === 'Team') {
    if (!hasTeam)
      return next(
        new Error('reviewerTeamId is required when reviewerKind is Team.')
      );
  } else {
    if (!hasUser)
      return next(
        new Error(
          'reviewerUserId is required when reviewerKind is Student or TA.'
        )
      );
  }

  return next();
});

// Only one submission per (assignment, reviewer)
peerReviewSubmissionSchema.index(
  { peerReviewAssignmentId: 1, reviewerKind: 1, reviewerUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { reviewerUserId: { $exists: true } },
  }
);

peerReviewSubmissionSchema.index(
  { peerReviewAssignmentId: 1, reviewerKind: 1, reviewerTeamId: 1 },
  {
    unique: true,
    partialFilterExpression: { reviewerTeamId: { $exists: true } },
  }
);

peerReviewSubmissionSchema.index({
  peerReviewId: 1,
  reviewerUserId: 1,
  reviewerKind: 1,
});
peerReviewSubmissionSchema.index({
  peerReviewId: 1,
  reviewerTeamId: 1,
  reviewerKind: 1,
});

peerReviewSubmissionSchema.index({ peerReviewAssignmentId: 1, status: 1 });

const PeerReviewSubmissionModel = mongoose.model<PeerReviewSubmission>(
  'PeerReviewSubmission',
  peerReviewSubmissionSchema
);

export default PeerReviewSubmissionModel;
