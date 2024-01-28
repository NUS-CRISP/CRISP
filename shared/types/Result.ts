import { Assessment } from './Assessment';
import { Team } from './Team';
import { User } from './User';

export interface Result {
  _id: string;
  assessment: Assessment;
  team: Team;
  marker: User;
  marks: {
    user: string;
    name: string;
    mark: number;
  }[];
}
