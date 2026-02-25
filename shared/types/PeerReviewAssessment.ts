import { User } from './User';
import { PeerReviewComment, PeerReviewSubmission, ReviewerRef, ReviewerType } from './PeerReview';

export interface PeerReviewGradingTask {
  _id: string;
  peerReviewId: string;
  peerReviewSubmissionId: string;
  grader: User;
  status: "Assigned" | "InProgress" | "Completed";
  createdAt: Date;
  updatedAt: Date;
  
  score?: number;
  feedback?: string;
  gradedAt?: Date;
  
  assessmentSubmissionId?: string; // The corresponding submission in the InternalAssessment context
}

// For Submissions List
export interface PeerReviewSubmissionListItemDTO {
  peerReviewId: string;
  peerReviewAssignmentId: string;
  peerReviewSubmissionId: string;
  internalAssessmentId: string;
  
  revieweeTeam: { teamId: string; teamNumber: number };
  repo: { repoName: string; repoUrl: string };
  
  reviewer: ReviewerRef;
  reviewerKind: "Student" | "Team" | "TA";
  
  status: PeerReviewSubmission['status'];
  startedAt?: Date;
  lastEditedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  lastActivityAt: Date;
  
  grading: PeerReviewGradingSummary;
}

export interface PeerReviewSubmissionsDTO {
  internalAssessmentId: string;
  peerReviewId: string;
  
  reviewerType: ReviewerType;
  taAssignments: boolean;
  maxMarks: number;
  
  items: PeerReviewSubmissionListItemDTO[];
}

// For Results
export interface PeerReviewResultsStudentRow {
  studentId: string;
  studentName: string;
  teamId: string;
  teamNumber: number;
  aggregatedScore: number | null; // AssessmentResult.averageScore (or computed)
}

export interface PeerReviewResultsTeamCard {
  teamId: string;
  teamNumber: number;
  teamAggregatedScore: number | null; // derived from members' aggregatedScore (average)
  members: Array<{
    studentId: string;
    studentName: string;
    aggregatedScore: number | null;
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

export interface PeerReviewGradingSummary {
  count: number;
  completedCount: number;
  inProgressCount: number;
  assignedCount: number;
  graders: Array<{ id: string; name: string }>;
  lastGradedAt?: Date;
}

// For Grading
export interface PeerReviewGradingAssignmentDTO {
  peerReviewAssignmentId: string;
  revieweeTeam: { teamId: string; teamNumber: number };
  repo: { repoName: string; repoUrl: string };
}

export type PeerReviewGradingReviewerDTO =
  | { kind: 'User'; userId: string; name: string; reviewerKind: 'Student' | 'TA' }
  | { kind: 'Team'; teamId: string; teamNumber: number; reviewerKind: 'Team' };

export interface PeerReviewMyGradingTaskDTO {
  _id: string;
  status: 'Assigned' | 'InProgress' | 'Completed';
  score?: number;
  feedback?: string;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeerReviewGradingDTO {
  internalAssessmentId: string;
  peerReviewId: string;
  peerReviewSubmissionId: string;

  maxMarks: number;
  peerReviewTitle: string;
  reviewerType: 'Individual' | 'Team';

  submission: {
    status: 'NotStarted' | 'Draft' | 'Submitted';
    startedAt?: Date;
    lastEditedAt?: Date;
    submittedAt?: Date;
    createdAt: Date;
  };

  reviewer: PeerReviewGradingReviewerDTO;
  assignment: PeerReviewGradingAssignmentDTO;

  comments: PeerReviewComment[];

  // TA sees this (must exist); Faculty may have null until they create on demand
  myGradingTask: PeerReviewMyGradingTaskDTO | null;
}
