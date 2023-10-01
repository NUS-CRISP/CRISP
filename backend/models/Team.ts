import mongoose, { Schema } from 'mongoose';

export interface Team {
  teamSet: mongoose.Types.ObjectId;
  number: number;
  ta: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
}

export const teamSchema = new Schema<Team>({
  teamSet: { type: Schema.Types.ObjectId, ref: 'Team' },
  number: { type: Number, required: true},
  ta: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;