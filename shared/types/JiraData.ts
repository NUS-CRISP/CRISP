export interface JiraLocation {
  projectId: number;
  displayName: string;
  projectName: string;
  projectKey: string;
  projectTypeKey: string;
  avatarURI: string;
  name: string;
}

export interface Epic {
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
}

export interface JiraData {
  _id: string;
  id: number;
  self: string;
  name: string;
  type: string;
  jiraLocation: JiraLocation;
  epics: Epic[];
}
