export interface Label {
  name: string;
}

export interface Milestone {
  title: string;
  createdAt: Date;
  dueOn: Date;
}

export interface Assignee {
  id: string;
  login: string;
  name: string | null;
}

export interface FieldValue {
  name: string;
  field: {
    name: string;
  };
}

export interface Issue {
  id: string;
  title: string;
  url: string;
  labels: Label[];
  milestone: Milestone | null;
  assignees: Assignee[];
  contentType: string;
}

export interface PullRequest {
  id: string;
  title: string;
  url: string;
  labels: Label[];
  milestone: Milestone | null;
  assignees: Assignee[];
  contentType: string;
}

export interface ProjectItem {
  content: Issue | PullRequest;
  type: string;
  fieldValues: FieldValue[];
}

export interface FieldOption {
  id: string;
  name: string;
}

export interface ProjectField {
  name: string;
  options?: FieldOption[];
}

export interface GitHubProject {
  _id: string;
  id: string;
  title: string;
  gitHubOrgName: string;
  items: ProjectItem[];
  fields: ProjectField[];
}
