
export interface Assignee {
  id: string;
  login: string;
  name: string | null;
}

export interface Issue {
  id: string;
  title: string;
  url: string;
  assignees: Assignee[];
}

export interface PullRequest {
  id: string;
  title: string;
  url: string;
  assignees: Assignee[];
}

export interface ProjectItem {
  content: Issue | PullRequest;
}

export interface Project {
  _id: string;
  id: string;
  title: string;
  gitHubOrgName: string;
  items: ProjectItem[];
}
