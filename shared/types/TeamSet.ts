import { Course } from './Course';
import { Team } from './Team';

export interface TeamSet {
  course: Course;
  name: string;
  teams: Team[];
}
