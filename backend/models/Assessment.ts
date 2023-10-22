import mongoose, { Schema, Types } from 'mongoose';
import { Assessment as SharedAssessment } from '@shared/types/Assessment';

export interface Assessment
  extends Omit<SharedAssessment, 'course' | 'results' | 'teamSet'> {
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

export default mongoose.model<Assessment>('Assessment', assessmentSchema);
