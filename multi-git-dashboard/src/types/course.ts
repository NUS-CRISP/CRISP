import { Assistant } from "./assistant";
import { Lecturer } from "./lecturer";
import { Student } from "./student";
import { Team } from "./team";

export interface Course {
  _id: string;
  courseName: string;
  courseCode: string;
  courseSemester: string;
  lecturers: Lecturer[];
  assistants: Assistant[];
  students: Student[];
  teams: Team[]
}