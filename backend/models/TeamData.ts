import mongoose, { Schema } from 'mongoose';

export interface TeamContribution {
  commits: number;
  additions: number;
  deletions: number;
}

export interface TeamData {
  teamId: number;
  repoName: string;
  commits: number;
  issues: number;
  stars: number;
  forks: number;
  pullRequests: number;
  updatedIssues: string[];
  teamContributions: Record<string, TeamContribution>;
}

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

export const TeamData = mongoose.model<TeamData>('TeamData', teamDataSchema);
