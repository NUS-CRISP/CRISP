import { Course } from './Course';

export interface TeamContribution {
  commits: number;
  createdIssues: number;
  openIssues: number;
  closedIssues: number;
  pullRequests: number;
  codeReviews: number;
  comments: number;
}

export interface TeamPR {
  id: number; // PR id
  title: string;
  user: string;
  url: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  reviews: Review[];
}

export interface Review {
  id: number; // Review id
  user?: string;
  body: string;
  state: string; // e.g., APPROVED, CHANGES_REQUESTED
  submittedAt?: string;
  comments: Comment[];
}

export interface Comment {
  id: number;
  body: string;
  user: string; // or a more detailed User object
  createdAt: Date;
}

export interface Milestone {
  title: string;
  description: string;
  open_issues: number;
  closed_issues: number;
  state: 'closed' | 'open'
  created_at: Date;
  updated_at: Date;
  due_on: Date;
  closed_at: Date;
}

export interface TeamData {
  _id: string;
  course: Course;
  gitHubOrgName: string;
  teamId: number;
  repoName: string;
  commits: number;
  weeklyCommits: number[][];
  issues: number;
  pullRequests: number;
  updatedIssues: string[];
  teamContributions: Record<string, TeamContribution>;
  teamPRs: TeamPR[];
  milestones: Milestone[];
  aiInsights: {
    text: string;
    date: Date;
  }
}
