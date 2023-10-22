import { User } from './user';

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  faculty: User[];
  TAs: User[];
  students: User[];
  teamSets: TeamSet[];
  sprints: Sprint[];
  milestones: Milestone[];
  assessments: Assessment[];
}

export interface Sprint {
  sprintNumber: number;
  description: string;
  startDate: Date;
  endDate: Date;
}

// sprint type guard
export function isSprint(sprint: Sprint | Milestone): sprint is Sprint {
  return 'sprintNumber' in sprint;
}

export interface Milestone {
  milestoneNumber: number;
  dateline: Date;
  description: string;
}

export interface TeamSet {
  _id: string;
  course: Course;
  name: string;
  teams: Team[];
}

export interface Team {
  _id: string;
  number: number;
  TA: User;
  members: User[];
}

export interface Assessment {
  _id: string;
  course: Course;
  assessmentType: string;
  markType: string;
  results: Result[];
  frequency: string;
  granularity: 'individual' | 'team';
  teamSet: TeamSet;
  formLink: string;
}

export interface Result {
  assessment: Assessment;
  team: Team;
  markers: User[];
  marks: { student_id: string; mark: number }[];
}
