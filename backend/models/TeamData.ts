import mongoose, { Schema } from "mongoose";

// Define schema for storing team data
interface ITeamData extends Document {
  teamId: number;
  repoName: string;
  commits: number;
  issues: number;
  stars: number;
  forks: number;
  pullRequests: number;
  updatedIssues: number[];
}

const teamDataSchema: Schema = new mongoose.Schema({
  teamId: Number,
  repoName: String,
  commits: Number,
  issues: Number,
  stars: Number,
  forks: Number,
  pullRequests: Number,
  updatedIssues: [String],
});

// Create a model
const TeamData = mongoose.model<ITeamData>("TeamData", teamDataSchema);

export default TeamData;