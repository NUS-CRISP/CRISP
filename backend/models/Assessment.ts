import mongoose, { Document, Schema } from 'mongoose';

export interface Assessment extends Document {
  course: mongoose.Types.ObjectId;
  assessmentType: string;
  markType: string;
  marks: number;
  frequency: string;
  granularity: 'individual' | 'team';
  students: mongoose.Types.ObjectId[];
}

const assessmentSchema = new Schema<Assessment>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  assessmentType: { type: String, required: true },
  markType: { type: String, required: true },
  marks: { type: Number, required: true },
  frequency: { type: String, required: true },
  granularity: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const AssessmentModel = mongoose.model<Assessment>('Assessment', assessmentSchema);

export default AssessmentModel;