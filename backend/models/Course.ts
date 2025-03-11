import { Course as SharedCourse } from '@shared/types/Course';
import mongoose, { Schema, Types } from 'mongoose';

export interface Course
  extends Omit<
      SharedCourse,
      | '_id'
      | 'faculty'
      | 'TAs'
      | 'students'
      | 'teamSets'
      | 'assessments'
      | 'internalAssessments'
    >,
    Document {
  _id: Types.ObjectId;
  faculty: Types.ObjectId[];
  TAs: Types.ObjectId[];
  students: Types.ObjectId[];
  teamSets: Types.ObjectId[];
  assessments: Types.ObjectId[];
  internalAssessments: Types.ObjectId[];
}

export const courseSchema = new Schema<Course>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  semester: { type: String, required: true },
  startDate: { type: Date, required: true },
  durationWeeks: { type: Number, required: false },
  faculty: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  TAs: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  teamSets: [{ type: Schema.Types.ObjectId, ref: 'TeamSet' }],
  assessments: [{ type: Schema.Types.ObjectId, ref: 'Assessment' }],
  internalAssessments: [
    { type: Schema.Types.ObjectId, ref: 'InternalAssessment' },
  ],
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
  gitHubRepoLinks: [{ type: String }],
  gitHubOrgName: String,
  repoNameFilter: String,
  installationId: Number,
  jira: {
    isRegistered: { type: Boolean, required: true, default: false },
    cloudIds: [{ type: String }],
    accessToken: { type: String },
    refreshToken: { type: String },
  },
  trofos: {
    isRegistered: { type: Boolean, required: true, default: false },
    apiKey: { type: String },
    courseId: { type: Number },
  },
  aiInsights: {
    isOn: { type: Boolean, required: true, default: false },
    provider: { type: String },
    model: { type: String },
    apiKey: { type: String },
    frequency: { type: String },
    startDate: { type: Date},
  }
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;
