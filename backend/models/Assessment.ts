import mongoose, { Schema, Types } from 'mongoose';
import { TeamSet } from './TeamSet';
import { Result } from './Result';
import { Course } from './Course';

export interface Assessment {
  _id: Types.ObjectId;
  course: Course;
  assessmentType: string;
  markType: string;
  results: Result[];
  frequency: string;
  granularity: 'individual' | 'team';
  teamSet: TeamSet;
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
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  formLink: { type: String },
});

const AssessmentModel = mongoose.model<Assessment>(
  'Assessment',
  assessmentSchema
);

export default AssessmentModel;
