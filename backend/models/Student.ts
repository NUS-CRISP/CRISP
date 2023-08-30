import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface CourseDetails{
  courseId: string;
  gitHandle: string;
  teamNumber: number;
}

export const courseDetailsSchema = new Schema<CourseDetails>({
  courseId: { type: String },
  gitHandle: { type: String },
  teamNumber: { type: Number }
});

export const CourseDetailsModel = mongoose.model<CourseDetails>('CourseDetails', courseDetailsSchema);

export interface Student extends User {
  courseDetails: Record<string, CourseDetails>;
}

export const studentSchema = new Schema<Student>({
  ...userSchema.obj,
  courseDetails: { type: Map, of: courseDetailsSchema, default: {} }
});

const StudentModel = mongoose.model<Student>('Student', studentSchema);

export default StudentModel;