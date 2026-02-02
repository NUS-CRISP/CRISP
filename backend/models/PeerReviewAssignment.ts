import mongoose, { Schema, Types } from 'mongoose';
import { PeerReviewAssignment as SharedPeerReviewAssignment } from '@shared/types/PeerReview';

export interface PeerReviewAssignment
  extends Omit<
      SharedPeerReviewAssignment,
      | '_id'
      | 'peerReviewId'
      | 'studentReviewers'
      | 'teamReviewers'
      | 'taReviewers'
      | 'reviewee'
      | 'assignedBy'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  studentReviewers: Types.ObjectId[];
  teamReviewers: Types.ObjectId[];
  taReviewers: Types.ObjectId[];
  reviewee: Types.ObjectId;
  assignedBy: Types.ObjectId;
}

const peerReviewAssignmentSchema = new Schema<PeerReviewAssignment>({
  peerReviewId: {
    type: Schema.Types.ObjectId,
    ref: 'PeerReview',
    required: true,
  },
  repoName: { type: String, required: true },
  repoUrl: { type: String, required: true },
  studentReviewers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  teamReviewers: { type: [Schema.Types.ObjectId], ref: 'Team', default: [] },
  taReviewers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  reviewee: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now, required: true },
  deadline: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
});

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
