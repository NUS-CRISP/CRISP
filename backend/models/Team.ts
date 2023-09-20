import mongoose, { Schema } from 'mongoose';

export interface Team {
  teamSet: mongoose.Types.ObjectId;
  number: number;
  members: mongoose.Types.ObjectId[];
}

export const teamSchema = new Schema<Team>({
  teamSet: { type: Schema.Types.ObjectId, ref: 'Team' },
  number: { type: Number, required: true},
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;