import mongoose, { Schema } from 'mongoose';

export interface TeamSet {
  course: mongoose.Types.ObjectId;
  name: string;
  teams: mongoose.Types.ObjectId[];
}

const teamSetSchema = new Schema<TeamSet>({
  course: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
});

const TeamSetModel = mongoose.model<TeamSet>('TeamSet', teamSetSchema);

export default TeamSetModel;
