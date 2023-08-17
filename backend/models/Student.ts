import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

interface Student extends BasePerson {
  githubUsername: string;
}

const studentSchema = new Schema<Student>({
  ...basePersonSchema.obj,
  githubUsername: { type: String, required: true }
});

export {studentSchema, Student};