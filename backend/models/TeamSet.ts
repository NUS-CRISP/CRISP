import mongoose, { Schema, Document } from 'mongoose';

export interface TeamSet extends Document {
  course: mongoose.Types.ObjectId;
  name: string;
  teams: mongoose.Types.ObjectId[]
}

const teamSetSchema = new Schema<TeamSet>({
  course: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
});

const TeamSetModel = mongoose.model<TeamSet>('TeamSet', teamSetSchema);

export default TeamSetModel;
