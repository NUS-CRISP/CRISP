import mongoose, { Schema } from 'mongoose';
import {studentSchema, Student } from './Student';
import {assistantSchema, Assistant } from './Assistant';

export interface Team {
  teamNumber: number;
  assistant: Assistant;
  students: Student[];
}

export const teamSchema = new Schema<Team>({
  teamNumber: { type: Number, require: true},
  assistant: { type: assistantSchema },
  students: { type: [studentSchema] }
});
const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;