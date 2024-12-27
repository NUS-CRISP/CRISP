import { AssessmentResult } from './AssessmentResults';
import { Course } from './Course';
import { QuestionUnion } from './Question';
import { TeamSet } from './TeamSet';

export interface InternalAssessment {
  _id: string;
  course: Course;
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  maxMarks: number;
  questionsTotalMarks?: number;
  granularity: 'individual' | 'team';
  teamSet?: TeamSet;
  areSubmissionsEditable: boolean;
  results: AssessmentResult[];
  isReleased: boolean;
  releaseNumber: number;
  questions: QuestionUnion[];
}
