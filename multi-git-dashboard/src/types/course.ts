import { User } from "./user";

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  lecturers: User[];
  assistants: User[];
  students: User[];
  teams: Team[]
  sprints: { sprintNumber: number, description: string, startDate: Date, endDate: Date }[]
  milestones: { milestoneNumber: number, dateline: Date, description: string }[]
}

export interface Team {
  _id: string;
  teamNumber: number;
  assistant: User;
  students: User[];
}