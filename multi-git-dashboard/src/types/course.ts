import { User } from "./user";

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  lecturers: User[];
  assistants: User[];
  students: User[];
  teamSets: TeamSet[];
  sprints: { sprintNumber: number, description: string, startDate: Date, endDate: Date }[];
  milestones: { milestoneNumber: number, dateline: Date, description: string }[];
  assessments: Assessment[];
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
  members: User[];
}

export interface Assessment {
  _id: string;
  course: Course;
  assessmentType: string;
  markType: string;
  marks: { student_id: string, mark: number }[];
  frequency: string;
  granularity: 'individual' | 'team';
}
