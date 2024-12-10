import { Course } from './Course';
import { QuestionUnion } from './Question';
import { Result } from './Result';
import { TeamSet } from './TeamSet';
import { User } from './User';

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
  results: Result[];
  isReleased: boolean;
  questions: QuestionUnion[];
}
