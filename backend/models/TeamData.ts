import {
  Comment,
  Review,
  TeamData as SharedTeamData,
  TeamContribution,
  TeamPR,
} from '@shared/types/TeamData';
import mongoose, { Schema, Types } from 'mongoose';

export interface TeamData extends Omit<SharedTeamData, '_id'> {
  _id: Types.ObjectId;
}

const commentSchema = new Schema<Comment>(
  {
    id: { type: Number, required: true },
    user: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const reviewSchema = new Schema<Review>(
  {
    id: { type: Number, required: true },
    user: { type: String, required: true },
    body: { type: String, required: true },
    state: { type: String, required: true },
    submittedAt: { type: Date, required: true },
    comments: [commentSchema],
  },
  { _id: false } // No _id for subdocuments
);

const teamContributionSchema = new Schema<TeamContribution>(
  {
    commits: { type: Number, required: true },
    additions: { type: Number, required: true },
    deletions: { type: Number, required: true },
    createdIssues: { type: Number, required: true },
    openIssues: { type: Number, required: true },
    closedIssues: { type: Number, required: true },
    pullRequests: { type: Number, required: true },
    codeReviews: { type: Number, required: true },
    comments: { type: Number, required: true },
  },
  { _id: false }
);

const teamPRSchema = new Schema<TeamPR>(
  {
    id: { type: Number, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    state: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    reviews: [reviewSchema],
  },
  { _id: false }
);

const teamDataSchema = new Schema<TeamData>({
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
    of: teamContributionSchema,
    required: true,
  },
  teamPRs: [teamPRSchema],
});

const TeamDataModel = mongoose.model<TeamData>('TeamData', teamDataSchema);

export default TeamDataModel;
