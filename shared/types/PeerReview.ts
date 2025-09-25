import { Team } from './Team';
import { User } from './User';

export interface PeerReview {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  peerReviewSettingsId: string;
  peerReviewAssignmentIds: string[];
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  status: "Upcoming" | "Ongoing" | "Completed";
}

export interface PeerReviewSettings {
  _id: string;
  peerReviewId: string;
  reviewerType: "Individual" | "Team";
  TaAssignments: boolean;
  minReviewsPerReviewer: number;
  maxReviewsPerReviewer: number;
  assignmentMode: "Random" | "Manual" | "Hybrid";
}

export interface PeerReviewAssignment {
  _id: string;
  peerReviewId: string;
  repoName: string;
  repoUrl: string;
  reviewerUser: User | null;
  reviewerTeam: Team | null;
  reviewee: Team | null;
  assignedBy: User | null;
  assignedAt: Date;
  deadline: Date | null;
  status: "Pending" | "In Progress" | "Completed";
}

export interface PeerReviewComment {
  _id: string;
  peerReviewAssignmentId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  author: User;
  comment: string;
  createdAt: Date;
  isOverallComment?: boolean;
}

export interface RepoNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: RepoNode[];
}
