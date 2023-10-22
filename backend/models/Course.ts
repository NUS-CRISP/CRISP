import mongoose, { Schema, Types } from 'mongoose';
import { Assessment } from './Assessment';
import { TeamSet } from './TeamSet';
import { User } from './User';

export interface Sprint {
  number: number;
  description: string;
  startDate: Date;
  endDate: Date;
}

export interface Milestone {
  number: number;
  dateline: Date;
  description: string;
}

export const isSprint = (obj: Sprint | Milestone): obj is Sprint =>
  (obj as Sprint).startDate !== undefined;

export interface Course {
  _id: Types.ObjectId;
  name: string;
  code: string;
  semester: string;
  faculty: User[];
  TAs: User[];
  students: User[];
  teamSets: TeamSet[];
  assessments: Assessment[];
  sprints: Sprint[];
  milestones: Milestone[];
  courseType: 'GitHubOrg' | 'Normal';
  // start 'GitHubOrg' fields
  githubOrgName?: string;
  installationToken?: string;
  // end 'GitHubOrg' fields
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

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;
