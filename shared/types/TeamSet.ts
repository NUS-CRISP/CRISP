import { Course } from './Course';
import { Team } from './Team';

export const DEFAULT_TEAMSET_NAME = 'Project Teams';
export interface TeamSet {
  _id: string;
  course: Course;
  name: string;
  teams: Team[];
}
