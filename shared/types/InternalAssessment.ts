import { QuestionUnion } from '@models/QuestionTypes';
import { Course } from './Course';
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
  maxMarks?: number;
  granularity: 'individual' | 'team';
  teamSet?: TeamSet;
  gradedBy?: User;
  areSubmissionsEditable: boolean;
  results: Result[];
  isReleased: boolean;
  questions: QuestionUnion[];
}
