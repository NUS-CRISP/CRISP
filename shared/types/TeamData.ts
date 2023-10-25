export interface TeamContribution {
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  reviews: number;
  createdIssues: number;
  openIssues: number;
  closedIssues: number;
}

export interface TeamData {
  teamId: number;
  repoName: string;
  commits: number;
  issues: number;
  stars: number;
  forks: number;
  pullRequests: number;
  updatedIssues: string[];
  teamContributions: Record<string, TeamContribution>;
}
