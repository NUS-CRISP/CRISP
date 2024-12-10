// models/InternalAssessment.ts

import { InternalAssessment as SharedInternalAssessment } from '@shared/types/InternalAssessment';
import mongoose, { Schema, Types } from 'mongoose';

// Define the InternalAssessment interface
export interface InternalAssessment
  extends Omit<
      SharedInternalAssessment,
      | '_id'
      | 'course'
      | 'results'
      | 'teamSet'
      | 'questions'
      | 'assessmentAssignmentSet'
    >,
    mongoose.Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  results: Types.ObjectId[]; // References to AssessmentResult documents
  teamSet?: Types.ObjectId;
  questions: Types.ObjectId[];
  assessmentAssignmentSet?: Types.ObjectId;
}

// Schema definition for InternalAssessment
const internalAssessmentSchema = new Schema<InternalAssessment>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  assessmentName: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  maxMarks: { type: Number, required: true, default: 0 },
  questionsTotalMarks: { type: Number, default: 0 },
  granularity: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  areSubmissionsEditable: { type: Boolean, required: true },
  results: [{ type: Schema.Types.ObjectId, ref: 'AssessmentResult' }],
  isReleased: { type: Boolean, required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  assessmentAssignmentSet: {
    type: Schema.Types.ObjectId,
    ref: 'AssessmentAssignmentSet',
  },
});

const InternalAssessmentModel = mongoose.model<InternalAssessment>(
  'InternalAssessment',
  internalAssessmentSchema
);

export default InternalAssessmentModel;
