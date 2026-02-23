import mongoose, { Schema, Types, Document } from 'mongoose';
import { PeerReviewTeamResultSummary as SharedPeerReviewTeamResultSummary } from '@shared/types/PeerReview';

export interface PeerReviewTeamResultSummary
  extends Omit<
      SharedPeerReviewTeamResultSummary,
      '_id' | 'peerReviewId' | 'teamId'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  teamId: Types.ObjectId;
}

const peerReviewTeamResultSummarySchema = new Schema<PeerReviewTeamResultSummary>(
  {
    peerReviewId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReview',
      required: true,
      index: true,
    },

    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },

    teamNumber: {
      type: Number,
      required: true,
    },

    // Aggregated grading results for the team
    finalScore: { type: Number },
    finalFeedback: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient querying by peerReviewId and teamId
peerReviewTeamResultSummarySchema.index(
  { peerReviewId: 1, teamId: 1 },
  { unique: true }
);

export const PeerReviewTeamResultSummaryModel =
  mongoose.model<PeerReviewTeamResultSummary>(
    'PeerReviewTeamResultSummary',
    peerReviewTeamResultSummarySchema
  );

export default PeerReviewTeamResultSummaryModel;
