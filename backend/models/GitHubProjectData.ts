import {
  GitHubProject as SharedGitHubProject,
  Issue as SharedIssue,
  ProjectItem as SharedProjectItem,
  PullRequest as SharedPullRequest,
} from '@shared/types/GitHubProjectData';
import mongoose, { Schema, Types } from 'mongoose';

export interface GitHubProject extends Omit<SharedGitHubProject, '_id'> {
  _id: Types.ObjectId;
}

export interface ProjectItem extends Omit<SharedProjectItem, '_id'> {
  _id: Types.ObjectId;
}

export interface PullRequest extends Omit<SharedPullRequest, '_id'> {
  _id: Types.ObjectId;
}

export interface Issue extends Omit<SharedIssue, '_id'> {
  _id: Types.ObjectId;
}

const AssigneeSchema: Schema = new Schema({
  id: { type: String, required: true },
  login: { type: String, required: true },
  name: { type: String, required: false },
});

const IssueSchema: Schema = new Schema<Issue>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  assignees: { type: [AssigneeSchema], required: true },
});

const PullRequestSchema: Schema = new Schema<PullRequest>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  assignees: { type: [AssigneeSchema], required: true },
});

const ProjectItemSchema: Schema = new Schema<ProjectItem>({
  content: {
    type: Schema.Types.Mixed, // This will handle both Issue and PullRequest
    required: true,
  },
});

const ProjectSchema: Schema = new Schema<GitHubProject>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  gitHubOrgName: { type: String, required: true },
  items: { type: [ProjectItemSchema], required: true },
});

const GitHubProjectModel = mongoose.model<GitHubProject>(
  'GitHubProject',
  ProjectSchema
);

export default GitHubProjectModel;
