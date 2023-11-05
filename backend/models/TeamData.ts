import { TeamData as SharedTeamData } from '@shared/types/TeamData';
import mongoose, { Schema, Types } from 'mongoose';

export interface TeamData extends Omit<SharedTeamData, '_id'> {
  _id: Types.ObjectId;
}

const teamDataSchema: Schema = new Schema<TeamData>({
  teamId: { type: Number, required: true },
  gitHubOrgName: { type: String, required: true },
  repoName: { type: String, required: true },
  commits: { type: Number, required: true },
  issues: { type: Number, required: true },
  stars: { type: Number, required: true },
  forks: { type: Number, required: true },
  pullRequests: { type: Number, required: true },
  updatedIssues: { type: [String], required: true },
  teamContributions: {
    type: Map,
    of: {
      type: Map,
      of: Number,
    },
    required: true,
  },
});

export default mongoose.model<TeamData>('TeamData', teamDataSchema);
