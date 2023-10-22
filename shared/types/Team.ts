import { TeamSet } from './TeamSet';
import { User } from './User';

export interface Team {
  teamSet: TeamSet;
  number: number;
  TA: User;
  members: User[];
}
