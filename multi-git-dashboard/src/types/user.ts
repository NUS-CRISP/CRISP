export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  enrolledCourses: string[];
  gitHandle: string;
  role: 'student' | 'ta' | 'lecturer';
}
