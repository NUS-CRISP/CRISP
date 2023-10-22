import mongoose, { Schema, Types } from 'mongoose';
import { TeamSet as SharedTeamSet } from '@shared/types/TeamSet';

export interface TeamSet extends Omit<SharedTeamSet, 'course' | 'teams'> {
  course: Types.ObjectId;
  teams?: Types.ObjectId[];
}

const teamSetSchema = new Schema<TeamSet>({
  course: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
});

export default mongoose.model<TeamSet>('TeamSet', teamSetSchema);
