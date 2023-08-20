import mongoose, { Document, Schema } from 'mongoose';
import { assistantSchema, Assistant } from './Assistant';
import { lecturerSchema, Lecturer } from './Lecturer';
import { studentSchema, Student } from './Student';

export interface Course extends Document {
  courseName: string;
  courseCode: string;
  lecturers: Lecturer[],
  assistants: Assistant[],
  students: Student[];
}

export const courseSchema = new Schema<Course>({
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  lecturers: [lecturerSchema],
  assistants: [assistantSchema],
  students: [studentSchema]
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;