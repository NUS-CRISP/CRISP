import mongoose, { Schema, Types } from 'mongoose';
import { TeamSet } from './TeamSet';
import { User } from './User';

export interface Team {
  _id: Types.ObjectId;
  teamSet: TeamSet;
  number: number;
  TA: User;
  members: User[];
  // repoUrl: string;
}

export const teamSchema = new Schema<Team>({
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  number: { type: Number, required: true },
  TA: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // repoUrl: { type: String, required: true },
});

const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;
