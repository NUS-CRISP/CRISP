import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface Lecturer extends User {
  isCourseCoordinator : boolean;
}

export const lecturerSchema = new Schema<Lecturer>({
  ...userSchema.obj,
  isCourseCoordinator: { type: Boolean, required: true }
});

const LecturerModel = mongoose.model<Lecturer>('Lecturer', lecturerSchema);

export default LecturerModel;