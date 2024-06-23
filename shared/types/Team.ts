import { GitHubProject } from './GitHubProjectData';
import { JiraBoard } from './JiraData';
import { TeamData } from './TeamData';
import { TeamSet } from './TeamSet';
import { User } from './User';

export interface Team {
  _id: string;
  teamSet: TeamSet;
  number: number;
  TA: User;
  members: User[];
  teamData: TeamData;
  board: JiraBoard;
  gitHubProject: GitHubProject;
}
