import { CourseRole } from './auth/CourseRole';
import { Team } from './Team';
import { User } from './User';

const REVIEWER_TYPES = ['Individual', 'Team'] as const;
export type ReviewerType = typeof REVIEWER_TYPES[number];

export type ReviewerRef = 
  | { kind: "User"; userId: string; name: string }
  | { kind: "Team"; teamId: string; teamNumber: number };

export interface RepoNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: RepoNode[];
}

export interface PeerReview {
  // Basic info
  _id: string;
  courseId: string;
  createdAt: Date;
  updatedAt?: Date;
  status: "Upcoming" | "Active" | "Closed";
  
  // Settings
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  reviewerType: ReviewerType;
  taAssignments: boolean;
  minReviewsPerReviewer: number;
  maxReviewsPerReviewer: number;
  teamSetId: string;
  
  // Assessment-related
  internalAssessmentId: string;
  gradingStartDate?: Date;
  gradingEndDate?: Date;
  gradingStatus?: "NotStarted" | "InProgress" | "Completed";
}

export interface PeerReviewAssignment {
  _id: string;
  peerReviewId: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date | null;
  
  reviewee: Team;
  repoName: string;
  repoUrl: string;
}

export interface PeerReviewSubmission {
  _id: string;
  peerReviewId: string;
  peerReviewAssignmentId: string;
  reviewerKind: "Student" | "Team" | "TA";
  reviewerUserId?: string; // for individual mode
  reviewerTeamId?: string; // for team mode
  createdAt: Date;
  updatedAt?: Date;
  
  status: "NotStarted" | "Draft" | "Submitted";
  startedAt?: Date;
  lastEditedAt?: Date;
  submittedAt?: Date;
  overallComment?: string;
}

export interface PeerReviewComment {
  _id: string;
  peerReviewId: string;
  peerReviewAssignmentId: string;
  peerReviewSubmissionId: string;
  createdAt: Date;
  updatedAt?: Date;
  
  filePath: string;
  startLine: number;
  endLine: number;
  
  author: User;
  authorCourseRole: CourseRole;
  comment: string;
  
  // Moderation Fields
  isFlagged?: boolean;
  flagReason?: string;
  flaggedAt?: Date;
  flaggedBy?: string;
}

export interface AssignedReviewDTO {
  assignment: PeerReviewAssignment;
  
  // Submission Metadata (per reviewer)
  submissionId: string;
  status: "NotStarted" | "Draft" | "Submitted";
  startedAt?: Date;
  lastEditedAt?: Date;
  submittedAt?: Date;
  
  overallComment?: string;
}

export interface PeerReviewTeamMemberDTO {
  userId: string;
  name: string;
  assignedReviews: AssignedReviewDTO[]; // for individual mode
}

export interface PeerReviewTeamDTO {
  teamId: string;
  teamNumber: number;
  repoUrl: string;
  repoName: string;
  TA: {
    id: string;
    name: string;
  };
  members: PeerReviewTeamMemberDTO[];
  assignedReviewsToTeam: AssignedReviewDTO[]; // for team mode
}

export interface TAToAssignmentsMap {
  [taId: string]: {
    taName: string;
    assignedReviews: AssignedReviewDTO[];
  };
}

export interface RevieweeAssignmentsDTO {
  assignment: PeerReviewAssignment;
  
  reviewers: {
    students: Array<{ userId: string; name: string; status: PeerReviewSubmission['status'] }>;
    teams: Array<{ teamId: string; teamNumber: number; status: PeerReviewSubmission['status'] }>;
    TAs: Array<{ userId: string; name: string; status: PeerReviewSubmission['status'] }>;
  }
}

export interface PeerReviewInfoDTO {
  _id: string;
  teams: PeerReviewTeamDTO[];
  reviewerType: ReviewerType;
  assignmentsOfTeam: { [reviewee: string]: RevieweeAssignmentsDTO };
  TAAssignments: TAToAssignmentsMap;
  capabilities: {
    assignmentPageTeamIds: string[];
  };
}

// Assessment-related
export interface PeerReviewGradingTask {
  _id: string;
  peerReviewId: string;
  peerReviewSubmissionId?: string;
  grader: User; // TA/Coordinator who grades this submission
  status: "Assigned" | "InProgress" | "Completed";
  createdAt: Date;
  updatedAt: Date;
  
  // Grading fields (per grader per target)
  score?: number;
  feedback?: string;
  gradedAt?: Date;
  
  // Link to Assessment
  assessmentSubmissionId?: string; // The corresponding submission in the InternalAssessment context
}

export interface PeerReviewResultsStudentRow {
  studentId: string;
  studentName: string;
  teamId: string;
  teamNumber: number;
  aggregatedScore: number; // AssessmentResult.averageScore (or computed)
}

export interface PeerReviewResultsTeamCard {
  teamId: string;
  teamNumber: number;
  teamAggregatedScore: number; // derived from members' aggregatedScore (average)
  members: Array<{
    studentId: string;
    studentName: string;
    aggregatedScore: number;
  }>;
}

export interface PeerReviewResultsDTO {
  internalAssessmentId: string;
  peerReviewId: string;
  reviewerType: 'Individual' | 'Team';
  maxMarks: number;

  perStudent: PeerReviewResultsStudentRow[];
  perTeam: PeerReviewResultsTeamCard[];
}
