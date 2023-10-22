import type { Course } from './Course';

export interface User {
  orgId: string;
  name: string;
  enrolledCourses: Course[];
  gitHandle: string;
}
