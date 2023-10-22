import { Course } from './Course';
import { Result } from './Result';
import { TeamSet } from './TeamSet';

export interface Assessment {
  course: Course;
  assessmentType: string;
  markType: string;
  results: Result[];
  frequency: string;
  granularity: 'individual' | 'team';
  teamSet: TeamSet;
  formLink: string;
}
