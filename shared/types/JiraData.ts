import { Schema } from "mongoose";

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
  jiraIssues: Schema.Types.ObjectId[];
}

export interface JiraIssue extends Document {
  _id: string;
  id: string;
  self: string;
  key: string;
  fields: {
    statuscategorychangedate: Date;
    issuetype: {
      name: string;
      subtask: boolean;
    };
    status: {
      name: string;
    };
  };
  jiraSprint?: Schema.Types.ObjectId; // Reference to Sprint
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
  jiraSprints: Schema.Types.ObjectId[];
  jiraIssues: Schema.Types.ObjectId[];
  course: Schema.Types.ObjectId;
}
