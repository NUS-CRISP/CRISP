import mongoose, { Document, Schema } from 'mongoose';
import {studentSchema, Student} from './Student';
import {lecturerSchema, Lecturer} from './Lecturer';
import {assistantSchema, Assistant} from './Assistant';

interface TeachingAssistant extends Document {
  name: string;
  email: string;
  githubUsername: string;
}

interface Course extends Document {
  courseName: string;
  courseCode: string;
  lecturers: Lecturer[],
  assistants: Assistant[],
  students: Student[];
}


const courseSchema = new Schema<Course>({
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  lecturers: [lecturerSchema],
  assistants: [assistantSchema],
  students: [studentSchema],
  
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;