import { Project as SharedProject } from '@shared/types/ProjectsV2Data';
import mongoose, { Schema, Types } from 'mongoose';

export interface Project extends Omit<SharedProject, '_id'> {
  _id: Types.ObjectId;
}

interface IAssignee extends Document {
  id: string;
  login: string;
  name: string | null;
}

interface IIssue extends Document {
  id: string;
  title: string;
  url: string;
  assignees: IAssignee[];
}

interface IPullRequest extends Document {
  id: string;
  title: string;
  url: string;
  assignees: IAssignee[];
}

interface IProjectItem extends Document {
  content: IIssue | IPullRequest;
}

interface IProject extends Document {
  id: string;
  title: string;
  items: IProjectItem[];
}

const AssigneeSchema: Schema = new Schema({
  id: { type: String, required: true },
  login: { type: String, required: true },
  name: { type: String, required: false },
});

const IssueSchema: Schema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  assignees: { type: [AssigneeSchema], required: true },
});

const PullRequestSchema: Schema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  assignees: { type: [AssigneeSchema], required: true },
});

const ProjectItemSchema: Schema = new Schema({
  _id: false,
  content: {
    type: Schema.Types.Mixed, // This will handle both Issue and PullRequest
    required: true,
  },
});

const ProjectSchema: Schema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  gitHubOrgName: { type: String, required: true },
  items: { type: [ProjectItemSchema], required: true },
});

const Project = mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
