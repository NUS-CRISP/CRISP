import mongoose, { Schema, Document } from 'mongoose';

export interface Team extends Document {
  teamNumber: number;
  assistant: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
}

export const teamSchema = new Schema<Team>({
  teamNumber: { type: Number, require: true},
  assistant: { type: Schema.Types.ObjectId, ref: 'User' },
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});
const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;