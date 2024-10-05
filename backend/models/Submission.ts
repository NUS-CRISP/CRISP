import mongoose, { Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';
import AnswerSchema, { AnswerUnion } from './Answer';

export interface Submission extends Document {
  assessment: ObjectId;
  user: ObjectId;
  answers: AnswerUnion[];
  submittedAt: Date;
  isDraft: boolean;
}

const SubmissionSchema = new Schema<Submission>(
  {
    assessment: { type: Schema.Types.ObjectId, ref: 'InternalAssessment', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [AnswerSchema], required: true },
    submittedAt: { type: Date, default: Date.now },
    isDraft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SubmissionModel = mongoose.model<Submission>('Submission', SubmissionSchema);

export default SubmissionModel;
