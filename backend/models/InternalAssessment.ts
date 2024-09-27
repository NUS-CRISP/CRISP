import { InternalAssessment as SharedInternalAssessment } from '@shared/types/InternalAssessment';
import mongoose, { Schema, Types } from 'mongoose';

// Define the InternalAssessment interface
export interface InternalAssessment
  extends Omit<
      SharedInternalAssessment,
      '_id' | 'course' | 'results' | 'teamSet' | 'gradedBy' | 'questions'
    >,
    mongoose.Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  results: Types.ObjectId[];
  teamSet?: Types.ObjectId;
  gradedBy?: Types.ObjectId;
  questions: Types.ObjectId[];
}

// Schema definition for InternalAssessment
const internalAssessmentSchema = new Schema<InternalAssessment>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  assessmentName: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: false },
  maxMarks: { type: Number, required: false },
  granularity: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet', required: false },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  results: [{ type: Schema.Types.ObjectId, ref: 'Result', required: false }],
  isReleased: { type: Schema.Types.Boolean, ref: 'IsReleased', required: true},
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question', required: false}]
});

// Creating and exporting the InternalAssessmentModel
const InternalAssessmentModel = mongoose.model<InternalAssessment>(
  'InternalAssessment',
  internalAssessmentSchema
);

export default InternalAssessmentModel;
