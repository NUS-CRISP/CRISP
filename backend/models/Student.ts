import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

export interface Student extends BasePerson {
  githubUsername: string;
}

export const studentSchema = new Schema<Student>({
  ...basePersonSchema.obj,
  githubUsername: { type: String, required: true }
});
const StudentModel = mongoose.model<Student>('Student', studentSchema);

export default StudentModel;