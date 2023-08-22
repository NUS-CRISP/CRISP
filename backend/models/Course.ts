import mongoose, { Document, Schema } from 'mongoose';

export interface Course extends Document {
  courseName: string;
  courseCode: string;
  lecturers: mongoose.Types.ObjectId[];
  assistants: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
}

export const courseSchema = new Schema<Course>({
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  lecturers: [{ type: Schema.Types.ObjectId, ref: 'Lecturer' }],
  assistants: [{ type: Schema.Types.ObjectId, ref: 'Assistant' }],
  students: [{ type: Schema.Types.ObjectId, ref: 'Student' }]
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;