import mongoose, { Schema, Types } from 'mongoose';
import { PeerReviewComment as SharedPeerReviewComment } from '@shared/types/PeerReview';
import CourseRole, { CourseRole as UserRole } from '@shared/types/auth/CourseRole';

export interface PeerReviewComment
  extends Omit<
      SharedPeerReviewComment,
      '_id' | 'peerReviewAssignmentId' | 'author'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewAssignmentId: Types.ObjectId;
  author: Types.ObjectId;
  courseRole: UserRole;
}

const peerReviewCommentSchema = new Schema<PeerReviewComment>({
  peerReviewAssignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'PeerReviewAssignment',
    required: true,
  },
  filePath: { type: String, required: true },
  startLine: { type: Number, required: true, min: 1 },
  endLine: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: function (this: PeerReviewComment, v: number) {
        return v >= this.startLine!;
      },
      message: `endLine must be greater than or equal to startLine`,
    },
  },
  comment: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseRole: { type: String, required: true, enum: Object.values(CourseRole) },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  isOverallComment: { type: Boolean, default: false },
});

const PeerReviewCommentModel = mongoose.model<PeerReviewComment>(
  'PeerReviewComment',
  peerReviewCommentSchema
);

export default PeerReviewCommentModel;
