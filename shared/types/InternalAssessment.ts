import { AssessmentResult } from './AssessmentResults';
import { Course } from './Course';
import { QuestionUnion } from './Question';
import { TeamSet } from './TeamSet';

export type AssessmentType = 'standard' | 'peer_review';

export interface InternalAssessment {
  _id: string;
  course: Course;
  assessmentName: string;
  assessmentType: AssessmentType;
  description: string;
  startDate: Date;
  endDate?: Date;
  maxMarks: number;
  scaleToMaxMarks: boolean;
  questionsTotalMarks?: number;
  granularity: 'individual' | 'team';
  teamSet?: TeamSet;
  areSubmissionsEditable: boolean;
  results: AssessmentResult[];
  isReleased: boolean;
  releaseNumber: number;
  questions: QuestionUnion[];
}
