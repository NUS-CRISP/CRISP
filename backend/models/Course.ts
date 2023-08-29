import mongoose, { Document, Schema } from 'mongoose';
import { Lecturer, lecturerSchema } from './Lecturer';
import { Assistant, assistantSchema } from './Assistant';
import { Student, studentSchema } from './Student';
import { Team, teamSchema} from './Team';

export interface Course extends Document {
  courseName: string;
  courseCode: string;
  courseSemester: string;
  lecturers: Lecturer[];
  assistants: Assistant[];
  students: Student[];
  teams: Team[]
}

export const courseSchema = new Schema<Course>({
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  courseSemester: { type: String, required: true },
  lecturers: { type: [lecturerSchema], required: true},
  assistants: { type: [assistantSchema] },
  students: { type: [studentSchema] },
  teams: { type: [teamSchema] }
});

const CourseModel = mongoose.model<Course>('Course', courseSchema);

export default CourseModel;