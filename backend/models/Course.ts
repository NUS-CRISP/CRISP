import mongoose, { Schema } from 'mongoose';

export interface Course {
  name: string;
  code: string;
  semester: string;
  faculty: mongoose.Types.ObjectId[];
  TAs: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  teamSets: mongoose.Types.ObjectId[];
  assessments: mongoose.Types.ObjectId[];
  sprints: {
    sprintNumber: number;
    description: string;
    startDate: Date;
    endDate: Date;
  }[];
  milestones: {
    milestoneNumber: number;
    dateline: Date;
    description: string;
  }[];
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
      sprintNumber: { type: Number, required: true },
      description: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
  ],
  milestones: [
    {
      milestoneNumber: { type: Number, required: true },
      dateline: { type: Date, required: true },
      description: { type: String, required: true },
    },
  ],
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;
