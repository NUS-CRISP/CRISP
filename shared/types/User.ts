import type { Course } from './Course';

export interface User {
  _id: string;
  orgId: string;
  name: string;
  enrolledCourses: Course[];
  gitHandle: string;
}
