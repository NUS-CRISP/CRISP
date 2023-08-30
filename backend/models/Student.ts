import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface Student extends User {
  gitHandle: string;
  teamNumber: number;
}

export const studentSchema = new Schema<Student>({
  ...userSchema.obj,
  gitHandle: { type: String, required: true },
  teamNumber: { type: Number }
});
const StudentModel = mongoose.model<Student>('Student', studentSchema);

export default StudentModel;