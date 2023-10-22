import mongoose, { Schema, Types } from 'mongoose';
import { Team as SharedTeam } from '@shared/types/Team';

export interface Team
  extends Omit<SharedTeam, '_id' | 'teamSet' | 'TA' | 'members'> {
  _id: Types.ObjectId;
  teamSet: Types.ObjectId;
  TA?: Types.ObjectId;
  members?: Types.ObjectId[];
}

export const teamSchema = new Schema<Team>({
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  number: { type: Number, required: true },
  TA: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // repoUrl: { type: String, required: true },
});

export default mongoose.model<Team>('Team', teamSchema);
