import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

interface Lecturer extends BasePerson {
  isCourseCoordinator : boolean;
}

const lecturerSchema = new Schema<Lecturer>({
  ...basePersonSchema.obj,
  isCourseCoordinator: { type: Boolean, required: true }
});

export {lecturerSchema, Lecturer};