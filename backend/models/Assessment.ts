import mongoose, { Schema } from 'mongoose';

export interface Assessment {
  course: mongoose.Types.ObjectId;
  assessmentType: string;
  markType: string;
  results: mongoose.Types.ObjectId[];
  frequency: string;
  granularity: 'individual' | 'team';
  teamSet: mongoose.Types.ObjectId;
  formLink: string;
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
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet'},
  formLink: { type: String },
});

const AssessmentModel = mongoose.model<Assessment>('Assessment', assessmentSchema);

export default AssessmentModel;