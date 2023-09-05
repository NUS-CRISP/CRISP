import mongoose, { Schema } from 'mongoose';

export interface Team {
  teamNumber: number;
  assistant: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
}

export const teamSchema = new Schema<Team>({
  teamNumber: { type: Number, require: true},
  assistant: { type: Schema.Types.ObjectId, ref: 'Assistant' },
  students: [{ type: Schema.Types.ObjectId, ref: 'Student' }]
});
const TeamModel = mongoose.model<Team>('Team', teamSchema);

export default TeamModel;