import { Course } from './Course';
import { Team } from './Team';

export interface TeamSet {
  _id: string;
  course: Course;
  name: string;
  teams: Team[];
}
