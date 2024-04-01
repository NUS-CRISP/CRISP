import { TeamSet as SharedTeamSet } from '@shared/types/TeamSet';
import mongoose, { Schema, Types } from 'mongoose';

export interface TeamSet
  extends Omit<SharedTeamSet, '_id' | 'course' | 'teams'>,
    Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  teams: Types.ObjectId[];
}

const teamSetSchema = new Schema<TeamSet>({
  course: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  teams: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    default: [],
  },
});

const TeamSetModel = mongoose.model<TeamSet>('TeamSet', teamSetSchema);

export default TeamSetModel;
