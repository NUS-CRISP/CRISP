import { Assessment } from './Assessment';
import { Team } from './Team';
import { User } from './User';

export interface MarkItem {
    user: string;
    name: string;
    mark: number;
}

export interface Result {
  _id: string;
  assessment: Assessment;
  team: Team;
  marker: User;
  marks: MarkItem[];
}
