import mongoose, { Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';
import AnswerSchema, { AnswerUnion } from './Answer';

export interface Submission extends Document {
  assessment: ObjectId;
  user: ObjectId;
  answers: AnswerUnion[];
  submittedAt: Date;
  score: number;
  adjustedScore?: number;
  submissionReleaseNumber: number;
  isDraft: boolean;
  deleted?: boolean;
  deletedAt: Date;
}

const SubmissionSchema = new Schema<Submission>(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: 'InternalAssessment',
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The marker
    answers: { type: [AnswerSchema], required: true },
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },
    adjustedScore: { type: Number, required: false },
    submissionReleaseNumber: { type: Number, required: false, default: 1 },
    isDraft: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

const SubmissionModel = mongoose.model<Submission>(
  'Submission',
  SubmissionSchema
);

export default SubmissionModel;
