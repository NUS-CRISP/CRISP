import { Course } from "./Course";

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
  jiraIssues: JiraIssue[];
}

export interface JiraIssue extends Document {
  _id: string;
  id: string;
  self: string;
  key: string;
  storyPoints: number;
  fields: {
    summary: string;
    statuscategorychangedate: Date;
    issuetype: {
      name: string;
      subtask: boolean;
    };
    status: {
      name: string;
    };
    assignee: {
      displayName: string;
    };
    resolution: {
      name: string;
    }
  };
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
  columns: {
    name: string;
  }[];
  jiraSprints: JiraSprint[];
  jiraIssues: JiraIssue[];
  course: Course;
}
