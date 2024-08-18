import { Course } from "./Course";

export interface JiraSprint {
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

export interface JiraIssue {
  _id: string;
  id: string;
  self: string;
  key: string;
  storyPoints: number;
  fields: {
    summary: string;
    statuscategorychangedate?: Date;
    issuetype: {
      name: string;
      subtask: boolean;
    };
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    resolution?: {
      name: string;
    };
    sprint?: {
      self: string;
    };
    closedSprints?: {
      self: string;
    }[];
  };
}

export interface JiraBoard {
  _id: string;
  id: number;
  self: string;
  name: string;
  type: string;
  jiraLocation: {
    projectId?: number;
    displayName: string;
    projectName: string;
    projectKey?: string;
    projectTypeKey?: string;
    avatarURI?: string;
    name: string;
  };
  columns: {
    name: string;
  }[];
  jiraSprints: JiraSprint[];
  jiraIssues: JiraIssue[];
  course: Course;
}
