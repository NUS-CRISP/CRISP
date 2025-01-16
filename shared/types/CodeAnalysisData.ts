export interface CodeAnalysisData {
  _id: string;
  executionTime: Date;
  gitHubOrgName: string;
  teamId: number;
  repoName: string;
  metrics: string[];
  values: string[];
  types: string[];
  domains: string[];
  metricStats?: Map<string, { median: number; mean: number }>;
}
