// @shared/types/InternalAssessment.ts
import { Course } from './Course';
import { Question } from './Question';
import { Result } from './Result';
import { TeamSet } from './TeamSet';
import { User } from './User'; // Import the User type

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
  gradedBy?: User; // Use the User type here instead of string
  results: Result[];
  isReleased: boolean;
  questions: Question[];
}
