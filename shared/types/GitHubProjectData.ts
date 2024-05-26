export interface Label {
  name: string;
}

export interface Milestone {
  title: string;
  dueOn: Date;
}

export interface Assignee {
  id: string;
  login: string;
  name: string | null;
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
}

export interface GitHubProject {
  _id: string;
  id: string;
  title: string;
  gitHubOrgName: string;
  items: ProjectItem[];
}
