export interface TeamData {
  repoName: string;
  commits: number;
  issues: number;
  stars: number;
  forks: number;
  pullRequests: number;
  updatedIssues: string[];
}

export interface Milestone {
  name: string;
  date: string;
}