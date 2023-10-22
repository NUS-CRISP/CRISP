import mongoose, { Schema, Types } from 'mongoose';
import { Course } from './Course';
import { Team } from './Team';

export interface TeamSet {
  _id: Types.ObjectId;
  course: Course;
  name: string;
  teams: Team[];
}

const teamSetSchema = new Schema<TeamSet>({
  course: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
});

const TeamSetModel = mongoose.model<TeamSet>('TeamSet', teamSetSchema);

export default TeamSetModel;
