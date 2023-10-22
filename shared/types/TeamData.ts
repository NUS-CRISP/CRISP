export interface TeamContribution {
  commits: number;
  additions: number;
  deletions: number;
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
