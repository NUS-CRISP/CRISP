import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

export interface Lecturer extends BasePerson {
  isCourseCoordinator : boolean;
}

export const lecturerSchema = new Schema<Lecturer>({
  ...basePersonSchema.obj,
  isCourseCoordinator: { type: Boolean, required: true }
});

const LecturerModel = mongoose.model<Lecturer>('Lecturer', lecturerSchema);

export default LecturerModel;