import { User } from "./user";

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  lecturers: User[];
  assistants: User[];
  students: User[];
  teamSets: TeamSet[]
  sprints: { sprintNumber: number, description: string, startDate: Date, endDate: Date }[]
  milestones: { milestoneNumber: number, dateline: Date, description: string }[]
}

export interface TeamSet {
  course: Course;
  name: string;
  teams: Team[];
}

export interface Team {
  _id: string;
  numbers: number;
  members: User[];
}

export interface Assessment {
  course: Course;
  assessmentType: string;
  markType: string;
  marks: {student_id : string, mark: number}[];
  frequency: string;
  granularity: 'individual' | 'team';
}