// models/AssessmentResult.ts

import mongoose, { Document, Schema, Types } from 'mongoose';
import { Submission } from './Submission';
import { User } from './User';
import { InternalAssessment } from './InternalAssessment';

export interface MarkEntry {
  marker: Types.ObjectId | User;
  submission: Types.ObjectId | Submission;
  score: number;
}

export interface AssessmentResult extends Document {
  assessment: Types.ObjectId | InternalAssessment;
  student: Types.ObjectId | User;
  marks: MarkEntry[];
  averageScore: number;
}

const markEntrySchema = new Schema<MarkEntry>(
  {
    marker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
    },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const assessmentResultSchema = new Schema<AssessmentResult>(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: 'InternalAssessment',
      required: true,
    },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    marks: [markEntrySchema],
    averageScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AssessmentResultModel = mongoose.model<AssessmentResult>(
  'AssessmentResult',
  assessmentResultSchema
);

export default AssessmentResultModel;
