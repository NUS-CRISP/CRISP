import { Team } from './Team';
import { User } from './User';

const REVIEWER_TYPES = ['Individual', 'Team'] as const;
export type ReviewerType = typeof REVIEWER_TYPES[number];

export interface PeerReview {
  // Basic info
  _id: string;
  courseId: string;
  createdAt: Date;
  status: "Upcoming" | "Ongoing" | "Completed";
  
  // Settings
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  reviewerType: ReviewerType;
  TaAssignments: boolean;
  minReviewsPerReviewer: number;
  maxReviewsPerReviewer: number;
  teamSetId: string;
  
  // Assignments
  peerReviewAssignmentIds: string[];
}

export interface PeerReviewAssignment {
  _id: string;
  peerReviewId: string;
  repoName: string;
  repoUrl: string;
  studentReviewers: User[]; // for individual mode
  teamReviewers: Team[]; // for team mode
  taReviewers: User[]; // for TA assignments
  reviewee: Team;
  assignedBy: User;
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
  updatedAt?: Date;
  isOverallComment?: boolean;
}

export interface RepoNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: RepoNode[];
}

export interface PeerReviewTeamMemberDTO {
  userId: string;
  name: string;
  assignedReviews: PeerReviewAssignment[]; // for individual mode
}

export interface PeerReviewTeamDTO {
  teamId: string;
  teamNumber: number;
  repoUrl: string;
  repoName: string;
  TA: string;
  members: PeerReviewTeamMemberDTO[];
  assignedReviewsToTeam: PeerReviewAssignment[]; // for team mode
}

export type ReviewerRef = 
  | { kind: "User"; userId: string; name: string }
  | { kind: "Team"; teamId: string; teamNumber: number };

export interface TAToAssignmentsMap {
  [taId: string]: {
    taName: string;
    assignedReviews: PeerReviewAssignment[];
  };
}

export interface PeerReviewInfoDTO {
  _id: string;
  teams: PeerReviewTeamDTO[];
  reviewerType: ReviewerType;
  assignmentsOfTeam: { [teamId: string]: PeerReviewAssignment };
  TAAssignments: TAToAssignmentsMap;
  capabilities: {
    assignmentPageTeamIds: string[];
  };
}
