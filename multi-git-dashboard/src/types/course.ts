import { Assistant, Lecturer, Student } from "./user";

export interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  lecturers: Lecturer[];
  assistants: Assistant[];
  students: Student[];
  teams: Team[]
}

export interface Team {
  teamNumber: number;
  assistant: Assistant;
  students: Student[];
}