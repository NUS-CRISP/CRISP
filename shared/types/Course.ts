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

export enum CourseType {
  GitHubOrg = 'GitHubOrg',
  Normal = 'Normal',
}

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  startDate: Date;
  faculty: User[];
  TAs: User[];
  students: User[];
  teamSets: TeamSet[];
  assessments: Assessment[];
  sprints: Sprint[];
  milestones: Milestone[];
  courseType: CourseType;
  // start 'GitHubOrg' fields
  gitHubOrgName?: string;
  repoNameFilter?: string;
  installationId?: number;
  // end 'GitHubOrg' fields
  jira: {
    isRegistered: boolean;
    cloudIds: string[];
    accessToken: string;
    refreshToken: string;
  };
  trofos: {
    isRegistered: boolean;
    apiKey: string;
    courseId: number;
  }
}
