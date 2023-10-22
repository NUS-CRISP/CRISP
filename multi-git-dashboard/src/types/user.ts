export interface User {
  _id: string;
  name: string;
  identifier: string;
  email: string;
  enrolledCourses: string[];
  gitHandle: string;
  role: 'Faculty member' | 'Teaching assistant' | 'Student';
}
