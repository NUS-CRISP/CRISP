import mongoose, { Schema, Types } from 'mongoose';
import { PeerReviewSettings as SharedPeerReviewSettings } from '@shared/types/PeerReview';

export interface PeerReviewSettings extends Omit<SharedPeerReviewSettings, '_id' | 'peerReviewId'>, Document {
  _id: Types.ObjectId;
  peerReviewId: Types.ObjectId;
}

const peerReviewSettingsSchema = new Schema<PeerReviewSettings>({
  peerReviewId: { type: Schema.Types.ObjectId, ref: 'PeerReview', required: true, unique: true },
  reviewerType: {
    type: String,
    enum: ['Individual', 'Team'],
    required: true,
    default: 'Individual',
  },
  TaAssignments: { type: Boolean, required: true, default: false },
  minReviewsPerReviewer: { type: Number, required: true, min: 0 },
  maxReviewsPerReviewer: { type: Number, required: true, min: 1, validate: {
    validator: function (this: PeerReviewSettings, v: number) {
      return v >= this.minReviewsPerReviewer;
    },
    message: `maxReviewsPerReviewer must be greater than or equal to minReviewsPerReviewer`,
  }},
  assignmentMode: {
    type: String,
    enum: ['Random', 'Manual', 'Hybrid'],
    required: true,
    default: 'Random',
  },
});

const PeerReviewCommentModel = mongoose.model<PeerReviewSettings>('PeerReviewSettings', peerReviewSettingsSchema);

export default PeerReviewCommentModel;
