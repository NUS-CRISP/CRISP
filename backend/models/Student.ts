import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface Student extends User {
  githubUsername: string;
}

export const studentSchema = new Schema<Student>({
  ...userSchema.obj,
  githubUsername: { type: String, required: true }
});
const StudentModel = mongoose.model<Student>('Student', studentSchema);

export default StudentModel;