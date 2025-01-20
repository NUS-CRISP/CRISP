import type { Course } from './Course';

export interface User {
  studentId: any;
  _id: string;
  identifier: string;
  name: string;
  enrolledCourses: Course[];
  gitHandle: string;
}

interface TableUser extends Omit<User, '_id' | 'enrolledCourses'> {
  enrolledCourses: string[];
}

export const getTableUser = (user: User): TableUser => {
  const { identifier, name, enrolledCourses, gitHandle } = user;
  return {
    studentId: identifier,
    identifier,
    name,
    enrolledCourses: enrolledCourses.map((c) => c.name),
    gitHandle,
  };
};
