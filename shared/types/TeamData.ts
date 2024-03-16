import { Course } from "./Course";
import { JiraBoard } from "./JiraData";

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
  board: JiraBoard;
}
