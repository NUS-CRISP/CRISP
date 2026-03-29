import mongoose, { Schema, Types } from 'mongoose';
import { PeerReviewAssignment as SharedPeerReviewAssignment } from '@shared/types/PeerReview';

export interface PeerReviewAssignment
  extends
    Omit<SharedPeerReviewAssignment, '_id' | 'peerReviewId' | 'reviewee'>,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  reviewee: Types.ObjectId;
}

const peerReviewAssignmentSchema = new Schema<PeerReviewAssignment>(
  {
    peerReviewId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReview',
      required: true,
      index: true,
    },
    repoName: { type: String, required: true },
    repoUrl: { type: String, required: true },
    commitOrTag: { type: String, default: null },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    deadline: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure a team is only assigned as a reviewee once per peer review
peerReviewAssignmentSchema.index(
  { peerReviewId: 1, reviewee: 1 },
  { unique: true }
);

const PeerReviewAssignmentModel = mongoose.model<PeerReviewAssignment>(
  'PeerReviewAssignment',
  peerReviewAssignmentSchema
);

export default PeerReviewAssignmentModel;
