import mongoose, { Schema, Types } from 'mongoose';
import { Course as SharedCourse } from '@shared/types/Course';

export interface Course
  extends Omit<
    SharedCourse,
    '_id' | 'faculty' | 'TAs' | 'students' | 'teamSets' | 'assessments'
  > {
  _id: Types.ObjectId;
  faculty: Types.ObjectId[];
  TAs: Types.ObjectId[];
  students: Types.ObjectId[];
  teamSets: Types.ObjectId[];
  assessments: Types.ObjectId[];
}

export const courseSchema = new Schema<Course>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  semester: { type: String, required: true },
  faculty: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  TAs: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  teamSets: [{ type: Schema.Types.ObjectId, ref: 'TeamSet' }],
  assessments: [{ type: Schema.Types.ObjectId, ref: 'Assessment' }],
  sprints: [
    {
      number: { type: Number, required: true },
      description: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
  ],
  milestones: [
    {
      number: { type: Number, required: true },
      dateline: { type: Date, required: true },
      description: { type: String, required: true },
    },
  ],
  courseType: {
    type: String,
    enum: ['GitHubOrg', 'Normal'],
    required: true,
  },
  githubOrgName: String,
  installationToken: String,
});

export default mongoose.model<Course>('Course', courseSchema);
