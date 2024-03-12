import {
  JiraBoard as SharedJiraBoard,
  JiraIssue as SharedJiraIssue,
  JiraSprint as SharedJiraSprint,
} from '@shared/types/JiraData';
import mongoose, { Schema, Types } from 'mongoose';

export interface JiraBoard extends Omit<SharedJiraBoard, '_id'> {
  _id: Types.ObjectId;
}

export interface JiraIssue extends Omit<SharedJiraIssue, '_id'> {
  _id: Types.ObjectId;
}

export interface JiraSprint extends Omit<SharedJiraSprint, '_id'> {
  _id: Types.ObjectId;
}

const sprintSchema: Schema = new Schema<JiraSprint>({
  id: { type: Number, required: true },
  self: { type: String, required: true },
  state: { type: String, enum: ['active', 'closed', 'future'], required: true },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdDate: { type: Date, required: true },
  originBoardId: { type: Number, required: true },
  goal: { type: String, required: true },
  jiraBoard: { type: Schema.Types.ObjectId, ref: 'JiraBoard' },
  jiraIssues: [{ type: Schema.Types.ObjectId, ref: 'JiraIssue' }],
});

const issueSchema: Schema = new Schema<JiraIssue>({
  id: { type: String, required: true },
  self: { type: String, required: true },
  key: { type: String, required: true },
  storyPoints: { type: Number },
  fields: {
    summary: { type: String, required: true },
    statuscategorychangedate: { type: Date, required: true },
    issuetype: {
      name: { type: String, required: true },
      subtask: { type: Boolean, required: true },
    },
    status: {
      name: { type: String, required: true },
    },
    assignee: {
      displayName: { type: String },
    },
  },
  jiraSprint: { type: Schema.Types.ObjectId, ref: 'JiraSprint' }, // Reference to Sprint
  jiraBoard: { type: Schema.Types.ObjectId, ref: 'JiraBoard' }, // Reference to Board
});

const boardSchema: Schema = new Schema<JiraBoard>({
  id: { type: Number, required: true },
  self: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  jiraLocation: {
    projectId: { type: Number, required: true },
    displayName: { type: String, required: true },
    projectName: { type: String, required: true },
    projectKey: { type: String, required: true },
    projectTypeKey: { type: String, required: true },
    avatarURI: { type: String, required: true },
    name: { type: String, required: true },
  },
  jiraSprints: [{ type: Schema.Types.ObjectId, ref: 'JiraSprint' }],
  jiraIssues: [{ type: Schema.Types.ObjectId, ref: 'JiraIssue' }],
  teamData: { type: Schema.Types.ObjectId, ref: 'TeamData' },
});

const JiraSprintModel = mongoose.model<JiraSprint>('JiraSprint', sprintSchema);
const JiraIssueModel = mongoose.model<JiraIssue>('JiraIssue', issueSchema);
const JiraBoardModel = mongoose.model<JiraBoard>('JiraBoard', boardSchema);

export { JiraSprintModel, JiraIssueModel, JiraBoardModel };
