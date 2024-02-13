import { Schema } from "mongoose";

export interface JiraEpic extends Document {
  _id: string;
  id: number;
  key: string;
  self: string;
  name: string;
  summary: string;
  color: {
    key: string;
  };
  issueColor: {
    key: string;
  };
  done: boolean;
  jiraBoard: Schema.Types.ObjectId; // Reference to Board
}

export interface JiraSprint extends Document {
  _id: string;
  id: number;
  self: string;
  state: 'active' | 'closed' | 'future'; // Assuming state can be one of these values
  name: string;
  startDate: Date;
  endDate: Date;
  createdDate: Date;
  originBoardId: number;
  goal: string;
  jiraBoard: Schema.Types.ObjectId; // Reference to Board
}

export interface JiraIssue extends Document {
  _id: string;
  id: string;
  self: string;
  key: string;
  statuscategorychangedate: Date;
  issuetype: {
    name: string;
    subtask: boolean;
  };
  jiraSprint?: Schema.Types.ObjectId; // Reference to Sprint
  jiraEpic?: Schema.Types.ObjectId; // Reference to Epic
  jiraBoard: Schema.Types.ObjectId; // Reference to Board
}

export interface JiraBoard extends Document {
  _id: string;
  id: number;
  self: string;
  name: string;
  type: string;
  jiraLocation: {
    projectId: number;
    displayName: string;
    projectName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
    name: string;
  };
  jiraEpics: Schema.Types.ObjectId[];
  jiraSprints: Schema.Types.ObjectId[];
  jiraIssues: Schema.Types.ObjectId[];
}
