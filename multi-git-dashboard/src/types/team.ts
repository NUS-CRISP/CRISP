import { Assistant } from "./assistant";
import { Student } from "./student";

export interface Team {
  teamNumber: number;
  assistant: Assistant;
  students: Student[];
}