import mongoose, { Document, Schema } from 'mongoose';

export interface Course extends Document {
  name: string;
  code: string;
  semester: string;
  lecturers: mongoose.Types.ObjectId[];
  assistants: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  teamSets: mongoose.Types.ObjectId[];
  sprints: { sprintNumber: number, description: string, startDate: Date, endDate: Date }[]
  milestones: { milestoneNumber: number, dateline: Date, description: string }[]
}

export const courseSchema = new Schema<Course>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  semester: { type: String, required: true },
  lecturers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  assistants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  teamSets: [{ type: Schema.Types.ObjectId, ref: 'TeamSet' }],
  sprints: [{  
    sprintNumber: { type: Number, required: true }, 
    description: { type: String, required: true }, 
    startDate: { type: Date, required: true }, 
    endDate: { type: Date, required: true }
  }],
  milestones: [{
    milestoneNumber: { type: Number, required: true },
    dateline: { type: Date, required: true },
    description: { type: String, required: true }
  }]
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;