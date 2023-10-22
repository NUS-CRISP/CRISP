import mongoose, { Schema } from 'mongoose';
import { TeamData } from '@shared/types/TeamData';

const teamDataSchema: Schema = new Schema<TeamData>({
  teamId: { type: Number, required: true },
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
