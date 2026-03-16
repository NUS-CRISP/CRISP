import mongoose, { Schema, Types } from 'mongoose';
import { PeerReviewComment as SharedPeerReviewComment } from '@shared/types/PeerReview';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

export interface PeerReviewComment
  extends Omit<
      SharedPeerReviewComment,
      | '_id'
      | 'peerReviewId'
      | 'peerReviewAssignmentId'
      | 'peerReviewSubmissionId'
      | 'author'
      | 'flaggedBy'
    >,
    Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
  peerReviewAssignmentId: Types.ObjectId;
  peerReviewSubmissionId: Types.ObjectId;
  author: Types.ObjectId;
  flaggedBy?: Types.ObjectId;
}

const peerReviewCommentSchema = new Schema<PeerReviewComment>(
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
    peerReviewSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'PeerReviewSubmission',
      index: true,
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
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorCourseRole: {
      type: String,
      required: true,
      enum: Object.values(COURSE_ROLE),
    },

    // Moderation Fields
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: '' },
    flaggedAt: { type: Date },
    flaggedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

peerReviewCommentSchema.index({ peerReviewSubmissionId: 1, createdAt: 1 });

const PeerReviewCommentModel = mongoose.model<PeerReviewComment>(
  'PeerReviewComment',
  peerReviewCommentSchema
);

export default PeerReviewCommentModel;
