import { Team as SharedTeam } from '@shared/types/Team';
import mongoose, { Schema, Types } from 'mongoose';

export interface Team
  extends Omit<SharedTeam, '_id' | 'teamSet' | 'TA' | 'members' | 'teamData'>,
    Document {
  _id: Types.ObjectId;
  teamSet: Types.ObjectId;
  TA?: Types.ObjectId;
  members?: Types.ObjectId[];
  teamData?: Types.ObjectId;
}

export const teamSchema = new Schema<Team>({
  teamSet: { type: Schema.Types.ObjectId, ref: 'TeamSet' },
  number: { type: Number, required: true },
  TA: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  teamData: { type: Schema.Types.ObjectId, ref: 'TeamData' },
  board: { type: Schema.Types.ObjectId, ref: 'JiraBoard' },
});

const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;
