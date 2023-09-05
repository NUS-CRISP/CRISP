import mongoose, { Document, Schema } from 'mongoose';

export interface Course extends Document {
  name: string;
  code: string;
  semester: string;
  lecturers: mongoose.Types.ObjectId[];
  assistants: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  teams: mongoose.Types.ObjectId[];
}

export const courseSchema = new Schema<Course>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  semester: { type: String, required: true },
  lecturers: [{ type: Schema.Types.ObjectId, ref: 'Lecturer' }],
  assistants: [{ type: Schema.Types.ObjectId, ref: 'Assistant' }],
  students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }]
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;