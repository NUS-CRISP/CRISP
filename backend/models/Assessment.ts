import { Assessment as SharedAssessment } from '@shared/types/Assessment';
import mongoose, { Schema, Types } from 'mongoose';

export interface Assessment
  extends Omit<SharedAssessment, '_id' | 'course' | 'results' | 'teamSet'> {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  results: Types.ObjectId[];
  teamSet?: Types.ObjectId;
}

const assessmentSchema = new Schema<Assessment>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  assessmentType: { type: String, required: true },
  markType: { type: String, required: true },
  results: [{ type: Schema.Types.ObjectId, ref: 'Result' }],
  frequency: { type: String, required: true },
  granularity: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  formLink: { type: String },
});

const AssessmentModel = mongoose.model<Assessment>('Assessment', assessmentSchema);

export default AssessmentModel;
