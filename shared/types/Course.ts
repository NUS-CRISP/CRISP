import { Assessment } from './Assessment';
import { TeamSet } from './TeamSet';
import { User } from './User';

export interface Sprint {
  number: number;
  description: string;
  startDate: Date;
  endDate: Date;
}

export interface Milestone {
  number: number;
  dateline: Date;
  description: string;
}

export const isSprint = (obj: Sprint | Milestone): obj is Sprint =>
  (obj as Sprint).startDate !== undefined;

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  faculty: User[];
  TAs: User[];
  students: User[];
  teamSets: TeamSet[];
  assessments: Assessment[];
  sprints: Sprint[];
  milestones: Milestone[];
  courseType: 'GitHubOrg' | 'Normal';
  // start 'GitHubOrg' fields
  githubOrgName?: string;
  installationToken?: string;
  // end 'GitHubOrg' fields
}
