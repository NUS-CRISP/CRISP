import {
  Assignee,
  FieldValue,
  Label,
  Milestone,
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

const LabelSchema: Schema = new Schema<Label>({
  name: { type: String, required: true },
});

const MilestoneSchema: Schema = new Schema<Milestone>({
  title: { type: String, required: true },
  dueOn: { type: Date, required: false },
});

const AssigneeSchema: Schema = new Schema<Assignee>({
  id: { type: String, required: true },
  login: { type: String, required: true },
  name: { type: String, required: false },
});

const FieldValueSchema: Schema = new Schema<FieldValue>({
  name: { type: String, required: true },
  field: {
    name: { type: String, required: true },
  },
});

const IssueSchema: Schema = new Schema<Issue>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  labels: { type: [LabelSchema], required: false },
  milestone: { type: MilestoneSchema, required: false },
  assignees: { type: [AssigneeSchema], required: true },
  contentType: {
    type: String,
    required: true,
    enum: ['DraftIssue', 'Issue', 'PullRequest'],
  },
});

const PullRequestSchema: Schema = new Schema<PullRequest>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  labels: { type: [LabelSchema], required: false },
  milestone: { type: MilestoneSchema, required: false },
  assignees: { type: [AssigneeSchema], required: true },
  contentType: {
    type: String,
    required: true,
    enum: ['DraftIssue', 'Issue', 'PullRequest'],
  },
});

const ProjectItemSchema: Schema = new Schema<ProjectItem>({
  content: {
    type: Schema.Types.Mixed, // This will handle both Issue and PullRequest
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['ISSUE', 'PULL_REQUEST', 'DRAFT_ISSUE', 'REDACTED'],
  },
  fieldValues: { type: [FieldValueSchema], required: true },
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
